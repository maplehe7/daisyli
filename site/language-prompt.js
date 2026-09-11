'use strict';
window.DaisyLanguagePrompt = (() => {
  const dialog = document.getElementById('language-dialog');
  const closeButton = dialog.querySelector('[data-close-language]');
  let firstVisit = false;

  function open(initial = false) {
    firstVisit = initial;
    closeButton.hidden = initial;
    dialog.querySelectorAll('[data-site-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.siteLanguage === siteLanguage));
    });
    if (!dialog.open) dialog.showModal();
    dialog.querySelector(`[data-site-language="${siteLanguage}"]`).focus({ preventScroll: true });
  }

  function close() {
    firstVisit = false;
    if (dialog.open) dialog.close();
  }

  document.querySelector('[data-open-language]').addEventListener('click', () => open());
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', event => {
    if (firstVisit) event.preventDefault();
  });
  if (!savedSiteLanguage) open(true);
  return { open, close };
})();
