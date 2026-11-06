'use strict';

// Focused contract test for plan-contract.js: request building, draft
// validation (dates, times, DST, time zones, fixed commitments, conflicts),
// idempotency keys, import extraction, prompt profiles, and schemas.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../plan-contract.js');

const root = path.resolve(__dirname, '..');
const NOW = Date.UTC(2026, 10, 6, 9, 0, 0); // 2026-11-06 09:00 UTC
let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const codes = list => list.map(entry => entry.code);
const blockCodes = (result, index) => codes(result.blocks[index].issues);

function weekInput(overrides = {}) {
  return {
    planId: 'plan-test-week',
    title: 'Week of 9 Nov',
    horizon: 'week',
    start: '2026-11-09',
    end: '2026-11-15',
    timezone: 'Europe/London',
    goals: 'Write the grant report\n- Prepare the lab demo',
    fixedText: '2026-11-10 14:00-15:00 Supervisor meeting\n2026-11-12 09:00–09:30 Stand-up',
    constraints: { dayStart: '09:00', dayEnd: '18:00', maxPerDay: 4, notes: 'No work after 18:00.' },
    busy: [{ at: Date.UTC(2026, 10, 11, 11, 0) }],
    client: { provider: 'claude', profile: 'claude-xml', model: '' },
    ...overrides,
  };
}

function build(overrides) {
  const built = P.buildPlanRequest(weekInput(overrides), { now: NOW });
  return built;
}

function draftFor(request, blocks, extra = {}) {
  return {
    contract: P.CONTRACT,
    plan_id: request.plan_id,
    request_revision: request.revision,
    timezone: request.timezone,
    summary: 'Test plan',
    blocks,
    missing: [],
    ...extra,
  };
}

// ── Browser global export ───────────────────────────────────────────
{
  const sandbox = { Intl, Date, Math, JSON, Object, Array, String, Number, Set, Map, RegExp, Error };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'plan-contract.js'), 'utf8'), sandbox, { filename: 'plan-contract.js' });
  ok(sandbox.LocusPlan && sandbox.LocusPlan.CONTRACT === 'locus.plan/v1', 'plan-contract.js must expose LocusPlan in a browser-like global');
  const source = fs.readFileSync(path.join(root, 'plan-contract.js'), 'utf8');
  ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|chrome\.storage/.test(source), 'plan-contract.js must stay free of network and storage APIs');
}

// ── Calendar primitives ─────────────────────────────────────────────
eq(P.parseIsoDate('2026-02-30'), null, '2026-02-30 is not a real date');
eq(P.parseIsoDate('2028-02-29')?.iso, '2028-02-29', 'leap day 2028 is real');
eq(P.parseIsoDate('2027-02-29'), null, '2027 has no leap day');
eq(P.parseIsoDate('2026-13-01'), null, 'month 13 is rejected');
eq(P.parseHm('24:00'), null, '24:00 is not a valid start time');
eq(P.parseHm('9:05'), 545, 'single-digit hours are accepted');
eq(P.rangeForHorizon('week', '2026-11-09'), { start: '2026-11-09', end: '2026-11-15' }, 'week range is seven days');
eq(P.rangeForHorizon('month', '2026-11-01'), { start: '2026-11-01', end: '2026-11-30' }, 'month from the 1st ends on the last day');
eq(P.rangeForHorizon('day', '2026-11-09'), { start: '2026-11-09', end: '2026-11-09' }, 'day range is one day');
eq(P.weekdayIndex('2026-11-09'), 0, '2026-11-09 is a Monday');
eq(P.canonicalTimeZone('Mars/Olympus'), null, 'unknown time zones are rejected');
eq(P.canonicalTimeZone('Asia/Taipei'), 'Asia/Taipei', 'IANA zones are accepted');

// DST: New York springs forward 2027-03-14 02:00 and falls back 2027-11-07 02:00.
{
  const gap = P.zonedWallToEpoch('2027-03-14', 150, 'America/New_York');
  eq(gap.status, 'gap', '02:30 on spring-forward day does not exist');
  eq(gap.suggestion, '03:30', 'the gap suggestion is the shifted wall time');
  const ambiguous = P.zonedWallToEpoch('2027-11-07', 90, 'America/New_York');
  eq(ambiguous.status, 'ambiguous', '01:30 on fall-back day happens twice');
  eq(ambiguous.at, Date.UTC(2027, 10, 7, 5, 30), 'the earlier (EDT) instant is chosen');
  eq(ambiguous.alternatives[1] - ambiguous.alternatives[0], 3600000, 'the two instants are one hour apart');
  const london = P.zonedWallToEpoch('2026-03-29', 90, 'Europe/London');
  eq(london.status, 'gap', '01:30 on the UK spring-forward day does not exist');
  const ok1 = P.zonedWallToEpoch('2026-11-09', 570, 'Asia/Taipei');
  eq(ok1, { status: 'ok', at: Date.UTC(2026, 10, 9, 1, 30) }, 'Taipei 09:30 is 01:30 UTC');
}

// ── Plan request ────────────────────────────────────────────────────
{
  const built = build();
  ok(built.ok, `week request must build: ${JSON.stringify(built.issues)}`);
  const request = built.request;
  eq(request.contract, 'locus.plan/v1', 'request carries the contract');
  eq(request.today, '2026-11-06', 'today is computed in the plan time zone');
  eq(request.goals, ['Write the grant report', 'Prepare the lab demo'], 'goal bullets are stripped');
  eq(request.fixed, [
    { date: '2026-11-10', start: '14:00', end: '15:00', title: 'Supervisor meeting' },
    { date: '2026-11-12', start: '09:00', end: '09:30', title: 'Stand-up' },
  ], 'fixed lines parse, including an en dash range');
  eq(request.busy, [{ date: '2026-11-11', start: '11:00' }], 'busy times are converted to plan-zone times and carry no titles');
  ok(/^r[0-9a-f]{12}$/.test(request.revision), 'revision is a short digest');
  eq(request.constraints, { day_start: '09:00', day_end: '18:00', max_blocks_per_day: 4, notes: 'No work after 18:00.' }, 'constraints are normalized');

  const sameLater = P.buildPlanRequest(weekInput(), { now: NOW + 3 * 86400000 }).request;
  eq(sameLater.revision, request.revision, 'revision ignores the day the brief is shared');
  const otherClient = build({ client: { provider: 'gemini', profile: 'gemini-structured' } }).request;
  eq(otherClient.revision, request.revision, 'revision ignores the chosen assistant');
  const changed = build({ goals: 'Write the grant report' }).request;
  ok(changed.revision !== request.revision, 'revision changes when goals change');

  const badZone = build({ timezone: 'Mars/Olympus' });
  ok(!badZone.ok && codes(badZone.issues).includes('timezone_invalid'), 'an unknown zone blocks the request');
  const badDate = build({ start: '2026-02-30', end: '2026-03-02' });
  ok(!badDate.ok && codes(badDate.issues).includes('range_invalid'), 'an invalid start date blocks the request');
  const reversed = build({ start: '2026-11-15', end: '2026-11-09' });
  ok(codes(reversed.issues).includes('range_reversed'), 'a reversed range is rejected');
  const tooLong = build({ end: '2026-11-20' });
  ok(codes(tooLong.issues).includes('range_too_long'), 'a week plan cannot span 12 days');
  const noGoals = build({ goals: '' });
  ok(noGoals.ok && codes(noGoals.missing).includes('goals_missing'), 'missing goals are flagged without blocking');
  const badLine = build({ fixedText: 'Tuesday afternoon dentist' });
  ok(codes(badLine.missing).includes('fixed_line_invalid'), 'an unparseable fixed line is a missing input');
  const outside = build({ fixedText: '2026-11-20 10:00-11:00 Later' });
  ok(codes(outside.issues).includes('fixed_out_of_range') && outside.request.fixed.length === 0, 'out-of-range fixed commitments are dropped with a warning');
  const nyGap = P.buildPlanRequest({ ...weekInput(), timezone: 'America/New_York', start: '2027-03-14', end: '2027-03-14', horizon: 'day', fixedText: '2027-03-14 02:30-03:30 Night shift' }, { now: NOW });
  ok(!nyGap.ok && codes(nyGap.issues).includes('fixed_dst_gap'), 'a fixed commitment inside a DST gap blocks the request');
  const hours = build({ constraints: { dayStart: '18:00', dayEnd: '09:00' } });
  ok(codes(hours.issues).includes('hours_invalid'), 'working hours must run forward');
}

// ── Draft validation ────────────────────────────────────────────────
const request = build().request;
{
  const result = P.validatePlanDraft(draftFor(request, [
    { date: '2026-11-09', start: '09:30', end: '11:00', title: 'Grant report outline', kind: 'focus', notes: null, fixed: false },
    { date: '2026-11-10', start: '14:00', end: '15:00', title: 'Supervisor meeting', kind: 'meeting', notes: null, fixed: true },
    { date: '2026-02-30', start: '10:00', end: '11:00', title: 'Impossible day', kind: 'task', notes: null, fixed: false },
    { date: '2026-11-11', start: '25:00', end: null, title: 'Bad time', kind: 'task', notes: null, fixed: false },
    { date: '2026-11-11', start: '13:00', end: '12:00', title: 'Backwards', kind: 'task', notes: null, fixed: false },
    { date: '2026-11-20', start: '10:00', end: '11:00', title: 'Outside range', kind: 'task', notes: null, fixed: false },
    { date: '2026-11-10', start: '14:30', end: '15:30', title: 'Clashes with meeting', kind: 'task', notes: null, fixed: false },
    { date: '2026-11-11', start: '10:45', end: '11:30', title: 'Clashes with Calendar', kind: 'task', notes: null, fixed: false },
    { date: '2026-11-12', start: '09:15', end: '10:00', title: 'Stand-up', kind: 'meeting', notes: null, fixed: true },
    { date: '2026-11-13', title: 'Untimed demo prep', kind: 'task', fixed: false },
    { date: '2026-11-09', start: '09:30', end: '11:00', title: 'grant report OUTLINE', kind: 'focus', notes: null, fixed: false },
    { date: '2026-11-09', start: '10:30', end: '12:00', title: 'Overlapping block', kind: 'task', notes: null, fixed: false },
  ], { missing: [{ field: 'deadline', question: 'When is the grant report due?' }] }), request, { now: NOW });

  ok(result.ok, 'a draft with bad blocks still parses');
  eq(result.blocks[0].status, 'conflict', 'block 1 overlaps block 12 and is not preselected');
  eq(result.blocks[1].status, 'fixed', 'an exact fixed echo is kept as fixed');
  eq(result.blocks[2].status, 'invalid', 'an impossible date is invalid');
  ok(blockCodes(result, 2).includes('invalid_date'), 'invalid date is reported');
  ok(blockCodes(result, 3).includes('invalid_time'), '25:00 is reported');
  ok(blockCodes(result, 4).includes('end_before_start'), 'end before start is reported');
  ok(blockCodes(result, 5).includes('out_of_range'), 'out of range is reported');
  ok(blockCodes(result, 6).includes('conflict_fixed') && result.blocks[6].status === 'conflict', 'overlap with a fixed commitment is a conflict');
  ok(blockCodes(result, 7).includes('conflict_calendar'), 'overlap with an existing Calendar reminder is a conflict');
  ok(blockCodes(result, 8).includes('fixed_moved') && result.blocks[8].status === 'invalid', 'moving a fixed commitment is an error');
  ok(blockCodes(result, 9).includes('time_missing') && result.blocks[9].timeAssumed, 'an untimed block is flagged');
  eq(result.blocks[9].at, Date.UTC(2026, 10, 13, 9, 0), 'an untimed block reminds at the working-day start');
  eq(result.blocks[10].status, 'duplicate', 'a case-only repeat is a duplicate');
  ok(blockCodes(result, 11).includes('overlap'), 'overlapping timed blocks are flagged');
  eq(result.blocks[0].at, Date.UTC(2026, 10, 9, 9, 30), 'London 09:30 in November is 09:30 UTC');
  eq(codes(result.missing), ['missing_from_draft'], 'assistant questions become missing inputs');
  eq(result.counts.selectable, 5, 'selectable count covers ready and conflict blocks');
  ok(result.blocks.filter(block => block.selected).every(block => block.status === 'ready'), 'only ready blocks start selected');
  ok(/invalid/.test(P.summarizeValidation(result)), 'summary text names invalid blocks');
}

// Time zone differs: a New York draft is converted into the London plan.
{
  const result = P.validatePlanDraft(draftFor(request, [
    { date: '2026-11-09', start: '04:30', end: '05:30', title: 'Early call', kind: 'meeting', notes: null, fixed: false },
    { date: '2026-11-15', start: '20:00', end: '21:00', title: 'Sunday evening review', kind: 'task', notes: null, fixed: false },
  ], { timezone: 'America/New_York' }), request, { now: NOW });
  ok(codes(result.issues).includes('timezone_differs'), 'a different draft zone is reported');
  eq([result.blocks[0].date, result.blocks[0].start], ['2026-11-09', '09:30'], 'NY 04:30 is London 09:30 in November');
  eq(result.blocks[0].at, Date.UTC(2026, 10, 9, 9, 30), 'converted instant is exact');
  ok(blockCodes(result, 1).includes('out_of_range') && result.blocks[1].date === '2026-11-16', 'NY Sunday 20:00 becomes London Monday and leaves the range');
}

// DST inside a draft.
{
  const ny = P.buildPlanRequest({
    ...weekInput(), planId: 'plan-ny', timezone: 'America/New_York', horizon: 'week',
    start: '2027-03-13', end: '2027-03-19', fixedText: '', busy: [],
    constraints: { dayStart: '01:00', dayEnd: '23:00', maxPerDay: 6 },
  }, { now: NOW }).request;
  const result = P.validatePlanDraft(draftFor(ny, [
    { date: '2027-03-14', start: '02:30', end: '03:30', title: 'In the gap', kind: 'task', notes: null, fixed: false },
    { date: '2027-03-14', start: '03:30', end: '04:30', title: 'After the gap', kind: 'task', notes: null, fixed: false },
  ]), ny, { now: NOW });
  ok(blockCodes(result, 0).includes('dst_gap') && result.blocks[0].status === 'invalid', 'a block in the DST gap is invalid');
  eq(result.blocks[0].issues.find(entry => entry.code === 'dst_gap').params.suggestion, '03:30', 'the gap issue suggests the shifted time');
  eq(result.blocks[1].at, Date.UTC(2027, 2, 14, 7, 30), '03:30 EDT is 07:30 UTC');

  const fall = P.buildPlanRequest({ ...weekInput(), planId: 'plan-ny-fall', timezone: 'America/New_York', start: '2027-11-07', end: '2027-11-07', horizon: 'day', fixedText: '', busy: [], constraints: { dayStart: '00:00', dayEnd: '23:00' } }, { now: NOW }).request;
  const fallResult = P.validatePlanDraft(draftFor(fall, [
    { date: '2027-11-07', start: '01:30', end: '02:30', title: 'Twice', kind: 'task', notes: null, fixed: false },
  ]), fall, { now: NOW });
  ok(blockCodes(fallResult, 0).includes('dst_ambiguous') && fallResult.blocks[0].status === 'ready', 'an ambiguous fall-back time stays usable with a warning');
  eq(fallResult.blocks[0].at, Date.UTC(2027, 10, 7, 5, 30), 'the earlier instant is used');
}

// Envelope failures and warnings.
{
  const mismatch = P.validatePlanDraft(draftFor(request, [], { plan_id: 'someone-else' }), request, { now: NOW });
  ok(!mismatch.ok && codes(mismatch.issues).includes('plan_mismatch'), 'a draft for another plan is rejected');
  const contract = P.validatePlanDraft(draftFor(request, [], { contract: 'locus.plan/v2' }), request, { now: NOW });
  ok(!contract.ok && codes(contract.issues).includes('contract_unsupported'), 'a future contract is rejected');
  const stale = P.validatePlanDraft(draftFor(request, [], { request_revision: 'r000000000000' }), request, { now: NOW });
  ok(stale.ok && codes(stale.issues).includes('stale_request'), 'an older revision is a warning');
  const badZone = P.validatePlanDraft(draftFor(request, [], { timezone: 'Nowhere/Land' }), request, { now: NOW });
  ok(!badZone.ok && codes(badZone.issues).includes('timezone_invalid'), 'an invalid draft zone is rejected');
  const noBlocks = P.validatePlanDraft({ contract: P.CONTRACT, plan_id: request.plan_id, timezone: request.timezone }, request, { now: NOW });
  ok(!noBlocks.ok && codes(noBlocks.issues).includes('blocks_missing'), 'a draft without blocks is rejected');
  const huge = P.validatePlanDraft(draftFor(request, [{ date: '2026-11-09', start: '10:00', end: '11:00', title: 'x', notes: 'y'.repeat(300000), kind: 'task', fixed: false }]), request, { now: NOW });
  ok(!huge.ok && codes(huge.issues).includes('draft_too_large'), 'an oversized draft is rejected');
  const past = P.validatePlanDraft(draftFor(request, [{ date: '2026-11-09', start: '10:00', end: '11:00', title: 'Was earlier', kind: 'task', notes: null, fixed: false }]), request, { now: Date.UTC(2026, 10, 10) });
  ok(blockCodes(past, 0).includes('in_past') && past.blocks[0].status === 'conflict', 'a block in the past is not preselected');
  const crowded = P.validatePlanDraft(draftFor(request, ['09:00', '10:00', '11:30', '13:00', '16:00'].map((start, i) => ({
    date: '2026-11-13', start, end: P.formatHm(P.parseHm(start) + 30), title: `Block ${i}`, kind: 'task', notes: null, fixed: false,
  }))), request, { now: NOW });
  ok(codes(crowded.issues).includes('day_over_capacity'), 'more than max blocks per day is a warning');
}

// ── Import extraction ───────────────────────────────────────────────
{
  const draft = draftFor(request, [{ date: '2026-11-09', start: '10:00', end: '11:00', title: 'Read papers', kind: 'task', notes: null, fixed: false }]);
  const json = JSON.stringify(draft);
  const prose = `Here is your plan!\n\n\`\`\`json\n${JSON.stringify(draft, null, 2)}\n\`\`\`\nLet me know.`;
  const tagged = `Sure.\n<locus_draft>${json}</locus_draft>`;
  const cliWrapper = JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: tagged });
  const structured = JSON.stringify({ type: 'result', structured_output: draft });
  const leadingObject = `{"note":"ignore me"}\n${json}`;
  const fingerprints = new Set();
  for (const [label, text] of [['plain', json], ['fenced', prose], ['tagged', tagged], ['claude cli', cliWrapper], ['structured', structured], ['leading object', leadingObject]]) {
    const result = P.validatePlanDraft(text, request, { now: NOW });
    ok(result.ok && result.blocks.length === 1 && result.blocks[0].status === 'ready', `${label} paste must import`);
    fingerprints.add(result.fingerprint);
  }
  eq(fingerprints.size, 1, 'every wrapper of the same draft has one fingerprint');
  const empty = P.validatePlanDraft('   ', request, { now: NOW });
  ok(!empty.ok && codes(empty.issues).includes('draft_empty'), 'empty paste is reported');
  const garbage = P.validatePlanDraft('The plan is to rest.', request, { now: NOW });
  ok(!garbage.ok && codes(garbage.issues).includes('draft_not_json'), 'prose without JSON is reported');
}

// ── Idempotency ─────────────────────────────────────────────────────
{
  const base = draftFor(request, [{ date: '2026-11-09', start: '10:00', end: '11:00', title: 'Read papers', kind: 'task', notes: null, fixed: false }]);
  const reordered = JSON.parse(JSON.stringify(base));
  const block = reordered.blocks[0];
  reordered.blocks[0] = { fixed: block.fixed, notes: block.notes, kind: block.kind, title: block.title, end: block.end, start: block.start, date: block.date };
  const a = P.validatePlanDraft(base, request, { now: NOW });
  const b = P.validatePlanDraft(reordered, request, { now: NOW });
  eq(a.fingerprint, b.fingerprint, 'key order does not change the fingerprint');
  eq(a.draftId, b.draftId, 'key order does not change the draft id');
  eq(a.blocks[0].key, b.blocks[0].key, 'block keys are stable');
  const edited = JSON.parse(JSON.stringify(base));
  edited.blocks[0].notes = 'Bring the printout';
  const c = P.validatePlanDraft(edited, request, { now: NOW });
  ok(c.fingerprint !== a.fingerprint, 'a changed note is a new draft');
  eq(c.blocks[0].key, a.blocks[0].key, 'the same date, time and title keep the same block key');
  eq(a.blocks[0].key, P.blockKey(request.plan_id, '2026-11-09', '10:00', 'read papers'), 'block keys are case-insensitive on title');
}

// ── Prompt profiles ─────────────────────────────────────────────────
{
  const example = P.exampleRequest();
  const exampleResult = P.validatePlanDraft(P.exampleDraft(example), example, { now: Date.UTC(2030, 2, 10) });
  eq(exampleResult.counts, { total: 3, ready: 2, conflict: 0, invalid: 0, fixed: 1, duplicate: 0, selectable: 2 }, 'the shared example is a clean draft');
  eq(exampleResult.issues, [], 'the shared example has no envelope issues');

  for (const profile of Object.keys(P.PROFILES)) {
    for (const delivery of P.DELIVERIES) {
      const prompt = P.buildPlanPrompt(request, profile, { delivery });
      const label = `${profile}/${delivery}`;
      ok(prompt.includes(request.plan_id) && prompt.includes(request.revision), `${label} carries plan id and revision`);
      ok(prompt.includes(request.timezone) && prompt.includes(request.range.start) && prompt.includes(request.range.end), `${label} carries zone and range`);
      ok(!prompt.includes('"client"'), `${label} does not leak client settings`);
      if (delivery === 'mcp') ok(prompt.includes(P.TOOL_SUBMIT), `${label} names the submit tool`);
      else ok(!prompt.includes(`call \`${P.TOOL_SUBMIT}\``) && !/Call the locus_submit_plan_draft tool/.test(prompt), `${label} does not ask for a tool call`);
    }
  }

  const claude = P.buildPlanPrompt(request, 'claude-xml', { delivery: 'paste' });
  for (const tag of ['planning_request', 'context', 'constraints', 'example', 'example_request', 'example_draft', 'output_format']) {
    ok(claude.includes(`<${tag}>`) && claude.includes(`</${tag}>`), `Claude prompt has <${tag}>`);
  }
  ok(claude.indexOf('<planning_request>') === 0 && claude.indexOf('<planning_request>') < claude.indexOf('<constraints>'), 'Claude prompt puts the data first');
  ok(claude.includes('<locus_draft>'), 'Claude paste prompt asks for tagged output');
  const embedded = /<example_draft>\n(.+)\n<\/example_draft>/.exec(claude)[1];
  const embeddedResult = P.validatePlanDraft(embedded, example, { now: Date.UTC(2030, 2, 10) });
  ok(embeddedResult.ok && embeddedResult.counts.invalid === 0 && !embeddedResult.blocks.some(blockItem => blockItem.issues.length), 'the example inside the Claude prompt validates');
  ok(/Locus re-checks every date and time/.test(claude), 'Claude prompt explains why exact values matter');

  const codex = P.buildPlanPrompt(request, 'codex-tool', { delivery: 'mcp' });
  ok(codex.startsWith('Objective:'), 'Codex prompt starts with the objective');
  ok(codex.includes('`locus_submit_plan_draft`') && codex.includes('`locus` MCP server'), 'Codex prompt names the exact tool and server');
  const schemaLine = codex.split('\n')[codex.split('\n').indexOf('Schema:') + 1];
  eq(JSON.parse(schemaLine), P.toolInputSchema(), 'Codex MCP prompt embeds the exact tool schema');
  const codexPaste = P.buildPlanPrompt(request, 'codex-tool', { delivery: 'paste' });
  eq(JSON.parse(codexPaste.split('\n')[codexPaste.split('\n').indexOf('Schema:') + 1]), P.draftJsonSchema({ strict: true }), 'Codex paste prompt embeds the strict schema');

  const compact = P.buildPlanPrompt(request, 'codex-compact', { delivery: 'mcp' });
  const compactRequest = JSON.stringify((({ client, contract, revision, plan_id, ...rest }) => rest)(request));
  ok(compact.length - compactRequest.length < 700, `compact prompt overhead stays small (${compact.length - compactRequest.length} chars)`);
  ok(compact.length < codex.length / 2, 'compact prompt is less than half the full Codex prompt');
  ok(!compact.includes('"$schema"'), 'compact prompt does not embed a schema');

  const gemini = P.buildPlanPrompt(request, 'gemini-structured', { delivery: 'paste' });
  ok(gemini.startsWith('Goal:'), 'Gemini prompt starts with the goal');
  ok(gemini.indexOf('Constraints:') < gemini.indexOf('Planning request:'), 'Gemini prompt puts constraints before the data');
  ok(gemini.trim().endsWith('Based on the planning request above, create the draft now.'), 'Gemini prompt ends with the question');
  ok(gemini.includes('JSON Schema'), 'Gemini paste prompt includes the schema');
  const geminiStructured = P.buildPlanPrompt(request, 'gemini-structured', { delivery: 'structured' });
  ok(!geminiStructured.includes('"$schema"') && geminiStructured.includes('response schema'), 'Gemini structured prompt relies on native schema output');
  const geminiExample = /Draft: (.+)/.exec(gemini)[1];
  ok(P.validatePlanDraft(geminiExample, example, { now: Date.UTC(2030, 2, 10) }).counts.invalid === 0, 'the Gemini example validates');
}

// ── Schemas ─────────────────────────────────────────────────────────
{
  const strict = P.draftJsonSchema({ strict: true });
  const walk = (schema, where) => {
    if (schema.type === 'object') {
      eq(schema.additionalProperties, false, `${where} disallows extra keys`);
      eq([...schema.required].sort(), Object.keys(schema.properties).sort(), `${where} requires every property in strict mode`);
      for (const [key, child] of Object.entries(schema.properties)) walk(child, `${where}.${key}`);
    }
    if (schema.type === 'array') walk(schema.items, `${where}[]`);
  };
  walk(strict, 'draft');
  const tool = P.toolInputSchema();
  eq(tool.required, ['plan_id', 'timezone', 'blocks'], 'tool schema requires only the essentials');
  ok(tool.properties.idempotency_key && !tool.$schema, 'tool schema adds the idempotency key and drops $schema');
  eq(tool.properties.blocks.items.properties.start.type, 'string', 'tool schema avoids union types');
}

console.log(`Plan contract tests passed: ${checks} checks (requests, dates, DST, zones, conflicts, idempotency, import, ${Object.keys(P.PROFILES).length} prompt profiles, schemas)`);
