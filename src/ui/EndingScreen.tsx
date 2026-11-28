import { useEffect, useId, useRef } from 'react';
import './ui.css';
import { CrtCorruptionOverlay } from './CrtCorruptionOverlay';
import { drawEnding, ENDING_HEIGHT, ENDING_WIDTH } from './endingScenes';
import { getFlowStrings } from './flowStrings';
import type { Language } from './preferences';
import { getUiStrings, type UiStrings } from './strings';
import type { EndingSceneId, EndingView } from './viewModels';

export interface EndingScreenProps {
  language: Language;
  reducedDistortion: boolean;
  endings: readonly EndingView[];
  /** The ending the player already chose. When set, its scene replaces the choice list. */
  chosenId: EndingSceneId | null;
  /** Readable descriptions of what the secret ending still needs. Empty when all is done. */
  secretMissing?: readonly string[];
  onChosen: (id: EndingSceneId) => void;
  /** Called from the scene's button. The member card opens only after this. */
  onFinish: () => void;
}

const CORRUPTION_BY_ENDING: Record<EndingSceneId, number> = {
  'bittersweet-dawn': 0,
  'forever-1998': 0.35,
  'archivists-truth': 0.6,
};

function captionFor(id: EndingSceneId, strings: UiStrings['endings']): string {
  switch (id) {
    case 'bittersweet-dawn':
      return strings.dawnStamp;
    case 'forever-1998':
      return strings.frozenStamp;
    case 'archivists-truth':
      return strings.archiveReady;
  }
}

interface EndingCanvasProps {
  id: EndingSceneId;
  caption: string;
  reducedDistortion: boolean;
}

function EndingCanvas({ id, caption, reducedDistortion }: EndingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return undefined;
    if (reducedDistortion) {
      drawEnding(context, id, 0, true, caption);
      return undefined;
    }
    const start = performance.now();
    let frameId = 0;
    const loop = (now: number) => {
      drawEnding(context, id, (now - start) / 1000, false, caption);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [id, caption, reducedDistortion]);

  return <canvas ref={canvasRef} className="ending__canvas" width={ENDING_WIDTH} height={ENDING_HEIGHT} aria-hidden="true" />;
}

export function EndingScreen({ language, reducedDistortion, endings, chosenId, secretMissing = [], onChosen, onFinish }: EndingScreenProps) {
  const strings = getUiStrings(language).endings;
  const flow = getFlowStrings(language).endings;
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const chosen = chosenId === null ? null : endings.find((ending) => ending.id === chosenId) ?? null;
  const secretUnlocked = endings.some((ending) => ending.id === 'archivists-truth');

  useEffect(() => {
    headingRef.current?.focus();
  }, [chosen?.id]);

  if (chosen) {
    return (
      <section className={`ending ending--${chosen.id}`} aria-labelledby={headingId} lang={language}>
        <div className="ending__stage">
          <EndingCanvas id={chosen.id} caption={captionFor(chosen.id, strings)} reducedDistortion={reducedDistortion} />
          <CrtCorruptionOverlay level={CORRUPTION_BY_ENDING[chosen.id]} reducedDistortion={reducedDistortion} />
        </div>
        <h2 id={headingId} ref={headingRef} tabIndex={-1}>
          {chosen.title}
        </h2>
        <p className="ending__text">{chosen.text}</p>
        <button type="button" className="ending__button" onClick={onFinish}>
          {flow.continue}
        </button>
      </section>
    );
  }

  return (
    <section className="ending ending--choice" aria-labelledby={headingId} lang={language}>
      <h2 id={headingId} ref={headingRef} tabIndex={-1}>
        {strings.heading}
      </h2>
      {endings.length === 0 ? (
        <p className="ending__text">{strings.unavailable}</p>
      ) : (
        <>
          <p className="ending__text">{strings.intro}</p>
          {secretUnlocked && (
            <p className="ending__secret" role="status">
              {strings.secretUnlocked}
            </p>
          )}
          <ul className="ending__choices">
            {endings.map((ending) => (
              <li key={ending.id}>
                <button type="button" className={`ending__choice ending__choice--${ending.id}`} onClick={() => onChosen(ending.id)}>
                  <span className="ending__choice-label">{ending.choiceLabel}</span>
                  <span className="ending__choice-title">{ending.title}</span>
                  {ending.id === 'archivists-truth' && <span className="ending__badge">{strings.newBadge}</span>}
                </button>
              </li>
            ))}
            {secretMissing.length > 0 && (
              <li>
                <div className="ending__choice ending__choice--locked" aria-disabled="true">
                  <span className="ending__choice-label ending__choice-label--locked">{flow.lockedName}</span>
                  <span className="ending__choice-title">
                    {flow.missingPrefix}
                    {secretMissing.join(', ')}
                  </span>
                </div>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
