'use strict';

// Contract test for the 2026-11 canvas pages built on existing surfaces:
// Welcome (envelope and stamp), the calm new tab (split-flap clock, three recent
// pages, light option), and the resting page. It checks that the redesign kept
// each surface's behaviour and IDs, and that every new string is bilingual.

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

function testCalmNewTab() {
  ok(/<div id="landing-flip" class="landing-flip" role="img" aria-label=""><\/div>/.test(html), 'the flip clock is one labelled image');
  ok(/flip\.setAttribute\('aria-label', tr\('landing\.timeLabel'/.test(newtab), 'the clock label carries the time');
  ok(/function paintLandingFlip\(now = new Date\(\)\) \{/.test(newtab) && /\n  paintLandingFlip\(now\);\n\}/.test(newtab), 'the existing clock updater paints the flip');
  ok(/openSavedTabItem\(row\.item, \{ opener: button \}\);/.test(newtab), 'recent pages open through the shared Reopen coordinator');
  ok(/\.filter\(row => isOpenableSavedTabUrl\(row\.item\.url\)\)[\s\S]*\.slice\(0, 3\)/.test(newtab), 'three recent pages, only ones Reopen accepts');
  ok(/localStorage\.getItem\('locus\.landing\.tone'\) === 'light' \? 'light' : 'dark'/.test(newtab), 'dark by default; the light option is per device');
  ok(/if \(landingToday\) landingToday\.onclick = \(\) => closeLandingLayer\(\);/.test(newtab), 'Show Today instead reveals Today');
  for (const id of ['landing-search-input', 'landing-search-results', 'landing-unsorted', 'landing-unsorted-count', 'landing-reminders', 'landing-enter', 'landing-time', 'landing-date']) {
    eq((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `#${id} is kept`);
  }
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.fl-card\.is-flipping \.fl-ftop,/.test(css), 'the flip stops under reduced motion');
  const strings = i18n();
  for (const key of ['landing.recent', 'landing.showToday', 'landing.light', 'landing.dark', 'landing.timeLabel']) {
    ok(strings.en[key] && strings['zh-TW'][key], `${key} exists in English and zh-TW`);
  }
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
  ok(/<span class="kb" aria-hidden="true">Enter<\/span>/.test(suspendedHtml), 'the button shows the Enter hint');
  ok(/document\.body\.classList\.add\('is-loaded'\);/.test(suspendedJs), 'Loaded is shown as the page loads');
  ok(/<link rel="stylesheet" href="media\/fonts\/fonts\.css">/.test(suspendedHtml), 'bundled fonts only');
  ok(!/https?:\/\/(?!127\.0\.0\.1)/.test(suspendedHtml), 'no external resources');
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(suspendedHtml), 'reduced motion is respected');
}

testWelcome();
testCalmNewTab();
testRestingPage();
console.log(`Canvas page contracts passed: ${checks} checks (Welcome envelope and stamp, calm new tab clock, recent pages and tone, resting page copy and loading)`);
