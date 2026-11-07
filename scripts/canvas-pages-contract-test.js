'use strict';

// Contract test for the 2026-11 canvas pages built on existing surfaces:
// Welcome (envelope and stamp) and the resting page. It checks that the
// redesign kept each surface's behaviour and IDs, and that every new string is
// bilingual. Since 2026-11-07 ("Just Today") it also checks that the calm new
// tab is gone for good and that Today's rolling clock is untouched.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const newtab = read('newtab.js');
const html = read('newtab.html');
const css = read('newtab.css');
const suspendedHtml = read('suspended.html');
const suspendedJs = read('suspended.js');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1; };

function i18n() {
  const start = newtab.indexOf('const I18N = {');
  const end = newtab.indexOf('\n};', start);
  return vm.runInNewContext(`(${newtab.slice(newtab.indexOf('{', start), end + 2)})`);
}

function testWelcome() {
  ok(/<h2 id="wc-task-title" class="wc-h"><span class="wc-never" data-i18n="welcome\.sloganLead">Never<\/span><span data-i18n="welcome\.sloganRest"> lose a tab again\.<\/span><\/h2>/.test(html),
    'the Welcome headline is the slogan with "Never" as its own leaf');
  ok(/\.wc-never \{ color: var\(--index-locator, #3158db\); \}/.test(css), '"Never" is blue');
  ok(/class="wc-route"[\s\S]*id="wc-candidate"[\s\S]*class="wc-route-line"[\s\S]*id="wc-destination"/.test(html), 'the envelope is still the reviewed tab and its exact destination');
  ok(/<svg class="wc-airmail" aria-hidden="true" focusable="false">/.test(html), 'the airmail border is decorative SVG');
  ok(!/(?:linear|radial|conic)-gradient\s*\(/.test(css.slice(css.indexOf('WELCOME (2026-11 canvas)'))), 'no CSS gradients');
  ok(/<div class="wc-tray" aria-hidden="true"><span class="wc-tray-badge">1<\/span>/.test(html), 'the Inbox tray shows a red 1');
  ok(/await playWelcomeStamp\(\);\n\s*setWelcomePending\(false\);\n\s*closeWelcome\(true\);/.test(newtab), 'the stamp plays after the acknowledged save and before the usual hand-off');
  ok(/const outcome = await saveTabToInbox\(currentTab, \{\n\s*closeSource: true,\n\s*returnOutcome: true,\n\s*\}\);/.test(newtab), 'the first save still closes the source through the capture path');
  ok(/function welcomeReducedMotion\(\) \{\n\s*if \(typeof matchMedia !== 'function'\) return true;/.test(newtab), 'the stamp waits are skipped without motion support');
  ok(/ov\.classList\.remove\('is-stamped', 'is-sent', 'is-saved'\);/.test(newtab), 'closing Welcome resets the stamp');
  const strings = i18n();
  for (const key of ['welcome.sloganLead', 'welcome.sloganRest', 'welcome.stampSlot', 'welcome.stampLabel', 'welcome.savedTitle', 'welcome.private', 'welcome.save']) {
    ok(strings.en[key] && strings['zh-TW'][key], `${key} exists in English and zh-TW`);
  }
  eq([strings.en['welcome.save'], strings['zh-TW']['welcome.save']], ['Stamp, save & close tab', '蓋章儲存並關閉分頁'], 'Save still names that the tab closes');
}

// Just Today (Kai, 2026-11-07): a new tab always opens Today. The calm launch
// layer, its split-flap clock, recent pages and "Show Today instead" are gone,
// and a profile that stored showLanding: true must not bring any of it back.
function testNoLandingLayer() {
  ok(!/\bid="landing-|class="landing-/.test(html), 'newtab.html has no landing layer markup');
  ok(!/#landing-|\.landing-|\.fl-card|@keyframes fl-/.test(css), 'no landing layer or split-flap styles remain');
  ok(!/landing-layer|showLandingLayer|renderLandingLayer|closeLandingLayer|bindLandingLayer|paintLandingFlip|_landingClockTimer|locus\.landing\.tone/.test(newtab),
    'no landing layer functions, clock timer or tone memory remain');
  const code = newtab.replace(/^\s*\/\/.*$/gm, '');
  ok(!/showLanding/.test(code), 'no code reads the stored showLanding choice, so a stored true has nothing to switch on');
  const strings = i18n();
  for (const key of ['landing.recent', 'landing.showToday', 'landing.light', 'landing.dark', 'landing.timeLabel', 'landing.greeting', 'landing.quote', 'settings.showLanding']) {
    ok(!(key in strings.en) && !(key in strings['zh-TW']), `${key} is gone in English and zh-TW`);
  }

  // Boot a returning profile that stored the old opt-in and a Welcome name.
  // Every call boot makes is recorded; none may reach a landing layer.
  const boot = extract('initAfterLoad');
  const calls = [];
  const lookedUp = [];
  const settings = { showLanding: true, profile: { name: 'Kai' }, onboarding: { welcomeSeen: true }, animate: true };
  const context = {
    loadedSchema: 14,
    activeHome: true,
    console,
    State: { get: () => ({ settings }), isRecoveryRequired: () => false },
    document: {
      getElementById: id => { lookedUp.push(id); return null; },
      body: { classList: { add() {}, remove() {} } },
    },
    window: { requestIdleCallback() {} },
    requestAnimationFrame: fn => fn(),
    setTimeout: () => 0,
  };
  const builtIns = new Set(['function', 'if', 'catch', 'typeof', 'Error', 'initAfterLoad']);
  for (const [, name] of boot.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (name in context || builtIns.has(name)) continue;
    context[name] = () => { calls.push(name); };
  }
  vm.runInContext(`${boot}\ninitAfterLoad();`, vm.createContext(context));
  ok(calls.includes('renderAll') && calls.includes('bindStatic'), 'boot still binds and renders the app, which opens on Today');
  eq([calls.filter(name => /landing/i.test(name)), lookedUp.filter(id => /landing/.test(id))], [[], []],
    'a profile that stored showLanding: true boots straight to Today with no landing layer');
}

function testRestingPage() {
  const visibleHtml = suspendedHtml.slice(suspendedHtml.indexOf('<body>')).replace(/<[^>]+>/g, ' ');
  const copyTable = suspendedJs.slice(suspendedJs.indexOf('var copy = zh ?'), suspendedJs.indexOf('if (zh) document.documentElement.lang'));
  ok(copyTable.length > 100, 'the resting copy table is extractable');
  ok(!/hibernat|switch to this tab|idle|休眠/i.test(visibleHtml + copyTable), 'no visible copy implies idle auto-suspend');
  ok(/rest: 'Not loaded yet', load: 'Load page'/.test(suspendedJs) && /note: 'Opened as a placeholder', change: 'Change'/.test(suspendedJs), 'English copy from the board');
  ok(/rest: '尚未載入', load: '載入頁面'/.test(suspendedJs) && /note: '以預留頁開啟', change: '變更'/.test(suspendedJs), 'zh-TW copy');
  ok(/var navigable = \/\^\(\?:https\?\|ftp\|file\):\/i\.test\(url\);/.test(suspendedJs), 'only web and file addresses ever load');
  ok(/if \(isForeground\(\)\) \{\n\s*load\(\);/.test(suspendedJs), 'the placeholder still loads when its tab comes to the front');
  ok(/if \(e\.key === 'Enter' \|\| e\.key === ' '\) \{ e\.preventDefault\(\); load\(\); \}/.test(suspendedJs), 'Enter loads the page');
  ok(/if \(e\.target && e\.target\.closest && e\.target\.closest\('a, button'\)\) return;\n\s*if \(e\.key === 'Enter'/.test(suspendedJs), 'Enter on the Change link opens it instead of loading the page');
  ok(/<span class="kb" aria-hidden="true">Enter<\/span>/.test(suspendedHtml), 'the button shows the Enter hint');
  ok(/<link rel="stylesheet" href="media\/fonts\/fonts\.css">/.test(suspendedHtml), 'bundled fonts only');
  ok(!/https?:\/\/(?!127\.0\.0\.1)/.test(suspendedHtml), 'no external resources');
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(suspendedHtml), 'reduced motion is respected');
}

function testRemainingSurfaces() {
  const layer = css.slice(css.indexOf('REMAINING SURFACES (2026-11 canvas)'));
  ok(layer.length > 1000, 'the surfaces layer is present');
  ok(!/(?:linear|radial|conic)-gradient\s*\(/.test(layer), 'no CSS gradients');
  const canvasLayers = css.slice(css.indexOf('PLAN (2026-11 canvas)'));
  ok(!/#sidebar\b/.test(canvasLayers), 'the canvas layers leave the original rail alone');
  ok(/body\[data-theme\] \.library-head > div > p,\nbody\[data-theme\] \.library-local-note,/.test(layer), 'page sub-lines are trimmed in CSS only');
  ok(/<p class="sr-only" id="search-sub"><\/p>/.test(newtab) && /aria-describedby="search-sub"/.test(newtab) && /querySelector\('#search-sub'\)\.textContent = tr\('search\.subtitle'\)/.test(newtab),
    'the Find again sub-line is still in the page, hidden, as the field’s description');
  ok(/<p class="sr-only" id="library-sub"><\/p>/.test(newtab) && /aria-describedby="library-sub"/.test(newtab)
    && /root\.querySelector\('#library-sub'\)\.textContent = tr\(currentMode === 'favorites' \? 'library\.subtitleFavorites' : currentMode === 'read-later' \? 'readLater\.subtitle' : 'library\.subtitleAll'\);/.test(newtab),
  'the Library sub-line copy is still in the page, hidden, as the list’s description');
  ok(/#settings-drawer \.toggle-row small\[id\$="-hint"\] \{\n\s*position: absolute;\n\s*width: 1px;/.test(layer), 'Settings hints are hidden visually, not removed');
  ok(/aria-describedby="[^"]*general-hibernate-hint/.test(html) || /general-hibernate-hint/.test(newtab), 'Settings hints stay referenced for assistive technology');
  ok(/body\[data-theme\] \.gcol \.item \{\n\s*\/\*[^*]*\*\/\n\s*flex-shrink: 0;/.test(layer), 'a full board column scrolls instead of shrinking its cards');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*body\[data-theme\] :is\(\.archive-row, \.gcol \.item\) \{ transition: none; \}/.test(layer), 'card hover motion stops under reduced motion');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.fnd, \.fnd \*, \.fnd \*::before, \.fnd \*::after,\n\s*#cmd-palette, #cmd-palette \*, #cmd-palette \*::before, #cmd-palette \*::after \{ animation: none !important; transition: none !important; \}/.test(layer), 'Find again and the palette (their own rows, not cards) stop all motion under reduced motion');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.lib, \.lib \*, \.lib \*::before, \.lib \*::after \{ animation: none !important; transition: none !important; \}/.test(layer), 'the Library page (its own rows, not cards) stops all motion under reduced motion');
}

function extract(name) {
  const start = newtab.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is extractable`);
  // Skip the whole parameter list: defaults such as `{ now = Date.now() } = {}`
  // hold their own parentheses and braces.
  let close = newtab.indexOf('(', start);
  for (let depth = 0; close < newtab.length; close += 1) {
    if (newtab[close] === '(') depth += 1;
    else if (newtab[close] === ')' && --depth === 0) break;
  }
  const open = newtab.indexOf('{', close);
  let depth = 0;
  for (let index = open; index < newtab.length; index += 1) {
    if (newtab[index] === '{') depth += 1;
    else if (newtab[index] === '}') { depth -= 1; if (depth === 0) return newtab.slice(start, index + 1); }
  }
  throw new Error(name);
}

// Today's clock stays as it was: digits that change roll up, a wrapping digit
// rolls on to the repeated 0 and snaps back, unchanged digits do not move, and
// there is no flip.
function testTodayClockUnchanged() {
  const build = extract('buildTodayClock');
  ok(/const stack = Array\.from\(\{ length: 12 \}, \(_, index\) => `<span>\$\{index % 10\}<\/span>`\)\.join\(''\);/.test(build)
    && /clock\.innerHTML = `\$\{digit\}\$\{digit\}<span class="today-colon" aria-hidden="true">:<\/span>\$\{digit\}\$\{digit\}`;/.test(build),
  'Today still builds four rolling digit stacks (0–9 then 0, 1) around one colon');
  ok(!/fl-|flip/i.test(build + extract('paintTodayClock')), 'Today has no flip cards');
  ok(/\.today-digit-stack \{\n\s*display: block;\n\s*transition: transform \.8s cubic-bezier\(\.34, 1\.25, \.64, 1\);/.test(css)
    && /\.today-digit-stack\.is-snap \{ transition: none; \}/.test(css), 'the digit stacks still roll with the same .8 s spring and snap without a transition');
  ok(/todayClockTimer = setTimeout\(tick, 1000 - \(Date\.now\(\) % 1000\) \+ 20\);/.test(extract('startTodayClock')), 'Today still ticks once a second, aligned to the second');

  const timers = [];
  let reduced = false;
  const stacks = Array.from({ length: 4 }, () => {
    const classes = new Set();
    return {
      dataset: {},
      style: {},
      classList: {
        add: name => classes.add(name),
        toggle: (name, force) => (force ? classes.add(name) : classes.delete(name)),
        contains: name => classes.has(name),
      },
    };
  });
  const attributes = {};
  const clock = { querySelectorAll: () => stacks, setAttribute: (name, value) => { attributes[name] = value; } };
  const block = { querySelector: selector => (selector === '.today-clock' ? clock : null) };
  const context = vm.createContext({
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout() {},
    todayReducedMotion: () => reduced,
    todayDateLine: () => '',
  });
  vm.runInContext(`${extract('todayPad2')}\n${extract('paintTodayClock')}\nglobalThis.__paint = paintTodayClock;`, context);
  const at = (h, m) => new Date(2026, 10, 7, h, m, 0).getTime();
  const state = () => stacks.map(stack => [stack.style.transform, stack.classList.contains('is-snap')]);

  context.__paint(block, { now: at(9, 59), animate: false });
  eq(state(), [['translateY(0em)', true], ['translateY(-9em)', true], ['translateY(-5em)', true], ['translateY(-9em)', true]],
    'the first paint places each digit without motion');
  eq(attributes['aria-label'], '09:59', 'the clock reads its time to assistive technology');

  context.__paint(block, { now: at(10, 0), animate: true });
  eq(state(), [['translateY(-1em)', false], ['translateY(-10em)', false], ['translateY(-10em)', false], ['translateY(-10em)', false]],
    'at 10:00 the hour rolls up to 1 and each wrapping digit rolls on to the repeated 0');
  eq(timers.map(timer => timer.ms), [900, 900, 900], 'each wrapped digit snaps back once its roll ends');
  timers.forEach(timer => timer.fn());
  eq(state().slice(1), [['translateY(0em)', true], ['translateY(0em)', true], ['translateY(0em)', true]], 'the snap back is instant');

  context.__paint(block, { now: at(10, 1), animate: true });
  eq(state(), [['translateY(-1em)', false], ['translateY(0em)', true], ['translateY(0em)', true], ['translateY(-1em)', false]],
    'at 10:01 only the last digit rolls; the digits that did not change stay put');

  reduced = true;
  context.__paint(block, { now: at(10, 2), animate: true });
  eq(state()[3], ['translateY(-2em)', true], 'with reduced motion the digit changes without rolling');
}

// S7: the Welcome postmark follows the app language.
function testPostmarkLanguage() {
  const strings = i18n();
  ok(/class="wc-pm-word" data-i18n="welcome\.postmarkBrand">LOCUS<\/text>/.test(html) && /class="wc-pm-word" data-i18n="welcome\.postmarkInbox">INBOX<\/text>/.test(html), 'the postmark words come from I18N keys');
  eq([strings.en['welcome.postmarkInbox'], strings['zh-TW']['welcome.postmarkInbox'], strings['zh-TW']['welcome.postmarkBrand']], ['INBOX', '收件匣', 'LOCUS'], 'Inbox is translated and the brand stays');
  const stamp = extract('playWelcomeStamp');
  ok(/const stampLocale = appLocale\(\) === 'zh-TW' \? 'zh-TW' : 'en-GB';/.test(stamp) && !/toLocaleDateString\('en-GB'/.test(stamp), 'the postmark date uses the app language');
  const date = new Date(2026, 10, 6, 14, 5);
  eq([date.toLocaleDateString('zh-TW', { day: 'numeric', month: 'short' }), date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })], ['11月6日', '14:05'], 'zh-TW postmark reads 11月6日 14:05');
}

// suspended.js run in a VM (S2, S4, S9): Enter, the Change link, Loading until
// the real page replaces this one, a stall that frees Retry, and Locus settings.
function restingPage({ url = 'https://example.com/a', mirror = null, browser = 'en-US' } = {}) {
  const classes = () => {
    const set = new Set();
    return { add: (...names) => names.forEach(name => set.add(name)), remove: (...names) => names.forEach(name => set.delete(name)), contains: name => set.has(name) };
  };
  const els = new Map();
  const el = id => {
    const element = { id, textContent: '', style: {}, src: '', closest: () => null, addEventListener(type, fn) { this[`on_${type}`] = fn; } };
    els.set(id, element);
    return element;
  };
  ['status-text', 'load-label', 'placeholder-note', 'change-link', 'fav', 'title', 'url', 'load-btn'].forEach(el);
  const docListeners = {};
  const winListeners = {};
  const timers = new Map();
  let nextTimer = 1;
  const replaced = [];
  const body = { classList: classes(), dataset: {}, addEventListener(type, fn) { this[`on_${type}`] = fn; } };
  const document = {
    title: '', body, documentElement: { lang: 'en' }, head: { appendChild() {} }, visibilityState: 'hidden',
    hasFocus: () => false,
    getElementById: id => els.get(id) || null,
    createElement: () => ({}),
    addEventListener: (type, fn) => { docListeners[type] = fn; },
  };
  const context = vm.createContext({
    document, URL, URLSearchParams, JSON, String,
    navigator: { languages: [browser], language: browser },
    localStorage: { getItem: key => (key === 'te_settings_mirror' && mirror ? JSON.stringify(mirror) : null) },
    location: { hash: `#url=${encodeURIComponent(url)}&title=Example`, replace: target => replaced.push(target) },
    chrome: { runtime: { getURL: path => `chrome-extension://locus/${path}` } },
    window: {
      addEventListener: (type, fn) => { winListeners[type] = fn; },
      removeEventListener: (type, fn) => { if (winListeners[type] === fn) delete winListeners[type]; },
    },
    setTimeout: (fn, ms) => { const id = nextTimer; nextTimer += 1; timers.set(id, { fn, ms }); return id; },
    clearTimeout: id => { timers.delete(id); },
  });
  vm.runInContext(suspendedJs, context, { filename: 'suspended.js' });
  const key = (name, target = body) => {
    const event = { key: name, target, prevented: false, preventDefault() { this.prevented = true; } };
    docListeners.keydown(event);
    return event;
  };
  return { els, body, document, replaced, timers, winListeners, key, status: () => els.get('status-text').textContent };
}

function testRestingPageRuns() {
  let page = restingPage();
  eq([page.status(), page.els.get('load-label').textContent, page.replaced.length], ['Not loaded yet', 'Load page', 0], 'a background placeholder waits, in the browser language');
  page.key('Enter');
  eq([page.replaced, page.status(), page.body.classList.contains('is-loading'), page.body.classList.contains('is-loaded')],
    [['https://example.com/a'], 'Loading…', true, false], 'Enter loads the page and shows Loading…, not Loaded, while it is fetched (S2)');
  page.winListeners.pagehide();
  eq([page.status(), page.els.get('load-label').textContent, page.body.classList.contains('is-loaded')], ['Loaded', 'Loaded', true], 'Loaded shows as the real page replaces this one');

  page = restingPage();
  page.key('Enter');
  const [stall] = [...page.timers.values()];
  ok(stall && stall.ms === 20000, 'a load that never leaves is released after 20 s');
  stall.fn();
  eq([page.status(), page.body.classList.contains('is-loading'), page.els.get('load-label').textContent], ['Couldn’t load. Try again.', false, 'Load page'], 'a stalled load says so and offers the button again');
  page.key('Enter');
  eq(page.replaced.length, 2, 'Retry loads again');

  page = restingPage();
  const change = page.els.get('change-link');
  change.closest = selector => (selector === 'a, button' ? change : null);
  const onLink = page.key('Enter', change);
  eq([onLink.prevented, page.replaced.length], [false, 0], 'Enter on the Change link opens it instead of loading the page');

  page = restingPage({ url: 'javascript:alert(1)' });
  page.key('Enter');
  eq([page.replaced.length, page.status()], [0, 'This page can’t be restored.'], 'only web and file addresses ever load');

  // S4: Locus's own language and motion settings win over the browser's.
  page = restingPage({ mirror: { language: 'zh-TW', anim: 'off' }, browser: 'en-US' });
  eq([page.status(), page.els.get('load-label').textContent, page.document.documentElement.lang, page.body.dataset.anim], ['尚未載入', '載入頁面', 'zh-TW', 'off'],
    'Locus set to 繁體中文 with animations off is followed in an English browser');
  page = restingPage({ mirror: { language: 'en' }, browser: 'zh-TW' });
  eq(page.status(), 'Not loaded yet', 'Locus set to English is followed in a Chinese browser');
  ok(/body\[data-anim="off"\] \.card, body\[data-anim="off"\]\.is-loading \.prog/.test(suspendedHtml), 'the page stops moving when Locus animations are off');
}

// Selectors checked against markup, not against themselves (R1, R3, S9/R5).
function cssRules(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), body: match[2] }));
}
function classesIn(selector) {
  return [...selector.replace(/\[[^\]]*\]/g, '').matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map(match => match[1]);
}
function testSelectorsMatchMarkup() {
  // R1: the popup writes data-theme on <html>, so its canvas layer must root there.
  const popupCss = read('popup.css');
  const popupJs = read('popup.js');
  const popupHtml = read('popup.html');
  ok(/document\.documentElement\.dataset\.theme = theme;/.test(popupJs) && /<html[^>]*\sdata-theme="/.test(popupHtml), 'the popup keeps its theme on <html>');
  ok(!/body\[data-theme\]/.test(popupCss), 'no popup rule waits for a data-theme on <body> that is never set');
  // The 2026-11 popup board rebuilt popup.css as one canvas layer. Its colour
  // tokens map the theme where the theme lives, on <html>.
  ok(popupCss.includes('TOOLBAR POPUP (2026-11 canvas board'), 'the popup canvas layer is present');
  const popupRules = cssRules(popupCss);
  const tokenRule = popupRules.find(rule => rule.selector === 'html[data-theme]' && /--pp-ground:\s*var\(--ground/.test(rule.body));
  ok(!!tokenRule && /--pp-card:\s*var\(--card/.test(tokenRule.body) && /--pp-where:\s*var\(--locator/.test(tokenRule.body), 'the popup tokens root on html[data-theme] and read the canvas palette');
  ok(popupRules.length >= 8, 'the popup canvas rules are present');
  const popupSources = `${popupHtml}\n${popupJs}`;
  const popupMissing = new Set();
  popupRules.forEach(rule => classesIn(rule.selector).forEach(name => {
    if (!new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(popupSources)) popupMissing.add(name);
  }));
  eq([...popupMissing], [], 'every class in popup.css exists in popup.html or popup.js');

  // R3: every class a new-tab canvas rule names exists in the markup or in the
  // scripts that build it. A class only made from a template literal is listed
  // with the template that makes it.
  const sources = [newtab, html, read('plan.js'), read('planner.js')].join('\n');
  const whenTone = /`today-card-when is-\$\{when\.tone\}`/;
  const captureKind = /`today-hl is-\$\{token\.kind\}/;
  const leaving = /classList\.add\(`is-leaving-\$\{choice\}`\)/;
  const templated = {
    'plan-lane-today': /`plan-lane plan-lane-\$\{lane\.id\}`/,
    'plan-lane-someday': /`plan-lane plan-lane-\$\{lane\.id\}`/,
    'is-anytime': whenTone,
    'is-when': whenTone,
    'is-where': captureKind,
    'is-leaving-today': leaving,
    'is-leaving-week': leaving,
    'is-leaving-someday': leaving,
    'is-leaving-archive': leaving,
    'is-leaving-skip': leaving,
  };
  const layer = cssRules(css.slice(css.lastIndexOf('/*', css.indexOf('TODAY BOARD (2026-11 canvas)'))))
    .filter(rule => /body\[data-theme\]|#toast|\.plan|\.today|\.wc-/.test(rule.selector));
  ok(layer.length > 200, 'the canvas layers were read');
  const missing = new Set();
  layer.forEach(rule => classesIn(rule.selector).forEach(name => {
    if (new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(sources)) return;
    if (templated[name] && templated[name].test(sources)) return;
    missing.add(name);
  }));
  eq([...missing].sort(), [], 'every class in the canvas layers exists in the markup or the scripts that build it');
  ok(!/\.cal-month \.cal-cell|\.cal-week \.cal-col/.test(css), 'the calendar layer targets .cal-grid .cal-cell and .cal-week-col');
  ok(/body\[data-theme\] \.archive-row\.selected \{[^}]*box-shadow: inset 4px 0 0 var\(--accent\);/.test(css), 'selected Archive rows keep their marker in the card layer (R2)');
  ok(/\.fnd-gi \{[^}]*background: var\(--fnd-hl\);[^}]*box-shadow: inset 0 0 0 1\.5px var\(--fnd-hl-ring\)/.test(css), 'Find again marks its selected row with the gliding highlight (R2)');
}

testWelcome();
testNoLandingLayer();
testRestingPage();
testRemainingSurfaces();
testRestingPageRuns();
testTodayClockUnchanged();
testPostmarkLanguage();
testSelectorsMatchMarkup();
console.log(`Canvas page contracts passed: ${checks} checks (Welcome envelope, stamp and localized postmark, no landing layer even with showLanding stored, Today's rolling clock run in a VM, resting page run in a VM, selectors checked against markup)`);
