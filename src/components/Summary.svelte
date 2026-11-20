<script lang="ts">
  import { untrack } from "svelte";
  import { api, type ApplyError, type FolderInfo, type Journal, type Method } from "../lib/api";
  import { categoryColor, textColorOn } from "../lib/categoryColors";
  import { changes, planFiles, stripPrefix, targetPath, toFolderName, type PlannedFile } from "../lib/core/plan";
  import type { Session } from "../lib/core/session";
  import { confirm } from "../lib/dialog.svelte";
  import { t, tk } from "../lib/i18n.svelte";
  import Thumb from "./Thumb.svelte";

  let {
    folder,
    session,
    onBack,
    onDiscard,
    onApplied,
  }: {
    folder: FolderInfo;
    session: Session;
    onBack: () => void;
    onDiscard: () => void;
    onApplied: (journal: Journal) => void;
  } = $props();

  const mode = $derived(session.mode);
  const categorize = $derived(mode === "categorize");
  const outcomes = $derived(session.outcomes());
  const hasOldPrefixes = $derived(!categorize && outcomes.some((o) => stripPrefix(o.file.name) !== o.file.name));

  let method = $state<Method>("move");
  let copyFolder = $state(
    untrack(() => (mode === "categorize" ? "Pictorix" : `Pictorix-${tk(`mode.${mode}`).split(" ")[0]}`)),
  );
  let replacePrefix = $state(true);
  let applying = $state(false);
  let conflicts = $state<string[]>([]);
  let error = $state<string | null>(null);

  const plan = $derived(planFiles(mode, outcomes, { replacePrefix }));
  const unchanged = $derived(method === "move" ? plan.filter((p) => !changes(p)).length : 0);
  const copyFolderName = $derived(toFolderName(copyFolder));

  /** Categorize: one section per category, in the order the categories were created. */
  const groups = $derived.by((): { title: string | null; items: PlannedFile[] }[] => {
    if (!categorize) return [{ title: null, items: plan }];
    return session.categories
      .map((category) => ({ title: category, items: plan.filter((p) => p.value === category) }))
      .filter((g) => g.items.length > 0);
  });

  function badge(value: string): { text: string; background: string; color: string } {
    if (categorize) {
      const background = categoryColor(session.categories, value);
      return { text: value, background, color: textColorOn(background) };
    }
    return { text: mode === "rate" ? `★ ${value}` : `#${value}`, background: "var(--mark)", color: "#fff" };
  }

  async function apply() {
    applying = true;
    conflicts = [];
    error = null;
    try {
      const operations = plan
        .filter((p) => method === "copy" || changes(p))
        .map((p) => ({ from: p.file.path, toDir: p.toDir, toName: p.toName }));
      const journal = await api.apply({
        folder: folder.path,
        method,
        copyFolder: method === "copy" ? copyFolderName : undefined,
        operations,
      });
      onApplied(journal);
    } catch (e) {
      const failure = e as ApplyError;
      if (failure?.kind === "conflicts") conflicts = failure.paths;
      else error = t("summary.error", (failure as { message?: string })?.message ?? String(e));
    } finally {
      applying = false;
    }
  }

  async function discard() {
    if (await confirm(t("summary.discard.confirm"), t("summary.discard"), t("confirm.no"), true)) onDiscard();
  }
</script>

<div class="summary">
  <header>
    <div class="title-row">
      <h1>{t("summary.title")}</h1>
      <span class="muted">{tk(`mode.${mode}`)} · {t("summary.files", plan.length)}</span>
    </div>
    <div class="muted">{tk(`mode.${mode}.rename`)}</div>

    <div class="options">
      <span class="label">{t("summary.method")}</span>
      <div class="segmented" role="radiogroup">
        <button
          role="radio"
          aria-checked={method === "move"}
          class:on={method === "move"}
          onclick={() => (method = "move")}
        >
          {categorize ? t("summary.method.move.categorize") : t("summary.method.move")}
        </button>
        <button
          role="radio"
          aria-checked={method === "copy"}
          class:on={method === "copy"}
          onclick={() => (method = "copy")}
        >
          {t("summary.method.copy")}
        </button>
      </div>
      {#if method === "copy"}
        <label class="folder-input">
          <span class="mono muted">{folder.displayPath}/</span>
          <input bind:value={copyFolder} spellcheck="false" aria-label={t("summary.copyFolder")} />
        </label>
      {/if}
      {#if hasOldPrefixes}
        <label class="check">
          <input type="checkbox" bind:checked={replacePrefix} />
          {t("summary.replacePrefix")}
        </label>
      {/if}
    </div>
  </header>

  <div class="gallery">
    {#each groups as group (group.title)}
      {#if group.title}
        {@const b = badge(group.title)}
        <h2 class="group">
          <span class="dot" style:background={b.background}></span>{group.title}
          <span class="muted">({group.items.length})</span>
        </h2>
      {/if}
      <div class="grid">
        {#each group.items as item (item.file.path)}
          {@const b = badge(item.value)}
          <div class="card" class:same={method === "move" && !changes(item)}>
            <div class="image">
              <Thumb path={item.file.path} size={340} alt={item.file.name} />
              <span class="badge" style:background={b.background} style:color={b.color}>{b.text}</span>
            </div>
            <div class="new" title={targetPath(item)}>
              {method === "copy" ? `${copyFolderName}/` : ""}{targetPath(item)}
            </div>
            <div class="old" title={item.file.name}>{item.file.name}</div>
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <footer>
    <div class="status">
      {#if conflicts.length}
        <div class="problem">
          <strong>{t("summary.conflicts")}</strong>
          <div class="mono list">{conflicts.join("\n")}</div>
        </div>
      {:else if error}
        <div class="problem">{error}</div>
      {:else}
        <span class="hint">{t("summary.safe")}{unchanged ? ` · ${t("summary.unchanged", unchanged)}` : ""}</span>
      {/if}
    </div>
    <div class="buttons">
      <button class="btn ghost" onclick={onBack} disabled={applying}>‹ {t("summary.back")}</button>
      <button class="btn" onclick={discard} disabled={applying}>{t("summary.discard")}</button>
      <button class="btn primary" onclick={apply} disabled={applying || (method === "copy" && !copyFolderName)}>
        {applying ? t("summary.applying") : t("summary.apply")}
      </button>
    </div>
  </footer>
</div>

<style>
  .summary {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 22px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .title-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  h1 {
    font-size: 22px;
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    margin-top: 8px;
  }

  .label {
    font-weight: 600;
    font-size: 13px;
  }

  .segmented {
    display: inline-flex;
    background: var(--surface-2);
    border-radius: 999px;
    padding: 2px;
  }

  .segmented button {
    border: none;
    background: transparent;
    padding: 5px 14px;
    border-radius: 999px;
    font-size: 13px;
    color: var(--text-2);
  }

  .segmented button.on {
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
  }

  .folder-input {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 13px;
  }

  .folder-input input {
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    width: 200px;
  }

  .check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .gallery {
    flex: 1;
    overflow: auto;
    padding: 18px 22px;
  }

  .group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    margin: 6px 0 10px;
  }

  .group:not(:first-child) {
    margin-top: 22px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 14px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .card.same {
    opacity: 0.6;
  }

  .image {
    position: relative;
    height: 170px;
    margin-bottom: 4px;
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 12px;
    border: 2px solid var(--surface);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    max-width: 80%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .new,
  .old {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .new {
    font-weight: 600;
    font-size: 13px;
  }

  .old {
    font-size: 12px;
    color: var(--text-3);
  }

  footer {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 12px 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .status {
    min-width: 0;
  }

  .problem {
    color: var(--danger);
    font-size: 13px;
  }

  .list {
    white-space: pre;
    max-height: 80px;
    overflow: auto;
    font-size: 12px;
    user-select: text;
  }

  .buttons {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
</style>
