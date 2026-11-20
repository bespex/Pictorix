import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { message } from "@tauri-apps/plugin-dialog";
import { api } from "./api";
import { confirm } from "./dialog.svelte";
import { t } from "./i18n.svelte";

/**
 * At start, the AppImage and the Windows installation look for a newer signed release (latest.json of the
 * latest GitHub release) and offer to install it. A .deb is updated by APT, so nothing is checked there.
 * `canAsk` keeps the question away while the user is voting; the update is offered at the next start then.
 */
export async function offerUpdate(canAsk: () => boolean): Promise<void> {
  try {
    if (!(await api.selfUpdateSupported())) return;
    const update = await check();
    if (!update || !canAsk()) return;
    const install = await confirm(
      t("update.available", update.version, update.currentVersion),
      t("update.install"),
      t("update.later"),
    );
    if (!install) return;
    try {
      await update.downloadAndInstall();
    } catch (e) {
      await message(t("update.failed", String(e)), { title: "Pictorix", kind: "error" });
      return;
    }
    // Windows quits for the installer by itself; the AppImage has to be restarted
    await relaunch();
  } catch (e) {
    console.warn("update check failed", e);
  }
}
