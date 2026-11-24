/** Reception desk, shelves with instanced tapes, furniture and environmental details. Sizes come from ROOM props. */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import { AssetModel } from '../assets/AssetModel'
import { ROOM, type PropDef } from '../layout/roomLayout'
import type { Aabb } from '../worldTypes'
import {
  TAPE_PALETTE,
  arcadeCabinetParts,
  arcadeFloorParts,
  armchairParts,
  couchParts,
  crateParts,
  crtStackParts,
  deskParts,
  labelSize,
  posterParts,
  shelfFrameParts,
  shelfTapes,
} from './modelDetail'
import { assetPlacement } from './assetPlacement'
import { PartMeshes } from './PartMeshes'
import { Block } from './Room'
import { geometries, materials } from './sharedResources'
import { Faced } from './Stations'

function propById(id: string): PropDef {
  const p = ROOM.props.find((q) => q.id === id)
  if (!p) throw new Error(`Missing prop ${id}`)
  return p
}

const DESK_TOP = propById('reception-desk').height

export function Desk({ box, height }: { box: Aabb; height: number }) {
  const parts = useMemo(() => deskParts(box, height), [box, height])
  return <PartMeshes parts={parts} />
}

/**
 * Wooden shelf (frame parts) plus two InstancedMeshes: tape spines with per-instance colours from a
 * seeded palette, and one label strip per tape. Tape layout is pure data from modelDetail.ts.
 */
export function Shelf({ id, box, height }: { id: string; box: Aabb; height: number }) {
  const spines = useRef<InstancedMesh>(null)
  const labels = useRef<InstancedMesh>(null)
  const frame = useMemo(() => shelfFrameParts(box, height), [box, height])
  const tapes = useMemo(() => shelfTapes(id, box), [id, box])

  useLayoutEffect(() => {
    const s = spines.current
    const l = labels.current
    if (!s || !l) return
    const o = new Object3D()
    const c = new Color()
    tapes.forEach((t, i) => {
      o.rotation.set(0, 0, 0)
      o.position.set(t.pos[0], t.pos[1], t.pos[2])
      o.scale.set(t.size[0], t.size[1], t.size[2])
      o.updateMatrix()
      s.setMatrixAt(i, o.matrix)
      s.setColorAt(i, c.set(TAPE_PALETTE[t.paletteIndex]))
      const [lw, lh] = labelSize(t.size[1])
      o.position.set(t.labelPos[0], t.labelPos[1], t.labelPos[2])
      o.rotation.set(0, t.labelRotY, 0)
      o.scale.set(lw, lh, 1)
      o.updateMatrix()
      l.setMatrixAt(i, o.matrix)
    })
    s.instanceMatrix.needsUpdate = true
    if (s.instanceColor) s.instanceColor.needsUpdate = true
    l.instanceMatrix.needsUpdate = true
    s.computeBoundingSphere()
    l.computeBoundingSphere()
  }, [tapes])

  return (
    <group>
      <PartMeshes parts={frame} />
      <instancedMesh ref={spines} args={[geometries.box, materials.tapeSpine, tapes.length]} />
      <instancedMesh ref={labels} args={[geometries.plane, materials.tapeLabel, tapes.length]} />
    </group>
  )
}

export function Armchair({ box }: { box: Aabb }) {
  const parts = useMemo(() => armchairParts(box), [box])
  return <PartMeshes parts={parts} />
}

export function Couch({ box }: { box: Aabb }) {
  const parts = useMemo(() => couchParts(box), [box])
  return <PartMeshes parts={parts} />
}

export function Crate({ box, height }: { box: Aabb; height: number }) {
  const parts = useMemo(() => crateParts(box, height), [box, height])
  return <PartMeshes parts={parts} />
}
function Details() {
  const crateA = propById('crate-a')
  const crateB = propById('crate-b')
  const stack = propById('tape-stack')
  const cable = propById('cable-run')
  const sx = (stack.box.minX + stack.box.maxX) / 2
  const sz = (stack.box.minZ + stack.box.maxZ) / 2
  const posters = useMemo(posterParts, [])
  return (
    <group>
      {/* Rug (decal only, no layout entry) */}
      <mesh geometry={geometries.plane} material={materials.rug} position={[0, 0.01, -0.8]} rotation={[-Math.PI / 2, 0, 0]} scale={[3, 2, 1]} />
      {[crateA, crateB].map((c) => (
        <AssetModel key={c.id} id={c.id} {...assetPlacement(c.box)} fallback={<Crate box={c.box} height={c.height} />} />
      ))}
      {/* Tape stack on the reception desk top */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          geometry={geometries.box}
          material={materials.tapeBlack}
          position={[sx, DESK_TOP + 0.02 + i * 0.05, sz]}
          scale={[stack.box.maxX - stack.box.minX, 0.04, stack.box.maxZ - stack.box.minZ]}
        />
      ))}
      {/* Framed posters: textured planes inside four-piece wooden frames */}
      <PartMeshes parts={posters} />
      {/* Cable run on the floor */}
      <Block box={cable.box} y0={0.005} h={cable.height} material={materials.plastic} />
    </group>
  )
}

/**
 * Memory_Shift set dressing: an extra poster on the north wall and an altered plaque on the
 * south wall. Visual only (no Collider, no layout entry). Materials are transparent and
 * hidden until the shift blend starts.
 */
function ShiftDressing() {
  return (
    <group>
      <mesh geometry={geometries.plane} material={materials.shiftPoster} position={[-1.2, 1.7, -3.94]} scale={[0.6, 1.2, 1]} />
      <mesh geometry={geometries.plane} material={materials.shiftPlaque} position={[0.8, 1.7, 3.99]} rotation={[0, Math.PI, 0]} scale={[0.6, 0.3, 1]} />
    </group>
  )
}

/**
 * Arcade_Area dressing (task 15.6): a powered-down companion cabinet, stacked CRT monitors, a floor
 * runner decal and cable runs. Solid pieces get their Colliders from the layout; nothing here is
 * interactive and nothing animates.
 */
function PoweredDownCabinet({ box, height }: { box: Aabb; height: number }) {
  const parts = useMemo(() => arcadeCabinetParts(box, height, false), [box, height])
  return <PartMeshes parts={parts} />
}

function CrtStack({ box, height }: { box: Aabb; height: number }) {
  const parts = useMemo(() => crtStackParts(box, height), [box, height])
  return <PartMeshes parts={parts} />
}

function ArcadeAreaDressing() {
  const companion = propById('arcade-companion')
  const stack = propById('crt-stack')
  const floor = useMemo(arcadeFloorParts, [])
  return (
    <group>
      <Faced box={companion.box} facing={companion.facing}>
        {(local) => <PoweredDownCabinet box={local} height={companion.height} />}
      </Faced>
      <Faced box={stack.box} facing={stack.facing}>
        {(local) => <CrtStack box={local} height={stack.height} />}
      </Faced>
      <PartMeshes parts={floor} />
    </group>
  )
}

export function Props() {
  const desk = propById('reception-desk')
  const chair = propById('abandoned-chair')
  const couch = propById('couch')
  return (
    <group>
      <ShiftDressing />
      <Desk box={desk.box} height={desk.height} />
      {(['shelf-a', 'shelf-b', 'shelf-c'] as const).map((id) => {
        const s = propById(id)
        // The shelf GLB is authored along X; assetPlacement rotates it 90 degrees for the Z-long west shelves.
        return (
          <AssetModel key={id} id={id} {...assetPlacement(s.box)} fallback={<Shelf id={id} box={s.box} height={s.height} />} />
        )
      })}
      <AssetModel id="armchair" {...assetPlacement(chair.box)} fallback={<Armchair box={chair.box} />} />
      <AssetModel id="couch" {...assetPlacement(couch.box)} fallback={<Couch box={couch.box} />} />
      <Details />
      <ArcadeAreaDressing />
    </group>
  )
}
