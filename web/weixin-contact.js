'use strict';
window.DaisyWeixin = (() => {
  // Profile URL decoded from Daisy's supplied personal Weixin QR code.
  const config = { id: 'DaisyLiBroker', contactUrl: 'https://u.wechat.com/kLFpgZdhDu_-BYSYmJoaevY?s=2', qrImage: 'https://maplehe7.github.io/daisyli/web/assets/daisy-weixin-qr.jpg' };
  // Official symbol: https://newres.wechat.com/t/fed_upload/fdf269b2-1de3-4bb9-95c5-00150433b7f1/MjliNWVm.svg
  const icon = '<img class="weixin-logo" src="https://maplehe7.github.io/daisyli/web/assets/weixin-logo.svg" alt="" width="24" height="20" aria-hidden="true">';
  const expandIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
  const linkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';

  function imageURL(value) {
    if (!value) return '';
    try {
      const url = new URL(value, location.origin);
      const approved = new URL(config.qrImage, location.origin);
      return url.origin === approved.origin && url.pathname === approved.pathname ? url.href : '';
    } catch { return ''; }
  }

  function render() {
    const qr = imageURL(config.qrImage);
    const messageIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/></svg>';
    const button = `<a class="button weixin-button" href="sms:+19498610160">${messageIcon}<span>Text Me</span>${linkIcon}</a>`;
    const qrImage = qr ? `<span class="weixin-qr-image"><img class="weixin-profile-qr" src="${escapeHTML(qr)}" alt="Daisy Li's Weixin QR code" width="888" height="1137"></span>` : '';
    const qrButton = qr ? `<button type="button" class="weixin-qr-open" data-open-weixin-qr aria-haspopup="dialog" aria-controls="weixin-qr-dialog" aria-label="Enlarge Weixin QR code">${qrImage}<span class="weixin-qr-cue">${expandIcon}<span>Tap to enlarge</span></span></button>` : '';
    const viewer = qr ? `<dialog id="weixin-qr-dialog" class="weixin-qr-dialog" aria-labelledby="weixin-qr-title"><div class="weixin-qr-viewer"><div class="weixin-qr-toolbar"><h2 id="weixin-qr-title">Weixin QR code</h2><button type="button" class="weixin-qr-close" data-close-weixin-qr aria-label="Close QR code"><span aria-hidden="true">×</span><span>Close</span></button></div>${qrImage}<div class="weixin-qr-account" data-no-translate>${escapeHTML(config.id)}</div></div></dialog>` : '';
    return `<div class="contact-weixin" id="weixin-contact"><div class="weixin-controls">${button}</div><figure class="weixin-qr" id="weixin-qr">${qrButton}<div class="weixin-qr-placeholder" aria-hidden="true" ${qr ? 'hidden' : ''}>${icon}</div><figcaption>Weixin QR code</figcaption></figure>${viewer}</div>`;
  }

  function bind() {
    const section = document.getElementById('weixin-contact');
    if (!section) return;
    const img = section.querySelector('.weixin-profile-qr');
    const trigger = section.querySelector('[data-open-weixin-qr]');
    const dialog = section.querySelector('#weixin-qr-dialog');
    if (img) {
      const unavailable = () => { trigger.hidden = true; section.querySelector('.weixin-qr-placeholder').hidden = false; };
      img.addEventListener('error', unavailable, { once: true });
      if (img.complete && !img.naturalWidth) unavailable();
    }
    trigger?.addEventListener('click', () => { if (dialog && !dialog.open) dialog.showModal(); });
    section.querySelector('[data-close-weixin-qr]')?.addEventListener('click', () => dialog.close());
    dialog?.addEventListener('click', event => {
      if (event.target === dialog || event.target === dialog.querySelector('.weixin-qr-viewer')) dialog.close();
    });
    dialog?.addEventListener('close', () => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }); });
  }
  return { config, render, bind };
})();
