import { memo } from "react";
import type { NeckOut } from "../../api/client";
import { OudNeck } from "../../neck/OudNeck";
import type { NamingSystem } from "../../notation/noteName";
import { noteMarker } from "../markers";

type TargetNeckProps = {
  neck: NeckOut;
  system: NamingSystem;
  guides: boolean;
  course: number;
  position: number;
};

/** The oud with the note to play marked. Memoised: the live meter redraws about sixty times a second, the neck should not. */
export const TargetNeck = memo(function TargetNeck({
  neck,
  system,
  guides,
  course,
  position,
}: TargetNeckProps) {
  return (
    <div className="neck-scroll">
      <OudNeck
        neck={neck}
        markers={[noteMarker(neck, system, { course, position }, "root")]}
        showGuides={guides}
        snap
      />
    </div>
  );
});
