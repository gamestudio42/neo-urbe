import {
  BEATS_PER_BAR,
  TRACKS,
  barSeconds,
  composeBar,
  midiToHz,
  type NoteEvent,
} from '../../apps/neon/src/audio/composer';
import { describe, expect, it } from 'vitest';

/** Small deterministic PRNG so the composer's randomness is reproducible in tests. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const voices = (notes: NoteEvent[], voice: string) => notes.filter((n) => n.voice === voice);

describe('neon synthwave composer', () => {
  it('keeps every note inside the bar', () => {
    for (const spec of Object.values(TRACKS)) {
      for (let bar = 0; bar < 8; bar++) {
        for (const note of composeBar(spec, bar, seeded(bar + 1))) {
          expect(note.beat).toBeGreaterThanOrEqual(0);
          expect(note.beat).toBeLessThan(BEATS_PER_BAR);
          expect(note.duration).toBeGreaterThan(0);
          expect(note.velocity).toBeGreaterThan(0);
          expect(note.velocity).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('lays down a pumping eighth-note bass on every bar', () => {
    const notes = composeBar(TRACKS.city, 0, seeded(7));
    const bass = voices(notes, 'bass');
    expect(bass).toHaveLength(8);
    // Strong beats are louder than the off-beats: that is the pump.
    expect(bass[0]?.velocity).toBeGreaterThan(bass[1]?.velocity ?? 0);
    // The last eighth lifts an octave.
    expect(bass[7]?.midi).toBe((bass[0]?.midi ?? 0) + 12);
  });

  it('holds a pad triad across the whole bar', () => {
    const notes = composeBar(TRACKS.menu, 0, seeded(3));
    const pad = voices(notes, 'pad');
    expect(pad).toHaveLength(3);
    for (const note of pad) {
      expect(note.beat).toBe(0);
      expect(note.duration).toBe(BEATS_PER_BAR);
    }
  });

  it('only starts lead notes in the second half of the bar', () => {
    for (let bar = 0; bar < 12; bar++) {
      const lead = voices(composeBar(TRACKS.city, bar, seeded(bar)), 'lead');
      for (const note of lead) expect(note.beat).toBeGreaterThanOrEqual(BEATS_PER_BAR / 2);
    }
  });

  it('loops the progression every four bars', () => {
    const spec = TRACKS.menu;
    for (let bar = 0; bar < 4; bar++) {
      const first = composeBar(spec, bar, seeded(11));
      const second = composeBar(spec, bar + spec.progression.length, seeded(11));
      expect(first).toEqual(second);
    }
  });

  it('is deterministic for the same random stream', () => {
    expect(composeBar(TRACKS.city, 3, seeded(42))).toEqual(composeBar(TRACKS.city, 3, seeded(42)));
  });

  it('produces different bars from different streams', () => {
    const a = composeBar(TRACKS.city, 0, seeded(1));
    const b = composeBar(TRACKS.city, 0, seeded(9999));
    expect(a).not.toEqual(b);
  });

  it('stays inside the synthwave tempo range', () => {
    for (const spec of Object.values(TRACKS)) {
      expect(spec.bpm).toBeGreaterThanOrEqual(100);
      expect(spec.bpm).toBeLessThanOrEqual(110);
      expect(barSeconds(spec)).toBeGreaterThan(2);
      expect(barSeconds(spec)).toBeLessThan(2.5);
    }
  });

  it('tunes A4 to 440 Hz and octaves to double', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 5);
    expect(midiToHz(81)).toBeCloseTo(880, 5);
    expect(midiToHz(57)).toBeCloseTo(220, 5);
  });

  it('maps note velocities to a mixable range', () => {
    const notes = composeBar(TRACKS.city, 1, seeded(5));
    for (const note of notes) expect(note.velocity).toBeLessThanOrEqual(1);
    expect(notes.some((n) => n.velocity > 0.8)).toBe(true);
  });
});
