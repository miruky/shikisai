import { describe, expect, it } from 'vitest';
import { CVD_TYPES, simulateCvd } from './cvd';

describe('simulateCvd', () => {
  it('白と黒は不変(各行の係数が1に正規化されている)', () => {
    for (const type of CVD_TYPES) {
      expect(simulateCvd('#ffffff', type)).toBe('#ffffff');
      expect(simulateCvd('#000000', type)).toBe('#000000');
    }
  });

  it('無彩色のグレーはグレーのまま', () => {
    for (const type of CVD_TYPES) {
      expect(simulateCvd('#808080', type)).toBe('#808080');
    }
  });

  it('常に正しい #rrggbb を返す', () => {
    for (const type of CVD_TYPES) {
      expect(simulateCvd('#3f7fd4', type)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('鮮やかな色は色覚タイプごとに異なる見え方になる', () => {
    const red = CVD_TYPES.map((t) => simulateCvd('#ff0000', t));
    expect(new Set(red).size).toBe(CVD_TYPES.length);
    // いずれも元の純赤からは変化する
    expect(red.every((c) => c !== '#ff0000')).toBe(true);
  });

  it('読めない色は null', () => {
    expect(simulateCvd('not-a-color', 'protanopia')).toBeNull();
  });
});
