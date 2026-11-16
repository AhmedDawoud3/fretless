import type { Alteration, ConvertedSystem } from "../api/client";
import { groupAlterations, locationText } from "./alterations";

type AlterationListProps = {
  alterations: readonly Alteration[];
  systems: readonly ConvertedSystem[];
};

/** What conversion changed, by kind, each with its sentence and where it happened. */
export function AlterationList({ alterations, systems }: AlterationListProps) {
  const groups = groupAlterations(alterations);
  return (
    <section className="alterations" aria-label="What changed">
      {groups.length === 0 && <p>Nothing had to change.</p>}
      {groups.map((group) => (
        <div key={group.kind}>
          <h3>{group.title}</h3>
          <ul>
            {group.items.map((a, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list, never reordered
              <li key={i}>
                <span className="alteration-where">{locationText(a, systems)}</span>
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
