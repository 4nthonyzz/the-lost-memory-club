/**
 * Recording fake of the 2D context subset in proceduralTextures.ts. Test support only: nothing in the
 * app imports it. Every call and style assignment is appended to `log` as a string, so a run can be
 * hashed for determinism checks and inspected for coordinates and text.
 */
import type { Ctx2D, GradientLike } from './proceduralTextures'

export interface RecordedCall {
  op: string
  args: readonly unknown[]
}

export class RecordingContext implements Ctx2D {
  readonly calls: RecordedCall[] = []
  private styles: Record<string, unknown> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
  }

  private rec(op: string, ...args: unknown[]): void {
    this.calls.push({ op, args })
  }

  private style(name: string, value: unknown): void {
    this.styles[name] = value
    // Gradients are recorded when created; only their identity matters here.
    this.rec(`set ${name}`, typeof value === 'object' ? '[gradient]' : value)
  }

  get fillStyle(): unknown {
    return this.styles.fillStyle
  }
  set fillStyle(v: unknown) {
    this.style('fillStyle', v)
  }
  get strokeStyle(): unknown {
    return this.styles.strokeStyle
  }
  set strokeStyle(v: unknown) {
    this.style('strokeStyle', v)
  }
  get lineWidth(): number {
    return this.styles.lineWidth as number
  }
  set lineWidth(v: number) {
    this.style('lineWidth', v)
  }
  get font(): string {
    return this.styles.font as string
  }
  set font(v: string) {
    this.style('font', v)
  }
  get textAlign(): string {
    return this.styles.textAlign as string
  }
  set textAlign(v: string) {
    this.style('textAlign', v)
  }
  get textBaseline(): string {
    return this.styles.textBaseline as string
  }
  set textBaseline(v: string) {
    this.style('textBaseline', v)
  }
  get globalAlpha(): number {
    return this.styles.globalAlpha as number
  }
  set globalAlpha(v: number) {
    this.style('globalAlpha', v)
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.rec('fillRect', x, y, w, h)
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    this.rec('strokeRect', x, y, w, h)
  }
  clearRect(x: number, y: number, w: number, h: number): void {
    this.rec('clearRect', x, y, w, h)
  }
  beginPath(): void {
    this.rec('beginPath')
  }
  moveTo(x: number, y: number): void {
    this.rec('moveTo', x, y)
  }
  lineTo(x: number, y: number): void {
    this.rec('lineTo', x, y)
  }
  closePath(): void {
    this.rec('closePath')
  }
  fill(): void {
    this.rec('fill')
  }
  stroke(): void {
    this.rec('stroke')
  }
  fillText(text: string, x: number, y: number): void {
    this.rec('fillText', text, x, y)
  }
  arc(x: number, y: number, r: number, start: number, end: number): void {
    this.rec('arc', x, y, r, start, end)
  }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): GradientLike {
    this.rec('createLinearGradient', x0, y0, x1, y1)
    return { addColorStop: (o: number, c: string) => this.rec('addColorStop', o, c) }
  }
  save(): void {
    this.rec('save')
  }
  restore(): void {
    this.rec('restore')
  }

  /** One line per call, stable across runs. */
  get log(): string[] {
    return this.calls.map((c) => `${c.op}(${c.args.join(',')})`)
  }

  /** FNV-1a hash of the log. */
  hash(): number {
    let h = 2166136261
    for (const line of this.log) {
      for (let i = 0; i < line.length; i++) h = Math.imul(h ^ line.charCodeAt(i), 16777619)
      h = Math.imul(h ^ 10, 16777619)
    }
    return h >>> 0
  }

  texts(): string[] {
    return this.calls.filter((c) => c.op === 'fillText').map((c) => String(c.args[0]))
  }
}

/** A fake canvas that hands out a RecordingContext. */
export function fakeCanvas(): { width: number; height: number; getContext(type: '2d'): RecordingContext; ctx: RecordingContext } {
  const ctx = new RecordingContext()
  return { width: 0, height: 0, getContext: () => ctx, ctx }
}
