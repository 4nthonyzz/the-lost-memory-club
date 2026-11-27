import './ui.css';
import type { Language } from './preferences';
import type { EndingSceneId } from './viewModels';

export interface MemberCardProps {
  language: Language;
  endingId: EndingSceneId;
  polaroidCount: number;
  arcadeCount: number;
  playSeconds: number;
  onPower: () => void;
}

const TITLES_ES: Record<EndingSceneId, string> = {
  'bittersweet-dawn': 'Guardián del 31 de Septiembre',
  'forever-1998': 'Residente Eterno del Club',
  'archivists-truth': 'Archivista Implacable',
};
const TITLES_EN: Record<EndingSceneId, string> = {
  'bittersweet-dawn': 'Guardian of September 31st',
  'forever-1998': 'Eternal Club Resident',
  'archivists-truth': 'Relentless Archivist',
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MemberCard({ language, endingId, polaroidCount, arcadeCount, playSeconds, onPower }: MemberCardProps) {
  const es = language === 'es';
  const titles = es ? TITLES_ES : TITLES_EN;
  const title = titles[endingId];

  return (
    <section className="member-card" aria-label={es ? 'Credencial de socio' : 'Member card'} lang={language}>
      <div className="member-card__band" aria-hidden="true" />
      <div className="member-card__header">
        <span className="member-card__tag" translate="no">MIDNIGHT RENTALS</span>
        <span className="member-card__tag member-card__tag--year" translate="no">1996 – 1998</span>
      </div>
      <div className="member-card__body">
        <div className="member-card__polaroid-row" aria-label={es ? 'Polaroids tomadas' : 'Polaroids taken'}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={`member-card__polaroid${i < polaroidCount ? ' member-card__polaroid--filled' : ''}`} aria-hidden="true" />
          ))}
        </div>
        <dl className="member-card__stats">
          <div>
            <dt>{es ? 'Polaroids' : 'Polaroids'}</dt>
            <dd>{polaroidCount}/3</dd>
          </div>
          <div>
            <dt>{es ? 'Arcades' : 'Arcades'}</dt>
            <dd>{arcadeCount}/3</dd>
          </div>
          <div>
            <dt>{es ? 'Tiempo' : 'Time'}</dt>
            <dd translate="no">{fmt(playSeconds)}</dd>
          </div>
        </dl>
        <p className="member-card__title">🏷 {title}</p>
      </div>
      <button type="button" className="member-card__power" onClick={onPower} translate="no" aria-label={es ? 'Apagar televisor' : 'Power off TV'}>
        {'[ POWER \u23FB ]'}
      </button>
    </section>
  );
}
