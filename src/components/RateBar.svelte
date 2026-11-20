<script lang="ts">
  import { MAX_RATING } from "../lib/core/session";
  import type { ImageFile } from "../lib/core/types";
  import { t } from "../lib/i18n.svelte";
  import PreviewPopover from "./PreviewPopover.svelte";
  import { play } from "../lib/animate";

  let {
    counts,
    assigned,
    onRate,
  }: {
    counts: Map<string, number>;
    assigned: (value: string) => ImageFile[];
    onRate: (rating: number) => void;
  } = $props();

  const ratings = Array.from({ length: MAX_RATING }, (_, i) => i + 1);
  let hover = $state(0);
  let selected = $state(0);
  let busy = false;
  let cells: HTMLButtonElement[] = $state([]);
  let preview = $state<{ rating: number; anchor: DOMRect } | null>(null);

  /** Rates with a short confirmation: the chosen stars light up one after the other. */
  export async function rate(rating: number) {
    if (busy || rating < 1 || rating > MAX_RATING) return;
    busy = true;
    selected = rating;
    hover = 0;
    preview = null;
    const animations = cells.slice(0, rating).map((cell, idx) =>
      play(
        cell.querySelector("svg"),
        [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
        {
          duration: 150,
          delay: idx * 14,
          easing: "ease-out",
        },
      ),
    );
    await Promise.all(animations);
    selected = 0;
    busy = false;
    onRate(rating);
  }

  function showPreview(rating: number, event: MouseEvent) {
    event.preventDefault();
    preview = { rating, anchor: cells[rating - 1].getBoundingClientRect() };
  }
</script>

<div class="bar">
  <div class="stars" role="presentation" onmouseleave={() => (hover = 0)}>
    {#each ratings as rating (rating)}
      {@const lit = selected ? rating <= selected : rating <= hover}
      <button
        class="star"
        class:lit
        class:selected={selected > 0 && rating <= selected}
        bind:this={cells[rating - 1]}
        role="radio"
        aria-checked={selected === rating}
        aria-label={`${rating}`}
        tabindex="-1"
        onmouseenter={() => (hover = rating)}
        onclick={() => rate(rating)}
        oncontextmenu={(e) => showPreview(rating, e)}
      >
        <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
          <path
            d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
            stroke-linejoin="round"
          />
        </svg>
        <span class="key">{rating === 10 ? "0" : rating}</span>
        {#if counts.get(String(rating))}
          <span class="count">{counts.get(String(rating))}</span>
        {/if}
      </button>
    {/each}
  </div>
  <div class="hint">{t("vote.rate.hint")}</div>
</div>

{#if preview}
  <PreviewPopover
    anchor={preview.anchor}
    title={t("vote.preview.rate", assigned(String(preview.rating)).length, preview.rating)}
    files={assigned(String(preview.rating))}
    onClose={() => (preview = null)}
  />
{/if}

<style>
  .bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 4px 0 2px;
  }

  .stars {
    display: flex;
    gap: 4px;
  }

  .star {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: none;
    border: none;
    padding: 2px 4px;
    border-radius: 8px;
  }

  .star svg path {
    fill: var(--star-off);
    stroke: var(--star-off);
    stroke-width: 1;
    transition: fill 0.08s;
  }

  .star.lit svg path {
    fill: var(--mark-hover);
    stroke: var(--mark-hover);
  }

  .star.selected svg path {
    fill: var(--mark);
    stroke: var(--mark);
  }

  .key {
    font-size: 11px;
    color: var(--text-3);
    font-weight: 600;
  }

  .count {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-2);
  }
</style>
