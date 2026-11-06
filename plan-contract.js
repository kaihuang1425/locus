(function exposeLocusPlan(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LocusPlan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createLocusPlan() {
  'use strict';

  // One versioned scheduling contract shared by the new-tab planner, the local
  // MCP server, and the Native Messaging companion. Everything here is pure: no
  // storage, no network, no clock unless a caller passes `now`.
  const CONTRACT = 'locus.plan/v1';
  const CONTRACT_VERSION = 1;
  const HORIZONS = Object.freeze(['day', 'week', 'month']);
  const HORIZON_MAX_DAYS = Object.freeze({ day: 1, week: 7, month: 31 });
  const BLOCK_KINDS = Object.freeze(['task', 'focus', 'meeting', 'break', 'errand', 'habit']);
  const DELIVERIES = Object.freeze(['paste', 'mcp', 'structured']);
  const LIMITS = Object.freeze({
    planTitleChars: 120,
    titleChars: 140,
    notesChars: 1000,
    summaryChars: 600,
    goalChars: 300,
    goals: 20,
    fixed: 60,
    busy: 200,
    blocks: 240,
    missing: 20,
    constraintNotesChars: 1000,
    modelChars: 80,
    idChars: 80,
    draftBytes: 256 * 1024,
    pasteChars: 600 * 1024,
  });
  const DEFAULT_CONSTRAINTS = Object.freeze({ dayStart: '09:00', dayEnd: '18:00', maxPerDay: 6 });
  const BUSY_MINUTES = 15;
  const FIXED_MINUTES = 30;
  const TOOL_SUBMIT = 'locus_submit_plan_draft';
  const TOOL_REQUEST = 'locus_get_plan_request';
  const TOOL_STATUS = 'locus_get_draft_status';

  // Provider guidance is capability-driven: a profile names what the client can
  // do (tool calls, native JSON Schema output, short context), never a model ID.
  // The optional model field is passed through untouched for local runners.
  const PROVIDERS = Object.freeze({
    claude: Object.freeze({ id: 'claude', label: 'Claude', profiles: Object.freeze(['claude-xml']) }),
    codex: Object.freeze({ id: 'codex', label: 'Codex', profiles: Object.freeze(['codex-tool', 'codex-compact']) }),
    gemini: Object.freeze({ id: 'gemini', label: 'Gemini', profiles: Object.freeze(['gemini-structured']) }),
  });
  const PROFILES = Object.freeze({
    'claude-xml': Object.freeze({
      id: 'claude-xml', provider: 'claude', compact: false,
      label: 'XML sections with a worked example',
    }),
    'codex-tool': Object.freeze({
      id: 'codex-tool', provider: 'codex', compact: false,
      label: 'Short objective, exact tool and schema',
    }),
    'codex-compact': Object.freeze({
      id: 'codex-compact', provider: 'codex', compact: true,
      label: 'Compact, for Spark or short-context models',
    }),
    'gemini-structured': Object.freeze({
      id: 'gemini-structured', provider: 'gemini', compact: false,
      label: 'Direct goal and constraints, structured output',
    }),
  });

  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const TIME_RE = /^(\d{1,2}):([0-5]\d)$/;
  const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
  const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

  const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const pad2 = n => String(n).padStart(2, '0');
  const pad4 = n => String(n).padStart(4, '0');

  function cleanText(value, max) {
    if (typeof value !== 'string') return '';
    return value.replace(CONTROL_RE, '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function cleanMultiline(value, max) {
    if (typeof value !== 'string') return '';
    return value
      .replace(/\r\n?/g, '\n')
      .replace(CONTROL_RE, '')
      .split('\n')
      .map(line => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, max);
  }

  function utf8Length(text) {
    let bytes = 0;
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff) { bytes += 4; i += 1; }
      else bytes += 3;
    }
    return bytes;
  }

  // ── Canonical form + fingerprints ─────────────────────────────────────
  // Extension storage hands objects back with sorted keys, so every comparison
  // and fingerprint goes through a key-sorted canonical serializer.
  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (isRecord(value)) {
      const out = {};
      for (const key of Object.keys(value).sort()) {
        if (value[key] !== undefined) out[key] = canonicalize(value[key]);
      }
      return out;
    }
    return value;
  }

  function canonicalJson(value) {
    return JSON.stringify(canonicalize(value));
  }

  // Two independent 32-bit FNV-1a passes give a deterministic 64-bit hex digest
  // that is identical in the browser and in Node. It is an idempotency key, not
  // a security boundary.
  function hash64(text) {
    let a = 0x811c9dc5;
    let b = 0x01000193 ^ 0x5bd1e995;
    const source = String(text);
    for (let i = 0; i < source.length; i += 1) {
      const code = source.charCodeAt(i);
      a ^= code;
      a = Math.imul(a, 0x01000193);
      b ^= code;
      b = Math.imul(b, 0x01000193) ^ (b >>> 13);
    }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }

  // ── Calendar dates (zone-free) ───────────────────────────────────────
  function parseIsoDate(value) {
    if (typeof value !== 'string') return null;
    const match = DATE_RE.exec(value.trim());
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (y < 1970 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const t = Date.UTC(y, m - 1, d);
    const check = new Date(t);
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
    return { y, m, d, iso: `${match[1]}-${match[2]}-${match[3]}`, day: t / 86400000 };
  }

  function isoFromDay(day) {
    const date = new Date(day * 86400000);
    return `${pad4(date.getUTCFullYear())}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  }

  function addDays(iso, count) {
    const parsed = parseIsoDate(iso);
    return parsed ? isoFromDay(parsed.day + count) : null;
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  function weekdayIndex(iso) {
    const parsed = parseIsoDate(iso);
    if (!parsed) return -1;
    return (new Date(parsed.day * 86400000).getUTCDay() + 6) % 7;
  }

  function rangeForHorizon(horizon, startIso) {
    const start = parseIsoDate(startIso);
    if (!start || !HORIZONS.includes(horizon)) return null;
    if (horizon === 'day') return { start: start.iso, end: start.iso };
    if (horizon === 'week') return { start: start.iso, end: isoFromDay(start.day + 6) };
    const nextMonthYear = start.m === 12 ? start.y + 1 : start.y;
    const nextMonth = start.m === 12 ? 1 : start.m + 1;
    const sameDay = Math.min(start.d, daysInMonth(nextMonthYear, nextMonth));
    const next = Date.UTC(nextMonthYear, nextMonth - 1, sameDay) / 86400000;
    const end = Math.min(next - 1, start.day + HORIZON_MAX_DAYS.month - 1);
    return { start: start.iso, end: isoFromDay(end) };
  }

  function parseHm(value) {
    if (typeof value !== 'string') return null;
    const match = TIME_RE.exec(value.trim());
    if (!match) return null;
    const h = Number(match[1]);
    if (h > 23) return null;
    return h * 60 + Number(match[2]);
  }

  function formatHm(minutes) {
    if (!Number.isInteger(minutes)) return null;
    return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
  }

  // ── Time zones + DST ─────────────────────────────────────────────────
  const formatterCache = new Map();
  function zoneFormatter(timeZone) {
    let formatter = formatterCache.get(timeZone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      formatterCache.set(timeZone, formatter);
    }
    return formatter;
  }

  function canonicalTimeZone(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 64) return null;
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).resolvedOptions().timeZone || null;
    } catch {
      return null;
    }
  }

  function zonedParts(epochMs, timeZone) {
    const parts = zoneFormatter(timeZone).formatToParts(new Date(epochMs));
    const read = type => Number(parts.find(part => part.type === type)?.value);
    let hour = read('hour');
    if (hour === 24) hour = 0;
    return { y: read('year'), m: read('month'), d: read('day'), hour, minute: read('minute'), second: read('second') };
  }

  function zoneOffsetMinutes(epochMs, timeZone) {
    const p = zonedParts(epochMs, timeZone);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hour, p.minute, p.second);
    return Math.round((asUtc - Math.floor(epochMs / 1000) * 1000) / 60000);
  }

  function epochToZoned(epochMs, timeZone) {
    const p = zonedParts(epochMs, timeZone);
    return {
      date: `${pad4(p.y)}-${pad2(p.m)}-${pad2(p.d)}`,
      minutes: p.hour * 60 + p.minute,
      time: `${pad2(p.hour)}:${pad2(p.minute)}`,
    };
  }

  // Resolve a wall-clock date and time in a zone to an instant. A wall time in a
  // spring-forward gap does not exist ("gap"); one in a fall-back overlap exists
  // twice ("ambiguous", earlier instant chosen and reported).
  function zonedWallToEpoch(iso, minutes, timeZone) {
    const date = parseIsoDate(iso);
    if (!date || !Number.isInteger(minutes) || minutes < 0 || minutes >= 1440) return { status: 'invalid' };
    const wall = Date.UTC(date.y, date.m - 1, date.d, Math.floor(minutes / 60), minutes % 60);
    const offsets = new Set([
      zoneOffsetMinutes(wall - 86400000, timeZone),
      zoneOffsetMinutes(wall, timeZone),
      zoneOffsetMinutes(wall + 86400000, timeZone),
    ]);
    const matches = [];
    for (const offset of offsets) {
      const candidate = wall - offset * 60000;
      const p = zonedParts(candidate, timeZone);
      if (Date.UTC(p.y, p.m - 1, p.d, p.hour, p.minute) === wall) matches.push(candidate);
    }
    const unique = [...new Set(matches)].sort((x, y) => x - y);
    if (!unique.length) {
      const shifted = wall - zoneOffsetMinutes(wall - 86400000, timeZone) * 60000;
      return { status: 'gap', suggestion: epochToZoned(shifted, timeZone).time };
    }
    if (unique.length > 1) return { status: 'ambiguous', at: unique[0], alternatives: unique };
    return { status: 'ok', at: unique[0] };
  }

  function todayInZone(timeZone, now = Date.now()) {
    return epochToZoned(now, timeZone).date;
  }

  // ── Issues ───────────────────────────────────────────────────────────
  // severity: error (cannot apply), conflict (applies only if chosen),
  // warning (applies, worth reading), missing (an input the plan still needs).
  const ISSUE_TEXT = Object.freeze({
    plan_id_invalid: 'The plan needs a valid id.',
    title_invalid: 'The plan title is empty.',
    horizon_invalid: 'Choose day, week, or month.',
    range_invalid: 'The date range needs a real start and end date (YYYY-MM-DD).',
    range_reversed: 'The end date is before the start date.',
    range_too_long: 'A {horizon} plan can cover at most {max} days.',
    timezone_invalid: '"{value}" is not a time zone this browser knows (use an IANA name such as Europe/London).',
    timezone_missing: 'The draft does not say which time zone its times use.',
    hours_invalid: 'Working hours need a start and end time, with the end later than the start.',
    capacity_invalid: 'Blocks per day must be a whole number from 1 to 12.',
    goals_missing: 'Add at least one goal or task for this plan.',
    goals_trimmed: 'Only the first {max} goals are shared.',
    fixed_line_invalid: 'Fixed commitment line {line} is not "YYYY-MM-DD HH:MM-HH:MM Title".',
    fixed_out_of_range: 'Fixed commitment "{title}" on {date} is outside the plan dates and was left out.',
    fixed_dst_gap: 'Fixed commitment "{title}" starts at {time} on {date}, a time that does not exist in {timezone} (clocks skip ahead).',
    fixed_dst_ambiguous: 'Fixed commitment "{title}" at {time} on {date} happens twice in {timezone}; the first occurrence is used.',
    fixed_end_invalid: 'Fixed commitment "{title}" ends before it starts.',
    draft_empty: 'Paste the assistant\'s reply first.',
    draft_not_json: 'Locus could not find a JSON draft in that text.',
    draft_not_object: 'The draft must be a JSON object.',
    draft_too_large: 'The draft is larger than Locus accepts ({max} bytes).',
    contract_missing: 'The draft does not name its contract; Locus read it as locus.plan/v1.',
    contract_unsupported: 'The draft uses contract "{value}", but this Locus reads locus.plan/v1.',
    plan_mismatch: 'This draft belongs to plan "{value}", not "{expected}".',
    plan_id_missing: 'The draft does not name its plan; Locus matched it to the open plan.',
    stale_request: 'This draft answers an older version of the plan inputs. Check it before applying.',
    timezone_differs: 'The draft uses {value}; Locus converted its times to {expected}.',
    blocks_missing: 'The draft has no "blocks" list.',
    too_many_blocks: 'The draft has {count} blocks; Locus accepts at most {max}.',
    no_blocks: 'The draft has no blocks to add.',
    block_not_object: 'Block {index} is not an object.',
    title_missing: 'Block {index} has no title.',
    invalid_date: 'Block {index}: "{value}" is not a real calendar date (use YYYY-MM-DD).',
    invalid_time: 'Block {index}: {field} "{value}" is not a 24-hour HH:MM time.',
    end_before_start: 'Block {index} ends at {end}, which is not after its start {start}.',
    end_without_start: 'Block {index} has an end time but no start time; the end was ignored.',
    time_missing: 'Block {index} has no time; Locus will remind you at {time}.',
    out_of_range: 'Block {index} is on {date}, outside the plan dates {start} to {end}.',
    dst_gap: 'Block {index}: {time} on {date} does not exist in {timezone} because clocks skip ahead. Try {suggestion}.',
    dst_ambiguous: 'Block {index}: {time} on {date} happens twice in {timezone}; Locus uses the first occurrence.',
    fixed_moved: 'Block {index} changes the fixed commitment "{title}". Fixed commitments must stay as given.',
    fixed_unknown: 'Block {index} is marked fixed but matches no fixed commitment in the plan.',
    duplicate_in_draft: 'Block {index} repeats block {other}.',
    overlap: 'Block {index} overlaps block {other}.',
    conflict_fixed: 'Block {index} overlaps the fixed commitment "{title}".',
    conflict_calendar: 'Block {index} overlaps an existing Calendar reminder at {time}.',
    outside_hours: 'Block {index} is outside working hours {dayStart}-{dayEnd}.',
    day_over_capacity: '{date} has more than {max} blocks.',
    in_past: 'Block {index} starts in the past.',
    missing_from_draft: 'The assistant asked: {question}',
  });

  function issue(code, severity, params = {}) {
    return { code, severity, params };
  }

  function describeIssue(entry) {
    const template = ISSUE_TEXT[entry?.code] || entry?.code || 'Unknown issue';
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const value = entry?.params?.[key];
      return value == null ? '' : String(value);
    });
  }

  // ── Plan request (inputs shared with an assistant) ───────────────────
  function normalizeGoals(value) {
    const list = Array.isArray(value)
      ? value
      : typeof value === 'string' ? value.split(/\r?\n/) : [];
    return list
      .map(goal => cleanText(typeof goal === 'string' ? goal.replace(/^\s*[-*•]\s*/, '') : '', LIMITS.goalChars))
      .filter(Boolean);
  }

  const FIXED_LINE_RE = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})(?:\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2}))?\s+(.+)$/i;

  function parseFixedText(text) {
    const items = [];
    const errors = [];
    String(text || '').split(/\r?\n/).forEach((raw, index) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      const match = FIXED_LINE_RE.exec(line);
      if (!match) {
        errors.push(issue('fixed_line_invalid', 'missing', { line: index + 1, value: line.slice(0, 80) }));
        return;
      }
      items.push({ date: match[1], start: match[2], end: match[3] || null, title: match[4] });
    });
    return { items, errors };
  }

  function formatFixedText(items) {
    return (Array.isArray(items) ? items : [])
      .map(item => `${item.date} ${item.start}${item.end ? `-${item.end}` : ''} ${item.title}`)
      .join('\n');
  }

  function normalizeClient(value) {
    const provider = PROVIDERS[value?.provider] ? value.provider : 'claude';
    const profiles = PROVIDERS[provider].profiles;
    const profile = profiles.includes(value?.profile) ? value.profile : profiles[0];
    const model = cleanText(value?.model, LIMITS.modelChars);
    return { provider, profile, model };
  }

  function buildPlanRequest(input = {}, options = {}) {
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const issues = [];
    const missing = [];

    const planId = typeof input.planId === 'string' && ID_RE.test(input.planId) ? input.planId : null;
    if (!planId) issues.push(issue('plan_id_invalid', 'error'));

    const timezone = canonicalTimeZone(input.timezone);
    if (!timezone) issues.push(issue('timezone_invalid', 'error', { value: String(input.timezone ?? '').slice(0, 64) }));

    const horizon = HORIZONS.includes(input.horizon) ? input.horizon : null;
    if (!horizon) issues.push(issue('horizon_invalid', 'error'));

    const start = parseIsoDate(input.start);
    const end = parseIsoDate(input.end);
    if (!start || !end) issues.push(issue('range_invalid', 'error'));
    else if (end.day < start.day) issues.push(issue('range_reversed', 'error'));
    else if (horizon && end.day - start.day + 1 > HORIZON_MAX_DAYS[horizon]) {
      issues.push(issue('range_too_long', 'error', { horizon, max: HORIZON_MAX_DAYS[horizon] }));
    }

    const title = cleanText(input.title, LIMITS.planTitleChars);
    if (!title) issues.push(issue('title_invalid', 'error'));

    const allGoals = normalizeGoals(input.goals);
    const goals = allGoals.slice(0, LIMITS.goals);
    if (allGoals.length > goals.length) issues.push(issue('goals_trimmed', 'warning', { max: LIMITS.goals }));
    if (!goals.length) missing.push(issue('goals_missing', 'missing'));

    const constraintsInput = isRecord(input.constraints) ? input.constraints : {};
    const dayStartText = typeof constraintsInput.dayStart === 'string' && constraintsInput.dayStart.trim()
      ? constraintsInput.dayStart : DEFAULT_CONSTRAINTS.dayStart;
    const dayEndText = typeof constraintsInput.dayEnd === 'string' && constraintsInput.dayEnd.trim()
      ? constraintsInput.dayEnd : DEFAULT_CONSTRAINTS.dayEnd;
    const dayStart = parseHm(dayStartText);
    const dayEnd = parseHm(dayEndText);
    if (dayStart == null || dayEnd == null || dayEnd <= dayStart) issues.push(issue('hours_invalid', 'error'));
    const capacityRaw = constraintsInput.maxPerDay == null || constraintsInput.maxPerDay === ''
      ? DEFAULT_CONSTRAINTS.maxPerDay : Number(constraintsInput.maxPerDay);
    const maxPerDay = Number.isInteger(capacityRaw) && capacityRaw >= 1 && capacityRaw <= 12 ? capacityRaw : null;
    if (maxPerDay == null) issues.push(issue('capacity_invalid', 'error'));
    const notes = cleanMultiline(constraintsInput.notes, LIMITS.constraintNotesChars);

    const fixedSource = [];
    if (Array.isArray(input.fixed)) fixedSource.push(...input.fixed);
    if (typeof input.fixedText === 'string') {
      const parsed = parseFixedText(input.fixedText);
      fixedSource.push(...parsed.items);
      missing.push(...parsed.errors);
    }
    const fixed = [];
    const rangeReady = start && end && end.day >= start.day;
    for (const raw of fixedSource.slice(0, LIMITS.fixed)) {
      const fixedTitle = cleanText(raw?.title, LIMITS.titleChars);
      const fixedDate = parseIsoDate(raw?.date);
      const fixedStart = parseHm(raw?.start);
      const fixedEnd = raw?.end == null || raw?.end === '' ? null : parseHm(raw.end);
      if (!fixedTitle || !fixedDate || fixedStart == null || (raw?.end != null && raw?.end !== '' && fixedEnd == null)) {
        missing.push(issue('fixed_line_invalid', 'missing', { line: fixed.length + 1, value: fixedTitle || String(raw?.date || '') }));
        continue;
      }
      if (fixedEnd != null && fixedEnd <= fixedStart) {
        issues.push(issue('fixed_end_invalid', 'error', { title: fixedTitle }));
        continue;
      }
      if (rangeReady && (fixedDate.day < start.day || fixedDate.day > end.day)) {
        issues.push(issue('fixed_out_of_range', 'warning', { title: fixedTitle, date: fixedDate.iso }));
        continue;
      }
      if (timezone) {
        const resolved = zonedWallToEpoch(fixedDate.iso, fixedStart, timezone);
        if (resolved.status === 'gap') {
          issues.push(issue('fixed_dst_gap', 'error', { title: fixedTitle, date: fixedDate.iso, time: formatHm(fixedStart), timezone }));
          continue;
        }
        if (resolved.status === 'ambiguous') {
          issues.push(issue('fixed_dst_ambiguous', 'warning', { title: fixedTitle, date: fixedDate.iso, time: formatHm(fixedStart), timezone }));
        }
      }
      fixed.push({ date: fixedDate.iso, start: formatHm(fixedStart), end: formatHm(fixedEnd), title: fixedTitle });
    }
    fixed.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

    // Existing Calendar reminders are shared as times only, never titles.
    const busy = [];
    if (timezone && rangeReady && Array.isArray(input.busy)) {
      for (const raw of input.busy) {
        if (busy.length >= LIMITS.busy) break;
        let date = null;
        let minutes = null;
        if (Number.isFinite(raw?.at)) {
          const zoned = epochToZoned(raw.at, timezone);
          date = zoned.date;
          minutes = zoned.minutes;
        } else {
          date = parseIsoDate(raw?.date)?.iso || null;
          minutes = parseHm(raw?.start);
        }
        const parsedDate = parseIsoDate(date);
        if (!parsedDate || minutes == null || parsedDate.day < start.day || parsedDate.day > end.day) continue;
        busy.push({ date: parsedDate.iso, start: formatHm(minutes) });
      }
      busy.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    }

    const client = normalizeClient(input.client);
    const ok = !issues.some(entry => entry.severity === 'error');
    let request = null;
    if (ok) {
      request = {
        contract: CONTRACT,
        plan_id: planId,
        revision: '',
        title,
        horizon,
        range: { start: start.iso, end: end.iso },
        timezone,
        today: todayInZone(timezone, now),
        goals,
        fixed,
        busy,
        constraints: {
          day_start: formatHm(dayStart),
          day_end: formatHm(dayEnd),
          max_blocks_per_day: maxPerDay,
          notes,
        },
        client,
      };
      const { revision: _ignored, today: _today, client: _client, ...core } = request;
      request.revision = `r${hash64(canonicalJson(core)).slice(0, 12)}`;
    }
    return { ok, request, issues, missing };
  }

  // Structural check for a request that arrives from outside (for example the
  // companion's stored brief). It rebuilds through buildPlanRequest so the
  // revision always matches the inputs.
  function requestFromWire(wire, options = {}) {
    if (!isRecord(wire) || wire.contract !== CONTRACT) return { ok: false, request: null, issues: [issue('contract_unsupported', 'error', { value: String(wire?.contract || '') })], missing: [] };
    return buildPlanRequest({
      planId: wire.plan_id,
      title: wire.title,
      horizon: wire.horizon,
      start: wire.range?.start,
      end: wire.range?.end,
      timezone: wire.timezone,
      goals: wire.goals,
      fixed: wire.fixed,
      busy: Array.isArray(wire.busy) ? wire.busy : [],
      constraints: {
        dayStart: wire.constraints?.day_start,
        dayEnd: wire.constraints?.day_end,
        maxPerDay: wire.constraints?.max_blocks_per_day,
        notes: wire.constraints?.notes,
      },
      client: wire.client,
    }, options);
  }

  // ── Draft import + validation ────────────────────────────────────────
  function scanJsonObject(text, from) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = from; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(from, i + 1);
      }
    }
    return null;
  }

  function unwrapDraft(value, depth = 0) {
    if (depth > 3 || !isRecord(value)) return value;
    if (Array.isArray(value.blocks)) return value;
    if (isRecord(value.draft)) return unwrapDraft(value.draft, depth + 1);
    if (isRecord(value.structured_output)) return unwrapDraft(value.structured_output, depth + 1);
    if (isRecord(value.arguments)) return unwrapDraft(value.arguments, depth + 1);
    if (typeof value.result === 'string') {
      const inner = extractDraftJson(value.result, depth + 1);
      if (inner.ok) return inner.value;
    }
    return value;
  }

  function extractDraftJson(text, depth = 0) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, code: 'draft_empty' };
    if (text.length > LIMITS.pasteChars) return { ok: false, code: 'draft_too_large' };
    const candidates = [];
    const trimmed = text.trim();
    candidates.push(trimmed);
    const tagged = /<locus_draft>([\s\S]*?)<\/locus_draft>/i.exec(text);
    if (tagged) candidates.push(tagged[1].trim());
    for (const fence of text.matchAll(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/g)) candidates.push(fence[1].trim());
    for (let start = text.indexOf('{'); start >= 0 && candidates.length < 40; start = text.indexOf('{', start + 1)) {
      const chunk = scanJsonObject(text, start);
      if (chunk) candidates.push(chunk);
    }
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (isRecord(parsed)) {
          const unwrapped = depth < 3 ? unwrapDraft(parsed, depth) : parsed;
          if (isRecord(unwrapped) && Array.isArray(unwrapped.blocks)) return { ok: true, value: unwrapped };
        }
      } catch {}
    }
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (isRecord(parsed)) return { ok: true, value: parsed };
      } catch {}
    }
    return { ok: false, code: 'draft_not_json' };
  }

  function sanitizeDraftId(value) {
    return typeof value === 'string' && ID_RE.test(value) ? value : null;
  }

  function overlaps(a, b) {
    return a.at < b.endAt && b.at < a.endAt;
  }

  function blockKey(planId, date, start, title) {
    return `k${hash64(canonicalJson([planId || '', date || '', start || '', String(title || '').toLowerCase()]))}`;
  }

  function failure(code, params = {}) {
    return { ok: false, issues: [issue(code, 'error', params)], blocks: [], missing: [], counts: emptyCounts() };
  }

  function emptyCounts() {
    return { total: 0, ready: 0, conflict: 0, invalid: 0, fixed: 0, duplicate: 0, selectable: 0 };
  }

  function validatePlanDraft(raw, request, options = {}) {
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    let draft = raw;
    if (typeof raw === 'string') {
      const extracted = extractDraftJson(raw);
      if (!extracted.ok) return failure(extracted.code, { max: LIMITS.draftBytes });
      draft = extracted.value;
    } else {
      draft = unwrapDraft(raw);
    }
    if (!isRecord(draft)) return failure('draft_not_object');
    let serialized;
    try { serialized = JSON.stringify(draft); } catch { return failure('draft_not_object'); }
    if (utf8Length(serialized) > LIMITS.draftBytes) return failure('draft_too_large', { max: LIMITS.draftBytes });

    const issues = [];
    const contract = draft.contract;
    if (contract == null || contract === '') issues.push(issue('contract_missing', 'warning'));
    else if (contract !== CONTRACT) return failure('contract_unsupported', { value: String(contract).slice(0, 40) });

    const declaredPlan = typeof (draft.plan_id ?? draft.planId) === 'string' ? String(draft.plan_id ?? draft.planId).trim() : '';
    if (request && declaredPlan && declaredPlan !== request.plan_id) {
      return failure('plan_mismatch', { value: declaredPlan.slice(0, 80), expected: request.plan_id });
    }
    if (request && !declaredPlan) issues.push(issue('plan_id_missing', 'warning'));
    const planId = request?.plan_id || (ID_RE.test(declaredPlan) ? declaredPlan : null);

    const revision = typeof (draft.request_revision ?? draft.requestRevision) === 'string'
      ? String(draft.request_revision ?? draft.requestRevision).trim().slice(0, 40) : '';
    if (request && revision && revision !== request.revision) {
      issues.push(issue('stale_request', 'warning', { value: revision, expected: request.revision }));
    }

    const planTz = request?.timezone || canonicalTimeZone(draft.timezone);
    if (!planTz) {
      return draft.timezone == null || draft.timezone === ''
        ? failure('timezone_missing')
        : failure('timezone_invalid', { value: String(draft.timezone).slice(0, 64) });
    }
    let sourceTz = planTz;
    if (draft.timezone != null && draft.timezone !== '') {
      const declaredTz = canonicalTimeZone(draft.timezone);
      if (!declaredTz) return failure('timezone_invalid', { value: String(draft.timezone).slice(0, 64) });
      sourceTz = declaredTz;
      if (declaredTz !== planTz) issues.push(issue('timezone_differs', 'warning', { value: declaredTz, expected: planTz }));
    }

    if (!Array.isArray(draft.blocks)) return failure('blocks_missing');
    if (draft.blocks.length > LIMITS.blocks) return failure('too_many_blocks', { count: draft.blocks.length, max: LIMITS.blocks });

    const rc = request?.constraints || {};
    const dayStart = parseHm(rc.day_start) ?? parseHm(DEFAULT_CONSTRAINTS.dayStart);
    const dayEnd = parseHm(rc.day_end) ?? parseHm(DEFAULT_CONSTRAINTS.dayEnd);
    const maxPerDay = Number.isInteger(rc.max_blocks_per_day) ? rc.max_blocks_per_day : DEFAULT_CONSTRAINTS.maxPerDay;
    const range = request?.range || null;
    const rangeStart = range ? parseIsoDate(range.start) : null;
    const rangeEnd = range ? parseIsoDate(range.end) : null;

    const fixedList = (request?.fixed || []).map(entry => {
      const startMinutes = parseHm(entry.start);
      const endMinutes = entry.end ? parseHm(entry.end) : null;
      const resolved = zonedWallToEpoch(entry.date, startMinutes, planTz);
      const at = resolved.status === 'gap' ? null : resolved.at;
      const endAt = at == null ? null : at + ((endMinutes != null ? endMinutes - startMinutes : FIXED_MINUTES) * 60000);
      return { ...entry, at, endAt, normalizedTitle: entry.title.toLowerCase() };
    }).filter(entry => entry.at != null);
    const busyList = (request?.busy || []).map(entry => {
      const resolved = zonedWallToEpoch(entry.date, parseHm(entry.start), planTz);
      if (resolved.status === 'gap') return null;
      return { ...entry, at: resolved.at, endAt: resolved.at + BUSY_MINUTES * 60000 };
    }).filter(Boolean);

    const seenKeys = new Map();
    const blocks = draft.blocks.map((rawBlock, position) => {
      const index = position + 1;
      const block = {
        index,
        key: `invalid-${index}`,
        title: '',
        kind: 'task',
        notes: '',
        fixed: false,
        date: null,
        start: null,
        end: null,
        sourceDate: null,
        sourceStart: null,
        sourceEnd: null,
        timed: false,
        timeAssumed: false,
        at: null,
        endAt: null,
        issues: [],
        status: 'ready',
        selectable: false,
        selected: false,
      };
      if (!isRecord(rawBlock)) {
        block.issues.push(issue('block_not_object', 'error', { index }));
        return block;
      }
      block.title = cleanText(rawBlock.title, LIMITS.titleChars);
      if (!block.title) block.issues.push(issue('title_missing', 'error', { index }));
      block.kind = BLOCK_KINDS.includes(rawBlock.kind) ? rawBlock.kind : 'task';
      block.notes = cleanMultiline(rawBlock.notes, LIMITS.notesChars);
      block.fixed = rawBlock.fixed === true;

      const dateText = typeof rawBlock.date === 'string' ? rawBlock.date.trim() : String(rawBlock.date ?? '');
      const date = parseIsoDate(dateText);
      if (!date) block.issues.push(issue('invalid_date', 'error', { index, value: dateText.slice(0, 40) }));
      block.sourceDate = date ? date.iso : dateText.slice(0, 40);

      const readTime = field => {
        const value = rawBlock[field];
        if (value == null || value === '') return { present: false, minutes: null };
        const minutes = parseHm(String(value));
        if (minutes == null) {
          block.issues.push(issue('invalid_time', 'error', { index, field, value: String(value).slice(0, 20) }));
        }
        return { present: true, minutes };
      };
      const startRead = readTime('start');
      const endRead = readTime('end');
      let startMinutes = startRead.minutes;
      let endMinutes = endRead.minutes;
      if (endRead.present && !startRead.present) {
        block.issues.push(issue('end_without_start', 'warning', { index }));
        endMinutes = null;
      }
      if (startMinutes != null && endMinutes == null && Number.isInteger(rawBlock.duration_minutes)
          && rawBlock.duration_minutes >= 5 && rawBlock.duration_minutes <= 720
          && startMinutes + rawBlock.duration_minutes < 1440) {
        endMinutes = startMinutes + rawBlock.duration_minutes;
      }
      if (startMinutes != null && endMinutes != null && endMinutes <= startMinutes) {
        block.issues.push(issue('end_before_start', 'error', { index, start: formatHm(startMinutes), end: formatHm(endMinutes) }));
      }
      block.sourceStart = formatHm(startMinutes);
      block.sourceEnd = formatHm(endMinutes);
      block.timed = startMinutes != null;
      if (!startRead.present) {
        block.timeAssumed = true;
        block.issues.push(issue('time_missing', 'warning', { index, time: formatHm(dayStart) }));
      }

      if (block.issues.some(entry => entry.severity === 'error')) return block;

      const effectiveStart = startMinutes != null ? startMinutes : dayStart;
      const resolved = zonedWallToEpoch(date.iso, effectiveStart, sourceTz);
      if (resolved.status === 'gap') {
        block.issues.push(issue('dst_gap', 'error', {
          index, date: date.iso, time: formatHm(effectiveStart), timezone: sourceTz, suggestion: resolved.suggestion,
        }));
        return block;
      }
      if (resolved.status === 'ambiguous') {
        block.issues.push(issue('dst_ambiguous', 'warning', {
          index, date: date.iso, time: formatHm(effectiveStart), timezone: sourceTz,
        }));
      }
      block.at = resolved.at;
      if (endMinutes != null) {
        const endResolved = zonedWallToEpoch(date.iso, endMinutes, sourceTz);
        block.endAt = endResolved.status === 'gap'
          ? block.at + (endMinutes - effectiveStart) * 60000
          : endResolved.at;
        if (block.endAt <= block.at) block.endAt = block.at + (endMinutes - effectiveStart) * 60000;
      } else {
        block.endAt = block.at + 60000;
      }

      const planStart = epochToZoned(block.at, planTz);
      block.date = planStart.date;
      block.start = block.timed ? planStart.time : null;
      block.end = endMinutes != null ? epochToZoned(block.endAt, planTz).time : null;

      const planDate = parseIsoDate(block.date);
      if (rangeStart && rangeEnd && (planDate.day < rangeStart.day || planDate.day > rangeEnd.day)) {
        block.issues.push(issue('out_of_range', 'error', { index, date: block.date, start: rangeStart.iso, end: rangeEnd.iso }));
        return block;
      }

      block.key = blockKey(planId, block.date, block.start, block.title);
      if (seenKeys.has(block.key)) {
        block.issues.push(issue('duplicate_in_draft', 'error', { index, other: seenKeys.get(block.key) }));
        block.status = 'duplicate';
        return block;
      }
      seenKeys.set(block.key, index);

      const sameTitleFixed = fixedList.filter(entry => entry.normalizedTitle === block.title.toLowerCase() && entry.date === block.date);
      if (block.fixed) {
        const exact = sameTitleFixed.find(entry => entry.start === block.start && (entry.end || null) === (block.end || null));
        if (!exact) {
          block.issues.push(issue(sameTitleFixed.length ? 'fixed_moved' : 'fixed_unknown', sameTitleFixed.length ? 'error' : 'conflict', { index, title: block.title }));
        }
      } else if (sameTitleFixed.length) {
        const exact = sameTitleFixed.find(entry => entry.start === block.start);
        if (!exact) block.issues.push(issue('fixed_moved', 'error', { index, title: block.title }));
        else block.fixed = true;
      }

      if (block.timed && (effectiveStart < dayStart || (endMinutes != null ? endMinutes : effectiveStart) > dayEnd)) {
        if (!block.fixed) block.issues.push(issue('outside_hours', 'warning', { index, dayStart: formatHm(dayStart), dayEnd: formatHm(dayEnd) }));
      }
      if (!block.fixed && block.at < now) block.issues.push(issue('in_past', 'conflict', { index }));
      return block;
    });

    // Pairwise conflicts on blocks that resolved to real instants.
    const live = blocks.filter(block => block.at != null && block.status !== 'duplicate'
      && !block.issues.some(entry => entry.severity === 'error'));
    for (const block of live) {
      if (block.fixed) continue;
      for (const fixedEntry of fixedList) {
        if (overlaps(block, fixedEntry)) block.issues.push(issue('conflict_fixed', 'conflict', { index: block.index, title: fixedEntry.title }));
      }
      for (const busyEntry of busyList) {
        if (overlaps(block, busyEntry)) block.issues.push(issue('conflict_calendar', 'conflict', { index: block.index, time: busyEntry.start }));
      }
    }
    const timedLive = live.filter(block => block.end != null).sort((a, b) => a.at - b.at);
    for (let i = 0; i < timedLive.length; i += 1) {
      for (let j = i + 1; j < timedLive.length && timedLive[j].at < timedLive[i].endAt; j += 1) {
        const a = timedLive[i];
        const b = timedLive[j];
        if (a.fixed && b.fixed) continue;
        if (!overlaps(a, b)) continue;
        if (!a.fixed) a.issues.push(issue('overlap', 'conflict', { index: a.index, other: b.index }));
        if (!b.fixed) b.issues.push(issue('overlap', 'conflict', { index: b.index, other: a.index }));
      }
    }
    const perDay = new Map();
    for (const block of live) {
      if (block.fixed) continue;
      perDay.set(block.date, (perDay.get(block.date) || 0) + 1);
    }
    for (const [date, count] of perDay) {
      if (count > maxPerDay) issues.push(issue('day_over_capacity', 'warning', { date, max: maxPerDay, count }));
    }

    const counts = emptyCounts();
    for (const block of blocks) {
      counts.total += 1;
      if (block.status === 'duplicate') { counts.duplicate += 1; continue; }
      if (block.issues.some(entry => entry.severity === 'error')) {
        block.status = 'invalid';
        counts.invalid += 1;
        continue;
      }
      if (block.fixed) {
        block.status = 'fixed';
        counts.fixed += 1;
        continue;
      }
      block.selectable = true;
      counts.selectable += 1;
      if (block.issues.some(entry => entry.severity === 'conflict')) {
        block.status = 'conflict';
        counts.conflict += 1;
      } else {
        block.status = 'ready';
        block.selected = true;
        counts.ready += 1;
      }
    }
    if (!blocks.length) issues.push(issue('no_blocks', 'warning'));

    const missing = [];
    if (Array.isArray(draft.missing)) {
      for (const entry of draft.missing.slice(0, LIMITS.missing)) {
        const question = cleanText(typeof entry === 'string' ? entry : entry?.question, 300);
        if (!question) continue;
        missing.push(issue('missing_from_draft', 'missing', {
          field: cleanText(typeof entry === 'string' ? '' : entry?.field, 40),
          question,
        }));
      }
    }

    const summary = cleanMultiline(draft.summary, LIMITS.summaryChars);
    const fingerprint = hash64(canonicalJson({
      plan_id: planId || '',
      timezone: sourceTz,
      summary,
      blocks: draft.blocks.map(entry => isRecord(entry) ? {
        date: entry.date ?? null,
        start: entry.start ?? null,
        end: entry.end ?? null,
        title: typeof entry.title === 'string' ? entry.title.trim() : null,
        kind: entry.kind ?? null,
        notes: entry.notes ?? null,
        fixed: entry.fixed === true,
      } : null),
      missing: missing.map(entry => entry.params.question),
    }));
    const draftId = sanitizeDraftId(options.draftId) || sanitizeDraftId(draft.draft_id) || `d${fingerprint}`;
    return {
      ok: true,
      contract: CONTRACT,
      draftId,
      fingerprint,
      planId,
      requestRevision: revision || null,
      timezone: planTz,
      sourceTimezone: sourceTz,
      summary,
      blocks,
      missing,
      issues,
      counts,
    };
  }

  // Short text for tool results and logs (English; the extension localizes codes).
  function summarizeValidation(result) {
    if (!result?.ok) return result?.issues?.map(describeIssue).join(' ') || 'The draft could not be read.';
    const c = result.counts;
    const lines = [
      `${c.total} block(s): ${c.ready} ready, ${c.conflict} with conflicts, ${c.invalid} invalid, ${c.fixed} fixed, ${c.duplicate} duplicate.`,
    ];
    for (const entry of result.issues) lines.push(`- ${describeIssue(entry)}`);
    for (const block of result.blocks) {
      for (const entry of block.issues) {
        if (entry.severity === 'error' || entry.severity === 'conflict') lines.push(`- ${describeIssue(entry)}`);
      }
    }
    for (const entry of result.missing) lines.push(`- ${describeIssue(entry)}`);
    return lines.slice(0, 40).join('\n');
  }

  // ── JSON Schemas ─────────────────────────────────────────────────────
  // `strict` follows the structured-output dialect that requires every property
  // and additionalProperties: false (optional values are nullable). The tool
  // schema keeps optional fields optional for MCP clients.
  function draftJsonSchema({ strict = true } = {}) {
    const nullableString = description => strict
      ? { type: ['string', 'null'], description }
      : { type: 'string', description };
    const block = {
      type: 'object',
      additionalProperties: false,
      properties: {
        date: { type: 'string', description: 'Real calendar date, YYYY-MM-DD, inside the plan range.' },
        start: nullableString('24-hour HH:MM start in the plan time zone.'),
        end: nullableString('24-hour HH:MM end, later than start on the same day.'),
        title: { type: 'string', description: 'Short task title (max 140 characters).' },
        kind: { type: 'string', enum: [...BLOCK_KINDS] },
        notes: nullableString('Optional short note.'),
        fixed: { type: 'boolean', description: 'true only for a fixed commitment copied unchanged from the request.' },
      },
      required: strict ? ['date', 'start', 'end', 'title', 'kind', 'notes', 'fixed'] : ['date', 'title'],
    };
    const missingItem = {
      type: 'object',
      additionalProperties: false,
      properties: {
        field: { type: 'string', description: 'Which input is missing, such as deadline or duration.' },
        question: { type: 'string', description: 'One question the person can answer.' },
      },
      required: ['field', 'question'],
    };
    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'Locus plan draft (locus.plan/v1)',
      type: 'object',
      additionalProperties: false,
      properties: {
        contract: { type: 'string', enum: [CONTRACT] },
        plan_id: { type: 'string' },
        request_revision: { type: 'string' },
        timezone: { type: 'string', description: 'IANA time zone of every time in blocks.' },
        summary: { type: 'string', description: 'One or two sentences about the plan.' },
        blocks: { type: 'array', maxItems: LIMITS.blocks, items: block },
        missing: { type: 'array', maxItems: LIMITS.missing, items: missingItem },
      },
      required: strict
        ? ['contract', 'plan_id', 'request_revision', 'timezone', 'summary', 'blocks', 'missing']
        : ['plan_id', 'timezone', 'blocks'],
    };
  }

  function toolInputSchema() {
    const schema = draftJsonSchema({ strict: false });
    delete schema.$schema;
    delete schema.title;
    schema.properties.idempotency_key = {
      type: 'string',
      description: 'Optional. Reuse the same key when retrying the same draft so Locus keeps one copy.',
    };
    return schema;
  }

  // ── Prompt profiles ──────────────────────────────────────────────────
  const EXAMPLE_INPUT = Object.freeze({
    planId: 'example-week',
    title: 'Launch week',
    horizon: 'week',
    start: '2030-03-11',
    end: '2030-03-17',
    timezone: 'Europe/London',
    goals: ['Finish the launch slides (about 3 hours)', 'Book the venue'],
    fixed: [{ date: '2030-03-12', start: '14:00', end: '15:00', title: 'Team sync' }],
    constraints: { dayStart: '09:00', dayEnd: '17:30', maxPerDay: 4, notes: '' },
  });
  const EXAMPLE_NOW = Date.UTC(2030, 2, 10, 12, 0, 0);

  function exampleRequest() {
    return buildPlanRequest(EXAMPLE_INPUT, { now: EXAMPLE_NOW }).request;
  }

  function exampleDraft(request = exampleRequest()) {
    return {
      contract: CONTRACT,
      plan_id: request.plan_id,
      request_revision: request.revision,
      timezone: request.timezone,
      summary: 'Slides in two focused blocks around the fixed sync; venue booking waits for a budget.',
      blocks: [
        { date: '2030-03-11', start: '09:30', end: '11:00', title: 'Draft launch slides', kind: 'focus', notes: null, fixed: false },
        { date: '2030-03-12', start: '14:00', end: '15:00', title: 'Team sync', kind: 'meeting', notes: null, fixed: true },
        { date: '2030-03-13', start: '10:00', end: '11:30', title: 'Finish launch slides', kind: 'focus', notes: 'Use feedback from the sync.', fixed: false },
      ],
      missing: [{ field: 'budget', question: 'What is the venue budget?' }],
    };
  }

  function requestForPrompt(request, { compact = false } = {}) {
    const { client: _client, ...shared } = request;
    if (!compact) return shared;
    const { contract: _contract, revision: _revision, plan_id: _plan, ...rest } = shared;
    return rest;
  }

  function horizonWord(horizon) {
    return horizon === 'day' ? 'day' : horizon === 'week' ? 'week' : 'month';
  }

  function outputInstruction(request, delivery, style) {
    const ids = `"contract": "${CONTRACT}", "plan_id": "${request.plan_id}", "request_revision": "${request.revision}" and "timezone": "${request.timezone}"`;
    if (delivery === 'mcp') {
      if (style === 'claude') {
        return `Call the ${TOOL_SUBMIT} tool once, passing the draft as its arguments with ${ids}. If the tool reports errors, correct only those blocks and call it again. Then reply with one line that repeats the status the tool returned.`;
      }
      return `Call the ${TOOL_SUBMIT} tool with the draft as its arguments (${ids}).`;
    }
    if (delivery === 'structured') {
      return `Return the draft as JSON that matches the response schema, with ${ids}.`;
    }
    if (style === 'claude') {
      return `Reply with only the draft JSON object between <locus_draft> and </locus_draft>, with ${ids}. The person pastes your reply into Locus, which reads the JSON between those tags.`;
    }
    return `Return only one JSON object, with ${ids}. No Markdown fences and no other text.`;
  }

  function promptClaude(request, delivery) {
    const example = exampleRequest();
    const c = request.constraints;
    const lines = [
      '<planning_request>',
      JSON.stringify(requestForPrompt(request), null, 2),
      '</planning_request>',
      '',
      '<context>',
      `Locus is a planner that runs in the person's browser. When they accept your draft, Locus adds each block as a to-do with a reminder at its start time on the Locus Calendar. The Calendar stays the source of truth, and Locus re-checks every date and time before anything is saved. A wrong date or an invented time becomes a wrong reminder, so exact, real values matter more than filling every hour.`,
      `Today is ${request.today} in ${request.timezone}. This ${horizonWord(request.horizon)} plan, "${request.title}", covers ${request.range.start} to ${request.range.end}.`,
      '</context>',
      '',
      '<constraints>',
      `- Schedule only on dates from ${request.range.start} to ${request.range.end}, written YYYY-MM-DD. Use real calendar dates.`,
      `- Write times as 24-hour HH:MM in ${request.timezone}. Give every block a start and an end, with the end later than the start on the same day.`,
      '- Copy each fixed commitment exactly as given (same date, start, end and title) with "fixed": true. Do not move, shorten or drop one, and schedule nothing that overlaps one.',
      '- Do not overlap the busy times. They are existing Calendar reminders, and Locus keeps them.',
      `- Stay between ${c.day_start} and ${c.day_end}, with at most ${c.max_blocks_per_day} blocks per day.`,
      '- If you need a fact you do not have, such as a deadline or how long something takes, do not guess. Add a question to "missing" and leave that work out of blocks.',
      '- Plan only the goals and notes in planning_request.',
      '</constraints>',
      '',
      '<example>',
      '<example_request>',
      JSON.stringify(requestForPrompt(example)),
      '</example_request>',
      '<example_draft>',
      JSON.stringify(exampleDraft(example)),
      '</example_draft>',
      '</example>',
      '',
      '<output_format>',
      outputInstruction(request, delivery, 'claude'),
    ];
    if (delivery !== 'mcp') {
      lines.push('Each block has date, start, end, title, kind (task, focus, meeting, break, errand or habit), notes (string or null) and fixed. "missing" is a list of {"field", "question"}.');
    }
    lines.push('</output_format>');
    return lines.join('\n');
  }

  function promptCodex(request, delivery) {
    const c = request.constraints;
    const lines = [
      `Objective: draft a ${horizonWord(request.horizon)} plan "${request.title}" for ${request.range.start} to ${request.range.end} (${request.timezone}) and ${delivery === 'mcp' ? 'submit it to Locus' : 'return it as JSON'}.`,
      '',
    ];
    if (delivery === 'mcp') {
      lines.push(`Tool: call \`${TOOL_SUBMIT}\` on the \`locus\` MCP server. Pass the draft fields as the tool arguments. Call it once; call it again only to fix errors it reports. Do not edit files, run shell commands, or browse.`);
    } else {
      lines.push(`Output: ${outputInstruction(request, delivery, 'codex')}`);
    }
    lines.push(
      '',
      'Rules:',
      `1. contract "${CONTRACT}", plan_id "${request.plan_id}", request_revision "${request.revision}", timezone "${request.timezone}".`,
      `2. date: YYYY-MM-DD from ${request.range.start} to ${request.range.end}. start and end: 24-hour HH:MM, end later than start, same day.`,
      '3. Copy every fixed commitment unchanged with fixed=true. Never overlap fixed or busy times.',
      `4. Work hours ${c.day_start}-${c.day_end}; at most ${c.max_blocks_per_day} blocks per day.`,
      '5. Unknown fact: add {field, question} to missing. Do not invent it.',
      '',
      'Input:',
      JSON.stringify(requestForPrompt(request)),
    );
    if (delivery !== 'structured') {
      lines.push('', 'Schema:', JSON.stringify(delivery === 'mcp' ? toolInputSchema() : draftJsonSchema({ strict: true })));
    }
    return lines.join('\n');
  }

  function promptCodexCompact(request, delivery) {
    const c = request.constraints;
    const action = delivery === 'mcp'
      ? `Call ${TOOL_SUBMIT} once.`
      : delivery === 'structured' ? 'Return JSON per schema.' : 'Print one JSON object only.';
    const lines = [
      `Plan ${request.range.start}..${request.range.end} ${request.timezone}. ${action}`,
      `contract=${CONTRACT} plan_id=${request.plan_id} request_revision=${request.revision} timezone=${request.timezone}`,
      'blocks[]: date YYYY-MM-DD in range; start,end HH:MM, end>start; title; kind task|focus|meeting|break|errand|habit; notes|null; fixed.',
      `Copy fixed items unchanged, fixed=true. No overlap with fixed/busy. Hours ${c.day_start}-${c.day_end}, max ${c.max_blocks_per_day}/day. Unknown fact: missing[{field,question}], no guessing.`,
      `Input: ${JSON.stringify(requestForPrompt(request, { compact: true }))}`,
    ];
    if (delivery === 'paste') {
      lines.push(`Shape: {"contract":"${CONTRACT}","plan_id":"${request.plan_id}","request_revision":"${request.revision}","timezone":"${request.timezone}","summary":"","blocks":[{"date":"${request.range.start}","start":"09:00","end":"10:00","title":"","kind":"task","notes":null,"fixed":false}],"missing":[]}`);
    }
    return lines.join('\n');
  }

  function promptGemini(request, delivery) {
    const example = exampleRequest();
    const c = request.constraints;
    const format = delivery === 'paste'
      ? `${outputInstruction(request, delivery, 'gemini')} It must match this JSON Schema: ${JSON.stringify(draftJsonSchema({ strict: true }))}`
      : outputInstruction(request, delivery, 'gemini');
    return [
      `Goal: Build a ${horizonWord(request.horizon)} schedule called "${request.title}" for ${request.range.start} to ${request.range.end} in ${request.timezone}. Today is ${request.today}.`,
      '',
      'Constraints:',
      `- Dates: YYYY-MM-DD, only from ${request.range.start} to ${request.range.end}.`,
      `- Times: 24-hour HH:MM in ${request.timezone}. Every block has a start and an end, and the end is later than the start.`,
      '- Fixed commitments: copy each one unchanged with "fixed": true. Schedule nothing that overlaps them or the busy times.',
      `- Hours: ${c.day_start} to ${c.day_end}, at most ${c.max_blocks_per_day} blocks per day.`,
      '- Missing facts: add a question to "missing" instead of guessing.',
      '- Plan only the goals and notes in the request.',
      '',
      `Output format: ${format}`,
      '',
      'Example:',
      `Request: ${JSON.stringify(requestForPrompt(example))}`,
      `Draft: ${JSON.stringify(exampleDraft(example))}`,
      '',
      'Planning request:',
      JSON.stringify(requestForPrompt(request), null, 2),
      '',
      'Based on the planning request above, create the draft now.',
    ].join('\n');
  }

  function buildPlanPrompt(request, profileId, options = {}) {
    if (!isRecord(request) || request.contract !== CONTRACT) throw new Error('A valid locus.plan/v1 request is required');
    const profile = PROFILES[profileId] ? profileId : PROVIDERS[request.client?.provider]?.profiles?.[0] || 'claude-xml';
    const delivery = DELIVERIES.includes(options.delivery) ? options.delivery : 'paste';
    if (profile === 'claude-xml') return promptClaude(request, delivery);
    if (profile === 'codex-tool') return promptCodex(request, delivery);
    if (profile === 'codex-compact') return promptCodexCompact(request, delivery);
    return promptGemini(request, delivery);
  }

  return Object.freeze({
    CONTRACT,
    CONTRACT_VERSION,
    HORIZONS,
    HORIZON_MAX_DAYS,
    BLOCK_KINDS,
    DELIVERIES,
    LIMITS,
    DEFAULT_CONSTRAINTS,
    PROVIDERS,
    PROFILES,
    TOOL_SUBMIT,
    TOOL_REQUEST,
    TOOL_STATUS,
    ISSUE_TEXT,
    canonicalJson,
    hash64,
    parseIsoDate,
    addDays,
    weekdayIndex,
    rangeForHorizon,
    parseHm,
    formatHm,
    canonicalTimeZone,
    zonedWallToEpoch,
    epochToZoned,
    todayInZone,
    parseFixedText,
    formatFixedText,
    normalizeClient,
    buildPlanRequest,
    requestFromWire,
    extractDraftJson,
    validatePlanDraft,
    blockKey,
    describeIssue,
    summarizeValidation,
    draftJsonSchema,
    toolInputSchema,
    exampleRequest,
    exampleDraft,
    buildPlanPrompt,
  });
});
