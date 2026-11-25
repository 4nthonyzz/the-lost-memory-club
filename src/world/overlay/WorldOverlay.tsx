import type { StationId } from '../../core/contracts';
import { CaptureOverlay } from './CaptureOverlay';
import { ControlsHint } from './ControlsHint';
import { Crosshair } from './Crosshair';
import { InteractionPrompt } from './InteractionPrompt';
import { KeyboardLookHint } from './KeyboardLookHint';
import { PanelOpenNotice } from './PanelOpenNotice';
import { WorldMessage } from './WorldMessage';
import type { WorldMessage as WorldMessageData } from '../logic/propState';
import type { InteractionTarget, LampId } from '../worldTypes';
import './world.css';

export type OverlayMode = 'capturePending' | 'active' | 'inspecting';

export interface WorldOverlayProps {
  mode: OverlayMode;
  target?: StationId | InteractionTarget | null;
  /** Lamp states for the lamp prompt text. Absent means both lamps are on. */
  lampOn?: Readonly<Record<LampId, boolean>>;
  /** Message from a world-local prop. Absent means none. */
  message?: WorldMessageData | null;
  /** True when the notice may name the click/Enter resume action. */
  canResume?: boolean;
  /** True after pointer lock was denied or is unsupported. */
  keyboardLookHint?: boolean;
}

/** Rendered inside the World_Wrapper; never covers the App status line. */
export function WorldOverlay({ mode, target = null, lampOn, message = null, canResume = true, keyboardLookHint = false }: WorldOverlayProps) {
  const inspecting = mode === 'inspecting';
  return (
    <div className="world-overlay">
      <WorldMessage message={inspecting ? null : message} />
      <InteractionPrompt target={inspecting ? null : target} lampOn={lampOn} />
      {inspecting ? null : <Crosshair />}
      {mode === 'capturePending' ? <CaptureOverlay /> : null}
      {inspecting ? <PanelOpenNotice canResume={canResume} /> : null}
      {keyboardLookHint && !inspecting ? <KeyboardLookHint /> : null}
      <ControlsHint />
    </div>
  );
}
