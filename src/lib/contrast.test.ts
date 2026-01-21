import { describe, expect, it } from 'vitest';
import { contrastRatio, readableTextColor, wcagChecks, wcagLevel } from './contrast';

describe('contrastRatio', () => {
  it('白と黒は21:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });

  it('同色は1:1で、順序に依存しない', () => {
    expect(contrastRatio('#3f7fd4', '#3f7fd4')).toBeCloseTo(1, 5);
    expect(contrastRatio('#ffffff', '#777777')).toBeCloseTo(contrastRatio('#777777', '#ffffff'), 8);
  });

  it('既知の組み合わせに一致する', () => {
    // #767676 は白背景でAAぎりぎりを満たす定番のグレー
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.54);
  });
});

describe('wcagLevel', () => {
  it('しきい値で段階が変わる', () => {
    expect(wcagLevel(7)).toBe('AAA');
    expect(wcagLevel(4.5)).toBe('AA');
    expect(wcagLevel(3)).toBe('AA-large');
    expect(wcagLevel(2.9)).toBe('fail');
  });
});

describe('wcagChecks', () => {
  it('比21:1は全基準を満たす', () => {
    expect(wcagChecks(21)).toEqual({
      normalAA: true,
      normalAAA: true,
      largeAA: true,
      largeAAA: true,
    });
  });

  it('比4.5は通常AAと大きいAA/AAAを満たすが通常AAAは満たさない', () => {
    expect(wcagChecks(4.5)).toEqual({
      normalAA: true,
      normalAAA: false,
      largeAA: true,
      largeAAA: true,
    });
  });

  it('比3は大きいAAのみ満たす', () => {
    expect(wcagChecks(3)).toEqual({
      normalAA: false,
      normalAAA: false,
      largeAA: true,
      largeAAA: false,
    });
  });

  it('比2.9はすべて満たさない', () => {
    expect(wcagChecks(2.9)).toEqual({
      normalAA: false,
      normalAAA: false,
      largeAA: false,
      largeAAA: false,
    });
  });
});

describe('readableTextColor', () => {
  it('暗い背景には白、明るい背景には黒を選ぶ', () => {
    expect(readableTextColor('#14161c')).toBe('#ffffff');
    expect(readableTextColor('#f5f6f8')).toBe('#000000');
  });
});
