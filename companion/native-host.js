#!/usr/bin/env node
'use strict';

// Native Messaging host for the Locus planner companion. Chromium starts this
// process when the Locus new tab calls chrome.runtime.connectNative() after
// the person grants the optional nativeMessaging permission. It speaks only
// over stdin/stdout to that one extension origin.

const LocusPlan = require('../plan-contract.js');
const { PlannerStore, PlannerError, HOST_NAME } = require('./lib/store.js');
const { encodeMessage, NativeMessageReader } = require('./lib/native-framing.js');
const { describeRunners, runLocalRunner } = require('./lib/runners.js');

const HOST_VERSION = '1.0.0';
const origin = process.argv.slice(2).find(arg => arg.startsWith('chrome-extension://')) || '';
const store = new PlannerStore();
const session = { pairingId: null };
let queue = Promise.resolve();

function send(message) {
  try {
    process.stdout.write(encodeMessage(message));
  } catch (error) {
    process.stdout.write(encodeMessage({ id: message?.id ?? null, ok: false, code: error.code || 'host_error', message: error.message }));
  }
}

function requirePairing() {
  if (!session.pairingId) throw new PlannerError('not_paired', 'Say hello with this browser profile before using the queue.');
  return session.pairingId;
}

async function dispatch(message) {
  switch (message?.type) {
    case 'hello': {
      if (message.contract !== LocusPlan.CONTRACT) {
        throw new PlannerError('contract_unsupported', `This companion speaks ${LocusPlan.CONTRACT}.`);
      }
      const { pairing, created } = store.pairProfile({ origin, profileKey: message.profileKey, label: message.label || '' });
      session.pairingId = pairing.id;
      return {
        type: 'hello',
        host: HOST_NAME,
        hostVersion: HOST_VERSION,
        contract: LocusPlan.CONTRACT,
        pairingId: pairing.id,
        created,
        counts: store.counts(pairing.id),
        runners: describeRunners(store.home),
      };
    }
    case 'publish_request': {
      const pairingId = requirePairing();
      return { type: 'published', ...store.publishRequest(pairingId, message.request) };
    }
    case 'pull': {
      const pairingId = requirePairing();
      const result = store.pull(pairingId, { max: Number(message.max) || undefined });
      return { type: 'drafts', ...result, counts: store.counts(pairingId) };
    }
    case 'ack': {
      const pairingId = requirePairing();
      return { type: 'acked', draftId: message.draftId, ...store.ack(pairingId, message.draftId, message.status, message.detail || {}) };
    }
    case 'status': {
      const pairingId = requirePairing();
      return { type: 'status', counts: store.counts(pairingId), runners: describeRunners(store.home) };
    }
    case 'run': {
      const pairingId = requirePairing();
      const run = await runLocalRunner({
        home: store.home,
        name: String(message.runner || ''),
        request: message.request,
        profile: message.profile,
        model: message.model,
      });
      store.publishRequest(pairingId, message.request);
      const submitted = store.submitDraft(pairingId, run.text, {
        source: { transport: 'runner', client: String(message.runner || ''), model: run.model },
      });
      return {
        type: 'ran',
        status: submitted.status,
        draftId: submitted.draftId,
        summary: LocusPlan.summarizeValidation(submitted.validation),
        durationMs: run.durationMs,
        counts: store.counts(pairingId),
      };
    }
    default:
      throw new PlannerError('unknown_type', `Unknown message type "${String(message?.type).slice(0, 40)}".`);
  }
}

const reader = new NativeMessageReader(message => {
  queue = queue.then(async () => {
    const id = message?.id ?? null;
    try {
      const result = await dispatch(message);
      send({ id, ok: true, ...result });
    } catch (error) {
      send({
        id,
        ok: false,
        code: error.code || 'host_error',
        message: error.message,
        details: error.details?.stderr ? { stderr: String(error.details.stderr).slice(-400) } : undefined,
      });
    }
  });
}, {
  onError: error => send({ id: null, ok: false, code: error.code || 'protocol_error', message: error.message }),
});

process.stdin.on('data', chunk => reader.push(chunk));
process.stdin.on('end', () => { queue.finally(() => process.exit(0)); });
process.on('uncaughtException', error => {
  process.stderr.write(`locus-planner host: ${error.stack || error.message}\n`);
  process.exit(1);
});
