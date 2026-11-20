<script lang="ts">
  import ModeArt from "./ModeArt.svelte";
  import { api, type FolderInfo, type Journal } from "../lib/api";
  import { estimateVotes, Session, type SessionData } from "../lib/core/session";
  import type { Mode } from "../lib/core/types";
  import { confirm } from "../lib/dialog.svelte";
  import { formatDate, lang, setLang, t, tk } from "../lib/i18n.svelte";

  let {
    folder,
    saved,
    journal,
    message,
    onStart,
    onResume,
    onDiscard,
    onReverted,
    onOtherFolder,
  }: {
    folder: FolderInfo;
    saved: SessionData | null;
    journal: Journal | null;
    message?: string;
    onStart: (mode: Mode) => void;
    onResume: (data: SessionData) => void;
    onDiscard: () => void;
    onReverted: (message: string) => void;
    onOtherFolder: () => void;
  } = $props();

  type CardId = "order" | "knockout" | "rate" | "categorize";
  const CARDS: CardId[] = ["order", "knockout", "rate", "categorize"];

  let selected = $state<CardId | null>(null);
  let fullKnockout = $state(false);
  let reverting = $state(false);

  const count = $derived(folder.images.length);
  const estimates = $derived({
    order: estimateVotes("order", count),
    "simple-knockout": estimateVotes("simple-knockout", count),
    "full-knockout": estimateVotes("full-knockout", count),
    rate: count,
    categorize: count,
  } satisfies Record<Mode, number>);

  function modeOf(card: CardId): Mode {
    if (card === "knockout") return fullKnockout ? "full-knockout" : "simple-knockout";
    return card;
  }

  function possible(card: CardId): boolean {
    return count >= Session.minimumImages(modeOf(card));
  }

  function start(card: CardId | null) {
    if (card && possible(card)) onStart(modeOf(card));
  }

  function onKey(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement) return;
    const idx = ["1", "2", "3", "4"].indexOf(event.key);
    if (idx >= 0) {
      selected = CARDS[idx];
      event.preventDefault();
    } else if (event.key === "Enter" && selected) {
      start(selected);
      event.preventDefault();
    } else if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && selected === "knockout") {
      fullKnockout = event.key === "ArrowRight";
    }
  }

  async function revert() {
    if (!journal) return;
    reverting = true;
    try {
      const report = await api.revertLast(folder.path);
      let text = t("done.reverted", report.restored);
      if (report.failed.length) text += `\n${t("done.revertFailed")}\n${report.failed.join("\n")}`;
      onReverted(text);
    } catch (e) {
      onReverted(t("error.generic", String(e)));
    } finally {
      reverting = false;
    }
  }

  async function discard() {
    if (await confirm(t("summary.discard.confirm"), t("select.resume.discard"), t("confirm.no"), true)) onDiscard();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="select">
  <div class="inner">
    <header>
      <div>
        <h1>{t("select.header")}</h1>
        <div class="muted path">
          <span class="mono">{folder.displayPath}</span> · {t("select.files", count)}
        </div>
      </div>
      <div class="header-actions">
        <button class="btn ghost" onclick={() => setLang(lang() === "de" ? "en" : "de", true)}>
          {t("lang.switch")}
        </button>
        <button class="btn" onclick={onOtherFolder}>{t("select.otherFolder")}</button>
      </div>
    </header>

    {#if message}
      <div class="banner info">{message}</div>
    {/if}

    {#if saved}
      <div class="banner resume">
        <div>
          <strong>{t("select.resume.title")}</strong>
          <div class="muted">
            {t("select.resume.text", tk(`mode.${saved.mode}`), saved.answers.length, formatDate(saved.savedAt))}
          </div>
        </div>
        <div class="banner-actions">
          <button class="btn ghost" onclick={discard}>{t("select.resume.discard")}</button>
          <button class="btn primary" onclick={() => onResume(saved)}>{t("select.resume.button")}</button>
        </div>
      </div>
    {/if}

    {#if journal}
      <div class="banner">
        <div>
          <strong>{t("select.revert.title")}</strong>
          <div class="muted">
            {t(
              "select.revert.text",
              journal.entries.length,
              journal.method === "copy" ? t("select.revert.copied") : t("select.revert.moved"),
              formatDate(journal.createdAt * 1000),
            )}
          </div>
        </div>
        <div class="banner-actions">
          <button class="btn" disabled={reverting} onclick={revert}>↶ {t("select.revert.button")}</button>
        </div>
      </div>
    {/if}

    <div class="grid">
      {#each CARDS as card, idx (card)}
        {@const mode = modeOf(card)}
        <div
          class="card"
          class:selected={selected === card}
          class:disabled={!possible(card)}
          role="button"
          tabindex="0"
          onclick={() => (selected = card)}
          ondblclick={() => start(card)}
          onkeydown={(e) => {
            if (e.key === " ") {
              selected = card;
              e.preventDefault();
            }
          }}
        >
          <div class="top">
            <div class="art"><ModeArt mode={modeOf(card)} /></div>
            <div class="text">
              <div class="title-row">
                <h2>{tk(`mode.${card}`)}</h2>
                <kbd>{idx + 1}</kbd>
              </div>
              <p class="muted">{tk(`mode.${card}.description`)}</p>
              {#if card === "knockout"}
                <div class="segmented" role="radiogroup">
                  <button
                    role="radio"
                    aria-checked={!fullKnockout}
                    class:on={!fullKnockout}
                    onclick={(e) => {
                      e.stopPropagation();
                      fullKnockout = false;
                      selected = card;
                    }}
                  >
                    {t("mode.knockout.simple")}
                  </button>
                  <button
                    role="radio"
                    aria-checked={fullKnockout}
                    class:on={fullKnockout}
                    onclick={(e) => {
                      e.stopPropagation();
                      fullKnockout = true;
                      selected = card;
                    }}
                  >
                    {t("mode.knockout.full")}
                  </button>
                </div>
              {/if}
            </div>
          </div>
          <div class="bottom">
            <span class="example mono" title={t("select.result")}>→ {tk(`mode.${card}.example`)}</span>
            <span class="votes">{possible(card) ? t("select.votes", estimates[mode]) : t("select.tooFew")}</span>
          </div>
        </div>
      {/each}
    </div>

    <footer>
      <span class="hint">{t("select.hint")}</span>
      <button class="btn primary start" disabled={!selected || !possible(selected)} onclick={() => start(selected)}>
        {t("select.start")}
      </button>
    </footer>
  </div>
</div>

<style>
  .select {
    flex: 1;
    overflow: auto;
    display: flex;
    justify-content: center;
    padding: 28px 24px;
  }

  .inner {
    width: min(900px, 100%);
    margin-block: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  h1 {
    font-size: 24px;
  }

  .path {
    margin-top: 4px;
  }

  .header-actions {
    display: flex;
    gap: 6px;
  }

  .banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .banner.resume {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .banner.info {
    white-space: pre-line;
  }

  .banner-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 14px;
  }

  .card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    padding: 16px;
    border-radius: 12px;
    background: var(--surface);
    border: 2px solid var(--border);
    box-shadow: var(--shadow);
    cursor: pointer;
    transition:
      border-color 0.12s,
      background 0.12s,
      transform 0.12s;
  }

  .card:hover {
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }

  .card.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .card.disabled {
    opacity: 0.55;
  }

  .top {
    display: flex;
    gap: 14px;
  }

  .art {
    width: 148px;
    flex-shrink: 0;
    align-self: center;
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  h2 {
    font-size: 17px;
  }

  .text p {
    margin: 4px 0 0;
  }

  .segmented {
    display: inline-flex;
    margin-top: 10px;
    background: var(--surface-2);
    border-radius: 999px;
    padding: 2px;
  }

  .segmented button {
    border: none;
    background: transparent;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--text-2);
  }

  .segmented button.on {
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
  }

  .bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .example {
    font-size: 11px;
    color: var(--text-2);
    background: var(--surface-2);
    border-radius: 5px;
    padding: 2px 7px;
  }

  .votes {
    font-size: 12px;
    color: var(--text-2);
  }

  footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .start {
    padding: 9px 28px;
  }
</style>
