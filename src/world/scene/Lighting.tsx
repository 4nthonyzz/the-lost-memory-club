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
  { color: '#ffb766', intensity: 6, lampCoupled: true }, // west archive shelves, warm tungsten; scaled by the desk lamps ON (task 24.1)
  { color: '#9a6ae0', intensity: 5 }, // Arcade_Area, warm violet
] as const

/** The CRT light hangs above and slightly in front of the island console, derived from the vhs Station anchor. */
const VHS_ANCHOR = STATION_DEFS.find((s) => s.id === 'vhs')!.anchor
export const CRT_LIGHT_POSITION = [VHS_ANCHOR.x, 1.6, VHS_ANCHOR.z + 0.9] as const
/** Warm archive light beside the west shelves (shelf fronts at x -4.6, z -2.6..2.6), about 3.3 m from the farthest shelf corner. */
export const WEST_LIGHT_POSITION = [-2.6, 2.3, 0.2] as const

/**
 * Violet Arcade_Area light (task 20.1): centred on the middle cabinet (z 0) and 1 m in front of the cabinet faces
 * (x 8.4). At floor level the three anchors (z -1.2, 0, 1.2) are 2.9, 2.6 and 2.9 m away, well inside the 6 m range.
 */
export const ARCADE_LIGHT_POSITION = [7.4, 2.4, 0] as const
export const ARCADE_LIGHT_DISTANCE = 6

/** `lampsOn` is the number of desk lamps ON (0..2, default 2). It scales ambient and west-light via MemoryShiftDriver. */
export function Lighting({ memoryShifted, lampsOn = 2 }: { memoryShifted: boolean; lampsOn?: number }) {
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
      <pointLight ref={p1} name="west-light" position={[WEST_LIGHT_POSITION[0], WEST_LIGHT_POSITION[1], WEST_LIGHT_POSITION[2]]} color={POINT_BASES[1].color} intensity={POINT_BASES[1].intensity} distance={7} decay={2} />
      <pointLight ref={p2} name="arcade-light" position={[ARCADE_LIGHT_POSITION[0], ARCADE_LIGHT_POSITION[1], ARCADE_LIGHT_POSITION[2]]} color={POINT_BASES[2].color} intensity={POINT_BASES[2].intensity} distance={ARCADE_LIGHT_DISTANCE} decay={2} />
      <MemoryShiftDriver
        memoryShifted={memoryShifted}
        ambientRef={ambientRef}
        pointRefs={pointRefs}
        pointBases={POINT_BASES}
        lampsOn={lampsOn}
      />
    </>
  )
}
