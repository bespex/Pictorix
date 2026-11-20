#!/usr/bin/env node
// Writes the mode illustrations of src/lib/modeArt.ts as standalone SVG files that follow light and dark mode
// on their own, e.g. for the website:
//
//   node --experimental-strip-types tools/mode-art.mjs [out-dir]
//
// Default out-dir: ../bespex.github.io/public/modes/pictorix next to this repository.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { modeArt } from "../src/lib/modeArt.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] ?? path.join(ROOT, "../bespex.github.io/public/modes/pictorix"));
// the colours of ModeArt.svelte, so app and website look the same
const component = readFileSync(path.join(ROOT, "src/components/ModeArt.svelte"), "utf8");
const block = (re) => component.match(re)[1].split("\n").filter((l) => l.trim().startsWith("--")).map((l) => l.trim()).join(" ");
const light = block(/\.mode-art \{([\s\S]*?)\}/);
const dark = block(/@media \(prefers-color-scheme: dark\) \{\s*\.mode-art \{([\s\S]*?)\}/);
const style = `<style>svg{${light}}@media (prefers-color-scheme: dark){svg{${dark}}}</style>`;

mkdirSync(out, { recursive: true });
for (const mode of ["order", "simple-knockout", "full-knockout", "rate", "categorize"]) {
  const svg = modeArt(mode).replace(/^<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/(<svg[^>]*>)/, `$1${style}`);
  writeFileSync(path.join(out, `${mode}.svg`), svg + "\n");
  console.log(path.join(out, `${mode}.svg`));
}
