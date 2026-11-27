/**
 * Renders a primitive fallback and, when the manifest has an entry for `id`,
 * swaps in a clone of the loaded GLB. Loading is asynchronous and never
 * blocks the frame loop. The GLB is decoration only: colliders and anchors
 * come from the layout.
 */
import { Component, useEffect, useState, type ReactNode } from 'react'
import type { Object3D } from 'three'
import { getAssetEntry } from './assetManifest'
import { acquireGlb, releaseGlb } from './loadGlb'

export type AssetState = 'fallback' | 'loaded' | 'failed'
export type AssetEvent = 'loaded' | 'failed' | 'reset'

/** Pure state machine for one model: fallback until loaded; failure is terminal until reset. */
export function resolveAssetState(state: AssetState, event: AssetEvent): AssetState {
  if (event === 'reset') return 'fallback'
  if (state === 'fallback') return event
  return state
}

class AssetBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    // Keep the primitive; the loader already warns once per path.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

type Vec3 = [number, number, number]

export interface AssetModelProps {
  id: string
  fallback: ReactNode
  position?: Vec3
  rotation?: Vec3
  scale?: Vec3 | number
}

function GlbInstance({ path, fallback, position, rotation, scale }: Omit<AssetModelProps, 'id'> & { path: string }) {
  const [state, setState] = useState<AssetState>('fallback')
  const [object, setObject] = useState<Object3D | null>(null)

  useEffect(() => {
    let cancelled = false
    let acquired = false
    try {
      const promise = acquireGlb(path)
      acquired = true
      promise.then(
        (gltf) => {
          if (cancelled) return
          setObject(gltf.scene.clone(true))
          setState((s) => resolveAssetState(s, 'loaded'))
        },
        () => {
          if (!cancelled) setState((s) => resolveAssetState(s, 'failed'))
        },
      )
    } catch {
      setState((s) => resolveAssetState(s, 'failed'))
    }
    return () => {
      cancelled = true
      // Clones share geometry and materials with the cached scene; releasing disposes at refcount zero.
      if (acquired) releaseGlb(path)
      setObject(null)
      setState((s) => resolveAssetState(s, 'reset'))
    }
  }, [path])

  if (state !== 'loaded' || !object) return <>{fallback}</>
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={object} />
    </group>
  )
}

export function AssetModel({ id, fallback, position, rotation, scale }: AssetModelProps) {
  const entry = getAssetEntry(id)
  if (!entry || typeof window === 'undefined') return <>{fallback}</>
  return (
    <AssetBoundary fallback={fallback}>
      <GlbInstance path={entry.path} fallback={fallback} position={position} rotation={rotation} scale={scale} />
    </AssetBoundary>
  )
}
