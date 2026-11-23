import { describe, expect, it } from 'vitest';
import { de } from '../../apps/web/src/i18n/de';
import { en } from '../../apps/web/src/i18n/en';
import { es } from '../../apps/web/src/i18n/es';
import { fr } from '../../apps/web/src/i18n/fr';
import { ptBR } from '../../apps/web/src/i18n/pt-BR';
import { matchLocale, resolveLocale } from '../../apps/web/src/i18n';

const CATALOGS = [en, ptBR, es, fr, de];
const SHORTCUT = /\([A-Za-z0-9]\)/;

describe('resolveLocale', () => {
  it('keeps a stored catalog code', () => {
    expect(resolveLocale({ stored: 'es', languages: ['en'] })).toBe('es');
    expect(resolveLocale({ stored: 'pt-BR', languages: ['de'] })).toBe('pt-BR');
  });

  it('maps browser tags onto catalogs, ignoring region', () => {
    expect(resolveLocale({ stored: null, languages: ['pt-PT'] })).toBe('pt-BR');
    expect(resolveLocale({ stored: null, languages: ['es-MX'] })).toBe('es');
    expect(resolveLocale({ stored: null, languages: ['en-GB'] })).toBe('en');
    expect(resolveLocale({ stored: null, languages: ['fr-CA'] })).toBe('fr');
    expect(resolveLocale({ stored: null, languages: ['de-AT'] })).toBe('de');
  });

  it('falls back to English when nothing matches', () => {
    expect(resolveLocale({ stored: null, languages: ['ja'] })).toBe('en');
    expect(resolveLocale({ stored: null, languages: [] })).toBe('en');
  });

  it('ignores an invalid stored key and uses the browser list', () => {
    expect(resolveLocale({ stored: 'xx', languages: ['fr-FR'] })).toBe('fr');
    expect(resolveLocale({ stored: 'portuguese', languages: ['ja'] })).toBe('en');
  });
});

describe('touch copy', () => {
  it('describes gestures and leaves keyboard shortcuts out', () => {
    for (const catalog of CATALOGS) {
      expect(catalog.system.helpTouch).not.toMatch(SHORTCUT);
      expect(catalog.hud.pausedHintTouch).not.toMatch(SHORTCUT);
      for (const step of catalog.tutorial.steps) {
        expect(step.touch.length).toBeGreaterThan(0);
        expect(step.touch).not.toMatch(SHORTCUT);
      }
    }
    expect(ptBR.tutorial.steps[0]?.touch).toMatch(/um dedo/);
    expect(ptBR.tutorial.steps[0]?.touch).toMatch(/zoom/);
    expect(en.tutorial.steps[0]?.text).toMatch(/mouse wheel/);
  });
});

describe('matchLocale', () => {
  it('accepts Portuguese in any region as pt-BR', () => {
    expect(matchLocale('pt')).toBe('pt-BR');
    expect(matchLocale('pt-BR')).toBe('pt-BR');
    expect(matchLocale('pt_PT')).toBe('pt-BR');
  });

  it('returns null for unknown languages', () => {
    expect(matchLocale('ja')).toBeNull();
    expect(matchLocale('zh-CN')).toBeNull();
  });
});
