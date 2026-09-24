/* Machine Hub User — Theme manager (auto/dark/light) */
(function () {
  'use strict';

  var KEY = 'mh_theme';
  var MODES = ['auto', 'dark', 'light'];

  function getMode() {
    try {
      var m = localStorage.getItem(KEY) || 'auto';
      return MODES.indexOf(m) >= 0 ? m : 'auto';
    } catch (e) { return 'auto'; }
  }

  function setMode(mode) {
    if (MODES.indexOf(mode) < 0) mode = 'auto';
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    apply();
  }

  function systemPrefers() {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) { return 'dark'; }
  }

  function effectiveTheme() {
    var mode = getMode();
    if (mode === 'auto') return systemPrefers();
    return mode;
  }

  function apply() {
    var t = effectiveTheme();
    document.documentElement.setAttribute('data-theme', t);
  }

  // Watch system changes (auto mode)
  try {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var handler = function () {
      if (getMode() === 'auto') apply();
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.attachListener) mq.attachListener(handler);
  } catch (e) {}

  // Apply immediately (before DOM)
  apply();

  window.MH_THEME = {
    get: getMode,
    set: setMode,
    effective: effectiveTheme,
    apply: apply,
  };

  console.log('[MH_THEME] mode:', getMode());
})();
