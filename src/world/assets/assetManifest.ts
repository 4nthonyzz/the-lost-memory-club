/**
 * Optional GLB assets keyed by layout object id. The layout stays the source
 * of truth for colliders and anchors; a GLB only decorates a prop.
 * Pure data and helpers: no three.js import. The manifest is empty until
 * real models exist, so the scene renders entirely from primitives.
 */
export interface AssetEntry {
  /** URL under public/, for example '/models/crt-vhs.glb'. */
  readonly path: string
  /** Declared triangle budget for this model (checked, not measured). */
  readonly triangleBudget: number
  /** Free-form note, such as the Blender source name. */
  readonly note?: string
}

export const MAX_TRIANGLES_PER_ASSET = 5000
export const MAX_TRIANGLES_TOTAL = 20000

/** Known layout ids that may receive a GLB: crt-vhs, arcade-cabinet, shelf-a/b/c, armchair, couch, crate. */
export const ASSET_MANIFEST: Readonly<Record<string, AssetEntry>> = Object.freeze({})

export function getAssetEntry(
  id: string,
  manifest: Readonly<Record<string, AssetEntry>> = ASSET_MANIFEST,
): AssetEntry | undefined {
  return Object.prototype.hasOwnProperty.call(manifest, id) ? manifest[id] : undefined
}

/** Returns a list of human-readable problems. An empty list means the manifest is valid. */
export function validateManifest(manifest: Readonly<Record<string, AssetEntry>>): string[] {
  const problems: string[] = []
  let total = 0
  for (const [id, entry] of Object.entries(manifest)) {
    if (!entry.path.startsWith('/models/') || !entry.path.endsWith('.glb')) {
      problems.push(`${id}: path must start with '/models/' and end with '.glb' (got '${entry.path}')`)
    }
    const b = entry.triangleBudget
    if (!Number.isInteger(b) || b <= 0) {
      problems.push(`${id}: triangleBudget must be a positive integer (got ${b})`)
    } else {
      if (b > MAX_TRIANGLES_PER_ASSET) {
        problems.push(`${id}: triangleBudget ${b} exceeds ${MAX_TRIANGLES_PER_ASSET}`)
      }
      total += b
    }
  }
  if (total > MAX_TRIANGLES_TOTAL) {
    problems.push(`total triangleBudget ${total} exceeds ${MAX_TRIANGLES_TOTAL}`)
  }
  return problems
}
