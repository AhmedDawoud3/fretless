import { Controls } from "./explorer/Controls";
import { MaqamControls } from "./explorer/MaqamControls";
import { ReadoutLine } from "./explorer/ReadoutLine";
import { useExplorer } from "./explorer/useExplorer";
import { WhyNote } from "./explorer/WhyNote";
import { OudNeck } from "./neck/OudNeck";
import { formatVirtualFret } from "./notation/virtualFret";
import "./app.css";

function Status({ kind }: { kind: "loading" | "error" }) {
  if (kind === "loading") return <p className="status">Loading the oud...</p>;
  return (
    <p className="status status-error" role="alert">
      Could not reach the backend. Start it with <code>just api</code>, then reload.
    </p>
  );
}

function App() {
  const x = useExplorer();
  const showRuler = x.guides && (x.labelMode === "frets" || x.labelMode === "both");
  return (
    <main>
      <h1>Fretless</h1>
      <p className="tagline">Oud learning tools for guitarists.</p>
      {x.data.status !== "ready" ? (
        <Status kind={x.data.status} />
      ) : (
        <>
          <Controls
            tunings={x.data.tunings}
            tuningId={x.tuningId}
            onTuning={x.changeTuning}
            snap={x.snap}
            onSnap={x.setSnap}
            guides={x.guides}
            onGuides={x.setGuides}
            labelMode={x.labelMode}
            onLabelMode={x.setLabelMode}
            system={x.system}
            onSystem={x.setSystem}
          />
          <MaqamControls
            maqam={x.maqam}
            neck={x.data.neck}
            system={x.system}
            playback={x.playback}
            tempo={x.tempo}
            onTempo={x.setTempo}
          />
          <ReadoutLine readout={x.readout} />
          <div className="neck-scroll">
            <OudNeck
              neck={x.data.neck}
              markers={x.markers}
              showGuides={x.guides}
              snap={x.snap}
              onPlay={x.play}
              rulerLabel={showRuler ? formatVirtualFret : undefined}
            />
          </div>
          <WhyNote />
        </>
      )}
    </main>
  );
}

export default App;
