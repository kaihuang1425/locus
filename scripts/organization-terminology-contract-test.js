'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractFunction(name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${name} must exist in production`);
  const bodyStart = source.indexOf('{', start);
  assert.ok(bodyStart > start, `${name} must have a body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${name} must have a balanced body`);
}

function readI18n() {
  const startMarker = 'const I18N = ';
  const start = source.indexOf(startMarker);
  const trStart = source.indexOf('\nfunction tr(', start);
  const close = source.lastIndexOf('};', trStart);
  assert.ok(start >= 0 && trStart > start && close > start, 'I18N must remain extractable');
  return vm.runInNewContext(
    `(${source.slice(start + startMarker.length, close + 1)})`,
    {},
    { filename: 'organization-terminology-i18n-extract.js' },
  );
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort();
}

const i18n = readI18n();
const requiredKeys = Object.keys(i18n.en).filter(key =>
  key.startsWith('explorer.')
  || key.startsWith('import.')
  || key === 'organization.scrollSpacesLeft'
  || key === 'organization.scrollSpacesRight');
assert.ok(requiredKeys.length >= 75, 'Organization terminology must retain a complete localized import/Explorer family');
assert.deepEqual(
  requiredKeys.filter(key => !(key in i18n['zh-TW'])),
  [],
  'Every English organization-terminology key must have a native zh-TW value',
);
for (const key of requiredKeys) {
  assert.equal(typeof i18n.en[key], 'string', `${key} must have English copy`);
  assert.equal(typeof i18n['zh-TW'][key], 'string', `${key} must have zh-TW copy`);
  assert.ok(i18n.en[key].trim(), `${key} English copy must not be blank`);
  assert.ok(i18n['zh-TW'][key].trim(), `${key} zh-TW copy must not be blank`);
  assert.deepEqual(
    placeholders(i18n['zh-TW'][key]),
    placeholders(i18n.en[key]),
    `${key} must preserve interpolation placeholders across locales`,
  );
}
assert.doesNotMatch(
  requiredKeys.map(key => i18n.en[key]).join('\n'),
  /\bcategor(?:y|ies)\b/i,
  'Organization-facing English copy must not expose the internal category model',
);
assert.doesNotMatch(
  requiredKeys.map(key => i18n['zh-TW'][key]).join('\n'),
  /分類/,
  'Organization-facing zh-TW copy must use 空間 rather than the internal category model',
);
assert.equal(i18n.en['emojiPicker.categories'], 'Symbol categories', 'Generic symbol taxonomy must remain category copy');
assert.equal(i18n['zh-TW']['emojiPicker.categories'], '圖示分類', 'Generic symbol taxonomy must retain native zh-TW category copy');

let locale = 'en';
const tr = (key, vars = {}) => {
  let value = (i18n[locale] || i18n.en)[key] || i18n.en[key] || key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
};
const helperSandbox = { tr };
vm.runInNewContext(
  [
    extractFunction('localizeImportDiagnosticPath'),
    extractFunction('localizeImportValidationError'),
    extractFunction('importCountPhrase'),
    extractFunction('explorerCopy'),
    'this.api = { localizeImportDiagnosticPath, localizeImportValidationError, importCountPhrase, explorerCopy };',
  ].join('\n'),
  helperSandbox,
  { filename: 'organization-terminology-helpers.js' },
);
const helper = helperSandbox.api;

assert.equal(
  helper.localizeImportDiagnosticPath('workspaces[0].categories[1].groups[2].items[3].reminders[0]'),
  'Workspace 1 › Space 2 › Group 3 › Item 4 › Reminder 1',
  'English diagnostics must preserve a precise one-based hierarchy without schema terms',
);
assert.equal(
  helper.localizeImportDiagnosticPath('archive[1].data.items[0]'),
  'Archive entry 2 › Stored content › Item 1',
  'Stored-entry diagnostics must preserve their exact one-based location',
);
assert.equal(
  helper.localizeImportDiagnosticPath('settings.values[3]'),
  'Settings › values 4',
  'Unknown non-organization fields must remain recognizable and indexed',
);
assert.equal(
  helper.localizeImportValidationError(new Error('workspaces[0] must contain at least one category')),
  'Workspace 1 must contain at least one Space.',
  'The missing-Space validation must not expose the raw category model',
);
assert.equal(
  helper.localizeImportValidationError(new Error('workspaces[0].categories[1].groups[2] has an invalid id')),
  'Workspace 1 › Space 2 › Group 3 has an invalid ID.',
  'Known errors must use the localized product path',
);
assert.equal(
  helper.localizeImportValidationError(new Error('workspaces[0].categories[0].groups[0].items must be an array')),
  'Workspace 1 › Space 1 › Group 1 › Items must be a list.',
  'Array diagnostics must retain their exact product location',
);
assert.equal(
  helper.localizeImportValidationError(new Error('workspaces[0].categories[0].groups[0].items[0] has unsupported type "category-template"')),
  'Workspace 1 › Space 1 › Group 1 › Item 1 has unsupported type “category-template”.',
  'User-authored diagnostic values must remain unchanged',
);
const englishFallback = helper.localizeImportValidationError(
  new Error('workspaces[0].categories[0] failed category validation for "category-template"'),
);
assert.equal(englishFallback, 'Workspace 1 › Space 1 failed Space validation for "category-template"');
assert.doesNotMatch(
  englishFallback.replace('"category-template"', ''),
  /\bcategor(?:y|ies)\b/i,
  'Fallback diagnostics must not leak category terminology outside quoted values',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(helper.explorerCopy())),
  {
    spaces: 'Spaces',
    groups: 'Groups',
    items: 'Items',
    stack: 'Stack',
    noGroups: 'No groups',
    empty: 'Empty',
  },
  'Explorer must use one localized presentation family',
);
assert.equal(helper.importCountPhrase(1, 'import.count.workspaceOne', 'import.count.workspaceMany'), '1 workspace');
assert.equal(helper.importCountPhrase(2, 'import.count.workspaceOne', 'import.count.workspaceMany'), '2 workspaces');

locale = 'zh-TW';
assert.equal(
  helper.localizeImportDiagnosticPath('workspaces[0].categories[1].groups[2].items[3].reminders[0]'),
  '工作區 1 › 空間 2 › 群組 3 › 項目 4 › 提醒 1',
  'zh-TW diagnostics must use native Workspace, Space, Group, Item, and Reminder terms',
);
assert.equal(
  helper.localizeImportValidationError(new Error('workspaces[0] must contain at least one category')),
  '工作區 1 必須至少包含一個空間。',
  'zh-TW missing-Space feedback must be native product copy',
);
assert.equal(
  helper.localizeImportValidationError(new Error('workspaces[0].categories[1].groups[2] reuses id "群組-category"')),
  '工作區 1 › 空間 2 › 群組 3 重複使用 ID「群組-category」。',
  'zh-TW diagnostics must preserve user-authored IDs exactly',
);
const chineseFallback = helper.localizeImportValidationError(
  new Error('workspaces[0].categories[0] failed category validation for "category-template"'),
);
assert.equal(chineseFallback, '工作區 1 › 空間 1 failed 空間 validation for "category-template"');
assert.match(chineseFallback, /"category-template"/, 'zh-TW fallback must preserve quoted user-authored values');
assert.doesNotMatch(
  chineseFallback.replace('"category-template"', ''),
  /\bcategor(?:y|ies)\b/i,
  'zh-TW fallback must remove internal English category terms outside quoted values',
);
assert.doesNotMatch(chineseFallback, /分類/, 'zh-TW fallback must not introduce generic category copy');
assert.deepEqual(
  JSON.parse(JSON.stringify(helper.explorerCopy())),
  {
    spaces: '空間',
    groups: '群組',
    items: '項目',
    stack: '堆疊',
    noGroups: '尚無群組',
    empty: '尚無項目',
  },
  'Explorer must use native zh-TW copy',
);
assert.equal(helper.importCountPhrase(2, 'import.count.workspaceOne', 'import.count.workspaceMany'), '2 個工作區');

class Element {
  constructor(id = '') {
    this.id = id;
    this.className = '';
    this.children = [];
    this._textContent = '';
    this.dataset = {};
    this.attributes = new Map();
    this.disabled = false;
  }
  get textContent() { return this._textContent; }
  set textContent(value) {
    this._textContent = String(value);
    if (value === '') this.children = [];
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
}

const elements = new Map([
  ['import-overlay', new Element('import-overlay')],
  ['import-filename', new Element('import-filename')],
  ['import-date', new Element('import-date')],
  ['import-schema', new Element('import-schema')],
  ['import-counts', new Element('import-counts')],
  ['import-status', new Element('import-status')],
  ['import-x', new Element('import-x')],
  ['import-cancel', new Element('import-cancel')],
  ['import-confirm', new Element('import-confirm')],
]);
const importRadios = [
  { value: 'replace', checked: true, disabled: false },
  { value: 'merge', checked: false, disabled: false },
];
const paintSandbox = {
  importBusy: false,
  importCtx: {
    counts: { workspaces: 2, categories: 5, groups: 8, items: 13, archived: 3, trashed: 1 },
    filename: 'recovery.json',
    exportedAt: null,
    schema: 'legacy',
  },
  document: {
    getElementById: id => elements.get(id) || null,
    createElement: () => new Element(),
    querySelector: selector => selector.includes(':checked') ? importRadios.find(radio => radio.checked) : null,
    querySelectorAll: selector => selector === 'input[name="import-mode"]' ? importRadios : [],
  },
  appLocale: () => locale,
  tr,
};
vm.runInNewContext(
  `${extractFunction('paintImportPreview')}\nthis.paintImportPreview = paintImportPreview;`,
  paintSandbox,
  { filename: 'organization-terminology-import-preview.js' },
);
assert.equal(paintSandbox.paintImportPreview(), true);
assert.equal(elements.get('import-filename').textContent, 'recovery.json');
assert.equal(elements.get('import-date').textContent, '未知');
assert.equal(elements.get('import-schema').textContent, '舊版');
assert.deepEqual(
  elements.get('import-counts').children.map(cell => cell.children.map(child => child.textContent)),
  [
    ['2', '工作區'],
    ['5', '空間'],
    ['8', '群組'],
    ['13', '項目'],
    ['3', '封存'],
    ['1', '垃圾桶'],
  ],
  'Import preview must label counts with native product terminology while reading counts.categories',
);

locale = 'en';
assert.equal(paintSandbox.paintImportPreview(), true);
assert.deepEqual(
  elements.get('import-counts').children.map(cell => cell.children.map(child => child.textContent)),
  [
    ['2', 'Workspaces'],
    ['5', 'Spaces'],
    ['8', 'Groups'],
    ['13', 'Items'],
    ['3', 'Archived'],
    ['1', 'Trash'],
  ],
  'An open import preview must repaint dynamic counts in English without changing values',
);

const validatorStart = source.indexOf('function validateImportData(');
const validatorEnd = source.indexOf('\n\nfunction sanitizeImportedRichText', validatorStart);
const validatorSource = source.slice(validatorStart, validatorEnd);
assert.match(validatorSource, /workspace\.categories/, 'The durable categories field must remain unchanged');
assert.match(validatorSource, /must contain at least one category/, 'Raw validator diagnostics must remain stable');
assert.match(validatorSource, /\$\{wp\}\.categories\[\$\{ci\}\]/, 'Raw indexed schema paths must remain stable');
assert.match(source, /\bactiveCatId\b/, 'The durable active Space pointer must remain activeCatId');
assert.match(source, /\bcategoryId\b/, 'Existing capture/import compatibility identifiers must remain categoryId');

const applyLocaleSource = extractFunction('applyLocale');
const importJsonSource = extractFunction('importJSON');
const importPaintSource = extractFunction('paintImportPreview');
const explorerSource = extractFunction('renderExplorerView');
assert.match(applyLocaleSource, /paintImportPreview\(\)/, 'Locale changes must repaint an open import review');
assert.match(importJsonSource, /localizeImportValidationError\(error\)/, 'User-visible import failures must pass through presentation localization');
assert.match(importPaintSource, /\['categories', 'import\.count\.spaces'\]/, 'Import counts must retain the raw count key and present Spaces');
assert.doesNotMatch(importPaintSource, /['"]Categories['"]/, 'Import review must not hardcode Categories');
assert.match(explorerSource, /buildExCol\(copy\.spaces/, 'Explorer must name its first column with localized Spaces');
assert.doesNotMatch(explorerSource, /buildExCol\(['"]Categories['"]/, 'Explorer must not render Categories');

assert.match(
  html,
  /id="cat-scroll-left"[^>]*aria-label="Scroll Spaces left"[^>]*data-i18n-aria-label="organization\.scrollSpacesLeft"/,
  'The legacy Space strip must expose a localized left-scroll name',
);
assert.match(
  html,
  /id="cat-scroll-right"[^>]*aria-label="Scroll Spaces right"[^>]*data-i18n-aria-label="organization\.scrollSpacesRight"/,
  'The legacy Space strip must expose a localized right-scroll name',
);
for (const key of [
  'import.title',
  'import.close',
  'import.description',
  'import.manifest',
  'import.unchanged',
  'import.file',
  'import.exported',
  'import.schema',
  'import.mode',
  'import.replaceTitle',
  'import.replaceBody',
  'import.mergeTitle',
  'import.mergeBody',
  'import.cancel',
  'import.confirmReplace',
]) {
  assert.match(html, new RegExp(`data-i18n(?:-aria-label)?="${key.replace('.', '\\.')}"`), `${key} must be wired in import markup`);
}
assert.match(html, /id="ep-tabs"[^>]*aria-label="Symbol categories"/, 'Symbol categories must remain correctly named');
assert.match(html, /<label class="field-lbl">Category<\/label>/, 'Finance transaction categories must remain domain-specific copy');
assert.match(
  css,
  /#import-overlay \.import-counts\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  'Six import counts must render as a compact two-column manifest',
);
assert.match(
  css,
  /#import-overlay \.import-mode-opt:has\(input:checked\)\s*\{[^}]*border-left-color:\s*var\(--index-locator\)[^}]*background:\s*var\(--index-paper\)/,
  'Selected import mode must use a non-color locator and readable paper surface',
);
assert.doesNotMatch(
  css,
  /\.import-mode-opt:has\(input:checked\)\s*\{[^}]*background:\s*var\(--accent-bg\)/,
  'Selected import mode must not place muted explanatory text on the solid primary-action fill',
);
for (const selector of ['.import-meta-key', '.import-count-lbl']) {
  assert.match(
    css,
    new RegExp(`#import-overlay ${selector.replace('.', '\\.')}\\s*\\{[^}]*color:\\s*var\\(--text3\\)`),
    `${selector} must use the metadata text token`,
  );
}
assert.match(
  css,
  /#import-overlay \.import-mode-sub\s*\{[^}]*color:\s*var\(--text2\)/,
  'Import consequence copy must use the readable secondary-text token',
);
assert.match(
  css,
  /#import-overlay \.import-review-panel\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto[^}]*max-height:\s*calc\(100dvh - 32px\)[^}]*overflow:\s*hidden/,
  'Import review must keep its header and footer visible while its body is height-bounded',
);
assert.match(
  css,
  /#import-overlay \.modal-bd\s*\{[^}]*overflow-y:\s*auto/,
  'A short import review must scroll only its body',
);
assert.match(
  css,
  /@media \(max-width:\s*520px\)[\s\S]*?#import-overlay\s*\{[^}]*padding:\s*8px[^}]*\}[\s\S]*?#import-overlay \.modal-ft\s*\{[^}]*grid-template-columns:\s*1fr/,
  'Import review must retain compact gutters and reachable actions at narrow widths',
);

console.log('Organization terminology contracts passed: localized import diagnostics/review, Explorer, and Space-scroll names preserve the internal schema');
