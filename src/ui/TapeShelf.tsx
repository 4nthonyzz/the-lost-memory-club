import { useEffect, useRef, type KeyboardEvent } from 'react';
import './ui.css';
import { photoIdForTape, shelfTapeLabel, type DeckOption } from '../memories/storyFlow';
import { getFlowStrings } from './flowStrings';
import type { Language } from './preferences';
import { getUiStrings } from './strings';

export interface TapeShelfProps {
  language: Language;
  options: readonly DeckOption[];
  capturedPhotos?: readonly string[];
  onPick: (option: DeckOption) => void;
  onClose: () => void;
}

function labelFor(option: DeckOption, language: Language): string {
  const strings = getFlowStrings(language).shelf;
  switch (option.kind) {
    case 'pickup':
      return `${strings.pickup}: ${shelfTapeLabel(option.tapeId, language)}`;
    case 'box':
      return strings.box;
    case 'archive':
      return `${strings.archive}: ${strings.archiveLabel}`;
    case 'replay':
      return `${strings.replay}: ${shelfTapeLabel(option.tapeId, language)}`;
  }
}

function keyOf(option: DeckOption): string {
  return option.kind === 'pickup' || option.kind === 'replay' ? `${option.kind}:${option.tapeId}` : option.kind;
}

function tapeIdFor(option: DeckOption): string | null {
  return option.kind === 'pickup' || option.kind === 'replay' ? option.tapeId : null;
}

/** The shelf inside the deck, including the Polaroid state for every tape. */
export function TapeShelf({ language, options, capturedPhotos = [], onPick, onClose }: TapeShelfProps) {
  const strings = getFlowStrings(language).shelf;
  const closeLabel = getUiStrings(language).shell.deck.close;
  const firstRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const newOptions = options.filter((option) => option.kind !== 'replay');

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key.toLowerCase() !== 'e') return;
    const first = newOptions[0];
    if (!first) return;
    event.preventDefault();
    onPick(first);
  }

  return (
    <section className="deck-shelf" aria-labelledby="deck-shelf-title" lang={language} onKeyDown={onKeyDown}>
      <p className="eyebrow">{strings.heading}</p>
      <h2 id="deck-shelf-title">{strings.heading}</h2>
      <p className="deck-shelf__intro">{strings.intro}</p>
      {options.length === 0 ? (
        <p className="deck-shelf__empty">{strings.empty}</p>
      ) : (
        <ul className="deck-shelf__list">
          {options.map((option, index) => {
            const tapeId = tapeIdFor(option);
            const captured = tapeId !== null && capturedPhotos.includes(photoIdForTape(tapeId));
            return (
              <li key={keyOf(option)} className="deck-shelf__row">
                <button
                  ref={index === 0 ? firstRef : undefined}
                  type="button"
                  className={`deck-shelf__item deck-shelf__item--${option.kind}`}
                  onClick={() => onPick(option)}
                >
                  {labelFor(option, language)}
                </button>
                {tapeId !== null && (
                  <span className={`deck-shelf__polaroid${captured ? ' deck-shelf__polaroid--captured' : ''}`}>
                    {captured ? strings.polaroidCaptured : strings.polaroidPending}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="fineprint">{strings.keyHint}</p>
      <button type="button" className="secondary" onClick={onClose}>
        {closeLabel}
      </button>
    </section>
  );
}
