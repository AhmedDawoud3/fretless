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
  return (
    <p className="import-status">
      Imported <strong>{state.imported.title}</strong> ({source} · {state.imported.kind})
    </p>
  );
}

type TabImportBarProps = {
  onImported: (imported: ImportedTab) => void;
};

/** Import tabs or chord sheets from Ultimate Guitar, Songsterr, or local PDF files. */
export function TabImportBar({ onImported }: TabImportBarProps) {
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<ImportKind>("auto");
  const [state, setState] = useState<ImportState>({ status: "idle" });

  const applyReply = (reply: ImportReply) => {
    if (reply.rejected) {
      setState({ status: "error", message: reply.detail });
      return;
    }
    setState({ status: "done", imported: reply.imported });
    onImported(reply.imported);
  };

  const handleUrl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setState({ status: "loading", label: "Fetching tab or chords..." });
    try {
      applyReply(await importTabUrl({ url: trimmed, kind }));
    } catch {
      setState({ status: "error", message: UNREACHABLE });
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) {
      setState({ status: "error", message: "PDF file is over 14 MB." });
      return;
    }
    setState({ status: "loading", label: `Reading ${file.name}...` });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      applyReply(
        await importTabPdf({ pdf_base64: bytesToBase64(bytes), filename: file.name, kind }),
      );
    } catch {
      setState({ status: "error", message: UNREACHABLE });
    }
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
    </div>
  );
}
