<script lang="ts">
  /** A hint line; keys written as [[Enter]] in the text are shown as key caps, the same way in every mode. */
  let { text }: { text: string } = $props();
  const parts = $derived(text.split(/\[\[(.+?)\]\]/));
</script>

<span class="hint-text">
  {#each parts as part, idx (idx)}{#if idx % 2}<kbd>{part}</kbd>{:else}{part}{/if}{/each}
</span>
