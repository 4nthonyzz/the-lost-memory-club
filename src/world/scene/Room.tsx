/** Floor, ceiling and four walls, all sized from ROOM. Meshes follow the layout; colliders never read from meshes. */
import { useMemo } from 'react'
import type { Material } from 'three'
import { ROOM } from '../layout/roomLayout'
import type { Aabb } from '../worldTypes'
import { ceilingFixtureParts, fixtureCentres, trimParts } from './modelDetail'
import { PartMeshes } from './PartMeshes'
import { geometries, materials } from './sharedResources'

interface BlockProps {
  /** Footprint on the floor plane. */
  box: Aabb
  /** Bottom height in metres. */
  y0?: number
  /** Height in metres. */
  h: number
  material: Material
}

/** A box mesh covering an Aabb footprint between y0 and y0 + h. */
export function Block({ box, y0 = 0, h, material }: BlockProps) {
  return (
    <mesh
      geometry={geometries.box}
      material={material}
      position={[(box.minX + box.maxX) / 2, y0 + h / 2, (box.minZ + box.maxZ) / 2]}
      scale={[box.maxX - box.minX, h, box.maxZ - box.minZ]}
    />
  )
}

const DOOR_HEIGHT = 2.1

/** Door frames (jambs match the frame Colliders), a lintel over the opening and a dark threshold strip. */
function Doors() {
  const { height, doors } = ROOM
  return (
    <group>
      {doors.map((d) => {
        const [a, b] = d.frames
        const lintel: Aabb = {
          minX: a.minX,
          maxX: a.maxX,
          minZ: a.minZ,
          maxZ: b.maxZ,
        }
        const gap: Aabb = { minX: d.opening.minX, maxX: d.opening.maxX, minZ: a.maxZ, maxZ: b.minZ }
        return (
          <group key={d.id}>
            {d.frames.map((f, i) => (
              <Block key={i} box={f} h={DOOR_HEIGHT} material={materials.doorFrame} />
            ))}
            <Block box={lintel} y0={DOOR_HEIGHT} h={height - DOOR_HEIGHT} material={materials.doorFrame} />
            {/* Doorway is open: a flat threshold strip, no leaf blocking the passage. */}
            <mesh
              geometry={geometries.plane}
              material={materials.woodDark}
              position={[(gap.minX + gap.maxX) / 2, 0.012, (gap.minZ + gap.maxZ) / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[gap.maxX - gap.minX, gap.maxZ - gap.minZ, 1]}
            />
          </group>
        )
      })}
    </group>
  )
}

/** Skirting boards and crown trim that follow the layout wall and door-frame boxes. */
export function WallTrim() {
  const parts = useMemo(trimParts, [])
  return <PartMeshes parts={parts} />
}

/** Fluorescent ceiling fixture: metal housing plus an emissive tube box. Not a light source. */
export function CeilingFixture({ x, z }: { x: number; z: number }) {
  const parts = useMemo(() => ceilingFixtureParts(x, z), [x, z])
  return <PartMeshes parts={parts} />
}

export function Room() {
  const { bounds, height, walls } = ROOM
  const w = bounds.maxX - bounds.minX
  const d = bounds.maxZ - bounds.minZ
  const cx = (bounds.minX + bounds.maxX) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  return (
    <group>
      <mesh
        geometry={geometries.plane}
        material={materials.floor}
        position={[cx, 0, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[w, d, 1]}
      />
      <mesh
        geometry={geometries.plane}
        material={materials.ceiling}
        position={[cx, height, cz]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[w, d, 1]}
      />
      {walls.map((box, i) => (
        <Block key={i} box={box} h={height} material={materials.wall} />
      ))}
      <Doors />
      <WallTrim />
      {fixtureCentres().map(([x, z]) => (
        <CeilingFixture key={`:`} x={x} z={z} />
      ))}
    </group>
  )
}
