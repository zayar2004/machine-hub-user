/* Machine Hub User — Premium Modal (confirm/alert) */
(function () {
  'use strict';

  function createModal(opts) {
    var backdrop = document.createElement('div');
    backdrop.className = 'mh-modal';

    var iconClass = 'mh-modal-icon';
    if (opts.variant === 'danger') iconClass += ' danger';
    if (opts.variant === 'info') iconClass += ' info';

    backdrop.innerHTML =
      '<div class="mh-modal-card" role="dialog" aria-modal="true">' +
      '  <div class="' + iconClass + '">' + (opts.icon || '⚠️') + '</div>' +
      '  <h2 class="mh-modal-title">' + (opts.title || 'Confirm') + '</h2>' +
      '  <p class="mh-modal-desc">' + (opts.desc || '') + '</p>' +
      '  <div class="mh-modal-actions">' +
      '    <button type="button" class="btn btn-ghost" data-role="cancel">' +
      (opts.cancelText || 'Cancel') + '</button>' +
      '    <button type="button" class="btn btn-primary" data-role="confirm">' +
      (opts.confirmText || 'OK') + '</button>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(backdrop);
    return backdrop;
  }

  function confirm(opts) {
    return new Promise(function (resolve) {
      var modal = createModal(opts);

      function close(val) {
        modal.style.opacity = '0';
        setTimeout(function () {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
        }, 200);
        resolve(val);
      }

      modal.querySelector('[data-role="confirm"]').addEventListener('click', function () { close(true); });
      modal.querySelector('[data-role="cancel"]').addEventListener('click', function () { close(false); });
      modal.addEventListener('click', function (e) {
        if (e.target === modal) close(false);
      });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') {
          close(false);
          document.removeEventListener('keydown', esc);
        }
      });
    });
  }

  function alert(opts) {
    return new Promise(function (resolve) {
      var modal = createModal({
        icon: opts.icon || 'ℹ️',
        title: opts.title || 'Notice',
        desc: opts.desc || '',
        cancelText: '',
        confirmText: opts.confirmText || 'OK',
        variant: opts.variant || 'info',
      });
      // Hide cancel if empty
      var cancelBtn = modal.querySelector('[data-role="cancel"]');
      if (cancelBtn && !opts.cancelText) cancelBtn.remove();

      modal.querySelector('[data-role="confirm"]').addEventListener('click', function () {
        modal.style.opacity = '0';
        setTimeout(function () {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
        }, 200);
        resolve(true);
      });
    });
  }

  window.MH_MODAL = { confirm: confirm, alert: alert };
  console.log('[MH_MODAL] loaded');
})();
