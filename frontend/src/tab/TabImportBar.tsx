import { type ChangeEvent, type FormEvent, useState } from "react";
import {
  type ImportedTab,
  type ImportedTrack,
  type ImportKind,
  type ImportReply,
  importTabPdf,
  importTabUrl,
} from "../api/client";
import { Select } from "../explorer/Select";
import { bytesToBase64 } from "../transcribe/exampleWav";
import {
  cacheSessionPdf,
  findPdfInLibrary,
  findUrlInLibrary,
  getSessionPdf,
  type LibraryItem,
  loadLibrary,
  removeFromLibrary,
  savePdfToLibrary,
  saveUrlToLibrary,
} from "./importLibrary";

const MAX_PDF_BYTES = 14 * 1024 * 1024;
const SOURCE_LABELS: Record<string, string> = {
  "ultimate-guitar": "Ultimate Guitar",
  songsterr: "Songsterr",
  pdf: "PDF",
};

const IMPORT_KINDS: [ImportKind, string][] = [
  ["auto", "Auto"],
  ["tab", "Tab"],
  ["sheet", "Sheet music"],
  ["chords", "Chords"],
];

type ImportState =
  | { status: "idle" }
  | { status: "loading"; label: string }
  | { status: "done"; imported: ImportedTab }
  | { status: "cached"; imported: ImportedTab }
  | { status: "error"; message: string };

type ActiveSource =
  | { type: "url"; url: string }
  | { type: "pdf"; name: string; size: number; base64: string };

const UNREACHABLE = "Import failed. Check that `just api` is running and try again.";

function formatTrackLabel(track: ImportedTrack): string {
  const { name, instrument } = track;
  if (instrument && instrument.toLowerCase() !== name.toLowerCase()) {
    return `${name} (${instrument})`;
  }
  return name;
}

function ImportStatus({ state }: { state: ImportState }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") return <p className="import-status">{state.label}</p>;
  if (state.status === "error") {
    return (
      <p className="import-status status-error" role="alert">
        {state.message}
      </p>
    );
  }
  const source = SOURCE_LABELS[state.imported.source] ?? state.imported.source;
  const prefix = state.status === "cached" ? "Loaded from library:" : "Imported";
  return (
    <p className="import-status">
      {`${prefix} ${state.imported.title} (${source} · ${state.imported.kind})`}
    </p>
  );
}

function TrackSelect({
  tracks,
  trackIndex,
  disabled,
  onChange,
}: {
  tracks: readonly ImportedTrack[];
  trackIndex: number | null;
  disabled: boolean;
  onChange: (index: number) => void;
}) {
  if (tracks.length <= 1 || disabled) return null;
  const current = String(trackIndex ?? tracks[0]?.index ?? 0);
  const options: [string, string][] = tracks.map((t) => [String(t.index), formatTrackLabel(t)]);
  return (
    <Select
      label="Track"
      value={current}
      options={options}
      onChange={(val) => onChange(Number(val))}
    />
  );
}

function ImportLibraryShelf({
  items,
  disabled,
  onSelect,
  onRemove,
}: {
  items: readonly LibraryItem[];
  disabled: boolean;
  onSelect: (item: LibraryItem) => void;
  onRemove: (key: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="tab-import-library" aria-label="Saved library">
      <span className="tab-import-library-label">Saved library</span>
      <ul className="tab-import-library-list">
        {items.map((item) => {
          const source = SOURCE_LABELS[item.imported.source] ?? item.imported.source;
          return (
            <li key={item.key} className="tab-import-library-item">
              <button
                type="button"
                className="tab-import-library-load"
                disabled={disabled}
                aria-label={`Load ${item.imported.title}`}
                onClick={() => onSelect(item)}
              >
                <span className="tab-import-library-title">{item.imported.title}</span>
                <span className="tab-import-library-meta">
                  {source} · {item.imported.kind}
                  {item.imported.tempo ? ` · ${item.imported.tempo} BPM` : ""}
                </span>
              </button>
              <button
                type="button"
                className="tab-import-library-remove"
                disabled={disabled}
                aria-label={`Remove ${item.imported.title}`}
                onClick={() => onRemove(item.key)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type TabImportBarProps = {
  onImported: (imported: ImportedTab) => void;
};

async function runImport(
  label: string,
  task: () => Promise<ImportReply>,
  setState: (s: ImportState) => void,
  onDone: (imported: ImportedTab) => void,
) {
  setState({ status: "loading", label });
  try {
    const reply = await task();
    if (reply.rejected) {
      setState({ status: "error", message: reply.detail });
      return;
    }
    setState({ status: "done", imported: reply.imported });
    onDone(reply.imported);
  } catch {
    setState({ status: "error", message: UNREACHABLE });
  }
}

function currentTracks(state: ImportState): {
  tracks: readonly ImportedTrack[];
  trackIndex: number | null;
} {
  if (state.status !== "done" && state.status !== "cached") {
    return { tracks: [], trackIndex: null };
  }
  return {
    tracks: state.imported.tracks ?? [],
    trackIndex: state.imported.track_index ?? null,
  };
}

function ImportFormFields({
  url,
  kind,
  busy,
  canSwitchTrack,
  tracks,
  trackIndex,
  onUrl,
  onKind,
  onSubmit,
  onFile,
  onTrack,
}: {
  url: string;
  kind: ImportKind;
  busy: boolean;
  canSwitchTrack: boolean;
  tracks: readonly ImportedTrack[];
  trackIndex: number | null;
  onUrl: (v: string) => void;
  onKind: (k: ImportKind) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onTrack: (idx: number) => void;
}) {
  return (
    <form className="import-form" onSubmit={onSubmit}>
      <label className="control import-url-field">
        Tab / Chords URL
        <input
          type="url"
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          placeholder="https://tabs.ultimate-guitar.com/... or https://www.songsterr.com/..."
          disabled={busy}
        />
      </label>
      <Select label="Import as" value={kind} options={IMPORT_KINDS} onChange={onKind} />
      <button type="submit" disabled={busy || url.trim() === ""}>
        Import URL
      </button>
      <label className="control import-pdf-pick">
        Import PDF
        <input type="file" accept=".pdf,application/pdf" disabled={busy} onChange={onFile} />
      </label>
      <TrackSelect
        tracks={tracks}
        trackIndex={trackIndex}
        disabled={busy || !canSwitchTrack}
        onChange={onTrack}
      />
    </form>
  );
}

type ImportHandlers = {
  setActiveSource: (s: ActiveSource | null) => void;
  setState: (s: ImportState) => void;
  setLibrary: (fn: (prev: LibraryItem[]) => LibraryItem[]) => void;
  onImported: (imported: ImportedTab) => void;
};

function sourceFromLibraryItem(item: LibraryItem): ActiveSource | null {
  if (item.sourceUrl) return { type: "url", url: item.sourceUrl };
  if (item.sourceFile) {
    const base64 = getSessionPdf(item.sourceFile.name, item.sourceFile.size);
    if (base64) return { type: "pdf", ...item.sourceFile, base64 };
  }
  return null;
}

function acceptCachedEntry(
  cached: LibraryItem | undefined,
  fallback: ActiveSource | null,
  h: ImportHandlers,
): boolean {
  if (!cached) return false;
  h.setActiveSource(sourceFromLibraryItem(cached) ?? fallback);
  h.setState({ status: "cached", imported: cached.imported });
  h.onImported(cached.imported);
  return true;
}

function acceptUrlEntry(
  sourceUrl: string,
  kind: ImportKind,
  imported: ImportedTab,
  isDefault: boolean,
  h: ImportHandlers,
) {
  h.setLibrary((prev) => saveUrlToLibrary(prev, imported, sourceUrl, kind, isDefault));
  h.setActiveSource({ type: "url", url: sourceUrl });
  h.onImported(imported);
}

function acceptPdfEntry(
  file: { name: string; size: number; base64: string },
  kind: ImportKind,
  imported: ImportedTab,
  isDefault: boolean,
  h: ImportHandlers,
) {
  h.setLibrary((prev) => savePdfToLibrary(prev, imported, file.name, file.size, kind, isDefault));
  h.setActiveSource({ type: "pdf", ...file });
  h.onImported(imported);
}

async function submitUrlImport(
  rawUrl: string,
  kind: ImportKind,
  library: readonly LibraryItem[],
  h: ImportHandlers,
) {
  const trimmed = rawUrl.trim();
  const cached = findUrlInLibrary(library, trimmed, kind);
  if (!trimmed || acceptCachedEntry(cached, { type: "url", url: trimmed }, h)) return;
  await runImport(
    "Fetching tab or chords...",
    () => importTabUrl({ url: trimmed, kind }),
    h.setState,
    (imported) => acceptUrlEntry(trimmed, kind, imported, true, h),
  );
}

async function submitTrackImport(
  trackIdx: number,
  source: ActiveSource | null,
  kind: ImportKind,
  library: readonly LibraryItem[],
  h: ImportHandlers,
) {
  if (!source) return;
  if (source.type === "url") {
    const cached = findUrlInLibrary(library, source.url, kind, trackIdx);
    if (acceptCachedEntry(cached, source, h)) return;
    await runImport(
      "Loading track...",
      () => importTabUrl({ url: source.url, kind, track: trackIdx }),
      h.setState,
      (imported) => acceptUrlEntry(source.url, kind, imported, false, h),
    );
    return;
  }
  const cached = findPdfInLibrary(library, source.name, source.size, kind, trackIdx);
  if (acceptCachedEntry(cached, source, h)) return;
  await runImport(
    "Loading track...",
    () =>
      importTabPdf({
        pdf_base64: source.base64,
        filename: source.name,
        kind,
        track: trackIdx,
      }),
    h.setState,
    (imported) => acceptPdfEntry(source, kind, imported, false, h),
  );
}

async function submitPdfImport(
  file: File | undefined,
  kind: ImportKind,
  library: readonly LibraryItem[],
  h: ImportHandlers,
) {
  if (!file) return;
  if (file.size > MAX_PDF_BYTES) {
    h.setState({ status: "error", message: "PDF file is over 14 MB." });
    return;
  }
  const base64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
  cacheSessionPdf(file.name, file.size, base64);
  const pdf = { type: "pdf" as const, name: file.name, size: file.size, base64 };
  if (acceptCachedEntry(findPdfInLibrary(library, file.name, file.size, kind), pdf, h)) return;
  await runImport(
    `Reading ${file.name}...`,
    () => importTabPdf({ pdf_base64: base64, filename: file.name, kind }),
    h.setState,
    (imported) =>
      acceptPdfEntry({ name: file.name, size: file.size, base64 }, kind, imported, true, h),
  );
}

function matchesSource(source: ActiveSource | null, rawUrl: string): boolean {
  if (!source) return false;
  if (source.type === "pdf") return true;
  const trimmed = rawUrl.trim();
  return trimmed === "" || trimmed === source.url;
}

/** Import tabs or chord sheets from Ultimate Guitar, Songsterr, or local PDF files. */
export function TabImportBar({ onImported }: TabImportBarProps) {
  const [url, setUrl] = useState("");
  const [activeSource, setActiveSource] = useState<ActiveSource | null>(null);
  const [kind, setKind] = useState<ImportKind>("auto");
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [library, setLibrary] = useState<LibraryItem[]>(() => loadLibrary());
  const h: ImportHandlers = { setActiveSource, setState, setLibrary, onImported };
  const canSwitch = matchesSource(activeSource, url);
  const { tracks, trackIndex } = currentTracks(state);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    void submitPdfImport(file, kind, library, h);
  };

  return (
    <div className="import-bar">
      <ImportFormFields
        url={url}
        kind={kind}
        busy={state.status === "loading"}
        canSwitchTrack={canSwitch}
        tracks={canSwitch ? tracks : []}
        trackIndex={trackIndex}
        onUrl={setUrl}
        onKind={setKind}
        onSubmit={(e) => {
          e.preventDefault();
          void submitUrlImport(url, kind, library, h);
        }}
        onFile={onFile}
        onTrack={(idx) => void submitTrackImport(idx, activeSource, kind, library, h)}
      />
      <ImportStatus state={state} />
      <ImportLibraryShelf
        items={library}
        disabled={state.status === "loading"}
        onSelect={(item) => acceptCachedEntry(item, null, h)}
        onRemove={(key) => setLibrary((prev) => removeFromLibrary(prev, key))}
      />
    </div>
  );
}
