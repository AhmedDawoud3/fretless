export type AsciiTokenKind = "label" | "bar" | "rail" | "text";

export type AsciiToken = { kind: AsciiTokenKind; text: string };

const BODY_RUNS = /(\|+|-+|[^|-]+)/g;
const LEADING_LABEL = /^([^|\n-]+)(?=\|)/;

/** True when a rendered output line represents one string/course row of ASCII tab. */
export function isAsciiTabLine(line: string): boolean {
  return line.includes("|") && line.includes("--");
}

/** True when a rendered note cell contains a quarter-tone virtual fret or ASCII accidental. */
export function isQuarterToneCell(text: string): boolean {
  return text.includes(".5") || /[A-G][d+]/.test(text);
}

const RUN_KINDS: Readonly<Record<string, AsciiTokenKind>> = { "|": "bar", "-": "rail" };

function classifyRun(run: string): AsciiTokenKind {
  return RUN_KINDS[run[0] ?? ""] ?? "text";
}

function splitBodyRuns(body: string): AsciiToken[] {
  if (!body) return [];
  return [...body.matchAll(BODY_RUNS)].map((match) => ({
    kind: classifyRun(match[0]),
    text: match[0],
  }));
}

/** Split a non-event stretch of ASCII tab into styled tokens while keeping exact characters verbatim. */
export function tokenizePlainStretch(
  text: string,
  isTab: boolean,
  atLineStart: boolean,
): AsciiToken[] {
  if (!text) return [];
  if (!isTab) return [{ kind: "text", text }];
  if (atLineStart) {
    const label = LEADING_LABEL.exec(text);
    if (label) {
      return [{ kind: "label", text: label[0] }, ...splitBodyRuns(text.slice(label[0].length))];
    }
  }
  return splitBodyRuns(text);
}
