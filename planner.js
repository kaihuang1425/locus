// ════════════════════════════════════════════════════════════════
// PLANNER — AI day/week/month plans that become Calendar to-dos
// ════════════════════════════════════════════════════════════════
// Loaded after plan-contract.js and before newtab.js. Everything here is
// declared up front and only touches newtab.js globals (State, tr, toast,
// identity resolvers) when the person acts, so load order stays simple.
//
// Boundaries:
// - Calendar stays authoritative. A draft only becomes data when the person
//   chooses Apply; each accepted block becomes one to-do with an item reminder
//   in an exact Space/Group, written through one acknowledged State receipt
//   with the normal action-scoped Undo.
// - Copy/paste needs nothing else. The optional companion is reached only
//   through Native Messaging after the person grants the optional
//   nativeMessaging permission; there is no network path and no host access.
// - Retries are idempotent: every block has a content key, and a key that is
//   already in the graph (active, Archive, or Trash) is never added again.

const PLANNER_NATIVE_HOST = 'com.locus.planner';
const PLANNER_LINK_KEY = 'te_planner_link';
const PLANNER_MAX_PLANS = 50;
const PLANNER_MAX_LEDGER = 20;
const PLANNER_MAX_DRAFTS = 12;
const PLANNER_REQUEST_TIMEOUT_MS = 10000;
const PLANNER_RUN_TIMEOUT_MS = 10 * 60 * 1000;
const PLANNER_IDLE_DISCONNECT_MS = 20000;
const PLANNER_NEW_GROUP = '__new__';
const PLANNER_NEW_PLAN = '__new__';
const PLANNER_GROUP_SYMBOL = '🗓️';
const PLANNER_GROUP_COLOR = '#6366f1';

let plannerCtx = null;
let plannerLastForm = null;
let plannerMutationPending = null;
let plannerTimeZones = null;
let plannerRebuildTimer = null;
const plannerLink = {
  port: null,
  status: 'off',
  detail: '',
  pairingId: '',
  runners: [],
  waiting: new Map(),
  nextId: 1,
  busy: '',
  idleTimer: null,
};

// ── Stored plans ────────────────────────────────────────────────────
function plannerStoredPlans() {
  const plans = State.get().plans;
  return Array.isArray(plans)
    ? plans.filter(plan => plan && typeof plan === 'object' && typeof plan.id === 'string' && plan.id)
    : [];
}

function plannerStoredPlan(id) {
  const matches = plannerStoredPlans().filter(plan => plan.id === id);
  return matches.length === 1 ? matches[0] : null;
}

function plannerRandomHex(bytes) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map(value => value.toString(16).padStart(2, '0')).join('');
}

function plannerNewPlanId() {
  return `plan-${plannerRandomHex(6)}`;
}

function plannerBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function plannerFormatDate(iso, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const parsed = LocusPlan.parseIsoDate(iso);
  if (!parsed) return String(iso || '');
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, 12)).toLocaleDateString(appLocale(), { timeZone: 'UTC', ...options });
}

function plannerDefaultTitle(horizon, startIso) {
  const key = LocusPlan.HORIZONS.includes(horizon) ? horizon : 'week';
  return tr(`planner.defaultTitle.${key}`, { date: plannerFormatDate(startIso, { month: 'short', day: 'numeric' }) });
}

function plannerDefaultSpaceId() {
  const workspace = activeWs();
  const space = activeCat();
  if (space) return String(space.id);
  return workspace?.categories?.[0]?.id ? String(workspace.categories[0].id) : '';
}

function plannerNewForm() {
  const timezone = plannerBrowserTimeZone();
  const start = LocusPlan.todayInZone(timezone);
  const range = LocusPlan.rangeForHorizon('week', start);
  return {
    planId: plannerNewPlanId(),
    saved: false,
    titleEdited: false,
    title: plannerDefaultTitle('week', range.start),
    horizon: 'week',
    start: range.start,
    end: range.end,
    timezone,
    goals: '',
    fixedText: '',
    dayStart: LocusPlan.DEFAULT_CONSTRAINTS.dayStart,
    dayEnd: LocusPlan.DEFAULT_CONSTRAINTS.dayEnd,
    maxPerDay: String(LocusPlan.DEFAULT_CONSTRAINTS.maxPerDay),
    notes: '',
    shareBusy: false,
    provider: 'claude',
    profile: 'claude-xml',
    model: '',
    delivery: 'paste',
    spaceId: plannerDefaultSpaceId(),
    groupId: PLANNER_NEW_GROUP,
  };
}

function plannerFormFromPlan(plan) {
  const base = plannerNewForm();
  const client = LocusPlan.normalizeClient(plan.client || {});
  const destination = plan.destination && typeof plan.destination === 'object' ? plan.destination : {};
  return {
    ...base,
    planId: plan.id,
    saved: true,
    titleEdited: true,
    title: typeof plan.title === 'string' ? plan.title : base.title,
    horizon: LocusPlan.HORIZONS.includes(plan.horizon) ? plan.horizon : base.horizon,
    start: LocusPlan.parseIsoDate(plan.start)?.iso || base.start,
    end: LocusPlan.parseIsoDate(plan.end)?.iso || base.end,
    timezone: typeof plan.timezone === 'string' ? plan.timezone : base.timezone,
    goals: Array.isArray(plan.goals) ? plan.goals.join('\n') : String(plan.goals || ''),
    fixedText: typeof plan.fixedText === 'string' ? plan.fixedText : '',
    dayStart: plan.constraints?.dayStart || base.dayStart,
    dayEnd: plan.constraints?.dayEnd || base.dayEnd,
    maxPerDay: plan.constraints?.maxPerDay != null ? String(plan.constraints.maxPerDay) : base.maxPerDay,
    notes: typeof plan.constraints?.notes === 'string' ? plan.constraints.notes : '',
    shareBusy: plan.shareBusy === true,
    provider: client.provider,
    profile: client.profile,
    model: client.model,
    delivery: plan.delivery === 'mcp' ? 'mcp' : 'paste',
    spaceId: typeof destination.spaceId === 'string' ? destination.spaceId : base.spaceId,
    groupId: typeof destination.groupId === 'string' && destination.groupId ? destination.groupId : PLANNER_NEW_GROUP,
  };
}

function plannerRecordFields(form) {
  const maxPerDay = Number(form.maxPerDay);
  return {
    title: String(form.title || '').trim().slice(0, LocusPlan.LIMITS.planTitleChars),
    horizon: form.horizon,
    start: form.start,
    end: form.end,
    timezone: form.timezone,
    goals: String(form.goals || '').split(/\r?\n/).map(goal => goal.trim()).filter(Boolean).slice(0, LocusPlan.LIMITS.goals),
    fixedText: String(form.fixedText || '').slice(0, 6000),
    constraints: {
      dayStart: form.dayStart,
      dayEnd: form.dayEnd,
      maxPerDay: Number.isInteger(maxPerDay) ? maxPerDay : null,
      notes: String(form.notes || '').slice(0, LocusPlan.LIMITS.constraintNotesChars),
    },
    shareBusy: form.shareBusy === true,
    client: LocusPlan.normalizeClient({ provider: form.provider, profile: form.profile, model: form.model }),
    delivery: form.delivery === 'mcp' ? 'mcp' : 'paste',
  };
}

// Mutates State.get().plans. Callers own the snapshot and the receipt.
function plannerUpsertPlanRecord(form, { destination = null, appliedEntry = null } = {}) {
  const state = State.get();
  if (state.plans != null && !Array.isArray(state.plans)) {
    const error = new Error('Stored plans are not a list');
    error.code = 'LOCUS_PLANS_MALFORMED';
    throw error;
  }
  if (!Array.isArray(state.plans)) state.plans = [];
  const now = Date.now();
  let record = state.plans.find(plan => plan && plan.id === form.planId) || null;
  if (!record) {
    if (plannerStoredPlans().length >= PLANNER_MAX_PLANS) {
      const error = new Error('Plan limit reached');
      error.code = 'LOCUS_PLAN_LIMIT';
      throw error;
    }
    record = { id: form.planId, createdAt: now, applied: [] };
    state.plans.unshift(record);
  }
  Object.assign(record, plannerRecordFields(form));
  const previousDestination = record.destination && typeof record.destination === 'object' ? record.destination : {};
  record.destination = destination || {
    workspaceId: previousDestination.workspaceId || String(State.get().activeWsId || ''),
    spaceId: form.spaceId,
    groupId: form.groupId === PLANNER_NEW_GROUP ? null : form.groupId,
  };
  record.updatedAt = now;
  if (appliedEntry) {
    const ledger = Array.isArray(record.applied) ? record.applied : [];
    ledger.unshift(appliedEntry);
    record.applied = ledger.slice(0, PLANNER_MAX_LEDGER);
  }
  return record;
}

// ── Request + prompt ────────────────────────────────────────────────
function plannerRequestInput(form) {
  const input = {
    planId: form.planId,
    title: form.title,
    horizon: form.horizon,
    start: form.start,
    end: form.end,
    timezone: form.timezone,
    goals: form.goals,
    fixedText: form.fixedText,
    constraints: {
      dayStart: form.dayStart,
      dayEnd: form.dayEnd,
      maxPerDay: String(form.maxPerDay).trim() === '' ? null : Number(form.maxPerDay),
      notes: form.notes,
    },
    client: { provider: form.provider, profile: form.profile, model: form.model },
    busy: [],
  };
  if (form.shareBusy) {
    const workspace = activeWs();
    try {
      input.busy = collectPendingReminders({ scope: workspace?.id }).map(entry => ({ at: entry.at }));
    } catch {
      input.busy = [];
    }
  }
  return input;
}

function plannerRebuild() {
  if (!plannerCtx) return null;
  const built = LocusPlan.buildPlanRequest(plannerRequestInput(plannerCtx.form), { now: Date.now() });
  plannerCtx.built = built;
  plannerCtx.prompt = built.ok
    ? LocusPlan.buildPlanPrompt(built.request, plannerCtx.form.profile, { delivery: plannerCtx.form.delivery })
    : '';
  plannerRefreshPreview();
  return built;
}

function plannerCurrentRequest() {
  return plannerCtx?.built?.ok ? plannerCtx.built.request : null;
}

// ── Idempotency index ───────────────────────────────────────────────
function plannerAppliedKeyIndex(planId) {
  const keys = new Map();
  const visit = (items, where) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (item.plan && item.plan.id === planId && typeof item.plan.key === 'string' && !keys.has(item.plan.key)) {
        keys.set(item.plan.key, where);
      }
      if (item.type === 'stack') visit(item.items, where);
    }
  };
  const state = State.get();
  for (const workspace of state.workspaces || []) {
    for (const space of workspace.categories || []) {
      for (const group of space.groups || []) visit(group.items, 'active');
    }
  }
  for (const [where, list] of [['archive', state.archive], ['trash', state.trash]]) {
    for (const entry of Array.isArray(list) ? list : []) {
      if (entry?.kind === 'group') visit(entry.data?.items, where);
      else if (entry?.kind === 'item') visit([entry.data], where);
    }
  }
  return keys;
}

// ── Drafts held in this dialog ──────────────────────────────────────
function plannerAddDraft(raw, source = {}) {
  if (!plannerCtx) return { error: null };
  const request = plannerCurrentRequest();
  const extracted = typeof raw === 'string' ? LocusPlan.extractDraftJson(raw) : { ok: true, value: raw };
  if (!extracted.ok) return { error: LocusPlan.validatePlanDraft(raw, request) };
  const value = extracted.value;
  const declared = typeof value?.plan_id === 'string' ? value.plan_id : '';
  const forCurrent = !declared || declared === plannerCtx.form.planId;
  const result = LocusPlan.validatePlanDraft(value, forCurrent ? request : null, { now: Date.now(), draftId: source.draftId });
  if (!result.ok) return { error: result };
  const draftId = source.draftId || result.draftId;
  for (const entry of plannerCtx.drafts.values()) {
    if (entry.draftId === draftId || (entry.fingerprint === result.fingerprint && entry.planId === (result.planId || plannerCtx.form.planId))) {
      entry.deliveries += 1;
      if (source.companion) entry.companion = true;
      return { entry, duplicate: true };
    }
  }
  const entry = {
    draftId,
    fingerprint: result.fingerprint,
    planId: result.planId || plannerCtx.form.planId,
    raw: value,
    source: source.kind || 'paste',
    client: String(source.client || '').slice(0, 60),
    receivedAt: Number.isFinite(source.receivedAt) ? source.receivedAt : Date.now(),
    companion: source.companion === true,
    deliveries: 1,
  };
  plannerCtx.drafts.set(draftId, entry);
  while (plannerCtx.drafts.size > PLANNER_MAX_DRAFTS) {
    plannerCtx.drafts.delete(plannerCtx.drafts.keys().next().value);
  }
  return { entry, duplicate: false };
}

function plannerDraftsForCurrentPlan() {
  if (!plannerCtx) return [];
  return [...plannerCtx.drafts.values()]
    .filter(entry => entry.planId === plannerCtx.form.planId)
    .sort((a, b) => b.receivedAt - a.receivedAt);
}

function plannerRefreshPreview() {
  const ctx = plannerCtx;
  if (!ctx) return;
  const entry = ctx.activeDraftId ? ctx.drafts.get(ctx.activeDraftId) : null;
  if (!entry || entry.planId !== ctx.form.planId) {
    ctx.preview = null;
    return;
  }
  const result = LocusPlan.validatePlanDraft(entry.raw, plannerCurrentRequest(), { now: Date.now(), draftId: entry.draftId });
  let applied = 0;
  if (result.ok) {
    const index = plannerAppliedKeyIndex(ctx.form.planId);
    const remembered = ctx.selection.get(entry.draftId) || new Map();
    for (const block of result.blocks) {
      if (block.selectable && index.has(block.key)) {
        block.status = 'applied';
        block.appliedIn = index.get(block.key);
        block.selectable = false;
        block.selected = false;
        applied += 1;
      } else if (block.selectable && remembered.has(block.key)) {
        block.selected = remembered.get(block.key) === true;
      }
    }
  }
  ctx.preview = { draftId: entry.draftId, entry, result, applied };
}

function plannerSelectedBlocks() {
  const result = plannerCtx?.preview?.result;
  if (!result?.ok) return [];
  return result.blocks.filter(block => block.selectable && block.selected);
}

// ── Apply: one reviewed, receipt-gated transaction ──────────────────
function isPlannerMutationPending() {
  return !!plannerMutationPending;
}

function plannerSpaceOptions() {
  const workspace = activeWs();
  return Array.isArray(workspace?.categories)
    ? workspace.categories.filter(space => space && space.id && Array.isArray(space.groups))
    : [];
}

function plannerGroupOptions(spaceId) {
  const space = plannerSpaceOptions().find(entry => String(entry.id) === String(spaceId));
  return space ? space.groups.filter(group => group && group.id && Array.isArray(group.items)) : [];
}

function createPlannerApplyContext() {
  const ctx = plannerCtx;
  if (!ctx?.preview?.result?.ok || !ctx.built?.ok) return null;
  const state = State.get();
  const workspaceId = String(state.activeWsId || '');
  const workspace = organizationWorkspaceTarget(workspaceId);
  if (!workspace) return null;
  const location = identitySpaceTarget(workspaceId, String(ctx.form.spaceId || ''));
  if (!location || location.workspace !== workspace || !Array.isArray(location.space.groups)) return null;
  let group = null;
  if (ctx.form.groupId !== PLANNER_NEW_GROUP) {
    const exact = organizationGroupTarget(String(ctx.form.groupId || ''));
    if (!exact || exact.workspace !== workspace || exact.space !== location.space || !Array.isArray(exact.group.items)) return null;
    group = exact.group;
  }
  const result = ctx.preview.result;
  return {
    workspaceId,
    workspaceRef: workspace,
    spaceId: String(location.space.id),
    spaceRef: location.space,
    spaceName: String(location.space.name || ''),
    groupId: group ? String(group.id) : null,
    groupRef: group,
    groupName: group ? String(group.name || '') : (String(ctx.form.title || '').trim().slice(0, 80) || tr('planner.groupNameFallback')),
    planId: ctx.form.planId,
    form: { ...ctx.form },
    draftId: ctx.preview.draftId,
    fingerprint: result.fingerprint,
    timezone: result.timezone,
    companion: ctx.preview.entry.companion === true,
    blocks: plannerSelectedBlocks().map(block => ({
      key: block.key,
      title: block.title,
      notes: block.notes,
      kind: block.kind,
      date: block.date,
      start: block.start,
      end: block.end,
      at: block.at,
      timeAssumed: block.timeAssumed,
    })),
  };
}

function resolvePlannerApplyTarget(context) {
  if (!context) return null;
  const state = State.get();
  if (String(state.activeWsId || '') !== context.workspaceId) return null;
  const workspace = organizationWorkspaceTarget(context.workspaceId);
  if (!workspace || workspace !== context.workspaceRef) return null;
  const location = identitySpaceTarget(context.workspaceId, context.spaceId);
  if (!location || location.workspace !== workspace || location.space !== context.spaceRef || !Array.isArray(location.space.groups)) return null;
  if (!context.groupRef) return { workspace, space: location.space, group: null };
  const exact = organizationGroupTarget(context.groupId);
  if (!exact || exact.workspace !== workspace || exact.space !== location.space
      || exact.group !== context.groupRef || !Array.isArray(exact.group.items)) return null;
  return { workspace, space: location.space, group: exact.group };
}

function plannerItemNotes(block, timezone) {
  const time = block.timeAssumed
    ? tr('planner.timeAssumed')
    : (block.end ? `${block.start}–${block.end}` : block.start);
  const line = tr('planner.itemNotes', { date: block.date, time, timezone });
  const extra = String(block.notes || '').trim();
  return `<p>${esc(line)}</p>${extra ? extra.split('\n').map(text => `<p>${esc(text)}</p>`).join('') : ''}`;
}

function plannerFailRecovery(error, statusKey) {
  State.requireRecovery?.();
  plannerSetStatus(statusKey, 'error');
  if (State.isRecoveryRequired?.() && typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired(error);
}

async function commitPlannerApply(context) {
  if (isPlannerMutationPending()) return false;
  if (!context || !context.blocks.length) {
    plannerSetStatus('planner.applyNone', 'error');
    return false;
  }
  if (State.isRecoveryRequired?.()) {
    const error = new Error(tr('stateRecovery.detail'));
    error.code = 'LOCUS_STATE_RECOVERY_REQUIRED';
    plannerFailRecovery(error, 'planner.applyFailed');
    return false;
  }
  const target = resolvePlannerApplyTarget(context);
  if (!target) {
    plannerSetStatus('planner.destinationChanged', 'error');
    paintPlanner();
    return false;
  }
  // Re-read the graph right before writing: a retry, a second tab, or a
  // duplicate delivery can never add the same block twice.
  const index = plannerAppliedKeyIndex(context.planId);
  const fresh = context.blocks.filter(block => !index.has(block.key));
  const skipped = context.blocks.length - fresh.length;
  if (!fresh.length) {
    plannerSetStatus('planner.nothingNew', 'warning');
    plannerRefreshPreview();
    paintPlanner();
    return false;
  }

  let group = target.group;
  const groupCreated = !group;
  let items;
  try {
    const allocateId = createOrganizationIdAllocator();
    if (!group) {
      group = {
        id: allocateId(),
        name: context.groupName,
        symbol: PLANNER_GROUP_SYMBOL,
        color: PLANNER_GROUP_COLOR,
        collapsed: false,
        items: [],
      };
    }
    items = fresh.map(block => stampNew({
      id: allocateId(),
      type: 'todo',
      text: block.title,
      done: false,
      reminder: { at: block.at, notified: false },
      notes: plannerItemNotes(block, context.timezone),
      plan: {
        id: context.planId,
        draft: context.draftId,
        key: block.key,
        date: block.date,
        start: block.start,
        end: block.end,
        tz: context.timezone,
      },
    }));
  } catch {
    plannerSetStatus('cal.idUnavailable', 'error');
    return false;
  }

  const transaction = { context, groupId: group.id, itemIds: items.map(item => item.id) };
  plannerMutationPending = transaction;
  setPlannerBusy('apply');

  let actionId;
  try {
    actionId = State.snapshot(tr('planner.history.apply'));
    if (groupCreated) target.space.groups.push(group);
    group.items.push(...items);
    plannerUpsertPlanRecord(context.form, {
      destination: { workspaceId: context.workspaceId, spaceId: context.spaceId, groupId: String(group.id) },
      appliedEntry: {
        draftId: context.draftId,
        fingerprint: context.fingerprint,
        appliedAt: Date.now(),
        added: items.length,
        skipped,
        groupId: String(group.id),
      },
    });
  } catch (error) {
    if (plannerMutationPending === transaction) plannerMutationPending = null;
    setPlannerBusy('');
    plannerFailRecovery(error, 'planner.applyFailed');
    return false;
  }

  let receipt;
  try {
    receipt = await State.persistNow({ reconcileReminders: true });
  } catch (error) {
    if (plannerMutationPending === transaction) plannerMutationPending = null;
    setPlannerBusy('');
    plannerFailRecovery(error, 'planner.applyFailed');
    return false;
  }
  if (plannerMutationPending !== transaction) return false;
  plannerMutationPending = null;
  setPlannerBusy('');
  closePlannerDialog({ restoreFocus: false });
  plannerLastForm = { ...context.form, saved: true, groupId: String(group.id), spaceId: context.spaceId };
  plannerRevealOnCalendar(fresh);
  renderBoard();
  // renderBoard is synchronous, so the new dots exist now. A timer (not an
  // animation frame) moves focus out of the closed sheet even when the tab is
  // not painting.
  setTimeout(() => plannerFocusApplied(transaction, context), 0);
  const vars = { count: items.length, skipped, space: context.spaceName, group: context.groupName };
  const message = tr(skipped ? 'planner.appliedSkipped' : 'planner.applied', vars);
  if (receipt?.reminderReconciliation?.ok === true) toast(message, { undo: actionId });
  else toast(tr('planner.applyScheduleWarning'), { tone: 'warning', duration: 8000, undo: actionId });
  if (context.companion) {
    void plannerCompanionAck(context.draftId, 'applied', { added: items.length, skipped });
  }
  return true;
}

function plannerRevealOnCalendar(blocks) {
  if (!activeCalendar || !blocks.length) return;
  const first = Math.min(...blocks.map(block => block.at));
  activeCalendar.anchor = first;
}

function plannerFocusApplied(transaction, context) {
  const escape = value => (typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, '\\$&'));
  for (const itemId of transaction.itemIds) {
    const dot = document.querySelector(`.cal-dot[data-reminder-source="item"][data-reminder-owner-id="${escape(itemId)}"]`);
    if (dot && typeof dot.focus === 'function') {
      try { dot.focus({ preventScroll: false }); } catch { try { dot.focus(); } catch {} }
      if (document.activeElement === dot) return true;
    }
  }
  if (typeof focusIdentityTarget === 'function' && focusIdentityTarget('group', transaction.groupId)) return true;
  const fallback = document.getElementById('plan-ai-btn');
  if (fallback) { try { fallback.focus({ preventScroll: true }); } catch {} }
  return document.activeElement === fallback;
}

// ── Save plan inputs (create or edit) ───────────────────────────────
async function commitPlannerSave() {
  if (!plannerCtx || isPlannerMutationPending()) return false;
  const built = plannerRebuild();
  if (!built?.ok) {
    plannerSetStatus('planner.requestBlocked', 'error');
    paintPlanner();
    return false;
  }
  if (State.isRecoveryRequired?.()) {
    const error = new Error(tr('stateRecovery.detail'));
    error.code = 'LOCUS_STATE_RECOVERY_REQUIRED';
    plannerFailRecovery(error, 'planner.saveFailed');
    return false;
  }
  if (!plannerCtx.form.saved && plannerStoredPlans().length >= PLANNER_MAX_PLANS) {
    plannerSetStatus('planner.planLimit', 'error');
    return false;
  }
  const transaction = { kind: 'save', planId: plannerCtx.form.planId };
  plannerMutationPending = transaction;
  setPlannerBusy('save');
  try {
    State.snapshot(tr('planner.history.save'));
    plannerUpsertPlanRecord(plannerCtx.form);
  } catch (error) {
    if (plannerMutationPending === transaction) plannerMutationPending = null;
    setPlannerBusy('');
    plannerFailRecovery(error, 'planner.saveFailed');
    return false;
  }
  try {
    await State.persistNow();
  } catch (error) {
    if (plannerMutationPending === transaction) plannerMutationPending = null;
    setPlannerBusy('');
    plannerFailRecovery(error, 'planner.saveFailed');
    return false;
  }
  if (plannerMutationPending !== transaction) return false;
  plannerMutationPending = null;
  setPlannerBusy('');
  if (plannerCtx) {
    plannerCtx.form.saved = true;
    plannerLastForm = { ...plannerCtx.form };
    plannerSetStatus('planner.saved', 'success');
    paintPlanner();
  }
  return true;
}

// ── Companion over Native Messaging (optional) ──────────────────────
async function plannerProfileLink() {
  const stored = await chrome.storage.local.get(PLANNER_LINK_KEY);
  let link = stored?.[PLANNER_LINK_KEY];
  if (!link || typeof link !== 'object' || !/^[a-f0-9]{64}$/.test(String(link.profileKey || ''))) {
    link = { profileKey: plannerRandomHex(32), createdAt: Date.now() };
    await chrome.storage.local.set({ [PLANNER_LINK_KEY]: link });
  }
  return link;
}

function plannerSetLink(status, detail = '') {
  plannerLink.status = status;
  plannerLink.detail = String(detail || '').slice(0, 300);
  if (plannerCtx) paintPlannerCompanion();
}

function plannerLinkErrorStatus(message) {
  const text = String(message || '');
  if (/not found|not registered/i.test(text)) return 'notInstalled';
  if (/forbidden/i.test(text)) return 'forbidden';
  return 'disconnected';
}

function plannerRejectWaiting(reason) {
  for (const [, waiter] of plannerLink.waiting) waiter.reject(reason);
  plannerLink.waiting.clear();
}

function plannerLinkDisconnected(port, message) {
  if (plannerLink.port !== port) return;
  plannerLink.port = null;
  const error = new Error(message || 'Native host disconnected');
  error.code = 'LOCUS_PLANNER_DISCONNECTED';
  plannerRejectWaiting(error);
  plannerSetLink(plannerLinkErrorStatus(message), message);
}

function plannerHandleNativeMessage(message) {
  const waiter = plannerLink.waiting.get(message?.id);
  if (!waiter) return;
  plannerLink.waiting.delete(message.id);
  waiter.resolve(message);
}

function plannerCompanionSend(message, timeoutMs = PLANNER_REQUEST_TIMEOUT_MS) {
  const port = plannerLink.port;
  if (!port) return Promise.reject(Object.assign(new Error('Not connected'), { code: 'LOCUS_PLANNER_DISCONNECTED' }));
  const id = plannerLink.nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      plannerLink.waiting.delete(id);
      reject(Object.assign(new Error('The companion did not answer in time'), { code: 'LOCUS_PLANNER_TIMEOUT' }));
    }, timeoutMs);
    plannerLink.waiting.set(id, {
      resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); },
    });
    try {
      port.postMessage({ ...message, id });
    } catch (error) {
      clearTimeout(timer);
      plannerLink.waiting.delete(id);
      reject(error);
    }
  });
}

async function plannerHasNativePermission() {
  try {
    return await chrome.permissions.contains({ permissions: ['nativeMessaging'] });
  } catch {
    return false;
  }
}

// Must run directly inside the click handler: the permission prompt needs the
// person's gesture.
function plannerRequestNativePermission() {
  try {
    return chrome.permissions.request({ permissions: ['nativeMessaging'] }).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

async function plannerCompanionConnect() {
  clearTimeout(plannerLink.idleTimer);
  if (plannerLink.port) return true;
  if (typeof chrome?.runtime?.connectNative !== 'function') {
    // A grant made in this tab may only expose the API after a reload.
    plannerSetLink(await plannerHasNativePermission() ? 'reloadNeeded' : 'denied');
    return false;
  }
  plannerSetLink('connecting');
  let link;
  try {
    link = await plannerProfileLink();
  } catch (error) {
    plannerSetLink('error', error?.message);
    return false;
  }
  let port;
  try {
    port = chrome.runtime.connectNative(PLANNER_NATIVE_HOST);
  } catch (error) {
    plannerSetLink(plannerLinkErrorStatus(error?.message), error?.message);
    return false;
  }
  plannerLink.port = port;
  port.onMessage.addListener(plannerHandleNativeMessage);
  port.onDisconnect.addListener(() => {
    const message = chrome.runtime.lastError?.message || '';
    plannerLinkDisconnected(port, message);
  });
  let hello;
  try {
    hello = await plannerCompanionSend({
      type: 'hello',
      contract: LocusPlan.CONTRACT,
      profileKey: link.profileKey,
      label: String(activeWs()?.name || '').slice(0, 60),
    });
  } catch (error) {
    if (plannerLink.port === port) {
      plannerLink.port = null;
      try { port.disconnect(); } catch {}
      plannerSetLink(plannerLinkErrorStatus(error?.message), error?.message);
    }
    return false;
  }
  if (!hello?.ok) {
    plannerLink.port = null;
    try { port.disconnect(); } catch {}
    plannerSetLink('error', hello?.message || hello?.code);
    return false;
  }
  plannerLink.pairingId = String(hello.pairingId || '');
  plannerLink.runners = Array.isArray(hello.runners) ? hello.runners.slice(0, 8) : [];
  plannerSetLink('connected');
  try {
    await chrome.storage.local.set({ [PLANNER_LINK_KEY]: { ...link, pairingId: plannerLink.pairingId, pairedAt: link.pairedAt || Date.now() } });
  } catch {}
  return true;
}

function plannerCompanionDisconnect() {
  clearTimeout(plannerLink.idleTimer);
  const port = plannerLink.port;
  plannerLink.port = null;
  plannerRejectWaiting(Object.assign(new Error('Disconnected'), { code: 'LOCUS_PLANNER_DISCONNECTED' }));
  if (port) { try { port.disconnect(); } catch {} }
  if (plannerLink.status === 'connected' || plannerLink.status === 'connecting') plannerLink.status = 'off';
}

async function plannerCompanionAction(kind, work) {
  if (plannerLink.busy) return false;
  plannerLink.busy = kind;
  paintPlannerCompanion();
  try {
    return await work();
  } catch (error) {
    if (error?.code === 'LOCUS_PLANNER_DISCONNECTED') plannerSetLink(plannerLinkErrorStatus(error.message), error.message);
    else plannerSetLink(plannerLink.port ? 'connected' : plannerLink.status, error?.message);
    plannerSetStatus('planner.companion.failed', 'error', { message: String(error?.message || '').slice(0, 160) });
    return false;
  } finally {
    plannerLink.busy = '';
    if (plannerCtx) paintPlanner();
  }
}

function plannerCompanionShare() {
  return plannerCompanionAction('share', async () => {
    const request = plannerCurrentRequest();
    if (!request) {
      plannerSetStatus('planner.requestBlocked', 'error');
      return false;
    }
    if (!await plannerCompanionConnect()) return false;
    const reply = await plannerCompanionSend({ type: 'publish_request', request });
    if (!reply?.ok) throw new Error(reply?.message || reply?.code || 'publish failed');
    plannerSetStatus('planner.companion.shared', 'success', { title: request.title });
    return true;
  });
}

function plannerCompanionPull({ quiet = false } = {}) {
  return plannerCompanionAction('pull', async () => {
    if (!await plannerCompanionConnect()) return false;
    const reply = await plannerCompanionSend({ type: 'pull', max: 10 });
    if (!reply?.ok) throw new Error(reply?.message || reply?.code || 'pull failed');
    let added = 0;
    let repeated = 0;
    let newest = null;
    for (const delivered of Array.isArray(reply.drafts) ? reply.drafts : []) {
      const outcome = plannerAddDraft(delivered.draft, {
        kind: delivered.source?.transport === 'runner' ? 'runner' : 'mcp',
        client: delivered.source?.client || '',
        receivedAt: delivered.receivedAt,
        draftId: delivered.draftId,
        companion: true,
      });
      if (outcome.error) {
        void plannerCompanionAck(delivered.draftId, 'rejected', {});
        continue;
      }
      if (outcome.duplicate) repeated += 1;
      else added += 1;
      if (outcome.entry.planId === plannerCtx?.form.planId && (!newest || outcome.entry.receivedAt >= newest.receivedAt)) newest = outcome.entry;
    }
    if (newest && plannerCtx) {
      plannerCtx.activeDraftId = newest.draftId;
      plannerRefreshPreview();
    }
    plannerAutoAckApplied();
    if (!quiet || added) {
      if (added || repeated) plannerSetStatus('planner.companion.received', 'success', { count: added + repeated });
      else plannerSetStatus('planner.companion.none', 'info');
    }
    return true;
  });
}

// A redelivered draft whose every block is already on the Calendar was
// applied before (the earlier ack was lost). Confirm it so it stops arriving.
function plannerAutoAckApplied() {
  const preview = plannerCtx?.preview;
  if (!preview?.entry?.companion || !preview.result?.ok) return;
  const counts = preview.result.counts;
  if (preview.applied > 0 && preview.applied === counts.selectable) {
    void plannerCompanionAck(preview.entry.draftId, 'applied', { added: 0, skipped: preview.applied });
  }
}

function plannerCompanionRun() {
  return plannerCompanionAction('run', async () => {
    const request = plannerCurrentRequest();
    const select = document.getElementById('planner-runner');
    const runner = String(select?.value || '');
    if (!request || !runner) {
      plannerSetStatus('planner.requestBlocked', 'error');
      return false;
    }
    if (!await plannerCompanionConnect()) return false;
    plannerSetStatus('planner.companion.running', 'pending', { name: runner });
    const reply = await plannerCompanionSend({
      type: 'run',
      runner,
      request,
      profile: plannerCtx.form.profile,
      model: plannerCtx.form.model,
    }, PLANNER_RUN_TIMEOUT_MS);
    if (!reply?.ok) throw new Error(reply?.message || reply?.code || 'runner failed');
    if (reply.status === 'rejected') {
      plannerSetStatus('planner.companion.runRejected', 'error', { name: runner });
      return false;
    }
    plannerLink.busy = '';
    await plannerCompanionPull({ quiet: true });
    plannerSetStatus('planner.companion.ran', 'success', { name: runner });
    return true;
  });
}

async function plannerCompanionAck(draftId, status, detail) {
  if (!draftId) return false;
  try {
    if (!plannerLink.port && !await plannerCompanionConnect()) return false;
    const reply = await plannerCompanionSend({ type: 'ack', draftId, status, detail });
    return reply?.ok === true;
  } catch {
    return false;
  } finally {
    plannerScheduleIdleDisconnect();
  }
}

function plannerScheduleIdleDisconnect() {
  clearTimeout(plannerLink.idleTimer);
  if (plannerCtx || !plannerLink.port) return;
  plannerLink.idleTimer = setTimeout(() => {
    if (!plannerCtx && !plannerLink.waiting.size) plannerCompanionDisconnect();
  }, PLANNER_IDLE_DISCONNECT_MS);
}

async function plannerAutoConnect() {
  try {
    if (!await plannerHasNativePermission()) return;
    const stored = await chrome.storage.local.get(PLANNER_LINK_KEY);
    if (!stored?.[PLANNER_LINK_KEY]?.pairingId) return;
    await plannerCompanionPull({ quiet: true });
  } catch {}
}

// ── Painting ────────────────────────────────────────────────────────
function plannerIssueText(entry) {
  const key = `planner.issue.${entry.code}`;
  const text = tr(key, entry.params || {});
  return text === key ? LocusPlan.describeIssue(entry) : text;
}

function plannerSetStatus(key, tone = 'info', vars = {}) {
  if (!plannerCtx) return;
  plannerCtx.status = key ? { key, tone, vars } : null;
  paintPlannerStatus();
}

function paintPlannerStatus() {
  const status = document.getElementById('planner-status');
  if (!status || !plannerCtx) return;
  const current = plannerCtx.status;
  if (plannerCtx.busy) {
    status.textContent = tr(plannerCtx.busy === 'save' ? 'planner.saving' : 'planner.applying');
    status.dataset.tone = 'pending';
    return;
  }
  status.textContent = current ? tr(current.key, current.vars) : '';
  if (current) status.dataset.tone = current.tone;
  else delete status.dataset.tone;
}

function setPlannerBusy(kind) {
  if (!plannerCtx) return;
  plannerCtx.busy = kind || '';
  const overlay = document.getElementById('planner-overlay');
  if (overlay) overlay.setAttribute('aria-busy', String(!!plannerCtx.busy));
  paintPlanner();
  if (plannerCtx.busy) {
    const focus = document.getElementById(plannerCtx.busy === 'save' ? 'planner-save' : 'planner-apply');
    try { focus?.focus({ preventScroll: true }); } catch {}
  }
}

function plannerOption(value, label, selected) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  if (selected) option.selected = true;
  return option;
}

function plannerLoadFormInputs() {
  const form = plannerCtx?.form;
  if (!form) return;
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
  set('planner-plan-title', form.title);
  set('planner-start', form.start);
  set('planner-end', form.end);
  set('planner-timezone', form.timezone);
  set('planner-goals', form.goals);
  set('planner-fixed', form.fixedText);
  set('planner-day-start', form.dayStart);
  set('planner-day-end', form.dayEnd);
  set('planner-max-per-day', form.maxPerDay);
  set('planner-notes', form.notes);
  set('planner-model', form.model);
  set('planner-provider', form.provider);
  set('planner-delivery', form.delivery);
  const share = document.getElementById('planner-share-busy');
  if (share) share.checked = form.shareBusy === true;
  const paste = document.getElementById('planner-paste');
  if (paste) paste.value = plannerCtx.pasteText || '';
}

function paintPlannerSelects() {
  const form = plannerCtx.form;
  const planSelect = document.getElementById('planner-plan-select');
  if (planSelect) {
    planSelect.replaceChildren(plannerOption(PLANNER_NEW_PLAN, tr('planner.newPlan'), !form.saved));
    for (const plan of plannerStoredPlans()) {
      const label = `${plan.title || tr('planner.groupNameFallback')} · ${plannerFormatDate(plan.start, { month: 'short', day: 'numeric' })}`;
      planSelect.appendChild(plannerOption(plan.id, label, form.saved && plan.id === form.planId));
    }
  }
  const profile = document.getElementById('planner-profile');
  if (profile) {
    const profiles = LocusPlan.PROVIDERS[form.provider]?.profiles || [];
    profile.replaceChildren(...profiles.map(id => plannerOption(id, tr(`planner.profileName.${id}`), id === form.profile)));
  }
  const spaceSelect = document.getElementById('planner-space');
  if (spaceSelect) {
    const spaces = plannerSpaceOptions();
    if (!spaces.some(space => String(space.id) === form.spaceId) && spaces[0]) form.spaceId = String(spaces[0].id);
    spaceSelect.replaceChildren(...spaces.map(space => plannerOption(String(space.id), String(space.name || ''), String(space.id) === form.spaceId)));
  }
  const groupSelect = document.getElementById('planner-group');
  if (groupSelect) {
    const groups = plannerGroupOptions(form.spaceId);
    if (form.groupId !== PLANNER_NEW_GROUP && !groups.some(group => String(group.id) === form.groupId)) form.groupId = PLANNER_NEW_GROUP;
    const newName = String(form.title || '').trim().slice(0, 80) || tr('planner.groupNameFallback');
    groupSelect.replaceChildren(
      plannerOption(PLANNER_NEW_GROUP, tr('planner.newGroup', { name: newName }), form.groupId === PLANNER_NEW_GROUP),
      ...groups.map(group => plannerOption(String(group.id), String(group.name || ''), String(group.id) === form.groupId)),
    );
  }
  for (const button of document.querySelectorAll('#planner-horizon [data-horizon]')) {
    const active = button.dataset.horizon === form.horizon;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  }
}

function paintPlannerRequest() {
  const list = document.getElementById('planner-request-issues');
  const built = plannerCtx.built;
  if (list) {
    const entries = built ? [...built.issues, ...built.missing] : [];
    list.replaceChildren(...entries.map(entry => {
      const li = document.createElement('li');
      li.dataset.severity = entry.severity;
      li.textContent = plannerIssueText(entry);
      return li;
    }));
    list.hidden = !entries.length;
  }
  const prompt = document.getElementById('planner-prompt');
  if (prompt) prompt.value = plannerCtx.prompt || '';
  const copy = document.getElementById('planner-copy');
  if (copy) copy.disabled = !built?.ok || !!plannerCtx.busy;
  const saveState = document.getElementById('planner-save-state');
  if (saveState) saveState.textContent = plannerCtx.form.saved ? tr('planner.savedState') : tr('planner.unsaved');
}

function paintPlannerCompanion() {
  if (!plannerCtx) return;
  const status = document.getElementById('planner-companion-status');
  const link = plannerLink;
  if (status) {
    const key = `planner.companion.${link.status}`;
    status.textContent = tr(key, { id: link.pairingId, message: link.detail });
    status.dataset.state = link.status;
  }
  const connected = link.status === 'connected' && !!link.port;
  const busy = !!link.busy || !!plannerCtx.busy;
  const connect = document.getElementById('planner-connect');
  if (connect) {
    connect.textContent = tr(link.status === 'disconnected' ? 'planner.reconnect' : 'planner.connect');
    connect.hidden = connected;
    connect.disabled = busy || link.status === 'connecting';
  }
  const share = document.getElementById('planner-share');
  if (share) { share.hidden = !connected; share.disabled = busy || !plannerCtx.built?.ok; }
  const check = document.getElementById('planner-check');
  if (check) { check.hidden = !connected; check.disabled = busy; }
  const setup = document.getElementById('planner-mcp-setup');
  if (setup) {
    setup.hidden = !connected;
    setup.textContent = connected ? tr('planner.companion.mcpHint', { id: link.pairingId }) : '';
  }
  const runnerRow = document.getElementById('planner-runner-row');
  const runnerSelect = document.getElementById('planner-runner');
  const run = document.getElementById('planner-run');
  const runners = connected ? link.runners : [];
  if (runnerRow) runnerRow.hidden = !runners.length;
  if (runnerSelect && runners.length) {
    const current = runnerSelect.value;
    runnerSelect.replaceChildren(...runners.map(runner => plannerOption(runner.name, runner.label || runner.name, runner.name === current)));
  }
  if (run) run.disabled = busy || !plannerCtx.built?.ok || !runners.length;
}

function plannerSourceLabel(entry) {
  if (entry.source === 'mcp') return tr('planner.source.mcp', { client: entry.client || 'MCP' });
  if (entry.source === 'runner') return tr('planner.source.runner', { client: entry.client || '' });
  return tr('planner.source.paste');
}

function paintPlannerDrafts() {
  const holder = document.getElementById('planner-drafts');
  if (!holder) return;
  const drafts = plannerDraftsForCurrentPlan();
  const others = plannerCtx.drafts.size - drafts.length;
  const rows = drafts.map(entry => {
    const row = document.createElement('div');
    row.className = 'planner-draft-row' + (entry.draftId === plannerCtx.activeDraftId ? ' active' : '');
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'planner-draft-pick';
    pick.dataset.draftId = entry.draftId;
    pick.setAttribute('aria-pressed', String(entry.draftId === plannerCtx.activeDraftId));
    const blocks = Array.isArray(entry.raw?.blocks) ? entry.raw.blocks.length : 0;
    pick.textContent = tr('planner.draftMeta', {
      source: plannerSourceLabel(entry),
      time: new Date(entry.receivedAt).toLocaleTimeString(appLocale(), { hour: 'numeric', minute: '2-digit' }),
      count: blocks,
    });
    pick.onclick = () => {
      plannerCtx.activeDraftId = entry.draftId;
      plannerRefreshPreview();
      paintPlanner();
    };
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'planner-draft-dismiss';
    dismiss.textContent = tr('planner.dismiss');
    dismiss.setAttribute('aria-label', tr('planner.dismissNamed', { name: pick.textContent }));
    dismiss.onclick = () => plannerDismissDraft(entry.draftId);
    row.append(pick, dismiss);
    return row;
  });
  if (others > 0) {
    const note = document.createElement('p');
    note.className = 'planner-hint';
    note.textContent = tr('planner.otherPlanDrafts', { count: others });
    rows.push(note);
  }
  holder.replaceChildren(...rows);
}

function plannerDismissDraft(draftId) {
  const entry = plannerCtx?.drafts.get(draftId);
  if (!entry || plannerCtx.busy) return;
  plannerCtx.drafts.delete(draftId);
  plannerCtx.selection.delete(draftId);
  if (plannerCtx.activeDraftId === draftId) {
    plannerCtx.activeDraftId = plannerDraftsForCurrentPlan()[0]?.draftId || null;
  }
  if (entry.companion) void plannerCompanionAck(draftId, 'dismissed', {});
  plannerRefreshPreview();
  paintPlanner();
  document.getElementById('planner-paste')?.focus({ preventScroll: true });
}

function plannerBlockTime(block, planTz) {
  if (block.at == null) return block.sourceDate || '';
  const date = plannerFormatDate(block.date);
  if (block.timeAssumed) return `${date} · ${tr('planner.timeAssumed')}`;
  const range = block.end ? `${block.start}–${block.end}` : block.start;
  const browserTz = plannerBrowserTimeZone();
  if (browserTz === planTz) return `${date} ${range}`;
  const local = new Date(block.at).toLocaleTimeString(appLocale(), { hour: 'numeric', minute: '2-digit' });
  return `${date} ${range} (${planTz}) · ${tr('planner.localTime', { time: local })}`;
}

function paintPlannerPreview() {
  const holder = document.getElementById('planner-preview');
  if (!holder) return;
  const preview = plannerCtx.preview;
  if (!preview) {
    const empty = document.createElement('p');
    empty.className = 'planner-hint planner-empty';
    empty.textContent = tr('planner.noDraft');
    holder.replaceChildren(empty);
    return;
  }
  const result = preview.result;
  const nodes = [];
  if (!result.ok) {
    const list = document.createElement('ul');
    list.className = 'planner-issues';
    for (const entry of result.issues) {
      const li = document.createElement('li');
      li.dataset.severity = 'error';
      li.textContent = plannerIssueText(entry);
      list.appendChild(li);
    }
    holder.replaceChildren(list);
    return;
  }
  const summary = document.createElement('p');
  summary.className = 'planner-summary';
  summary.textContent = tr('planner.summary', {
    ready: result.blocks.filter(block => block.status === 'ready').length,
    conflict: result.blocks.filter(block => block.status === 'conflict').length,
    invalid: result.counts.invalid + result.counts.duplicate,
    applied: preview.applied,
  });
  nodes.push(summary);
  if (result.summary) {
    const note = document.createElement('p');
    note.className = 'planner-hint';
    note.textContent = result.summary;
    nodes.push(note);
  }
  const envelope = [...result.issues, ...result.missing];
  if (envelope.length) {
    const list = document.createElement('ul');
    list.className = 'planner-issues';
    for (const entry of envelope) {
      const li = document.createElement('li');
      li.dataset.severity = entry.severity;
      li.textContent = plannerIssueText(entry);
      list.appendChild(li);
    }
    nodes.push(list);
  }
  const list = document.createElement('ul');
  list.className = 'planner-blocks';
  list.setAttribute('aria-label', tr('planner.section.preview'));
  const remembered = plannerCtx.selection.get(preview.draftId) || new Map();
  plannerCtx.selection.set(preview.draftId, remembered);
  for (const block of result.blocks) {
    const li = document.createElement('li');
    li.className = 'planner-block';
    li.dataset.status = block.status;
    const label = document.createElement('label');
    label.className = 'planner-block-main';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = block.selected === true;
    box.disabled = !block.selectable || !!plannerCtx.busy;
    box.dataset.key = block.key;
    box.setAttribute('aria-label', tr('planner.selectBlock', { title: block.title || '—', date: plannerFormatDate(block.date || block.sourceDate) }));
    box.onchange = () => {
      block.selected = box.checked;
      remembered.set(block.key, box.checked);
      paintPlannerFooter();
    };
    const text = document.createElement('span');
    text.className = 'planner-block-text';
    const title = document.createElement('span');
    title.className = 'planner-block-title';
    title.textContent = block.title || '—';
    const when = document.createElement('span');
    when.className = 'planner-block-when';
    when.textContent = plannerBlockTime(block, result.timezone);
    text.append(title, when);
    const badge = document.createElement('span');
    badge.className = 'planner-badge';
    badge.textContent = tr(`planner.blockStatus.${block.status}`);
    label.append(box, text, badge);
    li.appendChild(label);
    const notes = block.issues.filter(entry => entry.severity !== 'info');
    if (notes.length) {
      const issues = document.createElement('ul');
      issues.className = 'planner-block-issues';
      for (const entry of notes) {
        const item = document.createElement('li');
        item.dataset.severity = entry.severity;
        item.textContent = plannerIssueText(entry);
        issues.appendChild(item);
      }
      li.appendChild(issues);
    }
    list.appendChild(li);
  }
  nodes.push(list);
  holder.replaceChildren(...nodes);
}

function paintPlannerFooter() {
  const apply = document.getElementById('planner-apply');
  const cancel = document.getElementById('planner-cancel');
  const close = document.getElementById('planner-close');
  const count = plannerSelectedBlocks().length;
  const busy = !!plannerCtx?.busy;
  if (apply) {
    apply.textContent = busy && plannerCtx.busy === 'apply' ? tr('planner.applying') : tr('planner.apply', { count });
    apply.disabled = busy || !count || !plannerCtx?.built?.ok;
    apply.setAttribute('aria-disabled', String(apply.disabled));
  }
  if (cancel) cancel.disabled = busy;
  if (close) close.disabled = busy;
}

function paintPlanner() {
  if (!plannerCtx) return;
  const busy = !!plannerCtx.busy;
  const overlay = document.getElementById('planner-overlay');
  for (const control of overlay?.querySelectorAll('.planner-plan input, .planner-plan select, .planner-plan textarea, .planner-plan button, .planner-draft input, .planner-draft select, .planner-draft textarea') || []) {
    if (control.id === 'planner-prompt') continue;
    control.disabled = busy;
  }
  paintPlannerSelects();
  paintPlannerRequest();
  paintPlannerCompanion();
  paintPlannerDrafts();
  paintPlannerPreview();
  paintPlannerFooter();
  paintPlannerStatus();
  const save = document.getElementById('planner-save');
  if (save) save.textContent = tr(plannerCtx.busy === 'save' ? 'planner.saving' : 'planner.save');
}

// ── Dialog lifecycle ────────────────────────────────────────────────
function setPlannerInterlock(enabled) {
  const overlay = document.getElementById('planner-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  for (const child of document.body.children) {
    if (child === overlay || child === recovery) continue;
    setElementInertOwner(child, 'planner', enabled);
  }
}

function plannerFillTimeZones() {
  const list = document.getElementById('planner-timezones');
  if (!list || list.childElementCount) return;
  if (!plannerTimeZones) {
    try {
      plannerTimeZones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    } catch {
      plannerTimeZones = [];
    }
  }
  const zones = new Set([plannerBrowserTimeZone(), 'UTC', ...plannerTimeZones]);
  list.replaceChildren(...[...zones].map(zone => {
    const option = document.createElement('option');
    option.value = zone;
    return option;
  }));
}

function openPlannerDialog(opener = null) {
  const overlay = document.getElementById('planner-overlay');
  if (!overlay || !overlay.classList.contains('hidden') || typeof LocusPlan === 'undefined') return false;
  // Any other modal owns the foreground; the planner never stacks over one
  // (first-run Welcome included).
  const conflicting = ['state-recovery-overlay', 'calendar-task-overlay', 'paste-overlay', 'reminder-overlay', 'modal-overlay',
    'import-overlay', 'trash-delete-overlay', 'organization-name-overlay', 'organization-delete-overlay',
    'welcome', 'quota-overlay', 'settings-drawer', 'tools-hub', 'about-overlay'];
  if (conflicting.some(id => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); })) return false;
  if (!plannerSpaceOptions().length) {
    toast(tr('planner.needSpace'), { danger: true });
    return false;
  }
  focusDialogOpener(opener);
  rememberOpener(overlay, opener);
  let form = plannerLastForm ? { ...plannerLastForm } : null;
  if (form?.saved && !plannerStoredPlan(form.planId)) form = null;
  plannerCtx = {
    form: form || plannerNewForm(),
    drafts: new Map(),
    selection: new Map(),
    activeDraftId: null,
    built: null,
    prompt: '',
    preview: null,
    status: null,
    busy: '',
    pasteText: '',
  };
  plannerFillTimeZones();
  plannerLoadFormInputs();
  plannerRebuild();
  setPlannerInterlock(true);
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-busy', 'false');
  lockBodyScroll();
  paintPlanner();
  clearTimeout(plannerLink.idleTimer);
  setTimeout(() => document.getElementById('planner-plan-title')?.focus({ preventScroll: true }), 0);
  void plannerAutoConnect();
  return true;
}

function closePlannerDialog({ restoreFocus = true } = {}) {
  const overlay = document.getElementById('planner-overlay');
  if (!overlay || overlay.classList.contains('hidden') || plannerCtx?.busy) return false;
  if (plannerCtx) plannerLastForm = { ...plannerCtx.form };
  overlay.classList.add('hidden');
  unlockBodyScroll();
  setPlannerInterlock(false);
  plannerCtx = null;
  clearTimeout(plannerRebuildTimer);
  if (restoreFocus) {
    if (!restoreOpener(overlay)) setTimeout(() => document.getElementById('plan-ai-btn')?.focus({ preventScroll: true }), 0);
  } else {
    _overlayOpeners.delete(overlay);
  }
  plannerScheduleIdleDisconnect();
  return true;
}

function plannerLoadPlan(planId) {
  if (!plannerCtx || plannerCtx.busy) return;
  if (planId === PLANNER_NEW_PLAN) {
    plannerCtx.form = plannerNewForm();
  } else {
    const plan = plannerStoredPlan(planId);
    if (!plan) return;
    plannerCtx.form = plannerFormFromPlan(plan);
  }
  plannerCtx.activeDraftId = plannerDraftsForCurrentPlan()[0]?.draftId || null;
  plannerCtx.status = null;
  plannerLoadFormInputs();
  plannerRebuild();
  paintPlanner();
}

function plannerScheduleRebuild() {
  clearTimeout(plannerRebuildTimer);
  plannerRebuildTimer = setTimeout(() => {
    if (!plannerCtx) return;
    plannerRebuild();
    paintPlannerRequest();
    paintPlannerSelects();
    paintPlannerCompanion();
    paintPlannerDrafts();
    paintPlannerPreview();
    paintPlannerFooter();
  }, 160);
}

function plannerSetHorizon(horizon) {
  if (!plannerCtx || plannerCtx.busy || !LocusPlan.HORIZONS.includes(horizon)) return;
  const form = plannerCtx.form;
  form.horizon = horizon;
  const range = LocusPlan.rangeForHorizon(horizon, form.start);
  if (range) form.end = range.end;
  if (!form.titleEdited) form.title = plannerDefaultTitle(horizon, form.start);
  plannerLoadFormInputs();
  plannerRebuild();
  paintPlanner();
}

async function plannerCopyPrompt() {
  const text = plannerCtx?.prompt || '';
  if (!text) {
    plannerSetStatus('planner.requestBlocked', 'error');
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    plannerSetStatus('planner.copied', 'success');
    return true;
  } catch {
    const area = document.getElementById('planner-prompt');
    const details = document.getElementById('planner-prompt-wrap');
    if (details) details.open = true;
    if (area) { area.focus(); area.select(); }
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    plannerSetStatus(copied ? 'planner.copied' : 'planner.copyFailed', copied ? 'success' : 'error');
    return copied;
  }
}

function plannerCheckPaste() {
  if (!plannerCtx || plannerCtx.busy) return false;
  const text = String(document.getElementById('planner-paste')?.value || '');
  plannerCtx.pasteText = text;
  if (!plannerCurrentRequest()) {
    plannerSetStatus('planner.requestBlocked', 'error');
    return false;
  }
  const outcome = plannerAddDraft(text, { kind: 'paste' });
  if (outcome.error) {
    plannerCtx.activeDraftId = null;
    plannerCtx.preview = { draftId: null, entry: null, result: outcome.error, applied: 0 };
    paintPlannerPreview();
    paintPlannerFooter();
    plannerSetStatus('planner.pasteRejected', 'error');
    return false;
  }
  if (outcome.entry.planId !== plannerCtx.form.planId) {
    const owner = plannerStoredPlan(outcome.entry.planId);
    const pristine = !plannerCtx.form.saved && !String(plannerCtx.form.goals || '').trim()
      && !String(plannerCtx.form.fixedText || '').trim() && !plannerCtx.form.titleEdited;
    if (!owner || !pristine) {
      plannerSetStatus('planner.otherPlanPasted', 'warning');
      paintPlannerDrafts();
      return false;
    }
    // A draft for a saved plan, pasted into an untouched new form: open that
    // plan so the draft is checked against its real inputs.
    plannerLoadPlan(owner.id);
    plannerCtx.activeDraftId = outcome.entry.draftId;
    plannerRefreshPreview();
    paintPlanner();
    plannerSetStatus('planner.switchedPlan', 'info', { title: owner.title || tr('planner.groupNameFallback') });
    return true;
  }
  plannerCtx.activeDraftId = outcome.entry.draftId;
  plannerRefreshPreview();
  paintPlanner();
  plannerSetStatus(outcome.duplicate ? 'planner.pasteRepeated' : 'planner.pasteChecked', 'success');
  return true;
}

function confirmPlannerApply() {
  if (!plannerCtx || plannerCtx.busy) return false;
  plannerRefreshPreview();
  const context = createPlannerApplyContext();
  if (!context) {
    plannerSetStatus('planner.destinationChanged', 'error');
    paintPlanner();
    return false;
  }
  return commitPlannerApply(context);
}

function handlePlannerGlobalKey(event) {
  const overlay = document.getElementById('planner-overlay');
  const open = !!overlay && !overlay.classList.contains('hidden');
  const inside = open && overlay.contains(event.target);
  if (isPlannerMutationPending()) {
    if (inside && event.key === 'Tab') return true;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (open && !inside) document.getElementById('planner-apply')?.focus({ preventScroll: true });
    return true;
  }
  if (!open || inside) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  document.getElementById('planner-plan-title')?.focus({ preventScroll: true });
  return true;
}

function bindPlannerDialog() {
  const overlay = document.getElementById('planner-overlay');
  if (!overlay || typeof LocusPlan === 'undefined') return;
  const form = () => plannerCtx?.form;
  // Choices (selects, checkboxes) rebuild at once so dependent options such
  // as the prompt style list are current before the next choice; typing is
  // debounced.
  const onInput = (id, apply) => {
    const el = document.getElementById(id);
    if (!el) return;
    const immediate = el.type === 'checkbox' || el.tagName === 'SELECT';
    el.addEventListener(immediate ? 'change' : 'input', () => {
      const current = form();
      if (!current || plannerCtx.busy) return;
      apply(current, el);
      if (immediate) {
        clearTimeout(plannerRebuildTimer);
        plannerRebuild();
        paintPlanner();
      } else {
        plannerScheduleRebuild();
      }
    });
  };
  onInput('planner-plan-title', (f, el) => { f.title = el.value; f.titleEdited = true; });
  onInput('planner-start', (f, el) => {
    f.start = el.value;
    const range = LocusPlan.rangeForHorizon(f.horizon, f.start);
    if (range) { f.end = range.end; document.getElementById('planner-end').value = f.end; }
    if (!f.titleEdited) { f.title = plannerDefaultTitle(f.horizon, f.start); document.getElementById('planner-plan-title').value = f.title; }
  });
  onInput('planner-end', (f, el) => { f.end = el.value; });
  onInput('planner-timezone', (f, el) => { f.timezone = el.value.trim(); });
  onInput('planner-goals', (f, el) => { f.goals = el.value; });
  onInput('planner-fixed', (f, el) => { f.fixedText = el.value; });
  onInput('planner-day-start', (f, el) => { f.dayStart = el.value; });
  onInput('planner-day-end', (f, el) => { f.dayEnd = el.value; });
  onInput('planner-max-per-day', (f, el) => { f.maxPerDay = el.value; });
  onInput('planner-notes', (f, el) => { f.notes = el.value; });
  onInput('planner-share-busy', (f, el) => { f.shareBusy = el.checked; });
  onInput('planner-model', (f, el) => { f.model = el.value; });
  onInput('planner-provider', (f, el) => {
    f.provider = LocusPlan.PROVIDERS[el.value] ? el.value : 'claude';
    f.profile = LocusPlan.PROVIDERS[f.provider].profiles[0];
  });
  onInput('planner-profile', (f, el) => { if (LocusPlan.PROFILES[el.value]) f.profile = el.value; });
  onInput('planner-delivery', (f, el) => { f.delivery = el.value === 'mcp' ? 'mcp' : 'paste'; });
  onInput('planner-space', (f, el) => { f.spaceId = el.value; f.groupId = PLANNER_NEW_GROUP; });
  onInput('planner-group', (f, el) => { f.groupId = el.value; });
  document.getElementById('planner-plan-select')?.addEventListener('change', event => plannerLoadPlan(event.target.value));
  for (const button of overlay.querySelectorAll('#planner-horizon [data-horizon]')) {
    button.addEventListener('click', () => plannerSetHorizon(button.dataset.horizon));
  }
  document.getElementById('planner-horizon')?.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !plannerCtx) return;
    event.preventDefault();
    const order = LocusPlan.HORIZONS;
    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const next = order[(order.indexOf(plannerCtx.form.horizon) + step + order.length) % order.length];
    plannerSetHorizon(next);
    overlay.querySelector(`#planner-horizon [data-horizon="${next}"]`)?.focus();
  });
  document.getElementById('planner-form')?.addEventListener('submit', event => {
    event.preventDefault();
    void commitPlannerSave();
  });
  document.getElementById('planner-copy').onclick = () => { void plannerCopyPrompt(); };
  document.getElementById('planner-check-paste').onclick = () => plannerCheckPaste();
  document.getElementById('planner-paste').addEventListener('input', event => { if (plannerCtx) plannerCtx.pasteText = event.target.value; });
  document.getElementById('planner-connect').onclick = () => {
    const granted = plannerRequestNativePermission();
    void plannerCompanionAction('connect', async () => {
      if (!await granted) {
        plannerSetLink('denied');
        return false;
      }
      plannerLink.busy = '';
      return plannerCompanionPull({ quiet: false });
    });
  };
  document.getElementById('planner-share').onclick = () => { void plannerCompanionShare(); };
  document.getElementById('planner-check').onclick = () => { void plannerCompanionPull(); };
  document.getElementById('planner-run').onclick = () => { void plannerCompanionRun(); };
  document.getElementById('planner-apply').onclick = () => { void confirmPlannerApply(); };
  document.getElementById('planner-cancel').onclick = () => closePlannerDialog();
  document.getElementById('planner-close').onclick = () => closePlannerDialog();
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closePlannerDialog();
  });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closePlannerDialog();
      return;
    }
    if (event.key === 'Tab') {
      trapTabKey(event, overlay);
      return;
    }
    event.stopPropagation();
  });
}
