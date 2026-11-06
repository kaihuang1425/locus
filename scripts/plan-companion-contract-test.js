'use strict';

// Transport contract test for the planner companion: the real Native
// Messaging host and stdio MCP server run as child processes against a
// throwaway data directory. Covers pairing per profile, reconnection, offline
// queueing, duplicate submission and delivery, acknowledgement, bounds, the
// MCP protocol surface, and an opt-in local runner.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const P = require('../plan-contract.js');
const { encodeMessage, NativeMessageReader } = require('../companion/lib/native-framing.js');
const { PlannerStore, STORE_LIMITS } = require('../companion/lib/store.js');
const { runLocalRunner } = require('../companion/lib/runners.js');

const root = path.resolve(__dirname, '..');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'locus-planner-test-'));
const ORIGIN = `chrome-extension://${'abcdefghijklmnop'.repeat(2)}/`;
const env = { ...process.env, LOCUS_PLANNER_HOME: home };
let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

// ── Native host harness ─────────────────────────────────────────────
function startHost(origin = ORIGIN) {
  const child = spawn(process.execPath, [path.join(root, 'companion', 'native-host.js'), origin, '--parent-window=0'], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  const waiting = new Map();
  let nextId = 1;
  let stderr = '';
  const reader = new NativeMessageReader(message => {
    const resolve = waiting.get(message.id);
    if (resolve) { waiting.delete(message.id); resolve(message); }
  });
  child.stdout.on('data', chunk => reader.push(chunk));
  child.stderr.on('data', chunk => { stderr += chunk; });
  return {
    child,
    get stderr() { return stderr; },
    send(message, { raw = false } = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`host timeout for ${message.type}: ${stderr}`)); }, 15000);
        waiting.set(id, reply => { clearTimeout(timer); resolve(reply); });
        const frame = encodeMessage({ ...message, id });
        if (raw) {
          // Split the frame across writes, header included, as pipes may.
          child.stdin.write(frame.subarray(0, 2));
          setTimeout(() => child.stdin.write(frame.subarray(2, 9)), 5);
          setTimeout(() => child.stdin.write(frame.subarray(9)), 10);
        } else child.stdin.write(frame);
      });
    },
    close() {
      return new Promise(resolve => {
        child.on('close', code => resolve(code));
        child.stdin.end();
      });
    },
  };
}

// ── MCP harness ─────────────────────────────────────────────────────
function startMcp(args = []) {
  const child = spawn(process.execPath, [path.join(root, 'companion', 'mcp-server.js'), ...args], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '';
  const waiting = new Map();
  const unsolicited = [];
  let nextId = 1;
  child.stdout.on('data', chunk => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const resolve = waiting.get(message.id);
      if (resolve) { waiting.delete(message.id); resolve(message); } else unsolicited.push(message);
    }
  });
  return {
    child,
    unsolicited,
    request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`mcp timeout for ${method}`)); }, 15000);
        waiting.set(id, reply => { clearTimeout(timer); resolve(reply); });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      });
    },
    notify(method, params) {
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    },
    raw(line) { child.stdin.write(`${line}\n`); },
    async call(name, args) {
      const reply = await this.request('tools/call', { name, arguments: args });
      assert.ok(reply.result, `tools/call ${name} must return a result: ${JSON.stringify(reply)}`);
      return reply.result;
    },
    close() {
      return new Promise(resolve => { child.on('close', resolve); child.stdin.end(); });
    },
  };
}

function weekRequest(planId = 'plan-companion-week') {
  return P.buildPlanRequest({
    planId,
    title: 'Companion week',
    horizon: 'week',
    start: '2030-03-11',
    end: '2030-03-17',
    timezone: 'Europe/London',
    goals: ['Prepare the demo'],
    fixedText: '2030-03-12 14:00-15:00 Team sync',
    constraints: { dayStart: '09:00', dayEnd: '17:30', maxPerDay: 4 },
    client: { provider: 'codex', profile: 'codex-tool' },
  }, { now: Date.UTC(2030, 2, 10) }).request;
}

function draftArgs(request, blocks) {
  return {
    contract: P.CONTRACT,
    plan_id: request.plan_id,
    request_revision: request.revision,
    timezone: request.timezone,
    summary: 'Demo prep',
    blocks,
    missing: [],
  };
}

const profileKey = () => crypto.randomBytes(32).toString('hex');

async function main() {
  const keyA = profileKey();
  const keyB = profileKey();
  const request = weekRequest();

  // Pairing per profile, and reconnection keeps the pairing.
  let host = startHost();
  const helloA = await host.send({ type: 'hello', contract: P.CONTRACT, profileKey: keyA, label: 'Profile A' }, { raw: true });
  ok(helloA.ok && /^lp-[a-z2-7]{4}-[a-z2-7]{4}$/.test(helloA.pairingId) && helloA.created === true, 'first hello creates a pairing (split frame)');
  const beforeHello = await host.send({ type: 'pull' });
  ok(beforeHello.ok, 'a paired session can pull');
  const published = await host.send({ type: 'publish_request', request });
  eq([published.ok, published.planId, published.revision], [true, request.plan_id, request.revision], 'the brief is published with its revision');
  const tampered = await host.send({ type: 'publish_request', request: { ...request, range: { start: '2030-03-11', end: '2030-04-30' } } });
  ok(!tampered.ok && tampered.code === 'request_invalid', 'an out-of-contract brief is refused');
  eq(await host.close(), 0, 'host exits cleanly when the browser closes the port');

  host = startHost();
  const again = await host.send({ type: 'hello', contract: P.CONTRACT, profileKey: keyA });
  eq([again.pairingId, again.created], [helloA.pairingId, false], 'reconnecting the same profile reuses its pairing');
  const helloB = await host.send({ type: 'hello', contract: P.CONTRACT, profileKey: keyB, label: 'Profile B' });
  ok(helloB.ok && helloB.pairingId !== helloA.pairingId, 'another profile gets its own pairing');
  await host.close();

  const strangers = startHost('chrome-extension://not-an-id/');
  const refused = await strangers.send({ type: 'hello', contract: P.CONTRACT, profileKey: keyA });
  ok(!refused.ok && refused.code === 'origin_invalid', 'a malformed caller origin cannot pair');
  const unpaired = await strangers.send({ type: 'pull' });
  ok(!unpaired.ok && unpaired.code === 'not_paired', 'nothing is reachable before hello');
  const badKey = await strangers.send({ type: 'unknown-thing' });
  ok(!badKey.ok && badKey.code === 'unknown_type', 'unknown messages are refused');
  await strangers.close();

  // MCP: two pairings exist, so the server must be told which one.
  let mcp = startMcp();
  const init = await mcp.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'contract-test', version: '1' } });
  eq(init.result.protocolVersion, '2025-06-18', 'a supported protocol version is echoed');
  ok(init.result.capabilities.tools && init.result.capabilities.prompts, 'tools and prompts are advertised');
  const ambiguous = await mcp.call(P.TOOL_REQUEST, {});
  ok(ambiguous.isError && ambiguous.structuredContent.code === 'pairing_required', 'several pairings require --pairing');
  await mcp.close();

  mcp = startMcp(['--pairing', helloA.pairingId, '--client', 'contract-test']);
  const init2 = await mcp.request('initialize', { protocolVersion: '1999-01-01', capabilities: {}, clientInfo: { name: 'contract-test' } });
  eq(init2.result.protocolVersion, '2025-11-25', 'an unknown protocol version gets the newest supported one');
  mcp.notify('notifications/initialized', {});
  const pong = await mcp.request('ping', {});
  eq(pong.result, {}, 'ping answers');
  const tools = await mcp.request('tools/list', {});
  eq(tools.result.tools.map(tool => tool.name), [P.TOOL_REQUEST, P.TOOL_SUBMIT, P.TOOL_STATUS], 'three tools are listed');
  eq(tools.result.tools[1].inputSchema, P.toolInputSchema(), 'the submit tool uses the shared contract schema');
  ok(tools.result.tools[1].annotations.idempotentHint === true && tools.result.tools[1].annotations.destructiveHint === false, 'submit is marked idempotent and non-destructive');
  const missingMethod = await mcp.request('resources/list', {});
  eq(missingMethod.error.code, -32601, 'unknown methods return method-not-found');
  mcp.raw('{not json');
  await new Promise(resolve => setTimeout(resolve, 100));
  ok(mcp.unsolicited.some(message => message.error?.code === -32700), 'malformed JSON returns a parse error');

  const brief = await mcp.call(P.TOOL_REQUEST, {});
  ok(!brief.isError && brief.structuredContent.request.revision === request.revision, 'the shared brief is readable over MCP');
  ok(!('client' in brief.structuredContent.request), 'the brief does not include client settings');
  const prompt = await mcp.request('prompts/get', { name: 'locus-plan', arguments: { profile: 'codex-compact' } });
  ok(prompt.result.messages[0].content.text.includes(`Call ${P.TOOL_SUBMIT} once.`), 'prompts/get returns the tailored compact prompt');

  // Offline browser: no host process is running while drafts are submitted.
  const good = draftArgs(request, [
    { date: '2030-03-11', start: '09:30', end: '11:00', title: 'Build demo script', kind: 'focus', notes: null, fixed: false },
    { date: '2030-03-12', start: '14:00', end: '15:00', title: 'Team sync', kind: 'meeting', notes: null, fixed: true },
  ]);
  const first = await mcp.call(P.TOOL_SUBMIT, good);
  ok(!first.isError && first.structuredContent.status === 'queued', 'a valid draft is queued while the browser is offline');
  const draftId = first.structuredContent.draft_id;
  const retry = await mcp.call(P.TOOL_SUBMIT, JSON.parse(JSON.stringify(good)));
  eq([retry.structuredContent.status, retry.structuredContent.draft_id], ['duplicate', draftId], 'a duplicate retry returns the same draft id');

  // Browser comes online: pull, redelivery, acknowledgement.
  host = startHost();
  await host.send({ type: 'hello', contract: P.CONTRACT, profileKey: keyA });
  const pulled = await host.send({ type: 'pull' });
  ok(pulled.ok && pulled.drafts.some(entry => entry.draftId === draftId), 'queued drafts are delivered when Locus connects');
  eq(pulled.drafts.find(entry => entry.draftId === draftId).deliveries, 1, 'first delivery is counted');
  await host.close();

  host = startHost();
  await host.send({ type: 'hello', contract: P.CONTRACT, profileKey: keyA });
  const redelivered = await host.send({ type: 'pull' });
  eq(redelivered.drafts.find(entry => entry.draftId === draftId).deliveries, 2, 'an unacknowledged draft is delivered again after reconnection');
  const ack = await host.send({ type: 'ack', draftId, status: 'applied', detail: { added: 1, skipped: 0 } });
  eq([ack.ok, ack.status, ack.unchanged], [true, 'applied', false], 'applying acknowledges the draft');
  const ackAgain = await host.send({ type: 'ack', draftId, status: 'applied' });
  eq([ackAgain.ok, ackAgain.unchanged], [true, true], 'a repeated ack changes nothing');
  const afterAck = await host.send({ type: 'pull' });
  ok(!afterAck.drafts.some(entry => entry.draftId === draftId), 'applied drafts are not delivered again');
  const badAck = await host.send({ type: 'ack', draftId, status: 'deleted' });
  ok(!badAck.ok && badAck.code === 'ack_invalid', 'unknown ack states are refused');
  await host.close();

  const keyed = await mcp.call(P.TOOL_SUBMIT, { ...draftArgs(request, [{ date: '2030-03-13', start: '10:00', end: '11:00', title: 'Rehearse', kind: 'task', notes: null, fixed: false }]), idempotency_key: 'retry-key-1' });
  ok(keyed.structuredContent.status === 'queued', 'a keyed draft is queued');
  const keyedRetry = await mcp.call(P.TOOL_SUBMIT, { ...draftArgs(request, [{ date: '2030-03-13', start: '10:00', end: '11:00', title: 'Rehearse', kind: 'task', notes: null, fixed: false }]), idempotency_key: 'retry-key-1' });
  eq([keyedRetry.structuredContent.status, keyedRetry.structuredContent.draft_id], ['duplicate', keyed.structuredContent.draft_id], 'a keyed retry is a duplicate');
  const keyedConflict = await mcp.call(P.TOOL_SUBMIT, { ...draftArgs(request, [{ date: '2030-03-14', start: '10:00', end: '11:00', title: 'Different', kind: 'task', notes: null, fixed: false }]), idempotency_key: 'retry-key-1' });
  ok(keyedConflict.isError && keyedConflict.structuredContent.code === 'idempotency_conflict', 'reusing a key for different content is refused');
  const invalid = await mcp.call(P.TOOL_SUBMIT, draftArgs(request, [{ date: '2030-02-30', start: '10:00', end: '11:00', title: 'Bad date', kind: 'task', notes: null, fixed: false }]));
  ok(invalid.content[0].text.includes('not a real calendar date') && invalid.content[0].text.includes('Fix them and submit again'), 'invalid dates are explained to the client');
  const wrongPlan = await mcp.call(P.TOOL_SUBMIT, { ...good, plan_id: 'another-plan' });
  ok(!wrongPlan.isError && wrongPlan.structuredContent.request_known === false, 'a draft for an unshared plan is queued with a structural check only');
  const corrected = await mcp.call(P.TOOL_SUBMIT, draftArgs(request, [{ date: '2030-03-14', start: '10:00', end: '11:00', title: 'Fixed date', kind: 'task', notes: null, fixed: false }]));
  ok(corrected.structuredContent.status === 'queued', 'a corrected draft is queued');
  const supersededStatus = await mcp.call(P.TOOL_STATUS, { draft_id: invalid.structuredContent.draft_id });
  eq(supersededStatus.structuredContent.status, 'superseded', 'the corrected draft supersedes the waiting invalid one');
  const otherClient = startMcp(['--pairing', helloA.pairingId]);
  await otherClient.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'other-client' } });
  const sideBySide = await otherClient.call(P.TOOL_SUBMIT, draftArgs(request, [{ date: '2030-03-15', start: '09:00', end: '10:00', title: 'Other client idea', kind: 'task', notes: null, fixed: false }]));
  ok(sideBySide.structuredContent.status === 'queued', 'another client queues its own draft');
  await otherClient.close();
  const correctedStatus = await mcp.call(P.TOOL_STATUS, { draft_id: corrected.structuredContent.draft_id });
  eq(correctedStatus.structuredContent.status, 'queued', 'a draft from another client does not supersede this one');
  host = startHost();
  await host.send({ type: 'hello', contract: P.CONTRACT, profileKey: keyA });
  const waiting = await host.send({ type: 'pull' });
  const waitingIds = waiting.drafts.map(entry => entry.draftId);
  ok(waitingIds.includes(corrected.structuredContent.draft_id) && waitingIds.includes(sideBySide.structuredContent.draft_id), 'both clients\' drafts are delivered');
  ok(!waitingIds.includes(invalid.structuredContent.draft_id), 'superseded drafts are not delivered');
  await host.close();

  const status = await mcp.call(P.TOOL_STATUS, { draft_id: draftId });
  eq([status.structuredContent.status, status.structuredContent.result], ['applied', { added: 1, skipped: 0 }], 'the client can see the draft was applied');
  const resubmitApplied = await mcp.call(P.TOOL_SUBMIT, good);
  eq([resubmitApplied.structuredContent.status, resubmitApplied.structuredContent.state], ['duplicate', 'applied'], 'resubmitting an applied draft does not queue it again');
  await mcp.close();

  // Bounds: the queue stops at its limit instead of growing.
  const store = new PlannerStore({ home });
  const pairing = helloB.pairingId;
  store.publishRequest(pairing, request);
  let full = null;
  for (let i = 0; i <= STORE_LIMITS.pendingPerPairing; i += 1) {
    try {
      store.submitDraft(pairing, draftArgs(request, [{ date: '2030-03-11', start: '09:00', end: '09:30', title: `Bounded ${i}`, kind: 'task', notes: null, fixed: false }]), { source: { transport: `bulk-${i}` } });
    } catch (error) {
      full = error;
    }
  }
  ok(full && full.code === 'queue_full', 'the queue refuses drafts beyond its bound');
  eq(store.counts(pairing).queued, STORE_LIMITS.pendingPerPairing, 'the queue holds exactly its bound');

  // Expiry: an old waiting draft becomes a tombstone.
  const later = new PlannerStore({ home, now: () => Date.now() + STORE_LIMITS.pendingMaxAgeMs + 60000 });
  const expiredPull = later.pull(pairing);
  eq([expiredPull.drafts.length, later.counts(pairing).expired], [0, STORE_LIMITS.pendingPerPairing], 'drafts older than 14 days expire');

  // Concurrency: two processes write at once without corrupting the queue.
  const concurrentRequest = weekRequest('plan-concurrent');
  new PlannerStore({ home }).publishRequest(helloA.pairingId, concurrentRequest);
  const writers = await Promise.all([0, 1, 2, 3].map(async n => {
    const client = startMcp(['--pairing', helloA.pairingId]);
    await client.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: `writer-${n}` } });
    const result = await client.call(P.TOOL_SUBMIT, { ...draftArgs(concurrentRequest, [{ date: '2030-03-15', start: '10:00', end: '11:00', title: `Writer ${n}`, kind: 'task', notes: null, fixed: false }]), idempotency_key: `writer-${n}` });
    await client.close();
    return result.structuredContent.status;
  }));
  ok(writers.every(state => state === 'queued' || state === 'duplicate'), 'concurrent writers all succeed');
  const files = fs.readdirSync(path.join(home, 'pairings', helloA.pairingId, 'queue'));
  ok(files.every(name => name.endsWith('.json')), 'no temp files are left behind');
  for (const name of files) JSON.parse(fs.readFileSync(path.join(home, 'pairings', helloA.pairingId, 'queue', name), 'utf8'));
  checks += 1;

  // Framing: the host refuses an oversized frame instead of reading it.
  host = startHost();
  const oversized = Buffer.alloc(4);
  oversized.writeUInt32LE(64 * 1024 * 1024, 0);
  const errorReply = new Promise(resolve => {
    const reader = new NativeMessageReader(resolve);
    host.child.stdout.on('data', chunk => reader.push(chunk));
  });
  host.child.stdin.write(oversized);
  const frameError = await errorReply;
  ok(!frameError.ok && frameError.code === 'message_too_large', 'oversized frames are rejected');
  await host.close();

  // Opt-in local runner, with a stand-in CLI that echoes a Claude-style wrapper.
  const runnerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locus-runner-'));
  const fakeCli = path.join(runnerDir, 'fake-cli.js');
  fs.writeFileSync(fakeCli, [
    "'use strict';",
    "const fs = require('node:fs');",
    'let input = "";',
    "process.stdin.on('data', chunk => { input += chunk; });",
    "process.stdin.on('end', () => {",
    "  const schema = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));",
    "  if (!schema.properties.blocks) process.exit(3);",
    "  if (process.argv[3] !== '--model' || process.argv[4] !== 'fake-model-1') process.exit(4);",
    "  const planId = /plan_id\": \"([^\"]+)\"/.exec(input)[1];",
    "  const revision = /request_revision\": \"([^\"]+)\"/.exec(input)[1];",
    "  if (!/response schema/.test(input)) process.exit(5);",
    "  const draft = { contract: 'locus.plan/v1', plan_id: planId, request_revision: revision, timezone: 'Europe/London', summary: 'Runner', blocks: [{ date: '2030-03-16', start: '10:00', end: '11:00', title: 'Runner block', kind: 'task', notes: null, fixed: false }], missing: [] };",
    "  process.stdout.write(JSON.stringify({ type: 'result', result: JSON.stringify(draft) }));",
    '});',
  ].join('\n'));
  const sleeper = path.join(runnerDir, 'sleeper.js');
  fs.writeFileSync(sleeper, 'setTimeout(() => {}, 60000);');
  fs.writeFileSync(path.join(home, 'runners.json'), JSON.stringify({
    version: 1,
    runners: [
      { name: 'fake', label: 'Fake CLI', enabled: true, provider: 'gemini', profile: 'gemini-structured', argv: [process.execPath, fakeCli, '{schema_file}'], model_args: ['--model', '{model}'], output: { mode: 'stdout', json_path: 'result' } },
      { name: 'off', label: 'Disabled', enabled: false, argv: [process.execPath, fakeCli] },
      { name: 'slow', label: 'Slow', enabled: true, argv: [process.execPath, sleeper] },
    ],
  }));
  host = startHost();
  const helloRun = await host.send({ type: 'hello', contract: P.CONTRACT, profileKey: keyA });
  eq(helloRun.runners.map(runner => runner.name), ['fake', 'slow'], 'only enabled runners are offered to Locus');
  const runRequest = weekRequest('plan-runner');
  const ran = await host.send({ type: 'run', runner: 'fake', request: runRequest, model: 'fake-model-1' });
  ok(ran.ok && ran.status === 'queued' && /^d[0-9a-f]{16}$/.test(ran.draftId), `the runner draft is validated and queued: ${JSON.stringify(ran)}`);
  const disabled = await host.send({ type: 'run', runner: 'off', request: runRequest });
  ok(!disabled.ok && disabled.code === 'runner_disabled', 'a disabled runner cannot run');
  const unknown = await host.send({ type: 'run', runner: 'nope', request: runRequest });
  ok(!unknown.ok && unknown.code === 'runner_unknown', 'an unknown runner cannot run');
  await host.close();
  let timedOut = null;
  try {
    await runLocalRunner({ home, name: 'slow', request: runRequest, timeoutMs: 400 });
  } catch (error) {
    timedOut = error;
  }
  ok(timedOut && timedOut.code === 'runner_timeout', 'a runner that hangs is stopped');
  ok(!fs.existsSync(path.join(home, 'runs')) || fs.readdirSync(path.join(home, 'runs')).length === 0, 'runner work folders are removed');

  // Setup helper prints exact client configuration without touching the registry.
  const codexConfig = spawnSync(process.execPath, [path.join(root, 'companion', 'locus-planner.js'), 'mcp-config', '--client', 'codex', '--pairing', helloA.pairingId], { env, encoding: 'utf8' });
  ok(codexConfig.status === 0 && codexConfig.stdout.startsWith('[mcp_servers.locus]') && codexConfig.stdout.includes(JSON.stringify(process.execPath)), 'Codex config is TOML with the absolute node path');
  const claudeConfig = JSON.parse(spawnSync(process.execPath, [path.join(root, 'companion', 'locus-planner.js'), 'mcp-config', '--client', 'claude'], { env, encoding: 'utf8' }).stdout);
  ok(claudeConfig.mcpServers.locus.args[0].endsWith(path.join('companion', 'mcp-server.js')), 'Claude/Antigravity config is mcpServers JSON');
  const statusOut = spawnSync(process.execPath, [path.join(root, 'companion', 'locus-planner.js'), 'status'], { env, encoding: 'utf8' });
  ok(statusOut.status === 0 && statusOut.stdout.includes(helloA.pairingId), 'status lists pairings');

  // Install dry run: host files are generated, browser registration is not touched.
  const dryHome = fs.mkdtempSync(path.join(os.tmpdir(), 'locus-planner-dry-'));
  const extId = 'abcdefghijklmnop'.repeat(2);
  const dry = spawnSync(process.execPath, [path.join(root, 'companion', 'locus-planner.js'), 'install', '--extension-id', extId, '--browser', 'all', '--dry-run', '--home', dryHome], { encoding: 'utf8' });
  ok(dry.status === 0 && /Dry run: host files were written; no browser registration was changed\./.test(dry.stdout), `install --dry-run succeeds: ${dry.stderr}`);
  const hostManifest = JSON.parse(fs.readFileSync(path.join(dryHome, 'host', 'com.locus.planner.json'), 'utf8'));
  eq([hostManifest.name, hostManifest.type, hostManifest.allowed_origins], ['com.locus.planner', 'stdio', [`chrome-extension://${extId}/`]], 'the host manifest names one exact extension origin');
  ok(fs.existsSync(hostManifest.path), 'the manifest points at the generated launcher');
  const badId = spawnSync(process.execPath, [path.join(root, 'companion', 'locus-planner.js'), 'install', '--extension-id', 'not-an-id', '--dry-run', '--home', dryHome], { encoding: 'utf8' });
  ok(badId.status !== 0, 'install refuses a malformed extension id');
  if (process.platform === 'win32') {
    // Start the launcher the way Chromium does on Windows and speak the protocol.
    const launched = spawn('cmd.exe', ['/d', '/s', '/c', `"${hostManifest.path}" chrome-extension://${extId}/ --parent-window=0`], { windowsVerbatimArguments: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const reply = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('launcher timeout')), 15000);
      const reader = new NativeMessageReader(message => { clearTimeout(timer); resolve(message); });
      launched.stdout.on('data', chunk => reader.push(chunk));
      launched.stdin.write(encodeMessage({ id: 1, type: 'hello', contract: P.CONTRACT, profileKey: profileKey() }));
    });
    launched.stdin.end();
    ok(reply.ok && /^lp-/.test(reply.pairingId) && fs.existsSync(path.join(dryHome, 'pairings', reply.pairingId)), 'the .cmd launcher runs the host against its own data folder');
  }
  fs.rmSync(dryHome, { recursive: true, force: true });

  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(runnerDir, { recursive: true, force: true });
  console.log(`Planner companion contracts passed: ${checks} checks (pairing, reconnection, offline queue, duplicate submit/delivery, ack, bounds, expiry, concurrency, framing, MCP surface, runner)`);
}

main().catch(error => {
  console.error(error);
  try { fs.rmSync(home, { recursive: true, force: true }); } catch {}
  process.exit(1);
});
