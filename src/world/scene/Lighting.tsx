/**
 * M1 lights: ambient plus three point lights (4 total, the cap). The initial look comes from
 * memoryShifted at mount; later changes are applied imperatively by MemoryShiftDriver
 * (colors, intensities, background and fog), so these props never change after mount.
 */
import { useRef, useState } from 'react'
import type { AmbientLight, PointLight } from 'three'
import { STATION_DEFS } from '../layout/roomLayout'
import { paletteFor } from '../logic/palette'
import { MemoryShiftDriver } from './MemoryShiftDriver'

export const M1_LIGHT_COUNT = 3
/** M3 adds one point light for the Arcade_Area (ambient + 3 point lights). */
export const M3_LIGHT_COUNT = 4

const POINT_BASES = [
  { color: '#4fe0d0', intensity: 6 }, // over the central CRT, cool teal
  { color: '#d84fd0', intensity: 6 }, // near the arcade, magenta
  { color: '#9a6ae0', intensity: 5 }, // Arcade_Area, warm violet
] as const

/** The CRT light hangs above and slightly in front of the island console, derived from the vhs Station anchor. */
const VHS_ANCHOR = STATION_DEFS.find((s) => s.id === 'vhs')!.anchor
export const CRT_LIGHT_POSITION = [VHS_ANCHOR.x, 1.6, VHS_ANCHOR.z + 0.8] as const

export function Lighting({ memoryShifted }: { memoryShifted: boolean }) {
  const [initial] = useState(() => paletteFor(memoryShifted))
  const ambientRef = useRef<AmbientLight>(null)
  const p0 = useRef<PointLight>(null)
  const p1 = useRef<PointLight>(null)
  const p2 = useRef<PointLight>(null)
  const [pointRefs] = useState(() => [p0, p1, p2])
  return (
    <>
      <color attach="background" args={[initial.background]} />
      <fog attach="fog" args={[initial.fogColor, initial.fogNear, initial.fogFar]} />
      <ambientLight ref={ambientRef} color={initial.ambient} intensity={initial.ambientIntensity} />
      <pointLight ref={p0} name="crt-light" position={[CRT_LIGHT_POSITION[0], CRT_LIGHT_POSITION[1], CRT_LIGHT_POSITION[2]]} color={POINT_BASES[0].color} intensity={POINT_BASES[0].intensity} distance={7} decay={2} />
      <pointLight ref={p1} position={[2.5, 2.2, -2.6]} color={POINT_BASES[1].color} intensity={POINT_BASES[1].intensity} distance={7} decay={2} />
      <pointLight ref={p2} position={[7.3, 2.4, 0]} color={POINT_BASES[2].color} intensity={POINT_BASES[2].intensity} distance={6} decay={2} />
      <MemoryShiftDriver
        memoryShifted={memoryShifted}
        ambientRef={ambientRef}
        pointRefs={pointRefs}
        pointBases={POINT_BASES}
      />
    </>
  )
}
