import { describe, expect, it } from 'vitest'

/**
 * Import-boundary test (Requirements 13.1, 16.8, 16.9).
 * Reads src/world sources as raw text through Vite's import.meta.glob (no DOM,
 * no Node typings needed) and analyses them as text.
 */

const raw = import.meta.glob(['./**/*.ts', './**/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Paths are relative to src, for example "world/logic/movement.ts". */
const WORLD_PREFIX = 'world/'
const toSrcPath = (globKey: string): string => WORLD_PREFIX + globKey.replace(/^\.\//, '')

const isTestFile = (file: string): boolean => /\.test\.tsx?$/.test(file)

/** Resolve a relative specifier against a src-relative file path. Returns a src-relative path. */
function resolveSpec(file: string, spec: string): string {
  const parts = file.split('/').slice(0, -1)
  for (const seg of spec.split('/')) {
    if (seg === '.' || seg === '') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  return parts.join('/')
}

/** Remove block and line comments so prose mentions are not flagged. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

/** Collect module specifiers from import/export-from/dynamic import/require. */
export function extractSpecifiers(source: string): string[] {
  const code = stripComments(source)
  const specs: string[] = []
  const patterns = [
    /\b(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const re of patterns) {
    for (const m of code.matchAll(re)) specs.push(m[1])
  }
  return specs
}

/** Storage API identifiers found in code (comments excluded). */
export function findStorageUsage(source: string): string[] {
  const code = stripComments(source)
  const found: string[] = []
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) {
    if (new RegExp(`\\b${name}\\b`).test(code)) found.push(name)
  }
  if (/\bdocument\s*\.\s*cookie\b/.test(code)) found.push('document.cookie')
  return found
}

function resolveInSrc(file: string, spec: string): string | null {
  return spec.startsWith('.') ? resolveSpec(file, spec) : null
}

export function findForbiddenImports(file: string, source: string): string[] {
  const bad: string[] = []
  for (const spec of extractSpecifiers(source)) {
    const rel = resolveInSrc(file, spec)
    if (rel === null) continue
    if (/^(arcade|memories)(\/|$)/.test(rel)) bad.push(spec)
  }
  return bad
}

export function findCoreViolations(file: string, source: string): string[] {
  const bad: string[] = []
  for (const spec of extractSpecifiers(source)) {
    const rel = resolveInSrc(file, spec)
    if (rel === null) continue
    if (/^core(\/|$)/.test(rel) && !/^core\/contracts(\.tsx?)?$/.test(rel)) bad.push(spec)
  }
  return bad
}

export function findLogicViolations(source: string): string[] {
  return extractSpecifiers(source).filter(
    (s) => s === 'react' || s.startsWith('react/') || s === 'react-dom' || s.startsWith('react-dom/') ||
      s === 'three' || s.startsWith('three/') || s.startsWith('@react-three/'),
  )
}

const allFiles = Object.keys(raw).map(toSrcPath)
const contents = new Map(Object.entries(raw).map(([k, v]) => [toSrcPath(k), v]))
const sourceFiles = allFiles.filter((f) => !isTestFile(f))
const logicFiles = sourceFiles.filter((f) => f.startsWith('world/logic/'))
const rel = (f: string) => f
const readFileSync = (f: string, _enc: string): string => contents.get(f) ?? ''

describe('src/world import boundary', () => {
  it('finds world source files to scan', () => {
    expect(sourceFiles.length).toBeGreaterThan(0)
    expect(logicFiles.length).toBeGreaterThan(0)
  })

  it('does not import from src/arcade or src/memories', () => {
    const violations = allFiles.flatMap((f) =>
      findForbiddenImports(f, readFileSync(f, 'utf8')).map((s) => `${rel(f)} -> ${s}`),
    )
    expect(violations).toEqual([])
  })

  it('does not use localStorage, sessionStorage, indexedDB or document.cookie', () => {
    const violations = sourceFiles.flatMap((f) =>
      findStorageUsage(readFileSync(f, 'utf8')).map((n) => `${rel(f)}: ${n}`),
    )
    expect(violations).toEqual([])
  })

  it('keeps logic/ free of react, three and @react-three/*', () => {
    const violations = logicFiles.flatMap((f) =>
      findLogicViolations(readFileSync(f, 'utf8')).map((s) => `${rel(f)} -> ${s}`),
    )
    expect(violations).toEqual([])
  })

  it('imports from src/core only via contracts (no gameReducer)', () => {
    const violations = allFiles.flatMap((f) =>
      findCoreViolations(f, readFileSync(f, 'utf8')).map((s) => `${rel(f)} -> ${s}`),
    )
    expect(violations).toEqual([])
  })
})

describe('boundary scanner self-check (detects violations)', () => {
  const file = 'world/controller/sample.ts'
  const logicSample = 'world/logic/sample.ts'

  it('flags arcade and memories imports at any relative depth', () => {
    expect(findForbiddenImports(file, `import { A } from '../../arcade/ArcadePanel'`)).toHaveLength(1)
    expect(findForbiddenImports(file, `import { M } from '../../memories'`)).toHaveLength(1)
    expect(findForbiddenImports(file, `export * from "../../arcade"`)).toHaveLength(1)
    expect(findForbiddenImports(file, `const m = await import('../../memories/MemoryPanel')`)).toHaveLength(1)
    expect(findForbiddenImports(logicSample, `import x from '../../arcade/a'`)).toHaveLength(1)
  })

  it('does not flag allowed imports or comment mentions', () => {
    expect(findForbiddenImports(file, `import { a } from '../logic/movement'`)).toEqual([])
    expect(findForbiddenImports(file, `// import x from '../../arcade/a'`)).toEqual([])
    expect(findForbiddenImports(file, `import type { StationId } from '../../core/contracts'`)).toEqual([])
  })

  it('flags storage identifiers but not comments', () => {
    expect(findStorageUsage(`const a = localStorage.getItem('x')`)).toEqual(['localStorage'])
    expect(findStorageUsage(`sessionStorage.clear(); indexedDB.open('d')`)).toEqual(['sessionStorage', 'indexedDB'])
    expect(findStorageUsage(`const c = document.cookie`)).toEqual(['document.cookie'])
    expect(findStorageUsage(`// no localStorage here\n/* indexedDB */ const x = 1`)).toEqual([])
  })

  it('flags react, three and @react-three imports in logic', () => {
    expect(findLogicViolations(`import { useState } from 'react'`)).toEqual(['react'])
    expect(findLogicViolations(`import { Vector3 } from 'three'`)).toEqual(['three'])
    expect(findLogicViolations(`import { Canvas } from '@react-three/fiber'`)).toEqual(['@react-three/fiber'])
    expect(findLogicViolations(`import { a } from './constants'`)).toEqual([])
  })

  it('flags core imports other than contracts', () => {
    expect(findCoreViolations(file, `import { gameReducer } from '../../core/gameReducer'`)).toHaveLength(1)
    expect(findCoreViolations(file, `import type { S } from '../../core/gameReducer'`)).toHaveLength(1)
    expect(findCoreViolations(file, `import type { StationId } from '../../core/contracts'`)).toEqual([])
    expect(findCoreViolations(file, `import { STATIONS } from '../../core/contracts'`)).toEqual([])
  })
})
