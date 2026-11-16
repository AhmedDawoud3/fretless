import { useState } from "react";
import type { PageProps } from "../app/useSharedSettings";
import { DrillPicker } from "./DrillPicker";
import { HowToPractise } from "./HowToPractise";
import { chosenLevel } from "./levels";
import { ResetProgress } from "./ResetProgress";
import { DRILLS } from "./registry";
import { SelectedDrill } from "./SelectedDrill";
import { usePractice } from "./usePractice";
import "./practice.css";

function PracticeBody({ shared, neck }: PageProps) {
  const practice = usePractice();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const drill = DRILLS.find((d) => d.id === selectedId);
  return (
    <>
      <HowToPractise />
      <DrillPicker
        drills={DRILLS}
        selectedId={selectedId}
        progress={practice.progress}
        onSelect={setSelectedId}
      />
      {drill && (
        <SelectedDrill
          drill={drill}
          shared={shared}
          neck={neck}
          progress={practice.progress}
          level={chosenLevel(drill.levels, practice.levels[drill.id])}
          onLevel={(chosen) => practice.setLevel(drill.id, chosen)}
          onRecord={practice.record}
        />
      )}
      <ResetProgress onReset={practice.reset} />
    </>
  );
}

/** Practice: pick a drill, answer questions, see how you are doing. The drills share one frame. */
export function PracticePage(props: PageProps) {
  if (props.shared.intervalsFailed || props.shared.maqamatFailed) {
    return (
      <p className="status status-error" role="alert">
        Could not load the intervals and maqamat. Start the backend with <code>just api</code>, then
        reload.
      </p>
    );
  }
  if (!props.shared.intervals || !props.shared.maqamat)
    return <p className="status">Loading the drills...</p>;
  return <PracticeBody {...props} />;
}
