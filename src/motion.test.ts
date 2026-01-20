import { describe, expect, it } from 'vitest';
import { animateValue, easeOutCubic } from './motion';

describe('easeOutCubic', () => {
  it('両端を固定し、序盤ほど速い', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 3);
  });

  it('単調増加する', () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.1) {
      const v = easeOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('animateValue', () => {
  it('rAFが無い環境では即座に最終値を一度だけ渡す', () => {
    const seen: number[] = [];
    animateValue(0, 10, 300, (v) => seen.push(v));
    expect(seen).toEqual([10]);
  });

  it('from===to なら最終値のみ', () => {
    const seen: number[] = [];
    animateValue(5, 5, 300, (v) => seen.push(v));
    expect(seen).toEqual([5]);
  });
});
