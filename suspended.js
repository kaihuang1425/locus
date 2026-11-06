/* Suspended-tab loader. Runs on suspended.html. */
(function () {
  function parseFragment() {
    var hash = location.hash.slice(1);
    var params = new URLSearchParams(hash);
    return {
      url:   params.get('url')   || '',
      title: params.get('title') || '',
      fav:   params.get('fav')   || ''
    };
  }
  // This page is on the extension origin, so it can read the settings mirror
  // the new tab writes (prepaint.js reads the same one): Locus's language and
  // motion choice come first, the browser language only when there is none.
  var mirror = {};
  try { mirror = JSON.parse(localStorage.getItem('te_settings_mirror') || '{}') || {}; } catch (e) { mirror = {}; }
  var language = String(mirror.language || (navigator.languages && navigator.languages[0]) || navigator.language || '');
  var zh = /^zh(?:[-_]|$)/i.test(language);
  if (mirror.anim === 'off' && document.body) document.body.dataset.anim = 'off';
  var copy = zh ? {
    rest: '尚未載入', load: '載入頁面', loading: '載入中…', loaded: '已載入',
    note: '以預留頁開啟', change: '變更', untitled: '已儲存的頁面',
    cannot: '這個頁面無法還原。', failed: '無法載入，請再試一次。'
  } : {
    rest: 'Not loaded yet', load: 'Load page', loading: 'Loading…', loaded: 'Loaded',
    note: 'Opened as a placeholder', change: 'Change', untitled: 'Saved page',
    cannot: 'This page can’t be restored.', failed: 'Couldn’t load. Try again.'
  };
  if (zh) document.documentElement.lang = 'zh-TW';
  var setText = function (id, text) { var el = document.getElementById(id); if (el) el.textContent = text; };
  setText('status-text', copy.rest);
  setText('load-label', copy.load);
  setText('placeholder-note', copy.note);
  setText('change-link', copy.change);
  var data = parseFragment();
  var url = data.url, title = data.title, fav = data.fav;

  if (title) document.title = title;
  else if (url) {
    try { document.title = new URL(url).hostname; } catch (e) { document.title = 'Loading…'; }
  }

  function setFavicon(href) {
    var link = document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    document.head.appendChild(link);
  }
  var favHref = '';
  if (url) {
    try {
      var page = new URL(url);
      if (/^https?:$/.test(page.protocol)) {
        var endpoint = new URL(chrome.runtime.getURL('_favicon/'));
        endpoint.searchParams.set('pageUrl', page.href);
        endpoint.searchParams.set('size', '64');
        favHref = endpoint.href;
      }
    } catch (e) {}
  }
  var favEl = document.getElementById('fav');
  if (favHref) {
    setFavicon(favHref);
    if (favEl) favEl.src = favHref;
  } else if (favEl) {
    favEl.style.display = 'none';
  }

  var titleEl = document.getElementById('title');
  if (titleEl) titleEl.textContent = title || copy.untitled;
  var urlEl = document.getElementById('url');
  if (urlEl) {
    try {
      var u = new URL(url);
      urlEl.textContent = u.hostname + u.pathname.slice(0, 80);
    } catch (e) {
      urlEl.textContent = url;
    }
  }

  // suspended.html isn't web-accessible, so `url` normally comes from a real
  // hibernated tab (always http/https). Still, only ever navigate to a genuine
  // web location — never let a crafted fragment turn this into a javascript:,
  // data:, or blob: navigation on the extension page.
  var navigable = /^(?:https?|ftp|file):/i.test(url);

  // "Loading…" stays while the real page is fetched; "Loaded" shows only as
  // this page is replaced by it (pagehide). If the tab is still here after
  // LOAD_STALL_MS, the load is released so the button can try again.
  var LOAD_STALL_MS = 20000;
  var loading = false;
  var stallTimer = null;
  function markLoaded() {
    var st = document.getElementById('status-text');
    document.body.classList.add('is-loaded');
    if (st) st.textContent = copy.loaded;
    setText('load-label', copy.loaded);
  }
  function release(message) {
    var st = document.getElementById('status-text');
    loading = false;
    clearTimeout(stallTimer);
    window.removeEventListener('pagehide', markLoaded);
    document.body.classList.remove('is-loading', 'is-loaded');
    if (st) st.textContent = message;
    setText('load-label', copy.load);
  }
  function load() {
    if (loading || !url) return;
    var st = document.getElementById('status-text');
    if (!navigable) {
      if (st) st.textContent = copy.cannot;
      return;
    }
    loading = true;
    document.body.classList.add('is-loading');
    if (st) st.textContent = copy.loading;
    setText('load-label', copy.loading);
    window.addEventListener('pagehide', markLoaded);
    clearTimeout(stallTimer);
    stallTimer = setTimeout(function () { if (loading) release(copy.failed); }, LOAD_STALL_MS);
    try {
      location.replace(url);
    } catch (e) {
      release(copy.failed);
    }
  }

  function isForeground() {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  if (isForeground()) {
    load();
  } else {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') load();
    });
    window.addEventListener('focus', load);
    window.addEventListener('pageshow', function () { if (isForeground()) load(); });
  }

  document.body.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('a')) load(); });
  document.addEventListener('keydown', function (e) {
    // Links and buttons answer their own keys (Change opens Locus; Load page
    // clicks itself); anywhere else, Enter or Space loads the page.
    if (e.target && e.target.closest && e.target.closest('a, button')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); load(); }
  });
  var btn = document.getElementById('load-btn');
  if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); load(); });
})();
