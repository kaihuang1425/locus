/* Locus plan.js: the Plan surface (Upcoming, Sort inbox) and the two Auto-plan
   rules. Loaded before newtab.js; like planner.js it only declares functions and
   touches newtab.js globals (State, tr, toast, setReminder, Router, ...) at call
   time.

   Data model. Plan adds no schema field. "Planned" means an item has a reminder:
   the lanes read reminder dates, and every move goes through the same reminder
   transactions as the rest of Locus (receipt-gated write, alarm reconciliation,
   normal Undo). Two pieces are per-device view state in localStorage, like
   Today's Later order: which Inbox items were sent to Someday, and how many times
   an item was moved (the "↻ 2×" mark). Neither enters the stored graph, export,
   or Undo. */

const PLAN_OVERLOAD_LIMIT = 5;
const PLAN_SOMEDAY_KEY = 'locus.plan.someday';
const PLAN_MOVES_KEY = 'locus.plan.moves';
const PLAN_ROLLOVER_DAY_KEY = 'locus.plan.rolloverDay';
const PLAN_DAY_MS = 86400000;

// ── Day arithmetic (local time; setHours keeps DST days correct) ──
function planDayStart(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function planAddDays(dayStart, days) {
  const d = new Date(dayStart);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function planAtTime(dayStart, hours, minutes = 0) {
  const d = new Date(dayStart);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}
// Weeks start on Monday, matching the week bar.
function planWeekStart(now) {
  const d = new Date(planDayStart(now));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function planDayKey(ms) {
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function planBounds(now) {
  const today = planDayStart(now);
  const tomorrow = planAddDays(today, 1);
  const afterTomorrow = planAddDays(today, 2);
  const weekStart = planWeekStart(now);
  const nextWeek = planAddDays(weekStart, 7);
  const weekAfter = planAddDays(weekStart, 14);
  return { today, tomorrow, afterTomorrow, weekStart, nextWeek, weekAfter };
}
// Same time of day on another day; DST-safe.
function planSameTimeOn(at, dayStart) {
  const from = new Date(at);
  return planAtTime(dayStart, from.getHours(), from.getMinutes());
}
// The next whole hour strictly after `now`.
function planNextWholeHour(now) {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.getTime();
}

// ── Per-device view state ──────────────────────────────────────
function planReadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
}
function planWriteStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function planSomedayIds() {
  const list = planReadStore(PLAN_SOMEDAY_KEY, []);
  return new Set(Array.isArray(list) ? list.map(String) : []);
}
function planSetSomeday(id, on) {
  const ids = planSomedayIds();
  if (on) ids.add(String(id)); else ids.delete(String(id));
  planWriteStore(PLAN_SOMEDAY_KEY, [...ids].slice(-500));
}
function planMoveCounts() {
  const counts = planReadStore(PLAN_MOVES_KEY, {});
  return counts && !Array.isArray(counts) ? counts : {};
}
// Each bump remembers the Undo action that made it, so pressing Undo takes the
// move back off the count. Undo history lives for one page load, and so does
// this link.
const planMoveActions = new Map();
function planBumpMoves(ids, actionId = null) {
  const counts = planMoveCounts();
  const list = (Array.isArray(ids) ? ids : [ids]).map(String);
  list.forEach(key => {
    counts[key] = Math.min(99, (Number(counts[key]) || 0) + 1);
  });
  const keys = Object.keys(counts);
  if (keys.length > 500) keys.slice(0, keys.length - 500).forEach(key => { delete counts[key]; });
  planWriteStore(PLAN_MOVES_KEY, counts);
  if (actionId != null) {
    planMoveActions.set(actionId, list);
    if (planMoveActions.size > 60) planMoveActions.delete(planMoveActions.keys().next().value);
  }
}
function planUndoMoves(actionId) {
  const list = planMoveActions.get(actionId);
  if (!list) return false;
  planMoveActions.delete(actionId);
  const counts = planMoveCounts();
  list.forEach(key => {
    const left = (Number(counts[key]) || 0) - 1;
    if (left > 0) counts[key] = left; else delete counts[key];
  });
  planWriteStore(PLAN_MOVES_KEY, counts);
  return true;
}
function planLatestActionId() {
  try { return typeof State.latestActionId === 'function' ? State.latestActionId() : null; } catch { return null; }
}

// ── Model: what is planned, and when ───────────────────────────
// Walks one workspace and returns every planned item (has a reminder) and every
// open to-do without a date. Items whose id appears twice are skipped, as on
// Today, so a move can never resolve to the wrong record.
function planCollect(workspace) {
  const dated = [];
  const undated = [];
  const seen = new Map();
  const rows = [];
  (Array.isArray(workspace?.categories) ? workspace.categories : []).forEach(space => {
    (Array.isArray(space?.groups) ? space.groups : []).forEach(group => {
      const walk = items => (Array.isArray(items) ? items : []).forEach(item => {
        if (!item || typeof item !== 'object') return;
        rows.push({ item, space, group });
        const id = String(item.id || '');
        if (id) seen.set(id, (seen.get(id) || 0) + 1);
        if (item.type === 'stack') walk(item.items);
      });
      walk(group?.items);
    });
  });
  rows.forEach(({ item, space, group }) => {
    const id = String(item.id || '');
    if (!id || seen.get(id) !== 1) return;
    if (item.type === 'todo' && item.done === true) return;
    const entry = {
      id,
      item,
      type: String(item.type || ''),
      title: planItemTitle(item),
      color: item.color || group?.color || null,
      wsId: String(workspace.id || ''),
      spaceId: String(space?.id || ''),
      groupId: String(group?.id || ''),
      createdAt: Number(item.createdAt) || 0,
      at: null,
      recur: null,
    };
    const at = item.reminder && item.reminder.at != null ? Number(item.reminder.at) : NaN;
    if (Number.isFinite(at)) {
      entry.at = at;
      entry.recur = item.reminder.recur || null;
      entry.notified = item.reminder.notified === true;
      dated.push(entry);
    } else if (item.type === 'todo') {
      undated.push(entry);
    }
  });
  return { dated, undated };
}
function planItemTitle(item) {
  if (typeof reminderItemTitle === 'function') {
    try { return String(reminderItemTitle(item) || '').trim(); } catch {}
  }
  return String(item?.title || item?.text || item?.url || '').trim();
}

// Lane ids in display order. `later` only shows when it has items.
const PLAN_LANES = ['today', 'tomorrow', 'week', 'next', 'later', 'someday'];

function planLaneModel(collected, now = Date.now(), somedayIds = new Set(), allRows = null) {
  const b = planBounds(now);
  const lanes = Object.fromEntries(PLAN_LANES.map(id => [id, []]));
  const laneOf = at => {
    if (at < b.today) return 'today';
    if (at < b.tomorrow) return 'today';
    if (at < b.afterTomorrow) return 'tomorrow';
    if (at < b.nextWeek) return 'week';
    if (at < b.weekAfter) return 'next';
    return 'later';
  };
  collected.dated.forEach(entry => {
    // A past reminder on a page or note already fired; only an open to-do is
    // still waiting to be done, and it waits in Today.
    if (entry.at < now && entry.type !== 'todo') return;
    const lane = laneOf(entry.at);
    lanes[lane].push(Object.assign({}, entry, { overdue: entry.at < b.today }));
  });
  collected.undated.forEach(entry => {
    // Matches Today's "anytime": an undated to-do written today belongs to
    // today, unless it was sent to Someday on this device.
    const writtenToday = entry.createdAt >= b.today && entry.createdAt < b.tomorrow;
    if (writtenToday && !somedayIds.has(entry.id)) lanes.today.push(entry);
    else lanes.someday.push(entry);
  });
  // Inbox items sent to Someday on this device, while they still have no date.
  if (allRows) {
    allRows.forEach(entry => {
      if (entry.at != null || entry.type === 'todo') return;
      if (somedayIds.has(entry.id)) lanes.someday.push(entry);
    });
  }
  const byTime = (x, y) => ((x.at ?? Infinity) - (y.at ?? Infinity))
    || (x.createdAt - y.createdAt)
    || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  PLAN_LANES.forEach(id => lanes[id].sort(byTime));
  lanes.someday.sort((x, y) => (y.createdAt - x.createdAt) || (x.id < y.id ? -1 : 1));
  // "This week" has no days left on Saturday and Sunday.
  const hasWeekRange = b.afterTomorrow < b.nextWeek;
  return PLAN_LANES
    .filter(id => (id === 'week' ? hasWeekRange || lanes.week.length : true))
    .filter(id => id !== 'later' || lanes.later.length)
    .map(id => ({ id, items: lanes[id] }));
}

// The day a planned thing counts toward. Overdue to-dos count toward today,
// because that is where they wait; a page or note whose time passed already
// fired and counts nowhere. The week bar and Even out both use this, so Even
// out can always bring the day the bar flags back under the limit.
function planCountsOn(entry, b, now) {
  if (entry.at < now && entry.type !== 'todo') return null;
  return planDayStart(entry.at < b.today ? b.today : entry.at);
}
// Seven days from Monday with how many planned things each holds.
function planWeekModel(collected, now = Date.now()) {
  const b = planBounds(now);
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const start = planAddDays(b.weekStart, i);
    days.push({ start, end: planAddDays(start, 1), count: 0, isToday: start === b.today, isPast: start < b.today });
  }
  collected.dated.forEach(entry => {
    const start = planCountsOn(entry, b, now);
    const day = start == null ? null : days.find(d => d.start === start);
    if (day) day.count += 1;
  });
  days.forEach(day => { day.over = day.count > PLAN_OVERLOAD_LIMIT; });
  return days;
}
function planOverloadedDay(days) {
  return days.find(day => !day.isPast && day.over) || null;
}

// Moves for "Even out <day>": keep the first five by time, and send each extra
// one (latest first) to the lightest later day this week, then next week, at the
// same time of day. The day holds what the week bar counts for it, overdue
// to-dos included. Repeating reminders stay put, and so do pages and notes
// whose time has passed (they are not counted either).
function planEvenOutChanges(collected, dayStart, now = Date.now()) {
  const b = planBounds(now);
  const inDay = collected.dated
    .filter(entry => planCountsOn(entry, b, now) === dayStart)
    .sort((x, y) => x.at - y.at);
  const extra = inDay.slice(PLAN_OVERLOAD_LIMIT).filter(entry => !entry.recur).reverse();
  if (!extra.length) return [];
  const counts = new Map();
  const candidates = [];
  for (let i = 1; i <= 13; i += 1) {
    const start = planAddDays(dayStart, i);
    if (start < b.today) continue;
    candidates.push(start);
    counts.set(start, 0);
  }
  collected.dated.forEach(entry => {
    const start = planCountsOn(entry, b, now);
    if (counts.has(start)) counts.set(start, counts.get(start) + 1);
  });
  const changes = [];
  extra.forEach(entry => {
    let best = null;
    candidates.forEach(start => {
      if (counts.get(start) >= PLAN_OVERLOAD_LIMIT) return;
      if (best == null || counts.get(start) < counts.get(best)) best = start;
    });
    if (best == null) return;
    const to = planSameTimeOn(entry.at, best);
    if (to <= now) return;
    counts.set(best, counts.get(best) + 1);
    changes.push({ id: entry.id, from: entry.at, to });
  });
  return changes;
}

// "Unfinished things move to tomorrow": on the first open of a day, every open
// to-do whose date has passed comes forward to today at its own time, or the
// next whole hour when that time is already gone. Repeating reminders re-arm on
// their own and are left alone.
// An id that appears more than once anywhere (planCollect dedupes inside one
// workspace only) can't be resolved to one record, so it is left out rather
// than blocking every other to-do.
function planIdCounts(workspaces) {
  const counts = new Map();
  const walk = items => (Array.isArray(items) ? items : []).forEach(item => {
    if (!item || typeof item !== 'object') return;
    const id = String(item.id || '');
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
    if (item.type === 'stack') walk(item.items);
  });
  (Array.isArray(workspaces) ? workspaces : []).forEach(workspace => {
    (Array.isArray(workspace?.categories) ? workspace.categories : []).forEach(space => {
      (Array.isArray(space?.groups) ? space.groups : []).forEach(group => walk(group?.items));
    });
  });
  return counts;
}
function planRollOverChanges(workspaces, now = Date.now()) {
  const today = planDayStart(now);
  const tomorrow = planAddDays(today, 1);
  const changes = [];
  const idCounts = planIdCounts(workspaces);
  (Array.isArray(workspaces) ? workspaces : []).forEach(workspace => {
    planCollect(workspace).dated.forEach(entry => {
      if (entry.type !== 'todo' || entry.recur || entry.at >= today) return;
      if (idCounts.get(entry.id) !== 1) return;
      let to = planSameTimeOn(entry.at, today);
      if (to <= now) to = planNextWholeHour(now);
      if (to >= tomorrow) to = planSameTimeOn(entry.at, tomorrow);
      if (to <= now) return;
      changes.push({ id: entry.id, from: entry.at, to });
    });
  });
  return changes;
}

// Times offered by a card's move menu. Each option is a concrete time so the
// menu says exactly what will happen.
function planMoveOptions(now = Date.now()) {
  const b = planBounds(now);
  const options = [];
  const laterToday = planAtTime(b.today, 18);
  if (laterToday - now > 30 * 60000) options.push({ key: 'laterToday', at: laterToday });
  const tonight = planAtTime(b.today, 20);
  if (tonight - now > 30 * 60000) options.push({ key: 'tonight', at: tonight });
  options.push({ key: 'tomorrow', at: planAtTime(b.tomorrow, 9) });
  const saturday = planAddDays(b.weekStart, 5);
  if (saturday > b.tomorrow) options.push({ key: 'weekend', at: planAtTime(saturday, 10) });
  options.push({ key: 'nextWeek', at: planAtTime(b.nextWeek, 9) });
  options.push({ key: 'someday', at: null });
  return options;
}

// Sort inbox: "Today" means later today; "This week" means the lightest day left
// this week at 09:00 (tomorrow when the week is over).
function planSortTodayAt(now = Date.now()) {
  const b = planBounds(now);
  let at = Math.max(planAtTime(b.today, 18), planNextWholeHour(now));
  if (at >= b.tomorrow) at = planAtTime(b.tomorrow, 9);
  return at;
}
function planSortWeekAt(collected, now = Date.now()) {
  const b = planBounds(now);
  const days = [];
  for (let start = b.tomorrow; start < b.nextWeek; start = planAddDays(start, 1)) days.push(start);
  if (!days.length) return planAtTime(b.tomorrow, 9);
  const counts = new Map(days.map(start => [start, 0]));
  collected.dated.forEach(entry => {
    const start = planDayStart(entry.at);
    if (counts.has(start)) counts.set(start, counts.get(start) + 1);
  });
  let best = days[0];
  days.forEach(start => { if (counts.get(start) < counts.get(best)) best = start; });
  return planAtTime(best, 9);
}
// What Sort inbox still has to decide: Inbox items with no date, not sent to
// Someday on this device, and not finished.
function planSortQueue(inboxGroup, somedayIds = new Set()) {
  return (Array.isArray(inboxGroup?.items) ? inboxGroup.items : []).filter(item => {
    if (!item || typeof item !== 'object' || !item.id) return false;
    if (!['tab', 'note', 'todo'].includes(item.type)) return false;
    if (item.type === 'todo' && item.done === true) return false;
    if (item.reminder && item.reminder.at != null) return false;
    return !somedayIds.has(String(item.id));
  });
}

// ── One acknowledged write for several reminder moves ──────────
// Mirrors commitItemReminderMutation: resolve every exact target first, take one
// Undo snapshot, change the reminders, and wait for the write receipt with alarm
// reconciliation. Nothing is written if any target changed, unless the caller
// passes `partial: true` (roll-over), which drops the targets that no longer
// resolve and moves the rest.
let planBatchPending = null;
async function commitPlanReminderBatch(requested, historyKey, opts = {}) {
  if (!Array.isArray(requested) || !requested.length) return { ok: true, moved: 0, ids: [], changes: [] };
  if (planBatchPending || isReminderMutationPending()) return { ok: false, code: 'busy' };
  if (State.isRecoveryRequired?.()) {
    if (typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired();
    return { ok: false, code: 'recovery' };
  }
  const partial = opts.partial === true;
  let changes = requested;
  let targets = changes.map(change => {
    const context = createItemReminderMutationContext(change.id);
    return context ? resolveItemReminderMutationTarget(context) : null;
  });
  if (partial) {
    changes = changes.filter((_, index) => targets[index]);
    targets = targets.filter(Boolean);
    if (!changes.length) return { ok: true, moved: 0, ids: [], changes: [], skipped: requested.length };
  } else if (targets.some(target => !target)) return { ok: false, code: 'changed' };
  const transaction = { kind: 'plan-batch', ids: changes.map(change => change.id) };
  planBatchPending = transaction;
  itemReminderMutationPending = transaction;
  let actionId;
  try {
    actionId = State.snapshot(tr(historyKey));
    targets.forEach((target, index) => {
      const next = isItemDetailRecord(target.item.reminder) ? cloneItemDetailJson(target.item.reminder) : {};
      next.at = changes[index].to;
      next.notified = false;
      target.item.reminder = next;
    });
  } catch (error) {
    planBatchPending = null;
    if (itemReminderMutationPending === transaction) itemReminderMutationPending = null;
    State.requireRecovery?.();
    if (typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired(error);
    return { ok: false, code: 'recovery' };
  }
  let receipt;
  try {
    receipt = await State.persistNow({ reconcileReminders: true });
  } catch (error) {
    planBatchPending = null;
    if (itemReminderMutationPending === transaction) itemReminderMutationPending = null;
    if (State.isRecoveryRequired?.() && typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired(error);
    return { ok: false, code: 'write' };
  }
  const current = planBatchPending === transaction;
  planBatchPending = null;
  if (itemReminderMutationPending === transaction) itemReminderMutationPending = null;
  if (!current) return { ok: false, code: 'changed' };
  return {
    ok: true,
    moved: changes.length,
    ids: changes.map(change => change.id),
    changes,
    skipped: requested.length - changes.length,
    actionId,
    alarmsReconciled: receipt?.reminderReconciliation?.ok === true,
  };
}

// ── Auto-plan rules ────────────────────────────────────────────
// Absent settings keep today's behaviour: roll-over is off for a profile that
// predates it (new profiles start with it on), and the overload warning, which
// changes no data, is on unless turned off.
function planRuleOn(settings, key) {
  if (key === 'planWarnOverload') return settings?.planWarnOverload !== false;
  if (key === 'planRollOver') return settings?.planRollOver === true;
  return false;
}
let planRuleSettingPending = null;
async function commitPlanRuleSetting(key, on) {
  if (!['planWarnOverload', 'planRollOver'].includes(key) || planRuleSettingPending) return false;
  if (State.isRecoveryRequired?.()) {
    if (typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired();
    return false;
  }
  const state = State.get();
  const settings = state?.settings;
  if (!settings || typeof settings !== 'object') return false;
  if (planRuleOn(settings, key) === on) return true;
  const had = Object.prototype.hasOwnProperty.call(settings, key);
  const before = settings[key];
  const transaction = { key, on };
  planRuleSettingPending = transaction;
  settings[key] = on === true;
  try {
    await State.persistNow();
  } catch (error) {
    if (planRuleSettingPending === transaction) planRuleSettingPending = null;
    if (State.get() === state && State.get().settings === settings) {
      if (had) settings[key] = before; else delete settings[key];
    }
    toast(tr('plan.ruleFailed'), { tone: 'warning' });
    if (State.isRecoveryRequired?.() && typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired(error);
    renderBoard();
    return false;
  }
  if (planRuleSettingPending === transaction) planRuleSettingPending = null;
  renderBoard();
  return true;
}

// Runs once per day, on the first open with the rule on. The claim is the UTC
// instant of the run, compared with the start of the current local day, so a
// run in one time zone never blocks the next local day in another. A failed
// write releases the claim and tries again on the next open.
let planRollOverRunning = false;
function planRollOverRanToday(last, now) {
  if (last == null || last === '') return false;
  // Before 2026-11-07 the claim was a local YYYY-MM-DD key.
  if (/^\d{4}-\d{2}-\d{2}$/.test(last)) return last === planDayKey(now);
  const at = Number(last);
  return Number.isFinite(at) && at >= planDayStart(now) && at <= planAddDays(planDayStart(now), 1);
}
// Toast copy follows where the to-dos landed: after about 23:00 they go to
// tomorrow, not today.
function planRollOverToastKey(changes, now) {
  const tomorrow = planAddDays(planDayStart(now), 1);
  const later = changes.filter(change => change.to >= tomorrow).length;
  const one = changes.length === 1;
  if (later === changes.length) return one ? 'plan.rolledOverTomorrowOne' : 'plan.rolledOverTomorrow';
  if (later === 0) return one ? 'plan.rolledOverOne' : 'plan.rolledOver';
  return 'plan.rolledOverSplit';
}
async function runPlanRollOver(now = Date.now()) {
  if (planRollOverRunning) return { ran: false, reason: 'running' };
  const state = State.get();
  if (!planRuleOn(state?.settings, 'planRollOver')) return { ran: false, reason: 'off' };
  if (State.isRecoveryRequired?.()) return { ran: false, reason: 'recovery' };
  let last = null;
  try { last = localStorage.getItem(PLAN_ROLLOVER_DAY_KEY); } catch {}
  if (planRollOverRanToday(last, now)) return { ran: false, reason: 'done-today' };
  // Claim the day before writing: two Locus tabs opened together (a restored
  // session) both reach this point, and only the first may move anything.
  const claim = String(now);
  try { localStorage.setItem(PLAN_ROLLOVER_DAY_KEY, claim); } catch {}
  const release = () => {
    try {
      if (localStorage.getItem(PLAN_ROLLOVER_DAY_KEY) !== claim) return;
      if (last) localStorage.setItem(PLAN_ROLLOVER_DAY_KEY, last); else localStorage.removeItem(PLAN_ROLLOVER_DAY_KEY);
    } catch {}
  };
  const requested = planRollOverChanges(state.workspaces, now);
  if (!requested.length) return { ran: true, moved: 0 };
  planRollOverRunning = true;
  let result;
  try {
    // A to-do that changed or vanished meanwhile is skipped, not allowed to
    // block every other one.
    result = await commitPlanReminderBatch(requested, 'plan.history.rollOver', { partial: true });
  } finally {
    planRollOverRunning = false;
  }
  if (!result.ok) {
    // A target that changed during the write ('changed') would fail the same
    // way on every open, so the day stays claimed. Anything else retries.
    if (result.code !== 'changed') release();
    // A recovery dialog already explains a failed write; only a quiet failure
    // needs the warning.
    if (result.code !== 'busy' && !State.isRecoveryRequired?.()) toast(tr('plan.rollOverFailed'), { tone: 'warning' });
    return { ran: false, reason: result.code };
  }
  const changes = result.changes || [];
  if (!changes.length) return { ran: true, moved: 0, skipped: result.skipped || 0 };
  planBumpMoves(changes.map(change => change.id), result.actionId);
  renderBoard();
  toast(tr(planRollOverToastKey(changes, now), { count: changes.length }), {
    undo: result.actionId,
    tone: result.alarmsReconciled ? undefined : 'warning',
  });
  return { ran: true, moved: changes.length, skipped: result.skipped || 0 };
}

// ── Surface ────────────────────────────────────────────────────
let planSortSession = null;
let planJustLanded = null;
let planAutoMenuOpen = false;
let planSomedayExpanded = false;

function planInboxGroup(workspace) {
  if (typeof resolveLandingInboxTarget !== 'function' || typeof createLandingInboxContext !== 'function') return null;
  try { return resolveLandingInboxTarget(createLandingInboxContext(workspace))?.group || null; } catch { return null; }
}
function planTimeLabel(at) {
  return new Date(at).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' });
}
function planWeekdayLabel(at) {
  return new Date(at).toLocaleDateString(appLocale(), { weekday: 'short' });
}
function planChipLabel(entry, laneId) {
  if (entry.at == null) return '';
  if (entry.overdue) return new Date(entry.at).toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' });
  if (laneId === 'today' || laneId === 'tomorrow') return planTimeLabel(entry.at);
  if (laneId === 'week' || laneId === 'next') return `${planWeekdayLabel(entry.at)} ${planTimeLabel(entry.at)}`;
  return new Date(entry.at).toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' });
}
function planOptionHint(option) {
  if (option.at == null) return '';
  const day = planDayStart(option.at);
  const today = planDayStart(Date.now());
  if (day === today || day === planAddDays(today, 1)) return planTimeLabel(option.at);
  return `${planWeekdayLabel(option.at)} ${planTimeLabel(option.at)}`;
}
function planSvg(path, size = 15, stroke = 1.6) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}
const PLAN_ICONS = {
  calendar: 'M2.7 3.4h10.6a1 1 0 0 1 1 1v8.3a1 1 0 0 1-1 1H2.7a1 1 0 0 1-1-1V4.4a1 1 0 0 1 1-1zM1.7 6.7h12.6M5.1 1.9v2.8M10.9 1.9v2.8',
  clock: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 5v3.2l2 1.3',
  bolt: 'M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z',
  chevron: 'M4.5 6.5 8 10l3.5-3.5',
  spark: 'M8 1.8v3M8 11.2v3M1.8 8h3M11.2 8h3M3.6 3.6l2 2M10.4 10.4l2 2M12.4 3.6l-2 2M5.6 10.4l-2 2',
  bars: 'M2 12h12M4 12V8M8 12V5M12 12V8',
  check: 'M3.5 8.5l3 3 6-7',
  rolled: 'M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3',
};

function openPlan(view = 'upcoming') {
  const ws = activeWs();
  if (!ws) return;
  Router.navigate({ type: 'calendar', wsId: ws.id, query: { cal: PLAN_VIEWS.includes(view) ? view : 'upcoming' } });
}
function setPlanView(view) {
  if (!activeCalendar) {
    if (view === 'calendar') openCalendar();
    else openPlan(view);
    return;
  }
  const ws = activeWs();
  if (!ws) return;
  if (view === 'calendar') {
    const target = CAL_VIEWS.includes(activeCalendar.lastCalendarView) ? activeCalendar.lastCalendarView : 'month';
    Router.navigate({ type: 'calendar', wsId: ws.id, query: target !== 'month' ? { cal: target } : {} });
    return;
  }
  Router.navigate({ type: 'calendar', wsId: ws.id, query: { cal: view } });
}
function isPlanView(view) {
  return PLAN_VIEWS.includes(view);
}

// Header shared by Upcoming, Sort inbox, and the Calendar views.
function buildPlanHeader(ws, mode) {
  const head = document.createElement('div');
  head.className = 'plan-hd';
  const sortCount = planSortQueue(planInboxGroup(ws), planSomedayIds()).length;
  const segIndex = mode === 'sort' ? 1 : 0;
  head.innerHTML = `
    <h1 class="plan-title" id="plan-title">${esc(tr('plan.title'))}</h1>
    <div class="plan-seg" role="group" aria-label="${esc(tr('plan.viewGroup'))}" data-index="${segIndex}" data-calendar="${mode === 'calendar'}">
      <span class="plan-seg-thumb" aria-hidden="true"></span>
      <button type="button" class="plan-seg-btn" data-plan-view="upcoming" aria-pressed="${mode === 'upcoming'}">${esc(tr('plan.upcoming'))}</button>
      <button type="button" class="plan-seg-btn" data-plan-view="sort" aria-pressed="${mode === 'sort'}">${esc(tr('plan.sortInbox'))}${sortCount ? `<span class="plan-bub plan-bub-badge" aria-label="${esc(tr('plan.leftToSort', { count: sortCount }))}">${sortCount}</span>` : ''}</button>
    </div>
    <button type="button" class="plan-ibtn" data-plan-view="calendar" aria-pressed="${mode === 'calendar'}" aria-label="${esc(tr('cal.title'))}" title="${esc(tr('cal.title'))}">${planSvg(PLAN_ICONS.calendar, 17, 1.4)}</button>
    <button type="button" class="plan-ai" id="plan-ai-btn">${planSvg(PLAN_ICONS.spark, 15, 1.6)}<span>${esc(tr('planner.title'))}</span></button>`;
  head.querySelectorAll('[data-plan-view]').forEach(button => {
    button.onclick = () => setPlanView(button.dataset.planView);
  });
  const ai = head.querySelector('#plan-ai-btn');
  if (typeof openPlannerDialog === 'function') ai.onclick = () => openPlannerDialog(ai);
  else ai.remove();
  return head;
}

function buildPlanAutoPill() {
  const settings = State.get().settings || {};
  const rules = [
    { key: 'planRollOver', label: tr('plan.rule.rollOver') },
    { key: 'planWarnOverload', label: tr('plan.rule.warn') },
  ];
  const anyOn = rules.some(rule => planRuleOn(settings, rule.key));
  const wrap = document.createElement('div');
  wrap.className = 'plan-auto';
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'plan-auto-pill';
  pill.id = 'plan-auto-pill';
  pill.setAttribute('aria-expanded', String(planAutoMenuOpen));
  pill.setAttribute('aria-controls', 'plan-auto-menu');
  pill.innerHTML = `<span class="plan-auto-bolt" aria-hidden="true">${planSvg(PLAN_ICONS.bolt, 12, 2)}</span><span>${esc(tr(anyOn ? 'plan.autoOn' : 'plan.autoOff'))}</span><span class="plan-auto-chev" aria-hidden="true">${planSvg(PLAN_ICONS.chevron, 13, 1.8)}</span>`;
  pill.onclick = () => {
    planAutoMenuOpen = !planAutoMenuOpen;
    renderBoard();
    requestAnimationFrame(() => document.getElementById(planAutoMenuOpen ? 'plan-rule-planRollOver' : 'plan-auto-pill')?.focus());
  };
  wrap.appendChild(pill);
  if (planAutoMenuOpen) {
    const menu = document.createElement('div');
    menu.className = 'plan-auto-menu';
    menu.id = 'plan-auto-menu';
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', tr('plan.autoTitle'));
    rules.forEach(rule => {
      const row = document.createElement('label');
      row.className = 'plan-rule';
      const on = planRuleOn(settings, rule.key);
      row.innerHTML = `<span class="plan-rule-label">${esc(rule.label)}</span><button type="button" class="plan-switch" role="switch" id="plan-rule-${rule.key}" aria-checked="${on}" aria-label="${esc(rule.label)}"><span></span></button>`;
      const sw = row.querySelector('button');
      sw.onclick = async () => {
        sw.disabled = true;
        await commitPlanRuleSetting(rule.key, !on);
        requestAnimationFrame(() => document.getElementById(`plan-rule-${rule.key}`)?.focus());
      };
      menu.appendChild(row);
    });
    menu.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      planAutoMenuOpen = false;
      renderBoard();
      requestAnimationFrame(() => document.getElementById('plan-auto-pill')?.focus());
    });
    wrap.appendChild(menu);
  }
  return wrap;
}

function renderPlanSurface(ws) {
  if (!ws || !activeCalendar || !isPlanView(activeCalendar.view)) return false;
  hideBreadcrumb();
  // A Sort answer is landing: keep the leaving card on screen; planSortChoose
  // repaints once it has gone.
  if (activeCalendar.view === 'sort' && planSortSession?.holdRender && document.getElementById('plan-sort')) {
    document.getElementById('board').classList.add('calendar-mode', 'plan-mode');
    return true;
  }
  // Sort answers to 1, 2, 3, A, and → as soon as it opens, and keeps the keys
  // across re-renders while focus was on the card or nowhere in particular.
  const active = document.activeElement;
  const sortWasShown = !!document.getElementById('plan-sort');
  const sortWantsFocus = activeCalendar.view === 'sort'
    && (!sortWasShown || !active || active === document.body || !!active.closest?.('#plan-sort'));
  const $b = document.getElementById('board');
  $b.classList.remove('list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'group-page-mode');
  $b.classList.add('calendar-mode', 'plan-mode');
  $b.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'plan';
  page.setAttribute('aria-labelledby', 'plan-title');
  page.appendChild(buildPlanHeader(ws, activeCalendar.view));
  page.appendChild(buildPlanAutoPill());
  if (activeCalendar.view === 'sort') page.appendChild(buildPlanSort(ws));
  else buildPlanUpcoming(ws).forEach(node => page.appendChild(node));
  $b.appendChild(page);
  if (planJustLanded) {
    const landed = page.querySelector(`[data-plan-id="${CSS.escape(planJustLanded)}"]`);
    if (landed) landed.classList.add('is-landed');
    planJustLanded = null;
  }
  if (sortWantsFocus) planFocusSort();
  return true;
}

function buildPlanUpcoming(ws) {
  const collected = planCollect(ws);
  const somedayIds = planSomedayIds();
  const now = Date.now();
  const allRows = collected.dated.concat(collected.undated);
  // Someday-marked pages and notes have no date, so they are not in `dated`.
  const inbox = planInboxGroup(ws);
  const markedRows = [];
  if (inbox) {
    (inbox.items || []).forEach(item => {
      if (!item || !somedayIds.has(String(item.id)) || item.type === 'todo') return;
      if (item.reminder && item.reminder.at != null) return;
      markedRows.push({
        id: String(item.id), item, type: String(item.type || ''), title: planItemTitle(item),
        color: item.color || inbox.color || null, wsId: String(ws.id), groupId: String(inbox.id || ''),
        createdAt: Number(item.createdAt) || 0, at: null, recur: null,
      });
    });
  }
  const lanes = planLaneModel(collected, now, somedayIds, allRows.concat(markedRows));
  const days = planWeekModel(collected, now);
  return [buildPlanWeekBar(ws, collected, days), buildPlanLanes(lanes)];
}

function buildPlanWeekBar(ws, collected, days) {
  const settings = State.get().settings || {};
  const warn = planRuleOn(settings, 'planWarnOverload');
  const over = planOverloadedDay(days);
  const max = Math.max(PLAN_OVERLOAD_LIMIT + 1, ...days.map(day => day.count));
  const section = document.createElement('section');
  section.className = 'plan-week';
  section.id = 'plan-week';
  section.tabIndex = -1;
  section.setAttribute('aria-labelledby', 'plan-week-title');
  const dayName = day => new Date(day.start).toLocaleDateString(appLocale(), { weekday: 'short' });
  const summary = days.map(day => `${dayName(day)} ${day.count}`).join(', ');
  section.innerHTML = `
    <div class="plan-week-side">
      <h2 class="plan-week-title" id="plan-week-title">${esc(tr('plan.thisWeek'))}</h2>
      <div class="plan-week-action"></div>
    </div>
    <div class="plan-week-bars" role="img" aria-label="${esc(tr('plan.weekShape', { days: summary }))}">
      ${days.map(day => {
        const cls = ['plan-day', day.isToday ? 'is-today' : '', day.isPast ? 'is-past' : '', warn && day.over && !day.isPast ? 'is-over' : ''].filter(Boolean).join(' ');
        const height = Math.round(8 + (day.count / max) * 112);
        return `<div class="${cls}"><span class="plan-day-n">${day.count}</span><span class="plan-day-bar" style="--h:${height}px"></span><span class="plan-day-lbl">${esc(day.isToday ? tr('plan.lane.today') : dayName(day))}</span></div>`;
      }).join('')}
    </div>`;
  const action = section.querySelector('.plan-week-action');
  if (over) {
    const name = new Date(over.start).toLocaleDateString(appLocale(), { weekday: 'long' });
    if (warn) {
      const note = document.createElement('p');
      note.className = 'plan-week-warn';
      note.textContent = tr('plan.overloaded', { day: name, count: over.count });
      action.appendChild(note);
    }
    const changes = planEvenOutChanges(collected, over.start);
    if (changes.length) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'plan-btn plan-btn-when';
      button.id = 'plan-even-out';
      button.innerHTML = `${planSvg(PLAN_ICONS.bars, 15, 1.8)}<span>${esc(tr('plan.evenOut', { day: name }))}</span>`;
      button.onclick = () => planEvenOut(over.start, name, button);
      action.appendChild(button);
    }
  }
  return section;
}

async function planEvenOut(dayStart, dayName, button) {
  const ws = activeWs();
  if (!ws) return;
  const changes = planEvenOutChanges(planCollect(ws), dayStart);
  if (!changes.length) return;
  if (button) button.disabled = true;
  const result = await commitPlanReminderBatch(changes, 'plan.history.evenOut');
  if (!result.ok) {
    if (button) button.disabled = false;
    if (result.code !== 'busy') toast(tr('plan.moveFailed'), { tone: 'warning' });
    renderBoard();
    return;
  }
  planBumpMoves(changes.map(change => change.id), result.actionId);
  renderBoard();
  planFocusAfterMove(null);
  toast(tr(changes.length === 1 ? 'plan.evenedOne' : 'plan.evened', { count: changes.length, day: dayName }), {
    undo: result.actionId,
    tone: result.alarmsReconciled ? undefined : 'warning',
  });
}

// After a move or Even out the board is rebuilt; focus goes to the moved card's
// move button, else Even out (if it is still offered), else the week bar.
function planFocusAfterMove(id) {
  requestAnimationFrame(() => {
    const card = id != null ? document.querySelector(`.plan-card[data-plan-id="${CSS.escape(String(id))}"] .plan-mv`) : null;
    const target = card || document.getElementById('plan-even-out') || document.getElementById('plan-week');
    if (!target) return;
    try { target.focus({ preventScroll: !card }); } catch { try { target.focus(); } catch {} }
  });
}

function buildPlanLanes(lanes) {
  const grid = document.createElement('div');
  grid.className = 'plan-lanes';
  const moves = planMoveCounts();
  lanes.forEach(lane => {
    const section = document.createElement('section');
    section.className = `plan-lane plan-lane-${lane.id}`;
    const titleId = `plan-lane-${lane.id}`;
    section.setAttribute('aria-labelledby', titleId);
    const limit = lane.id === 'someday' && !planSomedayExpanded ? 6 : Infinity;
    const shown = lane.items.slice(0, limit);
    section.innerHTML = `<div class="plan-lane-hd"><h2 id="${titleId}">${esc(tr(`plan.lane.${lane.id}`))}</h2><span class="plan-bub">${lane.items.length}</span></div>`;
    if (!lane.items.length) {
      const empty = document.createElement('p');
      empty.className = 'plan-lane-empty';
      empty.textContent = tr('plan.laneEmpty');
      section.appendChild(empty);
    }
    shown.forEach(entry => section.appendChild(buildPlanCard(entry, lane.id, Number(moves[entry.id]) || 0)));
    if (lane.items.length > shown.length) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'plan-more';
      more.textContent = tr('plan.more', { count: lane.items.length - shown.length });
      more.onclick = () => { planSomedayExpanded = true; renderBoard(); };
      section.appendChild(more);
    }
    grid.appendChild(section);
  });
  return grid;
}

function buildPlanCard(entry, laneId, moveCount) {
  const card = document.createElement('div');
  card.className = 'plan-card' + (entry.overdue ? ' is-overdue' : '');
  card.dataset.planId = entry.id;
  const chip = planChipLabel(entry, laneId);
  const rolled = moveCount >= 2;
  card.innerHTML = `
    <button type="button" class="plan-card-main">
      <span class="plan-card-title">${esc(entry.title || tr('plan.untitled'))}</span>
      <span class="plan-card-meta">
        <span class="plan-dot" style="--dot:${esc(reminderDotColor(entry.color))}" aria-hidden="true"></span>
        ${chip ? `<span class="plan-chip">${esc(chip)}</span>` : ''}
        ${rolled ? `<span class="plan-rolled" title="${esc(tr('plan.movedTimes', { count: moveCount }))}"><span class="sr-only">${esc(tr('plan.movedTimes', { count: moveCount }))}</span><span aria-hidden="true">${planSvg(PLAN_ICONS.rolled, 11, 2)}${moveCount}×</span></span>` : ''}
      </span>
    </button>
    <button type="button" class="plan-mv" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(tr('plan.moveNamed', { name: entry.title || tr('plan.untitled') }))}">${planSvg(PLAN_ICONS.clock)}</button>`;
  card.querySelector('.plan-card-main').onclick = () => {
    if (typeof openReminderTarget === 'function') openReminderTarget({ source: 'item', refId: entry.id, wsId: entry.wsId, groupId: entry.groupId, catId: entry.spaceId });
  };
  const mv = card.querySelector('.plan-mv');
  mv.onclick = event => {
    event.stopPropagation();
    planOpenMoveMenu(entry, mv);
  };
  return card;
}

function planOpenMoveMenu(entry, opener) {
  const items = planMoveOptions().map(option => ({
    text: tr(`plan.move.${option.key}`),
    sub: planOptionHint(option),
    action: () => planMoveEntry(entry, option),
  }));
  items.push({ sep: true });
  items.push({ text: tr('plan.move.pick'), action: () => openReminderPicker(entry.id, undefined, { opener }) });
  showAnchoredContextMenu(opener, items, { ariaLabel: tr('plan.moveTo'), expandedOwner: opener });
}

async function planMoveEntry(entry, option) {
  let ok;
  if (option.at == null) {
    // Someday: an undated item only needs the per-device mark; a dated one
    // loses its reminder first, through the normal transaction.
    ok = entry.at == null ? true : await clearReminder(entry.id);
    if (ok) planSetSomeday(entry.id, true);
  } else {
    ok = await setReminder(entry.id, option.at, { recur: entry.recur?.every ? entry.recur : undefined });
    if (ok) planSetSomeday(entry.id, false);
  }
  if (ok) {
    // A dated move went through the reminder transaction, whose Undo is now the
    // latest action; an undated Someday mark has no Undo.
    planBumpMoves(entry.id, entry.at == null && option.at == null ? null : planLatestActionId());
    planJustLanded = entry.id;
    renderBoard();
    planFocusAfterMove(entry.id);
  }
  return ok;
}

// ── Sort inbox ─────────────────────────────────────────────────
// One Sort session lasts while Sort is on screen (renderBoard drops it when
// another view shows). `decided` maps each answered id to its choice.
function planSortState() {
  if (!planSortSession) {
    planSortSession = { decided: new Map(), skipped: new Set(), busy: false, entering: false, shown: false, holdRender: false };
  }
  return planSortSession;
}
// The tally counts only answers still in effect: an item whose Undo put it back
// in the queue is no longer sorted.
function planSortTally(session, queue) {
  const waiting = new Set(queue.map(item => String(item.id)));
  const tally = { today: 0, week: 0, someday: 0, archive: 0 };
  session.decided.forEach((choice, id) => {
    if (!waiting.has(id) && tally[choice] != null) tally[choice] += 1;
  });
  return tally;
}
function buildPlanSort(ws) {
  const session = planSortState();
  const inbox = planInboxGroup(ws);
  const queue = planSortQueue(inbox, planSomedayIds());
  const open = queue.filter(item => !session.skipped.has(String(item.id)));
  const tally = planSortTally(session, queue);
  const done = tally.today + tally.week + tally.someday + tally.archive;
  const total = done + queue.length;
  const wrap = document.createElement('div');
  // The rise plays when Sort opens, not on every card.
  wrap.className = `plan-sort${session.shown ? '' : ' is-first'}`;
  session.shown = true;
  wrap.tabIndex = -1;
  wrap.id = 'plan-sort';
  wrap.setAttribute('aria-label', tr('plan.sortKeys'));
  const current = open[0] || null;
  if (!current) {
    wrap.appendChild(buildPlanSortDone(session, queue.length, done, tally));
    return wrap;
  }
  const position = Math.min(done + 1, total);
  const meta = planSortMeta(current);
  wrap.innerHTML = `
    <div class="plan-sort-progress">
      <span class="plan-sort-pos">${position} / ${total}</span>
      <span class="plan-sort-track"><span class="plan-sort-fill" style="--pct:${total ? Math.round((done / total) * 100) : 0}%"></span></span>
    </div>
    <div class="plan-sort-stack">
      <span class="plan-sort-ghost g2" aria-hidden="true"></span>
      <span class="plan-sort-ghost g1" aria-hidden="true"></span>
      <article class="plan-sort-card${session.entering ? ' is-entering' : ''}" aria-live="polite" data-plan-id="${esc(String(current.id))}">
        <div class="plan-sort-src">
          <span class="plan-sort-icon" aria-hidden="true" style="--icon:${esc(reminderDotColor(current.color || inbox?.color))}">${esc(meta.initial)}</span>
          <span class="plan-sort-src-text">${meta.domain ? `<span class="plan-sort-domain">${esc(meta.domain)}</span>` : ''}<span class="plan-sort-age">${esc(meta.age)}</span></span>
        </div>
        <h2 class="plan-sort-title">${esc(planItemTitle(current) || tr('plan.untitled'))}</h2>
      </article>
    </div>
    <div class="plan-sort-choices">
      <button type="button" class="plan-big is-today" data-sort="today">${esc(tr('plan.lane.today'))} <span class="plan-kbd">1</span></button>
      <button type="button" class="plan-big" data-sort="week">${esc(tr('plan.lane.week'))} <span class="plan-kbd">2</span></button>
      <button type="button" class="plan-big" data-sort="someday">${esc(tr('plan.lane.someday'))} <span class="plan-kbd">3</span></button>
      <button type="button" class="plan-big is-quiet" data-sort="archive">${esc(tr('itemAction.archive'))} <span class="plan-kbd">A</span></button>
    </div>
    <div class="plan-sort-foot">
      <button type="button" class="plan-btn" data-sort="skip">${esc(tr('plan.skip'))} <span class="plan-kbd">→</span></button>
    </div>`;
  wrap.querySelectorAll('[data-sort]').forEach(button => {
    button.onclick = () => planSortChoose(current, button.dataset.sort, button);
  });
  wrap.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const key = { '1': 'today', '2': 'week', '3': 'someday', a: 'archive', A: 'archive', ArrowRight: 'skip' }[event.key];
    if (!key) return;
    event.preventDefault();
    planSortChoose(current, key, wrap.querySelector(`[data-sort="${key}"]`));
  });
  return wrap;
}

function planSortMeta(item) {
  let domain = '';
  if (item.type === 'tab' && item.url) {
    try { domain = new URL(item.url).hostname.replace(/^www\./, ''); } catch {}
  }
  const title = planItemTitle(item);
  const initial = (domain || title || '•').trim().charAt(0).toUpperCase() || '•';
  const createdAt = Number(item.createdAt);
  const age = Number.isFinite(createdAt) && createdAt > 0 && typeof fmtTimeRelative === 'function'
    ? tr('plan.savedAge', { age: fmtTimeRelative(createdAt) })
    : '';
  return { domain, initial, age };
}

function buildPlanSortDone(session, remaining, done, tally) {
  const box = document.createElement('div');
  box.className = 'plan-sort-done';
  const title = done === 0
    ? tr(remaining ? 'plan.sortNone' : 'plan.inboxClear')
    : tr('plan.sorted', { count: done });
  box.innerHTML = `
    <span class="plan-sort-done-mark" aria-hidden="true">${planSvg(PLAN_ICONS.check, 32, 2.2)}</span>
    <h2 class="plan-sort-done-title">${esc(title)}</h2>
    ${done ? `<div class="plan-tally">
      <div class="is-today"><span>${tally.today}</span>${esc(tr('plan.tally.today'))}</div>
      <div><span>${tally.week}</span>${esc(tr('plan.tally.week'))}</div>
      <div class="is-someday"><span>${tally.someday}</span>${esc(tr('plan.tally.someday'))}</div>
      <div class="is-archive"><span>${tally.archive}</span>${esc(tr('plan.tally.archive'))}</div>
    </div>` : ''}
    <div class="plan-sort-done-actions"></div>`;
  const actions = box.querySelector('.plan-sort-done-actions');
  if (remaining) {
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'plan-btn';
    again.textContent = tr('plan.sortSkipped', { count: remaining });
    again.onclick = () => { session.skipped.clear(); renderBoard(); planFocusSort(); };
    actions.appendChild(again);
  }
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'plan-btn plan-btn-ink';
  back.textContent = tr('plan.backToToday');
  back.onclick = () => { planSortSession = null; goHome(); };
  actions.appendChild(back);
  return box;
}

function planFocusSort() {
  requestAnimationFrame(() => document.getElementById('plan-sort')?.focus({ preventScroll: true }));
}
function planReducedMotion() {
  return document.body?.dataset?.anim === 'off'
    || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

async function planSortChoose(item, choice, opener = null) {
  const session = planSortState();
  if (session.busy) return;
  const id = String(item.id);
  session.busy = true;
  // The card that was decided on leaves first; the next card enters after it.
  const reduce = planReducedMotion();
  const leavingCard = reduce ? null : document.querySelector(`.plan-sort-card[data-plan-id="${CSS.escape(id)}"]`);
  if (leavingCard) leavingCard.classList.add(`is-leaving-${choice}`);
  const leaveDone = new Promise(resolve => setTimeout(resolve, leavingCard ? 260 : 0));
  // The reminder and archive writes repaint the board as soon as they land.
  // Hold Sort's own repaint until the leaving card is gone, so the next card
  // enters once.
  session.holdRender = true;
  let ok = false;
  try {
    if (choice === 'skip') {
      session.skipped.add(id);
      ok = true;
    } else if (choice === 'someday') {
      planSetSomeday(id, true);
      ok = true;
    } else if (choice === 'archive') {
      const archived = item.type === 'tab' ? await archiveSavedPage(item, opener) : await archiveBoardLocalItem(item, opener);
      ok = archived === true;
    } else {
      const ws = activeWs();
      const at = choice === 'today' ? planSortTodayAt() : planSortWeekAt(planCollect(ws));
      ok = await setReminder(id, at);
    }
  } catch (error) {
    console.error('Sort inbox choice failed', error);
    ok = false;
  }
  if (!ok) {
    session.busy = false;
    session.holdRender = false;
    if (leavingCard) leavingCard.classList.remove(`is-leaving-${choice}`);
    renderBoard();
    planFocusSort();
    return;
  }
  if (choice !== 'skip') session.decided.set(id, choice);
  await leaveDone;
  // Keys stay locked until the next card is on screen, so one press decides
  // one card.
  session.busy = false;
  session.holdRender = false;
  session.entering = !reduce;
  renderBoard();
  session.entering = false;
  planFocusSort();
}

// Rail count: open things planned for today.
function planTodayCount(ws) {
  if (!ws) return 0;
  const lanes = planLaneModel(planCollect(ws), Date.now(), planSomedayIds());
  return lanes.find(lane => lane.id === 'today')?.items.length || 0;
}

// ── Reminders that come due while Locus is open ────────────────
// A to-do whose reminder comes due while this page is open gets one card that
// waits for an answer: Done (the Board to-do completion transaction, with Undo)
// or Snooze (10 min, 1 hour, tomorrow 09:00, through setReminder). The system
// notification from the background still fires; this is the in-Locus answer.
const PLAN_DUE_POLL_MS = 20000;
const planDueOpenedAt = Date.now();
const planDueAnswered = new Set();
let planDueShown = null;
let planDueTimer = null;
let planDueBusy = false;

function planDueKey(id, at) {
  return `${id}@${at}`;
}
// Pure: the latest open to-do in the workspace whose reminder came due after
// `since` and not later than `now`, and was not answered here yet.
function planDueCandidate(workspace, now, since, answered = new Set()) {
  let best = null;
  planCollect(workspace).dated.forEach(entry => {
    if (entry.type !== 'todo' || entry.at > now || entry.at <= since) return;
    if (answered.has(planDueKey(entry.id, entry.at))) return;
    if (!best || entry.at > best.at) best = entry;
  });
  return best;
}
function planDueSnoozeAt(choice, now = Date.now()) {
  if (choice === '10m') return now + 10 * 60000;
  if (choice === '1h') return now + 60 * 60000;
  return planAtTime(planAddDays(planDayStart(now), 1), 9);
}

function startPlanDueWatch() {
  if (planDueTimer) return;
  planDueTimer = setInterval(checkPlanDue, PLAN_DUE_POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkPlanDue(); });
  checkPlanDue();
}

function checkPlanDue(now = Date.now()) {
  if (planDueBusy) return null;
  const ws = activeWs();
  if (planDueShown) {
    const still = ws && planCollect(ws).dated.find(entry => entry.id === planDueShown.id && entry.at === planDueShown.at && entry.type === 'todo');
    if (!still) hidePlanDueCard();
    return planDueShown;
  }
  if (!ws || State.isRecoveryRequired?.()) return null;
  const candidate = planDueCandidate(ws, now, planDueOpenedAt - 60000, planDueAnswered);
  if (candidate) showPlanDueCard(candidate);
  return candidate;
}

function planDueWhen(entry) {
  const space = activeWs()?.categories?.find(cat => cat.id === entry.spaceId);
  const time = new Date(entry.at).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' });
  const place = String(space?.name || '').trim();
  return place ? tr('dueCard.dueIn', { time, place }) : tr('dueCard.due', { time });
}

function showPlanDueCard(entry) {
  hidePlanDueCard({ immediate: true });
  planDueShown = { id: entry.id, at: entry.at, title: entry.title };
  const card = document.createElement('section');
  card.id = 'plan-due';
  card.className = 'plan-due';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', tr('dueCard.label'));
  card.innerHTML = `
    <div class="plan-due-hd">
      <span class="plan-due-ring" aria-hidden="true"><span></span></span>
      <span class="plan-due-when">${esc(planDueWhen(entry))}</span>
      <button type="button" class="plan-due-x" aria-label="${esc(tr('dueCard.dismiss'))}">${planSvg('M4 4l8 8M12 4l-8 8', 14, 1.8)}</button>
    </div>
    <h2 class="plan-due-title" role="alert">${esc(entry.title || tr('plan.untitled'))}</h2>
    <div class="plan-due-actions">
      <button type="button" class="plan-due-done"><span class="plan-due-burst" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join('')}</span>${planSvg(PLAN_ICONS.check, 15, 2.4)}<span>${esc(tr('dueCard.done'))}</span></button>
      <button type="button" class="plan-due-ghost plan-due-snooze" aria-expanded="false">${planSvg(PLAN_ICONS.clock, 15, 1.6)}<span>${esc(tr('dueCard.snooze'))}</span></button>
    </div>
    <div class="plan-due-chips" hidden>
      <button type="button" class="plan-due-back" aria-label="${esc(tr('dueCard.back'))}">${planSvg('M10 3.5 5.5 8 10 12.5', 15, 1.8)}</button>
      <button type="button" class="plan-due-chip" data-snooze="10m">${esc(tr('dueCard.in10'))}</button>
      <button type="button" class="plan-due-chip" data-snooze="1h">${esc(tr('dueCard.in1h'))}</button>
      <button type="button" class="plan-due-chip" data-snooze="tomorrow">${esc(tr('dueCard.tomorrow'))}</button>
    </div>`;
  const actions = card.querySelector('.plan-due-actions');
  const chips = card.querySelector('.plan-due-chips');
  const snooze = card.querySelector('.plan-due-snooze');
  // A repeating reminder already re-arms its next occurrence; snoozing it
  // would move the whole series, so the card offers Done only.
  if (entry.recur) snooze.remove();
  const setChips = open => {
    actions.hidden = open;
    chips.hidden = !open;
    snooze.setAttribute('aria-expanded', String(open));
    requestAnimationFrame(() => (open ? chips.querySelector('[data-snooze]') : snooze)?.focus());
  };
  card.querySelector('.plan-due-x').onclick = () => {
    planDueAnswered.add(planDueKey(entry.id, entry.at));
    hidePlanDueCard();
  };
  card.querySelector('.plan-due-done').onclick = event => planDueDone(entry, card, event.currentTarget);
  snooze.onclick = () => setChips(true);
  card.querySelector('.plan-due-back').onclick = () => setChips(false);
  chips.querySelectorAll('[data-snooze]').forEach(button => {
    button.onclick = () => planDueSnooze(entry, card, button.dataset.snooze);
  });
  card.addEventListener('focusin', event => {
    const from = event.relatedTarget;
    if (from && !card.contains(from)) planDueReturnFocus = from;
  });
  card.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (!chips.hidden) { setChips(false); return; }
    planDueAnswered.add(planDueKey(entry.id, entry.at));
    hidePlanDueCard();
  });
  document.body.appendChild(card);
}

let planDueReturnFocus = null;
function hidePlanDueCard({ immediate = false } = {}) {
  const card = document.getElementById('plan-due');
  planDueShown = null;
  if (!card) return;
  if (card.contains(document.activeElement)) {
    const target = planDueReturnFocus && planDueReturnFocus.isConnected ? planDueReturnFocus : document.getElementById('board');
    try { target?.focus?.({ preventScroll: true }); } catch {}
  }
  planDueReturnFocus = null;
  if (immediate || planReducedMotion()) { card.remove(); return; }
  card.classList.add('is-leaving');
  setTimeout(() => card.remove(), 360);
}

function planDueItemIsOpen(id) {
  const ws = activeWs();
  return !!ws && planCollect(ws).dated.concat(planCollect(ws).undated).some(row => row.id === id && row.type === 'todo');
}

async function planDueDone(entry, card, button) {
  if (planDueBusy) return;
  // The to-do may have been finished on Today, in another tab, or from the
  // system notification while the card waited. Done must not reopen it.
  if (!planDueItemIsOpen(entry.id)) {
    planDueAnswered.add(planDueKey(entry.id, entry.at));
    hidePlanDueCard();
    return;
  }
  planDueBusy = true;
  card.classList.add('is-done');
  button.classList.add('is-on');
  const reduce = planReducedMotion();
  const ok = await commitTodayTodoToggle(entry.id, button);
  const actionId = ok ? State.latestActionId() : null;
  planDueBusy = false;
  if (!ok) {
    card.classList.remove('is-done');
    button.classList.remove('is-on');
    toast(tr('dueCard.failed'), { tone: 'warning' });
    return;
  }
  planDueAnswered.add(planDueKey(entry.id, entry.at));
  setTimeout(() => {
    hidePlanDueCard();
    renderBoard();
    toast(tr('dueCard.doneToast'), { sub: entry.title, undo: actionId });
  }, reduce ? 0 : 520);
}

async function planDueSnooze(entry, card, choice) {
  if (planDueBusy) return;
  planDueBusy = true;
  const at = planDueSnoozeAt(choice);
  const ok = await setReminder(entry.id, at);
  const actionId = ok ? State.latestActionId() : null;
  planDueBusy = false;
  if (!ok) {
    toast(tr('dueCard.failed'), { tone: 'warning' });
    return;
  }
  planDueAnswered.add(planDueKey(entry.id, entry.at));
  hidePlanDueCard();
  // Morph the reminder receipt into the answer, with the same Undo.
  toast(tr('dueCard.snoozed', { time: new Date(at).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' }) }), {
    tone: 'warning',
    glyph: 'clock',
    sub: entry.title,
    undo: actionId,
    replaceUndo: actionId,
  });
}
