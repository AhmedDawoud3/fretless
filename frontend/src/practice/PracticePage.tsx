import { useState } from "react";
import type { PageProps } from "../app/useSharedSettings";
import { DrillPicker } from "./DrillPicker";
import { HowToPractise } from "./HowToPractise";
import { ResetProgress } from "./ResetProgress";
import { DRILLS } from "./registry";
import { SelectedDrill } from "./SelectedDrill";
import { usePractice } from "./usePractice";
import "./practice.css";

/** Practice: pick a drill, answer questions, see how you are doing. The drills share one frame. */
export function PracticePage({ shared, neck }: PageProps) {
  const practice = usePractice();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const drill = DRILLS.find((d) => d.id === selectedId);
  if (shared.intervalsFailed) {
    return (
      <p className="status status-error" role="alert">
        Could not load the intervals. Start the backend with <code>just api</code>, then reload.
      </p>
    );
  }
  if (!shared.intervals) return <p className="status">Loading the drills...</p>;
  const first = drill?.levels[0]?.level ?? 1;
  const saved = drill ? practice.levels[drill.id] : undefined;
  const level = drill?.levels.some((l) => l.level === saved) ? (saved ?? first) : first;
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
          level={level}
          onLevel={(chosen) => practice.setLevel(drill.id, chosen)}
          onRecord={practice.record}
        />
      )}
      <ResetProgress onReset={practice.reset} />
    </>
  );
}
