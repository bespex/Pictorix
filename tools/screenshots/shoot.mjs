#!/usr/bin/env node
// Takes the screenshots of Pictorix from its real frontend.
//
//   node tools/screenshots/shoot.mjs [options]
//
//   --shot <name>    only this image (repeatable); default: all, see SHOTS below
//   --theme <name>   light or dark (repeatable); default: both
//   --no-build       use the existing dist/ instead of building first
//   --site [dir]     also write WebP files to <dir>/public/shots/pictorix-<name>-<theme>.webp
//                    (default dir: ../bespex.github.io next to this repository)
//   --out <dir>      where the PNGs go (default: tools/screenshots/out)
//
// Needs Chromium or Chrome, Node 22 and for --site cwebp (apt install webp). No Tauri, no display:
// the frontend runs against mock-tauri.js with the demo images from demo/ (AI-generated, from iorg).
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const WIDTH = 1100;
const HEIGHT = 740;
const SCALE = 2;
const THEMES = ["light", "dark"];

// ---- what to take -------------------------------------------------------------
// Images are voted on in natural file order: blossom-finch, flamingo, fluffy-owl, griffin, parrot,
// phoenix, rainbow-kitten, raven. A saved session (resumed with a click) or key presses set the scene.
const CATEGORIES = ["birds", "fantasy", "cats"];
const categorized = ["birds", "birds", "birds", "fantasy", "birds", "fantasy", "cats", "birds"];
const SHOTS = [
  { name: "welcome", welcome: true },
  { name: "select", keys: ["1"] },
  { name: "order", mode: "order", keys: ["Enter", "ArrowLeft", "Enter", "ArrowLeft", "Enter"] },
  { name: "knockout", mode: "full-knockout", keys: ["Enter", "ArrowLeft", "Enter", "Enter"] },
  { name: "rate", mode: "rate", keys: ["8", "6", "9", "7"] },
  { name: "categorize", session: { mode: "categorize", answers: categorized.slice(0, 5), categories: CATEGORIES }, resume: true },
  { name: "summary", session: { mode: "categorize", answers: categorized, categories: CATEGORIES }, resume: true },
];

// ---- options --------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = { shots: [], themes: [], build: true, site: null, out: path.join(HERE, "out") };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--shot") opt.shots.push(args[++i]);
  else if (a === "--theme") opt.themes.push(args[++i]);
  else if (a === "--no-build") opt.build = false;
  else if (a === "--site") opt.site = args[i + 1] && !args[i + 1].startsWith("--") ? path.resolve(args[++i]) : path.resolve(ROOT, "../bespex.github.io");
  else if (a === "--out") opt.out = path.resolve(args[++i]);
  else die(`unknown option ${a}`);
}
if (!opt.themes.length) opt.themes = THEMES;
for (const t of opt.themes) if (!THEMES.includes(t)) die(`unknown theme ${t} (${THEMES.join(", ")})`);
const shots = opt.shots.length ? SHOTS.filter((s) => opt.shots.includes(s.name)) : SHOTS;
if (!shots.length) die(`no such image; available: ${SHOTS.map((s) => s.name).join(", ")}`);

function die(msg) {
  console.error(`shoot: ${msg}`);
  process.exit(1);
}

if (opt.build) {
  console.log("building …");
  if (spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" }).status) die("build failed");
}
const DIST = path.join(ROOT, "dist");
if (!existsSync(path.join(DIST, "index.html"))) die("dist/ is missing (drop --no-build)");

// ---- demo data --------------------------------------------------------------------
const DEMO = path.join(HERE, "demo");
const images = readdirSync(DEMO)
  .filter((f) => f.endsWith(".jpg"))
  .sort()
  .map((name) => ({ path: `/demo/${name}`, name, size: statSync(path.join(DEMO, name)).size }));
const folder = { path: "/demo", displayPath: "~/Pictures/Fantasy birds", images };

function demoFor(shot) {
  const session = shot.session && {
    version: 1,
    folder: folder.path,
    files: images.map((i) => i.name),
    savedAt: Date.UTC(2026, 10, 20, 9, 30),
    ...shot.session,
  };
  const directory = shot.welcome ? null : folder.path;
  return { launch: { directory, mode: shot.mode ?? null, lang: "en" }, folder, session };
}

// ---- static server for dist/ and demo/ ----------------------------------------------
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
function serve() {
  const server = createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const demo = url.startsWith("/demo/");
    const root = demo ? DEMO : DIST;
    const file = path.join(root, demo ? url.slice(6) : url === "/" ? "index.html" : url);
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// ---- Chrome over the DevTools protocol -------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchChrome() {
  const bin = ["chromium", "google-chrome", "chromium-browser"].find((b) => spawnSync("which", [b]).status === 0);
  if (!bin) die("Chromium or Chrome not found");
  const profile = mkdtempSync(path.join(tmpdir(), "pictorix-shots-"));
  const child = spawn(bin, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--lang=en-US", "--no-first-run",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore", env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" } });
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) die("Chrome did not start");
  return { child, profile, port: readFileSync(portFile, "utf8").split("\n")[0] };
}

async function connect(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { pending.set(++id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  return { send, close: () => ws.close() };
}

async function evaluate(cdp, expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}

async function waitFor(cdp, expression, what, timeout = 8000) {
  for (let t = 0; t < timeout; t += 50) {
    if (await evaluate(cdp, expression)) return;
    await sleep(50);
  }
  throw new Error(`timed out waiting for ${what}`);
}

const imagesLoaded = `(document.images.length > 0 || !!document.querySelector("main svg")) && [...document.images].every((i) => i.complete && i.naturalWidth > 0)`;

async function press(cdp, key) {
  const digit = /^\d$/.test(key);
  const codes = { Enter: 13, ArrowLeft: 37 };
  const base = {
    key,
    code: digit ? `Digit${key}` : key,
    windowsVirtualKeyCode: digit ? key.charCodeAt(0) : codes[key],
  };
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", ...base, ...(digit || key === "Enter" ? { text: digit ? key : "\r" } : {}) });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}

// ---- one image ---------------------------------------------------------------------------
async function take(cdp, base, shot, theme) {
  const mock = readFileSync(path.join(HERE, "mock-tauri.js"), "utf8");
  const setup = `window.__DEMO__ = ${JSON.stringify(demoFor(shot))};
try { localStorage.clear(); localStorage.setItem("pictorix.lang", "en"); } catch {}
${mock}`;
  await cdp.send("Page.enable");
  const { identifier } = await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: setup });
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: false });
  await cdp.send("Page.navigate", { url: base });
  await waitFor(cdp, imagesLoaded, "the first screen");

  if (shot.resume) {
    await waitFor(cdp, `!!document.querySelector(".banner.resume .btn.primary")`, "the resume button");
    await evaluate(cdp, `document.querySelector(".banner.resume .btn.primary").click()`);
    await sleep(400);
  }
  for (const key of shot.keys ?? []) {
    await waitFor(cdp, imagesLoaded, "the images");
    await press(cdp, key);
    await sleep(900); // the compare modes animate the chosen image
  }
  await waitFor(cdp, imagesLoaded, "the images");

  // no caret, no focus ring, no hover state
  await evaluate(cdp, `document.activeElement?.blur(); window.scrollTo(0, 0)`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: WIDTH - 1, y: HEIGHT - 1 });
  await sleep(600);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  return Buffer.from(data, "base64");
}

// ---- run ---------------------------------------------------------------------------------
const chrome = await launchChrome();
const server = await serve();
let failed = false;
try {
  const cdp = await connect(chrome.port);
  const base = `http://127.0.0.1:${server.address().port}/`;
  mkdirSync(opt.out, { recursive: true });
  for (const shot of shots) {
    for (const theme of opt.themes) {
      const file = path.join(opt.out, `${shot.name}-${theme}.png`);
      writeFileSync(file, await take(cdp, base, shot, theme));
      console.log(path.relative(ROOT, file));
      if (opt.site) {
        const dir = path.join(opt.site, "public", "shots");
        mkdirSync(dir, { recursive: true });
        const webp = path.join(dir, `pictorix-${shot.name}-${theme}.webp`);
        if (spawnSync("cwebp", ["-quiet", "-q", "90", file, "-o", webp]).status) die("cwebp failed (apt install webp)");
      }
    }
  }
  cdp.close();
} catch (e) {
  console.error(`shoot: ${e.message}`);
  failed = true;
} finally {
  server.close();
  chrome.child.kill();
  await sleep(300);
  rmSync(chrome.profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
