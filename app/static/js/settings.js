/* Machine Hub User — Settings page logic */
(function () {
  'use strict';

  function $(sel) { return document.querySelector(sel); }

  function showToast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.classList.add('show');
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; }, 300);
    }, 1800);
  }

  function hideOverlay() {
    var o = $('#import-overlay');
    if (o) o.hidden = true;
  }

  function renderLastImport(ts) {
    var el = $('#set-last');
    if (!el) return;
    if (!ts) { el.textContent = 'Never'; return; }
    var d = new Date(ts);
    el.textContent = d.toLocaleString();
  }

  function loadStats() {
    if (!window.MH_DB) return;

    // Machines count
    window.MH_DB.count().then(function (n) {
      var el = $('#stat-machines');
      if (el) el.textContent = n;
    });

    // Favorites count
    if (window.MH_DB.favoritesCount) {
      window.MH_DB.favoritesCount().then(function (n) {
        var el = $('#stat-favorites');
        if (el) el.textContent = n;
      });
    }

    // Searches count
    try {
      var recents = JSON.parse(localStorage.getItem('mh_recent') || '[]');
      var el = $('#stat-searches');
      if (el) el.textContent = recents.length;
    } catch (e) {}

    // Shops chart — group by shop_code
    window.MH_DB.getAll().then(function (all) {
      var shops = {};
      all.forEach(function (m) {
        var s = m.shop_code || 'N/A';
        shops[s] = (shops[s] || 0) + 1;
      });

      // Unique shops count
      var uniqueShops = Object.keys(shops).length;
      var shopsEl = $('#stat-shops');
      if (shopsEl) shopsEl.textContent = uniqueShops;

      // Render chart
      var chart = $('#shops-chart');
      if (!chart) return;

      var entries = Object.keys(shops).map(function (k) {
        return { shop: k, count: shops[k] };
      }).sort(function (a, b) { return b.count - a.count; }).slice(0, 8);

      if (!entries.length) {
        chart.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:13px;">No data — import Excel first</div>';
        return;
      }

      var max = entries[0].count;
      var html = '<div class="shops-chart-title">Machines per Shop</div>';
      entries.forEach(function (e) {
        var pct = Math.round((e.count / max) * 100);
        html += '<div class="shop-bar">' +
          '<div class="shop-bar-label">' + escHtml(e.shop) + '</div>' +
          '<div class="shop-bar-track">' +
          '<div class="shop-bar-fill" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<div class="shop-bar-value">' + e.count + '</div>' +
          '</div>';
      });
      chart.innerHTML = html;
    }).catch(function (err) {
      console.warn('[Stats]', err);
    });
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function refreshData() {
    if (!window.MH_DB) return;
    window.MH_DB.count().then(function (n) {
      var el = $('#set-count');
      if (el) el.textContent = n + ' machines';
    });
    window.MH_DB.getMeta('last_import').then(renderLastImport);
    loadStats();
  }

  function bindTheme() {
    var toggle = $('#theme-toggle');
    if (!toggle) return;
    var current = (window.MH_THEME && window.MH_THEME.get) ? window.MH_THEME.get() : 'auto';

    toggle.querySelectorAll('[data-theme-val]').forEach(function (b) {
      if (b.getAttribute('data-theme-val') === current) b.classList.add('active');
      b.addEventListener('click', function () {
        var val = b.getAttribute('data-theme-val');
        if (window.MH_THEME && window.MH_THEME.set) {
          window.MH_THEME.set(val);
        } else {
          document.documentElement.setAttribute('data-theme', val === 'auto' ? 'dark' : val);
          try { localStorage.setItem('mh_theme', val); } catch (e) {}
        }
        toggle.querySelectorAll('[data-theme-val]').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        try { window.MH_HAPTIC && window.MH_HAPTIC.light(); } catch (e) {}
        var label = val === 'auto' ? 'Auto (system)' : val.charAt(0).toUpperCase() + val.slice(1);
        showToast('Theme: ' + label);
      });
    });
  }

  function confirmReplace() {
    return window.MH_DB.count().then(function (n) {
      if (n === 0) return true;
      if (!window.MH_MODAL) return true;
      return window.MH_MODAL.confirm({
        icon: '⚠️',
        variant: 'danger',
        title: 'Data အဟောင်း ပျက်မယ်',
        desc: 'လက်ရှိ <strong>' + n + ' machines</strong> ရှိနေပါတယ်။<br>' +
              'Import လုပ်ရင် အဟောင်း data အားလုံး ပျက်သွားမယ်။',
        cancelText: 'Cancel',
        confirmText: 'Replace',
      });
    });
  }

  function handleImport(file) {
    confirmReplace().then(function (ok) {
      if (!ok) { showToast('Import cancelled'); return; }
      doImport(file);
    });
  }

  function doImport(file) {
    var overlay = $('#import-overlay');
    var status = $('#import-status');
    if (overlay) overlay.hidden = false;
    if (status) status.textContent = 'Excel ဖတ်နေတယ်...';

    var safety = setTimeout(function () {
      hideOverlay();
      showToast('⏱ Timeout');
    }, 30000);

    if (typeof XLSX === 'undefined') {
      clearTimeout(safety);
      hideOverlay();
      showToast('❌ SheetJS not loaded');
      return;
    }

    window.MH_EXCEL.parseFile(file).then(function (rows) {
      if (status) status.textContent = 'Processing...';
      var result = window.MH_EXCEL.toRecords(rows);
      if (!result.records.length) throw new Error('No valid rows');
      if (status) status.textContent = 'Saving ' + result.records.length + '...';
      return window.MH_DB.clear()
        .then(function () { return window.MH_DB.putAll(result.records); })
        .then(function () { return window.MH_DB.setMeta('last_import', Date.now()); })
        .then(function () { return result; });
    }).then(function (result) {
      clearTimeout(safety);
      hideOverlay();
      var skip = (result.invalid || 0) + (result.duplicate || 0);
        try { window.MH_HAPTIC && window.MH_HAPTIC.success(); } catch (e) {}
      showToast('✅ Import OK — ' + result.records.length + (skip > 0 ? ' (' + skip + ' skipped)' : ''));
      refreshData();
    }).catch(function (err) {
      clearTimeout(safety);
      hideOverlay();
      try { window.MH_HAPTIC && window.MH_HAPTIC.error(); } catch (e) {}
      showToast('❌ ' + (err.message || 'fail'));
      console.error(err);
    });
  }

  function bindFont() {
    var toggle = $('#font-toggle');
    if (!toggle) return;
    var FONT_KEY = 'mh_font';
    var current = 'md';
    try { current = localStorage.getItem(FONT_KEY) || 'md'; } catch (e) {}
    if (['sm','md','lg'].indexOf(current) < 0) current = 'md';

    toggle.querySelectorAll('[data-font-val]').forEach(function (b) {
      if (b.getAttribute('data-font-val') === current) b.classList.add('active');
      b.addEventListener('click', function () {
        var val = b.getAttribute('data-font-val');
        try { localStorage.setItem(FONT_KEY, val); } catch (e) {}
        document.documentElement.setAttribute('data-font', val);
        toggle.querySelectorAll('[data-font-val]').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        try { window.MH_HAPTIC && window.MH_HAPTIC.light(); } catch (e) {}
        var label = val === 'sm' ? 'Small' : val === 'lg' ? 'Large' : 'Medium';
        showToast('Font: ' + label);
      });
    });
  }

  function bindData() {
    var reBtn = $('#btn-reimport-2');
    var reInput = $('#file-input-3');
    if (reBtn && reInput) {
      reBtn.addEventListener('click', function () { reInput.click(); });
      reInput.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (f) handleImport(f);
        e.target.value = '';
      });
    }

    var clearHistBtn = $('#btn-clear-history');
    if (clearHistBtn) {
      clearHistBtn.addEventListener('click', function () {
        var ask = window.MH_MODAL
          ? window.MH_MODAL.confirm({
              icon: '🗑',
              variant: 'danger',
              title: 'Search History ဖျက်မယ်',
              desc: 'Recent searches အားလုံး ဖျက်မှာ သေချာလား?',
              cancelText: 'Cancel',
              confirmText: 'Clear',
            })
          : Promise.resolve(confirm('Clear history?'));
        ask.then(function (ok) {
          if (!ok) return;
          try { localStorage.removeItem('mh_recent'); } catch (e) {}
          showToast('✅ History cleared');
        });
      });
    }

    var clearBtn = $('#btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        var ask = window.MH_MODAL
          ? window.MH_MODAL.confirm({
              icon: '🗑',
              variant: 'danger',
              title: 'Data အားလုံး ဖျက်မယ်',
              desc: 'Machines အားလုံး ဖျက်မှာ သေချာလား?<br>ဒါကို ပြန်ယူလို့ မရပါ။',
              cancelText: 'Cancel',
              confirmText: 'Delete',
            })
          : Promise.resolve(window.confirm('Data အားလုံး ဖျက်မှာ သေချာလား?'));

        ask.then(function (ok) {
          if (!ok) return;
          window.MH_DB.clear().then(function () {
            window.MH_DB.setMeta('last_import', null);
            showToast('✅ Data cleared');
            refreshData();
          });
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.MH_DB) return;
    window.MH_DB.open().then(function () {
      bindTheme();
      bindFont();
      bindData();
      refreshData();
      loadStats();
      console.log('[Settings] ready');
    });
  });
})();
