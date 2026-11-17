"""The user-facing record of what conversion changed, one plain sentence each."""

from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tab.convert_model import Alteration, PlacedNote
from fretless.tab.events import Event


def _unit_label(count: int, singular: str, plural: str) -> str:
    return singular if count == 1 else f"{count} {plural}"


def _shift_amount(steps: int) -> str:
    abs_steps = abs(steps)
    if abs_steps % STEPS_PER_OCTAVE == 0:
        return _unit_label(abs_steps // STEPS_PER_OCTAVE, "an octave", "octaves")
    if abs_steps % 2 == 0:
        return _unit_label(abs_steps // 2, "1 semitone", "semitones")
    return _unit_label(abs_steps, "1 quarter-tone", "quarter-tones")


def _direction(steps: int) -> str:
    return "up" if steps > 0 else "down"


def transposed(steps: int) -> Alteration:
    return Alteration(
        "transposed",
        None,
        None,
        f"Whole piece moved {_direction(steps)} {_shift_amount(steps)} to fit the oud.",
    )


def unsupported_system(system: int, lines: int) -> Alteration:
    return Alteration(
        "unsupported_system",
        system,
        None,
        f"A {lines}-line system was left as it was: only 6-line guitar tab is converted.",
    )


def fitted(event: Event, before: tuple[int, ...], after: tuple[int, ...]) -> list[Alteration]:
    """One alteration for each note of `event` moved by octaves into the oud's range."""
    return [
        Alteration(
            "octave_shifted",
            event.system,
            event.column,
            f"Note moved {_direction(b - a)} {_shift_amount(b - a)} to fit the oud.",
        )
        for a, b in zip(before, after, strict=True)
        if a != b
    ]


def placed_chord(
    event: Event, wanted: tuple[int, ...], notes: tuple[PlacedNote, ...]
) -> list[Alteration]:
    """Alterations for chord notes moved an octave or dropped to make the chord playable."""
    moved = [n.pitch for n in notes if n.pitch not in wanted]
    found = [
        Alteration(
            "octave_shifted",
            event.system,
            event.column,
            "A chord note was moved an octave to make the chord playable.",
        )
        for _ in moved
    ]
    dropped = len(event.pitches) - len(notes)
    if dropped:
        found.append(
            Alteration(
                "chord_reduced",
                event.system,
                event.column,
                f"{dropped} chord {'note' if dropped == 1 else 'notes'} left out to make "
                "the chord playable on the oud.",
            )
        )
    return found
