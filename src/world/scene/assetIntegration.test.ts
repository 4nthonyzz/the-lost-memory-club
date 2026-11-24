// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, render, waitFor } from '@testing-library/react'
import { ROOM } from '../layout/roomLayout'
import { assetPlacement, facingYaw } from './assetPlacement'

const mocks = vi.hoisted(() => ({ fake: false }))

// Loader mock approach from assets.test.ts: every load fails with a 404.
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(_path: string, _onLoad: unknown, _p: unknown, onError: (e: unknown) => void) {
      onError(new Error('404'))
    }
  },
}))

// The real manifest is empty. When `fake` is set, 'crt-vhs' resolves to a missing file.
vi.mock('../assets/assetManifest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../assets/assetManifest')>()
  return {
    ...actual,
    getAssetEntry: (id: string) =>
      mocks.fake && id === 'crt-vhs'
        ? { path: '/models/missing-crt.glb', triangleBudget: 100 }
        : actual.getAssetEntry(id),
  }
})

import { getAssetEntry } from '../assets/assetManifest'
import { AssetModel } from '../assets/AssetModel'
import { resetGlbState } from '../assets/loadGlb'

const DECORATED_IDS = [
  'crt-vhs',
  'arcade-cabinet',
  'shelf-a',
  'shelf-b',
  'shelf-c',
  'armchair',
  'couch',
  'crate-a',
  'crate-b',
]

beforeEach(() => {
  mocks.fake = false
  resetGlbState()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('asset integration (empty manifest)', () => {
  it('no decorated id has a manifest entry and AssetModel returns the fallback', () => {
    for (const id of DECORATED_IDS) {
      expect(getAssetEntry(id)).toBeUndefined()
      const html = renderToStaticMarkup(createElement(AssetModel, { id, fallback: createElement('i', null, id) }))
      expect(html).toBe(`<i>${id}</i>`)
    }
  })

  it('decorated ids that map to layout props exist in the layout', () => {
    for (const id of ['crt-vhs', 'arcade-cabinet', 'shelf-a', 'shelf-b', 'shelf-c', 'crate-a', 'crate-b', 'couch']) {
      expect(ROOM.props.some((p) => p.id === id)).toBe(true)
    }
    // The layout prop for the 'armchair' asset id is 'abandoned-chair'.
    expect(ROOM.props.some((p) => p.id === 'abandoned-chair')).toBe(true)
  })
})

describe('assetPlacement', () => {
  const prop = (id: string) => ROOM.props.find((p) => p.id === id)!

  it('centres on the footprint at floor level with unit scale', () => {
    const b = prop('crt-vhs').box
    const p = assetPlacement(b)
    expect(p.position).toEqual([(b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2])
    expect(p.scale).toEqual([1, 1, 1])
  })

  it('rotates 90 degrees only for footprints longer along Z (west-wall shelves)', () => {
    expect(assetPlacement(prop('shelf-a').box).rotation[1]).toBeCloseTo(Math.PI / 2)
    expect(assetPlacement(prop('shelf-b').box).rotation[1]).toBeCloseTo(Math.PI / 2)
    expect(assetPlacement(prop('shelf-c').box).rotation[1]).toBe(0)
    expect(assetPlacement(prop('couch').box).rotation[1]).toBe(0)
  })

  it('rotates the +Z-facing model toward the layout facing (arcade cabinet faces -X)', () => {
    const a = prop('arcade-cabinet')
    expect(a.facing).toBe('-x')
    // The footprint is longer in Z, but an explicit facing wins over the shelf rule.
    expect(assetPlacement(a.box, a.facing).rotation[1]).toBeCloseTo(-Math.PI / 2)
    expect([facingYaw('+z'), facingYaw('-z'), facingYaw('+x'), facingYaw('-x')]).toEqual([0, Math.PI, Math.PI / 2, -Math.PI / 2])
    // Model front (+Z) rotated by that yaw points along -X.
    const yaw = assetPlacement(a.box, a.facing).rotation[1]
    expect(Math.sin(yaw)).toBeCloseTo(-1)
    expect(Math.cos(yaw)).toBeCloseTo(0)
  })
})

describe('missing GLB falls back to the primitive', () => {
  it('warns exactly once with the exact message and keeps the fallback', async () => {
    mocks.fake = true
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const ui = () => createElement(AssetModel, { id: 'crt-vhs', fallback: createElement('i', { 'data-testid': 'prim' }, 'primitive') })
    const view = render(ui())
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    expect(spy).toHaveBeenCalledWith('[world] GLB asset failed to load, using primitive fallback: /models/missing-crt.glb')
    expect(view.getByTestId('prim').textContent).toBe('primitive')
    // A second mount of the same failing path does not warn again.
    view.unmount()
    const again = render(ui())
    await new Promise((r) => setTimeout(r, 20))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(again.getByTestId('prim')).toBeTruthy()
  })
})
