<script lang="ts">
  import type { Mode } from "../lib/core/types";
  import { modeArt } from "../lib/modeArt";

  let { mode }: { mode: Mode } = $props();
  const svg = $derived(modeArt(mode));
</script>

<span class="mode-art" aria-hidden="true">{@html svg}</span>

<style>
  .mode-art {
    display: block;
    --frame: #ffffff;
    --frame-line: #d6dce6;
    --shadow: rgba(24, 40, 72, 0.22);
    --ink: #2b3340;
    --ink-soft: #8a94a3;
    --chip: #e6eaf1;
    --line: #c3cad6;
    --halo: #ffd27a;
    --podium: #dde3ec;
    --folder: #cfd7e3;
    --folder-front: #e3e8f0;
    --glass: rgba(255, 255, 255, 0.86);
  }

  @media (prefers-color-scheme: dark) {
    .mode-art {
      --frame: #2b313b;
      --frame-line: #3b4350;
      --shadow: rgba(0, 0, 0, 0.55);
      --ink: #e5eaf1;
      --ink-soft: #8e99a9;
      --chip: #363d49;
      --line: #4a5361;
      --halo: #c47a1a;
      --podium: #363d49;
      --folder: #3a4250;
      --folder-front: #4a5363;
      --glass: rgba(32, 37, 45, 0.88);
    }
  }

  .mode-art :global(svg) {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
</style>
