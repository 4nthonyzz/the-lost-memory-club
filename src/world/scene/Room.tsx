/** Floor, ceiling and four walls, all sized from ROOM. Meshes follow the layout; colliders never read from meshes. */
import type { Material } from 'three'
import { ROOM } from '../layout/roomLayout'
import type { Aabb } from '../worldTypes'
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
    </group>
  )
}
