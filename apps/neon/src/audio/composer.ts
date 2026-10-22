import type { Random } from '@view/city';

/**
 * Synthwave composer for Neo Urbe. Pure: no WebAudio, so the rules are unit tested.
 *
 * The shape mirrors the Urbe composer (one bar at a time, notes in MIDI, times in beats) but the
 * mood is different: natural minor, 100-110 bpm, a pumping eighth-note bass, a wide detuned pad,
 * a reverb lead hook on the second half of the bar and a gated snare on every backbeat.
 */

export type TrackId = 'menu' | 'city';
export type VoiceId = 'bass' | 'pad' | 'lead' | 'arp';

export interface Chord {
  /** Chord root in semitones above the key root. */
  root: number;
  /** Chord tones above the chord root (0 = root). */
  tones: readonly number[];
}

export interface TrackSpec {
  id: TrackId;
  bpm: number;
  /** Pitch class of the key root (0 = C). */
  key: number;
  /** Melody scale in semitones above the key root. */
  scale: readonly number[];
  /** One chord per bar, looped. */
  progression: readonly Chord[];
  /** Chance an eighth-note slot starts a lead note. */
  leadDensity: number;
  /** Chance an eighth-note slot starts an arpeggio note. */
  arpDensity: number;
  /** Backbeat gate: how long the snare burst lasts, in beats. */
  gate: number;
}

export interface NoteEvent {
  voice: VoiceId;
  midi: number;
  /** Start, in beats from the bar start. */
  beat: number;
  /** Length in beats. */
  duration: number;
  /** Velocity 0..1. */
  velocity: number;
}

export const BEATS_PER_BAR = 4;
/** Eighth notes per bar. */
const EIGHTHS = 8;
/** Natural minor: the synthwave default. */
const MINOR = [0, 2, 3, 5, 7, 8, 10] as const;

const CHORD = (...tones: number[]): Chord => ({ root: tones[0] as number, tones });

/** i - VI - III - VII in A minor: the classic synthwave loop. */
const MINOR_LOOP: readonly Chord[] = [
  CHORD(0, 3, 7),
  CHORD(8, 12, 15),
  CHORD(3, 7, 10),
  CHORD(10, 14, 17),
];

export const TRACKS: Record<TrackId, TrackSpec> = {
  menu: {
    id: 'menu',
    bpm: 100,
    key: 9,
    scale: MINOR,
    progression: MINOR_LOOP,
    leadDensity: 0.22,
    arpDensity: 0.5,
    gate: 0.5,
  },
  city: {
    id: 'city',
    bpm: 108,
    key: 4,
    scale: MINOR,
    progression: MINOR_LOOP,
    leadDensity: 0.3,
    arpDensity: 0.7,
    gate: 0.4,
  },
};

/** 440 Hz at MIDI 69, equal temperament. */
export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Picks a scale tone near `octaveStart`, biased to chord tones on strong beats. */
function pickTone(
  random: Random,
  spec: TrackSpec,
  chord: Chord,
  octave: number,
  strong: boolean,
): number {
  const root = spec.key + chord.root + octave * 12;
  if (strong) {
    const tone = chord.tones[Math.min(chord.tones.length - 1, Math.floor(random() * chord.tones.length))] as number;
    return root + tone;
  }
  const degree = spec.scale[Math.min(spec.scale.length - 1, Math.floor(random() * spec.scale.length))] as number;
  return spec.key + chord.root + octave * 12 + degree;
}

/**
 * One bar of notes. Deterministic for a given `random` stream, so a unit test can assert the
 * groove and a reload of the same seed sounds identical.
 */
export function composeBar(spec: TrackSpec, bar: number, random: Random): NoteEvent[] {
  const chord = spec.progression[bar % spec.progression.length] as Chord;
  const notes: NoteEvent[] = [];
  const rootMidi = spec.key + chord.root - 12;

  // Bass: an eighth-note pulse on the root, an octave lift on the last eighth for the lift.
  for (let step = 0; step < EIGHTHS; step++) {
    const beat = step / 2;
    const lift = step === EIGHTHS - 1 ? 12 : 0;
    notes.push({
      voice: 'bass',
      midi: rootMidi + lift,
      beat,
      duration: 0.45,
      velocity: step % 2 === 0 ? 0.9 : 0.62,
    });
  }

  // Pad: a held triad across the bar, voiced an octave above the bass.
  for (const tone of chord.tones) {
    notes.push({
      voice: 'pad',
      midi: spec.key + chord.root + tone,
      beat: 0,
      duration: BEATS_PER_BAR,
      velocity: 0.5,
    });
  }

  // Arpeggio: high chord tones on the off-beats.
  for (let step = 0; step < EIGHTHS; step++) {
    if (random() >= spec.arpDensity) continue;
    const tone = chord.tones[Math.min(chord.tones.length - 1, Math.floor(random() * chord.tones.length))] as number;
    notes.push({
      voice: 'arp',
      midi: spec.key + chord.root + tone + 24,
      beat: step / 2,
      duration: 0.35,
      velocity: 0.32,
    });
  }

  // Lead: sparse, mostly on the second half of the bar.
  for (let step = 4; step < EIGHTHS; step++) {
    if (random() >= spec.leadDensity) continue;
    notes.push({
      voice: 'lead',
      midi: pickTone(random, spec, chord, 1, step % 2 === 0),
      beat: step / 2,
      duration: 0.9,
      velocity: 0.4,
    });
  }
  return notes;
}

/** Deterministic bar length in seconds. */
export function barSeconds(spec: TrackSpec): number {
  return (BEATS_PER_BAR * 60) / spec.bpm;
}
