<script lang="ts">
  import { onMount } from "svelte";
  import { getCurrentWebview } from "@tauri-apps/api/webview";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { open } from "@tauri-apps/plugin-dialog";
  import { pictureDir } from "@tauri-apps/api/path";
  import { api, type FolderInfo, type Journal } from "./lib/api";
  import { Session, type SessionData } from "./lib/core/session";
  import { isMode, type Mode } from "./lib/core/types";
  import { setLang, t, tk } from "./lib/i18n.svelte";
  import { dialog } from "./lib/dialog.svelte";
  import { rememberFolder } from "./lib/recent";
  import Welcome from "./components/Welcome.svelte";
  import ModeSelect from "./components/ModeSelect.svelte";
  import VoteScreen from "./components/VoteScreen.svelte";
  import Summary from "./components/Summary.svelte";
  import Done from "./components/Done.svelte";
  import ConfirmDialog from "./components/ConfirmDialog.svelte";

  type Screen =
    | { kind: "loading" }
    | { kind: "welcome"; error?: string }
    | { kind: "select"; folder: FolderInfo; saved: SessionData | null; journal: Journal | null; message?: string }
    | { kind: "vote"; folder: FolderInfo; session: Session }
    | { kind: "summary"; folder: FolderInfo; session: Session }
    | { kind: "done"; folder: FolderInfo; journal: Journal };

  let screen = $state<Screen>({ kind: "loading" });
  let dragging = $state(false);

  const appWindow = getCurrentWindow();

  $effect(() => {
    const title =
      screen.kind === "vote" || screen.kind === "summary"
        ? `Pictorix · ${tk(`mode.${screen.session.mode}`)} · ${screen.folder.displayPath}`
        : screen.kind === "select" || screen.kind === "done"
          ? `Pictorix · ${screen.folder.displayPath}`
          : "Pictorix";
    appWindow.setTitle(title).catch(() => {});
  });

  onMount(() => {
    start();
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      const payload = event.payload;
      if (payload.type === "enter" || payload.type === "over") dragging = true;
      else if (payload.type === "leave") dragging = false;
      else if (payload.type === "drop") {
        dragging = false;
        const path = payload.paths[0];
        // dropping while voting would throw away the view; the session is saved anyway
        if (path && screen.kind !== "vote") openFolder(path);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  });

  async function start() {
    const args = await api.launchArgs().catch(() => ({ directory: null, mode: null, lang: null }));
    setLang(args.lang);
    if (!args.directory) {
      screen = { kind: "welcome" };
      return;
    }
    const folder = await scan(args.directory);
    if (!folder) return;
    const mode = args.mode;
    if (isMode(mode) && folder.images.length >= Session.minimumImages(mode)) {
      startSession(folder, new Session(mode, folder.images));
    } else {
      await showSelect(folder);
    }
  }

  async function scan(path: string): Promise<FolderInfo | null> {
    try {
      return await api.scanFolder(path);
    } catch (e) {
      const message = String(e);
      screen = {
        kind: "welcome",
        error: message.startsWith("not-a-directory:")
          ? t("error.noDirectory", message.slice(16))
          : t("error.generic", message),
      };
      return null;
    }
  }

  async function openFolder(path: string) {
    const folder = await scan(path);
    if (folder) await showSelect(folder);
  }

  async function chooseFolder() {
    const defaultPath = await pictureDir().catch(() => undefined);
    const picked = await open({ directory: true, title: t("directory.choose.title"), defaultPath });
    if (typeof picked === "string") await openFolder(picked);
  }

  async function showSelect(folder: FolderInfo, message?: string) {
    if (folder.images.length === 0) {
      screen = { kind: "welcome", error: `${t("select.noImages")}\n${folder.displayPath}` };
      return;
    }
    rememberFolder(folder.path, folder.displayPath);
    const [saved, journal] = await Promise.all([
      api.loadSession(folder.path).catch(() => null),
      api.loadJournal(folder.path).catch(() => null),
    ]);
    // a saved session only counts if it still fits the folder
    const usable = saved && Session.fromData(saved, folder.images) ? saved : null;
    screen = { kind: "select", folder, saved: usable, journal, message };
  }

  function startSession(folder: FolderInfo, session: Session) {
    screen = session.finished ? { kind: "summary", folder, session } : { kind: "vote", folder, session };
  }

  function startMode(folder: FolderInfo, mode: Mode) {
    const session = new Session(mode, folder.images);
    api.saveSession(session.toData(folder.path)).catch(() => {});
    startSession(folder, session);
  }

  function resume(folder: FolderInfo, data: SessionData) {
    const session = Session.fromData(data, folder.images);
    if (session) startSession(folder, session);
  }

  async function rescanAndSelect(path: string, message?: string) {
    const folder = await scan(path);
    if (folder) await showSelect(folder, message);
  }
</script>

<main class:dragging>
  {#if screen.kind === "welcome"}
    <Welcome error={screen.error} onChoose={chooseFolder} onOpen={openFolder} />
  {:else if screen.kind === "select"}
    {@const s = screen}
    <ModeSelect
      folder={s.folder}
      saved={s.saved}
      journal={s.journal}
      message={s.message}
      onStart={(mode) => startMode(s.folder, mode)}
      onResume={(data) => resume(s.folder, data)}
      onDiscard={async () => {
        await api.clearSession(s.folder.path).catch(() => {});
        screen = { ...s, saved: null };
      }}
      onReverted={(message) => rescanAndSelect(s.folder.path, message)}
      onOtherFolder={chooseFolder}
    />
  {:else if screen.kind === "vote"}
    {@const s = screen}
    <VoteScreen
      folder={s.folder}
      session={s.session}
      onFinished={() => (screen = { kind: "summary", folder: s.folder, session: s.session })}
      onBack={() => showSelect(s.folder)}
    />
  {:else if screen.kind === "summary"}
    {@const s = screen}
    <Summary
      folder={s.folder}
      session={s.session}
      onBack={() => {
        s.session.undo();
        api.saveSession(s.session.toData(s.folder.path)).catch(() => {});
        screen = { kind: "vote", folder: s.folder, session: s.session };
      }}
      onDiscard={async () => {
        await api.clearSession(s.folder.path).catch(() => {});
        await showSelect(s.folder);
      }}
      onApplied={(journal) => (screen = { kind: "done", folder: s.folder, journal })}
    />
  {:else if screen.kind === "done"}
    {@const s = screen}
    <Done
      journal={s.journal}
      onAgain={(message) => rescanAndSelect(s.folder.path, message)}
      onQuit={() => appWindow.close()}
    />
  {/if}

  {#if dragging && screen.kind !== "vote"}
    <div class="drop-overlay">{t("welcome.drop")}</div>
  {/if}

  {#if dialog.current}
    <ConfirmDialog request={dialog.current} />
  {/if}
</main>

<style>
  main {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .drop-overlay {
    position: fixed;
    inset: 12px;
    border: 3px dashed var(--accent);
    border-radius: 16px;
    background: color-mix(in srgb, var(--accent-soft) 85%, transparent);
    display: grid;
    place-items: center;
    font-size: 22px;
    font-weight: 600;
    color: var(--accent);
    pointer-events: none;
    z-index: 50;
  }
</style>
