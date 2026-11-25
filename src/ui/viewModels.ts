import type { JournalEntryKind } from './strings';

export type EndingSceneId = 'bittersweet-dawn' | 'forever-1998' | 'archivists-truth';

export interface JournalEntryView {
  id: string;
  kind: JournalEntryKind;
  title: string;
  caption: string;
  text: string;
}

export interface AtmosphereView {
  stageLabel: string;
  distortion: number;
  headline: string;
  whispers: readonly string[];
  nextObjective: string;
}

export interface EndingView {
  id: EndingSceneId;
  title: string;
  choiceLabel: string;
  text: string;
}
