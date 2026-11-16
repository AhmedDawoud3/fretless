import { DrillShell } from "./DrillShell";
import type { Drill, DrillEntry, DrillResult } from "./drill";

/** Turns a drill into what the picker and page use: its card details and a shell that runs it. */
export function defineDrill<Q, A, R extends DrillResult>(drill: Drill<Q, A, R>): DrillEntry {
  const { id, title, blurb, levels } = drill;
  return {
    id,
    title,
    blurb,
    levels,
    render: (props) => <DrillShell drill={drill} {...props} />,
  };
}
