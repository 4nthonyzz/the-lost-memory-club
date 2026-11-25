import type { CSSProperties, MouseEvent, ReactElement } from 'react';
import {
  ARCHIVE_DOCUMENTS,
  ARCHIVE_FOOTER_HINT,
  PAGE_LABELS,
  type CardPage,
  type DocTheme,
} from '../logic/archiveDocuments';
import { CARD_PALETTES } from '../logic/cardThemes';
import type { ReadableId } from '../worldTypes';

export interface WorldInspectorCardProps {
  /** The readable prop whose card is open, or null/undefined when no card is open. */
  id?: ReadableId | null;
  /** Visible page. Defaults to page 1. */
  page?: CardPage;
  /** Called when a page button is clicked (pointer not locked). Keys 1 and 2 are handled by the world input. */
  onPage?: (page: CardPage) => void;
}

const SVG_PROPS = {
  className: 'world-card-art',
  viewBox: '0 0 120 40',
  'aria-hidden': true,
  focusable: false,
  role: 'presentation',
} as const;

/**
 * Small decorative header art per theme. Pure inline SVG: no external assets, no animation, hidden from assistive
 * technology. Colours come from the CSS custom properties of the card (accent and ink).
 */
const ART: Readonly<Record<DocTheme, () => ReactElement>> = {
  // Pixel serpent made of VHS tape reels, heading for a fragment target.
  snake: () => (
    <svg {...SVG_PROPS}>
      <g fill="none" stroke="var(--card-accent)" strokeWidth="3" strokeLinejoin="round">
        <path d="M8 30 H40 V12 H70 V28 H86" />
      </g>
      <rect x="86" y="24" width="8" height="8" fill="var(--card-accent)" />
      <rect x="90" y="26" width="2" height="2" fill="var(--card-bg)" />
      <rect x="104" y="8" width="8" height="8" fill="none" stroke="var(--card-ink)" strokeWidth="2" strokeDasharray="3 2" />
      <circle cx="14" cy="30" r="3" fill="var(--card-bg)" stroke="var(--card-accent)" strokeWidth="1.5" />
    </svg>
  ),
  // Shifting corridor with three photo fragments.
  maze: () => (
    <svg {...SVG_PROPS}>
      <g fill="none" stroke="var(--card-accent)" strokeWidth="2">
        <path d="M4 36 V8 H40 V28 H64 V8 H92 V32 H116" />
        <path d="M14 36 V18 H30 V36" strokeDasharray="3 3" />
      </g>
      <g fill="var(--card-ink)">
        <rect x="46" y="12" width="8" height="10" transform="rotate(-8 50 17)" />
        <rect x="70" y="14" width="8" height="10" transform="rotate(6 74 19)" />
        <rect x="98" y="16" width="8" height="10" transform="rotate(-4 102 21)" />
      </g>
    </svg>
  ),
  // Carrier waveform with a marker at 89.4 MHz.
  frequency: () => (
    <svg {...SVG_PROPS}>
      <path d="M2 20 H24 L28 8 L34 32 L40 4 L46 36 L52 12 L56 20 H82 L86 14 L90 26 L94 20 H118" fill="none" stroke="var(--card-accent)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M2 38 H118 M2 36 V40 M30 36 V40 M60 36 V40 M90 36 V40 M118 36 V40" fill="none" stroke="var(--card-ink)" strokeWidth="1" />
      <path d="M74 2 V38" stroke="var(--card-ink)" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  ),
  // Spiral binding rings along a notebook edge.
  notebook: () => (
    <svg {...SVG_PROPS}>
      <g fill="none" stroke="var(--card-accent)" strokeWidth="2">
        {[8, 24, 40, 56, 72, 88, 104].map((x) => (
          <ellipse key={x} cx={x} cy="12" rx="6" ry="5" />
        ))}
      </g>
      <g stroke="var(--card-muted)" strokeWidth="1">
        <path d="M4 26 H116 M4 34 H116" />
      </g>
    </svg>
  ),
  // Pinned photos joined by red string.
  board: () => (
    <svg {...SVG_PROPS}>
      <path d="M22 14 L60 26 L98 12" fill="none" stroke="#b91c1c" strokeWidth="1.5" />
      <g fill="var(--card-pill-bg)" stroke="var(--card-ink)" strokeWidth="1.5">
        <rect x="10" y="12" width="24" height="22" transform="rotate(-6 22 23)" />
        <rect x="48" y="16" width="24" height="22" transform="rotate(4 60 27)" />
        <rect x="86" y="10" width="24" height="22" transform="rotate(-3 98 21)" />
      </g>
      <g fill="#b91c1c">
        <circle cx="22" cy="14" r="3" />
        <circle cx="60" cy="26" r="3" />
        <circle cx="98" cy="12" r="3" />
      </g>
    </svg>
  ),
  // Rewind arrows over tape-noise lines.
  shift: () => (
    <svg {...SVG_PROPS}>
      <g fill="var(--card-accent)">
        <path d="M44 20 L62 8 V32 Z" />
        <path d="M64 20 L82 8 V32 Z" />
      </g>
      <g stroke="var(--card-muted)" strokeWidth="1.5">
        <path d="M4 10 H34 M10 20 H30 M4 30 H34 M90 10 H116 M96 20 H112 M90 30 H116" />
      </g>
    </svg>
  ),
  // Ledger rows with a ranked column.
  notice: () => (
    <svg {...SVG_PROPS}>
      <g fill="none" stroke="var(--card-ink)" strokeWidth="1.5">
        <rect x="4" y="3" width="112" height="34" />
        <path d="M24 3 V37 M4 14 H116 M4 25 H116" />
      </g>
      <g fill="var(--card-accent)">
        <rect x="8" y="6" width="12" height="5" />
        <rect x="8" y="17" width="12" height="5" />
        <rect x="8" y="28" width="12" height="5" />
      </g>
      <g stroke="var(--card-muted)" strokeWidth="2">
        <path d="M30 8 H90 M30 19 H78 M30 30 H98" />
      </g>
    </svg>
  ),
};

/**
 * Archive Document Card. A non-modal paper/terminal document shown inside the world wrapper. It is not a dialog:
 * there is no focus trap and no focus move. The container ignores the pointer; only the two page buttons accept
 * clicks (useful when the pointer is not locked). Keys 1 and 2 switch pages and are handled by the world input.
 * It closes on E, Esc or by walking away.
 */
export function WorldInspectorCard({ id = null, page = 1, onPage }: WorldInspectorCardProps) {
  if (id === null) return null;
  const doc = ARCHIVE_DOCUMENTS[id];
  const palette = CARD_PALETTES[doc.theme];
  const active = doc.pages[page - 1];
  const Art = ART[doc.theme];
  const style = {
    '--card-bg': palette.bg,
    '--card-ink': palette.ink,
    '--card-muted': palette.muted,
    '--card-pill-bg': palette.pillBg,
    '--card-pill-ink': palette.pillInk,
    '--card-hl-bg': palette.hlBg,
    '--card-accent': doc.accent,
  } as CSSProperties;
  // Keep keyboard focus on the world wrapper when a page button is clicked, so E and 1 / 2 keep working.
  const keepFocus = (e: MouseEvent) => e.preventDefault();

  return (
    <div className="world-card-region">
      <section
        className="world-card"
        role="region"
        aria-label={doc.title}
        aria-live="polite"
        data-card-id={doc.id}
        data-theme={doc.theme}
        style={style}
      >
        <header className="world-card-head">
          <Art />
          <div className="world-card-heading">
            <p className="world-card-tag">{doc.tag}</p>
            <h2 className="world-card-title">{doc.title}</h2>
          </div>
        </header>
        <ul className="world-card-pills" aria-label="Document status">
          <li className="world-pill world-pill-status">{doc.status}</li>
          {doc.specs.map((s) => (
            <li className="world-pill" key={s.label}>
              <span className="world-pill-label">{s.label}</span> {s.value}
            </li>
          ))}
        </ul>
        <div className="world-card-tabs" role="tablist" aria-label="Document pages">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              id={`world-card-tab-${n}`}
              className="world-card-tab"
              aria-selected={page === n}
              aria-controls="world-card-panel"
              tabIndex={-1}
              onMouseDown={keepFocus}
              onClick={() => onPage?.(n)}
            >
              {PAGE_LABELS[n - 1]}
            </button>
          ))}
        </div>
        <div className="world-card-panel" role="tabpanel" id="world-card-panel" aria-labelledby={`world-card-tab-${page}`}>
          {active.blocks.map((b) => (
            <div className="world-card-block" key={b.heading} data-highlight={b.highlight ? 'true' : undefined}>
              <h3 className="world-card-block-title">{b.heading}</h3>
              {b.lines.map((line) => (
                <p className="world-card-body" key={line}>
                  {line}
                </p>
              ))}
            </div>
          ))}
          {doc.statusLine ? <p className="world-card-status">{doc.statusLine}</p> : null}
        </div>
        <p className="world-card-footer">{ARCHIVE_FOOTER_HINT}</p>
      </section>
    </div>
  );
}
