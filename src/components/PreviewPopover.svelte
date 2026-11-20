<script lang="ts">
  import type { ImageFile } from "../lib/core/types";
  import { t } from "../lib/i18n.svelte";
  import Thumb from "./Thumb.svelte";

  let { anchor, title, files, onClose }: { anchor: DOMRect; title: string; files: ImageFile[]; onClose: () => void } =
    $props();

  const MAX_IMAGES = 4;
  const newest = $derived(files.slice(-MAX_IMAGES).reverse());

  let box: HTMLDivElement;
  let left = $state(0);
  let top = $state(0);

  // above the anchor, centred, but always inside the window
  $effect(() => {
    void newest;
    const width = box.offsetWidth;
    const height = box.offsetHeight;
    left = Math.max(8, Math.min(window.innerWidth - width - 8, anchor.left + anchor.width / 2 - width / 2));
    top = Math.max(8, anchor.top - height - 10);
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape") onClose();
  }}
  onpointerdown={(e) => {
    if (!box.contains(e.target as Node)) onClose();
  }}
/>

<div class="popover" bind:this={box} style:left="{left}px" style:top="{top}px">
  <div class="title">{title}</div>
  {#if newest.length === 0}
    <div class="hint">{t("vote.preview.empty")}</div>
  {:else}
    <div class="images">
      {#each newest as file (file.path)}
        <div class="cell" title={file.name}><Thumb path={file.path} size={300} alt={file.name} /></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .popover {
    position: fixed;
    z-index: 40;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    padding: 10px;
    animation: pop 0.12s ease-out;
  }

  .title {
    font-weight: 600;
    margin-bottom: 8px;
  }

  .images {
    display: flex;
    gap: 8px;
  }

  .cell {
    width: 150px;
    height: 150px;
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }
</style>
