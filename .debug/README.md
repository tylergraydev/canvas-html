# Debug notes — HTML in Canvas

## How the API is enabled here

The Chrome HTML-in-Canvas origin trial exposes `CanvasRenderingContext2D.drawElementImage()`.
We do **not** need Chrome Canary 149+. The Blink feature is available in stable Chrome 148+
when the runtime feature flag is passed at launch:

```
--enable-blink-features=CanvasDrawElement
```

Verified locally on Chrome 148.0.7778.179 (Windows). Without the flag the method is
`undefined` on the prototype; with it, the method is present and demos render correctly.

## Launching Chrome for manual testing

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --enable-blink-features=CanvasDrawElement `
  --user-data-dir="C:\Code\canvas-html\.debug\chrome-profile" `
  file:///c:/Code/canvas-html/index.html
```

The `--user-data-dir` keeps this Chrome session separate from your everyday Chrome
profile so the experimental flag doesn't bleed into normal browsing.

## MCP — driving Chrome from this Claude session

A project-scoped MCP server is defined in `../.mcp.json` under the name `chrome-canvas`.
It runs `chrome-devtools-mcp@latest` with the Blink flag pre-applied. After restarting
Claude Code (or running `/mcp` to reload), tools become available as:

```
mcp__chrome-canvas__new_page
mcp__chrome-canvas__evaluate_script
…etc.
```

If you ever install Chrome Canary and prefer that, swap the args in `.mcp.json` to:

```json
"args": [
  "chrome-devtools-mcp@latest",
  "--isolated",
  "--channel", "canary",
  "--chromeArg=--enable-blink-features=CanvasDrawElement"
]
```

## Probe page

`probe.html` is a one-pager that prints whether `drawElementImage` is present. Useful
for quick checks when changing flags or Chrome channels.
