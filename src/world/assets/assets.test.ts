import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Texture } from 'three'
import { ASSET_MANIFEST, getAssetEntry, validateManifest, type AssetEntry } from './assetManifest'

const loaderState = vi.hoisted(() => ({ mode: 'reject' as 'reject' | 'resolve', scene: null as unknown }))

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(_path: string, onLoad: (g: unknown) => void, _p: unknown, onError: (e: unknown) => void) {
      if (loaderState.mode === 'resolve') onLoad({ scene: loaderState.scene })
      else onError(new Error('404'))
    }
  },
}))

import { acquireGlb, disposeGltfScene, getGlbRefCount, releaseGlb, resetGlbState, warnOnce } from './loadGlb'
import { AssetModel, resolveAssetState } from './AssetModel'

const entry = (path: string, triangleBudget: number): AssetEntry => ({ path, triangleBudget })

beforeEach(() => resetGlbState())
afterEach(() => vi.restoreAllMocks())

describe('assetManifest', () => {
  it('is empty and valid by default', () => {
    expect(Object.keys(ASSET_MANIFEST)).toHaveLength(0)
    expect(getAssetEntry('crt-vhs')).toBeUndefined()
    expect(validateManifest(ASSET_MANIFEST)).toEqual([])
  })

  it('accepts a valid entry', () => {
    expect(validateManifest({ crate: entry('/models/crate.glb', 800) })).toEqual([])
  })

  it('flags bad paths, bad budgets and total over budget', () => {
    expect(validateManifest({ a: entry('/img/a.glb', 10) })).toHaveLength(1)
    expect(validateManifest({ a: entry('/models/a.png', 10) })).toHaveLength(1)
    expect(validateManifest({ a: entry('/models/a.glb', 5001) })).toHaveLength(1)
    expect(validateManifest({ a: entry('/models/a.glb', 0) })).toHaveLength(1)
    expect(validateManifest({ a: entry('/models/a.glb', 1.5) })).toHaveLength(1)
    const many: Record<string, AssetEntry> = {}
    for (let i = 0; i < 5; i++) many[`p${i}`] = entry(`/models/p${i}.glb`, 4500)
    const problems = validateManifest(many)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('total')
  })
})

describe('loadGlb', () => {
  it('warnOnce logs once per path with the exact message', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    warnOnce('/models/a.glb')
    warnOnce('/models/a.glb')
    warnOnce('/models/b.glb')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith('[world] GLB asset failed to load, using primitive fallback: /models/a.glb')
  })

  it('rejects inside the promise and warns once across repeated failures', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    loaderState.mode = 'reject'
    await expect(acquireGlb('/models/x.glb')).rejects.toThrow()
    releaseGlb('/models/x.glb')
    await expect(acquireGlb('/models/x.glb')).rejects.toThrow()
    releaseGlb('/models/x.glb')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('disposes geometry, material and texture of a scene', () => {
    const geometry = new BoxGeometry()
    const texture = new Texture()
    const material = new MeshBasicMaterial({ map: texture })
    const gSpy = vi.spyOn(geometry, 'dispose')
    const mSpy = vi.spyOn(material, 'dispose')
    const tSpy = vi.spyOn(texture, 'dispose')
    const root = new Group()
    root.add(new Mesh(geometry, material))
    disposeGltfScene(root)
    expect(gSpy).toHaveBeenCalledTimes(1)
    expect(mSpy).toHaveBeenCalledTimes(1)
    expect(tSpy).toHaveBeenCalledTimes(1)
  })

  it('ref counts and disposes the cached scene only at zero', async () => {
    const geometry = new BoxGeometry()
    const gSpy = vi.spyOn(geometry, 'dispose')
    const scene = new Group()
    scene.add(new Mesh(geometry, new MeshBasicMaterial()))
    loaderState.mode = 'resolve'
    loaderState.scene = scene
    await acquireGlb('/models/ok.glb')
    await acquireGlb('/models/ok.glb')
    expect(getGlbRefCount('/models/ok.glb')).toBe(2)
    releaseGlb('/models/ok.glb')
    expect(gSpy).not.toHaveBeenCalled()
    releaseGlb('/models/ok.glb')
    expect(gSpy).toHaveBeenCalledTimes(1)
    expect(getGlbRefCount('/models/ok.glb')).toBe(0)
  })
})

describe('AssetModel', () => {
  it('renders the fallback immediately when the manifest has no entry', () => {
    const html = renderToStaticMarkup(
      createElement(AssetModel, { id: 'crt-vhs', fallback: createElement('i', null, 'primitive') }),
    )
    expect(html).toBe('<i>primitive</i>')
  })

  // R3F elements cannot be rendered in jsdom here, so the swap logic is tested through its pure state machine.
  it('resolveAssetState keeps fallback until loaded and stays failed', () => {
    expect(resolveAssetState('fallback', 'loaded')).toBe('loaded')
    expect(resolveAssetState('fallback', 'failed')).toBe('failed')
    expect(resolveAssetState('failed', 'loaded')).toBe('failed')
    expect(resolveAssetState('loaded', 'failed')).toBe('loaded')
    expect(resolveAssetState('loaded', 'reset')).toBe('fallback')
  })
})
