<script lang="ts">
  import { categoryColor, textColorOn } from "../lib/categoryColors";
  import { toFolderName } from "../lib/core/plan";
  import type { ImageFile } from "../lib/core/types";
  import { t } from "../lib/i18n.svelte";
  import PreviewPopover from "./PreviewPopover.svelte";
  import Hint from "./Hint.svelte";
  import { play } from "../lib/animate";

  let {
    categories,
    counts,
    assigned,
    onAssign,
    onAdd,
  }: {
    categories: readonly string[];
    counts: Map<string, number>;
    assigned: (value: string) => ImageFile[];
    onAssign: (category: string) => void;
    onAdd: (category: string) => void;
  } = $props();

  const MAX_HOTKEYS = 9;
  let input: HTMLInputElement;
  let text = $state("");
  let busy = false;
  let chips: Record<string, HTMLButtonElement> = $state({});
  let preview = $state<{ category: string; anchor: DOMRect } | null>(null);

  const cleaned = $derived(toFolderName(text));

  /** Votes for the category at the given position (1-based), used by the number keys. */
  export function assignPosition(position: number) {
    if (position >= 1 && position <= Math.min(categories.length, MAX_HOTKEYS)) assign(categories[position - 1]);
  }

  export function focusInput() {
    input.focus();
  }

  /** The chosen chip pulses briefly, so a category picked by keyboard is confirmed before the next image. */
  export async function assign(category: string) {
    if (busy) return;
    busy = true;
    preview = null;
    const chip = chips[category];
    await play(chip, [{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }], {
      duration: 160,
      easing: "ease-out",
    });
    busy = false;
    onAssign(category);
  }

  function add(assignToo: boolean) {
    const name = cleaned;
    if (!name) return;
    if (!categories.includes(name)) onAdd(name);
    text = "";
    input.blur();
    if (assignToo) assign(name);
  }

  function onInputKey(event: KeyboardEvent) {
    event.stopPropagation(); // the number keys type here instead of voting
    if (event.key === "Enter") {
      event.preventDefault();
      add(event.ctrlKey || event.metaKey);
    } else if (event.key === "Escape") {
      text = "";
      input.blur();
    }
  }

  function showPreview(category: string, event: MouseEvent) {
    event.preventDefault();
    preview = { category, anchor: chips[category].getBoundingClientRect() };
  }
</script>

<div class="bar">
  <div class="chips">
    {#each categories as category, idx (category)}
      {@const color = categoryColor(categories, category)}
      <button
        class="chip"
        tabindex="-1"
        bind:this={chips[category]}
        style:background={color}
        style:color={textColorOn(color)}
        title={t("vote.categorize.chip")}
        onclick={() => assign(category)}
        oncontextmenu={(e) => showPreview(category, e)}
      >
        {#if idx < MAX_HOTKEYS}<span class="key">{idx + 1}</span>{/if}
        <span>{category}</span>
        {#if counts.get(category)}<span class="count">{counts.get(category)}</span>{/if}
      </button>
    {/each}
    <div class="add">
      <input
        bind:this={input}
        bind:value={text}
        placeholder={t("vote.categorize.new")}
        title={t("vote.categorize.input")}
        onkeydown={onInputKey}
        spellcheck="false"
        maxlength="60"
      />
      <button class="btn" tabindex="-1" disabled={!cleaned} title={t("vote.categorize.add")} onclick={() => add(false)}>
        +
      </button>
    </div>
  </div>
  {#if text && cleaned !== text.trim()}
    <div class="hint">→ <span class="mono">{cleaned || "–"}</span></div>
  {/if}
  <div class="hint"><Hint text={t("vote.categorize.hint")} /></div>
</div>

{#if preview}
  <PreviewPopover
    anchor={preview.anchor}
    title={t("vote.preview.categorize", assigned(preview.category).length, preview.category)}
    files={assigned(preview.category)}
    onClose={() => (preview = null)}
  />
{/if}

<style>
  .bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 4px 0 2px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px;
    max-width: 100%;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: var(--shadow);
    transition: filter 0.1s;
  }

  .chip:hover {
    filter: brightness(0.9);
  }

  .key {
    font-size: 11px;
    opacity: 0.75;
  }

  .count {
    font-size: 11px;
    background: rgba(0, 0, 0, 0.16);
    border-radius: 999px;
    padding: 0 7px;
  }

  .add {
    display: inline-flex;
    gap: 4px;
  }

  input {
    width: 180px;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    outline: none;
  }

  input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .add .btn {
    border-radius: 999px;
    padding: 6px 13px;
    font-weight: 700;
  }
</style>
