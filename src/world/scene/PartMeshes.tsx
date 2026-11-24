/**
 * Renders a list of primitive Parts. Parts that share a geometry and a material are merged into one
 * InstancedMesh (single parts stay plain meshes), so each object costs one draw call per group.
 * Matrices are written once in a layout effect; nothing is allocated per frame.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import type { Part } from './modelDetail'
import { ensureSharedTextures, geometries, materials } from './sharedResources'

function InstancedGroup({ items }: { items: readonly Part[] }) {
  const ref = useRef<InstancedMesh>(null)
  const first = items[0]
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    items.forEach((p, i) => {
      o.position.set(p.pos[0], p.pos[1], p.pos[2])
      if (p.rot) o.rotation.set(p.rot[0], p.rot[1], p.rot[2])
      else o.rotation.set(0, 0, 0)
      o.scale.set(p.scale[0], p.scale[1], p.scale[2])
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[geometries[first.geo], materials[first.mat], items.length]} />
}

export function PartMeshes({ parts }: { parts: readonly Part[] }) {
  // Idempotent: attaches the procedural textures to the shared materials before the first draw.
  useMemo(ensureSharedTextures, [])
  const groups = useMemo(() => {
    const map = new Map<string, Part[]>()
    for (const p of parts) {
      const key = `${p.geo}|${p.mat}`
      const list = map.get(key)
      if (list) list.push(p)
      else map.set(key, [p])
    }
    return [...map.entries()]
  }, [parts])
  return (
    <group>
      {groups.map(([key, items]) =>
        items.length === 1 ? (
          <mesh
            key={key}
            geometry={geometries[items[0].geo]}
            material={materials[items[0].mat]}
            position={[items[0].pos[0], items[0].pos[1], items[0].pos[2]]}
            scale={[items[0].scale[0], items[0].scale[1], items[0].scale[2]]}
            rotation={items[0].rot ? [items[0].rot[0], items[0].rot[1], items[0].rot[2]] : undefined}
          />
        ) : (
          <InstancedGroup key={key} items={items} />
        ),
      )}
    </group>
  )
}
