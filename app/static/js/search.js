/* Machine Hub User — Home + Search */
(function () {
  'use strict';

  var RECENT_KEY = 'mh_recent';
  var RECENT_MAX = 5;
  var DEFAULT_CHIPS = ['Dream', 'Aladdin', 'Avengers', 'Claw'];

  function $(sel) { return document.querySelector(sel); }

  function haptic(type) {
    if (window.MH_HAPTIC && window.MH_HAPTIC[type]) {
      window.MH_HAPTIC[type]();
    } else {
      try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  var _undoTimer = null;

  function showUndoToast(msg, backup, prevCount) {
    var el = $('#toast');
    if (!el) return;
    if (!backup || !prevCount) {
      // No previous data — no undo
      showToast(msg);
      return;
    }
    // Build undo toast
    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;">' +
      '<span>' + msg + '</span>' +
      '<button type="button" class="undo-btn" id="undo-btn">UNDO</button>' +
      '</div>';
    el.hidden = false;
    el.classList.add('show');
    if (_undoTimer) clearTimeout(_undoTimer);
    _undoTimer = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; el.textContent = ''; }, 300);
    }, 5000);

    var btn = document.getElementById('undo-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (_undoTimer) clearTimeout(_undoTimer);
        haptic('light');
        window.MH_DB.restore(backup).then(function () {
          showToast('↩ Restored ' + prevCount + ' machines');
          refreshUI();
        });
        el.classList.remove('show');
        setTimeout(function () { el.hidden = true; el.textContent = ''; }, 300);
      });
    }
  }

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

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'မင်္ဂလာမနက်ခင်း';
    if (h < 17) return 'မင်္ဂလာနေ့လည်ခင်း';
    if (h < 20) return 'မင်္ဂလာညနေခင်း';
    return 'မင်္ဂလာည';
  }

  function renderGreeting() {
    var el = $('#greeting .greeting-title');
    if (el) el.textContent = greeting() + ' 👋';
  }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function pushRecent(q) {
    if (!q) return;
    var list = getRecent().filter(function (x) { return x !== q; });
    list.unshift(q);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); }
    catch (e) {}
  }

  function renderFavorites() {
    var el = $('#favorites-list');
    var section = $('#favorites-section');
    if (!el || !section || !window.MH_DB.listFavorites) return;
    window.MH_DB.listFavorites().then(function (list) {
      if (!list.length) {
        section.hidden = true;
        return;
      }
      section.hidden = false;
      var top = list.slice(0, 5);
      el.innerHTML = top.map(function (f) {
        return '<a href="/machine/' + encodeURIComponent(f.machine_code) + '" class="favorite-item">' +
          '<span class="icon-star"><svg class="icon"><use href="#i-star"/></svg></span>' +
          '<div class="favorite-item-text">' +
          '<div class="favorite-item-code">' + esc(f.machine_code) + '</div>' +
          (f.machine_name && f.machine_name !== f.machine_code
            ? '<div class="favorite-item-name">' + esc(f.machine_name) + '</div>'
            : '') +
          '</div>' +
          '<svg class="icon" style="color:var(--text-4);"><use href="#i-chevron-right"/></svg>' +
          '</a>';
      }).join('');
    }).catch(function (err) { console.warn('[Fav]', err); });
  }

  function removeRecent(q) {
    haptic('light');
    var list = getRecent().filter(function (x) { return x !== q; });
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {}
    renderRecent();
    showToast('Removed: ' + q);
  }

  function clearAllRecent() {
    try { localStorage.removeItem(RECENT_KEY); } catch (e) {}
    renderRecent();
    showToast('History cleared');
  }

  function renderRecent() {
    var el = $('#recent-list');
    var section = $('#recent-section');
    if (!el || !section) return;
    var list = getRecent();
    if (!list.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    el.innerHTML = list.map(function (q) {
      return '<div class="recent-item-wrap">' +
        '<button type="button" class="recent-item" data-recent="' + esc(q) + '">' + esc(q) + '</button>' +
        '<button type="button" class="recent-del" data-del="' + esc(q) + '" aria-label="Remove">×</button>' +
        '</div>';
    }).join('');

    el.querySelectorAll('[data-recent]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-recent');
        var input = $('#search-input');
        if (input) { input.value = q; doSearch(q); }
      });
    });

    el.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        removeRecent(b.getAttribute('data-del'));
      });
    });
  }

  function renderChips() {
    var el = $('#chips');
    if (!el) return;
    el.innerHTML = DEFAULT_CHIPS.map(function (c) {
      return '<button type="button" class="chip" data-chip="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    el.querySelectorAll('[data-chip]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-chip');
        var input = $('#search-input');
        if (input) { input.value = q; doSearch(q); }
      });
    });
  }

  function renderResults(results, query) {
    var el = $('#results');
    var recent = $('#recent-section');
    var actions = $('#quick-actions');
    if (!el) return;

    if (!query) {
      el.innerHTML = '';
      if (recent) recent.hidden = false;
      if (actions) actions.hidden = false;
      return;
    }

    if (recent) recent.hidden = true;
    if (actions) actions.hidden = true;

    if (!results.length) {
      el.innerHTML =
        '<div class="no-results">' +
        '<div class="no-results-icon">🔍</div>' +
        '<div class="no-results-title">"' + esc(query) + '" မတွေ့ပါ</div>' +
        '<div class="no-results-sub">အခြား code / name စမ်းပါ</div>' +
        '</div>';
      return;
    }

    el.innerHTML =
      '<div class="result-count">' + results.length + ' ခု တွေ့ပါ</div>' +
      results.map(function (r) {
        return '<div class="result-card" data-code="' + esc(r.machine_code) + '">' +
          '<div class="result-card-actions">' +
          '<button type="button" class="swipe-action swipe-action-fav" data-fav="' + esc(r.machine_code) + '">' +
          '<svg class="icon"><use href="#i-star"/></svg>Fav</button>' +
          '<button type="button" class="swipe-action swipe-action-share" data-share="' + esc(r.machine_code) + '">' +
          '<svg class="icon"><use href="#i-share"/></svg>Share</button>' +
          '<button type="button" class="swipe-action swipe-action-detail" data-detail="' + esc(r.machine_code) + '">' +
          '<svg class="icon"><use href="#i-arrow-right"/></svg>Detail</button>' +
          '</div>' +
          '<div class="result-card-inner">' +
          '<div class="result-code">' + esc(r.machine_code) + '</div>' +
          '<div class="result-name">' + esc(r.machine_name) + '</div>' +
          (r.shop_code ? '<div class="result-shop">' + esc(r.shop_code) + '</div>' : '') +
          '<div class="result-actions">' +
          '<button type="button" class="btn-copy" data-copy="' + esc(r.machine_code) + '">' +
          '<svg class="icon"><use href="#i-copy"/></svg> Copy</button>' +
          '<a href="/machine/' + encodeURIComponent(r.machine_code) + '" class="btn-copy" style="text-decoration:none;">' +
          '<svg class="icon"><use href="#i-arrow-right"/></svg> Details</a>' +
          '</div></div></div>';
      }).join('');

    // Bind share buttons
    el.querySelectorAll('[data-share]').forEach(function (b) {
      var code = b.getAttribute('data-share');
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var rec = results.find(function (x) { return x.machine_code === code; });
        if (!rec) return;
        var text = rec.machine_code +
          (rec.machine_name && rec.machine_name !== rec.machine_code ? ' — ' + rec.machine_name : '') +
          (rec.shop_code ? ' (' + rec.shop_code + ')' : '');
        if (navigator.share) {
          navigator.share({ title: 'Machine', text: text }).catch(function () {});
        } else {
          copyText(text);
        }
      });
    });

    // Bind swipe favorite
    el.querySelectorAll('[data-fav]').forEach(function (b) {
      var code = b.getAttribute('data-fav');
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var rec = results.find(function (x) { return x.machine_code === code; });
        if (!rec) return;
        window.MH_DB.toggleFavorite(rec).then(function (nowFav) {
          showToast(nowFav ? '⭐ Added to favorites' : 'Removed from favorites');
          haptic('light');
          renderFavorites();
          // Reset card swipe
          var card = b.closest('.result-card');
          if (card) {
            var inner = card.querySelector('.result-card-inner');
            if (inner) inner.style.transform = 'translateX(0)';
          }
        });
      });
    });

    // Bind swipe detail
    el.querySelectorAll('[data-detail]').forEach(function (b) {
      var code = b.getAttribute('data-detail');
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        location.href = '/machine/' + encodeURIComponent(code);
      });
    });

    // Bind swipe gestures
    bindSwipeCards(el);
    bindLongPress(el);

    el.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        copyText(b.getAttribute('data-copy'));
      });
    });
  }

  function copyText(text) {
    haptic('medium');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('📋 Copied: ' + text);
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('📋 Copied: ' + text); }
    catch (e) { showToast('Copy fail'); }
    document.body.removeChild(ta);
  }

  function match(record, query) {
    var q = query.toLowerCase().trim();
    if (!q) return false;
    if ((record.code_lower || '').indexOf(q) >= 0) return true;
    if ((record.name_lower || '').indexOf(q) >= 0) return true;
    return false;
  }

  function doSearch(query) {
    if (!window.MH_DB) return;

    if (!query || !query.trim()) {
      renderResults([], '');
      return;
    }

    window.MH_DB.getAll().then(function (all) {
      var matches = all.filter(function (r) { return match(r, query); });
      var q = query.toLowerCase().trim();
      matches.sort(function (a, b) {
        if (a.code_lower === q && b.code_lower !== q) return -1;
        if (b.code_lower === q && a.code_lower !== q) return 1;
        return 0;
      });
      renderResults(matches.slice(0, 50), query);
      pushRecent(query);
    }).catch(function (err) {
      console.error('[Search]', err);
      showToast('Search error');
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
    // Show preview first
    if (typeof XLSX === 'undefined') {
      showToast('❌ SheetJS not loaded');
      return;
    }
    window.MH_EXCEL.parseFile(file).then(function (rows) {
      var result = window.MH_EXCEL.toRecords(rows);
      if (!result.records.length) {
        showToast('❌ No valid rows found');
        return;
      }
      showPreview(file, result);
    }).catch(function (err) {
      console.error(err);
      showToast('❌ Parse fail: ' + (err.message || ''));
    });
  }

  function showPreview(file, result) {
    var modal = document.getElementById('preview-modal');
    if (!modal) {
      // Fallback — no preview modal
      confirmReplace().then(function (ok) {
        if (ok) doImport(file);
      });
      return;
    }

    // Fill summary — with error details
    var summary = document.getElementById('preview-summary');
    if (summary) {
      var lines = [];
      lines.push('<strong style="color:var(--success);">✓ ' + result.records.length + ' machines</strong> ready');
      if (result.invalid > 0) {
        lines.push('<span style="color:var(--warning);">⚠ ' + result.invalid + ' rows skipped (empty code)</span>');
      }
      if (result.duplicate > 0) {
        lines.push('<span style="color:var(--warning);">⚠ ' + result.duplicate + ' duplicates skipped</span>');
      }
      lines.push('<span style="color:var(--text-3);font-size:11px;">' + result.totalRows + ' total rows</span>');
      summary.innerHTML = lines.join('<br>');
    }

    // Fill table (first 5)
    var tbody = document.getElementById('preview-body');
    var preview = result.records.slice(0, 5);
    if (tbody) {
      tbody.innerHTML = preview.map(function (r) {
        return '<tr>' +
          '<td>' + esc(r.machine_code) + '</td>' +
          '<td>' + esc(r.machine_name) + '</td>' +
          '<td>' + esc(r.shop_code || '—') + '</td>' +
          '</tr>';
      }).join('');
    }

    // More indicator
    var moreEl = document.getElementById('preview-more');
    if (moreEl) {
      if (result.records.length > 5) {
        moreEl.textContent = '+ ' + (result.records.length - 5) + ' more machines';
      } else {
        moreEl.textContent = '';
      }
    }

    // Confirm button text
    var confirmBtn = document.getElementById('preview-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = 'Import ' + result.records.length;
    }

    // Show modal
    modal.hidden = false;

    // Bind once
    var cancelBtn = document.getElementById('preview-cancel');
    var confirmBtn2 = document.getElementById('preview-confirm');

    function close() { modal.hidden = true; }

    // Remove old listeners (clone trick)
    var newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newCancel.addEventListener('click', close);

    var newConfirm = confirmBtn2.cloneNode(true);
    confirmBtn2.parentNode.replaceChild(newConfirm, confirmBtn2);
    newConfirm.addEventListener('click', function () {
      close();
      confirmReplace().then(function (ok) {
        if (!ok) { showToast('Cancelled'); return; }
        doImport(file, result);
      });
    });
  }

  function setProgress(pct, text) {
    var bar = document.getElementById('import-bar');
    var fill = document.getElementById('import-bar-fill');
    var label = document.getElementById('import-bar-label');
    if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (label) label.textContent = text || '';
  }

  function doImport(file, precomputed) {
    var overlay = $('#import-overlay');
    var status = $('#import-status');
    if (overlay) overlay.hidden = false;
    if (status) status.textContent = 'Import လုပ်နေတယ်...';
    setProgress(10, 'Starting...');

    var safety = setTimeout(function () {
      hideOverlay();
      showToast('⏱ Timeout');
    }, 30000);

    var resultPromise = precomputed
      ? Promise.resolve(precomputed)
      : window.MH_EXCEL.parseFile(file).then(function (rows) {
          setProgress(25, 'Parsing...');
          return window.MH_EXCEL.toRecords(rows);
        });

    var backup = null;

    resultPromise.then(function (result) {
      if (!result.records.length) throw new Error('No valid rows found');
      setProgress(40, 'Backup...');
      return window.MH_DB.snapshot().then(function (snap) {
        backup = snap;
        setProgress(50, 'Saving ' + result.records.length + ' machines...');
        return window.MH_DB.clear();
      })
        .then(function () {
          setProgress(70, 'Writing to storage...');
          return window.MH_DB.putAll(result.records);
        })
        .then(function () {
          setProgress(95, 'Finalizing...');
          return window.MH_DB.setMeta('last_import', Date.now());
        })
        .then(function () {
          setProgress(100, 'Complete');
          return { result: result, backup: backup };
        });
    }).then(function (payload) {
      clearTimeout(safety);
      setTimeout(function () {
        hideOverlay();
        haptic('success');
        var result = payload.result;
        var prevCount = (payload.backup && payload.backup.records.length) || 0;
        var msg = '✅ Import OK — ' + result.records.length + ' machines';
        var skipped = (result.invalid || 0) + (result.duplicate || 0);
        if (skipped > 0) msg += ' (' + skipped + ' skipped)';
        showUndoToast(msg, payload.backup, prevCount);
        refreshUI();
      }, 400);
    }).catch(function (err) {
      clearTimeout(safety);
      hideOverlay();
      haptic('error');
      console.error('[Import]', err);
      showToast('❌ Import fail: ' + (err.message || ''));
    });
  }

  function refreshUI() {
    window.MH_DB.count().then(function (n) {
      var emptyEl = $('#state-empty');
      var loadedEl = $('#state-loaded');
      var statsEl = $('#stats-count');
      if (n > 0) {
        if (emptyEl) emptyEl.hidden = true;
        if (loadedEl) loadedEl.hidden = false;
        if (statsEl) statsEl.textContent = n + ' machines';
      } else {
        if (emptyEl) emptyEl.hidden = false;
        if (loadedEl) loadedEl.hidden = true;
      }
    });
    window.MH_DB.getMeta('last_import').then(function (ts) {
      var el = $('#stats-last');
      if (!el) return;
      if (!ts) { el.textContent = ''; return; }
      var age = Math.floor((Date.now() - ts) / 60000);
      if (age < 1) el.textContent = '· just now';
      else if (age < 60) el.textContent = '· ' + age + ' min ago';
      else el.textContent = '· ' + Math.floor(age / 60) + ' hr ago';
    });
    renderRecent();
    renderFavorites();
  }

  function bindClearRecent() {
    var btn = $('#btn-clear-recent');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!getRecent().length) return;
      if (window.MH_MODAL) {
        window.MH_MODAL.confirm({
          icon: '🗑',
          variant: 'danger',
          title: 'History ဖျက်မယ်',
          desc: 'Recent searches အားလုံး ဖျက်မှာ သေချာလား?',
          cancelText: 'Cancel',
          confirmText: 'Clear',
        }).then(function (ok) { if (ok) clearAllRecent(); });
      } else {
        if (confirm('Clear all history?')) clearAllRecent();
      }
    });
  }

  var _contextMenuEl = null;

  function closeContextMenu() {
    if (_contextMenuEl && _contextMenuEl.parentNode) {
      _contextMenuEl.parentNode.removeChild(_contextMenuEl);
    }
    _contextMenuEl = null;
  }

  function showContextMenu(record) {
    closeContextMenu();

    var menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML =
      '<div class="context-header">' +
      '<div class="context-title">' + esc(record.machine_code) + '</div>' +
      (record.machine_name && record.machine_name !== record.machine_code
        ? '<div class="context-sub">' + esc(record.machine_name) + '</div>'
        : '') +
      '</div>' +
      '<button type="button" class="context-action" data-ctx="copy">' +
      '<svg class="icon"><use href="#i-copy"/></svg>Copy Code</button>' +
      '<button type="button" class="context-action" data-ctx="share">' +
      '<svg class="icon"><use href="#i-share"/></svg>Share</button>' +
      '<a href="/machine/' + encodeURIComponent(record.machine_code) + '" class="context-action">' +
      '<svg class="icon"><use href="#i-arrow-right"/></svg>View Details</a>' +
      '<button type="button" class="context-action" data-ctx="fav">' +
      '<svg class="icon"><use href="#i-star"/></svg>Toggle Favorite</button>' +
      '<button type="button" class="context-action context-action-danger" data-ctx="cancel">' +
      '<svg class="icon"><use href="#i-x"/></svg>Cancel</button>';

    document.body.appendChild(menu);
    _contextMenuEl = menu;

    try { if (window.MH_HAPTIC) window.MH_HAPTIC.medium(); } catch (e) {}

    // Backdrop close
    var backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:' + (parseInt(getComputedStyle(menu).zIndex) - 1) + ';background:rgba(0,0,0,0.3);';
    backdrop.addEventListener('click', closeContextMenu);
    document.body.insertBefore(backdrop, menu);
    menu._backdrop = backdrop;

    menu.querySelectorAll('[data-ctx]').forEach(function (b) {
      b.addEventListener('click', function () {
        var action = b.getAttribute('data-ctx');
        if (action === 'copy') copyText(record.machine_code);
        else if (action === 'share') {
          var text = record.machine_code + (record.machine_name && record.machine_name !== record.machine_code ? ' — ' + record.machine_name : '') + (record.shop_code ? ' (' + record.shop_code + ')' : '');
          if (navigator.share) {
            navigator.share({ title: 'Machine', text: text }).catch(function () {});
          } else {
            copyText(text);
          }
        } else if (action === 'fav') {
          window.MH_DB.toggleFavorite(record).then(function (nowFav) {
            showToast(nowFav ? '⭐ Added to favorites' : 'Removed from favorites');
            renderFavorites();
          });
        }
        closeContextMenu();
      });
    });
  }

  function bindLongPress(container) {
    if (!container || !('ontouchstart' in window)) return;

    container.querySelectorAll('.result-card').forEach(function (card) {
      var timer = null;
      var startX = 0, startY = 0;
      var moved = false;
      var LP_MS = 500;

      function cancel() {
        if (timer) { clearTimeout(timer); timer = null; }
      }

      card.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moved = false;

        timer = setTimeout(function () {
          timer = null;
          if (moved) return;
          var code = card.getAttribute('data-code');
          window.MH_DB.getAll().then(function (all) {
            var rec = all.find(function (x) { return x.machine_code === code; });
            if (rec) showContextMenu(rec);
          });
        }, LP_MS);
      }, { passive: true });

      card.addEventListener('touchmove', function (e) {
        var dx = Math.abs(e.touches[0].clientX - startX);
        var dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 10 || dy > 10) {
          moved = true;
          cancel();
        }
      }, { passive: true });

      card.addEventListener('touchend', cancel, { passive: true });
      card.addEventListener('touchcancel', cancel, { passive: true });
    });
  }

  function bindSwipeCards(container) {
    if (!container || !('ontouchstart' in window)) return;

    container.querySelectorAll('.result-card').forEach(function (card) {
      var inner = card.querySelector('.result-card-inner');
      if (!inner) return;
      var startX = 0, startY = 0, currentX = 0, dragging = false, decided = false;
      var MAX_SWIPE = 220;

      card.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = 0;
        dragging = true;
        decided = false;
        card.classList.add('swiping');
      }, { passive: true });

      card.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;

        if (!decided) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (Math.abs(dy) > Math.abs(dx)) {
            dragging = false;
            card.classList.remove('swiping');
            return;
          }
          decided = true;
        }

        if (dx > 0) dx = 0;
        if (dx < -MAX_SWIPE) dx = -MAX_SWIPE;
        currentX = dx;
        inner.style.transform = 'translateX(' + dx + 'px)';
      }, { passive: true });

      card.addEventListener('touchend', function () {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('swiping');
        if (currentX < -60) {
          inner.style.transform = 'translateX(-216px)';
          try { if (window.MH_HAPTIC) window.MH_HAPTIC.light(); } catch (er) {}
        } else {
          inner.style.transform = 'translateX(0)';
        }
      }, { passive: true });

      card.addEventListener('click', function (e) {
        if (currentX < -60) {
          inner.style.transform = 'translateX(0)';
          currentX = 0;
          e.preventDefault();
          e.stopPropagation();
        }
      });
    });
  }

  function bindPullRefresh() {
    if (window.matchMedia('(display-mode: standalone)').matches === false && !('ontouchstart' in window)) return;
    if (window.MH_PULL_BOUND) return;
    window.MH_PULL_BOUND = true;

    var THRESHOLD = 70;
    var startY = 0;
    var pulling = false;
    var indicator = null;

    function createIndicator() {
      if (indicator) return indicator;
      indicator = document.createElement('div');
      indicator.id = 'pull-indicator';
      indicator.className = 'pull-indicator';
      indicator.innerHTML = '<div class="pull-spinner"></div><div class="pull-text">↓ Pull to refresh</div>';
      document.body.appendChild(indicator);
      return indicator;
    }

    function updateIndicator(dy, refreshing) {
      var el = createIndicator();
      var text = el.querySelector('.pull-text');
      var spinner = el.querySelector('.pull-spinner');
      if (refreshing) {
        el.classList.add('active');
        text.textContent = 'Refreshing...';
        spinner.style.display = 'block';
      } else {
        el.classList.remove('active');
        spinner.style.display = 'none';
        if (dy > THRESHOLD) {
          text.textContent = '↑ Release to refresh';
        } else {
          text.textContent = '↓ Pull to refresh';
        }
        el.style.transform = 'translateX(-50%) translateY(' + Math.min(dy, THRESHOLD) + 'px)';
        el.style.opacity = Math.min(dy / THRESHOLD, 1);
      }
    }

    function hideIndicator() {
      if (!indicator) return;
      indicator.style.transform = 'translateX(-50%) translateY(-80px)';
      indicator.style.opacity = '0';
      setTimeout(function () {
        if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
        indicator = null;
      }, 300);
    }

    document.addEventListener('touchstart', function (e) {
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      pulling = true;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!pulling) return;
      var dy = e.touches[0].clientY - startY;
      if (dy < 0) { pulling = false; hideIndicator(); return; }
      if (window.scrollY > 0) return;
      if (dy > 5) {
        e.preventDefault();
        updateIndicator(dy, false);
      }
    }, { passive: false });

    document.addEventListener('touchend', function (e) {
      if (!pulling) return;
      pulling = false;
      var dy = (e.changedTouches[0].clientY || 0) - startY;
      if (dy > THRESHOLD) {
        updateIndicator(dy, true);
        setTimeout(function () {
          try { if (window.MH_HAPTIC) window.MH_HAPTIC.light(); } catch (er) {}
          refreshUI();
          hideIndicator();
          showToast('🔄 Refreshed');
        }, 500);
      } else {
        hideIndicator();
      }
    }, { passive: true });
  }

  function bindUI() {
    bindClearRecent();
    var fileInput = $('#file-input');
    var pickBtn = $('#btn-pick-file');

    if (pickBtn && fileInput) {
      pickBtn.addEventListener('click', function () { fileInput.click(); });
    }
    if (fileInput) {
      fileInput.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (f) handleImport(f);
        e.target.value = '';
      });
    }

    var reBtn = $('#btn-action-reimport');
    var reInput = $('#file-input-2');
    if (reBtn && reInput) {
      reBtn.addEventListener('click', function () { reInput.click(); });
      reInput.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (f) handleImport(f);
        e.target.value = '';
      });
    }

    var input = $('#search-input');
    var clearBtn = $('#search-clear');
    var timer = null;
    if (input) {
      input.addEventListener('input', function () {
        var v = input.value;
        if (clearBtn) clearBtn.hidden = !v;
        clearTimeout(timer);
        timer = setTimeout(function () { doSearch(v); }, 150);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (input) input.value = '';
        clearBtn.hidden = true;
        doSearch('');
        if (input) input.focus();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.MH_DB) return;
    window.MH_DB.open().then(function () {
      renderGreeting();
      renderChips();
      bindUI();
      bindPullRefresh();
      refreshUI();
      console.log('[Search] ready');
    });
  });
})();
