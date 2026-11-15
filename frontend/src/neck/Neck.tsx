import { CENTER_Y, JOINT_X, NUT_X } from "./layout";

/** Bare wood of the neck; the body is drawn over its end at the joint. */
export function Neck() {
  return (
    <rect
      className="neck"
      x={NUT_X}
      y={CENTER_Y - 75}
      width={JOINT_X - NUT_X + 30}
      height={150}
      fill="url(#oud-neck-wood)"
    />
  );
}
