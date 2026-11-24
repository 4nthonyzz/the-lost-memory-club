/** Reception desk, shelves with instanced tapes, and environmental details. Sizes come from ROOM props. */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { ROOM, type PropDef } from '../layout/roomLayout'
import { Block } from './Room'
import { geometries, materials } from './sharedResources'

function propById(id: string): PropDef {
  const p = ROOM.props.find((q) => q.id === id)
  if (!p) throw new Error(`Missing prop ${id}`)
  return p
}

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

function Shelf({ id, facing }: { id: string; facing: 1 | -1 }) {
  const { box, height } = propById(id)
  const ref = useRef<InstancedMesh>(null)
  const zLen = box.maxZ - box.minZ
  const perBoard = Math.floor((zLen - 0.2) / TAPE_PITCH)
  const count = perBoard * (BOARD_YS.length - 1)
  const cx = (box.minX + box.maxX) / 2
  const backX = facing === 1 ? box.minX + 0.02 : box.maxX - 0.02

  const boards = useMemo(() => BOARD_YS, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    let n = 0
    for (let b = 0; b < BOARD_YS.length - 1; b++) {
      for (let i = 0; i < perBoard; i++) {
        o.position.set(cx, BOARD_YS[b] + 0.02 + TAPE_H / 2, box.minZ + 0.2 + i * TAPE_PITCH)
        o.scale.set(TAPE_D, TAPE_H, TAPE_W)
        o.updateMatrix()
        mesh.setMatrixAt(n++, o.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [box.minZ, cx, perBoard])

  return (
    <group>
      {/* Back panel against the wall */}
      <mesh
        geometry={geometries.box}
        material={materials.woodDark}
        position={[backX, height / 2, (box.minZ + box.maxZ) / 2]}
        scale={[0.04, height, zLen]}
      />
      {boards.map((y) => (
        <Block key={y} box={box} y0={y - 0.02} h={0.04} material={materials.wood} />
      ))}
      <instancedMesh ref={ref} args={[geometries.box, materials.tapeBlack, count]} frustumCulled={false} />
    </group>
  )
}

function Door() {
  // North wall, between the two Stations.
  const z = ROOM.bounds.minZ + 0.03
  return (
    <group>
      <mesh geometry={geometries.box} material={materials.doorFrame} position={[0, 1.05, z]} scale={[1.0, 2.1, 0.06]} />
      <mesh geometry={geometries.box} material={materials.woodDark} position={[0, 1.05, z + 0.05]} scale={[0.84, 2.0, 0.04]} />
      <mesh geometry={geometries.cylinder} material={materials.metal} position={[0.3, 1.0, z + 0.09]} rotation={[Math.PI / 2, 0, 0]} scale={[0.06, 0.05, 0.06]} />
    </group>
  )
}

function Details() {
  const nz = ROOM.bounds.minZ
  return (
    <group>
      {/* Rug */}
      <mesh geometry={geometries.plane} material={materials.rug} position={[0, 0.01, -0.8]} rotation={[-Math.PI / 2, 0, 0]} scale={[3, 2, 1]} />
      {/* Crates in the north-west corner */}
      <mesh geometry={geometries.box} material={materials.crate} position={[-4.05, 0.3, nz + 0.4]} scale={[0.7, 0.6, 0.6]} />
      <mesh geometry={geometries.box} material={materials.crate} position={[-4.0, 0.8, nz + 0.4]} scale={[0.5, 0.4, 0.45]} />
      {/* Wall posters */}
      <mesh geometry={geometries.plane} material={materials.poster} position={[-1.3, 1.7, nz + 0.01]} scale={[0.7, 1.0, 1]} />
      <mesh geometry={geometries.plane} material={materials.posterAccent} position={[-1.3, 1.5, nz + 0.02]} scale={[0.5, 0.4, 1]} />
    </group>
  )
}

export function Props() {
  return (
    <group>
      <Desk />
      <Shelf id="shelf-a" facing={1} />
      <Shelf id="shelf-b" facing={-1} />
      <Door />
      <Details />
    </group>
  )
}
