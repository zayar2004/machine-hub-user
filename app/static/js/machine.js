/* Machine Hub User — Machine detail page */
(function () {
  'use strict';

  function $(s) { return document.querySelector(s); }

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

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('📋 Copied: ' + text);
      }).catch(function () { fallback(text); });
    } else { fallback(text); }
  }
  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('📋 Copied'); }
    catch (e) { showToast('Copy fail'); }
    document.body.removeChild(ta);
  }

  function getCode() {
    // Extract from URL: /machine/<code>
    var parts = window.location.pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1] || '');
  }

  function render(record) {
    $('#machine-loading').hidden = true;
    $('#machine-error').hidden = true;
    $('#machine-content').hidden = false;

    $('#m-code').textContent = record.machine_code || '—';
    $('#m-name').textContent = record.machine_name || '—';

    if (record.shop_code) {
      $('#m-shop').textContent = record.shop_code;
    } else {
      $('#m-shop-row').hidden = true;
    }

    if (record.description) {
      $('#m-desc').textContent = record.description;
    } else {
      $('#m-desc-row').hidden = true;
    }

    $('#m-copy').addEventListener('click', function () { copyText(record.machine_code); });
    $('#m-copy-2').addEventListener('click', function () { copyText(record.machine_code); });

    // Favorite toggle
    var favBtn = document.getElementById('m-fav');
    if (favBtn && window.MH_DB) {
      window.MH_DB.isFavorite(record.machine_code).then(function (isFav) {
        if (isFav) favBtn.classList.add('active');
      });
      favBtn.addEventListener('click', function () {
        window.MH_DB.toggleFavorite(record).then(function (nowFav) {
          favBtn.classList.toggle('active', nowFav);
          showToast(nowFav ? '⭐ Added to favorites' : 'Removed from favorites');
          try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
        });
      });
    }

    var shareBtn = $('#m-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var text = record.machine_code + ' — ' + record.machine_name;
        if (navigator.share) {
          navigator.share({ title: 'Machine', text: text }).catch(function () {});
        } else {
          copyText(text);
        }
      });
    }
  }

  function showError() {
    $('#machine-loading').hidden = true;
    $('#machine-content').hidden = true;
    $('#machine-error').hidden = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.MH_DB) return;
    var code = getCode();
    if (!code) { showError(); return; }

    window.MH_DB.open().then(function () {
      return window.MH_DB.getAll();
    }).then(function (all) {
      var found = all.find(function (r) { return r.machine_code === code; });
      if (found) render(found);
      else showError();
    }).catch(function (err) {
      console.error(err);
      showError();
    });
  });
})();
