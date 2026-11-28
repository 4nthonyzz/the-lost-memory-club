import { describe, expect, it } from 'vitest';
import { DEAD_FREQUENCY_GAME_ID, SECOND_TAPE_ID, SNAKE_GAME_ID } from '../core/contracts';
import { arcadeAwakenedNotice, cabinetName, formatSecretRequirement, getFlowStrings } from './flowStrings';

describe('readable secret requirements', () => {
  it('names every missing item in both languages without raw ids', () => {
    const requirements = [
      { kind: 'tape', tapeId: SECOND_TAPE_ID },
      { kind: 'arcade', gameId: DEAD_FREQUENCY_GAME_ID },
      { kind: 'box' },
      { kind: 'polaroids', have: 1, need: 3 },
    ] as const;
    for (const language of ['en', 'es'] as const) {
      for (const requirement of requirements) {
        const text = formatSecretRequirement(requirement, language);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/tape-00\d|dead-frequency|julian-maya-box|snake-001/);
      }
    }
    expect(formatSecretRequirement({ kind: 'tape', tapeId: SECOND_TAPE_ID }, 'es')).toMatch(/^Cinta 02/);
    expect(formatSecretRequirement({ kind: 'polaroids', have: 1, need: 3 }, 'en')).toBe('3 anomalous Polaroids (1/3)');
    expect(formatSecretRequirement({ kind: 'box' }, 'en')).toBe('Julian and Maya\u2019s box');
  });
});

describe('cabinet names and copy', () => {
  it('shows the arcade names of the three cabinets', () => {
    expect(cabinetName(SNAKE_GAME_ID)).toBe('SNAKE.EXE');
    expect(cabinetName(DEAD_FREQUENCY_GAME_ID)).toBe('DEAD FREQUENCY');
    expect(cabinetName('unknown-game')).toBe('unknown-game');
  });

  it('keeps both languages complete for the member titles and the HUD', () => {
    const en = getFlowStrings('en');
    const es = getFlowStrings('es');
    expect(es.hud.reset).toBe('\u21bb Reiniciar');
    expect(en.hud.reset).toBe('\u21bb Reset');
    expect(es.endings.missingPrefix).toBe('Faltan: ');
    expect(en.endings.missingPrefix).toBe('Missing: ');
    expect(es.arcade.lore.shadow).toContain('LAST EXIT');
  });

  it('builds the cabinet-specific atmospheric toast', () => {
    expect(arcadeAwakenedNotice('dead-frequency-001', 'es')).toContain('DEAD FREQUENCY');
    expect(arcadeAwakenedNotice('shadow-fight-001', 'en')).toContain('LAST EXIT / SHADOW FIGHT');
  });

  it('builds the lock message from the tape number', () => {
    expect(getFlowStrings('en').arcade.lockedBy(3)).toBe('Locked: find the clue on tape 03 first.');
  });
});
