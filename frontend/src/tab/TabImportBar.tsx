import { type ChangeEvent, type FormEvent, useState } from "react";
import {
  type ImportedTab,
  type ImportKind,
  type ImportReply,
  importTabPdf,
  importTabUrl,
} from "../api/client";
import { Select } from "../explorer/Select";
import { bytesToBase64 } from "../transcribe/exampleWav";
import {
  findInLibrary,
  type LibraryItem,
  loadLibrary,
  pdfLibraryKey,
  removeFromLibrary,
  saveToLibrary,
  urlLibraryKey,
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

/** Import tabs or chord sheets from Ultimate Guitar, Songsterr, or local PDF files. */
export function TabImportBar({ onImported }: TabImportBarProps) {
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<ImportKind>("auto");
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [library, setLibrary] = useState<LibraryItem[]>(() => loadLibrary());

  const acceptImported = (key: string, imported: ImportedTab) => {
    setLibrary((prev) => saveToLibrary(prev, { key, imported }));
    onImported(imported);
  };

  const loadCached = (key: string): boolean => {
    const cached = findInLibrary(library, key);
    if (!cached) return false;
    setState({ status: "cached", imported: cached.imported });
    onImported(cached.imported);
    return true;
  };

  const handleUrl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    const key = urlLibraryKey(trimmed, kind);
    if (loadCached(key)) return;
    await runImport(
      "Fetching tab or chords...",
      () => importTabUrl({ url: trimmed, kind }),
      setState,
      (imported) => acceptImported(key, imported),
    );
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) {
      setState({ status: "error", message: "PDF file is over 14 MB." });
      return;
    }
    const key = pdfLibraryKey(file.name, file.size, kind);
    if (loadCached(key)) return;
    await runImport(
      `Reading ${file.name}...`,
      async () =>
        importTabPdf({
          pdf_base64: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
          filename: file.name,
          kind,
        }),
      setState,
      (imported) => acceptImported(key, imported),
    );
  };

  const busy = state.status === "loading";

  return (
    <div className="import-bar">
      <form className="import-form" onSubmit={(e) => void handleUrl(e)}>
        <label className="control import-url-field">
          Tab / Chords URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tabs.ultimate-guitar.com/... or https://www.songsterr.com/..."
            disabled={busy}
          />
        </label>
        <Select label="Import as" value={kind} options={IMPORT_KINDS} onChange={setKind} />
        <button type="submit" disabled={busy || url.trim() === ""}>
          Import URL
        </button>
        <label className="control import-pdf-pick">
          Import PDF
          <input
            type="file"
            accept=".pdf,application/pdf"
            disabled={busy}
            onChange={(e) => void handleFileChange(e)}
          />
        </label>
      </form>
      <ImportStatus state={state} />
      <ImportLibraryShelf
        items={library}
        disabled={busy}
        onSelect={(item) => {
          setState({ status: "cached", imported: item.imported });
          onImported(item.imported);
        }}
        onRemove={(key) => setLibrary((prev) => removeFromLibrary(prev, key))}
      />
    </div>
  );
}
