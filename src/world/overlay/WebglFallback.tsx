import type { StationId } from '../../core/contracts';
import './world.css';

export interface WebglFallbackProps {
  onInspect: (id: StationId) => void;
}

export function WebglFallback({ onInspect }: WebglFallbackProps) {
  return (
    <div className="world-fallback" role="group" aria-label="3D view unavailable">
      <p>
        The 3D view is unavailable in this browser. You can still open the stations with the buttons below.
        Status messages appear in the status line below the scene.
      </p>
      <div className="world-fallback-actions">
        <button type="button" className="world-button" onClick={() => onInspect('vhs')}>
          Inspect the CRT television
        </button>
        <button type="button" className="world-button" onClick={() => onInspect('arcade')}>
          Use the arcade cabinet
        </button>
      </div>
    </div>
  );
}
