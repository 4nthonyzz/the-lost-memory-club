/**
 * Drives the Memory_Shift look. The blend progress lives in a ref and is advanced in useFrame,
 * so there is no per-frame React state. It starts at the target (no transition on mount),
 * is immediate under reduced motion, and runs in both directions. In frameloop="demand" it
 * calls invalidate() until the target is reached, then stops requesting frames.
 */
import { useLayoutEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Fog, type AmbientLight, type PointLight } from 'three'
import { useReducedMotion } from '../controller/useReducedMotion'
import { advanceProgress } from '../logic/palette'
import { lampLightFactors, type LampLightFactors } from './lampCoupling'
import { applyShift, arcadeScreenBaseColor, couchBaseColor, crtScreenBaseColor, type ShiftTargets } from './memoryShift'
import { ensureSharedTextures, materials, overlayMaterials } from './sharedResources'

export interface MemoryShiftDriverProps {
  memoryShifted: boolean
  ambientRef: RefObject<AmbientLight | null>
  pointRefs: ReadonlyArray<RefObject<PointLight | null>>
  /** Authored colors and intensities of the point lights, same order as pointRefs. */
  pointBases: ReadonlyArray<{ color: string; intensity: number; lampCoupled?: boolean }>
  /** Number of desk lamps ON (0..2). Scales ambient and the lamp-coupled light after the blend. Default 2 (factor 1). */
  lampsOn?: number
}

export function MemoryShiftDriver({ memoryShifted, ambientRef, pointRefs, pointBases, lampsOn = 2 }: MemoryShiftDriverProps) {
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  const reduced = useReducedMotion()
  const target: 0 | 1 = memoryShifted ? 1 : 0

  const tRef = useRef<number>(target)
  const targetRef = useRef<0 | 1>(target)
  const reducedRef = useRef(reduced)
  const targetsRef = useRef<ShiftTargets | null>(null)
  const lampRef = useRef<LampLightFactors>(lampLightFactors(lampsOn))
  targetRef.current = target
  reducedRef.current = reduced
  lampRef.current = lampLightFactors(lampsOn)

  useLayoutEffect(() => {
    // Attach the screen textures first: the base colour depends on whether a map is present.
    ensureSharedTextures()
    const ambient = ambientRef.current
    const bg = scene.background instanceof Color ? scene.background : null
    const fog = scene.fog instanceof Fog ? scene.fog : null
    const points: ShiftTargets['points'] = []
    pointRefs.forEach((ref, i) => {
      if (ref.current) {
        points.push({ light: ref.current, baseColor: pointBases[i].color, baseIntensity: pointBases[i].intensity, lampCoupled: pointBases[i].lampCoupled })
      }
    })
    targetsRef.current = {
      background: bg,
      fog,
      ambient,
      points,
      wall: materials.wall,
      screens: [
        { material: materials.crtScreen, baseColor: crtScreenBaseColor(materials.crtScreen.map !== null) },
        { material: materials.arcadeScreenSnake, baseColor: arcadeScreenBaseColor('snake', materials.arcadeScreenSnake.map !== null) },
        { material: materials.arcadeScreenMaze, baseColor: arcadeScreenBaseColor('maze', materials.arcadeScreenMaze.map !== null) },
        { material: materials.arcadeScreenFrequency, baseColor: arcadeScreenBaseColor('frequency', materials.arcadeScreenFrequency.map !== null) },
      ],
      overlays: overlayMaterials,
      couch: (['couchBody', 'couchCushion', 'couchPillow', 'armchairBody', 'armchairCushion'] as const).map((key) => ({
        material: materials[key],
        baseColor: couchBaseColor(key, materials[key].map !== null),
      })),
    }
    applyShift(tRef.current, targetsRef.current, lampRef.current)
    invalidate()
    return () => {
      targetsRef.current = null
    }
  }, [scene, ambientRef, pointRefs, pointBases, invalidate])

  // A target or reduced-motion change must produce at least one frame in demand mode.
  useLayoutEffect(() => {
    if (reduced && tRef.current !== target) {
      tRef.current = target
      if (targetsRef.current) applyShift(target, targetsRef.current, lampRef.current)
    }
    invalidate()
  }, [target, reduced, invalidate])

  // A lamp switching on or off re-applies the current blend with the new factors (computed from the bases, so
  // nothing accumulates) and requests a frame for the demand frameloop.
  useLayoutEffect(() => {
    if (targetsRef.current) applyShift(tRef.current, targetsRef.current, lampRef.current)
    invalidate()
  }, [lampsOn, invalidate])

  useFrame((_, dt) => {
    const goal = targetRef.current
    if (tRef.current === goal || !targetsRef.current) return
    tRef.current = advanceProgress(tRef.current, dt, goal, reducedRef.current)
    applyShift(tRef.current, targetsRef.current, lampRef.current)
    if (tRef.current !== goal) invalidate()
  })

  return null
}
