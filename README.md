# Canvas HTML — origin-trial playground

A static playground for Chrome's **HTML-in-Canvas** origin trial, which paints a live,
interactive, **accessible** DOM subtree straight into a `<canvas>` — in both 2D
(`drawElementImage`) and WebGL (`texElementImage2D`). No build system, no dependencies: just
hand-written HTML/CSS/JS served as static files.

**Live site:** https://tylergraydev.github.io/canvas-html/

## What works for everyone vs. what needs the trial

The site degrades gracefully, so it's never blank — but how much you see depends on the browser:

| Page | Works in any browser? | Notes |
|------|----------------------|-------|
| [What is the DOM?](intro/00a-what-is-the-dom.html) | ✅ Yes | Plain DOM — no trial needed |
| [What is a canvas?](intro/00b-what-is-the-canvas.html) | ✅ Yes | Plain 2D canvas + WebGL — no trial needed |
| [Before vs After](intro/02-before-after.html) | ⚠️ Partly | The "old way" panel always works; the live panel needs the trial |
| All `examples/` and `demos/` | ❌ Needs the trial | Otherwise they fall back to plain DOM with a "enable the flag" notice |

> **The actual HTML-in-Canvas demos require Chrome 148–150** with the feature enabled (see
> below). Without it, `drawElementImage` is `undefined` and each demo shows a fallback instead
> of painting into the canvas.

## Enabling the HTML-in-Canvas feature

There are two ways to turn the feature on. Pick based on who's looking.

### Option A — Origin-trial token (lets your *audience* use the live site, no flag)

HTML-in-Canvas is a registered Chrome origin trial covering **Chrome 148–150**. Register a token
for this origin and any visitor on a supported Chrome gets the feature **without touching a flag** —
this is the right path for demos and presentations.

1. Register at the Chrome origin-trial portal:
   https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849
   — use origin `https://tylergraydev.github.io`.
2. Add the issued token to the `<head>` of each page:
   ```html
   <meta http-equiv="origin-trial" content="YOUR_TOKEN_HERE" />
   ```
3. Commit and push — GitHub Pages redeploys and the demos now work for visitors.

Caveats: the trial only covers **Chrome 148–150**, so audience members on other browsers (Firefox,
Safari) or other Chrome versions still see the graceful fallback. The token is bound to this exact
origin.

### Option B — Local flag (for yourself / developers)

Launch Chrome with the runtime flag (per [.debug/README.md](.debug/README.md)):

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --enable-blink-features=CanvasDrawElement `
  --user-data-dir="C:\Code\canvas-html\.debug\chrome-profile" `
  https://tylergraydev.github.io/canvas-html/
```

Or, in Chrome Canary 149+, enable `chrome://flags/#canvas-draw-element`. `.debug/probe.html`
prints whether the API is present.

## Running locally

Open `index.html` directly (`file://`) or serve the folder with any static server. Relative paths
resolve from the repo root and from `examples/`.

## Layout

- `index.html` — home gallery.
- `intro/` — concept pages: two primers (**What is the DOM?**, **What is a canvas?**) followed by
  the HTML-in-Canvas / before-after / accessibility concepts.
- `examples/NN-name.html` — self-contained demos (01–20).
- `demos/` — the gallery from [html-in-canvas.dev](https://html-in-canvas.dev/) (En Dash Consulting,
  MIT — see `demos/UPSTREAM-LICENSE.txt`), re-skinned into this site's chrome.
- `assets/` — global styles, the sidebar (single source of truth for the nav), the support-check,
  and the shared source/accessibility code panes.

See [CLAUDE.md](CLAUDE.md) for the core rendering pattern and conventions.
