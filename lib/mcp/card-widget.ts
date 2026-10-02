import { readFile } from "node:fs/promises"
import path from "node:path"
import type { McpServer } from "@modelcontextprotocol/server"
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server"
import { getAppUrl } from "@/lib/app-url"
import {
  MAX_SOURCE_IMAGE_BYTES,
  MAX_UPLOAD_FILE_BYTES,
} from "@/lib/source-image-limits"

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
.picker { padding: 20px 16px; display: grid; gap: 8px; text-align: center; }
.actions.centered { justify-content: center; margin-top: 8px; }
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

// Where to send a photo for the card on screen: { token, url } from the tool
// result's _meta (never shown to the model), or null when photos are off.
const PHOTO_META_KEY = "cardshare/photoUpload";
const MAX_PHOTO_BYTES = ${MAX_SOURCE_IMAGE_BYTES};
const MAX_PHOTO_FILE_BYTES = ${MAX_UPLOAD_FILE_BYTES};
const MAX_PHOTO_SIDE = 2048;
let upload = null;
let lastCard = null;
let uploading = false;

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

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", quality),
  );
}

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that photo."));
    reader.readAsDataURL(blob);
  });
}

// Reads the Orientation tag from a JPEG's Exif block (0 when there isn't one)
function exifOrientation(view, start) {
  if (view.getUint32(start) !== 0x45786966) return 0; // "Exif"
  const tiff = start + 6;
  const little = view.getUint16(tiff) === 0x4949;
  const ifd = tiff + view.getUint32(tiff + 4, little);
  const count = view.getUint16(ifd, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
  }
  return 0;
}

// A JPEG's upright size from its header, so it can be decoded straight at a
// smaller size. Null for other formats or a header it can't follow.
async function jpegUprightSize(file) {
  const view = new DataView(await file.slice(0, 512 * 1024).arrayBuffer());
  if (view.getUint16(0) !== 0xffd8) return null;
  let orientation = 1;
  let offset = 2;
  while (offset + 9 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) return null; // image data before a size
    const length = view.getUint16(offset + 2);
    if (marker === 0xe1) {
      orientation = exifOrientation(view, offset + 4) || orientation;
    } else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = view.getUint16(offset + 5);
      const width = view.getUint16(offset + 7);
      // Orientations 5-8 turn the photo on its side
      return orientation >= 5 ? { width: height, height: width } : { width, height };
    }
    offset += 2 + length;
  }
  return null;
}

// Decodes big JPEGs straight at the size we send, so a large photo never
// needs a full-resolution copy in memory; anything else decodes in full.
async function decodePhoto(file) {
  let size = null;
  try {
    size = await jpegUprightSize(file);
  } catch {
    // Unreadable header: decode in full below
  }
  const scale = size ? Math.min(1, MAX_PHOTO_SIDE / Math.max(size.width, size.height)) : 1;
  if (size && scale < 1) {
    const width = Math.round(size.width * scale);
    const height = Math.round(size.height * scale);
    try {
      const bitmap = await createImageBitmap(file, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "high",
        imageOrientation: "from-image",
      });
      // Browsers that resize before applying the rotation return the wrong shape
      if (bitmap.width === width && bitmap.height === height) return bitmap;
      bitmap.close();
    } catch {
      // Resize options unsupported: decode in full below
    }
  }
  return createImageBitmap(file);
}

// Shrinks the photo to a JPEG the server accepts, like the website does
async function photoDataUrl(file) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    throw new Error("That photo is over " + MAX_PHOTO_FILE_BYTES / (1024 * 1024) + " MB. Try a smaller one.");
  }
  let bitmap;
  try {
    bitmap = await decodePhoto(file);
  } catch {
    throw new Error("Couldn't read that photo. Try a JPEG or PNG.");
  }
  try {
    let scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      // JPEG has no transparency; without this, see-through areas turn black
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await canvasBlob(canvas, quality);
        if (blob.size <= MAX_PHOTO_BYTES) return blobDataUrl(blob);
      }
      scale *= 0.7;
    }
    throw new Error("That photo is too large. Try a smaller one.");
  } finally {
    bitmap.close();
  }
}

function choosePhoto(busyText) {
  const target = upload;
  if (!target) return;
  const input = el("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    renderStatus(busyText, true);
    uploading = true;
    try {
      const photo = await photoDataUrl(file);
      const res = await fetch(target.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: target.token, photo }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.card) throw new Error(body.error || "Something went wrong. Please try again.");
      upload = body.upload || null;
      lastCard = body.card;
      root.replaceChildren(renderCard(body.card));
      // Tell the model what happened, since no tool call of its own did this
      if (body.text) {
        app.updateModelContext({ content: [{ type: "text", text: body.text }] }).catch(() => {});
      }
    } catch (err) {
      renderPhotoError(err && err.message ? err.message : "Something went wrong. Please try again.", busyText);
    } finally {
      uploading = false;
    }
  });
  input.click();
}

function renderPhotoError(message, busyText) {
  const box = el("div", "panel status");
  box.append(el("div", "", message));
  const actions = el("div", "actions centered");
  const retry = el("button", "primary", "Choose another photo");
  retry.addEventListener("click", () => choosePhoto(busyText));
  actions.append(retry);
  if (lastCard) {
    const back = el("button", "", "Back to card");
    back.addEventListener("click", () => root.replaceChildren(renderCard(lastCard)));
    actions.append(back);
  }
  box.append(actions);
  root.replaceChildren(box);
}

// The picker can show again for a card that already exists (a reopened chat).
// Each link makes one card, so show that card instead of asking for a photo.
async function showCardIfAlreadyCreated() {
  const target = upload;
  if (!target) return;
  try {
    const res = await fetch(target.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: target.token }),
    });
    const body = await res.json();
    // Only swap if the user hasn't started an upload meanwhile
    if (res.ok && body.card && upload === target && !uploading) {
      upload = body.upload || null;
      lastCard = body.card;
      root.replaceChildren(renderCard(body.card));
    }
  } catch {
    // Keep the picker; a real upload will report any problem
  }
}

function renderPhotoPicker(recipientName) {
  const box = el("div", "panel picker");
  if (!upload) {
    // The host didn't pass on the upload link, so a picker would do nothing
    box.append(el("div", "title", "Photo upload isn't available here"));
    box.append(el("div", "meta", "Ask Claude to make the card without a photo instead."));
    root.replaceChildren(box);
    return;
  }
  box.append(el("div", "title", "Choose a photo for " + (recipientName ? recipientName + "'s" : "your") + " card"));
  box.append(el("div", "meta", "We'll draw the cover from it. Your photo is only used for that; we don't keep it."));
  const actions = el("div", "actions centered");
  const pick = el("button", "primary", "Choose photo");
  pick.addEventListener("click", () =>
    choosePhoto("Drawing the card from your photo… this takes about 30 seconds"),
  );
  actions.append(pick);
  box.append(actions);
  root.replaceChildren(box);
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
  if (upload && card.status !== "sent") {
    const photoButton = el("button", "", "Use my photo");
    photoButton.addEventListener("click", () =>
      choosePhoto("Redrawing the cover from your photo… this takes about 30 seconds"),
    );
    actions.append(photoButton);
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
  upload = (result._meta && result._meta[PHOTO_META_KEY]) || null;
  if (result.isError) {
    const text = (result.content || []).find((c) => c.type === "text");
    renderStatus(text ? text.text : "Something went wrong.", false);
    return;
  }
  if (data.pendingPhoto) {
    renderPhotoPicker(data.pendingPhoto.recipientName);
    showCardIfAlreadyCreated();
  } else if (data.card) {
    lastCard = data.card;
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
  // Card preview images and photo uploads are served by this app
  const origin = new URL(getAppUrl()).origin
  return {
    ui: { csp: { resourceDomains: [origin], connectDomains: [origin] } },
  }
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
