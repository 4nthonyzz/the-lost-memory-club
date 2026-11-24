/** Reception desk, shelves with instanced tapes, and environmental details. Sizes come from ROOM props. */
import { useLayoutEffect, useRef } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { ROOM, type PropDef } from '../layout/roomLayout'
import { Block } from './Room'
import { geometries, materials } from './sharedResources'

function propById(id: string): PropDef {
  const p = ROOM.props.find((q) => q.id === id)
  if (!p) throw new Error(`Missing prop ${id}`)
  return p
}

const DESK_TOP = propById('reception-desk').height
const BOARD_YS = [0.05, 0.55, 1.0, 1.45, 1.95]
const TAPE_PITCH = 0.17
const TAPE_W = 0.03
const TAPE_H = 0.19
const TAPE_D = 0.1

function Desk() {
  const { box, height } = propById('reception-desk')
  const cx = (box.minX + box.maxX) / 2
  const cz = (box.minZ + box.maxZ) / 2
  const topY = height
  return (
    <group>
      <Block box={box} h={height - 0.06} material={materials.woodDark} />
      <mesh
        geometry={geometries.box}
        material={materials.wood}
        position={[cx, topY - 0.03, cz]}
        scale={[box.maxX - box.minX + 0.1, 0.06, box.maxZ - box.minZ + 0.1]}
      />
      {/* Desk lamp */}
      <mesh geometry={geometries.cylinder} material={materials.metal} position={[box.minX + 0.3, topY + 0.02, cz]} scale={[0.16, 0.04, 0.16]} />
      <mesh geometry={geometries.cylinder} material={materials.metal} position={[box.minX + 0.3, topY + 0.2, cz]} scale={[0.03, 0.32, 0.03]} />
      <mesh geometry={geometries.cylinder} material={materials.lampShade} position={[box.minX + 0.3, topY + 0.4, cz]} scale={[0.22, 0.12, 0.22]} />
      {/* VHS archive box and loose tapes */}
      <mesh geometry={geometries.box} material={materials.crate} position={[cx + 0.5, topY + 0.1, cz]} scale={[0.4, 0.2, 0.3]} />
      <mesh geometry={geometries.box} material={materials.tapeBlack} position={[cx - 0.2, topY + 0.015, cz + 0.05]} scale={[0.19, 0.03, 0.1]} />
      <mesh geometry={geometries.box} material={materials.tapeBlack} position={[cx - 0.2, topY + 0.045, cz + 0.05]} scale={[0.19, 0.03, 0.1]} />
    </group>
  )
}

/**
 * Shelf with instanced tapes. Runs along the longer footprint side; the back
 * panel sits on the side nearest the room bounds (the wall it stands against).
 */
function Shelf({ id }: { id: string }) {
  const { box, height } = propById(id)
  const ref = useRef<InstancedMesh>(null)
  const alongX = box.maxX - box.minX > box.maxZ - box.minZ
  const len = alongX ? box.maxX - box.minX : box.maxZ - box.minZ
  const start = alongX ? box.minX : box.minZ
  const perBoard = Math.floor((len - 0.2) / TAPE_PITCH)
  const count = perBoard * (BOARD_YS.length - 1)
  const cx = (box.minX + box.maxX) / 2
  const cz = (box.minZ + box.maxZ) / 2
  const b = ROOM.bounds
  const backX = alongX ? cx : Math.abs(box.minX - b.minX) < Math.abs(box.maxX - b.maxX) ? box.minX + 0.02 : box.maxX - 0.02
  const backZ = alongX ? (Math.abs(box.minZ - b.minZ) < Math.abs(box.maxZ - b.maxZ) ? box.minZ + 0.02 : box.maxZ - 0.02) : cz

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    let n = 0
    for (let row = 0; row < BOARD_YS.length - 1; row++) {
      for (let i = 0; i < perBoard; i++) {
        const t = start + 0.2 + i * TAPE_PITCH
        const y = BOARD_YS[row] + 0.02 + TAPE_H / 2
        if (alongX) {
          o.position.set(t, y, cz)
          o.scale.set(TAPE_W, TAPE_H, TAPE_D)
        } else {
          o.position.set(cx, y, t)
          o.scale.set(TAPE_D, TAPE_H, TAPE_W)
        }
        o.updateMatrix()
        mesh.setMatrixAt(n++, o.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [alongX, cx, cz, perBoard, start])

  return (
    <group>
      <mesh
        geometry={geometries.box}
        material={materials.woodDark}
        position={[backX, height / 2, backZ]}
        scale={alongX ? [len, height, 0.04] : [0.04, height, len]}
      />
      {BOARD_YS.map((y) => (
        <Block key={y} box={box} y0={y - 0.02} h={0.04} material={materials.wood} />
      ))}
      <instancedMesh ref={ref} args={[geometries.box, materials.tapeBlack, count]} frustumCulled={false} />
    </group>
  )
}

function Chair() {
  const { box } = propById('abandoned-chair')
  const { minX, maxX, minZ, maxZ } = box
  const leg = 0.05
  const seatY = 0.45
  const legBox = (x: number, z: number) => ({ minX: x, maxX: x + leg, minZ: z, maxZ: z + leg })
  return (
    <group>
      <Block box={box} y0={seatY} h={0.06} material={materials.wood} />
      <Block box={{ minX, maxX, minZ: maxZ - 0.05, maxZ }} y0={seatY + 0.06} h={0.4} material={materials.wood} />
      <Block box={legBox(minX, minZ)} h={seatY} material={materials.woodDark} />
      <Block box={legBox(maxX - leg, minZ)} h={seatY} material={materials.woodDark} />
      <Block box={legBox(minX, maxZ - leg)} h={seatY} material={materials.woodDark} />
      <Block box={legBox(maxX - leg, maxZ - leg)} h={seatY} material={materials.woodDark} />
    </group>
  )
}

function Couch() {
  const { box } = propById('couch')
  const { minX, maxX, minZ, maxZ } = box
  return (
    <group>
      <Block box={box} h={0.4} material={materials.rug} />
      {/* Backrest on the south side, arms on both ends */}
      <Block box={{ minX, maxX, minZ: maxZ - 0.22, maxZ }} y0={0.4} h={0.5} material={materials.rug} />
      <Block box={{ minX, maxX: minX + 0.2, minZ, maxZ: maxZ - 0.22 }} y0={0.4} h={0.2} material={materials.rug} />
      <Block box={{ minX: maxX - 0.2, maxX, minZ, maxZ: maxZ - 0.22 }} y0={0.4} h={0.2} material={materials.rug} />
    </group>
  )
}

function Details() {
  const crateA = propById('crate-a')
  const crateB = propById('crate-b')
  const stack = propById('tape-stack')
  const posterN = propById('poster-north')
  const posterA = propById('poster-arcade-area')
  const cable = propById('cable-run')
  const sx = (stack.box.minX + stack.box.maxX) / 2
  const sz = (stack.box.minZ + stack.box.maxZ) / 2
  const poster = (p: PropDef) => ({
    x: (p.box.minX + p.box.maxX) / 2,
    z: p.box.maxZ + 0.005,
    w: p.box.maxX - p.box.minX,
  })
  const pn = poster(posterN)
  const pa = poster(posterA)
  return (
    <group>
      {/* Rug (decal only, no layout entry) */}
      <mesh geometry={geometries.plane} material={materials.rug} position={[0, 0.01, -0.8]} rotation={[-Math.PI / 2, 0, 0]} scale={[3, 2, 1]} />
      <Block box={crateA.box} h={crateA.height} material={materials.crate} />
      <Block box={crateB.box} h={crateB.height} material={materials.crate} />
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
      <mesh geometry={geometries.plane} material={materials.poster} position={[pn.x, 1.7, pn.z]} scale={[pn.w, posterN.height, 1]} />
      <mesh geometry={geometries.plane} material={materials.posterAccent} position={[pn.x, 1.5, pn.z + 0.005]} scale={[pn.w * 0.7, posterN.height * 0.4, 1]} />
      <mesh geometry={geometries.plane} material={materials.posterAccent} position={[pa.x, 1.7, pa.z]} scale={[pa.w, posterA.height, 1]} />
      <mesh geometry={geometries.plane} material={materials.poster} position={[pa.x, 1.5, pa.z + 0.005]} scale={[pa.w * 0.7, posterA.height * 0.4, 1]} />
      {/* Cable run on the floor */}
      <Block box={cable.box} y0={0.005} h={cable.height} material={materials.plastic} />
    </group>
  )
}

export function Props() {
  return (
    <group>
      <Desk />
      <Shelf id="shelf-a" />
      <Shelf id="shelf-b" />
      <Shelf id="shelf-c" />
      <Chair />
      <Couch />
      <Details />
    </group>
  )
}
