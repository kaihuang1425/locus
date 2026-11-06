'use strict';

// Opt-in local runners: a person may list CLI commands they already use (for
// example a signed-in Claude Code, Codex, or Antigravity CLI) in runners.json.
// Locus can then ask the companion to generate a draft from the selected plan
// inputs only. Nothing here stores provider keys; each CLI uses its own login.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const LocusPlan = require('../../plan-contract.js');
const { PlannerError } = require('./store.js');

const RUNNER_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const MAX_STDOUT = 2 * 1024 * 1024;
const MAX_STDERR = 64 * 1024;
const PLACEHOLDERS = new Set(['{schema_file}', '{schema_json}', '{output_file}', '{prompt}', '{model}']);

function runnersFile(home) {
  return path.join(home, 'runners.json');
}

function loadRunners(home) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(runnersFile(home), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new PlannerError('runners_unreadable', `runners.json could not be read: ${error.message}`);
  }
  const list = Array.isArray(data?.runners) ? data.runners : [];
  return list.filter(runner => runner && RUNNER_NAME_RE.test(runner.name)
    && Array.isArray(runner.argv) && runner.argv.length
    && runner.argv.every(part => typeof part === 'string'));
}

function describeRunners(home) {
  return loadRunners(home)
    .filter(runner => runner.enabled === true)
    .map(runner => ({
      name: runner.name,
      label: String(runner.label || runner.name).slice(0, 60),
      provider: LocusPlan.PROVIDERS[runner.provider] ? runner.provider : null,
      profile: LocusPlan.PROFILES[runner.profile] ? runner.profile : null,
    }));
}

function expandArgs(runner, values) {
  const args = [];
  for (const part of runner.argv.slice(1)) {
    let out = part;
    for (const token of PLACEHOLDERS) {
      if (out.includes(token)) out = out.split(token).join(values[token] ?? '');
    }
    args.push(out);
  }
  if (values['{model}'] && Array.isArray(runner.model_args)) {
    for (const part of runner.model_args) args.push(String(part).split('{model}').join(values['{model}']));
  }
  return args;
}

function killTree(child) {
  if (!child || child.exitCode != null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    try { child.kill('SIGKILL'); } catch {}
  }
}

function readPath(value, dotted) {
  if (!dotted) return value;
  return String(dotted).split('.').reduce((current, key) => (current && typeof current === 'object' ? current[key] : undefined), value);
}

async function runLocalRunner({ home, name, request, profile, model = '', timeoutMs }) {
  const runner = loadRunners(home).find(entry => entry.name === name);
  if (!runner) throw new PlannerError('runner_unknown', `No runner named "${name}" is configured in runners.json.`);
  if (runner.enabled !== true) throw new PlannerError('runner_disabled', `Runner "${name}" is turned off in runners.json.`);
  const rebuilt = LocusPlan.requestFromWire(request);
  if (!rebuilt.ok) throw new PlannerError('request_invalid', rebuilt.issues.map(LocusPlan.describeIssue).join(' '));
  const planRequest = rebuilt.request;
  const chosenProfile = LocusPlan.PROFILES[profile] ? profile
    : LocusPlan.PROFILES[runner.profile] ? runner.profile : planRequest.client.profile;
  const structured = runner.argv.some(part => part.includes('{schema_file}') || part.includes('{schema_json}'));
  const prompt = LocusPlan.buildPlanPrompt(planRequest, chosenProfile, { delivery: structured ? 'structured' : 'paste' });

  // Each run gets an empty working directory, so no project settings, hooks,
  // or files are in reach of the CLI.
  const runDir = path.join(home, 'runs', `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(runDir, { recursive: true });
  const schemaFile = path.join(runDir, 'locus-plan.schema.json');
  const outputFile = path.join(runDir, 'last-message.txt');
  const schema = LocusPlan.draftJsonSchema({ strict: true });
  delete schema.$schema;
  fs.writeFileSync(schemaFile, JSON.stringify(schema), 'utf8');
  const cleanModel = String(model || runner.model || '').replace(/[^A-Za-z0-9._:/-]/g, '').slice(0, 80);
  const values = {
    '{schema_file}': schemaFile,
    '{schema_json}': JSON.stringify(schema),
    '{output_file}': outputFile,
    '{prompt}': prompt,
    '{model}': cleanModel,
  };
  const promptMode = runner.prompt === 'arg' ? 'arg' : 'stdin';
  const args = expandArgs(runner, values);
  const limit = Number.isFinite(timeoutMs) ? timeoutMs : Math.min(600, Math.max(30, Number(runner.timeout_sec) || 240)) * 1000;

  const started = Date.now();
  const outcome = await new Promise(resolve => {
    let stdout = Buffer.alloc(0);
    let stderr = '';
    let settled = false;
    let child;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    try {
      child = spawn(runner.argv[0], args, { cwd: runDir, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      finish({ code: null, error, stdout: '', stderr: '' });
      return;
    }
    const timer = setTimeout(() => {
      killTree(child);
      finish({ code: null, timedOut: true, stdout: stdout.toString('utf8'), stderr });
    }, limit);
    child.stdout.on('data', chunk => {
      if (stdout.length < MAX_STDOUT) stdout = Buffer.concat([stdout, chunk]).subarray(0, MAX_STDOUT);
    });
    child.stderr.on('data', chunk => {
      if (stderr.length < MAX_STDERR) stderr += chunk.toString('utf8');
    });
    child.on('error', error => finish({ code: null, error, stdout: stdout.toString('utf8'), stderr }));
    child.on('close', code => finish({ code, stdout: stdout.toString('utf8'), stderr }));
    child.stdin.on('error', () => {});
    if (promptMode === 'stdin') child.stdin.end(prompt, 'utf8');
    else child.stdin.end();
  });

  let text = '';
  try {
    if (outcome.error) throw new PlannerError('runner_failed', `Runner "${name}" could not start: ${outcome.error.message}`);
    if (outcome.timedOut) throw new PlannerError('runner_timeout', `Runner "${name}" did not finish within ${Math.round(limit / 1000)} seconds.`);
    if (outcome.code !== 0) {
      throw new PlannerError('runner_failed', `Runner "${name}" exited with code ${outcome.code}.`, { stderr: outcome.stderr.slice(-600) });
    }
    const mode = runner.output?.mode === 'file' ? 'file' : 'stdout';
    text = mode === 'file' ? fs.readFileSync(outputFile, 'utf8') : outcome.stdout;
    if (runner.output?.json_path) {
      try {
        const parsed = JSON.parse(text);
        const picked = readPath(parsed, runner.output.json_path);
        text = typeof picked === 'string' ? picked : JSON.stringify(picked ?? parsed);
      } catch {}
    }
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
  return {
    text,
    profile: chosenProfile,
    model: cleanModel,
    durationMs: Date.now() - started,
    structured,
  };
}

module.exports = { runnersFile, loadRunners, describeRunners, runLocalRunner };
