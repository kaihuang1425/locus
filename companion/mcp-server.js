#!/usr/bin/env node
'use strict';

// Local stdio MCP server for the Locus planner. An MCP client (Claude Desktop
// or Claude Code, Codex desktop or CLI, Antigravity) starts it as a child
// process. It reads the plan brief the person shared from Locus and queues
// drafts for Locus to preview; it never writes the Calendar itself.

const readline = require('node:readline');
const LocusPlan = require('../plan-contract.js');
const { PlannerStore, PlannerError } = require('./lib/store.js');

const SERVER_VERSION = '1.0.0';
const SUPPORTED_PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

function parseArgs(argv) {
  const out = { pairing: process.env.LOCUS_PAIRING || null, client: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--pairing') out.pairing = argv[++i] || null;
    else if (argv[i] === '--client') out.client = String(argv[++i] || '').slice(0, 40);
    else if (argv[i] === '--home') process.env.LOCUS_PLANNER_HOME = argv[++i];
  }
  return out;
}

const options = parseArgs(process.argv.slice(2));
const store = new PlannerStore();
let clientInfo = { name: options.client, version: '' };

const INSTRUCTIONS = [
  'Locus is a local planner in the person\'s browser.',
  `Use ${LocusPlan.TOOL_REQUEST} to read the plan brief they shared, draft a ${LocusPlan.CONTRACT} plan, then call ${LocusPlan.TOOL_SUBMIT}.`,
  'Submitting only queues the draft: the person previews it in Locus and decides whether to apply it to their Calendar.',
  'Use real YYYY-MM-DD dates, 24-hour HH:MM times in the brief\'s time zone, keep fixed commitments unchanged, and list missing facts instead of guessing.',
].join(' ');

const TOOLS = [
  {
    name: LocusPlan.TOOL_REQUEST,
    title: 'Read the Locus plan brief',
    description: 'Read the planning brief the person shared from Locus: horizon, dates, time zone, goals, fixed commitments, working hours, and busy times (times only). Returns the brief and a schema reminder. It contains only inputs the person chose to share.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        plan_id: { type: 'string', description: 'Optional. A specific plan id; the most recently shared brief is used when omitted.' },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: LocusPlan.TOOL_SUBMIT,
    title: 'Submit a plan draft to Locus',
    description: `Queue a ${LocusPlan.CONTRACT} draft for the person to preview in Locus. Nothing reaches the Calendar until they choose Apply in Locus. Locus checks dates, times, time zone, fixed commitments, and conflicts; the result lists any problems to fix. Retrying the same draft is safe and returns the same draft_id.`,
    inputSchema: LocusPlan.toolInputSchema(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: LocusPlan.TOOL_STATUS,
    title: 'Check a Locus draft',
    description: 'Report whether a submitted draft is still queued, was delivered to Locus, or was applied, dismissed, superseded, or expired.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: { draft_id: { type: 'string' } },
      required: ['draft_id'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const PROMPTS = [
  {
    name: 'locus-plan',
    title: 'Plan with Locus',
    description: 'A tailored planning prompt for the most recently shared Locus plan brief.',
    arguments: [
      { name: 'profile', description: `Prompt profile: ${Object.keys(LocusPlan.PROFILES).join(', ')}.`, required: false },
      { name: 'plan_id', description: 'Optional plan id.', required: false },
    ],
  },
];

function toolResult(text, structuredContent, isError = false) {
  return { content: [{ type: 'text', text }], structuredContent, isError };
}

function loadRequest(pairingId, planId) {
  const stored = store.getRequest(pairingId, planId || null);
  if (!stored) return null;
  const rebuilt = LocusPlan.requestFromWire(stored.request);
  return rebuilt.ok ? { request: rebuilt.request, publishedAt: stored.publishedAt } : null;
}

function callTool(name, args = {}) {
  let pairingId;
  try {
    pairingId = store.resolvePairing(options.pairing);
  } catch (error) {
    return toolResult(error.message, { status: 'not_paired', code: error.code }, true);
  }

  if (name === LocusPlan.TOOL_REQUEST) {
    const loaded = loadRequest(pairingId, typeof args.plan_id === 'string' ? args.plan_id : null);
    if (!loaded) {
      return toolResult('No plan brief has been shared yet. In Locus open Calendar, choose Plan with AI, fill in the plan, and choose Share with companion.', { status: 'no_request' }, true);
    }
    const { client: _client, ...brief } = loaded.request;
    const text = [
      `Plan "${brief.title}" (${brief.horizon}) ${brief.range.start} to ${brief.range.end}, ${brief.timezone}. Today is ${brief.today}.`,
      `Submit with ${LocusPlan.TOOL_SUBMIT} using contract "${LocusPlan.CONTRACT}", plan_id "${brief.plan_id}", request_revision "${brief.revision}".`,
      JSON.stringify(brief),
    ].join('\n');
    return toolResult(text, { status: 'ok', request: brief, publishedAt: loaded.publishedAt });
  }

  if (name === LocusPlan.TOOL_SUBMIT) {
    const { idempotency_key: idempotencyKey, ...draft } = args || {};
    if (draft.contract == null) draft.contract = LocusPlan.CONTRACT;
    let submitted;
    try {
      submitted = store.submitDraft(pairingId, draft, {
        idempotencyKey,
        // The --client label from the client's own config wins: some clients
        // report one generic clientInfo name for every configuration.
        source: { transport: 'mcp', client: options.client || clientInfo.name || '' },
      });
    } catch (error) {
      return toolResult(error.message, { status: 'error', code: error.code || 'error' }, true);
    }
    const summary = LocusPlan.summarizeValidation(submitted.validation);
    if (submitted.status === 'rejected') {
      return toolResult(`Locus rejected this draft. ${summary}`, { status: 'rejected', issues: submitted.validation.issues }, true);
    }
    const errors = submitted.validation.blocks.filter(block => block.status === 'invalid').length;
    const lines = [
      submitted.status === 'duplicate'
        ? `Already received as ${submitted.draftId} (state: ${submitted.state}). No second copy was queued.`
        : `Queued as ${submitted.draftId}. Locus will show it the next time the person opens Calendar, Plan with AI, and checks for drafts; nothing is on the Calendar until they apply it.`,
      summary,
    ];
    if (!submitted.requestKnown) lines.push('Locus has no shared brief for this plan_id, so it checked dates and times only. It re-checks everything against the plan when the person opens it.');
    if (errors) lines.push(`${errors} block(s) cannot be applied as written. Fix them and submit again; the corrected draft replaces this one while it is still waiting.`);
    return toolResult(lines.join('\n'), {
      status: submitted.status,
      draft_id: submitted.draftId,
      state: submitted.state,
      counts: submitted.validation.counts,
      request_known: submitted.requestKnown,
    });
  }

  if (name === LocusPlan.TOOL_STATUS) {
    const status = store.draftStatus(pairingId, String(args.draft_id || ''));
    if (!status) return toolResult(`No draft "${String(args.draft_id || '').slice(0, 80)}" in this Locus queue.`, { status: 'unknown' }, true);
    return toolResult(`Draft ${status.draftId}: ${status.status}${status.deliveries ? `, delivered ${status.deliveries} time(s)` : ''}.`, status);
  }

  throw Object.assign(new Error(`Unknown tool: ${name}`), { rpcCode: -32602 });
}

function getPrompt(name, args = {}) {
  if (name !== 'locus-plan') throw Object.assign(new Error(`Unknown prompt: ${name}`), { rpcCode: -32602 });
  const pairingId = store.resolvePairing(options.pairing);
  const loaded = loadRequest(pairingId, args.plan_id || null);
  if (!loaded) throw Object.assign(new Error('No plan brief has been shared from Locus yet.'), { rpcCode: -32602 });
  const profile = LocusPlan.PROFILES[args.profile] ? args.profile : loaded.request.client.profile;
  return {
    description: `Locus plan "${loaded.request.title}" (${profile})`,
    messages: [{ role: 'user', content: { type: 'text', text: LocusPlan.buildPlanPrompt(loaded.request, profile, { delivery: 'mcp' }) } }],
  };
}

function handle(message) {
  const { id, method, params } = message || {};
  const isRequest = id !== undefined && id !== null;
  try {
    switch (method) {
      case 'initialize': {
        clientInfo = { name: String(params?.clientInfo?.name || options.client || '').slice(0, 80), version: String(params?.clientInfo?.version || '').slice(0, 40) };
        const requested = params?.protocolVersion;
        const protocolVersion = SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0];
        return {
          protocolVersion,
          capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
          serverInfo: { name: 'locus-planner', title: 'Locus planner', version: SERVER_VERSION },
          instructions: INSTRUCTIONS,
        };
      }
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: TOOLS };
      case 'tools/call':
        return callTool(params?.name, params?.arguments || {});
      case 'prompts/list':
        return { prompts: PROMPTS };
      case 'prompts/get':
        return getPrompt(params?.name, params?.arguments || {});
      default:
        if (!isRequest || String(method || '').startsWith('notifications/')) return undefined;
        throw Object.assign(new Error(`Method not found: ${method}`), { rpcCode: -32601 });
    }
  } catch (error) {
    if (!isRequest) return undefined;
    throw error;
  }
}

function respond(message) {
  const isRequest = message && message.id !== undefined && message.id !== null;
  try {
    const result = handle(message);
    if (isRequest) return { jsonrpc: '2.0', id: message.id, result: result ?? {} };
  } catch (error) {
    if (isRequest) {
      const code = error.rpcCode || (error instanceof PlannerError ? -32000 : -32603);
      return { jsonrpc: '2.0', id: message.id, error: { code, message: error.message } };
    }
  }
  return null;
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', line => {
  if (!line.trim()) return;
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`);
    return;
  }
  const batch = Array.isArray(parsed) ? parsed : [parsed];
  const replies = batch.map(respond).filter(Boolean);
  if (!replies.length) return;
  process.stdout.write(`${JSON.stringify(Array.isArray(parsed) ? replies : replies[0])}\n`);
});
rl.on('close', () => process.exit(0));
