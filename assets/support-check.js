// Detects whether `CanvasRenderingContext2D.drawElementImage()` is available
// (Chrome 148+ origin trial / chrome://flags/#canvas-draw-element). Surfaces
// the result as a sidebar pill and a `data-canvas-html-supported` flag on
// <body> that demos can branch on.
(() => {
  const pill = document.getElementById('support-pill');
  const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  const supported = !!(proto && typeof proto.drawElementImage === 'function');

  document.body.dataset.canvasHtmlSupported = supported ? 'true' : 'false';

  if (pill) {
    pill.hidden = false;
    pill.dataset.state = supported ? 'ok' : 'missing';
    pill.querySelector('.support__text').textContent = supported
      ? 'drawElementImage() detected'
      : 'drawElementImage() unavailable — enable chrome://flags/#canvas-draw-element';
  }

  // Highlight the active nav link based on the URL.
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.endsWith(here)) a.setAttribute('aria-current', 'page');
  });
})();
