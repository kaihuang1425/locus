const fs=require('fs'),vm=require('vm');
const s=fs.readFileSync(require('path').join(__dirname, '../newtab.js'),'utf8').replace(/\ninit\(\);\s*$/, '');
const noop=()=>{};
const ctx=vm.createContext({console,URL,URLSearchParams,setTimeout:()=>0,clearTimeout:noop,setInterval:()=>0,clearInterval:noop,structuredClone, navigator:{language:'en'},document:{addEventListener:noop,getElementById:()=>null,querySelectorAll:()=>[]},window:{addEventListener:noop},chrome:{runtime:{getURL:p=>p}},localStorage:{getItem:()=>null,setItem:noop}});
try{vm.runInContext(s,ctx); console.log('Full source evaluated');}catch(e){console.error(e);process.exit(1)}
ctx.assert=require('assert/strict');
vm.runInContext(`
(async () => {
  let persisted = null, failWrite = false, removed = [], events = [], messages = [];
  chrome.storage = { local: {
    get: async () => persisted ? {te:structuredClone(persisted)} : {},
    set: async o => { events.push('write'); if (failWrite) throw Error('quota'); persisted=structuredClone(o.te); },
  }};
  chrome.tabs = { remove: async id => { events.push('close'); removed.push(id); }, query: async () => [{id:4,title:'Research',url:'https://example.org/paper'}] };
  renderBoard=()=>{}; updateNavChrome=()=>{}; refreshStorageUsage=()=>{};
  handleStorageError=()=>{}; toast=m=>messages.push(m);
  assert.equal(State.get().settings.showLanding,false);
  assert.equal(State.get().settings.railCollapsed,true);
  const cat={id:'c',name:'Research',groups:[]};
  const state=State.get(); state.workspaces=[{id:'w',name:'Work',activeCatId:'c',categories:[cat]}];state.activeWsId='w';
  state.settings.closeTabOnSave=true;
  assert.equal(await saveTabToInbox({id:4,title:'Research',url:'https://example.org/paper'}),true);
  assert.equal(cat.groups[0].items.length,1);
  assert.deepEqual(events,['write','close']);
  assert.equal(persisted.workspaces[0].categories[0].groups[0].items.length,1);
  assert.equal(await saveTabToInbox({id:5,title:'Duplicate',url:'https://example.org/paper'}),true);
  assert.equal(cat.groups[0].items.length,1); assert.equal(removed.length,1);
  failWrite=true; events=[];
  assert.equal(await saveTabToInbox({id:6,title:'Fails',url:'https://example.org/fail'}),false);
  assert.equal(cat.groups[0].items.length,1); assert.deepEqual(events,['write']); assert.equal(removed.length,1);
  cat.groups=[];
  assert.equal(await saveTabToInbox({id:7,title:'Fails new inbox',url:'https://example.org/new'}),false);
  assert.equal(cat.groups.length,0);
  failWrite=false;
  persisted={...structuredClone(state),settings:{theme:'folio',profile:{name:'Kai'},plugins:{habits:true},viewMode:'canvas'}};
  await State.load();
  assert.equal(State.get().settings.showLanding,true); assert.equal(State.get().settings.railCollapsed,false);
  persisted.settings.showLanding=false;persisted.settings.railCollapsed=true;
  await State.load();
  assert.equal(State.get().settings.showLanding,false); assert.equal(State.get().settings.railCollapsed,true);
  let hidden=false, restored=0, home=0;
  const ov={classList:{contains:()=>hidden,add:()=>{hidden=true},remove:()=>{hidden=false}},addEventListener:()=>{}};
  const elements={welcome:ov,'wc-next':{},'wc-skip':{}};
  document.getElementById=id=>elements[id]||null;
  unlockBodyScroll=()=>{}; restoreOpener=()=>restored++; goHome=()=>home++;
  _landingAfterWelcome=true;
  bindWelcome(); elements['wc-skip'].onclick();
  assert.equal(hidden,true); assert.equal(home,1); assert.equal(restored,1);
  assert.equal(_landingAfterWelcome,false);
  assert.equal(State.get().settings.onboarding.welcomeSeen,true);
  assert.equal(State.get().settings.profile.name,'Kai'); assert.equal(State.get().settings.plugins.habits,true);
  assert.equal(State.get().settings.viewMode,'canvas');
  let menu=[], navigated=0;
  showContextMenu=(x,y,items)=>{menu=items};
  openInboxView=()=>navigated++;
  const btn={isConnected:true,setAttribute:()=>{},removeAttribute:()=>{},getBoundingClientRect:()=>({left:10,bottom:30})};
  await openSaveTabMenu(btn);
  assert.equal(menu.length,2); assert.ok(menu[0].label.includes('Research'));
  await menu[1].action(); assert.equal(navigated,1);
  chrome.tabs.query=async()=>[];await openSaveTabMenu(btn);assert.equal(messages.at(-1),tr('ux.noTabs'));
  chrome.tabs.query=async()=>{throw Error('tabs')};await openSaveTabMenu(btn);assert.equal(messages.at(-1),tr('ux.tabError'));
  for(const lang of ['en','zh-TW']) for(const key of Object.keys(I18N.en).filter(k=>k.startsWith('ux.'))) assert.ok(I18N[lang][key],lang+key);
  console.log('PASS: new/legacy preferences, durable capture order, duplicates, failure rollback, welcome dismissal, preference preservation, real tab picker, empty/error states, bilingual new keys');
})().catch(e=>{console.error(e); globalThis.failed=true;});
`,ctx);
setTimeout(()=>{if(ctx.failed)process.exit(1)},100);
