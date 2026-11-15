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
| Voicing | A specific playable set of course/position pairs sounding a chord, 2 to 4 notes. |
| Chord tones | Every position on the neck whose pitch class belongs to a chord. |
| Tab | Tablature: one text line per string or course, numbers for positions. |
| Risha | The oud plectrum. |
