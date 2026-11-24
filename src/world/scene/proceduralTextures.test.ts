import { describe, expect, it } from 'vitest'
import {
  TEXTURE_IDS,
  TEXTURE_MEMORY_BUDGET_BYTES,
  TEXTURE_SPECS,
  drawTexture,
  isPowerOfTwo,
  textureMemoryBytes,
  totalTextureMemoryBytes,
  type TextureId,
} from './proceduralTextures'
import { RecordingContext } from './recordingContext'

function run(id: TextureId, seed?: number): RecordingContext {
  const ctx = new RecordingContext()
  drawTexture(id, ctx, seed)
  return ctx
}

describe('texture specs', () => {
  it('lists every texture with power-of-two sizes', () => {
    expect(TEXTURE_IDS.length).toBeGreaterThanOrEqual(12)
    for (const id of TEXTURE_IDS) {
      const s = TEXTURE_SPECS[id]
      expect(s.id).toBe(id)
      expect(isPowerOfTwo(s.width)).toBe(true)
      expect(isPowerOfTwo(s.height)).toBe(true)
    }
  })

  it('pixel-art textures are nearest-filtered and tiling textures repeat', () => {
    expect(TEXTURE_SPECS.arcadeScreen.filter).toBe('nearest')
    expect(TEXTURE_SPECS.marquee.filter).toBe('nearest')
    for (const id of ['floor', 'wood', 'woodDark', 'crate'] as const) expect(TEXTURE_SPECS[id].wrap).toBe('repeat')
  })
})

describe('determinism', () => {
  it.each(TEXTURE_IDS)('%s draws identically for the same seed and differently for another', (id) => {
    const a = run(id)
    const b = run(id)
    expect(b.log).toEqual(a.log)
    expect(b.hash()).toBe(a.hash())
    expect(run(id, TEXTURE_SPECS[id].seed + 1).hash()).not.toBe(a.hash())
  })

  it('never uses Math.random', () => {
    const original = Math.random
    Math.random = () => {
      throw new Error('Math.random used')
    }
    try {
      for (const id of TEXTURE_IDS) run(id)
    } finally {
      Math.random = original
    }
  })
})

describe('drawing stays inside the canvas', () => {
  it.each(TEXTURE_IDS)('%s keeps rectangles, lines, arcs and text within bounds', (id) => {
    const { width: W, height: H } = TEXTURE_SPECS[id]
    const inX = (x: unknown) => typeof x === 'number' && x >= -1 && x <= W + 1
    const inY = (y: unknown) => typeof y === 'number' && y >= -1 && y <= H + 1
    for (const { op, args } of run(id).calls) {
      if (op === 'fillRect' || op === 'strokeRect') {
        const [x, y, w, h] = args as number[]
        expect(inX(x) && inY(y) && inX(x + w) && inY(y + h), `${op}(${args.join(',')})`).toBe(true)
      } else if (op === 'moveTo' || op === 'lineTo' || op === 'arc') {
        expect(inX(args[0]) && inY(args[1]), `${op}(${args.join(',')})`).toBe(true)
      } else if (op === 'fillText') {
        expect(inX(args[1]) && inY(args[2]), `fillText(${args.join(',')})`).toBe(true)
      }
    }
  })
})

describe('lettering', () => {
  it.each([
    ['arcadeScreen', ['LOST MEMORY', 'PRESS E']],
    ['marquee', ['ARCADE', 'LOST MEMORY CLUB']],
    ['signFace', ['ARCADE']],
    ['posterSunset', ['MIDNIGHT', 'RENTALS']],
    ['posterReel', ['ARCHIVE', 'ARCHIVE 09 · EST. 1996']],
    ['shiftPoster', ['PLEASE REWIND']],
    ['shiftPlaque', ['MEMBERS REMAIN']],
  ] as const)('%s contains its text', (id, expected) => {
    const texts = run(id).texts()
    for (const s of expected) expect(texts).toContain(s)
  })

  it('floor, wood, grille and deck textures contain no text', () => {
    for (const id of ['floor', 'wood', 'woodDark', 'crate', 'grille', 'deck'] as const) expect(run(id).texts()).toEqual([])
  })

  it('uses no real film, brand or franchise names', () => {
    const banned = /BLOCKBUSTER|VHS CLUB|NINTENDO|ATARI|SEGA|PAC-?MAN|KIND REWIND/i
    for (const id of TEXTURE_IDS) for (const s of run(id).texts()) expect(s).not.toMatch(banned)
  })
})

describe('alpha-friendly overlays', () => {
  it.each(['shiftPoster', 'shiftPlaque'] as const)('%s clears first and never fills the whole canvas', (id) => {
    const { width: W, height: H } = TEXTURE_SPECS[id]
    const ctx = run(id)
    const first = ctx.calls.find((c) => c.op === 'clearRect')
    expect(first?.args).toEqual([0, 0, W, H])
    expect(ctx.calls[0].op).toBe('clearRect')
    for (const { op, args } of ctx.calls) {
      if (op !== 'fillRect') continue
      const [x, y, w, h] = args as number[]
      expect(x <= 0 && y <= 0 && x + w >= W && y + h >= H).toBe(false)
    }
  })

  it('opaque textures start by painting the whole canvas', () => {
    const { width: W, height: H } = TEXTURE_SPECS.floor
    const first = run('floor').calls.find((c) => c.op === 'fillRect')
    expect(first?.args[2]).toBeLessThanOrEqual(W)
    expect(first?.args[3]).toBeLessThanOrEqual(H)
  })
})

describe('arcade screen stays dim enough to tint', () => {
  it('uses no pure white fill', () => {
    const fills = run('arcadeScreen').calls.filter((c) => c.op === 'set fillStyle').map((c) => String(c.args[0]).toLowerCase())
    expect(fills).not.toContain('#ffffff')
    expect(fills.length).toBeGreaterThan(10)
  })
})

describe('texture memory estimate', () => {
  it('uses width * height * 4, plus one third for mipmaps', () => {
    expect(textureMemoryBytes({ width: 128, height: 128, filter: 'nearest' })).toBe(65536)
    expect(textureMemoryBytes({ width: 128, height: 128, filter: 'mipmap' })).toBe(Math.round(65536 * 1.33))
  })

  it('stays within the 8 MB budget', () => {
    const total = totalTextureMemoryBytes()
    console.info(
      `[15.7] textures: ${TEXTURE_IDS.length}, ` +
        TEXTURE_IDS.map((id) => `${id} ${TEXTURE_SPECS[id].width}x${TEXTURE_SPECS[id].height}=${(textureMemoryBytes(TEXTURE_SPECS[id]) / 1048576).toFixed(2)}MB`).join(', ') +
        `, total ${(total / 1048576).toFixed(2)} MB (estimate, budget 8 MB)`,
    )
    expect(total).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
  })
})
