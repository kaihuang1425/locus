'use strict';

// Local draft queue shared by the MCP server and the Native Messaging host.
// Files live under one per-user data directory; nothing listens on a port and
// nothing here touches Chrome storage. Locus pulls drafts over Native
// Messaging and stays the only writer of its own state.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const LocusPlan = require('../../plan-contract.js');

const HOST_NAME = 'com.locus.planner';
const STORE_VERSION = 1;
const STORE_LIMITS = Object.freeze({
  pairings: 8,
  pendingPerPairing: 25,
  tombstonesPerPairing: 200,
  requestsPerPairing: 20,
  requestBytes: 128 * 1024,
  pullBytes: 700 * 1024,
  pullCount: 10,
  pendingMaxAgeMs: 14 * 24 * 60 * 60 * 1000,
  lockWaitMs: 5000,
  lockStaleMs: 15000,
});
const PENDING = new Set(['queued', 'delivered']);
const FINAL = new Set(['applied', 'rejected', 'dismissed', 'expired', 'superseded']);
const ACK_STATES = new Set(['applied', 'rejected', 'dismissed']);
const PAIRING_RE = /^lp-[a-z2-7]{4}-[a-z2-7]{4}$/;
const DRAFT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;

class PlannerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function defaultHome(env = process.env) {
  if (env.LOCUS_PLANNER_HOME) return path.resolve(env.LOCUS_PLANNER_HOME);
  if (process.platform === 'win32') {
    return path.join(env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Locus', 'Planner');
  }
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Locus', 'Planner');
  return path.join(env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'locus-planner');
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';
function randomPairingId() {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) out += BASE32[bytes[i] % 32];
  return `lp-${out.slice(0, 4)}-${out.slice(4)}`;
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

class PlannerStore {
  constructor({ home = defaultHome(), now = () => Date.now() } = {}) {
    this.home = home;
    this.now = now;
  }

  ensure() {
    fs.mkdirSync(path.join(this.home, 'pairings'), { recursive: true });
  }

  pairingsFile() {
    return path.join(this.home, 'pairings.json');
  }

  pairingDir(pairingId) {
    if (!PAIRING_RE.test(String(pairingId))) throw new PlannerError('pairing_invalid', `"${pairingId}" is not a Locus pairing id.`);
    return path.join(this.home, 'pairings', pairingId);
  }

  readJson(file, fallback) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return fallback;
      throw new PlannerError('store_unreadable', `Could not read ${path.basename(file)}: ${error.message}`);
    }
  }

  writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        fs.renameSync(temp, file);
        return;
      } catch (error) {
        lastError = error;
        if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) break;
        sleepSync(15 * (attempt + 1));
      }
    }
    try { fs.unlinkSync(temp); } catch {}
    throw new PlannerError('store_write_failed', `Could not write ${path.basename(file)}: ${lastError?.message}`);
  }

  // A directory lock serializes the two processes (MCP server, native host)
  // that may update the same pairing at once.
  withLock(fn) {
    this.ensure();
    const lock = path.join(this.home, '.lock');
    const started = Date.now();
    for (;;) {
      try {
        fs.mkdirSync(lock);
        break;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        try {
          const age = Date.now() - fs.statSync(lock).mtimeMs;
          if (age > STORE_LIMITS.lockStaleMs) { fs.rmSync(lock, { recursive: true, force: true }); continue; }
        } catch {}
        if (Date.now() - started > STORE_LIMITS.lockWaitMs) throw new PlannerError('store_busy', 'The Locus planner queue is busy. Try again.');
        sleepSync(20);
      }
    }
    try {
      return fn();
    } finally {
      try { fs.rmdirSync(lock); } catch {}
    }
  }

  loadPairings() {
    const data = this.readJson(this.pairingsFile(), { version: STORE_VERSION, pairings: [] });
    return Array.isArray(data?.pairings) ? data.pairings.filter(entry => PAIRING_RE.test(entry?.id)) : [];
  }

  listPairings() {
    return this.loadPairings().map(entry => ({
      id: entry.id,
      label: entry.label || '',
      origin: entry.origin,
      createdAt: entry.createdAt,
      lastSeenAt: entry.lastSeenAt || null,
    }));
  }

  // One pairing per browser profile: the extension keeps a random profile key
  // in that profile's own storage, and the host stores only its hash.
  pairProfile({ origin, profileKey, label = '' }) {
    if (typeof origin !== 'string' || !/^chrome-extension:\/\/[a-p]{32}\/?$/.test(origin)) {
      throw new PlannerError('origin_invalid', 'Only the Locus extension can pair with this companion.');
    }
    if (typeof profileKey !== 'string' || !/^[a-f0-9]{64}$/.test(profileKey)) {
      throw new PlannerError('profile_key_invalid', 'The browser profile key is missing or malformed.');
    }
    const normalizedOrigin = origin.endsWith('/') ? origin : `${origin}/`;
    const keyHash = sha256(profileKey);
    return this.withLock(() => {
      const pairings = this.loadPairings();
      const now = this.now();
      let pairing = pairings.find(entry => entry.keyHash === keyHash && entry.origin === normalizedOrigin);
      let created = false;
      if (!pairing) {
        if (pairings.length >= STORE_LIMITS.pairings) {
          throw new PlannerError('pairing_limit', `This companion already has ${STORE_LIMITS.pairings} paired browser profiles. Remove one with "locus-planner unpair".`);
        }
        let id = randomPairingId();
        while (pairings.some(entry => entry.id === id)) id = randomPairingId();
        pairing = { id, origin: normalizedOrigin, keyHash, label: String(label).slice(0, 60), createdAt: now };
        pairings.push(pairing);
        created = true;
      }
      pairing.lastSeenAt = now;
      if (label) pairing.label = String(label).slice(0, 60);
      this.writeJsonAtomic(this.pairingsFile(), { version: STORE_VERSION, pairings });
      fs.mkdirSync(path.join(this.pairingDir(pairing.id), 'queue'), { recursive: true });
      fs.mkdirSync(path.join(this.pairingDir(pairing.id), 'requests'), { recursive: true });
      return { pairing: { id: pairing.id, label: pairing.label, origin: pairing.origin }, created };
    });
  }

  unpair(pairingId) {
    return this.withLock(() => {
      const pairings = this.loadPairings();
      const next = pairings.filter(entry => entry.id !== pairingId);
      if (next.length === pairings.length) return false;
      this.writeJsonAtomic(this.pairingsFile(), { version: STORE_VERSION, pairings: next });
      fs.rmSync(this.pairingDir(pairingId), { recursive: true, force: true });
      return true;
    });
  }

  resolvePairing(requested) {
    const pairings = this.loadPairings();
    if (requested) {
      const match = pairings.find(entry => entry.id === requested);
      if (!match) throw new PlannerError('pairing_unknown', `No Locus browser profile is paired as "${requested}". Open Locus, Calendar, Plan with AI, and choose Connect companion to see the pairing id.`);
      return match.id;
    }
    if (pairings.length === 1) return pairings[0].id;
    if (!pairings.length) throw new PlannerError('pairing_missing', 'No Locus browser profile is paired yet. In Locus open Calendar, choose Plan with AI, then Connect companion.');
    throw new PlannerError('pairing_required', `Several Locus profiles are paired (${pairings.map(entry => entry.id).join(', ')}). Start the MCP server with --pairing <id>.`);
  }

  // ── Plan briefs shared from Locus ─────────────────────────────────
  publishRequest(pairingId, wireRequest) {
    const rebuilt = LocusPlan.requestFromWire(wireRequest, { now: this.now() });
    if (!rebuilt.ok) {
      throw new PlannerError('request_invalid', rebuilt.issues.map(LocusPlan.describeIssue).join(' '));
    }
    const request = rebuilt.request;
    const text = JSON.stringify(request);
    if (Buffer.byteLength(text) > STORE_LIMITS.requestBytes) throw new PlannerError('request_too_large', 'The plan brief is too large to share.');
    const dir = path.join(this.pairingDir(pairingId), 'requests');
    return this.withLock(() => {
      this.writeJsonAtomic(path.join(dir, `${request.plan_id}.json`), { publishedAt: this.now(), request });
      const files = this.listJson(dir)
        .map(file => ({ file, data: this.readJson(file, null) }))
        .filter(entry => entry.data)
        .sort((a, b) => b.data.publishedAt - a.data.publishedAt);
      for (const stale of files.slice(STORE_LIMITS.requestsPerPairing)) {
        try { fs.unlinkSync(stale.file); } catch {}
      }
      return { planId: request.plan_id, revision: request.revision };
    });
  }

  getRequest(pairingId, planId) {
    const dir = path.join(this.pairingDir(pairingId), 'requests');
    if (planId) {
      if (!DRAFT_ID_RE.test(planId)) return null;
      const data = this.readJson(path.join(dir, `${planId}.json`), null);
      return data?.request ? data : null;
    }
    const latest = this.listJson(dir)
      .map(file => this.readJson(file, null))
      .filter(data => data?.request)
      .sort((a, b) => b.publishedAt - a.publishedAt)[0];
    return latest || null;
  }

  listJson(dir) {
    try {
      return fs.readdirSync(dir).filter(name => name.endsWith('.json')).map(name => path.join(dir, name));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  // ── Draft queue ───────────────────────────────────────────────────
  queueDir(pairingId) {
    return path.join(this.pairingDir(pairingId), 'queue');
  }

  loadEntries(pairingId) {
    return this.listJson(this.queueDir(pairingId))
      .map(file => ({ file, entry: this.readJson(file, null) }))
      .filter(item => item.entry && DRAFT_ID_RE.test(item.entry.draftId));
  }

  prune(pairingId) {
    const now = this.now();
    const items = this.loadEntries(pairingId);
    for (const item of items) {
      if (PENDING.has(item.entry.status) && now - item.entry.receivedAt > STORE_LIMITS.pendingMaxAgeMs) {
        item.entry.status = 'expired';
        item.entry.finalAt = now;
        delete item.entry.draft;
        this.writeJsonAtomic(item.file, item.entry);
      }
    }
    const tombstones = items
      .filter(item => FINAL.has(item.entry.status))
      .sort((a, b) => (b.entry.finalAt || 0) - (a.entry.finalAt || 0));
    for (const item of tombstones.slice(STORE_LIMITS.tombstonesPerPairing)) {
      try { fs.unlinkSync(item.file); } catch {}
    }
  }

  submitDraft(pairingId, rawDraft, { idempotencyKey = null, source = {} } = {}) {
    const declaredPlan = typeof rawDraft?.plan_id === 'string' ? rawDraft.plan_id : null;
    const stored = this.getRequest(pairingId, declaredPlan);
    let request = null;
    if (stored) {
      const rebuilt = LocusPlan.requestFromWire(stored.request, { now: this.now() });
      if (rebuilt.ok) request = rebuilt.request;
    }
    const validation = LocusPlan.validatePlanDraft(rawDraft, request, { now: this.now() });
    if (!validation.ok) {
      return { status: 'rejected', draftId: null, validation, requestKnown: !!request };
    }
    const key = typeof idempotencyKey === 'string' && idempotencyKey.trim() ? idempotencyKey.trim().slice(0, 200) : null;
    const draftId = key ? `d${LocusPlan.hash64(`key|${validation.planId || ''}|${key}`)}` : validation.draftId;
    const draftObject = typeof rawDraft === 'string' ? LocusPlan.extractDraftJson(rawDraft).value : rawDraft;
    return this.withLock(() => {
      this.prune(pairingId);
      const items = this.loadEntries(pairingId);
      const sameId = items.find(item => item.entry.draftId === draftId);
      if (sameId) {
        if (sameId.entry.fingerprint !== validation.fingerprint) {
          throw new PlannerError('idempotency_conflict', 'That idempotency_key was already used for a different draft. Use a new key for a changed draft.');
        }
        return { status: 'duplicate', draftId, state: sameId.entry.status, validation, requestKnown: !!request };
      }
      const sameContent = items.find(item => item.entry.fingerprint === validation.fingerprint
        && item.entry.planId === validation.planId);
      if (sameContent) {
        return { status: 'duplicate', draftId: sameContent.entry.draftId, state: sameContent.entry.status, validation, requestKnown: !!request };
      }
      const pending = items.filter(item => PENDING.has(item.entry.status));
      // A corrected resubmission from the same client replaces an older copy
      // Locus has not received yet. Drafts from other clients stay side by side.
      for (const item of pending) {
        if (item.entry.status === 'queued' && item.entry.planId === validation.planId
            && (item.entry.source?.transport || '') === String(source.transport || 'mcp').slice(0, 20)
            && (item.entry.source?.client || '') === String(source.client || '').slice(0, 80)) {
          item.entry.status = 'superseded';
          item.entry.finalAt = this.now();
          item.entry.supersededBy = draftId;
          delete item.entry.draft;
          this.writeJsonAtomic(item.file, item.entry);
        }
      }
      const stillPending = this.loadEntries(pairingId).filter(item => PENDING.has(item.entry.status));
      if (stillPending.length >= STORE_LIMITS.pendingPerPairing) {
        throw new PlannerError('queue_full', `Locus already has ${STORE_LIMITS.pendingPerPairing} drafts waiting. Open Locus and apply or dismiss some first.`);
      }
      const entry = {
        version: STORE_VERSION,
        draftId,
        fingerprint: validation.fingerprint,
        planId: validation.planId,
        requestRevision: validation.requestRevision,
        receivedAt: this.now(),
        source: {
          transport: String(source.transport || 'mcp').slice(0, 20),
          client: String(source.client || '').slice(0, 80),
          model: String(source.model || '').slice(0, 80),
        },
        status: 'queued',
        deliveries: 0,
        counts: validation.counts,
        draft: draftObject,
      };
      this.writeJsonAtomic(path.join(this.queueDir(pairingId), `${draftId}.json`), entry);
      return { status: 'queued', draftId, state: 'queued', validation, requestKnown: !!request };
    });
  }

  // Delivery is at-least-once: a pulled draft stays "delivered" until Locus
  // acknowledges it, so a closed tab or lost port simply redelivers.
  pull(pairingId, { max = STORE_LIMITS.pullCount, maxBytes = STORE_LIMITS.pullBytes } = {}) {
    return this.withLock(() => {
      this.prune(pairingId);
      const items = this.loadEntries(pairingId)
        .filter(item => PENDING.has(item.entry.status) && item.entry.draft)
        .sort((a, b) => a.entry.receivedAt - b.entry.receivedAt);
      const out = [];
      let bytes = 0;
      for (const item of items) {
        if (out.length >= Math.max(1, Math.min(max, STORE_LIMITS.pullCount))) break;
        const size = Buffer.byteLength(JSON.stringify(item.entry.draft));
        if (out.length && bytes + size > maxBytes) break;
        bytes += size;
        item.entry.status = 'delivered';
        item.entry.deliveries = (item.entry.deliveries || 0) + 1;
        item.entry.deliveredAt = this.now();
        this.writeJsonAtomic(item.file, item.entry);
        out.push({
          draftId: item.entry.draftId,
          fingerprint: item.entry.fingerprint,
          planId: item.entry.planId,
          receivedAt: item.entry.receivedAt,
          deliveries: item.entry.deliveries,
          source: item.entry.source,
          draft: item.entry.draft,
        });
      }
      const remaining = items.length - out.length;
      return { drafts: out, remaining: Math.max(0, remaining) };
    });
  }

  ack(pairingId, draftId, status, detail = {}) {
    if (!DRAFT_ID_RE.test(String(draftId))) throw new PlannerError('draft_invalid', 'That draft id is not valid.');
    if (!ACK_STATES.has(status)) throw new PlannerError('ack_invalid', 'Acknowledge a draft as applied, rejected, or dismissed.');
    return this.withLock(() => {
      const file = path.join(this.queueDir(pairingId), `${draftId}.json`);
      const entry = this.readJson(file, null);
      if (!entry) return { found: false, status: null };
      if (FINAL.has(entry.status)) return { found: true, status: entry.status, unchanged: true };
      entry.status = status;
      entry.finalAt = this.now();
      entry.result = {
        added: Number.isInteger(detail.added) ? detail.added : null,
        skipped: Number.isInteger(detail.skipped) ? detail.skipped : null,
      };
      delete entry.draft;
      this.writeJsonAtomic(file, entry);
      return { found: true, status, unchanged: false };
    });
  }

  draftStatus(pairingId, draftId) {
    if (!DRAFT_ID_RE.test(String(draftId))) return null;
    const entry = this.readJson(path.join(this.queueDir(pairingId), `${draftId}.json`), null);
    if (!entry) return null;
    return {
      draftId: entry.draftId,
      planId: entry.planId,
      status: entry.status,
      receivedAt: entry.receivedAt,
      deliveredAt: entry.deliveredAt || null,
      deliveries: entry.deliveries || 0,
      finalAt: entry.finalAt || null,
      result: entry.result || null,
      supersededBy: entry.supersededBy || null,
    };
  }

  counts(pairingId) {
    const counts = { queued: 0, delivered: 0, applied: 0, rejected: 0, dismissed: 0, expired: 0, superseded: 0 };
    for (const item of this.loadEntries(pairingId)) {
      if (Object.hasOwn(counts, item.entry.status)) counts[item.entry.status] += 1;
    }
    return counts;
  }
}

module.exports = {
  HOST_NAME,
  STORE_LIMITS,
  PlannerError,
  PlannerStore,
  defaultHome,
  sha256,
};
