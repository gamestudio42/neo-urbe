import { BootView as ChromeBootView, prefersReducedMotion, useStore } from '@shell/chrome';
import { useEffect, useState } from 'react';
import { catalog, type Locale } from '../i18n';
import type { BootState, GameSession } from '../state/session';
import { BrandLogo } from './Logo';

const FADE_MS = 300;

/** Loading screen shown until the renderer and the menu city are ready, then faded out. */
export function BootScreen({ session }: { session: GameSession }) {
  const locale = useStore(session.ui, (s) => s.locale);
  const boot = useStore(session.ui, (s) => s.boot);
  const [gone, setGone] = useState(false);
  const done = boot.step === 'done';

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setGone(true), prefersReducedMotion() ? 0 : FADE_MS);
    return () => clearTimeout(timer);
  }, [done]);

  if (gone) return null;
  return <BootView boot={boot} leaving={done} locale={locale} />;
}

export function BootView({
  boot,
  leaving = false,
  locale = 'en',
}: {
  boot: BootState;
  leaving?: boolean;
  locale?: Locale;
}) {
  const t = catalog(locale);
  return (
    <ChromeBootView
      stepLabel={t.boot[boot.step]}
      progress={boot.progress}
      leaving={leaving}
      step={boot.step}
    >
      <BrandLogo locale={locale ?? 'en'} size={96} />
    </ChromeBootView>
  );
}
