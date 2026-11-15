# Glossary

Terms as used in this codebase. Code names follow these.

| Term | Meaning |
| --- | --- |
| Oud | Fretless short-necked lute. Here: 6 courses. |
| Course | A pair of strings tuned in unison and played as one (the lowest course may be single). The oud equivalent of a guitar "string". Numbered 1 (highest) to 6 (lowest). |
| Tuning | Open pitch of each course. Stored from course 1 (highest) to course 6 (lowest). |
| C-C tuning | C2 F2 A2 D3 G3 C4. |
| F-F tuning | F2 A2 D3 G3 C4 F4. |
| Step | One quarter tone. 24 steps per octave. The unit of all pitch arithmetic. |
| Pitch | Integer number of steps above C0. C4 = 96. |
| Location | One spot on the neck: a course number and a position. |
| Position | Distance of a stopped note from the nut along one course, in steps. 0 is open. A guitar fret n equals position 2n. |
| Virtual fret | Position shown guitar-style: position / 2, so quarter tones read as 1.5, 2.5. |
| Neck range | Playable positions per course: about a fifth, and an octave on course 1. |
| Snap | Rounding a continuous click on the neck to the nearest step. |
| Maqam (pl. maqamat) | Arabic melodic mode: a scale with characteristic intervals, often including quarter tones. |
| Jins (pl. ajnas) | 3 to 5 note building block from which maqamat are assembled. Planned, not in version 1. |
| Pitch class | A pitch modulo 24: the note regardless of octave (0..23, C = 0). |
| Letter | The natural note name C D E F G A B used in spelling a note. |
| Alter | Steps a note sits away from its natural letter: -2 flat, -1 half-flat, +1 half-sharp, +2 sharp. |
| Degree | Position of a note within a scale, 1 to 7 counted from the root. |
| Root | The pitch a maqam or chord is built on. |
| Half-flat | A note lowered by one step (a quarter tone). |
| Solfege names | Do Re Mi Fa Sol La Si, the alternative to C D E F G A B for display. |
| Voicing | A playable set of 2 to 4 oud notes sounding a chord, one per course on adjacent courses, listed lowest course first. It must hold the root and the colour tone (third, else second or fourth, else fifth), and the seventh when it has 3 or more notes. Stopped notes fit a span of 8 steps (4 guitar frets) and 3 fingers; adjacent courses stopped at one position count as one barred finger. Positions stay at 14 or below. Ranked best first: root in the bass, then more notes, lower highest position, more open courses, smaller span. |
| Chord tones | Every position on the neck whose pitch class belongs to a chord. |
| Chord quality | The kind of chord: major, minor, 7, maj7, m7, dim, aug, sus2, sus4, 5, 6, m6, dim7, m7b5, add9, 9. Each has a symbol shown after the root and a fixed set of tones in semitones above the root. Chords are 12-tone, so every tone is an even number of steps from the root. |
| Chord tone / role | A note of a chord and its job: root, second, third, fourth, fifth, sixth, seventh or ninth. The degree (1 to 7) decides which letter spells it; a ninth is spelled as a second. |
| Colour tone | The tone that tells a chord's kind: the third, else the second or fourth (sus chords), else the fifth (power chord). A reduced voicing must keep it. |
| Shape (guitar) | What the left hand holds on a guitar: one fret number or mute per string, read from string 1. Fret numbers count from the capo, as in chord charts and tab. One fret is 2 steps. |
| String (guitar) | One guitar string, numbered 1 (highest) to 6 (lowest). The guitar counterpart of an oud course. |
| Capo | A bar clamped across the guitar neck that raises every string, open or fretted, by its fret number. Fret numbers are counted from it. |
| Arpeggio | The chord tones played one at a time upward, from the lowest root on the instrument to the root an octave above. |
| Span | Steps between the lowest and highest stopped position of a voicing. Open courses do not count. |
| Tab | Tablature: one text line per string or course, numbers for positions. |
| Risha | The oud plectrum. |
| System (tab) | A run of 4 to 7 consecutive tab lines read as one staff: one line per string, with its labels, bar positions and columns. |
| Line (tab) | One row of a system, numbered 1 (top, highest string or course) to the last (lowest). Starts with an optional label and a bar. |
| Column (tab) | The notes that start at the same character index of a system: one note for a single pitch, several for a chord. A two-digit fret counts at its first digit. |
| Bar | A `\|` in tab content, kept as its character offset. Not a pitch. |
| Cell | The text printed for one note when rendering tab, such as `3`, `12`, `1.5` or a note name. Wider cells push later text right in every line so columns stay aligned. |
| Text block | Lines of pasted text that are not tab (titles, chord names, lyrics, blank lines), kept verbatim and in order beside the systems. |
