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
    for (const id of ['floor', 'wood', 'woodDark', 'crate', 'grille'] as const) expect(run(id).texts()).toEqual([])
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
    expect(glow.calls.filter((c) => c.op === 'arc').length).toBeGreaterThan(10)
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
