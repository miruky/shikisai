// ベースカラーからトーンスケールとライト・ダークのテーマトークンを導く。
// 明度はOKLCHで均等に刻み、彩度は中間トーンを頂点とした山なりに配分する

import { clampChroma, hexToOklch, oklchToHex } from './color';

export const TONE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type ToneStep = (typeof TONE_STEPS)[number];

export interface ToneScale {
  base: string;
  tones: Array<{ step: ToneStep; hex: string }>;
}

// 各ステップの目標明度。50が最も明るく900が最も暗い
const TONE_LIGHTNESS: Record<ToneStep, number> = {
  50: 0.97,
  100: 0.93,
  200: 0.86,
  300: 0.78,
  400: 0.7,
  500: 0.62,
  600: 0.53,
  700: 0.44,
  800: 0.35,
  900: 0.26,
};

// 端のトーンほど彩度を落とし、淡色・濃色が濁らないようにする
function chromaAt(baseChroma: number, lightness: number): number {
  const peak = 0.62;
  const spread = 0.5;
  const factor = Math.max(0.12, 1 - ((lightness - peak) / spread) ** 2);
  return baseChroma * factor;
}

// そこそこ彩度のある中明度の色をランダムに選ぶ。極端に淡い・濁る色は避け、
// どの色相でもスケールが破綻しにくい範囲に収める。
export function randomBaseColor(): string {
  const h = Math.random() * 360;
  const l = 0.55 + Math.random() * 0.12;
  const c = 0.1 + Math.random() * 0.1;
  return oklchToHex({ l, c, h });
}

export function toneScale(baseHex: string): ToneScale | null {
  const base = hexToOklch(baseHex);
  if (!base) return null;
  const tones = TONE_STEPS.map((step) => {
    const l = TONE_LIGHTNESS[step];
    const color = clampChroma({ l, c: chromaAt(base.c, l), h: base.h });
    return { step, hex: oklchToHex(color) };
  });
  return { base: baseHex, tones };
}

export interface ThemeTokens {
  background: string;
  surface: string;
  border: string;
  text: string;
  textDim: string;
  primary: string;
  primaryText: string;
  primaryHover: string;
}

export interface ThemePair {
  light: ThemeTokens;
  dark: ThemeTokens;
}

// 同じ色相からライト・ダーク両テーマのトークンを同時に導く。
// 背景はごく低彩度で色相だけ残し、テーマに統一感を持たせる
export function themePair(baseHex: string): ThemePair | null {
  const base = hexToOklch(baseHex);
  if (!base) return null;
  const h = base.h;
  const tint = (l: number, c: number) => oklchToHex({ l, c, h });
  const accentC = Math.max(base.c, 0.09);

  const light: ThemeTokens = {
    background: tint(0.985, 0.003),
    surface: tint(0.955, 0.006),
    border: tint(0.88, 0.012),
    text: tint(0.24, 0.02),
    textDim: tint(0.47, 0.02),
    primary: oklchToHex({ l: 0.55, c: accentC, h }),
    primaryText: '#ffffff',
    primaryHover: oklchToHex({ l: 0.5, c: accentC, h }),
  };
  const dark: ThemeTokens = {
    background: tint(0.18, 0.012),
    surface: tint(0.23, 0.015),
    border: tint(0.34, 0.02),
    text: tint(0.93, 0.01),
    textDim: tint(0.72, 0.015),
    primary: oklchToHex({ l: 0.72, c: accentC, h }),
    primaryText: '#14161c',
    primaryHover: oklchToHex({ l: 0.78, c: accentC, h }),
  };
  return { light, dark };
}

export function toCssVariables(pair: ThemePair): string {
  const lines = (tokens: ThemeTokens, indent: string) =>
    [
      `${indent}--color-background: ${tokens.background};`,
      `${indent}--color-surface: ${tokens.surface};`,
      `${indent}--color-border: ${tokens.border};`,
      `${indent}--color-text: ${tokens.text};`,
      `${indent}--color-text-dim: ${tokens.textDim};`,
      `${indent}--color-primary: ${tokens.primary};`,
      `${indent}--color-primary-text: ${tokens.primaryText};`,
      `${indent}--color-primary-hover: ${tokens.primaryHover};`,
    ].join('\n');
  return [
    ':root {',
    lines(pair.light, '  '),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    lines(pair.dark, '    '),
    '  }',
    '}',
    '',
  ].join('\n');
}

export function toJson(scale: ToneScale, pair: ThemePair): string {
  return JSON.stringify(
    {
      scale: Object.fromEntries(scale.tones.map(({ step, hex }) => [step, hex])),
      themes: pair,
    },
    null,
    2,
  );
}
