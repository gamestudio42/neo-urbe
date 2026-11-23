import { useEffect, useState } from 'react';

const COARSE_POINTER = '(pointer: coarse)';

/** True when the primary pointer is a finger, not a mouse or trackpad. */
export function coarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(COARSE_POINTER).matches;
}

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(coarsePointer);
  useEffect(() => {
    const media = window.matchMedia(COARSE_POINTER);
    const update = () => setCoarse(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return coarse;
}
