import { describe, expect, it } from 'vitest';
import {
  TAP_SLOP_PX,
  createTouchGesture,
  touchDown,
  touchMove,
  touchUp,
} from '../../packages/view-city/src/touchGestures';

describe('touch camera gestures', () => {
  it('treats a short press as a tap and does not pan', () => {
    const gesture = createTouchGesture();
    expect(touchDown(gesture, 1, 20, 40)).toEqual({ kind: 'hover', x: 20, y: 40 });
    expect(touchMove(gesture, 1, 24, 43)).toEqual({ kind: 'hover', x: 24, y: 43 });
    expect(touchUp(gesture, 1, 24, 43, false)).toEqual({ kind: 'tap', x: 24, y: 43 });
    expect(gesture.phase).toBe('idle');
  });

  it('pans once the finger leaves the tap slop, and does not place on release', () => {
    const gesture = createTouchGesture();
    touchDown(gesture, 1, 0, 0);
    expect(touchMove(gesture, 1, TAP_SLOP_PX - 1, 0).kind).toBe('hover');
    expect(touchMove(gesture, 1, 30, 4)).toEqual({ kind: 'pan', dx: 30, dy: 4 });
    expect(touchMove(gesture, 1, 40, 9)).toEqual({ kind: 'pan', dx: 10, dy: 5 });
    expect(touchUp(gesture, 1, 40, 9, false)).toEqual({ kind: 'ignore' });
  });

  it('zooms from the pinch centre and does not tap when the fingers lift', () => {
    const gesture = createTouchGesture();
    touchDown(gesture, 1, 0, 0);
    expect(touchDown(gesture, 2, 100, 0)).toEqual({ kind: 'ignore' });
    expect(touchMove(gesture, 2, 200, 0)).toEqual({
      kind: 'pinch',
      dx: 50,
      dy: 0,
      factor: 2,
      x: 100,
      y: 0,
    });
    expect(touchUp(gesture, 1, 0, 0, false)).toEqual({ kind: 'ignore' });
    expect(gesture.phase).toBe('pan');
    expect(touchUp(gesture, 2, 200, 0, false)).toEqual({ kind: 'ignore' });
    expect(gesture.phase).toBe('idle');
  });

  it('lets the finger that remains after a pinch pan without a jump', () => {
    const gesture = createTouchGesture();
    touchDown(gesture, 1, 10, 10);
    touchDown(gesture, 2, 80, 10);
    touchUp(gesture, 2, 80, 10, false);
    expect(touchMove(gesture, 1, 10, 10)).toEqual({ kind: 'ignore' });
    expect(touchMove(gesture, 1, 18, 16)).toEqual({ kind: 'pan', dx: 8, dy: 6 });
  });

  it('does not place when a second finger arrives or the pointer is cancelled', () => {
    const pending = createTouchGesture();
    touchDown(pending, 1, 5, 5);
    touchDown(pending, 2, 40, 5);
    expect(touchUp(pending, 1, 5, 5, false).kind).not.toBe('tap');
    expect(touchUp(pending, 2, 40, 5, false).kind).not.toBe('tap');

    const lost = createTouchGesture();
    touchDown(lost, 7, 3, 3);
    expect(touchUp(lost, 7, 3, 3, true)).toEqual({ kind: 'ignore' });
  });
});
