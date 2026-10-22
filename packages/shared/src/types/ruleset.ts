/** Which set of rules a simulation runs. `classic` is Urbe; `neon` adds the cyberpunk systems. */
export type Ruleset = 'classic' | 'neon';

export const RULESETS: readonly Ruleset[] = ['classic', 'neon'];

export function isRuleset(value: unknown): value is Ruleset {
  return value === 'classic' || value === 'neon';
}

/** The ruleset a save or snapshot uses; missing means `classic` (pre-ruleset saves). */
export function rulesetOf(value: unknown): Ruleset {
  return isRuleset(value) ? value : 'classic';
}
