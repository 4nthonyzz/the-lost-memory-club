import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactElement } from 'react';
import {
  ARCHIVE_DOCUMENTS,
  ARCHIVE_FOOTER_HINT,
  BOOK_PAGE_HEADINGS,
  BOOK_PAGE_NUMBERS,
  BOOK_STAMP_TEXT,
  PAGE_LABELS,
  isBookDocument,
  isStackedLayout,
  type CardPage,
  type DocBlock,
  type DocTheme,
} from '../logic/archiveDocuments';
import { MUSIC_CATALOG } from '../audio/worldAudio';
import { BOOK_PALETTES, CARD_PALETTES, TURNTABLE_PALETTE } from '../logic/cardThemes';
import type { ReadableId, TurntableId } from '../worldTypes';
import {
  TURNTABLE_CARD_TAG,
  TURNTABLE_CARD_TITLE,
  TURNTABLE_FOOTER_HINT,
  TURNTABLE_LINER_NOTE,
  trackBpmLabel,
  turntableStatusText,
} from './turntableCatalog';

export interface WorldInspectorCardProps {
  /** The prop whose card is open ('record-player' opens the turntable catalog card), or null/undefined when no card is open. */
  id?: ReadableId | TurntableId | null;
  /** Visible page. Defaults to page 1. */
  page?: CardPage;
  /** Called when a page button is clicked (pointer not locked). Keys 1 and 2 are handled by the world input. */
  onPage?: (page: CardPage) => void;
  /** Turntable card: the selected track index (0..4). Defaults to 0. */
  track?: number;
  /** Turntable card: the index of the track that is really playing, or null when none is. */
  playingTrack?: number | null;
  /** Turntable card: called when a track row is clicked. Keys 1 to 5 are handled by the world input. */
  onTrack?: (index: number) => void;
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
 * there is no focus trap and no focus move. The card is the single scroll container and takes the mouse (wheel and
 * scrollbar); the region around it ignores the pointer. The two page buttons are useful when the pointer is not locked.
 * Keys 1 and 2 switch pages and are handled by the world input.
 * It closes on E, Esc or by walking away.
 */
export function WorldInspectorCard({ id = null, page = 1, onPage, track = 0, playingTrack = null, onTrack }: WorldInspectorCardProps) {
  if (id === null) return null;
  if (id === 'record-player') return <TurntableCard track={track} playingTrack={playingTrack} onTrack={onTrack} />;
  return <OpenCard id={id} page={page} onPage={onPage} />;
}

const LINE_PX = 16;

/** Mounted only while a card is open, so its listeners exist only then. */
function OpenCard({ id, page, onPage }: { id: ReadableId; page: CardPage; onPage?: (page: CardPage) => void }) {
  const cardRef = useRef<HTMLElement | null>(null);
  const doc = ARCHIVE_DOCUMENTS[id];
  const isBook = isBookDocument(doc);
  // Measured content width of the card (book layout only). Unknown (null) counts as wide.
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const stackedRef = useRef(false);
  stackedRef.current = isBook && isStackedLayout(cardWidth);
  const onPageRef = useRef(onPage);
  onPageRef.current = onPage;
  // Wheel scrolls the card, also while the pointer is locked (the wheel is still delivered). Not passive so the page never scrolls.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = cardRef.current;
      if (!el) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? el.clientHeight : 1;
      el.scrollTop += e.deltaY * unit;
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);
  // Card clicks and presses never reach the world wrapper (which would request pointer lock). Buttons are left alone so
  // React's delegated handlers still run; the wrapper ignores BUTTON targets.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const stop = (e: Event) => {
      const target = e.target as Element | null;
      if (target?.closest?.('button')) return;
      // Book pages are not buttons, so their React handlers would never run once propagation stops here: handle them
      // natively. A press keeps keyboard focus on the world wrapper; a click makes the page the active one.
      const pageEl = target?.closest?.('[data-book-page]') as HTMLElement | null | undefined;
      if (pageEl) {
        if (e.type === 'mousedown') e.preventDefault();
        else if (e.type === 'click') onPageRef.current?.(pageEl.dataset.bookPage === '2' ? 2 : 1);
      }
      e.stopPropagation();
    };
    el.addEventListener('mousedown', stop);
    el.addEventListener('click', stop);
    return () => {
      el.removeEventListener('mousedown', stop);
      el.removeEventListener('click', stop);
    };
  }, []);
  // Measure the card width for the book layout. Guarded for environments without ResizeObserver (jsdom).
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!isBook || !el) return undefined;
    const initial = el.clientWidth;
    if (initial > 0) setCardWidth(initial);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (typeof w === 'number') setCardWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isBook]);
  // A new document always starts at the top. A page switch resets the scroll, except in the book layout: both pages are
  // visible side by side (nothing to do), and when stacked the chosen page is scrolled into view.
  const seenRef = useRef<{ id: ReadableId; page: CardPage } | null>(null);
  useLayoutEffect(() => {
    const el = cardRef.current;
    const seen = seenRef.current;
    seenRef.current = { id, page };
    if (!el) return;
    if (seen === null || seen.id !== id || !isBook) {
      el.scrollTop = 0;
      return;
    }
    if (seen.page === page || !stackedRef.current) return;
    const pageEl = el.querySelector<HTMLElement>(`[data-book-page="${page}"]`);
    if (!pageEl) return;
    if (typeof pageEl.scrollIntoView === 'function') pageEl.scrollIntoView({ block: 'start' });
    else el.scrollTop = pageEl.offsetTop;
  }, [id, page, isBook]);

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
  if (isBook && (doc.theme === 'snake' || doc.theme === 'maze' || doc.theme === 'frequency')) {
    const bp = BOOK_PALETTES[doc.theme];
    Object.assign(style, {
      '--page-bg': bp.pageBg,
      '--page-ink': bp.pageInk,
      '--page-muted': bp.pageMuted,
      '--page-hl-bg': bp.pageHlBg,
      '--page-accent': bp.pageAccentInk,
    });
  }
  const renderBlocks = (blocks: readonly DocBlock[]) =>
    blocks.map((b) => (
      <div className="world-card-block" key={b.heading} data-highlight={b.highlight ? 'true' : undefined}>
        <h3 className="world-card-block-title">{b.heading}</h3>
        {b.lines.map((line) => (
          <p className="world-card-body" key={line}>
            {line}
          </p>
        ))}
      </div>
    ));
  // Keep keyboard focus on the world wrapper when a page button is clicked, so E and 1 / 2 keep working.
  const keepFocus = (e: MouseEvent) => e.preventDefault();

  return (
    <div className="world-card-region">
      <section
        className={isBook ? 'world-card world-card--book' : 'world-card'}
        ref={cardRef}
        data-world-card="true"
        role="region"
        aria-label={doc.title}
        aria-live="polite"
        data-card-id={doc.id}
        data-theme={doc.theme}
        data-layout={isBook ? 'book' : undefined}
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
              aria-controls={isBook ? `world-card-page-${n}` : 'world-card-panel'}
              tabIndex={-1}
              onMouseDown={keepFocus}
              onClick={() => onPage?.(n)}
            >
              {PAGE_LABELS[n - 1]}
            </button>
          ))}
        </div>
        {isBook ? (
          <>
            <p className="world-card-footer world-book-footer">{ARCHIVE_FOOTER_HINT}</p>
            <div className="world-book">
              {([1, 2] as const).map((n) => (
                <article
                  key={n}
                  className="world-book-page"
                  role="tabpanel"
                  id={`world-card-page-${n}`}
                  aria-labelledby={`world-card-tab-${n}`}
                  aria-current={page === n ? 'page' : undefined}
                  data-book-page={n}
                  data-active={page === n ? 'true' : 'false'}
                >
                  {page === n ? <span className="world-book-ribbon" aria-hidden="true" /> : null}
                  <h3 className="world-book-page-title">{BOOK_PAGE_HEADINGS[n - 1]}</h3>
                  {renderBlocks(doc.pages[n - 1].blocks)}
                  {n === 2 && doc.statusLine ? <p className="world-card-status">{doc.statusLine}</p> : null}
                  <p className="world-book-pageno">{BOOK_PAGE_NUMBERS[n - 1]}</p>
                </article>
              ))}
              <div className="world-book-spine" aria-hidden="true" />
              <div className="world-book-stamp" aria-hidden="true">
                {BOOK_STAMP_TEXT}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="world-card-panel" role="tabpanel" id="world-card-panel" aria-labelledby={`world-card-tab-${page}`}>
              {renderBlocks(active.blocks)}
              {doc.statusLine ? <p className="world-card-status">{doc.statusLine}</p> : null}
            </div>
            <p className="world-card-footer">{ARCHIVE_FOOTER_HINT}</p>
          </>
        )}
      </section>
    </div>
  );
}

/**
 * Turntable catalog card (task 33.3). Same non-modal, non-trapping card as the documents (one scroll container, wheel and
 * scrollbar, the region around it ignores the pointer). The five track rows are buttons with tabIndex -1: they are clickable
 * with the mouse, never take keyboard focus and a click never requests pointer lock (the wrapper click handler skips clicks
 * inside [data-world-card]). Keys 1 to 5 select a track and are handled by the world input.
 */
function TurntableCard({ track, playingTrack, onTrack }: { track: number; playingTrack: number | null; onTrack?: (index: number) => void }) {
  const cardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = cardRef.current;
      if (!el) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? el.clientHeight : 1;
      el.scrollTop += e.deltaY * unit;
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);
  // Presses and clicks on the card never reach the wrapper. Buttons are left alone so React's handlers run; the wrapper
  // ignores BUTTON targets and anything inside [data-world-card].
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const stop = (e: Event) => {
      const target = e.target as Element | null;
      if (target?.closest?.('button')) return;
      e.stopPropagation();
    };
    el.addEventListener('mousedown', stop);
    el.addEventListener('click', stop);
    return () => {
      el.removeEventListener('mousedown', stop);
      el.removeEventListener('click', stop);
    };
  }, []);
  const p = TURNTABLE_PALETTE;
  const style = {
    '--card-bg': p.bg,
    '--card-ink': p.ink,
    '--card-muted': p.muted,
    '--card-pill-bg': p.pillBg,
    '--card-pill-ink': p.pillInk,
    '--card-hl-bg': p.hlBg,
    '--card-accent': p.accent,
    '--card-frame': p.frame,
    '--lcd-bg': p.lcdBg,
    '--lcd-ink': p.lcdInk,
    '--lcd-active-ink': p.lcdActiveInk,
  } as CSSProperties;
  // Keep keyboard focus on the world wrapper when a row is pressed, so E and 1 to 5 keep working.
  const keepFocus = (e: MouseEvent) => e.preventDefault();
  return (
    <div className="world-card-region">
      <section
        className="world-card world-card--turntable"
        ref={cardRef}
        data-world-card="true"
        role="region"
        aria-label={TURNTABLE_CARD_TITLE}
        aria-live="polite"
        data-card-id="record-player"
        data-theme="turntable"
        style={style}
      >
        <header className="world-card-head">
          <svg {...SVG_PROPS}>
            <circle cx="36" cy="20" r="17" fill="none" stroke="var(--card-accent)" strokeWidth="2" />
            <circle cx="36" cy="20" r="11" fill="none" stroke="var(--card-muted)" strokeWidth="1" />
            <circle cx="36" cy="20" r="4" fill="var(--card-ink)" />
            <path d="M104 6 L84 22 L70 18" fill="none" stroke="var(--card-accent)" strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="104" cy="6" r="3" fill="var(--card-accent)" />
          </svg>
          <div className="world-card-heading">
            <p className="world-card-tag">{TURNTABLE_CARD_TAG}</p>
            <h2 className="world-card-title">{TURNTABLE_CARD_TITLE}</h2>
          </div>
        </header>
        <ul className="world-card-pills" aria-label="Turntable status">
          <li className="world-pill world-pill-status">{turntableStatusText(playingTrack)}</li>
        </ul>
        <p className="world-card-liner">{TURNTABLE_LINER_NOTE}</p>
        <div className="world-track-list" role="listbox" aria-label="Track list">
          {MUSIC_CATALOG.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              role="option"
              className="world-track-row"
              data-track-index={i}
              data-active={track === i ? 'true' : 'false'}
              aria-selected={track === i}
              aria-current={track === i ? 'true' : undefined}
              tabIndex={-1}
              onMouseDown={keepFocus}
              onClick={() => onTrack?.(i)}
            >
              <span className="world-track-title">{entry.title}</span>
              <span className="world-track-bpm">{trackBpmLabel(entry)}</span>
            </button>
          ))}
        </div>
        <p className="world-card-footer">{TURNTABLE_FOOTER_HINT}</p>
      </section>
    </div>
  );
}