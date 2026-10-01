import { readFile } from "node:fs/promises"
import path from "node:path"
import type { McpServer } from "@modelcontextprotocol/server"
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server"
import { getAppUrl } from "@/lib/app-url"

/** The MCP Apps view that shows cards inline in Claude, ChatGPT and other hosts. */
export const CARD_WIDGET_URI = "ui://cardshare/cards.html"

/** Prebundled MCP Apps view SDK; also listed in next.config `outputFileTracingIncludes`. */
export const APP_SDK_BUNDLE_PATH =
  "node_modules/@modelcontextprotocol/ext-apps/dist/src/app-with-deps.js"

const SDK_GLOBAL = "CardShareMcpApps"

/**
 * Turns the SDK's trailing `export{a as App,...}` into a global, so the bundle
 * can be inlined in the view's HTML and read by the script after it.
 */
export function exposeBundleExports(source: string, globalName: string) {
  const start = source.lastIndexOf("export{")
  const end = source.indexOf("}", start)
  if (start === -1 || end === -1) {
    throw new Error("MCP Apps bundle has no export statement")
  }
  const entries = source
    .slice(start + "export{".length, end)
    .split(",")
    .map((spec) => spec.trim())
    .filter(Boolean)
    .map((spec) => {
      const [local, exported] = spec.split(/\s+as\s+/)
      return `${JSON.stringify(exported ?? local)}:${local}`
    })
  const rest = source.slice(end + 1).replace(/^;/, "")
  return `${source.slice(0, start)}globalThis.${globalName}={${entries.join(",")}};${rest}`
}

/** Keeps inlined script text from closing its own `<script>` tag. */
function inlineScript(source: string): string {
  return source.replace(/<\/script/gi, "<\\/script")
}

const WIDGET_STYLES = `
:root {
  color-scheme: light;
  --bg: #fafaf7;
  --card: #ffffff;
  --fg: #111110;
  --muted: #6b6a66;
  --border: #e7e5df;
  --chip: #f2f0ea;
  --brand: #ff5a4a;
  --brand-fg: #ffffff;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0f0f0f;
  --card: #1a1918;
  --fg: #f7f7f7;
  --muted: #a3a29f;
  --border: #2e2d2b;
  --chip: #262524;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: transparent; }
body {
  font-family: "Inter Tight", Inter, system-ui, -apple-system, sans-serif;
  color: var(--fg);
  font-size: 14px;
  line-height: 1.4;
}
.panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}
.preview {
  display: block;
  width: 100%;
  aspect-ratio: 1200 / 630;
  object-fit: cover;
  background: var(--chip);
}
.body { padding: 14px 16px 16px; display: grid; gap: 12px; }
.title { font-weight: 600; font-size: 15px; }
.meta { color: var(--muted); font-size: 13px; }
.chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--chip);
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
}
.chip.sent { background: color-mix(in srgb, var(--brand) 14%, transparent); color: var(--brand); }
.note {
  font-size: 13px;
  color: var(--fg);
  white-space: pre-wrap;
  border-left: 3px solid var(--brand);
  padding: 2px 0 2px 10px;
}
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
button {
  font: inherit;
  font-weight: 500;
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--fg);
}
button.primary { background: var(--brand); border-color: var(--brand); color: var(--brand-fg); }
button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.fallback {
  width: 100%;
  font: inherit;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--chip);
  color: var(--fg);
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.tile { text-align: left; padding: 0; height: auto; border-radius: 14px; overflow: hidden; display: block; width: 100%; }
.tile .body { padding: 10px 12px 12px; gap: 6px; }
.status { padding: 24px 16px; color: var(--muted); text-align: center; }
.spinner {
  width: 18px; height: 18px; margin: 0 auto 10px;
  border: 2px solid var(--border); border-top-color: var(--brand);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
`

// Runs in the host's sandboxed iframe. Builds the DOM with textContent only.
const WIDGET_SCRIPT = `
const { App } = globalThis.${SDK_GLOBAL};
const root = document.getElementById("root");
const app = new App({ name: "CardShare.ai cards", version: "1.0.0" });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function applyTheme(theme) {
  const dark = theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function open(url) {
  if (url) app.openLink({ url }).catch(() => window.open(url, "_blank", "noopener"));
}

function statusChip(card) {
  if (card.status === "sent") return el("span", "chip sent", "Sent");
  const signed = typeof card.signedCount === "number" ? " · " + card.signedCount + " signed" : "";
  return el("span", "chip", "Collecting messages" + signed);
}

function preview(card) {
  const img = el("img", "preview");
  img.alt = card.headline ? "Card for " + card.recipientName + ": " + card.headline : "Card for " + card.recipientName;
  img.loading = "lazy";
  const src = card.previewImageUrl || card.coverImageUrl;
  if (src) img.src = src;
  return img;
}

async function copy(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = el("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const ok = document.execCommand && document.execCommand("copy");
    field.remove();
    if (!ok) {
      // Clipboard blocked by the host: show the link to copy by hand
      const input = el("input", "fallback");
      input.readOnly = true;
      input.value = text;
      button.replaceWith(input);
      input.focus();
      input.select();
      return;
    }
  }
  const label = button.textContent;
  button.textContent = "Copied!";
  setTimeout(() => (button.textContent = label), 1800);
}

function renderCard(card) {
  const panel = el("div", "panel");
  panel.append(preview(card));
  const body = el("div", "body");
  const heading = el("div");
  heading.append(el("div", "title", "For " + (card.recipientName || "someone")));
  heading.append(el("div", "meta", "From " + (card.senderName || "you")));
  body.append(heading);
  const chips = el("div");
  chips.append(statusChip(card));
  body.append(chips);
  if (card.myMessage) body.append(el("div", "note", "“" + card.myMessage + "”"));

  const actions = el("div", "actions");
  const openButton = el("button", "primary", "Open card");
  openButton.addEventListener("click", () => open(card.editUrl));
  actions.append(openButton);
  if (card.status !== "sent" && card.contributeUrl) {
    const copyButton = el("button", "", "Copy invite link");
    copyButton.addEventListener("click", () => copy(card.contributeUrl, copyButton));
    actions.append(copyButton);
  } else if (card.viewUrl) {
    const viewButton = el("button", "", "View as recipient");
    viewButton.addEventListener("click", () => open(card.viewUrl));
    actions.append(viewButton);
  }
  body.append(actions);
  panel.append(body);
  return panel;
}

function renderGrid(cards) {
  const grid = el("div", "grid");
  for (const card of cards) {
    const tile = el("button", "panel tile");
    tile.setAttribute("aria-label", "Open card for " + (card.recipientName || "someone"));
    tile.addEventListener("click", () => open(card.editUrl));
    tile.append(preview(card));
    const body = el("div", "body");
    body.append(el("div", "title", "For " + (card.recipientName || "someone")));
    const chips = el("div");
    chips.append(statusChip(card));
    body.append(chips);
    tile.append(body);
    grid.append(tile);
  }
  return grid;
}

function renderStatus(text, busy) {
  const box = el("div", "panel status");
  if (busy) box.append(el("div", "spinner"));
  box.append(el("div", "", text));
  root.replaceChildren(box);
}

function render(result) {
  const data = result.structuredContent || {};
  if (result.isError) {
    const text = (result.content || []).find((c) => c.type === "text");
    renderStatus(text ? text.text : "Something went wrong.", false);
    return;
  }
  if (data.card) {
    root.replaceChildren(renderCard(data.card));
  } else if (Array.isArray(data.cards)) {
    root.replaceChildren(
      data.cards.length ? renderGrid(data.cards) : el("div", "panel status", "No cards yet."),
    );
  }
}

app.ontoolinput = (params) => {
  const args = params.arguments || {};
  const text = args.recipientName && !args.cardId
    ? "Creating a card for " + args.recipientName + "…"
    : args.cardId && Object.keys(args).length > 1
      ? "Updating your card…"
      : "Loading…";
  renderStatus(text, true);
};
app.ontoolresult = render;
app.ontoolcancelled = () => renderStatus("Cancelled.", false);
app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyTheme(ctx.theme);
};

applyTheme();
await app.connect();
applyTheme(app.getHostContext()?.theme);
`

let sdkSource: Promise<string> | null = null

function loadSdk(): Promise<string> {
  sdkSource ??= readFile(
    path.join(process.cwd(), APP_SDK_BUNDLE_PATH),
    "utf8",
  ).then((source) => exposeBundleExports(source, SDK_GLOBAL))
  // Retry on the next read if the file couldn't be loaded
  sdkSource.catch(() => (sdkSource = null))
  return sdkSource
}

export async function buildCardWidgetHtml(): Promise<string> {
  const sdk = await loadSdk()
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CardShare.ai</title>
<style>${WIDGET_STYLES}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${inlineScript(sdk)}</script>
<script type="module">${inlineScript(WIDGET_SCRIPT)}</script>
</body>
</html>`
}

function widgetResourceMeta() {
  // Card preview images are served by this app
  return { ui: { csp: { resourceDomains: [new URL(getAppUrl()).origin] } } }
}

export function registerCardWidget(server: McpServer): void {
  registerAppResource(
    server,
    "CardShare.ai cards",
    CARD_WIDGET_URI,
    {
      description: "Shows a greeting card, or a grid of cards, inline.",
      mimeType: RESOURCE_MIME_TYPE,
      _meta: widgetResourceMeta(),
    },
    async () => ({
      contents: [
        {
          uri: CARD_WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await buildCardWidgetHtml(),
          _meta: widgetResourceMeta(),
        },
      ],
    }),
  )
}
