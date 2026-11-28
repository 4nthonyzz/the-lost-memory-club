/**
 * Deterministic linear congruential step. The same seed always produces the same run, which keeps
 * the cabinet games testable and fair between sessions. Returns an unsigned 32-bit value.
 */
export function nextSeed(seed: number): number {
  return (Math.imul(seed, 1103515245) + 12345) >>> 0;
}
