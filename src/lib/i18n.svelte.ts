export type Lang = "en" | "de";

const en = {
  "app.tagline": "Sort, rank and rate a folder full of photos - one quick decision at a time.",
  "welcome.drop": "Drop a folder here",
  "welcome.or": "or",
  "welcome.choose": "Choose folder…",
  "welcome.recent": "Recent folders",
  "welcome.formats": "JPG, PNG, WebP, GIF, BMP and AVIF",
  "directory.choose.title": "Choose a folder with images",

  "mode.order": "Order",
  "mode.order.description": "Compare two images at a time until every image has its place - the most precise ranking.",
  "mode.order.rename": "Each file name gets its three-digit placement in front, e.g. 002-beach.jpg.",
  "mode.simple-knockout": "Knockout · Find the winner",
  "mode.simple-knockout.description": "Images compete in pairs and the winner moves on, until one image is left.",
  "mode.simple-knockout.rename":
    "Each file name gets its three-digit placement in front; images that dropped out in the same round share a placement.",
  "mode.full-knockout": "Knockout · Rank all",
  "mode.full-knockout.description": "Images compete in pairs, round by round, until every placement is decided.",
  "mode.full-knockout.rename": "Each file name gets its three-digit placement in front, e.g. 004-beach.jpg.",
  "mode.knockout": "Knockout",
  "mode.knockout.description": "Images compete in pairs and the winner moves on - the fastest way to your favorites.",
  "mode.knockout.simple": "Find the winner",
  "mode.knockout.full": "Rank all",
  "mode.rate": "Rate",
  "mode.rate.description": "Give each image one to ten stars.",
  "mode.rate.rename": "Each file name gets its rating as a two-digit number in front, e.g. 07-beach.jpg.",
  "mode.categorize": "Categorize",
  "mode.categorize.description": "Sort each image into a category - you create the categories as you go.",
  "mode.categorize.rename": "Each image is moved into a subfolder named after its category, e.g. family/beach.jpg.",
  "mode.order.example": "001-beach.jpg",
  "mode.knockout.example": "001-beach.jpg",
  "mode.rate.example": "08-beach.jpg",
  "mode.categorize.example": "family/beach.jpg",

  "select.header": "How do you want to sort your images?",
  "select.files": "{0} images",
  "select.votes": "about {0} votes",
  "select.result": "How the files are named afterwards",
  "select.start": "Start",
  "select.hint": "Double-click a mode or press 1-4 and Enter to start.",
  "select.otherFolder": "Other folder",
  "select.tooFew": "This mode needs at least two images.",
  "select.resume.title": "Continue where you left off?",
  "select.resume.text": "{0} - {1} votes so far, saved {2}.",
  "select.resume.button": "Continue",
  "select.resume.discard": "Discard",
  "select.revert.title": "Last result in this folder",
  "select.revert.text": "{0} files were {1} on {2}.",
  "select.revert.moved": "renamed or moved",
  "select.revert.copied": "copied",
  "select.revert.button": "Undo",
  "select.noImages": "No images found in this folder.",

  "vote.compare.hint": "Or click the image that should come first",
  "vote.knockout.hint": "Or click the image that wins",
  "vote.question.order": "Which image comes first?",
  "vote.question.simple-knockout": "Which image wins?",
  "vote.question.full-knockout": "Which image wins?",
  "vote.question.rate": "How many stars does this image get?",
  "vote.question.categorize": "Where does this image belong?",
  "vote.pick.left": "left first",
  "vote.pick.right": "right first",
  "vote.pick.left.knockout": "left wins",
  "vote.pick.right.knockout": "right wins",
  "vote.rate.count": "{0} images with {1} stars so far",
  "vote.categorize.chip": "Right-click: the latest images in this category",
  "vote.categorize.image": "Click: into “{0}”",
  "vote.categorize.input": "Enter adds the category, Ctrl+Enter also puts the image into it",
  "vote.back.saved": "saved",
  "vote.next": "then a preview - no file is changed yet",
  "vote.rate.hint": "[[1]] … [[9]] and [[0]] for ten stars · right-click a star for the latest images with that rating",
  "vote.categorize.hint": "[[1]] … [[9]] category · [[Tab]] new category",
  "vote.categorize.new": "New category",
  "vote.categorize.add": "Add",
  "vote.undo": "Undo",
  "update.available": "Pictorix {0} is available (installed: {1}).\n\nInstall it now? Pictorix restarts afterwards.",
  "update.install": "Install and restart",
  "update.later": "Later",
  "update.failed": "The update could not be installed:\n{0}",
  "vote.restart": "Restart",
  "vote.restart.confirm": "Start over? All votes of this round are discarded.",
  "vote.back": "Modes",
  "vote.remaining": "about {0} to go",
  "vote.remainingExact": "{0} to go",
  "vote.saved": "Progress is saved automatically",
  "vote.preview.rate": "{0} images with {1} stars",
  "vote.preview.categorize": "{0} images in “{1}”",
  "vote.preview.empty": "No images yet",
  "vote.fullscreen": "Full screen (F11)",

  "stage.order": "{0} votes",
  "stage.simpleKnockout": "Round {0}",
  "stage.fullKnockout": "{0} placed, {1} still in the race",
  "stage.single": "Image {0} of {1}",

  "summary.title": "Summary",
  "summary.files": "{0} images",
  "summary.method": "Apply as",
  "summary.method.move": "Rename in place",
  "summary.method.move.categorize": "Move into subfolders",
  "summary.method.copy": "Copy into folder",
  "summary.copyFolder": "Folder name",
  "summary.replacePrefix": "Replace placement/rating prefixes from an earlier run",
  "summary.unchanged": "{0} unchanged",
  "summary.apply": "Rename {0} images",
  "summary.apply.categorize": "Move {0} images",
  "summary.apply.copy": "Copy {0} images to “{1}”",
  "summary.applying": "Applying…",
  "summary.back": "Back to voting",
  "summary.discard": "Discard",
  "summary.discard.confirm": "Discard this result? No file will be changed.",
  "summary.conflicts": "Nothing was changed - these files exist already:",
  "summary.error": "Nothing was changed: {0}",
  "summary.safe": "Nothing changes on disk until you click “{0}” - and you can undo it afterwards.",

  "done.title": "Done",
  "done.moved": "{0} files renamed or moved.",
  "done.copied": "{0} files copied to {1}.",
  "done.open": "Open folder",
  "done.undo": "Undo",
  "done.again": "Sort another round",
  "done.quit": "Quit",
  "done.reverted": "Undone: {0} files restored.",
  "done.revertFailed": "These files could not be restored, because they were changed or removed:",

  "error.noDirectory": "This is not a folder:\n{0}",
  "error.generic": "Something went wrong: {0}",
  "confirm.yes": "Yes",
  "confirm.no": "No",
  "lang.switch": "Deutsch",
} as const;

export type Key = keyof typeof en;

const de: Record<Key, string> = {
  "app.tagline": "Bilder sortieren, ranken und bewerten - eine schnelle Entscheidung nach der anderen.",
  "welcome.drop": "Ordner hierher ziehen",
  "welcome.or": "oder",
  "welcome.choose": "Ordner wählen…",
  "welcome.recent": "Zuletzt verwendet",
  "welcome.formats": "JPG, PNG, WebP, GIF, BMP und AVIF",
  "directory.choose.title": "Ordner mit Bildern wählen",

  "mode.order": "Reihenfolge",
  "mode.order.description": "Vergleiche immer zwei Bilder, bis jedes Bild seinen Platz hat - die genaueste Rangfolge.",
  "mode.order.rename":
    "Jeder Dateiname erhält seine Platzierung als dreistellige Nummer vorangestellt, z. B. 002-strand.jpg.",
  "mode.simple-knockout": "Turnier · Sieger finden",
  "mode.simple-knockout.description":
    "Die Bilder treten paarweise gegeneinander an, der Gewinner kommt weiter, bis nur noch eins übrig ist.",
  "mode.simple-knockout.rename":
    "Jeder Dateiname erhält seine Platzierung als dreistellige Nummer; Bilder, die in derselben Runde ausgeschieden sind, teilen sich einen Platz.",
  "mode.full-knockout": "Turnier · Alle platzieren",
  "mode.full-knockout.description":
    "Die Bilder treten paarweise gegeneinander an, Runde für Runde, bis alle Platzierungen feststehen.",
  "mode.full-knockout.rename":
    "Jeder Dateiname erhält seine Platzierung als dreistellige Nummer vorangestellt, z. B. 004-strand.jpg.",
  "mode.knockout": "Turnier",
  "mode.knockout.description":
    "Die Bilder treten paarweise gegeneinander an, der Gewinner kommt weiter - der schnellste Weg zu deinen Favoriten.",
  "mode.knockout.simple": "Sieger finden",
  "mode.knockout.full": "Alle platzieren",
  "mode.rate": "Bewerten",
  "mode.rate.description": "Vergib für jedes Bild ein bis zehn Sterne.",
  "mode.rate.rename": "Jeder Dateiname erhält die Bewertung als zweistellige Zahl vorangestellt, z. B. 07-strand.jpg.",
  "mode.categorize": "Kategorisieren",
  "mode.categorize.description": "Ordne jedes Bild einer Kategorie zu - die Kategorien legst du unterwegs an.",
  "mode.categorize.rename":
    "Jedes Bild wird in einen Unterordner mit dem Namen seiner Kategorie verschoben, z. B. familie/strand.jpg.",
  "mode.order.example": "001-strand.jpg",
  "mode.knockout.example": "001-strand.jpg",
  "mode.rate.example": "08-strand.jpg",
  "mode.categorize.example": "familie/strand.jpg",

  "select.header": "Wie möchtest du deine Bilder sortieren?",
  "select.files": "{0} Bilder",
  "select.votes": "etwa {0} Entscheidungen",
  "select.result": "So heißen die Dateien danach",
  "select.start": "Starten",
  "select.hint": "Doppelklick auf einen Modus oder 1-4 und Enter startet sofort.",
  "select.otherFolder": "Anderer Ordner",
  "select.tooFew": "Dieser Modus braucht mindestens zwei Bilder.",
  "select.resume.title": "Weitermachen, wo du aufgehört hast?",
  "select.resume.text": "{0} - bisher {1} Entscheidungen, gespeichert {2}.",
  "select.resume.button": "Weitermachen",
  "select.resume.discard": "Verwerfen",
  "select.revert.title": "Letztes Ergebnis in diesem Ordner",
  "select.revert.text": "{0} Dateien wurden am {2} {1}.",
  "select.revert.moved": "umbenannt oder verschoben",
  "select.revert.copied": "kopiert",
  "select.revert.button": "Rückgängig",
  "select.noImages": "In diesem Ordner wurden keine Bilder gefunden.",

  "vote.compare.hint": "Oder das Bild anklicken, das zuerst kommen soll",
  "vote.knockout.hint": "Oder das Bild anklicken, das gewinnt",
  "vote.question.order": "Welches Bild kommt zuerst?",
  "vote.question.simple-knockout": "Welches Bild gewinnt?",
  "vote.question.full-knockout": "Welches Bild gewinnt?",
  "vote.question.rate": "Wie viele Sterne bekommt dieses Bild?",
  "vote.question.categorize": "Wohin gehört dieses Bild?",
  "vote.pick.left": "links zuerst",
  "vote.pick.right": "rechts zuerst",
  "vote.pick.left.knockout": "links gewinnt",
  "vote.pick.right.knockout": "rechts gewinnt",
  "vote.rate.count": "bisher {0} Bilder mit {1} Sternen",
  "vote.categorize.chip": "Rechtsklick: die letzten Bilder dieser Kategorie",
  "vote.categorize.image": "Klick: in „{0}“",
  "vote.categorize.input": "Enter legt die Kategorie an, Strg+Enter ordnet das Bild gleich zu",
  "vote.back.saved": "gespeichert",
  "vote.next": "danach eine Vorschau - noch wird keine Datei geändert",
  "vote.rate.hint":
    "[[1]] … [[9]] und [[0]] für zehn Sterne · Rechtsklick auf einen Stern zeigt die letzten Bilder mit dieser Bewertung",
  "vote.categorize.hint": "[[1]] … [[9]] Kategorie · [[Tab]] neue Kategorie",
  "vote.categorize.new": "Neue Kategorie",
  "vote.categorize.add": "Hinzufügen",
  "vote.undo": "Rückgängig",
  "update.available":
    "Pictorix {0} ist verfügbar (installiert: {1}).\n\nJetzt installieren? Pictorix startet danach neu.",
  "update.install": "Installieren und neu starten",
  "update.later": "Später",
  "update.failed": "Das Update konnte nicht installiert werden:\n{0}",
  "vote.restart": "Neu starten",
  "vote.restart.confirm": "Von vorn beginnen? Alle Entscheidungen dieser Runde gehen verloren.",
  "vote.back": "Modi",
  "vote.remaining": "noch etwa {0}",
  "vote.remainingExact": "noch {0}",
  "vote.saved": "Der Fortschritt wird automatisch gespeichert",
  "vote.preview.rate": "{0} Bilder mit {1} Sternen",
  "vote.preview.categorize": "{0} Bilder in „{1}“",
  "vote.preview.empty": "Noch keine Bilder",
  "vote.fullscreen": "Vollbild (F11)",

  "stage.order": "{0} Entscheidungen",
  "stage.simpleKnockout": "Runde {0}",
  "stage.fullKnockout": "{0} platziert, {1} noch im Rennen",
  "stage.single": "Bild {0} von {1}",

  "summary.title": "Zusammenfassung",
  "summary.files": "{0} Bilder",
  "summary.method": "Anwenden als",
  "summary.method.move": "Im Ordner umbenennen",
  "summary.method.move.categorize": "In Unterordner verschieben",
  "summary.method.copy": "In Ordner kopieren",
  "summary.copyFolder": "Ordnername",
  "summary.replacePrefix": "Platzierungs-/Bewertungs-Präfixe eines früheren Durchgangs ersetzen",
  "summary.unchanged": "{0} unverändert",
  "summary.apply": "{0} Bilder umbenennen",
  "summary.apply.categorize": "{0} Bilder verschieben",
  "summary.apply.copy": "{0} Bilder nach „{1}“ kopieren",
  "summary.applying": "Wird angewendet…",
  "summary.back": "Zurück zur Abstimmung",
  "summary.discard": "Verwerfen",
  "summary.discard.confirm": "Dieses Ergebnis verwerfen? Es wird keine Datei verändert.",
  "summary.conflicts": "Es wurde nichts verändert - diese Dateien gibt es bereits:",
  "summary.error": "Es wurde nichts verändert: {0}",
  "summary.safe":
    "Bis du auf „{0}“ klickst, ändert sich nichts auf der Platte - und auch danach lässt es sich rückgängig machen.",

  "done.title": "Fertig",
  "done.moved": "{0} Dateien umbenannt oder verschoben.",
  "done.copied": "{0} Dateien nach {1} kopiert.",
  "done.open": "Ordner öffnen",
  "done.undo": "Rückgängig",
  "done.again": "Weitere Runde sortieren",
  "done.quit": "Beenden",
  "done.reverted": "Rückgängig gemacht: {0} Dateien wiederhergestellt.",
  "done.revertFailed":
    "Diese Dateien konnten nicht wiederhergestellt werden, weil sie inzwischen verändert oder entfernt wurden:",

  "error.noDirectory": "Das ist kein Ordner:\n{0}",
  "error.generic": "Etwas ist schiefgegangen: {0}",
  "confirm.yes": "Ja",
  "confirm.no": "Nein",
  "lang.switch": "English",
};

const dictionaries: Record<Lang, Record<Key, string>> = { en, de };

let current = $state<{ lang: Lang }>({ lang: detect() });

function detect(): Lang {
  const stored = (() => {
    try {
      return localStorage.getItem("pictorix.lang");
    } catch {
      return null;
    }
  })();
  if (stored === "de" || stored === "en") return stored;
  return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

export function lang(): Lang {
  return current.lang;
}

export function setLang(value: string | null | undefined, remember = false): void {
  if (value !== "de" && value !== "en") return;
  current.lang = value;
  document.documentElement.lang = value;
  if (remember) {
    try {
      localStorage.setItem("pictorix.lang", value);
    } catch {
      /* only a convenience */
    }
  }
}

export function t(key: Key, ...args: (string | number)[]): string {
  const text = dictionaries[current.lang][key] ?? en[key] ?? key;
  return text.replace(/\{(\d+)\}/g, (_, idx) => {
    const value = args[Number(idx)];
    return typeof value === "number" ? value.toLocaleString(current.lang) : String(value ?? "");
  });
}

/** For keys built at runtime, e.g. `mode.${mode}`. */
export function tk(key: string, ...args: (string | number)[]): string {
  return t(key as Key, ...args);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(current.lang, { dateStyle: "medium", timeStyle: "short" });
}
