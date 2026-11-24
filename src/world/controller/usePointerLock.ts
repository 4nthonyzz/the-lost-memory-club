// Pointer-lock helpers. Controller layer: the only place that touches the
// pointer lock API. requestLock must be called synchronously from a user
// gesture handler (click or key activation) and nowhere else.
import { useCallback, useRef } from 'react';

export interface MouseDelta {
  x: number;
  y: number;
}

export interface LockRequestCallbacks {
  onDenied: () => void;
  onUnsupported: () => void;
}

/**
 * Calls element.requestPointerLock() immediately (synchronously). Handles a
 * missing API, a synchronous throw, and a promise-returning implementation
 * that rejects.
 */
export function requestLock(element: Element, cb: LockRequestCallbacks): void {
  const el = element as Element & { requestPointerLock?: () => unknown };
  if (typeof el.requestPointerLock !== 'function') {
    cb.onUnsupported();
    return;
  }
  try {
    const result = el.requestPointerLock();
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(undefined, () => cb.onDenied());
    }
  } catch {
    cb.onDenied();
  }
}

export function isLocked(doc: Document): boolean {
  return doc.pointerLockElement != null;
}

export function exitLock(doc: Document): void {
  if (isLocked(doc) && typeof doc.exitPointerLock === 'function') {
    doc.exitPointerLock();
  }
}

export interface PointerLockListeners {
  /** Called on every pointerlockchange with the new locked state. */
  onChange: (locked: boolean) => void;
  onError: () => void;
  /** Called for every mousemove while the pointer is locked. */
  onMouseMove: (dx: number, dy: number) => void;
}

/** Registers the document listeners. Returns a function that removes them all. */
export function attachPointerLockListeners(doc: Document, l: PointerLockListeners): () => void {
  const change = () => l.onChange(isLocked(doc));
  const error = () => l.onError();
  const move = (e: MouseEvent) => {
    if (!isLocked(doc)) return;
    l.onMouseMove(e.movementX || 0, e.movementY || 0);
  };
  doc.addEventListener('pointerlockchange', change);
  doc.addEventListener('pointerlockerror', error);
  doc.addEventListener('mousemove', move);
  return () => {
    doc.removeEventListener('pointerlockchange', change);
    doc.removeEventListener('pointerlockerror', error);
    doc.removeEventListener('mousemove', move);
  };
}

export interface PointerLockApi {
  /** Accumulated mouse movement since the last consume or clear. */
  mouseDeltaRef: { current: MouseDelta };
  /** Returns the accumulated delta and resets it. */
  consumeMouseDelta: () => MouseDelta;
  clearMouseDelta: () => void;
}

/** Owns the mouse delta accumulator. Stable identities across renders. */
export function usePointerLock(): PointerLockApi {
  const mouseDeltaRef = useRef<MouseDelta>({ x: 0, y: 0 });
  const consumeMouseDelta = useCallback((): MouseDelta => {
    const out = { x: mouseDeltaRef.current.x, y: mouseDeltaRef.current.y };
    mouseDeltaRef.current.x = 0;
    mouseDeltaRef.current.y = 0;
    return out;
  }, []);
  const clearMouseDelta = useCallback(() => {
    mouseDeltaRef.current.x = 0;
    mouseDeltaRef.current.y = 0;
  }, []);
  return { mouseDeltaRef, consumeMouseDelta, clearMouseDelta };
}
