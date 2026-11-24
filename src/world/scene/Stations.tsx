/**
 * CRT television, VCR deck and arcade cabinet, built from primitives (see modelDetail.ts).
 * Screens use shared materials that only the Memory_Shift blend tints; lock state is not an input.
 * Each object takes only layout-derived props. Task 13.2 wraps them in AssetModel: the primitive is the\n * fallback, and a GLB (when the manifest has one) replaces only the body.\n *\n * The screens stay outside the swapped asset: CrtScreen and ArcadeScreen always render the shared\n * crtScreen / arcadeScreen materials (Memory_Shift tint, Effects overlay placement). A GLB must\n * therefore leave the screen face open and not model its own screen. The 'crt-light' point light\n * lives in Lighting.tsx and is unaffected.
 */
import { useMemo, type ReactNode } from 'react'
import { ROOM, type PropDef } from '../layout/roomLayout'
import type { Aabb, Facing } from '../worldTypes'
import {
  arcadeCabinetParts,
  bulletinBoardParts,
  consoleTapeParts,
  crtTelevisionParts,
  filingCabinetParts,
  mediaConsoleParts,
  referenceMonitorParts,
  vcrDeckParts,
} from './modelDetail'
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

/** VCR on the console's lower shelf: front slot, inserted cassette, buttons and display strip. */
export function VcrDeck({ box }: { box: Aabb }) {
  const parts = useMemo(() => vcrDeckParts(box), [box])
  return <PartMeshes parts={parts} />
}

/** Wide wooden media console with a VCR bay, a cabinet, stacked tapes and a small reference monitor (own dim screen). */
export function MediaConsole({ box }: { box: Aabb }) {
  const parts = useMemo(() => [...mediaConsoleParts(box), ...consoleTapeParts(box), ...referenceMonitorParts(box)], [box])
  return <PartMeshes parts={parts} />
}

/** Metal filing cabinet with recessed drawers, pulls and label slots (task 18.3). `variant` picks the grey. */
export function FilingCabinet({ box, height, variant = 0 }: BoxHeightProps & { variant?: number }) {
  const parts = useMemo(() => filingCabinetParts(box, height, variant), [box, height, variant])
  return <PartMeshes parts={parts} />
}

/** Framed cork bulletin board on the north wall with the pinned-notes texture (task 18.3). */
export function BulletinBoard() {
  const parts = useMemo(bulletinBoardParts, [])
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
  const cabinetA = propById('filing-cabinet-a')
  const cabinetB = propById('filing-cabinet-b')
  const arcade = propById('arcade-cabinet')
  return (
    <group>
      {/* Island: CRT, console, VCR, tapes and reference monitor are one asset facing +Z; the CRT screen plane is drawn separately below. */}
      <AssetModel
        id="crt-vhs"
        {...assetPlacement(crt.box, crt.facing)}
        fallback={
          <Faced box={crt.box} facing={crt.facing}>
            {(local) => (
              <>
                <CrtTelevision box={local} height={crt.height} screen={false} />
                <MediaConsole box={local} />
                <VcrDeck box={local} />
              </>
            )}
          </Faced>
        }
      />
      <Faced box={crt.box} facing={crt.facing}>
        {(local) => <CrtScreen box={local} height={crt.height} />}
      </Faced>
      {/* North wall focal zone placeholders (18.3 adds detail and the cork texture). */}
      {[cabinetA, cabinetB].map((c, i) => (
        <Faced key={c.id} box={c.box} facing={c.facing}>
          {(local) => <FilingCabinet box={local} height={c.height} variant={i} />}
        </Faced>
      ))}
      <BulletinBoard />
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