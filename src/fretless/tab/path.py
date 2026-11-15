"""Choose one placement per event so the whole piece is cheapest: Viterbi over events."""

from collections.abc import Sequence
from itertools import pairwise

from fretless.tab.costs import hand_position, move_cost, shift_cost
from fretless.tab.options import Option

# A state is (option index, hand position after the event); the hand position carries
# across all-open events. Value: (total cost so far, previous state).
type _State = tuple[int, int | None]
type _Layer = dict[_State, tuple[int, _State | None]]


def _order(state: _State) -> tuple[int, int]:
    return state[0], -1 if state[1] is None else state[1]


def _rank(entry: tuple[int, _State | None]) -> tuple[int, ...]:
    cost, previous = entry
    return (cost, *_order(previous)) if previous else (cost,)


def _first(step: tuple[Option, ...]) -> _Layer:
    return {(j, hand_position(o.notes)): (o.cost, None) for j, o in enumerate(step)}


def _next(before: _Layer, steps: tuple[Option, ...], previous: tuple[Option, ...]) -> _Layer:
    layer: _Layer = {}
    for (i, hand), (cost, _) in before.items():
        for j, option in enumerate(steps):
            new_hand = hand_position(option.notes)
            total = (
                cost
                + option.cost
                + shift_cost(hand, new_hand)
                + move_cost(previous[i].notes, option.notes)
            )
            state = (j, hand if new_hand is None else new_hand)
            entry = (total, (i, hand))
            if state not in layer or _rank(entry) < _rank(layer[state]):
                layer[state] = entry
    return layer


def best_path(steps: Sequence[tuple[Option, ...]]) -> tuple[Option, ...]:
    """One option per step, minimising local, hand-shift and course-jump costs in total.

    Ties resolve to the earlier option, so the result is deterministic.
    """
    if not steps:
        return ()
    layers = [_first(steps[0])]
    for before, step in pairwise(steps):
        layers.append(_next(layers[-1], step, before))
    state = min(layers[-1], key=lambda s: (layers[-1][s][0], *_order(s)))
    chosen = [state]
    for layer in reversed(layers[1:]):
        chosen.append(layer[chosen[-1]][1] or chosen[-1])
    return tuple(steps[n][s[0]] for n, s in enumerate(reversed(chosen)))
