#!/usr/bin/env node
'use strict';

// Setup helper for the Locus planner companion.
//   node companion/locus-planner.js install --extension-id <id> [--browser chrome|edge|all] [--dry-run]
//   node companion/locus-planner.js uninstall [--browser chrome|edge|all]
//   node companion/locus-planner.js status
//   node companion/locus-planner.js mcp-config --client claude|codex|antigravity [--pairing <id>]
//   node companion/locus-planner.js unpair <pairing-id>
// Options: --home <dir> uses a different data directory (default: per-user app data).

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { HOST_NAME, PlannerStore, defaultHome } = require('./lib/store.js');
const { runnersFile } = require('./lib/runners.js');

const REGISTRY_KEYS = Object.freeze({
  chrome: `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`,
  edge: `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${HOST_NAME}`,
});
const UNIX_DIRS = Object.freeze({
  darwin: {
    chrome: '~/Library/Application Support/Google/Chrome/NativeMessagingHosts',
    edge: '~/Library/Application Support/Microsoft Edge/NativeMessagingHosts',
  },
  linux: {
    chrome: '~/.config/google-chrome/NativeMessagingHosts',
    edge: '~/.config/microsoft-edge/NativeMessagingHosts',
  },
});

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i += 1; }
    } else out._.push(arg);
  }
  return out;
}

function browsersFrom(value) {
  if (!value || value === true || value === 'all') return ['chrome', 'edge'];
  const list = String(value).split(',').map(entry => entry.trim().toLowerCase());
  for (const entry of list) {
    if (!REGISTRY_KEYS[entry]) throw new Error(`Unknown browser "${entry}". Use chrome, edge, or all.`);
  }
  return list;
}

function expandHome(dir) {
  return dir.startsWith('~') ? path.join(require('node:os').homedir(), dir.slice(1)) : dir;
}

function reg(args) {
  const result = spawnSync('reg.exe', args, { encoding: 'utf8', windowsHide: true });
  return { ok: result.status === 0, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function hostPaths(home) {
  const dir = path.join(home, 'host');
  return {
    dir,
    manifest: path.join(dir, `${HOST_NAME}.json`),
    launcher: path.join(dir, process.platform === 'win32' ? 'locus-planner-host.cmd' : 'locus-planner-host.sh'),
  };
}

function install(args) {
  const extensionId = String(args['extension-id'] || '');
  if (!/^[a-p]{32}$/.test(extensionId)) {
    throw new Error('Pass --extension-id with the 32-letter id shown for Locus on chrome://extensions or edge://extensions.');
  }
  const home = defaultHome();
  const paths = hostPaths(home);
  fs.mkdirSync(paths.dir, { recursive: true });
  const nodePath = process.execPath;
  const hostScript = path.join(__dirname, 'native-host.js');
  if (process.platform === 'win32') {
    const lines = ['@echo off'];
    if (process.env.LOCUS_PLANNER_HOME) lines.push(`set "LOCUS_PLANNER_HOME=${home}"`);
    lines.push(`"${nodePath}" "${hostScript}" %*`);
    fs.writeFileSync(paths.launcher, `${lines.join('\r\n')}\r\n`, 'utf8');
  } else {
    const lines = ['#!/bin/sh'];
    if (process.env.LOCUS_PLANNER_HOME) lines.push(`export LOCUS_PLANNER_HOME='${home.replace(/'/g, "'\\''")}'`);
    lines.push(`exec '${nodePath}' '${hostScript}' "$@"`);
    fs.writeFileSync(paths.launcher, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o755 });
  }
  const manifest = {
    name: HOST_NAME,
    description: 'Locus planner companion: local draft queue for AI planning',
    path: paths.launcher,
    type: 'stdio',
    allowed_origins: [`chrome-extension://${extensionId}/`],
  };
  fs.writeFileSync(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const report = [];
  const dryRun = args['dry-run'] === true;
  for (const browser of browsersFrom(args.browser)) {
    if (process.platform === 'win32') {
      const command = ['add', REGISTRY_KEYS[browser], '/ve', '/t', 'REG_SZ', '/d', paths.manifest, '/f'];
      if (dryRun) {
        report.push(`${browser}: would run reg.exe ${command.map(part => (/\s/.test(part) ? `"${part}"` : part)).join(' ')}`);
        continue;
      }
      const result = reg(command);
      if (!result.ok) throw new Error(`Could not register for ${browser}: ${result.stderr.trim()}`);
      report.push(`${browser}: ${REGISTRY_KEYS[browser]}`);
    } else {
      const dir = expandHome(UNIX_DIRS[process.platform]?.[browser] || UNIX_DIRS.linux[browser]);
      if (dryRun) {
        report.push(`${browser}: would copy the manifest to ${path.join(dir, `${HOST_NAME}.json`)}`);
        continue;
      }
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(paths.manifest, path.join(dir, `${HOST_NAME}.json`));
      report.push(`${browser}: ${path.join(dir, `${HOST_NAME}.json`)}`);
    }
  }
  new PlannerStore({ home }).ensure();
  console.log(`Installed ${HOST_NAME} for chrome-extension://${extensionId}/`);
  console.log(`Data directory: ${home}`);
  console.log(`Host manifest:  ${paths.manifest}`);
  for (const line of report) console.log(`${dryRun ? 'Dry run:       ' : 'Registered:    '} ${line}`);
  console.log(dryRun
    ? 'Dry run: host files were written; no browser registration was changed.'
    : 'Next: in Locus open Calendar, choose Plan with AI, then Connect companion.');
}

function uninstall(args) {
  const home = defaultHome();
  const paths = hostPaths(home);
  for (const browser of browsersFrom(args.browser)) {
    if (process.platform === 'win32') {
      const result = reg(['delete', REGISTRY_KEYS[browser], '/f']);
      console.log(`${browser}: ${result.ok ? 'removed' : 'not registered'}`);
    } else {
      const file = path.join(expandHome(UNIX_DIRS[process.platform]?.[browser] || UNIX_DIRS.linux[browser]), `${HOST_NAME}.json`);
      fs.rmSync(file, { force: true });
      console.log(`${browser}: removed ${file}`);
    }
  }
  fs.rmSync(paths.manifest, { force: true });
  fs.rmSync(paths.launcher, { force: true });
  console.log(`Removed the host manifest. Drafts and pairings stay in ${home} until you delete that folder.`);
}

function status() {
  const home = defaultHome();
  const paths = hostPaths(home);
  const store = new PlannerStore({ home });
  console.log(`Data directory: ${home}`);
  console.log(`Host manifest:  ${fs.existsSync(paths.manifest) ? paths.manifest : '(not installed)'}`);
  if (fs.existsSync(paths.manifest)) {
    const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
    console.log(`Allowed origin: ${manifest.allowed_origins.join(', ')}`);
  }
  if (process.platform === 'win32') {
    for (const [browser, key] of Object.entries(REGISTRY_KEYS)) {
      const result = reg(['query', key, '/ve']);
      const value = (result.stdout.match(/REG_SZ\s+(.+)/) || [])[1];
      console.log(`${browser.padEnd(6)}: ${result.ok && value ? value.trim() : 'not registered'}`);
    }
  }
  const pairings = store.listPairings();
  if (!pairings.length) console.log('Pairings: none yet');
  for (const pairing of pairings) {
    const counts = store.counts(pairing.id);
    console.log(`Pairing ${pairing.id} ${pairing.label ? `(${pairing.label}) ` : ''}queued=${counts.queued} delivered=${counts.delivered} applied=${counts.applied}`);
  }
  console.log(`Runners file:   ${runnersFile(home)}${fs.existsSync(runnersFile(home)) ? '' : ' (none)'}`);
}

function mcpConfig(args) {
  const client = String(args.client || 'claude').toLowerCase();
  const serverArgs = [path.join(__dirname, 'mcp-server.js')];
  if (args.pairing && args.pairing !== true) serverArgs.push('--pairing', String(args.pairing));
  serverArgs.push('--client', client);
  const env = process.env.LOCUS_PLANNER_HOME ? { LOCUS_PLANNER_HOME: defaultHome() } : undefined;
  if (client === 'codex') {
    const toml = [
      '[mcp_servers.locus]',
      `command = ${JSON.stringify(process.execPath)}`,
      `args = [${serverArgs.map(arg => JSON.stringify(arg)).join(', ')}]`,
    ];
    if (env) toml.push('', '[mcp_servers.locus.env]', `LOCUS_PLANNER_HOME = ${JSON.stringify(env.LOCUS_PLANNER_HOME)}`);
    console.log(toml.join('\n'));
    return;
  }
  const entry = { command: process.execPath, args: serverArgs };
  if (env) entry.env = env;
  console.log(JSON.stringify({ mcpServers: { locus: entry } }, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.home && args.home !== true) process.env.LOCUS_PLANNER_HOME = path.resolve(String(args.home));
  const command = args._[0];
  if (command === 'install') return install(args);
  if (command === 'uninstall') return uninstall(args);
  if (command === 'status') return status();
  if (command === 'mcp-config') return mcpConfig(args);
  if (command === 'unpair') {
    const removed = new PlannerStore().unpair(String(args._[1] || ''));
    console.log(removed ? 'Pairing removed.' : 'No such pairing.');
    return undefined;
  }
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(3, 10).map(line => line.replace(/^\/\/ ?/, '')).join('\n'));
  return undefined;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
