import type { GameState } from '../../core/contracts';
import type { Language } from '../i18n';
import { evaluateNarrativeState, narrativeFor, type ExtraProgress } from './narrativeEvaluator';
import {
  localizeAtmosphere,
  localizeEndings,
  localizeFragment,
  type LocalizedAtmosphere,
  type LocalizedEnding,
} from './narrativeText';

export type JournalEntryKind = 'memory' | 'clue' | 'archive' | 'truth';

export interface JournalEntryModel {
  id: string;
  kind: JournalEntryKind;
  title: string;
  caption: string;
  text: string;
}

export interface JournalModel {
  entries: JournalEntryModel[];
  totalEntries: number;
  atmosphere: LocalizedAtmosphere;
  endings: LocalizedEnding[];
}

function kindOf(id: string): JournalEntryKind {
  if (id.endsWith(':clue')) return 'clue';
  if (id.endsWith(':truth')) return 'truth';
  return id.startsWith('archive-') ? 'archive' : 'memory';
}

export function buildJournalModel(gameState: GameState, extraProgress: ExtraProgress, language: Language): JournalModel {
  const narrative = evaluateNarrativeState(gameState, extraProgress);
  return {
    entries: narrative.fragments.map((fragment) => {
      const localized = localizeFragment(fragment, language);
      return { id: localized.id, kind: kindOf(localized.id), title: localized.title, caption: localized.caption, text: localized.text };
    }),
    totalEntries: narrative.totalFragments,
    atmosphere: localizeAtmosphere(narrativeFor(gameState), language),
    endings: localizeEndings(narrative.unlockedEndings, language),
  };
}
