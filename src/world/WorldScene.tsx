import { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import type { StationId } from '../core/contracts';
import { usePlayerRig } from './controller/usePlayerRig';
import { useWorldInput, type WorldInput } from './controller/useWorldInput';
import { WebglFallback } from './overlay/WebglFallback';
import { WorldOverlay } from './overlay/WorldOverlay';
import { Effects } from './scene/Effects';
import { Lighting } from './scene/Lighting';
import { Props } from './scene/Props';
import { Room } from './scene/Room';
import { Stations } from './scene/Stations';
import { WorldCanvas } from './scene/WorldCanvas';

export interface WorldSceneProps {
  onInspect: (station: StationId) => void;
  memoryShifted: boolean;
  /** Optional. Absent behaves as before. When supplied, false suspends world input. */
  inputEnabled?: boolean;
}

/** Delay before a lost WebGL context without restore switches to the fallback. */
const CONTEXT_RESTORE_TIMEOUT_MS = 3000;

const WORLD_LABEL =
  'First-person 3D archive room. Click the scene to capture the mouse. ' +
  'Move with W A S D, look with the mouse, and press E near a station to inspect it. ' +
  'Press Escape to release the mouse. Station messages, including why a station cannot be used yet, ' +
  'appear in the status line below the scene.';

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Runs inside the Canvas (R3F context): player rig and WebGL context-loss watch. */
function PlayerRigHost({
  input,
  getTargetRef,
  onTargetChange,
  onContextLost,
  onContextRestored,
}: {
  input: WorldInput;
  getTargetRef: { current: () => StationId | null };
  onTargetChange: (target: StationId | null) => void;
  onContextLost: () => void;
  onContextRestored: () => void;
}) {
  const rig = usePlayerRig({
    heldKeysRef: input.heldKeysRef,
    consumeMouseDelta: input.consumeMouseDelta,
    getMode: input.getMode,
    onTargetChange,
  });
  getTargetRef.current = rig.getTarget;

  const domElement = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault(); // allows the browser to restore the context
      onContextLost();
    };
    domElement.addEventListener('webglcontextlost', lost);
    domElement.addEventListener('webglcontextrestored', onContextRestored);
    return () => {
      domElement.removeEventListener('webglcontextlost', lost);
      domElement.removeEventListener('webglcontextrestored', onContextRestored);
    };
  }, [domElement, onContextLost, onContextRestored]);

  return null;
}

function WorldInteractive({
  onInspect,
  memoryShifted,
  inputEnabled,
  onFail,
}: WorldSceneProps & { onFail: () => void }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const getTargetRef = useRef<() => StationId | null>(() => null);
  const [target, setTarget] = useState<StationId | null>(null);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTarget = useCallback(() => getTargetRef.current(), []);
  const input = useWorldInput({ wrapperRef, onInspect, getTarget, inputEnabled });

  const clearTimer = useCallback(() => {
    if (restoreTimer.current !== null) {
      clearTimeout(restoreTimer.current);
      restoreTimer.current = null;
    }
  }, []);
  // Error-handling timer only. It never resumes input.
  const handleContextLost = useCallback(() => {
    clearTimer();
    restoreTimer.current = setTimeout(onFail, CONTEXT_RESTORE_TIMEOUT_MS);
  }, [clearTimer, onFail]);
  useEffect(() => clearTimer, [clearTimer]);

  return (
    <div className="world-wrapper" ref={wrapperRef} tabIndex={0} role="group" aria-label={WORLD_LABEL}>
      <WorldCanvas frameloop={input.mode === 'inspecting' ? 'demand' : 'always'}>
        <Lighting memoryShifted={memoryShifted} />
        <Room />
        <Props />
        <Stations />
        <Effects active={input.mode !== 'inspecting'} />
        <PlayerRigHost
          input={input}
          getTargetRef={getTargetRef}
          onTargetChange={setTarget}
          onContextLost={handleContextLost}
          onContextRestored={clearTimer}
        />
      </WorldCanvas>
      <WorldOverlay mode={input.mode} target={target} canResume={inputEnabled === undefined} keyboardLookHint={input.keyboardLookHint} />
    </div>
  );
}

function FallbackView({ onInspect }: { onInspect: (station: StationId) => void }) {
  return (
    <div className="world-wrapper">
      <WebglFallback onInspect={onInspect} />
    </div>
  );
}

class WorldErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('World rendering failed', error, info.componentStack);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function WorldScene({ onInspect, memoryShifted, inputEnabled }: WorldSceneProps) {
  const [webgl] = useState(hasWebgl);
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);

  const fallback = <FallbackView onInspect={onInspect} />;
  if (!webgl || failed) return fallback;
  return (
    <WorldErrorBoundary fallback={fallback}>
      <WorldInteractive onInspect={onInspect} memoryShifted={memoryShifted} inputEnabled={inputEnabled} onFail={fail} />
    </WorldErrorBoundary>
  );
}
