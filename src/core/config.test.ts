import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, configHash, canonicalConfigJson } from './config';

describe('configHash (§30.7)', () => {
  it('produces a stable 64-char hex digest', async () => {
    const h = await configHash(DEFAULT_CONFIG, 'manifest-digest-abc');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    const h2 = await configHash(DEFAULT_CONFIG, 'manifest-digest-abc');
    expect(h2).toBe(h);
  });

  it('changes when a gameplay-affecting field changes', async () => {
    const a = await configHash(DEFAULT_CONFIG, 'm');
    const other = { ...DEFAULT_CONFIG, deflectionModel: 'discrete8' as const };
    const b = await configHash(other, 'm');
    expect(b).not.toBe(a);
  });

  it('excludes cosmetic fields (volumes, inputMode) from the digest', async () => {
    const a = await configHash(DEFAULT_CONFIG, 'm');
    const cosmetic = {
      ...DEFAULT_CONFIG,
      musicVolume: 0.1,
      sfxVolume: 0.2,
      inputMode: 'gamepad' as const,
    };
    const b = await configHash(cosmetic, 'm');
    expect(b).toBe(a);
  });

  it('canonical JSON has sorted keys and no whitespace', () => {
    const json = canonicalConfigJson(DEFAULT_CONFIG, 'm');
    expect(json).not.toMatch(/\s/);
    const keys = json.match(/"([a-zA-Z]+)":/g)!.map((k) => k.slice(1, -2));
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });
});
