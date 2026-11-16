import type { ReactNode } from "react";
import { PageTabs } from "./app/PageTabs";
import { type PageProps, useSharedSettings } from "./app/useSharedSettings";
import { ChordsPage } from "./chords/ChordsPage";
import { CoursePage } from "./course/CoursePage";
import { Controls } from "./explorer/Controls";
import { MaqamPage } from "./explorer/MaqamPage";
import type { PageId } from "./explorer/settings";
import { PracticePage } from "./practice/PracticePage";
import { TabPage } from "./tab/TabPage";
import { AudioPage } from "./transcribe/AudioPage";
import "./app.css";

function Status({ kind }: { kind: "loading" | "error" }) {
  if (kind === "loading") return <p className="status">Loading the oud...</p>;
  return (
    <p className="status status-error" role="alert">
      Could not reach the backend. Start it with <code>just api</code>, then reload.
    </p>
  );
}

const PAGES: Record<PageId, (props: PageProps) => ReactNode> = {
  maqam: MaqamPage,
  chords: ChordsPage,
  tab: TabPage,
  audio: AudioPage,
  practice: PracticePage,
  course: CoursePage,
};

function App() {
  const shared = useSharedSettings();
  const { data } = shared;
  const Page = PAGES[shared.page];
  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div className="studio-brand">
          <h1>Fretless</h1>
          <p className="tagline">Oud learning tools for guitarists.</p>
        </div>
        <PageTabs page={shared.page} onPage={shared.setPage} />
      </header>
      {data.status !== "ready" ? (
        <Status kind={data.status} />
      ) : (
        <>
          <Controls
            tunings={data.tunings}
            tuningId={shared.tuningId}
            onTuning={shared.setTuningId}
            snap={shared.snap}
            onSnap={shared.setSnap}
            hideSnap={shared.page === "practice" || shared.page === "course"}
            guides={shared.guides}
            onGuides={shared.setGuides}
            labelMode={shared.labelMode}
            onLabelMode={shared.setLabelMode}
            system={shared.system}
            onSystem={shared.setSystem}
            neckZoom={shared.neckZoom}
            onNeckZoom={shared.setNeckZoom}
          />
          <Page shared={shared} neck={data.neck} />
        </>
      )}
    </main>
  );
}

export default App;
