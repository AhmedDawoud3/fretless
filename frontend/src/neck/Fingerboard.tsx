import { CENTER_Y, HALF_X, NUT_X } from "./layout";

/** Dark fingerboard from the nut over the soundboard to just past the halfway point. */
export function Fingerboard() {
  return (
    <path
      className="fingerboard"
      fill="url(#oud-ebony)"
      d={`M ${NUT_X} ${CENTER_Y - 68} H ${HALF_X + 20} Q ${HALF_X + 36} ${CENTER_Y} ${HALF_X + 20} ${CENTER_Y + 68} H ${NUT_X} Z`}
    />
  );
}
