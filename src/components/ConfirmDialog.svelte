<script lang="ts">
  import type { ConfirmRequest } from "../lib/dialog.svelte";

  let { request }: { request: ConfirmRequest } = $props();
  let noButton: HTMLButtonElement;

  $effect(() => {
    // the safe answer has the focus, so a stray Enter (a voting key!) never confirms
    noButton?.focus();
  });

  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      request.resolve(false);
    }
  }
</script>

<svelte:window onkeydowncapture={onKey} />

<div class="backdrop" role="presentation" onclick={() => request.resolve(false)}>
  <div
    class="box"
    role="alertdialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <p>{request.text}</p>
    <div class="buttons">
      <button class="btn" bind:this={noButton} onclick={() => request.resolve(false)}>{request.no}</button>
      <button class="btn primary" class:danger-btn={request.danger} onclick={() => request.resolve(true)}>
        {request.yes}
      </button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 12, 16, 0.45);
    display: grid;
    place-items: center;
    z-index: 100;
    animation: fade 0.12s ease-out;
  }

  .box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: var(--shadow-lg);
    padding: 22px 22px 16px;
    width: min(440px, calc(100vw - 32px));
    animation: pop 0.14s ease-out;
  }

  p {
    margin: 0 0 18px;
    font-size: 15px;
    white-space: pre-line;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .danger-btn {
    background: var(--danger) !important;
    border-color: var(--danger) !important;
    color: #fff !important;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes pop {
    from {
      transform: scale(0.96);
      opacity: 0;
    }
  }
</style>
