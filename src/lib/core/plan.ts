import type { ImageFile, Mode, Outcome } from "./types";

export interface PlanOptions {
  /**
   * Removes a placement or rating prefix from an earlier run ("003-beach.jpg" -> "beach.jpg") before
   * the new one is added, so sorting a folder twice does not give "001-003-beach.jpg".
   */
  replacePrefix: boolean;
}

export interface PlannedFile {
  file: ImageFile;
  value: string;
  /** Subfolder, e.g. the category; undefined for the rename modes. */
  toDir?: string;
  toName: string;
}

/** Two or three digits and a dash - what Pictorix and iorg put in front of a file name. */
const PREFIX = /^\d{2,3}-(?=[^.])/;

export function stripPrefix(name: string): string {
  return name.replace(PREFIX, "");
}

export function pad(value: number, digits: number): string {
  return String(value).padStart(digits, "0");
}

/**
 * Turns a typed category into a folder name that works on Windows and Linux alike.
 * Returns an empty string if nothing usable is left.
 */
export function toFolderName(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/, "");
  if (cleaned === "" || cleaned === "." || cleaned === "..") return "";
  // names Windows reserves for devices
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(cleaned) ? `${cleaned}_` : cleaned;
}

function splitExtension(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
}

export function planFiles(mode: Mode, outcomes: readonly Outcome[], options: PlanOptions): PlannedFile[] {
  const base = (name: string) => (options.replacePrefix ? stripPrefix(name) : name);
  const planned = outcomes.map((o): PlannedFile => {
    switch (mode) {
      case "rate":
        return { ...o, toName: `${pad(Number(o.value), 2)}-${base(o.file.name)}` };
      case "categorize":
        return { ...o, toDir: o.value, toName: o.file.name };
      default:
        return { ...o, toName: `${pad(Number(o.value), 3)}-${base(o.file.name)}` };
    }
  });

  // removing old prefixes can make two names equal ("01-a.jpg" and "02-a.jpg" with the same rating)
  const used = new Set<string>();
  for (const p of planned) {
    const [stem, ext] = splitExtension(p.toName);
    let candidate = p.toName;
    for (let n = 2; used.has(`${p.toDir ?? ""}/${candidate}`.toLowerCase()); n++) {
      candidate = `${stem}-${n}${ext}`;
    }
    used.add(`${p.toDir ?? ""}/${candidate}`.toLowerCase());
    p.toName = candidate;
  }
  return planned;
}

export function targetPath(p: PlannedFile): string {
  return p.toDir ? `${p.toDir}/${p.toName}` : p.toName;
}

export function changes(p: PlannedFile): boolean {
  return !!p.toDir || p.toName !== p.file.name;
}
