/* Apply persisted display preferences before the main application initializes. */
(function () {
  var body = document.body;
  var mirror = {};
  try {
    mirror = JSON.parse(localStorage.getItem('te_settings_mirror') || '{}') || {};
  } catch (error) {}

  function supportedLanguage(value) {
    var language = String(value || 'en').trim();
    return /^zh(?:[-_]|$)/i.test(language) ? 'zh-TW' : 'en';
  }

  var language = supportedLanguage(
    mirror.language || (navigator.languages && navigator.languages[0]) || navigator.language || 'en'
  );
  document.documentElement.lang = language;

  var theme = mirror.theme;
  if (!theme) theme = 'folio';
  else if (theme === 'stow') theme = 'folio';
  else if (theme === 'stow-dark') theme = 'folio-dark';
  else if (theme === 'auto') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'folio-dark'
      : 'folio';
  }

  body.dataset.theme = theme;
  var darkThemes = {
    'folio-dark': 1, 'tabento-dark': 1, aurora: 1, dark: 1, dracula: 1,
    nord: 1, 'rose-pine': 1, 'tokyo-night': 1, 'solarized-dark': 1,
    gruvbox: 1, catppuccin: 1, mono: 1
  };
  body.dataset.themeMode = darkThemes[theme] ? 'dark' : 'light';
  body.dataset.size = mirror.size || 'normal';
  body.dataset.font = mirror.font || 'dm';
  if (mirror.anim === 'off') body.dataset.anim = 'off';

  var reducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mirror.anim !== 'off' && !reducedMotion) {
    body.classList.add('app-loading');
    setTimeout(function () {
      body.classList.remove('app-loading');
      body.classList.add('app-ready');
    }, 1000);
  }
})();
