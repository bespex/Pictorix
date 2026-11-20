<script lang="ts">
  import { lang, setLang, t } from "../lib/i18n.svelte";
  import { forgetFolder, recentFolders } from "../lib/recent";
  import logo from "../assets/logo.png";

  let { error, onChoose, onOpen }: { error?: string; onChoose: () => void; onOpen: (path: string) => void } = $props();

  let recent = $state(recentFolders());
</script>

<div class="welcome">
  <button class="btn ghost lang" onclick={() => setLang(lang() === "de" ? "en" : "de", true)}>
    {t("lang.switch")}
  </button>
  <div class="center">
    <img src={logo} alt="" class="logo" />
    <h1>Pictorix</h1>
    <p class="muted tagline">{t("app.tagline")}</p>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="drop">
      <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
        <path
          fill="currentColor"
          d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
        />
      </svg>
      <div class="drop-text">{t("welcome.drop")}</div>
      <div class="hint">{t("welcome.or")}</div>
      <button class="btn primary big" onclick={onChoose}>{t("welcome.choose")}</button>
      <div class="hint">{t("welcome.formats")}</div>
    </div>

    {#if recent.length > 0}
      <div class="recent">
        <h3>{t("welcome.recent")}</h3>
        <ul>
          {#each recent as folder (folder.path)}
            <li>
              <button class="folder" onclick={() => onOpen(folder.path)} title={folder.path}>
                <span class="mono">{folder.displayPath}</span>
              </button>
              <button
                class="remove"
                aria-label="remove"
                onclick={() => {
                  forgetFolder(folder.path);
                  recent = recentFolders();
                }}
              >
                ×
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<style>
  .welcome {
    flex: 1;
    overflow: auto;
    display: grid;
    place-items: center;
    padding: 32px 16px;
    position: relative;
  }

  .lang {
    position: absolute;
    top: 12px;
    right: 12px;
  }

  .center {
    width: min(560px, 100%);
    text-align: center;
  }

  .logo {
    width: 88px;
    height: 88px;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.18));
  }

  h1 {
    font-size: 30px;
    margin-top: 10px;
  }

  .tagline {
    margin: 6px 0 24px;
  }

  .error {
    white-space: pre-line;
    text-align: left;
    background: color-mix(in srgb, var(--danger) 10%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent);
    color: var(--text);
    padding: 10px 14px;
    border-radius: var(--radius);
    margin-bottom: 18px;
  }

  .drop {
    border: 2px dashed var(--border-strong);
    border-radius: 16px;
    background: var(--surface);
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-3);
  }

  .drop-text {
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
  }

  .big {
    padding: 10px 22px;
    font-size: 15px;
  }

  .recent {
    margin-top: 26px;
    text-align: left;
  }

  h3 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-3);
    margin-bottom: 6px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  li {
    display: flex;
    border-top: 1px solid var(--border);
  }

  li:first-child {
    border-top: none;
  }

  .folder {
    flex: 1;
    text-align: left;
    background: none;
    border: none;
    padding: 9px 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .folder:hover {
    background: var(--surface-2);
  }

  .remove {
    background: none;
    border: none;
    color: var(--text-3);
    padding: 0 14px;
    font-size: 18px;
  }

  .remove:hover {
    color: var(--danger);
  }
</style>
