# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static playground demonstrating Chrome's **HTML-in-Canvas origin trial**, which paints a
live, interactive DOM subtree into a `<canvas>`. There is **no build system, no package
manager, no dependencies**: just hand-written HTML/CSS/JS served as static files.

### The trial covers BOTH 2D and WebGL — it is not 2D-only

The origin trial adds an entry point to *both* canvas context types. Don't assume you must
fall back to the 2D context for 3D work — there is a native WebGL path:

- **2D:** `CanvasRenderingContext2D.drawElementImage(element, x, y)` — paints the element into
  the 2D bitmap and returns a `DOMMatrix` that maps the element's box to where it was drawn
  (assign it to `element.style.transform` to keep the live DOM hit-box on the painted pixels).
  Used by examples 01–15.
- **WebGL / WebGL2:** `gl.texElementImage2D(target, level, internalformat, format, type, element)`
  — the texture-upload counterpart (mirrors `texImage2D`'s element overload, arity 6). Uploads
  the live element straight to the GPU as a texture for use on real 3D geometry with shaders.
  Used by example 16 (3D login orb mapped onto an actual sphere mesh). It throws
  `"No cached paint record for element"` until the element has painted at least once, so retry
  on the next frame until the upload succeeds, and re-upload only when the element changes.

WebGL gives you no returned transform for hit-testing. To keep a `texElementImage2D` form
interactive, the element is still a `layoutsubtree` child, so you can pin its DOM hit-box by
projecting the target geometry to screen and writing a `matrix(...)` to `element.style.transform`
yourself (see example 16's `setHitBox`).

Performance note: `drawElementImage` / `texElementImage2D` rasterize the DOM subtree, which is
**main-thread work that a fast GPU cannot accelerate**. Call them ONCE per change (cache the
result — a captured 2D bitmap, or the GPU texture) and reuse across frames; never per-tile or
per-frame. Example 15 learned this the hard way (it called `drawElementImage` ~72×/frame and
was unusable even on a high-end GPU until switched to capture-once + `drawImage`).

## Running

Open `index.html` directly (`file://`) or serve the folder with any static server. Relative
paths resolve from the repo root (`index.html`) and from `examples/` (which reference
`../assets/`).

The API only exists in Chrome 148+ launched with a runtime flag. The canonical way to enable
and test it (per [.debug/README.md](.debug/README.md)):

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --enable-blink-features=CanvasDrawElement `
  --user-data-dir="C:\Code\canvas-html\.debug\chrome-profile" `
  file:///c:/Code/canvas-html/index.html
```

Without the flag, `drawElementImage` is `undefined` on the prototype and demos fall back to
plain DOM. `.debug/probe.html` is a one-pager that prints whether the API is present.

### Driving Chrome from Claude (MCP)

[.mcp.json](.mcp.json) defines a project-scoped `chrome-canvas` MCP server — it runs
`chrome-devtools-mcp` with `--enable-blink-features=CanvasDrawElement` pre-applied, so the
API is live in the controlled browser. Use the `mcp__chrome-canvas__*` tools (e.g.
`new_page`, `navigate_page`, `evaluate_script`, `take_screenshot`) to load and verify demos.
This is the primary way to confirm a demo actually renders, since the flag isn't on in normal
browsers.

## Layout

- `index.html` — home gallery (one `<article class="card">` per demo).
- `examples/NN-name.html` — self-contained demos, numbered 01–16. Each is a full page with its
  demo-specific CSS/JS inline.
- `examples/_example-template.html` — copy this to start a new demo.
- `assets/styles.css` — global design system (CSS custom-property tokens in `:root`) plus the
  home page and sidebar chrome.
- `assets/example.css` — shared demo-stage chrome (`.canvas-host`, `.diag`, `canvas.scene`,
  `.fallback-host`, `.controls`, `.notice`). Examples 03+ link it; 01 and 02 predate it and
  inline equivalent styles.
- `assets/sidebar.js` — builds and injects the left nav into any page with
  `<div id="sidebar-slot">`. **This is the single source of truth for the demo list.**
- `assets/support-check.js` — feature-detects `drawElementImage`, sets
  `body[data-canvas-html-supported]` and the sidebar support pill.
- `.debug/` — launch notes, the API probe page, and reference screenshots.

Every page mounts the same chrome by including, before `</body>`:
```html
<div id="sidebar-slot" data-base="../"></div>   <!-- data-base="./" on index.html -->
<script src="../assets/sidebar.js" defer></script>
<script src="../assets/support-check.js" defer></script>
```

## Adding a demo

1. Copy `_example-template.html` to `examples/NN-title.html`.
2. Add a nav entry to the `groups` array in [assets/sidebar.js](assets/sidebar.js).
3. Add a `<article class="card">` to the gallery in [index.html](index.html).

Steps 2 and 3 are separate edits — the sidebar and the home gallery are not generated from a
shared manifest, so a new demo must be registered in both.

## The core rendering pattern

All demos follow the same shape (cleanest reference: [examples/01-hello-html.html](examples/01-hello-html.html)):

- The live DOM lives **inside** a `<canvas layoutsubtree>`. The `layoutsubtree` attribute tells
  the browser to lay out the canvas's children.
- `canvas.onpaint = paint` — `onpaint` fires whenever the canvas needs to repaint (DOM
  mutations inside it, user input, focus changes). It is the demo's render loop; there is
  usually no `requestAnimationFrame`.
- Inside `paint()`: `ctx.reset()`, draw a canvas-native backdrop, then call
  `const t = ctx.drawElementImage(element, x, y)` and assign `element.style.transform = t.toString()`.
  The returned transform positions the element's hit-test layer so clicks and focus rings land
  on the painted pixels.
- **Animation is driven by repaints, not a timer.** A CSS animation (or any painted property
  change) makes the browser repaint each compositor frame, which re-fires `onpaint`. To force a
  single repaint on demand, demos use a `nudge()` helper that toggles a genuinely-painted
  property by an imperceptible amount (e.g. `opacity: 1` ↔ `0.999999`) — changes that don't
  affect rendering get optimized away and won't trigger `onpaint`.

Conventions that matter for correctness:

- The canvas is kept **1:1 with CSS pixels (no devicePixelRatio scaling)** so the returned
  transform aligns with the DOM box's on-screen position for hit-testing. This trades backdrop
  sharpness on hi-DPI displays for correct pointer/focus alignment.
- `canvas.scene { pointer-events: none }` with `canvas.scene > * { pointer-events: auto }` lets
  clicks pass through the canvas bitmap to the live DOM children underneath.
- Source elements use `transform-origin: 0 0` — the returned transform assumes a top-left
  anchor. When using `ctx.rotate`/`ctx.scale` first, pass negative-half-size coords to
  `drawElementImage` to center (see [examples/02-transforms.html](examples/02-transforms.html)).
- Every demo has a **fallback path**: if `drawElementImage` is missing, move the source element
  out of the canvas into a `.fallback-host` and show a `.notice` explaining the flag, rather
  than rendering blank.
- Demos surface state via the `.diag` pill (ok/bad/pending), an FPS/`.stat` readout, a runtime
  error `.notice`, and a "Save snapshot (PNG)" button that does `canvas.toDataURL('image/png')`.
