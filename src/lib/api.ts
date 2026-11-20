import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { SessionData } from "./core/session";

export interface ImageEntry {
  path: string;
  name: string;
  size: number;
}

export interface FolderInfo {
  path: string;
  displayPath: string;
  images: ImageEntry[];
}

export interface LaunchArgs {
  directory: string | null;
  mode: string | null;
  lang: string | null;
}

export interface Operation {
  from: string;
  toDir?: string;
  toName: string;
}

export type Method = "move" | "copy";

export interface Journal {
  folder: string;
  method: Method;
  createdAt: number;
  targetFolder: string;
  entries: { from: string; to: string }[];
  createdDirs: string[];
}

export type ApplyError =
  { kind: "conflicts"; paths: string[] } | { kind: "invalid"; message: string } | { kind: "io"; message: string };

export interface RevertReport {
  restored: number;
  failed: string[];
}

export const api = {
  launchArgs: () => invoke<LaunchArgs>("launch_args"),
  scanFolder: (path: string) => invoke<FolderInfo>("scan_folder", { path }),
  thumbnail: (path: string, size: number) => invoke<string>("thumbnail", { path, size }),
  loadSession: async (folder: string): Promise<SessionData | null> => {
    const text = await invoke<string | null>("session_load", { folder });
    try {
      return text ? (JSON.parse(text) as SessionData) : null;
    } catch {
      return null;
    }
  },
  saveSession: (data: SessionData) =>
    invoke<void>("session_save", { folder: data.folder, content: JSON.stringify(data) }),
  clearSession: (folder: string) => invoke<void>("session_clear", { folder }),
  loadJournal: (folder: string) => invoke<Journal | null>("journal_load", { folder }),
  apply: (request: { folder: string; method: Method; copyFolder?: string; operations: Operation[] }) =>
    invoke<Journal>("apply_result", { request }),
  revertLast: (folder: string) => invoke<RevertReport>("revert_last", { folder }),
  openFolder: (path: string) => invoke<void>("open_folder", { path }),
};

/** URL the web view can load a local image from. */
export function imageUrl(path: string): string {
  return convertFileSrc(path);
}

/**
 * Thumbnails are created in the backend; a few at a time, so the summary of 500 photos does not start
 * 500 decoders at once. Falls back to the original image (e.g. AVIF, which the backend cannot decode).
 */
const queue: (() => void)[] = [];
let running = 0;
const MAX_PARALLEL = 4;
const cache = new Map<string, Promise<string>>();

export function thumbnailUrl(path: string, size: number): Promise<string> {
  const key = `${size}|${path}`;
  let promise = cache.get(key);
  if (!promise) {
    promise = new Promise<string>((resolve) => {
      const start = () => {
        running++;
        api
          .thumbnail(path, size)
          .then((thumb) => resolve(convertFileSrc(thumb)))
          .catch(() => resolve(convertFileSrc(path)))
          .finally(() => {
            running--;
            queue.shift()?.();
          });
      };
      if (running < MAX_PARALLEL) start();
      else queue.push(start);
    });
    cache.set(key, promise);
  }
  return promise;
}

/** Loads images ahead of time, so the next pair appears without a visible delay. */
export function preload(paths: string[]): void {
  for (const path of paths) {
    const img = new Image();
    img.decoding = "async";
    img.src = convertFileSrc(path);
  }
}
