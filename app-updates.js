// Check a tiny, uniquely addressed file to avoid GitHub Pages' ten-minute cache.
(() => {
  const runningVersion = document.currentScript.dataset.version;
  let checking = false;
  let lastCheck = 0;
  async function checkForUpdate() {
    if (checking || document.visibilityState === 'hidden' || Date.now() - lastCheck < 15000) return;
    checking = true;
    lastCheck = Date.now();
    try {
      const response = await fetch(new URL('app-version.json?check=' + Date.now(), location.href), {
        cache: 'no-store', signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) return;
      const { version } = await response.json();
      if (typeof version !== 'string' || version === runningVersion || document.getElementById('app-update-button')) return;
      const button = document.createElement('button');
      button.id = 'app-update-button';
      button.type = 'button';
      button.textContent = 'Update app';
      button.title = 'A new version is ready. Finish any edits before updating.';
      button.style.cssText = 'display:block;margin:4px 0 8px;padding:10px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:var(--bg);font:700 12px sans-serif;';
      const applyUpdate = () => {
        const url = new URL(location.href);
        url.searchParams.set('appVersion', version);
        location.replace(url.href);
      };
      button.onclick = () => {
        if (document.querySelector('.modal-overlay.open')) {
          if (typeof window.showConfirm === 'function') {
            window.showConfirm('Update app?', 'Updating closes unfinished edits. Finish them first if needed.', 'Update now', applyUpdate);
            return;
          }
          if (!confirm('Updating closes any unfinished edits. Update now?')) return;
        }
        applyUpdate();
      };
      document.getElementById('header').appendChild(button);
    } catch {
      // An offline update check must not interrupt logging.
    } finally {
      checking = false;
    }
  }
  document.addEventListener('visibilitychange', checkForUpdate);
  window.addEventListener('pageshow', checkForUpdate);
  checkForUpdate();
})();
