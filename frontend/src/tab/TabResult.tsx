import type { Converted } from "../api/client";
import { AlterationList } from "./AlterationList";
import { CopyButton } from "./CopyButton";
import { summaryLine } from "./summary";

const NO_TAB = "No guitar tab found in that text. A tab line looks like  e|--0--3--|";

/** The converted tab with what changed; or, if no tab was found, how a tab line looks. */
export function TabResult({ converted }: { converted: Converted }) {
  if (converted.systems.length === 0) return <p className="status">{NO_TAB}</p>;
  return (
    <section className="tab-result" aria-label="Conversion result">
      <p className="tab-summary">{summaryLine(converted.summary)}</p>
      <AlterationList alterations={converted.alterations} systems={converted.systems} />
      <CopyButton text={converted.text} />
      <section className="tab-output" aria-label="Converted tab">
        <pre>{converted.text}</pre>
      </section>
    </section>
  );
}
