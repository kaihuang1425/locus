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
  if (titleEl) titleEl.textContent = title || 'Saved tab';
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

  var loading = false;
  function load() {
    if (loading || !url) return;
    var st = document.getElementById('status-text');
    if (!navigable) {
      if (st) st.textContent = 'This page can’t be restored.';
      return;
    }
    loading = true;
    if (st) st.textContent = 'Loading page…';
    try {
      location.replace(url);
    } catch (e) {
      loading = false;
      if (st) st.textContent = 'Failed to load. Click to retry.';
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

  document.body.addEventListener('click', load);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); load(); }
  });
  var btn = document.getElementById('load-btn');
  if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); load(); });
})();
