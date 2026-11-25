/**
 * Environmental effects (M4): CRT light flicker, CRT screen glow, drifting dust and CRT static.
 * All animation runs in useFrame from accumulated dt (no timers). Under reduced motion every
 * effect is a static equivalent. While `active` is false (the world is inspecting and the
 * frameloop is on demand) nothing animates and nothing calls invalidate().
 * The camera is never touched. No new lights, post-processing or custom shaders.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  MeshBasicMaterial,
  NearestFilter,
  PointLight,
  Points,
  PointsMaterial,
  SRGBColorSpace,
} from 'three'
import { ROOM } from '../layout/roomLayout'
import { useReducedMotion } from '../controller/useReducedMotion'
import { MAX_DT_SEC } from '../logic/palette'
import { crtScreenRect } from './modelDetail'
import {
  DUST_COUNT,
  NOISE_MAX_HZ,
  fillNoise,
  flickeredIntensity,
  glowFactor,
  initDust,
  makeRng,
  shouldUpdateNoise,
  stepAttractClock,
  stepDust,
  INITIAL_ATTRACT_CLOCK,
  type AttractClock,
  type DustBounds,
} from './effectsTiming'
import { updateAnimatedAttractTextures } from './sharedResources'

/** Name given to the CRT point light in Lighting.tsx. */
export const CRT_LIGHT_NAME = 'crt-light'

const NOISE_SIZE = 64
const NOISE_BASE_OPACITY = 0.1

const DUST_MARGIN = 0.3
const DUST_BOUNDS: DustBounds = {
  minX: ROOM.bounds.minX + DUST_MARGIN,
  maxX: ROOM.bounds.maxX - DUST_MARGIN,
  minY: 0.3,
  maxY: ROOM.height - 0.3,
  minZ: ROOM.bounds.minZ + DUST_MARGIN,
  maxZ: ROOM.bounds.maxZ - DUST_MARGIN,
}

/**
 * The CRT screen rectangle from modelDetail.ts (derived from the island console footprint, in world
 * coordinates because the island faces +Z), nudged 5 mm in front of the screen plane.
 */
export function crtScreenPlacement() {
  const prop = ROOM.props.find((p) => p.id === 'crt-vhs')
  if (!prop) return null
  const rect = crtScreenRect(prop.box, prop.height)
  return {
    position: [rect.position[0], rect.position[1], rect.position[2] + 0.005] as [number, number, number],
    scale: [rect.scale[0], rect.scale[1], rect.scale[2]] as [number, number, number],
  }
}

interface NoiseResources {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D | null
  image: ImageData | null
  texture: CanvasTexture
  material: MeshBasicMaterial
  rnd: () => number
}

function createNoise(): NoiseResources {
  const canvas = document.createElement('canvas')
  canvas.width = NOISE_SIZE
  canvas.height = NOISE_SIZE
  const ctx = canvas.getContext('2d')
  const image = ctx ? ctx.createImageData(NOISE_SIZE, NOISE_SIZE) : null
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: NOISE_BASE_OPACITY,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  })
  return { canvas, ctx, image, texture, material, rnd: makeRng(4242) }
}

function refreshNoise(n: NoiseResources): void {
  if (!n.ctx || !n.image) return
  fillNoise(n.image.data, n.rnd)
  n.ctx.putImageData(n.image, 0, 0)
  n.texture.needsUpdate = true
}

export interface EffectsProps {
  /** False pauses all animation and invalidation (world is inspecting). Default true. */
  active?: boolean
}

export function Effects({ active = true }: EffectsProps) {
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  const frameloop = useThree((s) => s.frameloop)
  const reduced = useReducedMotion()

  const placement = useMemo(crtScreenPlacement, [])
  const noise = useMemo(createNoise, [])
  const dust = useMemo(() => {
    const positions = new Float32Array(DUST_COUNT * 3)
    const velocities = new Float32Array(DUST_COUNT * 3)
    initDust(positions, velocities, DUST_BOUNDS)
    const attribute = new BufferAttribute(positions, 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', attribute)
    const material = new PointsMaterial({
      color: '#cfd8ff',
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
    const points = new Points(geometry, material)
    points.frustumCulled = false
    return { positions, velocities, attribute, geometry, material, points }
  }, [])

  const timeRef = useRef(0)
  const noiseAccRef = useRef(0)
  const attractRef = useRef<AttractClock>(INITIAL_ATTRACT_CLOCK)
  const lightRef = useRef<PointLight | null>(null)
  /** Base intensity as last set by the Memory_Shift driver, and the value Effects last wrote. */
  const baseRef = useRef(0)
  const writtenRef = useRef<number | null>(null)

  // First noise frame exists immediately, and exactly once under reduced motion.
  useEffect(() => {
    refreshNoise(noise)
    invalidate()
  }, [noise, invalidate])

  // Static equivalents on reduced motion: factor 1, constant glow, no drift.
  useEffect(() => {
    if (!reduced) return
    noiseAccRef.current = 0
    noise.material.opacity = NOISE_BASE_OPACITY
    const light = lightRef.current
    if (light && writtenRef.current !== null) {
      light.intensity = baseRef.current
      writtenRef.current = baseRef.current
    }
    invalidate()
  }, [reduced, noise, invalidate])

  useEffect(
    () => () => {
      noise.texture.dispose()
      noise.material.dispose()
      dust.geometry.dispose()
      dust.material.dispose()
    },
    [noise, dust],
  )

  useFrame((_, dt) => {
    if (!active) return
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, MAX_DT_SEC) : 0
    timeRef.current += step
    const t = timeRef.current

    if (!lightRef.current) {
      const found = scene.getObjectByName(CRT_LIGHT_NAME)
      if (found instanceof PointLight) lightRef.current = found
    }
    const light = lightRef.current
    if (light) {
      // A value different from the one Effects wrote means the driver set a new base.
      if (writtenRef.current === null || light.intensity !== writtenRef.current) baseRef.current = light.intensity
      const next = flickeredIntensity(baseRef.current, t, reduced)
      light.intensity = next
      writtenRef.current = next
    }

    noise.material.opacity = NOISE_BASE_OPACITY * glowFactor(t, reduced)

    // Animated attract screens (task 29.2): redrawn in place at most 24 times per second (ATTRACT_MAX_HZ; the overlay noise stays at 12 Hz), paused while inactive (this
    // callback returns early), and returned once to the elapsed = 0 static frame under reduced motion.
    const attract = stepAttractClock(attractRef.current, step, true, reduced)
    attractRef.current = attract.clock
    if (attract.redraw) {
      updateAnimatedAttractTextures(attract.clock.elapsed)
      if (reduced) invalidate()
    }

    if (reduced) return

    const throttle = shouldUpdateNoise(noiseAccRef.current, step, NOISE_MAX_HZ, reduced)
    noiseAccRef.current = throttle.accumulator
    if (throttle.update) refreshNoise(noise)

    stepDust(dust.positions, dust.velocities, step, DUST_BOUNDS, reduced)
    dust.attribute.needsUpdate = true

    if (frameloop === 'demand') invalidate()
  })

  return (
    <>
      <primitive object={dust.points} />
      {placement ? (
        <mesh position={placement.position} scale={placement.scale} material={noise.material} renderOrder={2}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ) : null}
    </>
  )
}
