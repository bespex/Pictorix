/** The last folders, kept in the web view's local storage - only a convenience, so every access may fail. */
export interface RecentFolder {
  path: string;
  displayPath: string;
}

const KEY = "pictorix.recent";
const MAX = 6;

export function recentFolders(): RecentFolder[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((f) => typeof f?.path === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberFolder(path: string, displayPath: string): void {
  try {
    const list = [{ path, displayPath }, ...recentFolders().filter((f) => f.path !== path)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function forgetFolder(path: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(recentFolders().filter((f) => f.path !== path)));
  } catch {
    /* ignore */
  }
}
