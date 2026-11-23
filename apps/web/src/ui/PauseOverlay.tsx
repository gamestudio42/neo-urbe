import { PauseOverlay as ChromePause, useStore } from '@shell/chrome';
import { useStrings } from '../i18n';
import type { GameSession } from '../state/session';
import { useCoarsePointer } from './coarsePointer';

/** Paused state: a soft vignette and a badge. Purely visual, the map stays interactive. */
export function PauseOverlay({ session }: { session: GameSession }) {
  const t = useStrings(session.ui);
  const coarse = useCoarsePointer();
  const paused = useStore(session.ui, (s) => s.speed === 0);
  return (
    <ChromePause
      paused={paused}
      title={t.hud.paused}
      hint={coarse ? t.hud.pausedHintTouch : t.hud.pausedHint}
    />
  );
}
