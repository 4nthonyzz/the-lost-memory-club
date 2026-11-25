import type { StationId } from '../../core/contracts';
import { CaptureOverlay } from './CaptureOverlay';
import { ControlsHint } from './ControlsHint';
import { Crosshair } from './Crosshair';
import { InteractionPrompt } from './InteractionPrompt';
import { KeyboardLookHint } from './KeyboardLookHint';
import { PanelOpenNotice } from './PanelOpenNotice';
import './world.css';

export type OverlayMode = 'capturePending' | 'active' | 'inspecting';

export interface WorldOverlayProps {
  mode: OverlayMode;
  target?: StationId | null;
  /** True when the notice may name the click/Enter resume action. */
  canResume?: boolean;
  /** True after pointer lock was denied or is unsupported. */
  keyboardLookHint?: boolean;
}

/** Rendered inside the World_Wrapper; never covers the App status line. */
export function WorldOverlay({ mode, target = null, canResume = true, keyboardLookHint = false }: WorldOverlayProps) {
  const inspecting = mode === 'inspecting';
  return (
    <div className="world-overlay">
      <InteractionPrompt target={inspecting ? null : target} />
      {inspecting ? null : <Crosshair />}
      {mode === 'capturePending' ? <CaptureOverlay /> : null}
      {inspecting ? <PanelOpenNotice canResume={canResume} /> : null}
      {keyboardLookHint && !inspecting ? <KeyboardLookHint /> : null}
      <ControlsHint />
    </div>
  );
}
