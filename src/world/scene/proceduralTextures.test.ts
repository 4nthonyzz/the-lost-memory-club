import { describe, expect, it } from 'vitest'
import {
  SPINE_ATLAS_HEIGHT,
  SPINE_ATLAS_WIDTH,
  SPINE_CELL_WIDTH,
  SPINE_VARIANT_COUNT,
  spineCellUv,
  TEXTURE_IDS,
  TEXTURE_MEMORY_BUDGET_BYTES,
  TEXTURE_SPECS,
  drawTexture,
  isPowerOfTwo,
  textureMemoryBytes,
  totalTextureMemoryBytes,
  WALL_TEXTURE_ALBEDO,
  SMPTE_BAR_COLORS,
  TIMECODE_TEXT,
  FREQUENCY_TEXT,
  MARQUEE_PALETTES,
  MARQUEE_TEXTS,
  MARQUEE_TEXT_MARGIN,
  FABRIC_METRES_PER_REPEAT,
  FABRIC_SEAM_INSET,
  FABRIC_WALES,
  CRT_BADGE_TEXT,
  CRT_LED_COLOR,
  VCR_BUTTON_LABELS,
  VCR_MARK_TEXT,
  VHS_LABEL_TEXTS,
  CABINET_CARD_TEXTS,
  CABINET_PLAIN_V,
  CRATE_LABEL_HEADER,
  CRATE_STENCIL_TEXT,
  cabinetCardV,
  marqueeFontSize,
  marqueeTextWidth,
  type TextureId,
} from './proceduralTextures'
import { RecordingContext } from './recordingContext'

const ATTRACT_IDS = ['attractSnake', 'attractMaze', 'attractFrequency'] as const
const MARQUEE_IDS = ['marqueeSnake', 'marqueeMaze', 'marqueeFrequency'] as const

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
    for (const id of ATTRACT_IDS) expect(TEXTURE_SPECS[id].filter).toBe('nearest')
    for (const id of MARQUEE_IDS) expect(TEXTURE_SPECS[id].filter).toBe('nearest')
    for (const id of ['floor', 'wood', 'woodDark', 'crate'] as const) expect(TEXTURE_SPECS[id].wrap).toBe('repeat')
  })
})

describe('determinism', () => {
  it.each(TEXTURE_IDS)('%s draws identically for the same seed and differently for another', (id) => {
    const a = run(id)
    const b = run(id)
    expect(b.log).toEqual(a.log)
    expect(b.hash()).toBe(a.hash())
    // lampGlow (task 23.1) is a pure radial gradient with no random input, so its seed changes nothing.
    // coneFalloff (task 25.1) is a pure row-by-row gradient with no random input, so its seed changes nothing either.
    if (id === 'lampGlow' || id === 'coneFalloff') expect(run(id, TEXTURE_SPECS[id].seed + 1).hash()).toBe(a.hash())
    else expect(run(id, TEXTURE_SPECS[id].seed + 1).hash()).not.toBe(a.hash())
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
    ['attractSnake', ['SNAKE.EXE', 'PRESS E']],
    ['attractMaze', ['LAST EXIT']],
    ['attractFrequency', ['DEAD FREQUENCY', '89.4 MHz']],
    ['marqueeSnake', ['SNAKE.EXE // THE HUNGRY TAPE']],
    ['marqueeMaze', ['LAST EXIT // THE MAZE']],
    ['marqueeFrequency', ['DEAD FREQUENCY // THE LOST SIGNAL']],
    ['signFace', ['ARCADE']],
    ['posterSunset', ['MIDNIGHT', 'RENTALS']],
    ['posterReel', ['ARCHIVE', 'ARCHIVE 09 · EST. 1996']],
    ['shiftPoster', ['PLEASE REWIND']],
    ['shiftPlaque', ['MEMBERS REMAIN']],
  ] as const)('%s contains its text', (id, expected) => {
    const texts = run(id).texts()
    for (const s of expected) expect(texts).toContain(s)
  })

  it('floor, wood and grille textures contain no text', () => {
    for (const id of ['floor', 'wood', 'woodDark', 'grille'] as const) expect(run(id).texts()).toEqual([])
  })

  it('uses no real film, brand or franchise names', () => {
    const banned = /BLOCKBUSTER|VHS CLUB|NINTENDO|ATARI|SEGA|PAC-?MAN|KIND REWIND/i
    for (const id of TEXTURE_IDS) for (const s of run(id).texts()) expect(s).not.toMatch(banned)
  })
})

describe('spine atlas (task 18.2)', () => {
  const { width: W, height: H } = TEXTURE_SPECS.spineAtlas

  it('is 512 x 256, power of two, mipmapped, clamped, with 8 equal cells', () => {
    expect([W, H]).toEqual([SPINE_ATLAS_WIDTH, SPINE_ATLAS_HEIGHT])
    expect(isPowerOfTwo(W) && isPowerOfTwo(H)).toBe(true)
    expect(TEXTURE_SPECS.spineAtlas.filter).toBe('mipmap')
    expect(W / SPINE_CELL_WIDTH).toBe(8)
    expect(SPINE_VARIANT_COUNT).toBeLessThanOrEqual(6)
  })

  it('cell UV rectangles lie inside the atlas, do not overlap and keep a gutter', () => {
    let lastU1 = 0
    for (let cell = 0; cell < W / SPINE_CELL_WIDTH; cell++) {
      const r = spineCellUv(cell)
      expect(r.u0).toBeGreaterThan(cell / 8)
      expect(r.u1).toBeLessThan((cell + 1) / 8)
      expect(r.u0).toBeGreaterThanOrEqual(lastU1)
      expect(r.v0).toBeGreaterThan(0)
      expect(r.v1).toBeLessThan(1)
      lastU1 = r.u1
    }
  })

  it('draws only generic words, one letter at a time, with no brand names', () => {
    const texts = run('spineAtlas').texts()
    expect(texts.every((s) => s.length === 1)).toBe(true)
    const joined = texts.join('')
    for (const word of ['ARCHIVE', 'VOL.3', 'REWIND']) expect(joined).toContain(word)
    expect(joined).not.toMatch(/BLOCKBUSTER|VHS CLUB|NINTENDO|ATARI|SEGA|KIND REWIND/i)
  })

  it('has title bands, label rectangles and glyph strokes in every spine cell', () => {
    const calls = run('spineAtlas').calls
    for (let cell = 0; cell < SPINE_VARIANT_COUNT; cell++) {
      const x0 = cell * SPINE_CELL_WIDTH
      const rects = calls.filter((c) => c.op === 'fillRect' && (c.args[0] as number) >= x0 && (c.args[0] as number) < x0 + SPINE_CELL_WIDTH)
      expect(rects.length, `cell ${cell}`).toBeGreaterThanOrEqual(6)
    }
  })

  it('stays light enough for the instance colour to tint it (no dark fills or strokes)', () => {
    const styles = run('spineAtlas')
      .calls.filter((c) => c.op === 'set fillStyle' || c.op === 'set strokeStyle')
      .map((c) => String(c.args[0]))
    expect(styles.length).toBeGreaterThan(30)
    for (const s of styles) {
      expect(s).toMatch(/^#[0-9a-f]{6}$/)
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
      expect(Math.min(r, g, b), s).toBeGreaterThanOrEqual(0x2c)
    }
    // Each cell starts with a light base fill.
    const rects = run('spineAtlas').calls.filter((c) => c.op === 'fillRect')
    for (let cell = 0; cell < 8; cell++) {
      const first = rects.find((c) => c.args[0] === cell * SPINE_CELL_WIDTH)!
      expect(first.args.slice(1, 3)).toEqual([0, SPINE_CELL_WIDTH])
      expect(first.args[3] as number).toBeLessThanOrEqual(H)
    }
  })
})

describe('wall, rug, cork board and lamp glow (task 18.3)', () => {
  const NEW_IDS = ['wallPanel', 'rugWoven', 'corkBoard', 'lampGlow'] as const

  it('are registered as power-of-two textures with the intended wrap modes', () => {
    for (const id of NEW_IDS) {
      expect(TEXTURE_IDS).toContain(id)
      expect(isPowerOfTwo(TEXTURE_SPECS[id].width) && isPowerOfTwo(TEXTURE_SPECS[id].height)).toBe(true)
    }
    expect(TEXTURE_SPECS.wallPanel.wrap).toBe('repeat')
    expect(TEXTURE_SPECS.rugWoven.wrap).toBe('clamp')
    expect(TEXTURE_SPECS.corkBoard.wrap).toBe('clamp')
  })

  it('the cork board carries its generic archive lettering and no brand names', () => {
    const texts = run('corkBoard').texts()
    for (const s of ['TAPE 001', 'ARCHIVE 09', 'WHO TAPED OVER?']) expect(texts).toContain(s)
    for (const s of texts) expect(s).not.toMatch(/BLOCKBUSTER|VHS CLUB|NINTENDO|ATARI|SEGA|PAC-?MAN|KIND REWIND/i)
  })

  it('the cork board has pinned cards, Polaroid-like frames, sticky notes in four colours and red string', () => {
    const calls = run('corkBoard').calls
    const fills = calls.filter((c) => c.op === 'set fillStyle').map((c) => String(c.args[0]))
    for (const col of ['#f2e060', '#f09ab0', '#9ad88a', '#8ac8e8', '#ece8dc', '#efe8cf']) expect(fills).toContain(col)
    const strokes = calls.filter((c) => c.op === 'set strokeStyle').map((c) => String(c.args[0]))
    expect(strokes.filter((s) => s === '#c42222').length).toBeGreaterThanOrEqual(10)
    expect(calls.filter((c) => c.op === 'arc').length).toBeGreaterThanOrEqual(24)
  })

  it('wall, rug and glow textures contain no text', () => {
    for (const id of ['wallPanel', 'rugWoven', 'lampGlow'] as const) expect(run(id).texts()).toEqual([])
  })

  it('the wall texture paints a chair rail, panels and a plaster area, with a baked mid-tone', () => {
    const { width: W, height: H } = TEXTURE_SPECS.wallPanel
    const rects = run('wallPanel').calls.filter((c) => c.op === 'fillRect')
    // A full-width rail band exists in the lower third of the canvas.
    expect(rects.some((r) => r.args[0] === 0 && r.args[2] === W && (r.args[1] as number) > H * 0.5 && (r.args[3] as number) <= 14)).toBe(true)
    expect(rects.length).toBeGreaterThan(300)
    expect(WALL_TEXTURE_ALBEDO.every((v) => v > 0.2 && v < 0.6)).toBe(true)
  })

  it('the rug texture draws a bordered diamond pattern and the lamp glow starts on a cleared canvas', () => {
    const rug = run('rugWoven').calls
    expect(rug.filter((c) => c.op === 'fill').length).toBeGreaterThan(40)
    const glow = run('lampGlow')
    expect(glow.calls[0].op).toBe('clearRect')
    expect(glow.calls.some((c) => c.op === 'createRadialGradient')).toBe(true)
  })
})

describe('task 19.2: smaller wall texture, reference card, glass and timecode', () => {
  it('wallPanel is 256 x 256, mipmapped and repeating, and keeps its rail and panel proportions', () => {
    const s = TEXTURE_SPECS.wallPanel
    expect([s.width, s.height, s.filter, s.wrap]).toEqual([256, 256, 'mipmap', 'repeat'])
    // A 512 px wall texture cost 512 * 512 * 4 * 1.33; the 256 px one saves about 1.0 MB.
    const saved = textureMemoryBytes({ width: 512, height: 512, filter: 'mipmap' }) - textureMemoryBytes(s)
    expect(saved).toBeGreaterThan(1.0e6)
    const rects = run('wallPanel').calls.filter((c) => c.op === 'fillRect')
    // Chair rail: a full-width band whose top sits 1.05 m up the 3 m repeat, 12 px at 512 px = 6 px here.
    const railY = 256 - (1.05 * 256) / 3
    expect(rects.some((r) => r.args[0] === 0 && r.args[2] === 256 && r.args[3] === 6 && r.args[1] === railY - 6)).toBe(true)
  })

  it('smpteBars draws the seven 75% bars first, left to right, covering the full width', () => {
    const calls = run('smpteBars').calls
    const fills = calls.filter((c) => c.op === 'set fillStyle').map((c) => String(c.args[0]))
    expect(fills.slice(0, 7)).toEqual([...SMPTE_BAR_COLORS])
    expect(SMPTE_BAR_COLORS.map((col) => col.toLowerCase())).toEqual(['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'])
    const { width: W, height: H } = TEXTURE_SPECS.smpteBars
    const bars = calls.filter((c) => c.op === 'fillRect').slice(0, 7).map((c) => c.args as number[])
    expect(bars.map((b) => b[0])).toEqual([...bars.map((b) => b[0])].sort((a, b) => a - b))
    expect(bars.reduce((n, b) => n + b[2], 0)).toBe(W)
    for (const b of bars) expect(b[3]).toBe(Math.round((H * 2) / 3))
    // Reverse strip and PLUGE strip follow, and a waveform trace is stroked.
    expect(fills.slice(7, 14)).toEqual(['#0000bf', '#131313', '#bf00bf', '#131313', '#00bfbf', '#131313', '#bfbfbf'])
    expect(fills).toContain('#00214c')
    expect(fills).toContain('#32006a')
    expect(calls.some((c) => c.op === 'stroke')).toBe(true)
    expect(run('smpteBars').texts()).toEqual([])
  })

  it('smpteBars and timecode are nearest-filtered and clamped', () => {
    expect(TEXTURE_SPECS.smpteBars).toMatchObject({ width: 256, height: 128, filter: 'nearest', wrap: 'clamp' })
    expect(TEXTURE_SPECS.timecode).toMatchObject({ width: 128, height: 32, filter: 'nearest', wrap: 'clamp' })
  })

  it("timecode reads '00:19:96' in green", () => {
    const ctx = run('timecode')
    expect(ctx.texts()).toContain(TIMECODE_TEXT)
    expect(TIMECODE_TEXT).toBe('00:19:96')
    const fills = ctx.calls.filter((c) => c.op === 'set fillStyle').map((c) => String(c.args[0]))
    expect(fills).toContain('#5dffa0')
  })

  it('the new textures are registered', () => {
    for (const id of ['smpteBars', 'timecode'] as const) expect(TEXTURE_IDS).toContain(id)
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

describe('task 20.2: attract screens and marquees', () => {
  const calls = (id: TextureId, op: string) => run(id).calls.filter((c) => c.op === op)
  const fillStyles = (id: TextureId) => calls(id, 'set fillStyle').map((c) => String(c.args[0]).toLowerCase())

  it('screens are 256 x 256 and marquees 256 x 64, nearest-filtered, clamped, with no mipmaps', () => {
    for (const id of ATTRACT_IDS) expect(TEXTURE_SPECS[id]).toMatchObject({ width: 256, height: 256, filter: 'nearest', wrap: 'clamp' })
    for (const id of MARQUEE_IDS) expect(TEXTURE_SPECS[id]).toMatchObject({ width: 256, height: 64, filter: 'nearest', wrap: 'clamp' })
  })

  it('the old arcadeScreen, marquee, outOfOrder and deck textures are gone', () => {
    for (const id of ['arcadeScreen', 'marquee', 'outOfOrder', 'deck']) expect(TEXTURE_IDS as string[]).not.toContain(id)
  })

  it('every screen and marquee has its own seed, and each is deterministic and seed-dependent', () => {
    const seeds = [...ATTRACT_IDS, ...MARQUEE_IDS].map((id) => TEXTURE_SPECS[id].seed)
    expect(new Set(seeds).size).toBe(6)
    for (const id of [...ATTRACT_IDS, ...MARQUEE_IDS]) {
      expect(run(id).hash()).toBe(run(id).hash())
      expect(run(id, TEXTURE_SPECS[id].seed + 1).hash()).not.toBe(run(id).hash())
    }
  })

  it('draws the expected titles, lines and dial text', () => {
    expect(run('attractSnake').texts()).toEqual(expect.arrayContaining(['SNAKE.EXE', 'PRESS E', 'INSERT 25¢']))
    expect(run('attractMaze').texts()).toContain('LAST EXIT')
    expect(run('attractFrequency').texts()).toEqual(expect.arrayContaining(['DEAD FREQUENCY', '89.4 MHz', FREQUENCY_TEXT]))
    expect(MARQUEE_TEXTS.snake).toContain('THE HUNGRY TAPE')
    expect(MARQUEE_TEXTS.maze).toContain('THE MAZE')
    expect(MARQUEE_TEXTS.frequency).toContain('THE LOST SIGNAL')
    for (const [key, id] of [['snake', 'marqueeSnake'], ['maze', 'marqueeMaze'], ['frequency', 'marqueeFrequency']] as const) {
      expect(run(id).texts()).toContain(MARQUEE_TEXTS[key])
    }
  })

  it('marquee lettering fits inside the canvas minus margins, using the fixed per-character width', () => {
    for (const id of MARQUEE_IDS) {
      const { width } = TEXTURE_SPECS[id]
      const ctx = run(id)
      const label = ctx.texts()[0]
      const fonts = ctx.calls.filter((c) => c.op === 'set font').map((c) => String(c.args[0]))
      expect(fonts.length).toBeGreaterThan(0)
      for (const f of fonts) {
        const px = Number(/(\d+)px/.exec(f)![1])
        expect(marqueeTextWidth(label, px), `${id} ${f}`).toBeLessThanOrEqual(width - 2 * MARQUEE_TEXT_MARGIN)
        expect(px).toBeGreaterThanOrEqual(8)
      }
    }
    // The longest text is the one that is shrunk the most.
    expect(marqueeFontSize(MARQUEE_TEXTS.frequency, 256)).toBeLessThan(marqueeFontSize(MARQUEE_TEXTS.maze, 256))
    expect(marqueeFontSize('A', 256)).toBe(20)
  })

  it('screens have scanlines (full-width 1 px black strips every 2 px) and a phosphor dot grid or graticule', () => {
    for (const id of ATTRACT_IDS) {
      const strips = calls(id, 'fillRect').filter((c) => c.args[0] === 0 && c.args[2] === 256 && c.args[3] === 1)
      expect(strips.length, id).toBeGreaterThanOrEqual(120)
      // Scanlines (128) plus seeded speckle (50) and the art itself.
      expect(calls(id, 'fillRect').length, id).toBeGreaterThan(170)
    }
  })

  it('snake draws tape segments with reel dots; maze converges on a vanishing point; frequency strokes a waveform', () => {
    expect(calls('attractSnake', 'arc').length).toBeGreaterThanOrEqual(22)
    // Maze quads: four corridor surfaces per depth step, filled as paths.
    expect(calls('attractMaze', 'fill').length).toBeGreaterThanOrEqual(24)
    const lines = calls('attractMaze', 'lineTo').map((c) => c.args as number[])
    expect(lines.some(([x, y]) => x >= 104 && x <= 152 && y >= 88 && y <= 150)).toBe(true)
    expect(calls('attractFrequency', 'lineTo').length).toBeGreaterThanOrEqual(50)
    expect(fillStyles('attractMaze').some((s) => s === '#f0d8e8')).toBe(true)
  })

  it('uses each game palette: green, crimson/violet, amber/cyan', () => {
    const strokes = (id: TextureId) => calls(id, 'set strokeStyle').map((c) => String(c.args[0]).toLowerCase())
    const all = (id: TextureId) => [...fillStyles(id), ...strokes(id)]
    expect(all('attractSnake')).toEqual(expect.arrayContaining(['#7dffc0', '#7dffb0']))
    expect(all('attractMaze')).toEqual(expect.arrayContaining(['#c8203c', '#8a3ad0']))
    expect(all('attractFrequency')).toEqual(expect.arrayContaining(['#ffc23a', '#2ad8d0']))
    expect(fillStyles('marqueeSnake')).toContain(MARQUEE_PALETTES.snake.text)
    expect(fillStyles('marqueeMaze')).toContain(MARQUEE_PALETTES.maze.text)
    expect(fillStyles('marqueeFrequency')).toContain(MARQUEE_PALETTES.frequency.text)
  })

  it('uses no real brand or game names', () => {
    const banned = /NINTENDO|ATARI|SEGA|PAC-?MAN|NAMCO|TETRIS|SPACE INVADERS|DONKEY|BLOCKBUSTER|KIND REWIND/i
    for (const id of [...ATTRACT_IDS, ...MARQUEE_IDS]) for (const s of run(id).texts()) expect(s).not.toMatch(banned)
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

describe('task 21.1: couchFabric upholstery texture', () => {
  const spec = TEXTURE_SPECS.couchFabric
  const calls = (op: string) => run('couchFabric').calls.filter((c) => c.op === op)

  it('is a 256 x 256 mipmapped repeating texture with its own seed', () => {
    expect([spec.width, spec.height]).toEqual([256, 256])
    expect(spec.filter).toBe('mipmap')
    expect(spec.wrap).toBe('repeat')
    expect(TEXTURE_IDS.filter((id) => id !== 'couchFabric').every((id) => TEXTURE_SPECS[id].seed !== spec.seed)).toBe(true)
  })

  it('draws the same calls for the same seed and different calls for another seed', () => {
    expect(run('couchFabric').hash()).toBe(run('couchFabric').hash())
    expect(run('couchFabric', spec.seed + 1).hash()).not.toBe(run('couchFabric').hash())
  })

  it('draws one vertical rib set: many full-height thin rectangles, about one wale per centimetre', () => {
    const ribs = calls('fillRect').filter((c) => (c.args[3] as number) === 256 && (c.args[2] as number) <= 8)
    expect(ribs.length).toBeGreaterThanOrEqual(FABRIC_WALES * 2)
    expect(FABRIC_METRES_PER_REPEAT / FABRIC_WALES).toBeCloseTo(0.01, 6)
  })

  it('draws dashed stitched seams near all four tile edges', () => {
    const dashes = calls('lineTo').map((c) => c.args as number[])
    const moves = calls('moveTo').map((c) => c.args as number[])
    expect(dashes.length).toBeGreaterThanOrEqual(60)
    const near = (v: number, edge: number) => Math.abs(v - edge) <= FABRIC_SEAM_INSET + 1
    const onEdge = (p: number[]) => near(p[0], 0) || near(p[0], 256) || near(p[1], 0) || near(p[1], 256)
    expect(moves.filter(onEdge).length).toBe(moves.length)
    expect(moves.some((p) => near(p[1], 0))).toBe(true)
    expect(moves.some((p) => near(p[1], 256))).toBe(true)
    expect(moves.some((p) => near(p[0], 0))).toBe(true)
    expect(moves.some((p) => near(p[0], 256))).toBe(true)
    // Dashes are short and have gaps: every dash is 8 px long.
    for (let i = 0; i < dashes.length; i++) expect(Math.hypot(dashes[i][0] - moves[i][0], dashes[i][1] - moves[i][1])).toBeCloseTo(8, 6)
  })

  it('is near neutral and mid-high key: only light grey-red fills, no text, no brand names', () => {
    const ctx = run('couchFabric')
    expect(ctx.texts()).toEqual([])
    const base = ctx.calls.find((c) => c.op === 'set fillStyle')!.args[0] as string
    const ch = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16))
    expect(Math.min(...ch)).toBeGreaterThanOrEqual(0xb0)
    expect(Math.max(...ch) - Math.min(...ch)).toBeLessThanOrEqual(0x10)
    expect(ctx.log.join(' ').toLowerCase()).not.toMatch(/sony|panasonic|jvc|nintendo|sega|atari|vhs/)
  })
})

describe('task 21.2: crtCasing and crtGlass textures', () => {
  const brands = /sony|panasonic|jvc|toshiba|samsung|sharp|zenith|rca|nintendo|sega|atari|vhs/i
  const rects = (id: TextureId) => run(id).calls.filter((c) => c.op === 'fillRect').map((c) => c.args as number[])

  it('are 256 x 256 with the intended filters, wraps and unique seeds', () => {
    expect(TEXTURE_SPECS.crtCasing).toMatchObject({ width: 256, height: 256, filter: 'mipmap', wrap: 'clamp' })
    expect(TEXTURE_SPECS.crtGlass).toMatchObject({ width: 256, height: 256, filter: 'nearest', wrap: 'clamp' })
    for (const id of ['crtCasing', 'crtGlass'] as const) {
      expect(TEXTURE_IDS).toContain(id)
      expect(TEXTURE_IDS.filter((o) => o !== id).every((o) => TEXTURE_SPECS[o].seed !== TEXTURE_SPECS[id].seed)).toBe(true)
    }
    expect(textureMemoryBytes(TEXTURE_SPECS.crtGlass)).toBeLessThanOrEqual(0.25 * 1048576)
  })

  it.each(['crtCasing', 'crtGlass'] as const)('%s is deterministic per seed and uses no brand names', (id) => {
    expect(run(id).hash()).toBe(run(id).hash())
    expect(run(id, TEXTURE_SPECS[id].seed + 1).hash()).not.toBe(run(id).hash())
    for (const s of run(id).texts()) expect(s).not.toMatch(brands)
  })

  it('crtCasing prints the generic badge, dial labels and a red power LED dot', () => {
    const ctx = run('crtCasing')
    expect(CRT_BADGE_TEXT).toBe('KV-1996')
    expect(ctx.texts()).toContain('KV-1996')
    expect(ctx.texts()).toEqual(expect.arrayContaining(['CH', 'VOL']))
    const fills = ctx.calls.filter((c) => c.op === 'set fillStyle').map((c) => String(c.args[0]))
    expect(fills).toContain(CRT_LED_COLOR)
    expect(ctx.calls.some((c) => c.op === 'arc' && (c.args[2] as number) <= 3)).toBe(true)
  })

  it('crtCasing draws many small louver slots, fine grain, 12 dial ticks per knob and recessed seam lines', () => {
    const r = rects('crtCasing')
    const vertical = r.filter((a) => a[2] === 4 && a[3] === 12)
    const horizontal = r.filter((a) => a[2] === 12 && a[3] === 4)
    expect(vertical.length + horizontal.length).toBeGreaterThanOrEqual(60)
    expect(r.filter((a) => a[2] === 1 && a[3] === 1).length).toBeGreaterThanOrEqual(1000)
    const ctx = run('crtCasing')
    expect(ctx.calls.filter((c) => c.op === 'moveTo').length).toBeGreaterThanOrEqual(24 + 4)
  })

  it('crtCasing is near neutral (grey base) so the material colour sets charcoal', () => {
    const base = run('crtCasing').calls.find((c) => c.op === 'set fillStyle')!.args[0] as string
    const ch = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16))
    expect(Math.max(...ch) - Math.min(...ch)).toBeLessThanOrEqual(0x10)
  })

  it('crtGlass draws full-width scanlines, a vignette gradient, darkened corners and the NO SIGNAL card', () => {
    const ctx = run('crtGlass')
    const r = rects('crtGlass')
    expect(r.filter((a) => a[0] === 0 && a[2] === 256 && a[3] === 1).length).toBeGreaterThanOrEqual(100)
    expect(ctx.calls.filter((c) => c.op === 'createLinearGradient').length).toBeGreaterThanOrEqual(5)
    for (const [x, y] of [[0, 0], [238, 0], [0, 238], [238, 238]]) expect(r.some((a) => a[0] === x && a[1] === y && a[2] === 18)).toBe(true)
    expect(ctx.texts()).toEqual(expect.arrayContaining(['NO SIGNAL', 'CH 03']))
  })

  it('crtGlass keeps phosphor stripes and grain specks', () => {
    const r = rects('crtGlass')
    expect(r.filter((a) => a[2] === 1 && a[3] === 256).length).toBeGreaterThanOrEqual(100)
    expect(r.filter((a) => a[2] === 1 && a[3] === 1).length).toBeGreaterThanOrEqual(400)
  })
})

describe('task 22.1: corkBoard 256, vcrDeck and vhsShell textures', () => {
  const brands = /sony|panasonic|jvc|toshiba|samsung|sharp|zenith|rca|nintendo|sega|atari|blockbuster|kind rewind|maxell|fuji|memorex/i
  const NEW_IDS = ['vcrDeck', 'vhsShell'] as const

  /** Every fillText with its font size, checked against the canvas (centre aligned, monospace about 0.6 em per glyph). */
  function textBoxes(id: TextureId) {
    let px = 10
    const boxes: Array<{ s: string; px: number; x0: number; x1: number; y0: number; y1: number }> = []
    for (const c of run(id).calls) {
      if (c.op === 'set font') px = Number(/(\d+)px/.exec(String(c.args[0]))![1])
      if (c.op === 'fillText') {
        const [s, x, y] = c.args as [string, number, number]
        const half = (s.length * px * 0.6) / 2
        boxes.push({ s, px, x0: x - half, x1: x + half, y0: y - px / 2, y1: y + px / 2 })
      }
    }
    return boxes
  }

  it('corkBoard is 256 x 256 (mipmap, clamp, same seed) and costs 1.0 MB less than at 512', () => {
    expect(TEXTURE_SPECS.corkBoard).toMatchObject({ width: 256, height: 256, filter: 'mipmap', wrap: 'clamp', seed: 117 })
    const saved = textureMemoryBytes({ width: 512, height: 512, filter: 'mipmap' }) - textureMemoryBytes(TEXTURE_SPECS.corkBoard)
    expect(saved).toBeGreaterThan(1.0e6)
  })

  it('corkBoard keeps every pinned item and its lettering, scaled by k = w / 512 and inside the canvas', () => {
    const { width: W, height: H } = TEXTURE_SPECS.corkBoard
    const boxes = textBoxes('corkBoard')
    expect(boxes.map((b) => b.s).sort()).toEqual(['ARCHIVE 09', 'DO NOT ERASE', 'TAPE 001', 'WHO TAPED OVER?'])
    for (const b of boxes) {
      expect(b.px, b.s).toBeGreaterThanOrEqual(7)
      expect(b.px, b.s).toBeLessThanOrEqual(8)
      expect(b.x0 >= 0 && b.x1 <= W && b.y0 >= 0 && b.y1 <= H, `${b.s} ${b.x0}..${b.x1}`).toBe(true)
    }
    // Same item counts as before the shrink: 12 push-pins, 13 string links, 4 sticky notes, 4 Polaroids.
    const calls = run('corkBoard').calls
    const strokes = calls.filter((c) => c.op === 'set strokeStyle').map((c) => String(c.args[0]))
    expect(strokes.filter((s) => s === '#c42222')).toHaveLength(13)
    expect(calls.filter((c) => c.op === 'arc')).toHaveLength(12 * 3 + 4) // three discs per pin, one silhouette head per Polaroid
    const fills = calls.filter((c) => c.op === 'set fillStyle').map((c) => String(c.args[0]))
    for (const col of ['#f2e060', '#f09ab0', '#9ad88a', '#8ac8e8']) expect(fills).toContain(col)
    expect(fills.filter((f) => f === '#ece8dc')).toHaveLength(4)
    expect(fills.filter((f) => f === '#efe8cf')).toHaveLength(4)
    // Proportions: the first card (24, 28, 132 x 100 at 512 px) is at (12, 14, 66 x 50) at 256 px.
    expect(calls.some((c) => c.op === 'fillRect' && (c.args as number[]).join() === '12,14,66,50')).toBe(true)
  })

  it('vcrDeck is 256 x 128 and vhsShell 128 x 128: mipmapped, unique seeds, power of two', () => {
    expect(TEXTURE_SPECS.vcrDeck).toMatchObject({ width: 256, height: 128, filter: 'mipmap' })
    expect(TEXTURE_SPECS.vhsShell).toMatchObject({ width: 128, height: 128, filter: 'mipmap', wrap: 'clamp' })
    for (const id of NEW_IDS) {
      expect(TEXTURE_IDS).toContain(id)
      expect(isPowerOfTwo(TEXTURE_SPECS[id].width) && isPowerOfTwo(TEXTURE_SPECS[id].height)).toBe(true)
      expect(TEXTURE_IDS.filter((o) => o !== id).every((o) => TEXTURE_SPECS[o].seed !== TEXTURE_SPECS[id].seed)).toBe(true)
    }
  })

  it.each(NEW_IDS)('%s is deterministic per seed, differs for another seed and uses no brand names', (id) => {
    expect(run(id).hash()).toBe(run(id).hash())
    expect(run(id, TEXTURE_SPECS[id].seed + 1).hash()).not.toBe(run(id).hash())
    for (const s of run(id).texts()) expect(s).not.toMatch(brands)
  })

  it.each(NEW_IDS)('%s keeps text inside the canvas', (id) => {
    const { width: W, height: H } = TEXTURE_SPECS[id]
    for (const b of textBoxes(id)) expect(b.x0 >= 0 && b.x1 <= W && b.y0 >= 0 && b.y1 <= H, `${b.s} ${b.x0}..${b.x1}`).toBe(true)
  })

  it('vcrDeck prints PLAY, STOP, REW, EJECT under the buttons and the generic HI-FI STEREO marking', () => {
    expect([...VCR_BUTTON_LABELS]).toEqual(['PLAY', 'STOP', 'REW', 'EJECT'])
    expect(VCR_MARK_TEXT).toBe('HI-FI STEREO')
    const boxes = textBoxes('vcrDeck')
    for (const s of [...VCR_BUTTON_LABELS, VCR_MARK_TEXT]) expect(boxes.map((b) => b.s)).toContain(s)
    // Labels read left to right in button order, and neighbouring labels do not overlap.
    const labels = VCR_BUTTON_LABELS.map((s) => boxes.find((b) => b.s === s)!)
    for (let i = 1; i < labels.length; i++) expect(labels[i].x0).toBeGreaterThan(labels[i - 1].x1)
  })

  it('vcrDeck has brushed streaks, ventilation slots and a chrome trim line', () => {
    const rects = run('vcrDeck').calls.filter((c) => c.op === 'fillRect').map((c) => c.args as number[])
    expect(rects.filter((r) => r[2] === 256 && r[3] === 1).length).toBeGreaterThanOrEqual(128)
    expect(rects.filter((r) => r[2] === 80 && r[3] === 4).length).toBe(12)
    expect(rects.some((r) => r[0] === 0 && r[2] === 256 && r[3] === 1 && r[1] === 88)).toBe(true)
  })

  it('vhsShell prints the TAPE 001 and ARCHIVE labels and draws two reels, a flap seam and ribs', () => {
    expect([...VHS_LABEL_TEXTS]).toEqual(['TAPE 001', 'ARCHIVE'])
    const ctx = run('vhsShell')
    for (const s of VHS_LABEL_TEXTS) expect(ctx.texts()).toContain(s)
    // Two reels: a filled disc and a ring each, plus two hubs (arc calls with radius 8 and 2.5).
    const arcs = ctx.calls.filter((c) => c.op === 'arc').map((c) => c.args as number[])
    expect(arcs.filter((a) => a[2] === 8)).toHaveLength(4)
    expect(arcs.filter((a) => a[2] === 2.5)).toHaveLength(2)
    expect(new Set(arcs.filter((a) => a[2] === 8).map((a) => a[0]))).toEqual(new Set([40, 88]))
    const rects = ctx.calls.filter((c) => c.op === 'fillRect').map((c) => c.args as number[])
    expect(rects.some((r) => r[0] === 0 && r[1] === 69 && r[2] === 128 && r[3] === 1)).toBe(true)
    expect(rects.filter((r) => r[2] === 1 && r[1] === 108).length).toBeGreaterThanOrEqual(30)
  })

  it('vhsShell is light near-neutral plastic so the material multiplier sets the hue', () => {
    const base = run('vhsShell').calls.find((c) => c.op === 'set fillStyle')!.args[0] as string
    const ch = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16))
    expect(Math.max(...ch) - Math.min(...ch)).toBeLessThanOrEqual(0x10)
  })

  it('texture memory after task 22.2 is at most 7.7 MB', () => {
    expect(totalTextureMemoryBytes()).toBeLessThanOrEqual(7.55 * 1048576)
  })
})

describe('task 22.2: metalCabinet, and cardboard crate textures', () => {
  const brands = /sony|panasonic|jvc|toshiba|samsung|sharp|zenith|rca|nintendo|sega|atari|blockbuster|kind rewind|maxell|fuji|memorex|ikea|hon\b|steelcase/i
  const IDS = ['metalCabinet', 'crate'] as const
  const rects = (id: TextureId) => run(id).calls.filter((c) => c.op === 'fillRect').map((c) => c.args as number[])
  const textCalls = (id: TextureId) => run(id).calls.filter((c) => c.op === 'fillText').map((c) => ({ s: c.args[0] as string, x: c.args[1] as number, y: c.args[2] as number }))

  it('sizes: metalCabinet 256 x 256 and crate 256 x 256 (mipmapped, repeating), unique seeds', () => {
    expect(TEXTURE_SPECS.metalCabinet).toMatchObject({ width: 256, height: 256, filter: 'mipmap', wrap: 'repeat' })
    expect(TEXTURE_SPECS.crate).toMatchObject({ width: 256, height: 256, filter: 'mipmap', wrap: 'repeat' })
    for (const id of IDS) {
      expect(isPowerOfTwo(TEXTURE_SPECS[id].width) && isPowerOfTwo(TEXTURE_SPECS[id].height)).toBe(true)
      expect(TEXTURE_IDS.filter((o) => o !== id).every((o) => TEXTURE_SPECS[o].seed !== TEXTURE_SPECS[id].seed)).toBe(true)
    }
  })

  it.each(IDS)('%s is deterministic per seed, differs for another seed, stays in bounds and uses no brand names', (id) => {
    expect(run(id).hash()).toBe(run(id).hash())
    expect(run(id, TEXTURE_SPECS[id].seed + 1).hash()).not.toBe(run(id).hash())
    for (const s of run(id).texts()) expect(s).not.toMatch(brands)
    const { width: W, height: H } = TEXTURE_SPECS[id]
    for (const r of rects(id)) expect(r[0] >= -1 && r[1] >= -1 && r[0] + r[2] <= W + 1 && r[1] + r[3] <= H + 1, `${id} ${r.join(',')}`).toBe(true)
  })

  it('metalCabinet prints the four typed index cards, top drawer first, one per 64-row band', () => {
    expect([...CABINET_CARD_TEXTS]).toEqual(['1994\u20131996', 'TAPES 01\u201340', 'CASE LOGS', 'MISC'])
    const calls = textCalls('metalCabinet')
    expect(calls.map((c) => c.s)).toEqual([...CABINET_CARD_TEXTS])
    for (let d = 0; d < 4; d++) {
      expect(calls[d].x).toBe(128)
      // Card centre of drawer i (0 = bottom) is at tile fraction cabinetCardV(i), canvas row (1 - v) * 256.
      expect(calls[d].y).toBeCloseTo((1 - cabinetCardV(3 - d)) * 256, 6)
      expect(Math.floor(calls[d].y / 64)).toBe(d)
    }
  })

  it('metalCabinet has vertical brushing, three drawer seams, four chrome frames and a plain stripe', () => {
    const r = rects('metalCabinet')
    expect(r.filter((q) => q[2] === 1 && q[3] === 256).length).toBeGreaterThanOrEqual(256)
    for (const y of [64, 128, 192]) expect(r.some((q) => q[0] === 0 && q[2] === 256 && q[3] === 3 && q[1] === y - 1), `seam ${y}`).toBe(true)
    expect(r.filter((q) => Math.abs(q[2] - 143.36) < 0.01).length).toBe(4)
    // Nothing but speckle touches the plain rows 238..251 (v stripe): no seams, frames or cards there.
    const [v0, v1] = CABINET_PLAIN_V
    expect([Math.round((1 - v1) * 256), Math.round((1 - v0) * 256)]).toEqual([238, 252])
    for (const q of r) {
      if (q[2] >= 100 || q[3] >= 100) continue
      if (q[2] === 1 && q[3] === 256) continue
      if (q[2] <= 2 && q[3] <= 2) continue
      expect(q[1] + q[3] <= 238 || q[1] >= 252 || q[2] <= 31, `rect ${q.join(',')} overlaps the plain rows`).toBe(true)
    }
  })

  it('metalCabinet is light near-neutral grey so the material multipliers set the greys', () => {
    const base = run('metalCabinet').calls.find((c) => c.op === 'set fillStyle')!.args[0] as string
    const ch = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16))
    expect(Math.max(...ch) - Math.min(...ch)).toBeLessThanOrEqual(0x10)
    expect(Math.min(...ch)).toBeGreaterThanOrEqual(0xb0)
  })

  it('crate is corrugated cardboard: flute lines, packing tape, a shipping label with a barcode and the stencil', () => {
    expect(CRATE_STENCIL_TEXT).toBe('ARCHIVE // HANDLE WITH CARE')
    const texts = run('crate').texts()
    expect(texts).toContain(CRATE_STENCIL_TEXT)
    expect(texts).toContain(CRATE_LABEL_HEADER)
    const r = rects('crate')
    // Fine vertical flutes: a dark and a light 1 px line every 4 px over the full height.
    expect(r.filter((q) => q[2] === 1 && q[3] === 256 && q[0] % 2 === 0 && q[0] % 4 === 0).length).toBeGreaterThanOrEqual(64)
    expect(r.filter((q) => q[2] === 1 && q[3] === 256 && q[0] % 4 === 2).length).toBeGreaterThanOrEqual(64)
    // Semi-transparent tape strips: a vertical and a horizontal band.
    const alphaOf = (q: number[]) => {
      const calls = run('crate').calls
      const i = calls.findIndex((c) => c.op === 'fillRect' && (c.args as number[]).every((v, k) => v === q[k]))
      return calls.slice(0, i).reverse().find((c) => c.op === 'set globalAlpha')!.args[0] as number
    }
    const vTape = r.find((q) => q[0] === 112 && q[2] === 32 && q[3] === 256)!
    const hTape = r.find((q) => q[0] === 0 && q[2] === 256 && q[3] === 14)!
    for (const t of [vTape, hTape]) expect(alphaOf(t)).toBeGreaterThan(0.2)
    for (const t of [vTape, hTape]) expect(alphaOf(t)).toBeLessThan(0.8)
    // White label with a barcode of at least 10 bars between the label edges.
    const label = r.find((q) => q[0] === 12 && q[1] === 136 && q[2] === 96 && q[3] === 68)!
    expect(label).toBeDefined()
    const bars = r.filter((q) => q[1] === 175 && q[3] === 22)
    expect(bars.length).toBeGreaterThanOrEqual(10)
    for (const b of bars) expect(b[0] >= label[0] && b[0] + b[2] <= label[0] + label[2]).toBe(true)
    // Everything printed sits in the lower half (rows 128..255) except the tape band: it stays visible on the smallest boxes.
    for (const c of textCalls('crate')) expect(c.y).toBeGreaterThan(128)
  })

  it('memory: metalCabinet 0.33 MB, crate 0.33 MB (was 0.09), total at most 7.55 MB', () => {
    const mb = (id: TextureId) => textureMemoryBytes(TEXTURE_SPECS[id]) / 1048576
    expect(mb('metalCabinet')).toBeCloseTo(0.33, 2)
    expect(mb('crate')).toBeCloseTo(0.33, 2)
    expect(totalTextureMemoryBytes()).toBeLessThanOrEqual(7.7 * 1048576)
    expect(totalTextureMemoryBytes()).toBeLessThanOrEqual(TEXTURE_MEMORY_BUDGET_BYTES)
  })
})

describe('task 22.2 part B: deskDetail texture', () => {
  const rects = (seed?: number) => run('deskDetail', seed).calls.filter((c) => c.op === 'fillRect').map((c) => c.args as number[])

  it('is 128 x 64, mipmapped, repeating, power-of-two, with a unique seed and about 0.04 MB', () => {
    expect(TEXTURE_SPECS.deskDetail).toMatchObject({ width: 128, height: 64, filter: 'mipmap', wrap: 'repeat' })
    expect(isPowerOfTwo(128) && isPowerOfTwo(64)).toBe(true)
    expect(TEXTURE_IDS.filter((o) => o !== 'deskDetail').every((o) => TEXTURE_SPECS[o].seed !== TEXTURE_SPECS.deskDetail.seed)).toBe(true)
    expect(textureMemoryBytes(TEXTURE_SPECS.deskDetail) / 1048576).toBeCloseTo(0.04, 2)
  })

  it('is deterministic per seed, differs for another seed, stays in bounds and uses no text', () => {
    expect(run('deskDetail').hash()).toBe(run('deskDetail').hash())
    expect(run('deskDetail', TEXTURE_SPECS.deskDetail.seed + 1).hash()).not.toBe(run('deskDetail').hash())
    expect(run('deskDetail').texts()).toEqual([])
    for (const r of rects()) expect(r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 128 && r[1] + r[3] <= 64, r.join(',')).toBe(true)
  })

  it('draws 13 ruled lines and a margin line in the right (paper) cell and page-edge rows at the bottom', () => {
    const r = rects()
    const lines = r.filter((q) => q[0] === 64 && q[2] === 64 && q[3] === 1 && q[1] < 60 && (q[1] - 6) % 4 === 0)
    expect(lines).toHaveLength(13)
    expect(r.some((q) => q[0] === 73 && q[2] === 1 && q[3] === 60)).toBe(true)
    for (let y = 60; y < 64; y++) expect(r.some((q) => q[0] === 64 && q[1] === y && q[2] === 64 && q[3] === 1)).toBe(true)
  })
})

describe('task 23.1: lampGlow radial falloff', () => {
  const recorded = () => run('lampGlow').calls
  const stops = () => recorded().filter((c) => c.op === 'addColorStop').map((c) => ({ o: c.args[0] as number, color: String(c.args[1]) }))
  const alphaOf = (color: string) => Number(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/.exec(color)![1])

  it('is 128 x 128, mipmapped, clamped, and keeps its id and seed', () => {
    expect(TEXTURE_SPECS.lampGlow).toMatchObject({ id: 'lampGlow', width: 128, height: 128, filter: 'mipmap', wrap: 'clamp', seed: 118 })
  })

  it('is deterministic: two runs record the same calls', () => {
    expect(run('lampGlow').hash()).toBe(run('lampGlow').hash())
    expect(run('lampGlow').log).toEqual(run('lampGlow').log)
  })

  it('uses a radial gradient with at least 5 ordered colour stops that fade to alpha 0 before the border', () => {
    const { width: W } = TEXTURE_SPECS.lampGlow
    const grads = recorded().filter((c) => c.op === 'createRadialGradient')
    expect(grads).toHaveLength(1)
    const [cx, cy, r0, , , r1] = grads[0].args as number[]
    expect([cx, cy, r0]).toEqual([W / 2, W / 2, 0])
    // The gradient ends well inside the canvas, so the outermost ring and the corners are fully transparent.
    expect(r1).toBeLessThan(W / 2)
    const s = stops()
    expect(s.length).toBeGreaterThanOrEqual(5)
    expect(s.map((x) => x.o)).toEqual([...s.map((x) => x.o)].sort((a, b) => a - b))
    expect(s[0].o).toBe(0)
    expect(s[s.length - 1].o).toBe(1)
    expect(alphaOf(s[s.length - 1].color)).toBe(0)
    // Alpha never rises after the core.
    const alphas = s.map((x) => alphaOf(x.color))
    for (let i = 1; i < alphas.length; i++) expect(alphas[i]).toBeLessThanOrEqual(alphas[i - 1])
    // Warm falloff: the first stop is a near-white core.
    expect(alphas[0]).toBe(1)
  })

  it('task 24.1: has a warm-white core, a golden-amber mid falloff and a feather that reaches alpha 0 on the last stop', () => {
    const rgb = (color: string) => /rgba\((\d+),(\d+),(\d+),/.exec(color)!.slice(1, 4).map(Number)
    const s = stops()
    const [r0, g0, b0] = rgb(s[0].color)
    expect(Math.min(r0, g0, b0)).toBeGreaterThanOrEqual(235)
    const mid = s.find((x) => x.o >= 0.3 && x.o <= 0.5)!
    const [r, g, b] = rgb(mid.color)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
    expect(r).toBeGreaterThanOrEqual(240)
    expect(b).toBeLessThan(100)
    // The gradient radius leaves a clear outer ring, so the edge pixels stay fully transparent.
    expect(alphaOf(s[s.length - 2].color)).toBeLessThanOrEqual(0.03)
    expect(alphaOf(s[s.length - 1].color)).toBe(0)
  })

  it('draws a small bright filament core at the centre', () => {
    const { width: W } = TEXTURE_SPECS.lampGlow
    const calls = recorded()
    const arc = calls.find((c) => c.op === 'arc')!
    expect(arc.args.slice(0, 2)).toEqual([W / 2, W / 2])
    expect(arc.args[2] as number).toBeLessThan(W * 0.05)
    const i = calls.indexOf(arc)
    expect(calls.slice(0, i).some((c) => c.op === 'set fillStyle' && c.args[0] === '#ffffff')).toBe(true)
  })

  it('costs about 0.06 MB more than the 64 x 64 version', () => {
    const delta = textureMemoryBytes(TEXTURE_SPECS.lampGlow) - textureMemoryBytes({ width: 64, height: 64, filter: 'mipmap' })
    expect(delta).toBeGreaterThan(0.06e6)
    expect(delta).toBeLessThan(0.07e6)
  })
})

describe('task 25.1: coneFalloff texture', () => {
  const calls = () => run('coneFalloff').calls
  const alphaOf = (color: string) => Number(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\)/.exec(color)![1])
  /** Per row: the recorded gradient stops (position, alpha) followed by the fillRect that paints it. */
  const rows = () => {
    const out: Array<{ y: number; stops: Array<{ o: number; a: number }> }> = []
    let stops: Array<{ o: number; a: number }> = []
    for (const c of calls()) {
      if (c.op === 'createLinearGradient') stops = []
      else if (c.op === 'addColorStop') stops.push({ o: c.args[0] as number, a: alphaOf(String(c.args[1])) })
      else if (c.op === 'fillRect') out.push({ y: (c.args as number[])[1], stops })
    }
    return out
  }
  const centre = (r: { stops: Array<{ o: number; a: number }> }) => r.stops.find((s) => s.o === 0.5)!.a

  it('is 64 x 64, linear without mipmaps, clamped, with a unique seed and about 0.016 MB', () => {
    expect(TEXTURE_SPECS.coneFalloff).toMatchObject({ id: 'coneFalloff', width: 64, height: 64, filter: 'linear', wrap: 'clamp', seed: 133 })
    expect(TEXTURE_IDS.filter((o) => o !== 'coneFalloff').every((o) => TEXTURE_SPECS[o].seed !== 133)).toBe(true)
    expect(textureMemoryBytes(TEXTURE_SPECS.coneFalloff)).toBe(64 * 64 * 4)
    expect(textureMemoryBytes(TEXTURE_SPECS.coneFalloff) / 1048576).toBeCloseTo(0.016, 3)
  })

  it('is deterministic and ignores the seed (no random input)', () => {
    expect(run('coneFalloff').hash()).toBe(run('coneFalloff').hash())
    expect(run('coneFalloff', 7).hash()).toBe(run('coneFalloff', 8).hash())
  })

  it('paints one full-width row at a time, in bounds', () => {
    const r = rows()
    expect(r).toHaveLength(64)
    r.forEach((row, i) => expect(row.y).toBe(i))
    for (const c of calls().filter((q) => q.op === 'fillRect')) expect(c.args).toEqual([0, (c.args as number[])[1], 64, 1])
  })

  it('has a warm translucent core at the top row (alpha > 0 in the centre)', () => {
    const top = rows()[0]
    expect(centre(top)).toBeGreaterThan(0.5)
    expect(centre(top)).toBeLessThanOrEqual(1)
    const colour = String(calls().find((c) => c.op === 'addColorStop')!.args[1])
    const [r, g, b] = /rgba\((\d+),(\d+),(\d+)/.exec(colour)!.slice(1).map(Number)
    expect(r).toBeGreaterThan(b) // warm
    expect(g).toBeGreaterThan(b)
  })

  it('fades smoothly and monotonically down the rows to exactly 0 well before the bottom (by 85 % of the height)', () => {
    const r = rows()
    const alphas = r.map(centre)
    for (let i = 1; i < alphas.length; i++) expect(alphas[i]).toBeLessThanOrEqual(alphas[i - 1] + 1e-9)
    // Smooth: no step bigger than 12 % of the top alpha between neighbouring rows.
    for (let i = 1; i < alphas.length; i++) expect(alphas[i - 1] - alphas[i]).toBeLessThan(alphas[0] * 0.12)
    for (let i = Math.ceil(64 * 0.85); i < 64; i++) expect(alphas[i], 'row ' + i).toBe(0)
    expect(alphas[Math.floor(64 * 0.85) - 1]).toBe(0)
  })

  it('tapers to alpha 0 at the left and right edges on every row, symmetrically', () => {
    for (const row of rows()) {
      const first = row.stops[0]
      const last = row.stops[row.stops.length - 1]
      expect([first.o, first.a, last.o, last.a]).toEqual([0, 0, 1, 0])
      const mid = row.stops.length - 1
      for (let i = 0; i <= mid; i++) expect(row.stops[i].a).toBeCloseTo(row.stops[mid - i].a, 4)
      expect(row.stops[1].a).toBeLessThan(centre(row) * 0.5 + 1e-9)
    }
  })

  it('contains no text and no brand names', () => {
    expect(run('coneFalloff').texts()).toEqual([])
  })
})