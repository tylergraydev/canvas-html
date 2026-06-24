// Injects the shared sidebar into any page that has <div id="sidebar-slot">.
// Keeping the nav in one place means adding/removing demos only touches this file.
(() => {
  const slot = document.getElementById('sidebar-slot');
  if (!slot) return;

  const base = slot.dataset.base || './';

  const groups = [
    {
      heading: 'Concepts',
      links: [
        { href: 'intro/00a-what-is-the-dom.html', label: 'What is the DOM?' },
        { href: 'intro/00b-what-is-the-canvas.html', label: 'What is a canvas?' },
        { href: 'intro/01-what-is-this.html', label: 'What is HTML in Canvas?' },
        { href: 'intro/02-before-after.html', label: 'Before vs After' },
        { href: 'intro/03-accessibility.html', label: 'Accessibility, for real' },
      ],
    },
    {
      heading: 'Getting started',
      links: [
        { href: 'index.html', label: 'Overview' },
        { href: 'examples/01-hello-html.html', label: 'Hello, drawElementImage()' },
      ],
    },
    {
      heading: 'Effects',
      links: [
        { href: 'examples/02-transforms.html', label: 'Live transforms' },
        { href: 'examples/03-reflection.html', label: 'Reflections & mirrors' },
        { href: 'examples/04-particles.html', label: 'HTML particles' },
        { href: 'examples/05-warp.html', label: 'Warp & distortion' },
      ],
    },
    {
      heading: 'Composites',
      links: [
        { href: 'examples/06-video-overlay.html', label: 'Video + UI overlay' },
        { href: 'examples/07-3d-card.html', label: '3D parallax card' },
        { href: 'examples/08-mini-map.html', label: 'Live mini-map' },
      ],
    },
    {
      heading: 'Interactive',
      links: [
        { href: 'examples/09-form-in-scene.html', label: 'Form inside a scene' },
        { href: 'examples/10-game-hud.html', label: 'Game HUD' },
        { href: 'examples/11-falling-letters.html', label: 'Falling letters' },
        { href: 'examples/12-yeti.html', label: 'Yeti watches you type' },
        { href: 'examples/13-typewriter.html', label: 'Typewriter' },
        { href: 'examples/14-crawl.html', label: 'Title crawl' },
        { href: 'examples/15-login-orb.html', label: '3D login orb' },
        { href: 'examples/16-login-orb-webgl.html', label: '3D login orb (WebGL)' },
      ],
    },
    {
      heading: 'From the WICG spec',
      links: [
        { href: 'examples/17-pie-chart.html', label: 'Accessible pie chart' },
        { href: 'examples/18-polyglot-text.html', label: 'Polyglot rich text' },
        { href: 'examples/19-text-cube.html', label: 'Spinning text cube (WebGL)' },
        { href: 'examples/20-jelly-slider.html', label: 'Jelly slider (WebGL)' },
      ],
    },
    {
      // Vendored from html-in-canvas.dev (En Dash Consulting, MIT) and mounted
      // in a shadow root inside our chrome by assets/demo-embed.js.
      heading: 'html-in-canvas.dev',
      links: [
        { href: 'demos/hello-world.html', label: 'Hello world' },
        { href: 'demos/interactive-form.html', label: 'Interactive form' },
        { href: 'demos/multi-element-composition.html', label: 'Multi-element composition' },
        { href: 'demos/accessible-charts.html', label: 'Accessible charts' },
        { href: 'demos/internationalized-text.html', label: 'Internationalized text' },
        { href: 'demos/html-to-image.html', label: 'HTML-to-image export' },
        { href: 'demos/html-video-recording.html', label: 'HTML video recording' },
        { href: 'demos/offscreen-canvas-worker.html', label: 'OffscreenCanvas worker' },
        { href: 'demos/rich-text-canvas-editor.html', label: 'Rich text canvas editor' },
        { href: 'demos/morphing-text-transitions.html', label: 'Morphing text transitions' },
        { href: 'demos/pixel-disintegration.html', label: 'Pixel disintegration' },
        { href: 'demos/frosted-glass-backdrop.html', label: 'Frosted glass backdrop' },
        { href: 'demos/elastic-bulge.html', label: 'Elastic bulge (WebGL)' },
        { href: 'demos/liquid-glass.html', label: 'Liquid glass (WebGL)' },
        { href: 'demos/css-to-shader.html', label: 'CSS-to-shader (WebGL)' },
        { href: 'demos/page-curl-book-turn.html', label: 'Page curl / book turn (WebGL)' },
        { href: 'demos/3d-room-live-content.html', label: '3D room, live content (WebGL)' },
      ],
    },
  ];

  const here = location.pathname.split('/').pop() || 'index.html';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const el = (tag, attrs, ...children) => {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === false || v == null) continue;
        if (k === 'class') node.className = v;
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const child of children) {
      if (child == null) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  };

  const svgEl = (tag, attrs, ...children) => {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null) continue;
        node.setAttribute(k, v);
      }
    }
    for (const child of children) if (child) node.append(child);
    return node;
  };

  const brandSvg = svgEl('svg', { viewBox: '0 0 32 32', width: '28', height: '28' },
    svgEl('defs', null,
      svgEl('linearGradient', { id: 'brand-g', x1: '0', x2: '1', y1: '0', y2: '1' },
        svgEl('stop', { offset: '0', 'stop-color': '#7c5cff' }),
        svgEl('stop', { offset: '1', 'stop-color': '#22d3ee' }),
      ),
    ),
    svgEl('rect', { x: '2', y: '2', width: '28', height: '28', rx: '7', fill: 'url(#brand-g)' }),
    svgEl('path', { d: 'M9 21V11h3l4 7 4-7h3v10h-2v-7l-3.5 6h-3L11 14v7Z', fill: '#0b0d12' }),
  );

  const brand = el('a', { class: 'brand', href: `${base}index.html` },
    el('span', { class: 'brand__mark', 'aria-hidden': 'true' }, brandSvg),
    el('span', { class: 'brand__text' },
      el('strong', null, 'Canvas HTML'),
      el('em', null, 'origin trial playground'),
    ),
  );

  const nav = el('nav', { class: 'nav', 'aria-label': 'Examples' });
  for (const group of groups) {
    nav.append(el('p', { class: 'nav__heading' }, group.heading));
    const ul = el('ul', null);
    for (const link of group.links) {
      const isActive = link.href.endsWith(here);
      const a = el('a', {
        href: `${base}${link.href}`,
        ...(link.blank ? { target: '_blank', rel: 'noopener' } : {}),
        ...(isActive ? { 'aria-current': 'page' } : {}),
      }, link.label, link.blank ? el('span', { class: 'nav__ext', 'aria-hidden': 'true' }, '↗') : null);
      ul.append(el('li', null, a));
    }
    nav.append(ul);
  }

  const support = el('div', { class: 'support', id: 'support-pill', hidden: true },
    el('span', { class: 'support__dot', 'aria-hidden': 'true' }),
    el('span', { class: 'support__text' }, 'Checking browser support…'),
  );

  const aside = el('aside', { class: 'sidebar', 'aria-label': 'Examples navigation' },
    brand, nav, support,
  );

  slot.replaceWith(aside);
})();
