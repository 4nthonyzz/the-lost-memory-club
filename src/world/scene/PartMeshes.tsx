/**
 * Renders a list of primitive Parts. Parts that share a geometry and a material are merged into one
 * InstancedMesh (single parts stay plain meshes), so each object costs one draw call per group.
 * Matrices are written once in a layout effect; nothing is allocated per frame.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import { instanceColour, isRealSizePart, partGroupKey, type BookInstance, type Part } from './modelDetail'
import { FABRIC_METRES_PER_REPEAT } from './proceduralTextures'
import { ensureSharedTextures, geometries, materials, metricBoxGeometry, spineGeometries, woodBoxGeometry } from './sharedResources'

/** Metric wood boards use a cached real-size geometry and unit mesh scale; every other part scales the unit geometry. */
const geometryOf = (p: Part) =>
  p.metric
    ? woodBoxGeometry(p.scale[0], p.scale[1], p.scale[2])
    : p.metricFabric
      ? metricBoxGeometry(p.scale[0], p.scale[1], p.scale[2], FABRIC_METRES_PER_REPEAT)
      : p.metricRepeat
        ? metricBoxGeometry(p.scale[0], p.scale[1], p.scale[2], p.metricRepeat)
        : geometries[p.geo]
const scaleOf = (p: Part): [number, number, number] => (isRealSizePart(p) ? [1, 1, 1] : [p.scale[0], p.scale[1], p.scale[2]])

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
      o.scale.set(...scaleOf(p))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[geometryOf(first), materials[first.mat], items.length]} />
}

function BookVariantMesh({ variant, items }: { variant: number; items: readonly BookInstance[] }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    items.forEach((b, i) => {
      o.position.set(b.pos[0], b.pos[1], b.pos[2])
      o.rotation.set(b.rot[0], b.rot[1], b.rot[2])
      o.scale.set(b.size[0], b.size[1], b.size[2])
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      // The instance colour multiplies the spine atlas (or the flat white fallback).
      mesh.setColorAt(i, c.set(instanceColour(b)))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[spineGeometries[variant], materials.bookSpine, items.length]} />
}

/**
 * Books and slipcases of one bookcase: one InstancedMesh per spine variant in use. Every variant has its
 * own unit-box geometry with remapped UVs into the shared spine atlas, so per-instance colour and matrix
 * are the only per-book data (task 18.2).
 */
export function BookMeshes({ instances }: { instances: readonly BookInstance[] }) {
  useMemo(ensureSharedTextures, [])
  const groups = useMemo(() => {
    const map = new Map<number, BookInstance[]>()
    for (const b of instances) {
      const list = map.get(b.variant)
      if (list) list.push(b)
      else map.set(b.variant, [b])
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [instances])
  return (
    <group>
      {groups.map(([variant, items]) => (
        <BookVariantMesh key={variant} variant={variant} items={items} />
      ))}
    </group>
  )
}

export function PartMeshes({ parts }: { parts: readonly Part[] }) {
  // Idempotent: attaches the procedural textures to the shared materials before the first draw.
  useMemo(ensureSharedTextures, [])
  const groups = useMemo(() => {
    const map = new Map<string, Part[]>()
    for (const p of parts) {
      const key = partGroupKey(p)
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
            geometry={geometryOf(items[0])}
            material={materials[items[0].mat]}
            position={[items[0].pos[0], items[0].pos[1], items[0].pos[2]]}
            scale={scaleOf(items[0])}
            rotation={items[0].rot ? [items[0].rot[0], items[0].rot[1], items[0].rot[2]] : undefined}
          />
        ) : (
          <InstancedGroup key={key} items={items} />
        ),
      )}
    </group>
  )
}
