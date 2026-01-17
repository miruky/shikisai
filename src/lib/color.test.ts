import { describe, expect, it } from 'vitest';
import {
  clampChroma,
  hexToOklch,
  hexToRgb,
  inGamut,
  oklchToHex,
  rgbToHex,
  rgbToOklch,
} from './color';

describe('hexToRgb / rgbToHex', () => {
  it('6桁・3桁・#なしを受け付ける', () => {
    expect(hexToRgb('#ff5a3c')).toEqual({ r: 255, g: 90, b: 60 });
    expect(hexToRgb('f53')).toEqual({ r: 255, g: 85, b: 51 });
    expect(rgbToHex({ r: 255, g: 90, b: 60 })).toBe('#ff5a3c');
  });

  it('不正な表記はnull', () => {
    expect(hexToRgb('#12345')).toBeNull();
    expect(hexToRgb('red')).toBeNull();
  });
});

describe('OKLCH変換', () => {
  it('白と黒の明度が両端に近い', () => {
    expect(rgbToOklch({ r: 255, g: 255, b: 255 }).l).toBeCloseTo(1, 2);
    expect(rgbToOklch({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 2);
  });

  it('hex経由の往復で値が保たれる', () => {
    for (const hex of ['#ff5a3c', '#3f7fd4', '#1b5e20', '#888888', '#e8b04b']) {
      expect(oklchToHex(hexToOklch(hex)!)).toBe(hex);
    }
  });

  it('無彩色の色相は0に畳む', () => {
    expect(hexToOklch('#777777')!.h).toBe(0);
  });
});

describe('色域処理', () => {
  it('高彩度すぎる色を色域内へ収める', () => {
    const wild = { l: 0.6, c: 0.4, h: 30 };
    expect(inGamut(wild)).toBe(false);
    const clamped = clampChroma(wild);
    expect(inGamut(clamped)).toBe(true);
    expect(clamped.c).toBeLessThan(0.4);
    expect(clamped.h).toBe(30);
  });

  it('色域内の色は変更しない', () => {
    const mild = { l: 0.6, c: 0.05, h: 200 };
    expect(clampChroma(mild)).toEqual(mild);
  });
});
