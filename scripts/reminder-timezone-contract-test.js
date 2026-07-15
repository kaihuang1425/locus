'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const zones = [
  'America/New_York',
  'Europe/Berlin',
  'Asia/Taipei',
  'Pacific/Apia',
];

if (process.argv[2] !== '--child') {
  const totals = { recurrences: 0, parity: 0, alarmMatches: 0, alarmRejections: 0, invalidInputs: 0 };
  for (const zone of zones) {
    const child = spawnSync(process.execPath, [__filename, '--child', zone], {
      encoding: 'utf8',
      env: { ...process.env, TZ: zone },
    });
    assert.equal(
      child.status,
      0,
      `${zone} contract process failed:\n${child.stderr || child.stdout}`,
    );
    const result = JSON.parse(child.stdout.trim().split(/\r?\n/).at(-1));
    assert.equal(result.zone, zone);
    for (const key of Object.keys(totals)) totals[key] += result[key];
  }

  console.log(
    `Reminder timezone contracts passed: zones=${zones.length}, recurrences=${totals.recurrences}, `
      + `backgroundDisplayParity=${totals.parity}, alarmMatches=${totals.alarmMatches}, `
      + `alarmRejections=${totals.alarmRejections}, invalidInputs=${totals.invalidInputs}`,
  );
  process.exit(0);
}

const expectedZone = process.argv[3];
assert.ok(zones.includes(expectedZone), 'child process must name a supported time zone');
assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, expectedZone);

const root = path.resolve(__dirname, '..');
const backgroundSource = fs.readFileSync(path.join(root, 'background.js'), 'utf8').replace(/\r\n/g, '\n');
const newtabSource = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must be extractable`);
  return source.slice(start, end);
}

const recurrenceSource = extractBetween(
  backgroundSource,
  'function nextRecurTime(at, recur, now = Date.now()) {',
  '\n\n// Alarm names can outlive a reminder edit or deletion.',
);
const alarmMatchSource = extractBetween(
  backgroundSource,
  'function reminderMatchesAlarm(reminder, alarm) {',
  '\n\nasync function showReminderAttention',
);
const displaySource = extractBetween(
  newtabSource,
  'function nextReminderOccurrenceForDisplay(at, recur, now = Date.now()) {',
  '\n\nfunction pendingReminderTime',
);

const context = vm.createContext({ Date });
vm.runInContext(
  `${recurrenceSource}\n${alarmMatchSource}\n${displaySource}\n`
    + 'globalThis.__api = { nextRecurTime, reminderMatchesAlarm, nextReminderOccurrenceForDisplay };',
  context,
  { filename: `reminder-timezone-production-contract-${expectedZone}.js` },
);
const api = context.__api;
const counts = { recurrences: 0, parity: 0, alarmMatches: 0, alarmRejections: 0, invalidInputs: 0 };

function localTimestamp(parts) {
  const [year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0] = parts;
  return new Date(year, month - 1, day, hour, minute, second, millisecond).getTime();
}

function assertLocalTime(timestamp, parts, label) {
  const actual = new Date(timestamp);
  const expected = [parts[0], parts[1] - 1, parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0, parts[6] || 0];
  const fields = [
    actual.getFullYear(), actual.getMonth(), actual.getDate(), actual.getHours(),
    actual.getMinutes(), actual.getSeconds(), actual.getMilliseconds(),
  ];
  assert.deepEqual(fields, expected, `${label} must retain its local wall time`);
}

function verifyRecurrence(label, startParts, recur, expectedParts, options = {}) {
  const start = localTimestamp(startParts);
  const cutoff = options.cutoffParts ? localTimestamp(options.cutoffParts) : start;
  const expected = expectedParts == null ? null : localTimestamp(expectedParts);
  const recurrenceSnapshot = JSON.stringify(recur);
  const background = api.nextRecurTime(start, recur, cutoff);
  const display = api.nextReminderOccurrenceForDisplay(start, recur, cutoff);

  assert.equal(background, expected, `${label}: background occurrence`);
  assert.equal(display, expected, `${label}: displayed occurrence`);
  assert.equal(display, background, `${label}: display and service worker must agree`);
  assert.equal(JSON.stringify(recur), recurrenceSnapshot, `${label}: recurrence input must remain unchanged`);
  if (expectedParts != null) assertLocalTime(expected, expectedParts, label);
  if (options.elapsedHours != null) {
    assert.equal((expected - start) / 3_600_000, options.elapsedHours, `${label}: elapsed hours`);
  }
  counts.recurrences += 1;
  counts.parity += 1;
  return { start, expected };
}

function verifyAlarm(label, start, recur, scheduledTime, expected, notified = false) {
  assert.equal(
    api.reminderMatchesAlarm({ at: start, notified, recur }, { scheduledTime }),
    expected,
    label,
  );
  counts[expected ? 'alarmMatches' : 'alarmRejections'] += 1;
}

if (expectedZone === 'America/New_York') {
  verifyRecurrence('New York spring daily', [2025, 3, 8, 9], { every: 'day', interval: 1 }, [2025, 3, 9, 9], { elapsedHours: 23 });
  verifyRecurrence('New York fall daily', [2025, 11, 1, 9], { every: 'day', interval: 1 }, [2025, 11, 2, 9], { elapsedHours: 25 });
  verifyRecurrence('New York missing daily time', [2025, 3, 8, 2, 30], { every: 'day', interval: 1 }, [2025, 3, 10, 2, 30]);
  verifyRecurrence('New York missing weekly time', [2025, 3, 2, 2, 30], { every: 'week', interval: 1 }, [2025, 3, 16, 2, 30]);
  verifyRecurrence('New York missing monthly day', [2025, 1, 31, 9], { every: 'month', interval: 1 }, [2025, 3, 31, 9]);
  verifyRecurrence(
    'New York recurrence bounded before next valid time',
    [2025, 3, 8, 2, 30],
    { every: 'day', interval: 1, until: localTimestamp([2025, 3, 9, 23, 59]) },
    null,
  );
  verifyRecurrence(
    'New York next valid time allowed at bound',
    [2025, 3, 8, 2, 30],
    { every: 'day', interval: 1, until: localTimestamp([2025, 3, 10, 2, 30]) },
    [2025, 3, 10, 2, 30],
  );

  const fold = verifyRecurrence('New York first fold', [2025, 11, 1, 1, 30], { every: 'day', interval: 1 }, [2025, 11, 2, 1, 30]);
  const secondFold = fold.expected + 3_600_000;
  assertLocalTime(secondFold, [2025, 11, 2, 1, 30], 'New York second fold');
  assert.notEqual(new Date(secondFold).getTimezoneOffset(), new Date(fold.expected).getTimezoneOffset());
  verifyAlarm('New York first fold alarm must match', fold.start, { every: 'day', interval: 1 }, fold.expected, true);
  verifyAlarm('New York second fold alarm must be rejected', fold.start, { every: 'day', interval: 1 }, secondFold, false);
  verifyRecurrence(
    'New York cutoff after first fold',
    [2025, 11, 1, 1, 30],
    { every: 'day', interval: 1 },
    [2025, 11, 3, 1, 30],
    { cutoffParts: [2025, 11, 2, 1, 30] },
  );
} else if (expectedZone === 'Europe/Berlin') {
  verifyRecurrence('Berlin spring daily', [2025, 3, 29, 9], { every: 'day', interval: 1 }, [2025, 3, 30, 9], { elapsedHours: 23 });
  verifyRecurrence('Berlin fall daily', [2025, 10, 25, 9], { every: 'day', interval: 1 }, [2025, 10, 26, 9], { elapsedHours: 25 });
  verifyRecurrence('Berlin missing daily time', [2025, 3, 29, 2, 30], { every: 'day', interval: 1 }, [2025, 3, 31, 2, 30]);
  verifyRecurrence('Berlin missing weekly time', [2025, 3, 23, 2, 30], { every: 'week', interval: 1 }, [2025, 4, 6, 2, 30]);

  const fold = verifyRecurrence('Berlin first fold', [2025, 10, 25, 2, 30], { every: 'day', interval: 1 }, [2025, 10, 26, 2, 30]);
  const secondFold = fold.expected + 3_600_000;
  assertLocalTime(secondFold, [2025, 10, 26, 2, 30], 'Berlin second fold');
  assert.notEqual(new Date(secondFold).getTimezoneOffset(), new Date(fold.expected).getTimezoneOffset());
  verifyAlarm('Berlin first fold alarm must match', fold.start, { every: 'day', interval: 1 }, fold.expected, true);
  verifyAlarm('Berlin second fold alarm must be rejected', fold.start, { every: 'day', interval: 1 }, secondFold, false);
  verifyRecurrence(
    'Berlin cutoff after first fold',
    [2025, 10, 25, 2, 30],
    { every: 'day', interval: 1 },
    [2025, 10, 27, 2, 30],
    { cutoffParts: [2025, 10, 26, 2, 30] },
  );
} else if (expectedZone === 'Asia/Taipei') {
  verifyRecurrence('Taipei daily', [2025, 1, 15, 9], { every: 'day', interval: 1 }, [2025, 1, 16, 9], { elapsedHours: 24 });
  verifyRecurrence('Taipei two-day interval', [2025, 1, 15, 9], { every: 'day', interval: 2 }, [2025, 1, 17, 9], { elapsedHours: 48 });
  verifyRecurrence('Taipei missing monthly day', [2025, 1, 31, 9], { every: 'month', interval: 1 }, [2025, 3, 31, 9]);
} else if (expectedZone === 'Pacific/Apia') {
  verifyRecurrence('Apia deleted daily date', [2011, 12, 29, 9], { every: 'day', interval: 1 }, [2011, 12, 31, 9], { elapsedHours: 24 });
  verifyRecurrence('Apia deleted weekly date', [2011, 12, 23, 9], { every: 'week', interval: 1 }, [2012, 1, 6, 9]);
  verifyRecurrence('Apia deleted monthly date', [2011, 11, 30, 9], { every: 'month', interval: 1 }, [2012, 1, 30, 9]);
}

const validationStart = localTimestamp([2025, 1, 15, 9]);
const invalidCases = [
  ['invalid start', 'not-a-time', { every: 'day', interval: 1 }, validationStart],
  ['invalid cutoff', validationStart, { every: 'day', interval: 1 }, 'not-a-time'],
  ['invalid cadence', validationStart, { every: 'hour', interval: 1 }, validationStart],
  ['invalid until', validationStart, { every: 'day', interval: 1, until: 'not-a-time' }, validationStart],
];
for (const [label, start, recur, cutoff] of invalidCases) {
  assert.equal(api.nextRecurTime(start, recur, cutoff), null, `${label}: background must fail closed`);
  assert.equal(api.nextReminderOccurrenceForDisplay(start, recur, cutoff), null, `${label}: display must fail closed`);
  counts.invalidInputs += 1;
  counts.parity += 1;
}
verifyAlarm('notified reminder alarm must be rejected', validationStart, { every: 'day', interval: 1 }, validationStart, false, true);

console.log(JSON.stringify({ zone: expectedZone, ...counts }));
