/** The class for an answer button once answered: the right one green, the wrong choice red. */
export function optionState(
  id: string,
  answered: { right: string; chosen: string } | null,
): string {
  if (!answered) return "";
  if (id === answered.right) return " option-right";
  return id === answered.chosen ? " option-wrong" : "";
}
