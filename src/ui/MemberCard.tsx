import './ui.css';
import { getFlowStrings } from './flowStrings';
import type { Language } from './preferences';
import type { MemberTitleKey } from '../core/progression';

export interface MemberCardProps {
  language: Language;
  /** Title chosen from the ending and the player's actions. Null when no ending was chosen. */
  titleKey: MemberTitleKey | null;
  polaroidCount: number;
  arcadeCount: number;
  /** Seconds from the start of the run to the chosen ending, or null when unknown. */
  playSeconds: number | null;
  onPower: () => void;
  onClose: () => void;
}

function formatTime(seconds: number | null, noTime: string): string {
  if (seconds === null) return noTime;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function MemberCard({ language, titleKey, polaroidCount, arcadeCount, playSeconds, onPower, onClose }: MemberCardProps) {
  const strings = getFlowStrings(language).member;
  const title = titleKey === null ? '' : strings.titles[titleKey];

  return (
    <section className="member-card" aria-label={language === 'es' ? 'Credencial de socio' : 'Member card'} lang={language}>
      <div className="member-card__band" aria-hidden="true" />
      <div className="member-card__header">
        <span className="member-card__tag" translate="no">MIDNIGHT RENTALS</span>
        <span className="member-card__tag member-card__tag--year" translate="no">1996 {'\u2013'} 1998</span>
      </div>
      <div className="member-card__body">
        <div className="member-card__polaroid-row" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className={`member-card__polaroid${index < polaroidCount ? ' member-card__polaroid--filled' : ''}`} />
          ))}
        </div>
        <dl className="member-card__stats">
          <div>
            <dt>{strings.polaroids}</dt>
            <dd>{`${polaroidCount}/3`}</dd>
          </div>
          <div>
            <dt>{strings.arcades}</dt>
            <dd>{`${arcadeCount}/3`}</dd>
          </div>
          <div>
            <dt>{strings.time}</dt>
            <dd translate="no">{formatTime(playSeconds, strings.noTime)}</dd>
          </div>
        </dl>
        <p className="member-card__title">{title ? `\u{1F3F7} ${title}` : ''}</p>
      </div>
      <div className="member-card__actions">
        <button type="button" className="secondary" onClick={onClose}>
          {strings.close}
        </button>
        <button type="button" className="member-card__power" onClick={onPower} translate="no" aria-label={language === 'es' ? 'Apagar televisor' : 'Power off TV'}>
          {strings.power}
        </button>
      </div>
    </section>
  );
}
