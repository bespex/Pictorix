<script lang="ts">
  import { tick } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { api, imageUrl, preload, type FolderInfo } from "../lib/api";
  import { DEFAULT_CATEGORY, type Session } from "../lib/core/session";
  import { isCompareMode, type Question } from "../lib/core/types";
  import { confirm, dialog } from "../lib/dialog.svelte";
  import { t, tk } from "../lib/i18n.svelte";
  import RateBar from "./RateBar.svelte";
  import CategoryBar from "./CategoryBar.svelte";
  import Hint from "./Hint.svelte";
  import { fit } from "../lib/fit";
  import { play } from "../lib/animate";

  let {
    folder,
    session,
    onFinished,
    onBack,
  }: { folder: FolderInfo; session: Session; onFinished: () => void; onBack: () => void } = $props();

  // the session is a plain class; this counter tells Svelte when it changed
  let revision = $state(0);
  const question = $derived.by(() => {
    void revision;
    return session.question;
  });
  const progress = $derived.by(() => {
    void revision;
    return session.progress();
  });
  const counts = $derived.by(() => {
    void revision;
    return session.counts();
  });
  const categories = $derived.by(() => {
    void revision;
    return [...session.categories];
  });
  const canUndo = $derived.by(() => {
    void revision;
    return session.canUndo;
  });
  const compare = $derived(isCompareMode(session.mode));
  const knockout = $derived(session.mode === "simple-knockout" || session.mode === "full-knockout");
  const percent = $derived(Math.round((100 * progress.done) / Math.max(1, progress.done + progress.remaining)));

  let animating = false;
  let leftSlot = $state<HTMLDivElement>();
  let rightSlot = $state<HTMLDivElement>();
  let rateBar = $state<ReturnType<typeof RateBar>>();
  let categoryBar = $state<ReturnType<typeof CategoryBar>>();

  function changed() {
    revision++;
    api.saveSession(session.toData(folder.path)).catch((e) => console.warn("saving the session failed", e));
    if (session.finished) onFinished();
    else preloadNext();
  }

  function commit(value: string) {
    session.vote(value);
    changed();
  }

  /** Loads the images of every possible next question, so they appear without delay. */
  function preloadNext() {
    const q = session.question;
    if (!q) return;
    const paths = (next: Question | null) =>
      !next ? [] : next.kind === "pair" ? [next.left.path, next.right.path] : [next.image.path];
    if (q.kind === "pair") {
      preload([...paths(session.peek(q.left.path)), ...paths(session.peek(q.right.path))]);
    } else {
      const idx = session.files.indexOf(q.image);
      preload(session.files.slice(idx + 1, idx + 3).map((f) => f.path));
    }
  }
  preloadNext();

  // ---- compare modes: the animations make clear which order was chosen -------------------------

  const frame = (slot: HTMLElement | undefined) => slot?.querySelector<HTMLElement>(".frame") ?? null;

  const animate = play;

  /** Runs one vote animation at a time; the lock is released even if something throws. */
  async function exclusive(action: () => Promise<void>) {
    if (animating) return;
    animating = true;
    try {
      await action();
    } finally {
      leftSlot?.classList.remove("glow");
      rightSlot?.classList.remove("glow");
      animating = false;
    }
  }

  /** The left image comes first already: both pulse to confirm the order stays as it is. */
  function keepOrder() {
    const q = question;
    if (q?.kind !== "pair") return;
    return exclusive(async () => {
      leftSlot?.classList.add("glow");
      rightSlot?.classList.add("glow");
      const pulse = [{ transform: "scale(1)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }];
      await Promise.all([
        animate(frame(leftSlot), pulse, { duration: 180, easing: "ease-in-out" }),
        animate(frame(rightSlot), pulse, { duration: 180, easing: "ease-in-out" }),
      ]);
      leftSlot?.classList.remove("glow");
      rightSlot?.classList.remove("glow");
      await settleAndVote(q.left.path);
    });
  }

  /** The right image moves to the front first, the left one follows a little later. */
  function swapOrder() {
    const q = question;
    if (q?.kind !== "pair" || !leftSlot || !rightSlot) return;
    const [l, r] = [leftSlot, rightSlot];
    return exclusive(async () => {
      const distance = r.offsetLeft - l.offsetLeft;
      const easing = "cubic-bezier(.3,.7,.2,1)";
      await Promise.all([
        animate(r, [{ transform: "translateX(0)" }, { transform: `translateX(${-distance}px)` }], {
          duration: 260,
          easing,
          fill: "forwards",
        }),
        animate(l, [{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }], {
          duration: 260,
          delay: 90,
          easing,
          fill: "forwards",
        }),
      ]);
      await settleAndVote(q.right.path);
    });
  }

  /** The decided pair rests a moment in its final order, fades out, and only then the next pair comes in. */
  async function settleAndVote(winner: string) {
    const settle = [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.96)" },
    ];
    const options: KeyframeAnimationOptions = { duration: 130, delay: 90, easing: "ease-in", fill: "forwards" };
    await Promise.all([animate(frame(leftSlot), settle, options), animate(frame(rightSlot), settle, options)]);

    commit(winner);
    await tick();
    await imagesReady();
    for (const slot of [leftSlot, rightSlot]) {
      const f = frame(slot);
      if (!slot || !f) continue;
      const appear = f.animate(
        [
          { opacity: 0, transform: "scale(0.96)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 150, easing: "ease-out" },
      );
      // drop the swap and fade-out leftovers only now, so nothing flashes in between
      [...slot.getAnimations(), ...f.getAnimations()].filter((a) => a !== appear).forEach((a) => a.cancel());
    }
  }

  /** Waits (briefly) until the new images are decoded. */
  async function imagesReady() {
    const images = [...document.querySelectorAll<HTMLImageElement>(".stage img")];
    const timeout = new Promise((resolve) => setTimeout(resolve, 400));
    await Promise.race([Promise.all(images.map((img) => img.decode().catch(() => {}))), timeout]);
  }

  // ---- rate and categorize --------------------------------------------------------------------

  function addCategory(name: string) {
    if (session.addCategory(name)) changed();
  }

  // ---- toolbar --------------------------------------------------------------------------------

  function undo() {
    if (animating || !session.undo()) return;
    changed();
  }

  async function restart() {
    if (!session.canUndo) return;
    if (await confirm(t("vote.restart.confirm"), t("vote.restart"), t("confirm.no"), true)) {
      session.restart();
      changed();
    }
  }

  async function toggleFullscreen() {
    const appWindow = getCurrentWindow();
    await appWindow.setFullscreen(!(await appWindow.isFullscreen()));
  }

  function digit(event: KeyboardEvent): number {
    const match = /^(?:Digit|Numpad)(\d)$/.exec(event.code);
    if (!match) return 0;
    const value = Number(match[1]);
    return value === 0 ? 10 : value;
  }

  function onKey(event: KeyboardEvent) {
    if (dialog.current || event.target instanceof HTMLInputElement) return;
    if (event.key === "F11") {
      toggleFullscreen();
    } else if ((event.key === "z" && (event.ctrlKey || event.metaKey)) || event.key === "Backspace") {
      undo();
    } else if (compare && event.key === "Enter") {
      keepOrder();
    } else if (compare && event.key === "ArrowLeft") {
      swapOrder();
    } else if (session.mode === "rate" && digit(event)) {
      rateBar?.rate(digit(event));
    } else if (session.mode === "categorize" && digit(event) && digit(event) < 10) {
      categoryBar?.assignPosition(digit(event));
    } else if (session.mode === "categorize" && event.key === "Tab") {
      categoryBar?.focusInput();
    } else {
      return;
    }
    event.preventDefault();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="vote">
  <header>
    <div class="title">
      <button class="btn ghost back" onclick={onBack} title={t("vote.saved")}>
        ‹ {t("vote.back")} <span class="saved">· {t("vote.back.saved")}</span>
      </button>
      <div>
        <h1 title={tk(`mode.${session.mode}.description`)}>{tk(`mode.${session.mode}`)}</h1>
        <div class="question">{tk(`vote.question.${session.mode}`)}</div>
      </div>
    </div>
    <div class="meta">
      <span class="mono path" title={folder.path}>{folder.displayPath}</span>
      <span class="muted">{t("select.files", session.files.length)}</span>
      <button
        class="btn ghost icon"
        onclick={toggleFullscreen}
        title={t("vote.fullscreen")}
        aria-label={t("vote.fullscreen")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M5 5h5v2H7v3H5zm9 0h5v5h-2V7h-3zM5 14h2v3h3v2H5zm12 0h2v5h-5v-2h3z" />
        </svg>
      </button>
    </div>
  </header>

  <section class="stage" class:compare>
    {#if question?.kind === "pair"}
      <div class="slot" bind:this={leftSlot}>
        <div class="label"><span>{question.left.name}</span></div>
        <button class="frame clickable" onclick={keepOrder} tabindex="-1">
          <img src={imageUrl(question.left.path)} alt={question.left.name} draggable="false" use:fit />
        </button>
        <div class="pick"><kbd>⏎ Enter</kbd> {t(knockout ? "vote.pick.left.knockout" : "vote.pick.left")}</div>
      </div>
      <div class="slot" bind:this={rightSlot}>
        <div class="label"><span>{question.right.name}</span></div>
        <button class="frame clickable" onclick={swapOrder} tabindex="-1">
          <img src={imageUrl(question.right.path)} alt={question.right.name} draggable="false" use:fit />
        </button>
        <div class="pick"><kbd>←</kbd> {t(knockout ? "vote.pick.right.knockout" : "vote.pick.right")}</div>
      </div>
    {:else if question?.kind === "single"}
      <div class="slot single">
        <div class="label"><span>{question.image.name}</span></div>
        {#if session.mode === "categorize"}
          <button
            class="frame clickable"
            tabindex="-1"
            title={t("vote.categorize.image", DEFAULT_CATEGORY)}
            onclick={() => categoryBar?.assign(DEFAULT_CATEGORY)}
          >
            <img src={imageUrl(question.image.path)} alt={question.image.name} draggable="false" use:fit />
          </button>
        {:else}
          <div class="frame">
            <img src={imageUrl(question.image.path)} alt={question.image.name} draggable="false" use:fit />
          </div>
        {/if}
      </div>
    {/if}
  </section>

  <section class="controls">
    {#if compare}
      <div class="hint center"><Hint text={t(knockout ? "vote.knockout.hint" : "vote.compare.hint")} /></div>
    {:else if session.mode === "rate"}
      <RateBar bind:this={rateBar} {counts} assigned={(v) => session.assigned(v)} onRate={(r) => commit(String(r))} />
    {:else}
      <CategoryBar
        bind:this={categoryBar}
        {categories}
        {counts}
        assigned={(v) => session.assigned(v)}
        onAssign={(c) => commit(c)}
        onAdd={addCategory}
      />
    {/if}
  </section>

  <footer>
    <button class="btn ghost restart" onclick={restart} disabled={!canUndo}>↺ {t("vote.restart")}</button>
    <div class="progress">
      <div class="stage-text">
        <strong>
          {compare ? t("stage.order", progress.done) : question ? tk(question.stage.key, ...question.stage.args) : ""}
        </strong>
        <span class="muted">
          {#if knockout && question}· {tk(question.stage.key, ...question.stage.args)}{/if}
          · {compare ? t("vote.remaining", progress.remaining) : t("vote.remainingExact", progress.remaining)}
          {#if progress.remaining <= 1}· {t("vote.next")}{/if}
        </span>
      </div>
      <div class="track"><div class="fill" style:width="{percent}%"></div></div>
    </div>
    <button class="btn" onclick={undo} disabled={!canUndo} title="Ctrl+Z / Backspace">
      ↶ {t("vote.undo")}
      <kbd class="undo-key" aria-label="Backspace">
        <svg viewBox="0 0 24 16" width="14" height="10" aria-hidden="true">
          <path
            d="M8 1h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8L1 8z M12 5l6 6 M18 5l-6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
      </kbd>
    </button>
  </footer>
</div>

<style>
  .vote {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 10px 14px 10px;
    gap: 8px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .title {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    min-width: 0;
  }

  .back {
    margin-top: 1px;
  }

  h1 {
    font-size: 19px;
  }

  .question {
    font-size: 15px;
    font-weight: 600;
    color: var(--accent);
  }

  .saved {
    font-size: 12px;
    color: var(--text-3);
  }

  .pick {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-2);
    min-height: 26px;
  }

  .pick kbd {
    font-size: 13px;
    padding: 1px 8px;
  }

  .restart {
    color: var(--text-3);
  }

  .restart:hover:not(:disabled) {
    color: var(--danger);
  }

  .undo-key {
    margin-left: 4px;
    min-width: 0;
    padding: 0 4px;
    line-height: 1;
    vertical-align: -1px;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    font-size: 13px;
  }

  .path {
    max-width: 380px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon {
    padding: 6px;
  }

  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 12px;
    background: var(--stage);
    border-radius: 12px;
    padding: 10px;
    overflow: hidden;
  }

  .slot {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 0;
  }

  .slot:first-child {
    z-index: 1;
  }

  .label {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-2);
    min-height: 22px;
  }

  .label span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .frame {
    flex: 1;
    min-height: 0;
    position: relative;
    display: block;
    border: none;
    background: none;
    padding: 0;
    cursor: default;
  }

  .frame.clickable {
    cursor: pointer;
  }

  .frame img {
    position: absolute;
    inset: 0;
    margin: auto;
    max-width: 100%;
    max-height: 100%;
    border-radius: 6px;
    image-rendering: auto;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
    transition: box-shadow 0.12s;
  }

  .frame.clickable:hover img,
  :global(.slot.glow) img {
    box-shadow:
      0 0 0 3px var(--mark),
      0 0 26px color-mix(in srgb, var(--mark) 70%, transparent);
  }

  .controls {
    min-height: 26px;
  }

  .center {
    text-align: center;
  }

  footer {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 16px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .stage-text {
    font-size: 13px;
  }

  .track {
    width: min(420px, 100%);
    height: 5px;
    border-radius: 3px;
    background: var(--surface-2);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.25s ease-out;
  }
</style>
