/**
 * GLB loading with a ref-counted cache. Failures never throw to callers
 * outside the returned promise, and each failing path warns exactly once.
 */
import { Mesh, type Material, type Object3D, type Texture } from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type { GLTF }

interface CacheEntry {
  promise: Promise<GLTF>
  refs: number
  gltf?: GLTF
}

const cache = new Map<string, CacheEntry>()
const warned = new Set<string>()

/** Logs the fallback warning once per path. */
export function warnOnce(path: string): void {
  if (warned.has(path)) return
  warned.add(path)
  console.warn(`[world] GLB asset failed to load, using primitive fallback: ${path}`)
}

/** Test helper: forget cache and warning state. */
export function resetGlbState(): void {
  cache.clear()
  warned.clear()
}

export function loadGlb(path: string): Promise<GLTF> {
  return new Promise<GLTF>((resolve, reject) => {
    try {
      new GLTFLoader().load(path, resolve, undefined, (err) => reject(err))
    } catch (err) {
      reject(err)
    }
  })
}

/** Loads (or reuses) a GLB and takes one reference. Pair with releaseGlb. Rejections warn once. */
export function acquireGlb(path: string): Promise<GLTF> {
  let entry = cache.get(path)
  if (!entry) {
    const created: CacheEntry = {
      refs: 0,
      promise: loadGlb(path).then(
        (gltf) => {
          created.gltf = gltf
          return gltf
        },
        (err: unknown) => {
          warnOnce(path)
          throw err
        },
      ),
    }
    // Avoid unhandled rejection noise; callers handle their own copy of the promise.
    created.promise.catch(() => undefined)
    cache.set(path, created)
    entry = created
  }
  entry.refs += 1
  return entry.promise
}

/** Drops one reference. At zero the cached scene is disposed and the entry removed. */
export function releaseGlb(path: string): void {
  const entry = cache.get(path)
  if (!entry) return
  entry.refs -= 1
  if (entry.refs > 0) return
  cache.delete(path)
  if (entry.gltf) disposeGltfScene(entry.gltf.scene)
}

export function getGlbRefCount(path: string): number {
  return cache.get(path)?.refs ?? 0
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && (value as Texture).isTexture) (value as Texture).dispose()
  }
  material.dispose()
}

/** Disposes geometries, materials and their textures under `root`. */
export function disposeGltfScene(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const mat = mesh.material
    if (Array.isArray(mat)) mat.forEach(disposeMaterial)
    else if (mat) disposeMaterial(mat)
  })
}
