// Renders source code into editor-style panes — with real syntax highlighting
// (a small hand-written tokenizer, no dependencies) — and, on the full example
// pages, auto-builds the demo|code side-by-side layout so each example only has
// to include this one script.
//
// Intro/concept pages drive panes explicitly:
//   <pre data-code-from="script-id"></pre>   → that <script>'s own text  (JS)
//   <pre data-code-html="key"></pre>          → window.__markup[key]      (HTML)
//
// Example pages include this script and nothing else: it finds <section.stage>,
// wraps it next to a generated code pane built from the page's live source.
(() => {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const span = (cls, text) => `<span class="${cls}">${esc(text)}</span>`;

  const KEYWORDS = new Set((
    'const let var function return if else for while do break continue new class ' +
    'extends super this typeof instanceof in of void delete try catch finally throw ' +
    'switch case default yield await async import export from as get set static'
  ).split(' '));
  const ATOMS = new Set('null true false undefined NaN Infinity'.split(' '));

  // ── JavaScript ──────────────────────────────────────────────────────
  function highlightJS(code) {
    let out = '', i = 0;
    const n = code.length;
    const isIdStart = (c) => /[A-Za-z_$]/.test(c);
    const isId = (c) => /[A-Za-z0-9_$]/.test(c);
    while (i < n) {
      const c = code[i];
      // line comment
      if (c === '/' && code[i + 1] === '/') {
        let j = i + 2; while (j < n && code[j] !== '\n') j++;
        out += span('tk-com', code.slice(i, j)); i = j; continue;
      }
      // block comment
      if (c === '/' && code[i + 1] === '*') {
        let j = i + 2; while (j < n && !(code[j] === '*' && code[j + 1] === '/')) j++;
        j = Math.min(n, j + 2);
        out += span('tk-com', code.slice(i, j)); i = j; continue;
      }
      // string / template literal
      if (c === '"' || c === "'" || c === '`') {
        const q = c; let j = i + 1;
        while (j < n) { if (code[j] === '\\') { j += 2; continue; } if (code[j] === q) { j++; break; } j++; }
        out += span('tk-str', code.slice(i, j)); i = j; continue;
      }
      // number
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) {
        let j = i + 1; while (j < n && /[0-9a-fA-FxXeE._]/.test(code[j])) j++;
        out += span('tk-num', code.slice(i, j)); i = j; continue;
      }
      // identifier / keyword
      if (isIdStart(c)) {
        let j = i + 1; while (j < n && isId(code[j])) j++;
        const word = code.slice(i, j);
        let k = j; while (k < n && /\s/.test(code[k])) k++;
        let p = i - 1; while (p >= 0 && /\s/.test(code[p])) p--;
        if (KEYWORDS.has(word)) out += span('tk-key', word);
        else if (ATOMS.has(word)) out += span('tk-const', word);
        else if (code[k] === '(') out += span('tk-fn', word);
        else if (code[p] === '.') out += span('tk-prop', word);
        else out += esc(word);
        i = j; continue;
      }
      // punctuation / operators
      if ('{}()[];,'.includes(c)) { out += span('tk-punct', c); i++; continue; }
      if ('+-*/%=<>!&|?:.~^'.includes(c)) { out += span('tk-op', c); i++; continue; }
      out += esc(c); i++;
    }
    return out;
  }

  // ── HTML ────────────────────────────────────────────────────────────
  function highlightHTML(code) {
    let out = '', i = 0;
    const n = code.length;
    while (i < n) {
      if (code.startsWith('<!--', i)) {
        let j = code.indexOf('-->', i); j = j < 0 ? n : j + 3;
        out += span('tk-com', code.slice(i, j)); i = j; continue;
      }
      if (code[i] === '<') {
        let j = i + 1, close = false;
        if (code[j] === '/') { close = true; j++; }
        let s = j; while (j < n && /[A-Za-z0-9-]/.test(code[j])) j++;
        out += span('tk-punct', close ? '</' : '<') + span('tk-tag', code.slice(s, j));
        while (j < n && code[j] !== '>') {
          const ch = code[j];
          if (/\s/.test(ch)) { out += ch; j++; continue; }
          if (ch === '/') { out += span('tk-punct', '/'); j++; continue; }
          if (/[A-Za-z_:]/.test(ch)) {
            let a = j; while (j < n && /[A-Za-z0-9\-:_.]/.test(code[j])) j++;
            out += span('tk-attr', code.slice(a, j)); continue;
          }
          if (ch === '=') { out += span('tk-op', '='); j++; continue; }
          if (ch === '"' || ch === "'") {
            const q = ch; let v = j + 1; while (v < n && code[v] !== q) v++; v = Math.min(n, v + 1);
            out += span('tk-str', code.slice(j, v)); j = v; continue;
          }
          out += esc(ch); j++;
        }
        if (code[j] === '>') { out += span('tk-punct', '>'); j++; }
        i = j; continue;
      }
      let j = i; while (j < n && code[j] !== '<') j++;
      out += esc(code.slice(i, j)); i = j;
    }
    return out;
  }

  // ── CSS ─────────────────────────────────────────────────────────────
  function highlightCSS(code) {
    let out = '', i = 0, depth = 0, inValue = false;
    const n = code.length;
    const isWord = (c) => /[A-Za-z0-9_\-%#.]/.test(c);
    while (i < n) {
      const c = code[i];
      if (c === '/' && code[i + 1] === '*') {
        let j = i + 2; while (j < n && !(code[j] === '*' && code[j + 1] === '/')) j++; j = Math.min(n, j + 2);
        out += span('tk-com', code.slice(i, j)); i = j; continue;
      }
      if (c === '"' || c === "'") {
        const q = c; let j = i + 1; while (j < n) { if (code[j] === '\\') { j += 2; continue; } if (code[j] === q) { j++; break; } j++; }
        out += span('tk-str', code.slice(i, j)); i = j; continue;
      }
      if (c === '@') { let j = i + 1; while (j < n && /[A-Za-z-]/.test(code[j])) j++; out += span('tk-key', code.slice(i, j)); i = j; continue; }
      if (c === '{') { depth++; inValue = false; out += span('tk-punct', c); i++; continue; }
      if (c === '}') { depth--; inValue = false; out += span('tk-punct', c); i++; continue; }
      if (c === ':') { inValue = true; out += span('tk-op', c); i++; continue; }
      if (c === ';') { inValue = false; out += span('tk-punct', c); i++; continue; }
      if (',()'.includes(c)) { out += span('tk-punct', c); i++; continue; }
      if (/\s/.test(c)) { out += c; i++; continue; }
      if (c === '#') { let j = i + 1; while (j < n && /[0-9A-Fa-f]/.test(code[j])) j++; out += span('tk-num', code.slice(i, j)); i = j; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) {
        let j = i + 1; while (j < n && /[0-9a-zA-Z.%]/.test(code[j])) j++;
        out += span('tk-num', code.slice(i, j)); i = j; continue;
      }
      if (isWord(c) || '*>&[]="\''.includes(c)) {
        let j = i; while (j < n && (isWord(code[j]) || '*>&[]="\''.includes(code[j]))) j++;
        const word = code.slice(i, j);
        let k = j; while (k < n && /\s/.test(code[k])) k++;
        let cls = null;
        if (code[k] === '{') cls = 'tk-tag';            // selector
        else if (!inValue && depth > 0) cls = 'tk-prop'; // property name
        else if (code[k] === '(') cls = 'tk-fn';         // function in a value
        else if (depth === 0) cls = 'tk-tag';            // selector fragment
        out += cls ? span(cls, word) : esc(word);
        i = j; continue;
      }
      out += esc(c); i++;
    }
    return out;
  }

  // Strip the shared leading indentation a snippet inherits from its position
  // in the HTML file. A serialized root element (outerHTML) puts the opening tag
  // at column 0 while its children keep their deep source indentation — ignore
  // that flush first line when measuring the common indent.
  function dedent(code) {
    const lines = code.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
    const flushFirst = /^\S/.test(lines[0] || '');
    const considered = lines.filter((l, i) => l.trim() && !(i === 0 && flushFirst));
    const min = considered.length ? Math.min(...considered.map((l) => l.match(/^[ \t]*/)[0].length)) : 0;
    return lines.map((l, i) => (i === 0 && flushFirst ? l : l.slice(min))).join('\n');
  }

  const render = (code, lang) =>
    (lang === 'html' ? highlightHTML : lang === 'css' ? highlightCSS : highlightJS)(dedent(code));

  // ── Accessibility introspection (generic, from the live DOM) ─────────
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // An element worth showing in the accessibility tree.
  function a11yInteresting(e) {
    const t = e.tagName.toLowerCase();
    if (/^h[1-6]$/.test(t)) return true;
    if (['a', 'button', 'select', 'textarea', 'input', 'nav', 'form', 'fieldset', 'img', 'legend'].includes(t)) return true;
    return e.hasAttribute('role') || e.hasAttribute('aria-label') || e.hasAttribute('tabindex');
  }

  function a11yRole(e) {
    const explicit = e.getAttribute('role');
    if (explicit) return explicit;
    const t = e.tagName.toLowerCase();
    if (/^h[1-6]$/.test(t)) return 'heading';
    if (t === 'input') {
      return ({
        text: 'textbox', email: 'textbox', password: 'textbox', search: 'searchbox',
        tel: 'textbox', url: 'textbox', number: 'spinbutton', checkbox: 'checkbox',
        radio: 'radio', range: 'slider', submit: 'button', button: 'button', reset: 'button',
      })[e.type] || 'textbox';
    }
    return ({
      a: e.hasAttribute('href') ? 'link' : 'generic', button: 'button', select: 'combobox',
      textarea: 'textbox', img: 'img', nav: 'navigation', form: 'form', fieldset: 'group',
      legend: 'label', ul: 'list', ol: 'list', li: 'listitem', table: 'table',
    })[t] || t;
  }

  function a11yName(e, root) {
    if (e.getAttribute('aria-label')) return e.getAttribute('aria-label').trim();
    // Resolve ids within the scope (a ShadowRoot for embedded demos) then doc.
    const escId = (id) => ((window.CSS && CSS.escape) ? CSS.escape(id) : id);
    const byId = (id) => (root.querySelector && root.querySelector('#' + escId(id))) || document.getElementById(id);
    const lb = e.getAttribute('aria-labelledby');
    if (lb) {
      const txt = lb.split(/\s+/).map((id) => { const t = byId(id); return t ? t.textContent.trim() : ''; }).join(' ').trim();
      if (txt) return txt;
    }
    if (e.id && root.querySelector) { const l = root.querySelector(`label[for="${escId(e.id)}"]`); if (l) return l.textContent.trim().replace(/\s+/g, ' '); }
    const wrap = e.closest('label'); if (wrap && wrap !== e) return wrap.textContent.trim().replace(/\s+/g, ' ');
    if (e.tagName === 'IMG') return e.getAttribute('alt') || '';
    if (/^(BUTTON|A|H[1-6]|LEGEND|SUMMARY|OPTION)$/.test(e.tagName)) return (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 64);
    return e.getAttribute('placeholder') || '';
  }

  function a11yState(e) {
    if (e.type === 'checkbox' || e.type === 'radio') return e.checked ? 'checked' : 'not checked';
    if (e.tagName === 'SELECT') return (e.options[e.selectedIndex] || {}).text || '';
    if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') {
      if (e.type === 'password') return e.value ? '••••' : 'empty';
      if (e.type !== 'submit' && e.type !== 'button') return e.value ? `"${e.value}"` : 'empty';
    }
    return '';
  }

  // Build the swappable accessibility panel for a painted subtree.
  function buildA11yView(root) {
    const view = el('div', 'code-pane__scroll a11yp');
    view.dataset.viewPanel = 'a11y';

    const sr = el('div', 'a11yp__sr');
    sr.setAttribute('aria-live', 'polite');
    sr.append(el('span', 'a11yp__muted', 'Focus an element in the demo to hear its announcement…'));
    view.append(el('p', 'a11yp__cap', 'What a screen reader announces'), sr);

    view.append(el('p', 'a11yp__cap', 'Accessibility tree of the painted DOM'));
    const tree = el('ul', 'a11yp__tree');
    view.append(tree);

    // Collect interesting nodes with nesting depth.
    const rows = new Map();
    const out = [];
    (function collect(node, depth) {
      for (const child of node.children) {
        const keep = a11yInteresting(child);
        if (keep) out.push({ e: child, depth });
        collect(child, keep ? depth + 1 : depth);
      }
    })(root, 0);

    if (!out.length) {
      tree.append(el('li', 'a11yp__empty', 'No labelled or focusable nodes — this demo paints decorative content.'));
    }

    const CAP = 80;
    out.slice(0, CAP).forEach(({ e, depth }) => {
      const focusable = e.matches('a[href], button, input, select, textarea, [tabindex]');
      const li = document.createElement('li');
      const row = document.createElement(focusable ? 'button' : 'div');
      row.className = 'a11yp__row';
      row.style.paddingLeft = `${8 + depth * 16}px`;
      if (focusable) { row.type = 'button'; row.addEventListener('click', () => e.focus()); }
      row.append(el('span', 'a11yp__role', a11yRole(e)));
      const nm = a11yName(e, root);
      row.append(el('span', nm ? 'a11yp__name' : 'a11yp__name a11yp__name--empty', nm || '(no accessible name)'));
      li.append(row);
      tree.append(li);
      rows.set(e, row);
    });
    if (out.length > CAP) tree.append(el('li', 'a11yp__empty', `…and ${out.length - CAP} more`));

    function describe() {
      // For a ShadowRoot, root.activeElement is the focused node within it;
      // for an element root it's undefined, so fall back to document.
      const a = root.activeElement || document.activeElement;
      rows.forEach((r) => r.classList.remove('is-active'));
      if (a && root.contains(a) && a !== root) {
        const nm = a11yName(a, root) || '(no name)';
        const st = a11yState(a);
        sr.textContent = `“${nm}, ${a11yRole(a)}${st ? ', ' + st : ''}”`;
        const r = rows.get(a); if (r) { r.classList.add('is-active'); r.scrollIntoView({ block: 'nearest' }); }
      } else {
        sr.textContent = '';
        sr.append(el('span', 'a11yp__muted', 'Focus an element in the demo to hear its announcement…'));
      }
    }
    root.addEventListener('focusin', describe);
    root.addEventListener('input', describe);
    root.addEventListener('change', describe);
    document.addEventListener('focusout', () => requestAnimationFrame(describe));

    return view;
  }

  // ── 1) Explicit panes (intro/concept pages) ─────────────────────────
  const hasExplicit = document.querySelector('[data-code-from], [data-code-html]');
  document.querySelectorAll('[data-code-from]').forEach((pre) => {
    const src = document.getElementById(pre.dataset.codeFrom);
    if (src) pre.innerHTML = render(src.textContent, src.tagName === 'STYLE' ? 'css' : 'js');
  });
  document.querySelectorAll('[data-code-html]').forEach((pre) => {
    const raw = (window.__markup || {})[pre.dataset.codeHtml];
    if (raw != null) pre.innerHTML = render(raw, 'html');
  });

  // ── Reusable code pane: Source ⇄ Accessibility tabs ─────────────────
  // sources: [{ cap, code, lang }]   a11yRoot: element or ShadowRoot to inspect
  function buildPane({ filename, sources, a11yRoot }) {
    const aside = el('aside', 'code-pane');
    aside.setAttribute('aria-label', 'Source and accessibility for this demo');

    const bar = el('div', 'code-pane__bar');
    bar.append(el('span', 'dot'), el('span', 'dot'), el('span', 'dot'));
    const tabs = el('div', 'code-pane__tabs');
    tabs.setAttribute('role', 'tablist');
    const tabCode = el('button', 'code-pane__tab', 'Source');
    const tabA11y = el('button', 'code-pane__tab', 'Accessibility');
    [tabCode, tabA11y].forEach((b) => { b.type = 'button'; b.setAttribute('role', 'tab'); });
    tabCode.setAttribute('aria-selected', 'true');
    tabA11y.setAttribute('aria-selected', 'false');
    tabs.append(tabCode, tabA11y);
    bar.append(tabs, el('span', 'code-pane__name', filename || ''));
    aside.append(bar);

    const codeView = el('div', 'code-pane__scroll');
    codeView.dataset.viewPanel = 'code';
    codeView.innerHTML = (sources || [])
      .filter((s) => s && s.code && s.code.trim())
      .map((s) => `<p class="code-pane__cap">${esc(s.cap)}</p><pre class="code-pane__pre">${render(s.code, s.lang || 'js')}</pre>`)
      .join('');
    aside.append(codeView);

    const a11yView = a11yRoot ? buildA11yView(a11yRoot) : el('div', 'code-pane__scroll a11yp');
    a11yView.hidden = true;
    aside.append(a11yView);

    const show = (which) => {
      const code = which === 'code';
      codeView.hidden = !code;
      a11yView.hidden = code;
      tabCode.setAttribute('aria-selected', code ? 'true' : 'false');
      tabA11y.setAttribute('aria-selected', code ? 'false' : 'true');
    };
    tabCode.addEventListener('click', () => show('code'));
    tabA11y.addEventListener('click', () => show('a11y'));
    return aside;
  }

  // Expose for embed pages (assets/demo-embed.js mounts demos in a shadow
  // root and builds its own pane).
  window.CodePane = { render, buildA11yView, buildPane };

  // ── 2) Auto-build demo|code layout (full example pages) ──────────────
  // Embed pages (those with a .demo-host) build their own pane in demo-embed.js.
  if (!hasExplicit && !document.querySelector('.demo-host')) autoInject();

  function autoInject() {
    const main = document.querySelector('main.content');
    const stage = main && main.querySelector('section.stage');
    if (!main || !stage || stage.closest('.demo-code')) return;

    const js = [...document.querySelectorAll('script')]
      .filter((s) => !s.src && (!s.type || /javascript|module/.test(s.type)))
      .map((s) => s.textContent.trim())
      .filter(Boolean)
      .join('\n\n');

    let html = '';
    const canvas = stage.querySelector('canvas.scene') || stage.querySelector('canvas');
    if (canvas) {
      const clone = canvas.cloneNode(true);
      ['style', 'width', 'height'].forEach((a) => clone.removeAttribute(a));
      clone.querySelectorAll('[style]').forEach((e) => e.removeAttribute('style'));
      html = clone.outerHTML;
    }

    document.body.setAttribute('data-wide', '');

    const wrap = el('section', 'demo-code');
    const left = el('div');
    stage.parentNode.insertBefore(wrap, stage);
    left.appendChild(stage);
    wrap.appendChild(left);

    let a11yRoot = canvas;
    if (canvas && !canvas.children.length) a11yRoot = stage.querySelector('.fallback-host') || canvas;

    wrap.appendChild(buildPane({
      filename: location.pathname.split('/').pop() || 'index.html',
      sources: [
        html ? { cap: 'The element inside the canvas', code: html, lang: 'html' } : null,
        { cap: 'The script that drives it', code: js, lang: 'js' },
      ],
      a11yRoot,
    }));

    // The stage just changed width — let size-on-resize demos re-fit.
    window.dispatchEvent(new Event('resize'));
  }
})();
