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

  function refreshData() {
    if (!window.MH_DB) return;
    window.MH_DB.count().then(function (n) {
      var el = $('#set-count');
      if (el) el.textContent = n + ' machines';
    });
    window.MH_DB.getMeta('last_import').then(renderLastImport);
  }

  function bindTheme() {
    var toggle = $('#theme-toggle');
    if (!toggle) return;
    var current = document.documentElement.getAttribute('data-theme') || 'dark';

    toggle.querySelectorAll('[data-theme-val]').forEach(function (b) {
      if (b.getAttribute('data-theme-val') === current) b.classList.add('active');
      b.addEventListener('click', function () {
        var val = b.getAttribute('data-theme-val');
        document.documentElement.setAttribute('data-theme', val);
        try { localStorage.setItem('mh_theme', val); } catch (e) {}
        toggle.querySelectorAll('[data-theme-val]').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        showToast('Theme: ' + val);
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
        showToast('✅ Import OK — ' + result.records.length + (skip > 0 ? ' (' + skip + ' skipped)' : ''));
      refreshData();
    }).catch(function (err) {
      clearTimeout(safety);
      hideOverlay();
      showToast('❌ ' + (err.message || 'fail'));
      console.error(err);
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
      bindData();
      refreshData();
      console.log('[Settings] ready');
    });
  });
})();
