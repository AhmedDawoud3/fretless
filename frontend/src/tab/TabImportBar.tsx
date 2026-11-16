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
  findInLibrary,
  findUrlInLibrary,
  type LibraryItem,
  loadLibrary,
  pdfLibraryKey,
  removeFromLibrary,
  saveToLibrary,
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

async function readPdfImport(file: File, kind: ImportKind): Promise<ImportReply> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return importTabPdf({ pdf_base64: bytesToBase64(bytes), filename: file.name, kind });
}

type ImportHandlers = {
  setActiveUrl: (u: string | null) => void;
  setState: (s: ImportState) => void;
  setLibrary: (fn: (prev: LibraryItem[]) => LibraryItem[]) => void;
  onImported: (imported: ImportedTab) => void;
};

function acceptCachedEntry(
  cached: LibraryItem | undefined,
  fallbackUrl: string | null,
  h: ImportHandlers,
): boolean {
  if (!cached) return false;
  h.setActiveUrl(cached.sourceUrl ?? fallbackUrl);
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
  h.setActiveUrl(sourceUrl);
  h.onImported(imported);
}

async function submitUrlImport(
  rawUrl: string,
  kind: ImportKind,
  library: readonly LibraryItem[],
  h: ImportHandlers,
) {
  const trimmed = rawUrl.trim();
  if (!trimmed || acceptCachedEntry(findUrlInLibrary(library, trimmed, kind), trimmed, h)) return;
  await runImport(
    "Fetching tab or chords...",
    () => importTabUrl({ url: trimmed, kind }),
    h.setState,
    (imported) => acceptUrlEntry(trimmed, kind, imported, true, h),
  );
}

async function submitTrackImport(
  trackIdx: number,
  targetUrl: string,
  kind: ImportKind,
  library: readonly LibraryItem[],
  h: ImportHandlers,
) {
  if (!targetUrl) return;
  if (acceptCachedEntry(findUrlInLibrary(library, targetUrl, kind, trackIdx), targetUrl, h)) return;
  await runImport(
    "Loading track...",
    () => importTabUrl({ url: targetUrl, kind, track: trackIdx }),
    h.setState,
    (imported) => acceptUrlEntry(targetUrl, kind, imported, false, h),
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
  const key = pdfLibraryKey(file.name, file.size, kind);
  if (acceptCachedEntry(findInLibrary(library, key), null, h)) return;
  await runImport(
    `Reading ${file.name}...`,
    () => readPdfImport(file, kind),
    h.setState,
    (imported) => {
      h.setActiveUrl(null);
      h.setLibrary((prev) => saveToLibrary(prev, { key, imported }));
      h.onImported(imported);
    },
  );
}

/** Import tabs or chord sheets from Ultimate Guitar, Songsterr, or local PDF files. */
export function TabImportBar({ onImported }: TabImportBarProps) {
  const [url, setUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<ImportKind>("auto");
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [library, setLibrary] = useState<LibraryItem[]>(() => loadLibrary());
  const h: ImportHandlers = { setActiveUrl, setState, setLibrary, onImported };
  const targetUrl = activeUrl ?? url.trim();
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
        canSwitchTrack={Boolean(targetUrl)}
        tracks={tracks}
        trackIndex={trackIndex}
        onUrl={setUrl}
        onKind={setKind}
        onSubmit={(e) => {
          e.preventDefault();
          void submitUrlImport(url, kind, library, h);
        }}
        onFile={onFile}
        onTrack={(idx) => void submitTrackImport(idx, targetUrl, kind, library, h)}
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
