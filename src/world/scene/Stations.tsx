/** CRT + VHS player and arcade cabinet. Screens use shared materials that only the Memory_Shift blend tints; lock state is not an input. */
import { ROOM, type PropDef } from '../layout/roomLayout'
import { Block } from './Room'
import { geometries, materials } from './sharedResources'

function propById(id: string): PropDef {
  const p = ROOM.props.find((q) => q.id === id)
  if (!p) throw new Error(`Missing prop ${id}`)
  return p
}

function CrtVhs() {
  const { box, height } = propById('crt-vhs')
  const cx = (box.minX + box.maxX) / 2
  const front = box.maxZ
  const w = box.maxX - box.minX
  const d = box.maxZ - box.minZ
  const standH = 0.5
  const playerH = 0.1
  const crtY0 = standH + playerH
  const crtH = height - crtY0
  return (
    <group>
      <Block box={box} h={standH} material={materials.wood} />
      <mesh geometry={geometries.box} material={materials.plastic} position={[cx, standH + playerH / 2, front - d * 0.4]} scale={[w * 0.85, playerH, d * 0.8]} />
      <mesh geometry={geometries.cylinder} material={materials.led} position={[cx + w * 0.3, standH + playerH / 2, front + 0.005]} rotation={[Math.PI / 2, 0, 0]} scale={[0.025, 0.01, 0.025]} />
      <mesh geometry={geometries.box} material={materials.plastic} position={[cx, crtY0 + crtH / 2, front - d * 0.45]} scale={[w * 0.9, crtH, d * 0.9]} />
      <mesh geometry={geometries.plane} material={materials.crtScreen} position={[cx - 0.05, crtY0 + crtH / 2, front + 0.005]} scale={[w * 0.6, crtH * 0.7, 1]} />
    </group>
  )
}

function ArcadeCabinet() {
  const { box, height } = propById('arcade-cabinet')
  const cx = (box.minX + box.maxX) / 2
  const front = box.maxZ
  const w = box.maxX - box.minX
  const d = box.maxZ - box.minZ
  const baseH = 1.0
  const upperD = d * 0.6
  const upperY0 = baseH + 0.1
  const upperH = height - upperY0
  return (
    <group>
      <Block box={box} h={baseH} material={materials.cabinet} />
      {/* Control panel */}
      <mesh geometry={geometries.box} material={materials.plastic} position={[cx, baseH + 0.05, box.minZ + d / 2]} scale={[w, 0.1, d]} />
      <mesh geometry={geometries.cylinder} material={materials.metal} position={[cx - 0.15, baseH + 0.15, front - 0.2]} scale={[0.03, 0.12, 0.03]} />
      <mesh geometry={geometries.cylinder} material={materials.led} position={[cx + 0.1, baseH + 0.11, front - 0.2]} scale={[0.07, 0.02, 0.07]} />
      <mesh geometry={geometries.cylinder} material={materials.crtScreen} position={[cx + 0.25, baseH + 0.11, front - 0.2]} scale={[0.07, 0.02, 0.07]} />
      {/* Upper body, set back so the control panel overhangs */}
      <mesh geometry={geometries.box} material={materials.cabinet} position={[cx, upperY0 + upperH / 2, box.minZ + upperD / 2]} scale={[w, upperH, upperD]} />
      {/* Idle attract screen: fixed material, identical regardless of any state */}
      <mesh geometry={geometries.plane} material={materials.arcadeScreen} position={[cx, upperY0 + upperH * 0.45, box.minZ + upperD + 0.005]} scale={[w * 0.8, upperH * 0.5, 1]} />
      {/* Marquee */}
      <mesh geometry={geometries.plane} material={materials.poster} position={[cx, height - 0.1, box.minZ + upperD + 0.005]} scale={[w * 0.8, 0.14, 1]} />
    </group>
  )
}

export function Stations() {
  return (
    <group>
      <CrtVhs />
      <ArcadeCabinet />
    </group>
  )
}
