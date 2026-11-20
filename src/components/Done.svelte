<script lang="ts">
  import { api, type Journal } from "../lib/api";
  import { t } from "../lib/i18n.svelte";

  let { journal, onAgain, onQuit }: { journal: Journal; onAgain: (message?: string) => void; onQuit: () => void } =
    $props();

  let busy = $state(false);

  async function undo() {
    busy = true;
    try {
      const report = await api.revertLast(journal.folder);
      let text = t("done.reverted", report.restored);
      if (report.failed.length) text += `\n${t("done.revertFailed")}\n${report.failed.join("\n")}`;
      onAgain(text);
    } catch (e) {
      onAgain(t("error.generic", String(e)));
    } finally {
      busy = false;
    }
  }
</script>

<div class="done">
  <div class="box">
    <div class="check" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="40" height="40">
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5 12.5l4.5 4.5L19 7.5"
        />
      </svg>
    </div>
    <h1>{t("done.title")}</h1>
    <p class="muted">
      {journal.method === "copy"
        ? t("done.copied", journal.entries.length, journal.targetFolder)
        : t("done.moved", journal.entries.length)}
    </p>
    <div class="actions">
      <button class="btn primary" onclick={() => api.openFolder(journal.targetFolder)}>{t("done.open")}</button>
      <button class="btn" disabled={busy} onclick={undo}>↶ {t("done.undo")}</button>
      <button class="btn" onclick={() => onAgain()}>{t("done.again")}</button>
      <button class="btn ghost" onclick={onQuit}>{t("done.quit")}</button>
    </div>
  </div>
</div>

<style>
  .done {
    flex: 1;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .box {
    text-align: center;
    max-width: 560px;
  }

  .check {
    width: 72px;
    height: 72px;
    margin: 0 auto 14px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--ok);
    animation: pop 0.3s cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  h1 {
    font-size: 26px;
  }

  p {
    margin: 8px 0 22px;
    word-break: break-all;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  @keyframes pop {
    from {
      transform: scale(0.4);
      opacity: 0;
    }
  }
</style>
