export type PersistedStatus = 'saved' | 'error';

export function resolveSaveStatus(expectedJson: string, readStored: () => string | null): PersistedStatus {
  try {
    return readStored() === expectedJson ? 'saved' : 'error';
  } catch {
    return 'error';
  }
}
