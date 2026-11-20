// Stand-in for the Tauri runtime, so the real Pictorix frontend runs in a plain headless Chrome.
// shoot.mjs injects it before the page scripts, together with window.__DEMO__:
//   { launch: {directory, mode, lang}, folder: FolderInfo, session: SessionData | null }
(() => {
  const demo = window.__DEMO__;
  const callbacks = new Map();
  let nextId = 1;

  const commands = {
    launch_args: () => demo.launch,
    scan_folder: () => demo.folder,
    // the original image stands in for the thumbnail; convertFileSrc below keeps the path as it is
    thumbnail: ({ path }) => path,
    session_load: () => (demo.session ? JSON.stringify(demo.session) : null),
    session_save: () => null,
    session_clear: () => null,
    journal_load: () => null,
    self_update_supported: () => false,
  };

  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main", windowLabel: "main" },
    },
    transformCallback(cb) {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    },
    unregisterCallback: (id) => callbacks.delete(id),
    convertFileSrc: (path) => path,
    async invoke(cmd, args = {}) {
      if (cmd in commands) return commands[cmd](args);
      // plugin:event|listen, plugin:window|set_title, plugin:path|resolve_directory …
      return cmd === "plugin:event|listen" ? nextId++ : null;
    },
  };
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
})();
