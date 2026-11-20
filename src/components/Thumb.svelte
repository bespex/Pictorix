<script lang="ts">
  import { thumbnailUrl } from "../lib/api";

  let { path, size, alt = "" }: { path: string; size: number; alt?: string } = $props();

  let url = $state<string | null>(null);
  let element: HTMLDivElement;

  // only load what is (nearly) visible: a summary can hold hundreds of photos
  $effect(() => {
    const target = path;
    url = null;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          thumbnailUrl(target, size).then((u) => {
            if (!cancelled) url = u;
          });
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  });
</script>

<div class="thumb" bind:this={element}>
  {#if url}
    <img src={url} {alt} draggable="false" />
  {:else}
    <div class="placeholder"></div>
  {/if}
</div>

<style>
  .thumb {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
  }

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
    animation: show 0.2s ease-out;
  }

  .placeholder {
    width: 70%;
    height: 70%;
    border-radius: 6px;
    background: linear-gradient(90deg, var(--surface-2), var(--border), var(--surface-2));
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }

  @keyframes show {
    from {
      opacity: 0;
    }
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
</style>
