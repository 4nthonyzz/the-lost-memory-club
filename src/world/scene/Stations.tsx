/**
 * CRT television, VCR deck and arcade cabinet, built from primitives (see modelDetail.ts).
 * Screens use shared materials that only the Memory_Shift blend tints; lock state is not an input.
 * Each object takes only layout-derived props. Task 13.2 wraps them in AssetModel: the primitive is the\n * fallback, and a GLB (when the manifest has one) replaces only the body.\n *\n * The screens stay outside the swapped asset: CrtScreen and ArcadeScreen always render the shared\n * crtScreen / arcadeScreen materials (Memory_Shift tint, Effects overlay placement). A GLB must\n * therefore leave the screen face open and not model its own screen. The 'crt-light' point light\n * lives in Lighting.tsx and is unaffected.
 */
import { useMemo, type ReactNode } from 'react'
import { ROOM, type PropDef } from '../layout/roomLayout'
import type { Aabb, Facing } from '../worldTypes'
import { arcadeCabinetParts, crtTelevisionParts, vcrDeckParts } from './modelDetail'
import { AssetModel } from '../assets/AssetModel'
import { assetPlacement, facingFrame } from './assetPlacement'
import { PartMeshes } from './PartMeshes'

function propById(id: string): PropDef {
  const p = ROOM.props.find((q) => q.id === id)
  if (!p) throw new Error(`Missing prop ${id}`)
  return p
}

export interface BoxHeightProps {
  box: Aabb
  height: number
}

/** Parts of a station primitive, split into the body (swappable) and the screen plane (always drawn). */
function splitScreen(parts: ReturnType<typeof crtTelevisionParts>, mat: 'crtScreen' | 'arcadeScreen') {
  return {
    body: parts.filter((p) => p.mat !== mat),
    screen: parts.filter((p) => p.mat === mat),
  }
}

/** Stepped casing, raised bezel around the fixed crtScreen plane, knobs, LED and antenna stubs. */
export function CrtTelevision({ box, height, screen = true }: BoxHeightProps & { screen?: boolean }) {
  const parts = useMemo(() => {
    const split = splitScreen(crtTelevisionParts(box, height), 'crtScreen')
    return screen ? [...split.body, ...split.screen] : split.body
  }, [box, height, screen])
  return <PartMeshes parts={parts} />
}

/** The fixed emissive CRT screen plane (shared crtScreen material). Always rendered by the primitive layer. */
export function CrtScreen({ box, height }: BoxHeightProps) {
  const parts = useMemo(() => splitScreen(crtTelevisionParts(box, height), 'crtScreen').screen, [box, height])
  return <PartMeshes parts={parts} />
}

/** Wooden stand with a VCR: front slot, inserted cassette, buttons and display strip. */
export function VcrDeck({ box }: { box: Aabb }) {
  const parts = useMemo(() => vcrDeckParts(box), [box])
  return <PartMeshes parts={parts} />
}

/** Angled marquee, side art, recessed screen (shared arcadeScreen), slanted control deck, joystick and 6 buttons. */
export function ArcadeCabinet({ box, height, screen = true }: BoxHeightProps & { screen?: boolean }) {
  const parts = useMemo(() => {
    const split = splitScreen(arcadeCabinetParts(box, height), 'arcadeScreen')
    return screen ? [...split.body, ...split.screen] : split.body
  }, [box, height, screen])
  return <PartMeshes parts={parts} />
}

/** The arcade screen plane (shared arcadeScreen material). Always rendered by the primitive layer. */
export function ArcadeScreen({ box, height }: BoxHeightProps) {
  const parts = useMemo(() => splitScreen(arcadeCabinetParts(box, height), 'arcadeScreen').screen, [box, height])
  return <PartMeshes parts={parts} />
}

/**
 * Places local parts (front toward +Z, footprint centred on the origin) over a world footprint so the
 * front points toward `facing`. The arcade cabinet in the Arcade_Area faces -X, toward the doorways.
 */
export function Faced({ box, facing, children }: { box: Aabb; facing?: Facing; children: (local: Aabb) => ReactNode }) {
  const frame = useMemo(() => facingFrame(box, facing), [box, facing])
  return (
    <group position={frame.position} rotation={[0, frame.rotationY, 0]}>
      {children(frame.local)}
    </group>
  )
}

export function Stations() {
  const crt = propById('crt-vhs')
  const arcade = propById('arcade-cabinet')
  return (
    <group>
      {/* CRT + VCR are one asset; the screen plane is drawn separately below. */}
      <AssetModel
        id="crt-vhs"
        {...assetPlacement(crt.box)}
        fallback={
          <>
            <CrtTelevision box={crt.box} height={crt.height} screen={false} />
            <VcrDeck box={crt.box} />
          </>
        }
      />
      <CrtScreen box={crt.box} height={crt.height} />
      <AssetModel
        id="arcade-cabinet"
        {...assetPlacement(arcade.box, arcade.facing)}
        fallback={
          <Faced box={arcade.box} facing={arcade.facing}>
            {(local) => <ArcadeCabinet box={local} height={arcade.height} screen={false} />}
          </Faced>
        }
      />
      {/* The attract screen is the fixed arcadeScreen material, drawn the same way whatever the lock state. */}
      <Faced box={arcade.box} facing={arcade.facing}>
        {(local) => <ArcadeScreen box={local} height={arcade.height} />}
      </Faced>
    </group>
  )
}