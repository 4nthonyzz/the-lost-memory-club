/** R3F Canvas with the M1 render settings. The camera is driven by the player rig rendered as a child. */
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { disposeSharedResources } from './sharedResources'

export interface WorldCanvasProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export function WorldCanvas({ children, className, style }: WorldCanvasProps) {
  useEffect(() => disposeSharedResources, [])
  return (
    <Canvas
      className={className}
      style={style}
      dpr={[1, 1.5]}
      shadows={false}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 70, near: 0.1, far: 50, position: [0, 1.6, 3] }}
    >
      {children}
    </Canvas>
  )
}
