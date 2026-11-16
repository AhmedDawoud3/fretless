"""Score pitch collections against Arabic maqamat and all 24 quarter-tone roots."""

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass

from fretless.maqam import MAQAMAT, Maqam, ascending_octave, scale_pitch_classes
from fretless.pitch import DEFAULT_SPELLING, STEPS_PER_OCTAVE

_ACCIDENTAL_ASCII = {-2: "b", -1: "d", 0: "", 1: "+", 2: "#"}


@dataclass(frozen=True)
class DetectedMaqam:
    """One ranked maqam + tonic match with scale pitches in C4..C5 range."""

    maqam_id: str
    maqam_name: str
    arabic_name: str
    root: int
    root_name: str
    confidence: int
    scale_pitches: tuple[int, ...]


def _root_label(root: int) -> str:
    letter, alter = DEFAULT_SPELLING[root % STEPS_PER_OCTAVE]
    return f"{letter}{_ACCIDENTAL_ASCII[alter]}"


def _score_candidate(
    maqam: Maqam,
    root: int,
    counts: Counter[int],
    total: int,
    anchors: tuple[int, int, int],
    qt_pcs: set[int],
) -> float:
    pcs = set(scale_pitch_classes(maqam, root))
    in_scale = sum(c for pc, c in counts.items() if pc in pcs) / total
    maqam_qt = {pc for pc in pcs if pc % 2 == 1}
    if qt_pcs:
        qt_score = 0.08 * (len(qt_pcs & maqam_qt) / len(qt_pcs)) if maqam_qt else -0.06
    else:
        qt_score = 0.04 if not maqam_qt else -0.02
    first_pc, final_pc, lowest_pc = anchors
    cadence = (
        (0.12 if root == final_pc else 0.0)
        + (0.06 if root == lowest_pc else 0.0)
        + (0.04 if root == first_pc else 0.0)
    )
    return in_scale * 0.78 + cadence + qt_score


def detect_maqam_from_pitches(pitches: Sequence[int], limit: int = 3) -> tuple[DetectedMaqam, ...]:
    """Identify the best matching `(maqam, root)` candidates for a sequence of pitches."""
    if not pitches or limit <= 0:
        return ()
    counts = Counter(p % STEPS_PER_OCTAVE for p in pitches)
    anchors = (
        pitches[0] % STEPS_PER_OCTAVE,
        pitches[-1] % STEPS_PER_OCTAVE,
        min(pitches) % STEPS_PER_OCTAVE,
    )
    qt_pcs = {pc for pc in counts if pc % 2 == 1}
    scored: list[tuple[float, DetectedMaqam]] = []
    for maqam in MAQAMAT.values():
        for root in range(STEPS_PER_OCTAVE):
            raw_score = _score_candidate(maqam, root, counts, len(pitches), anchors, qt_pcs)
            confidence = max(1, min(99, round(raw_score * 100)))
            item = DetectedMaqam(
                maqam_id=maqam.id,
                maqam_name=maqam.name,
                arabic_name=maqam.arabic_name,
                root=root,
                root_name=_root_label(root),
                confidence=confidence,
                scale_pitches=ascending_octave(maqam, root, 96),
            )
            scored.append((raw_score, item))
    scored.sort(key=lambda pair: (-pair[0], pair[1].maqam_id, pair[1].root))
    return tuple(item for _, item in scored[:limit])
