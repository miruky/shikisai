import { describe, expect, it } from 'vitest';
import { hexToOklch, normalizeHex } from './color';
import { contrastRatio } from './contrast';
import { randomBaseColor, themePair, toCssVariables, toJson, TONE_STEPS, toneScale } from './palette';

describe('toneScale', () => {
  it('10トーンを明るい順に生成する', () => {
    const scale = toneScale('#3f7fd4')!;
    expect(scale.tones).toHaveLength(TONE_STEPS.length);
    const lightnesses = scale.tones.map(({ hex }) => hexToOklch(hex)!.l);
    for (let i = 1; i < lightnesses.length; i += 1) {
      expect(lightnesses[i]!).toBeLessThan(lightnesses[i - 1]!);
    }
  });

  it('色相を概ね保つ', () => {
    const scale = toneScale('#3f7fd4')!;
    const baseHue = hexToOklch('#3f7fd4')!.h;
    for (const { hex } of scale.tones) {
      const hue = hexToOklch(hex)!.h;
      const diff = Math.min(Math.abs(hue - baseHue), 360 - Math.abs(hue - baseHue));
      expect(diff).toBeLessThan(12);
    }
  });

  it('不正な色はnull', () => {
    expect(toneScale('blue')).toBeNull();
  });
});

describe('themePair', () => {
  it('本文テキストが両テーマでAAAを満たす', () => {
    for (const hex of ['#3f7fd4', '#c84b3c', '#1b5e20', '#e8b04b']) {
      const pair = themePair(hex)!;
      expect(contrastRatio(pair.light.text, pair.light.background)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(pair.dark.text, pair.dark.background)).toBeGreaterThanOrEqual(7);
    }
  });

  it('プライマリボタンの文字が両テーマでAAを満たす', () => {
    for (const hex of ['#3f7fd4', '#c84b3c', '#7b5ec4']) {
      const pair = themePair(hex)!;
      expect(contrastRatio(pair.light.primaryText, pair.light.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(pair.dark.primaryText, pair.dark.primary)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('randomBaseColor', () => {
  it('常に正規のHEXを返し、スケールを生成できる', () => {
    for (let i = 0; i < 50; i += 1) {
      const hex = randomBaseColor();
      expect(normalizeHex(hex)).toBe(hex);
      expect(toneScale(hex)).not.toBeNull();
    }
  });

  it('呼ぶたびに色が変わる', () => {
    const colors = new Set(Array.from({ length: 20 }, () => randomBaseColor()));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('エクスポート', () => {
  it('CSS変数はライトとダークの両ブロックを含む', () => {
    const css = toCssVariables(themePair('#3f7fd4')!);
    expect(css).toContain(':root {');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('--color-primary:');
  });

  it('JSONはスケールとテーマを含む有効なJSON', () => {
    const text = toJson(toneScale('#3f7fd4')!, themePair('#3f7fd4')!);
    const data = JSON.parse(text) as { scale: Record<string, string>; themes: object };
    expect(Object.keys(data.scale)).toHaveLength(10);
    expect(data.themes).toHaveProperty('light');
    expect(data.themes).toHaveProperty('dark');
  });
});
