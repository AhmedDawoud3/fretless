import type { Alteration, ConvertedSystem } from "../api/client";
import { groupAlterations, locationText } from "./alterations";
import { cellKey } from "./cells";

type ItemProps = {
  alteration: Alteration;
  systems: readonly ConvertedSystem[];
  /** Called with the event key of an alteration that sits at one column. */
  onPick: (key: string) => void;
};

function Item({ alteration, systems, onPick }: ItemProps) {
  const { system, column, message } = alteration;
  const text = (
    <>
      <span className="alteration-where">{locationText(alteration, systems)}</span>
      <span>{message}</span>
    </>
  );
  if (system === null || column === null) return <li>{text}</li>;
  return (
    <li>
      <button type="button" className="alteration" onClick={() => onPick(cellKey(system, column))}>
        {text}
      </button>
    </li>
  );
}

type AlterationListProps = Omit<ItemProps, "alteration"> & {
  alterations: readonly Alteration[];
};

/** What conversion changed, by kind, each with its sentence and where it happened. */
export function AlterationList({ alterations, systems, onPick }: AlterationListProps) {
  const groups = groupAlterations(alterations);
  return (
    <section className="alterations" aria-label="What changed">
      {groups.length === 0 && <p>Nothing had to change.</p>}
      {groups.map((group) => (
        <div key={group.kind}>
          <h3>{group.title}</h3>
          <ul>
            {group.items.map((alteration, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list, never reordered
              <Item key={i} {...{ alteration, systems, onPick }} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
