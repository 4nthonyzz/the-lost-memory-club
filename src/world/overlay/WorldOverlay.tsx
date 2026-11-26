import type { StationId } from '../../core/contracts';
import { CaptureOverlay } from './CaptureOverlay';
import { AudioBadge } from './AudioBadge';
import { ControlsHint } from './ControlsHint';
import { Crosshair } from './Crosshair';
import { InteractionPrompt } from './InteractionPrompt';
import { KeyboardLookHint } from './KeyboardLookHint';
import { NotesCounter } from './NotesCounter';
import { PanelOpenNotice } from './PanelOpenNotice';
import { WorldInspectorCard } from './WorldInspectorCard';
import { WorldMessage } from './WorldMessage';
import type { CardPage } from '../logic/archiveDocuments';
import type { WorldMessage as WorldMessageData } from '../logic/propState';
import type { InteractionTarget, LampId, ReadableId, TurntableId } from '../worldTypes';
import './world.css';

export type OverlayMode = 'capturePending' | 'active' | 'inspecting';

export interface WorldOverlayProps {
  mode: OverlayMode;
  target?: StationId | InteractionTarget | null;
  /** Lamp states for the lamp prompt text. Absent means both lamps are on. */
  lampOn?: Readonly<Record<LampId, boolean>>;
  /** Message from a world-local prop. Absent means none. */
  message?: WorldMessageData | null;
  /** Prop whose card is open ('record-player' is the turntable catalog card). Absent means none. */
  card?: ReadableId | TurntableId | null;
  /** Visible page of the open card. Absent means page 1. */
  cardPage?: CardPage;
  /** Called by the card's page buttons. Absent leaves the buttons inert. */
  onCardPage?: (page: CardPage) => void;
  /** Turntable: the selected track index (0..4). Absent means 0. */
  track?: number;
  /** Turntable: the index of the track that is really playing, or null/absent when none is (used by the prompt and the card). */
  playingTrack?: number | null;
  /** Turntable: called when a track row is clicked. Absent leaves the rows inert. */
  onTrack?: (index: number) => void;
  /** Distinct readable props read this session. Absent hides the notes counter. */
  notesRead?: number;
  /** True when the notice may name the click/Enter resume action. */
  canResume?: boolean;
  /** True after pointer lock was denied or is unsupported. */
  keyboardLookHint?: boolean;
  /** Audio badge state. The badge is shown only when onToggleAudio is supplied. */
  audioMuted?: boolean;
  onToggleAudio?: () => void;
}

/** Rendered inside the World_Wrapper; never covers the App status line. */
export function WorldOverlay({ mode, target = null, lampOn, message = null, card = null, cardPage = 1, onCardPage, track = 0, playingTrack = null, onTrack, notesRead, canResume = true, keyboardLookHint = false, audioMuted = false, onToggleAudio }: WorldOverlayProps) {
  const inspecting = mode === 'inspecting';
  return (
    <div className="world-overlay">
      <WorldMessage message={inspecting ? null : message} />
      <WorldInspectorCard id={inspecting ? null : card} page={cardPage} onPage={onCardPage} track={track} playingTrack={playingTrack} onTrack={onTrack} />
      <InteractionPrompt target={inspecting ? null : target} lampOn={lampOn} playingTrack={playingTrack} />
      {inspecting ? null : <Crosshair />}
      {mode === 'capturePending' ? <CaptureOverlay /> : null}
      {inspecting ? <PanelOpenNotice canResume={canResume} /> : null}
      {keyboardLookHint && !inspecting ? <KeyboardLookHint /> : null}
      {notesRead !== undefined && !inspecting ? <NotesCounter read={notesRead} /> : null}
      {onToggleAudio ? <AudioBadge muted={audioMuted} onToggle={onToggleAudio} /> : null}
      <ControlsHint />
    </div>
  );
}
