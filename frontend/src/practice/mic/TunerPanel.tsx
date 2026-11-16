import type { NeckOut } from "../../api/client";
import type { Reading } from "../../listen";
import type { NamingSystem } from "../../notation/noteName";
import { locationAt, nameOfPitchClass } from "../neckLookup";
import { spokenName } from "../spokenName";
import { Meter } from "./Meter";
import { matchedCourses, tunerReading } from "./tuner";

type TunerProps = { reading: Reading; neck: NeckOut; system: NamingSystem };

function heardLine(reading: Reading, neck: NeckOut, system: NamingSystem): string {
  const heard = tunerReading(reading);
  if (!heard) return "Play a note.";
  const name = nameOfPitchClass(neck, heard.step);
  const note = name ? spokenName(name, system) : "?";
  const cents = Math.round(heard.cents);
  if (cents === 0) return `${note} · in tune`;
  return `${note} · ${Math.abs(cents)} cents ${cents > 0 ? "sharp" : "flat"}`;
}

/** A free tuner: the nearest note and cents for whatever is heard, and the open courses lighting up when matched. */
export function TunerPanel({ reading, neck, system }: TunerProps) {
  const matched = matchedCourses(reading, neck.courses);
  return (
    <div className="tuner">
      <p className="drill-prompt tuner-note" aria-live="polite">
        {heardLine(reading, neck, system)}
      </p>
      <Meter cents={tunerReading(reading)?.cents ?? null} />
      <ul className="chips" aria-label="Open courses">
        {neck.courses.map((c) => {
          const name = locationAt(neck, c.course, 0)?.name;
          const lit = matched.includes(c.course);
          return (
            <li key={c.course} className={lit ? "chip chip-lit" : "chip"}>
              {lit && "✓ "}Course {c.course}
              {name && ` · ${spokenName(name, system)}`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
