(() => {
  'use strict';
  window.showTabletopDownloads = async (container) => {
    const status = container.querySelector('[data-download-status]');
    const link = container.querySelector('[data-download-link]');
    link.hidden = true;
    status.textContent = 'Consultando la descarga y su contador en GitHub…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch('./download-config.json', { signal: controller.signal });
      if (!response.ok) throw new Error('Configuration unavailable');
      const config = await response.json();
      if (!config.enabled) { status.textContent = 'Descarga en preparación.'; return; }
      if (!/^elguigu100\/[A-Za-z0-9_.-]+$/.test(config.repository) || !config.tag || !config.assetName) {
        throw new Error('Invalid release configuration');
      }
      link.href = `https://github.com/${config.repository}/releases/download/${encodeURIComponent(config.tag)}/${encodeURIComponent(config.assetName)}`;
      link.hidden = false;
      const releaseResponse = await fetch(`https://api.github.com/repos/${config.repository}/releases/tags/${encodeURIComponent(config.tag)}`, {
        signal: controller.signal, headers: { Accept: 'application/vnd.github+json' }
      });
      if (!releaseResponse.ok) {
        if (releaseResponse.status === 404) link.hidden = true;
        throw new Error('Release unavailable');
      }
      const release = await releaseResponse.json();
      if (release.draft || release.prerelease) { link.hidden = true; throw new Error('Release not public'); }
      const asset = release.assets?.find(item => item.name === config.assetName && item.state === 'uploaded');
      const prefix = `https://github.com/${config.repository}/releases/download/`;
      if (!asset || !Number.isSafeInteger(asset.download_count) || asset.download_count < 0 || !asset.browser_download_url?.startsWith(prefix)) {
        link.hidden = true;
        throw new Error('Asset unavailable');
      }
      if (!container.isConnected) return;
      status.textContent = `${new Intl.NumberFormat('es-UY').format(asset.download_count)} descargas de esta versión registradas por GitHub. No equivale a usuarios únicos ni instalaciones.`;
      link.href = asset.browser_download_url;
      link.hidden = false;
    } catch {
      if (container.isConnected) status.textContent = link.hidden
        ? 'No se pudo consultar la descarga. Probá nuevamente más tarde.'
        : 'El contador no está disponible ahora. La descarga sigue habilitada.';
    } finally { clearTimeout(timer); }
  };
})();
