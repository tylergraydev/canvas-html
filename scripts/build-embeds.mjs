// Generates demos/<slug>.html wrapper pages from the vendored standalone
// sources in demos/_src/<slug>.html, embedding each demo in our site chrome
// (sidebar + header + Source/Accessibility code pane) via a shadow-root mount.
//
//   node scripts/build-embeds.mjs
//
// Re-run after re-pulling upstream demos into demos/_src/.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'demos', '_src');
const OUT = join(ROOT, 'demos');

// slug → display metadata (from each demo's meta.json on html-in-canvas.dev)
const DEMOS = [
  { slug: 'hello-world', ctx: '2D', title: 'Hello world', desc: 'The simplest HTML-in-Canvas demo — a styled div drawn into a canvas with drawElementImage().' },
  { slug: 'interactive-form', ctx: '2D', title: 'Interactive form', desc: 'A full HTML form rendered inside canvas — its inputs stay natively focusable and typable.' },
  { slug: 'multi-element-composition', ctx: '2D', title: 'Multi-element composition', desc: 'Multiple draggable canvas children drawn at different positions with independent transforms.' },
  { slug: 'accessible-charts', ctx: '2D', title: 'Accessible charts', desc: 'Bar and pie charts with real, focusable HTML labels and full keyboard support.' },
  { slug: 'internationalized-text', ctx: '2D', title: 'Internationalized text', desc: 'Side-by-side fillText() vs drawElementImage for RTL, CJK and other complex scripts.' },
  { slug: 'html-to-image', ctx: '2D', title: 'HTML-to-image export', desc: 'A social / OG card generator that exports via canvas.toBlob() — a native html2canvas.' },
  { slug: 'html-video-recording', ctx: '2D', title: 'HTML video recording', desc: 'Record animated HTML content as WebM video with MediaRecorder.' },
  { slug: 'offscreen-canvas-worker', ctx: '2D · Worker', title: 'OffscreenCanvas worker', desc: 'Capture HTML as a transferable ElementImage and render it on an OffscreenCanvas in a Web Worker.' },
  { slug: 'rich-text-canvas-editor', ctx: '2D', title: 'Rich text canvas editor', desc: 'A contenteditable div rendered into canvas with real-time drop-shadow and neon-glow effects.' },
  { slug: 'morphing-text-transitions', ctx: '2D', title: 'Morphing text transitions', desc: 'Two distinct HTML text layouts morph into each other using canvas pixel manipulation.' },
  { slug: 'pixel-disintegration', ctx: '2D', title: 'Pixel disintegration', desc: 'A richly styled profile card disintegrates into physics-driven particles on click.' },
  { slug: 'frosted-glass-backdrop', ctx: '2D', title: 'Frosted glass backdrop', desc: 'A draggable frosted-glass panel with custom gaussian, directional and tilt-shift blur.' },
  { slug: 'elastic-bulge', ctx: 'WebGL', title: 'Elastic bulge', desc: 'A mouse-driven WebGL2 shader warps laid-out HTML with a radial bulge and soft drop-shadow.' },
  { slug: 'liquid-glass', ctx: 'WebGL', title: 'Liquid glass distortion', desc: 'A styled HTML card behind a real-time WebGL liquid-glass refraction shader; the content stays live.' },
  { slug: 'css-to-shader', ctx: 'WebGL', title: 'CSS-to-shader pipeline', desc: 'Pipe a CSS-painted HTML source through a GLSL fragment shader of your choice.' },
  { slug: 'page-curl-book-turn', ctx: 'WebGL', title: 'Page curl / book turn', desc: 'Two HTML pages drawn as WebGL textures on planes with a draggable, realistic page-curl.' },
  { slug: '3d-room-live-content', ctx: 'WebGL · Three.js', title: '3D room with live content', desc: 'A first-person Three.js room where live HTML is rendered as textures on 3D surfaces.' },
];

/** Split a standalone demo.html into the parts our wrapper needs. */
function extract(html) {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[1] : '';
  const links = (head.match(/<link\b[^>]*>/gi) || [])
    .filter((l) => /rel\s*=\s*["'](stylesheet|preconnect|preload)["']/i.test(l))
    .join('\n    ');

  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : '';

  const scripts = [];
  body = body.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_m, attrs, code) => {
    const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1];
    scripts.push({ src, type, body: code });
    return '';
  });
  // styles are mounted separately; drop any in-body <style> to avoid duplicates
  body = body.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').trim();

  return { links, styles, body, scripts };
}

const REPO = 'https://github.com/en-dash-consulting/html-in-canvas-dot-dev';

function wrapper(d, ex) {
  // Escape "</" inside the JSON so a script body can't close the host <script>.
  const scriptsJson = JSON.stringify(ex.scripts).replace(/<\//g, '<\\/');
  const p = [];
  p.push('<!doctype html>\n<html lang="en">\n<head>\n');
  p.push('  <meta charset="utf-8" />\n');
  p.push('  <meta name="viewport" content="width=device-width, initial-scale=1" />\n');
  p.push(`  <title>${d.title} — HTML in Canvas</title>\n`);
  p.push(`  <meta name="description" content="${d.desc.replace(/"/g, '&quot;')}" />\n`);
  p.push('  <link rel="stylesheet" href="../assets/styles.css" />\n');
  p.push('  <link rel="stylesheet" href="../assets/example.css" />\n');
  if (ex.links) p.push('    ' + ex.links + '\n');
  p.push('  <style>\n');
  p.push('    /* The demo is mounted in a shadow root on #demo-host, so its own\n');
  p.push('       page CSS is fully isolated from this chrome. We only size the host. */\n');
  p.push('    .demo-host { position: relative; width: 100%; height: 72vh; min-height: 480px; overflow: auto; }\n');
  p.push('    .demo-attrib { font-size: 13px; color: var(--text-dim); line-height: 1.55; }\n');
  p.push('    .demo-attrib a { color: var(--accent-2); }\n');
  p.push('  </style>\n');
  p.push('</head>\n<body>\n');
  p.push('  <a class="skip-link" href="#main">Skip to content</a>\n');
  p.push('  <div class="app">\n');
  p.push('    <div id="sidebar-slot" data-base="../"></div>\n');
  p.push('    <main id="main" class="content">\n');
  p.push('      <header class="example__header">\n        <div>\n');
  p.push('          <a class="example__back" href="../index.html">← All examples</a>\n');
  p.push(`          <p class="example__meta">html-in-canvas.dev · ${d.ctx}</p>\n`);
  p.push(`          <h1 class="example__title">${d.title}</h1>\n`);
  p.push(`          <p class="example__intro">${d.desc}</p>\n`);
  p.push('        </div>\n      </header>\n');
  p.push('      <section class="stage" aria-label="Demo stage">\n');
  p.push('        <div class="demo-host" id="demo-host"></div>\n');
  p.push('      </section>\n');
  p.push('      <section class="callout" style="margin-top:22px">\n');
  p.push('        <h3>About this demo</h3>\n');
  p.push('        <p class="demo-attrib">\n');
  p.push(`          Vendored verbatim from <a href="https://html-in-canvas.dev/demos/${d.slug}/" target="_blank" rel="noopener">html-in-canvas.dev</a>\n`);
  p.push('          (by En Dash Consulting, MIT-licensed — see <code>demos/UPSTREAM-LICENSE.txt</code>), then mounted in\n');
  p.push('          a shadow root inside this page so it runs unmodified. View the\n');
  p.push(`          <a href="${REPO}/tree/main/src/content/demos/${d.slug}" target="_blank" rel="noopener">original source</a>.\n`);
  p.push('        </p>\n      </section>\n');
  p.push('    </main>\n  </div>\n\n');
  p.push('  <!-- Inlined demo source: mounted into the shadow root by demo-embed.js -->\n');
  p.push('  <script type="text/plain" id="demo-styles">\n');
  p.push(ex.styles);
  p.push('\n  </script>\n');
  p.push('  <template id="demo-body">\n');
  p.push(ex.body);
  p.push('\n  </template>\n');
  p.push('  <script type="application/json" id="demo-scripts">');
  p.push(scriptsJson);
  p.push('</script>\n\n');
  p.push('  <script src="../assets/sidebar.js" defer></script>\n');
  p.push('  <script src="../assets/support-check.js" defer></script>\n');
  p.push('  <script src="../assets/code-pane.js" defer></script>\n');
  p.push('  <script src="../assets/demo-embed.js" defer></script>\n');
  p.push('</body>\n</html>\n');
  return p.join('');
}

let count = 0;
for (const d of DEMOS) {
  const src = readFileSync(join(SRC, `${d.slug}.html`), 'utf8');
  const ex = extract(src);
  writeFileSync(join(OUT, `${d.slug}.html`), wrapper(d, ex));
  count++;
  console.log(`${d.slug}.html  (${ex.scripts.length} scripts, ${ex.styles.length}b css, ${ex.body.length}b body)`);
}
console.log(`\nGenerated ${count} wrapper pages.`);
