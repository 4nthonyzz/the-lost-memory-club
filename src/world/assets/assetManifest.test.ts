import { describe, expect, it } from 'vitest'
import {
  ASSET_MANIFEST,
  MAX_TRIANGLES_PER_ASSET,
  MAX_TRIANGLES_TOTAL,
  validateManifest,
  type AssetEntry,
} from './assetManifest'
import { ROOM, STATION_DEFS } from '../layout/roomLayout'

/** Reads the spec asset log as raw text (no @types/node available). */
const logFiles = import.meta.glob('../../../.kiro/specs/world-exploration/asset-log.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const assetLog = Object.values(logFiles)[0] ?? ''

const entry = (path: string, triangleBudget: number): AssetEntry => ({ path, triangleBudget })

/** Test-local check: every manifest key must be a layout prop id or a station id. */
function unknownIds(manifest: Readonly<Record<string, AssetEntry>>): string[] {
  const known = new Set<string>([...ROOM.props.map((p) => p.id), ...STATION_DEFS.map((s) => s.id)])
  return Object.keys(manifest).filter((id) => !known.has(id))
}

describe('real asset manifest', () => {
  it('validates with no problems', () => {
    expect(validateManifest(ASSET_MANIFEST)).toEqual([])
  })

  it('has valid paths and budgets for every entry (if any)', () => {
    let sum = 0
    for (const e of Object.values(ASSET_MANIFEST)) {
      expect(e.path.startsWith('/models/')).toBe(true)
      expect(e.path.endsWith('.glb')).toBe(true)
      expect(e.triangleBudget).toBeLessThanOrEqual(MAX_TRIANGLES_PER_ASSET)
      sum += e.triangleBudget
    }
    expect(sum).toBeLessThanOrEqual(MAX_TRIANGLES_TOTAL)
  })

  it('only references ids that exist in the room layout', () => {
    expect(unknownIds(ASSET_MANIFEST)).toEqual([])
  })
})

describe('validateManifest detects violations', () => {
  const flagged = (id: string, e: AssetEntry) => {
    const problems = validateManifest({ [id]: e })
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.join('\n')).toContain(id)
  }

  it('flags an over-budget asset (5001)', () => flagged('big', entry('/models/big.glb', 5001)))
  it('flags a path outside /models/', () => flagged('tmp', entry('/tmp/x.glb', 100)))
  it('flags a relative path', () => flagged('rel', entry('models/x.glb', 100)))
  it('flags a non-.glb extension', () => flagged('gltf', entry('/models/x.gltf', 100)))
  it('flags a zero budget', () => flagged('zero', entry('/models/z.glb', 0)))
  it('flags a non-integer budget', () => flagged('frac', entry('/models/f.glb', 12.5)))

  it('flags a total above 20,000', () => {
    const many: Record<string, AssetEntry> = {}
    for (let i = 0; i < 5; i++) many[`p${i}`] = entry(`/models/p${i}.glb`, 4500)
    const problems = validateManifest(many)
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.join('\n')).toContain('total')
  })

  it('accepts a fixture at the exact limits', () => {
    const ok: Record<string, AssetEntry> = {}
    for (let i = 0; i < 4; i++) ok[`p${i}`] = entry(`/models/p${i}.glb`, 5000)
    expect(validateManifest(ok)).toEqual([])
  })
})

describe('manifest id consistency with the layout', () => {
  it('accepts known layout and station ids', () => {
    expect(unknownIds({ 'crt-vhs': entry('/models/a.glb', 1), vhs: entry('/models/b.glb', 1) })).toEqual([])
  })

  it('reports an unknown id', () => {
    const unknown = unknownIds({ 'not-in-layout': entry('/models/a.glb', 1) })
    expect(unknown).toEqual(['not-in-layout'])
  })
})

describe('asset log documentation', () => {
  it('is found and states that nothing was generated', () => {
    expect(assetLog.length).toBeGreaterThan(0)
    expect(assetLog).toContain('NOT GENERATED')
    expect(assetLog).toContain('NOT MEASURED')
  })

  it.each([
    ['crt_vhs', 'crt-vhs'],
    ['arcade_cabinet', 'arcade-snake'],
    ['arcade_cabinet', 'arcade-maze'],
    ['arcade_cabinet', 'arcade-frequency'],
    ['shelf', 'shelf-a'],
    ['armchair', 'abandoned-chair'],
    ['couch', 'couch'],
    ['crate', 'crate-a'],
  ])('documents generate_assets.py name %s as mapping to manifest id %s', (name, id) => {
    const row = assetLog.split('\n').find((l) => l.startsWith(`| ${name} |`))
    expect(row).toBeDefined()
    expect(row).toContain(id)
    expect(unknownIds({ [id]: entry('/models/a.glb', 1) })).toEqual([])
  })
})
