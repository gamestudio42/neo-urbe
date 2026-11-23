/** Movement inside this radius, in CSS pixels, stays a tap. Past it, one finger pans. */
export const TAP_SLOP_PX = 10;

export interface GesturePointer {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
}

export type GesturePhase = 'idle' | 'pending' | 'pan' | 'pinch';

/** Mutable tracker for one canvas. Mouse and pen input never goes through it. */
export interface TouchGesture {
  phase: GesturePhase;
  pointers: GesturePointer[];
  anchorX: number;
  anchorY: number;
  pinchDist: number;
  pinchX: number;
  pinchY: number;
}

export type GestureAction =
  | { kind: 'ignore' }
  | { kind: 'hover'; x: number; y: number }
  | { kind: 'pan'; dx: number; dy: number }
  | { kind: 'pinch'; dx: number; dy: number; factor: number; x: number; y: number }
  | { kind: 'tap'; x: number; y: number };

export function createTouchGesture(): TouchGesture {
  return {
    phase: 'idle',
    pointers: [],
    anchorX: 0,
    anchorY: 0,
    pinchDist: 0,
    pinchX: 0,
    pinchY: 0,
  };
}

export function resetTouchGesture(gesture: TouchGesture): void {
  gesture.phase = 'idle';
  gesture.pointers = [];
  gesture.pinchDist = 0;
}

function pastSlop(dx: number, dy: number): boolean {
  return dx * dx + dy * dy >= TAP_SLOP_PX * TAP_SLOP_PX;
}

function pinchOf(pointers: GesturePointer[]): { dist: number; x: number; y: number } | null {
  const a = pointers[0];
  const b = pointers[1];
  if (!a || !b) return null;
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y),
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function rememberPinch(gesture: TouchGesture): void {
  const pinch = pinchOf(gesture.pointers);
  if (!pinch) return;
  gesture.pinchDist = pinch.dist;
  gesture.pinchX = pinch.x;
  gesture.pinchY = pinch.y;
}

export function touchDown(gesture: TouchGesture, id: number, x: number, y: number): GestureAction {
  if (gesture.pointers.some((pointer) => pointer.id === id)) return { kind: 'ignore' };
  gesture.pointers.push({ id, x, y, startX: x, startY: y });
  if (gesture.pointers.length === 1) {
    gesture.phase = 'pending';
    gesture.anchorX = x;
    gesture.anchorY = y;
    return { kind: 'hover', x, y };
  }
  gesture.phase = 'pinch';
  rememberPinch(gesture);
  return { kind: 'ignore' };
}

export function touchMove(gesture: TouchGesture, id: number, x: number, y: number): GestureAction {
  const pointer = gesture.pointers.find((item) => item.id === id);
  if (!pointer) return { kind: 'ignore' };
  pointer.x = x;
  pointer.y = y;

  if (gesture.phase === 'pinch') {
    const pinch = pinchOf(gesture.pointers);
    if (!pinch) return { kind: 'ignore' };
    const dx = pinch.x - gesture.pinchX;
    const dy = pinch.y - gesture.pinchY;
    const factor = gesture.pinchDist >= 1 && pinch.dist >= 1 ? pinch.dist / gesture.pinchDist : 1;
    gesture.pinchDist = pinch.dist;
    gesture.pinchX = pinch.x;
    gesture.pinchY = pinch.y;
    if (dx === 0 && dy === 0 && factor === 1) return { kind: 'ignore' };
    return { kind: 'pinch', dx, dy, factor, x: pinch.x, y: pinch.y };
  }

  if (gesture.phase === 'pending') {
    const dx = x - pointer.startX;
    const dy = y - pointer.startY;
    if (!pastSlop(dx, dy)) return { kind: 'hover', x, y };
    gesture.phase = 'pan';
    gesture.anchorX = x;
    gesture.anchorY = y;
    return { kind: 'pan', dx, dy };
  }

  if (gesture.phase === 'pan') {
    const dx = x - gesture.anchorX;
    const dy = y - gesture.anchorY;
    gesture.anchorX = x;
    gesture.anchorY = y;
    if (dx === 0 && dy === 0) return { kind: 'ignore' };
    return { kind: 'pan', dx, dy };
  }

  return { kind: 'ignore' };
}

/** `cancel` drops a pending tap (the pointer was lost, not lifted). */
export function touchUp(
  gesture: TouchGesture,
  id: number,
  x: number,
  y: number,
  cancel: boolean,
): GestureAction {
  const index = gesture.pointers.findIndex((pointer) => pointer.id === id);
  if (index < 0) return { kind: 'ignore' };
  const pointer = gesture.pointers[index];
  if (!pointer) return { kind: 'ignore' };
  pointer.x = x;
  pointer.y = y;
  const phase = gesture.phase;
  gesture.pointers.splice(index, 1);

  if (gesture.pointers.length === 0) {
    gesture.phase = 'idle';
    gesture.pinchDist = 0;
    if (!cancel && phase === 'pending') return { kind: 'tap', x: pointer.x, y: pointer.y };
    return { kind: 'ignore' };
  }

  if (gesture.pointers.length === 1) {
    const rest = gesture.pointers[0];
    gesture.phase = 'pan';
    if (rest) {
      gesture.anchorX = rest.x;
      gesture.anchorY = rest.y;
    }
    return { kind: 'ignore' };
  }

  gesture.phase = 'pinch';
  rememberPinch(gesture);
  return { kind: 'ignore' };
}
