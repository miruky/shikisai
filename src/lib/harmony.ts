// ベースカラーから古典的な配色(色相環上の関係)を導く。色相の回転はOKLCHで行い、
// 明度・彩度を保ったまま色相だけを動かすので、HSLより各色の明るさが揃う。

import { hexToOklch, oklchToHex, type Oklch } from './color';

export type HarmonyKind =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split'
  | 'tetradic'
  | 'monochrome';

export interface HarmonyScheme {
  kind: HarmonyKind;
  label: string;
  colors: string[];
}

const LABELS: Record<HarmonyKind, string> = {
  complementary: '補色',
  analogous: '類似色',
  triadic: 'トライアド',
  split: 'スプリット補色',
  tetradic: 'テトラード',
  monochrome: '単色の濃淡',
};

function rotate(base: Oklch, deltaH: number): string {
  return oklchToHex({ l: base.l, c: base.c, h: (base.h + deltaH + 360) % 360 });
}

export function harmonies(baseHex: string): HarmonyScheme[] | null {
  const base = hexToOklch(baseHex);
  if (!base) return null;
  const self = oklchToHex(base);
  const mono = [0.82, 0.66, 0.5, 0.34].map((l) => oklchToHex({ l, c: base.c, h: base.h }));
  const scheme = (kind: HarmonyKind, colors: string[]): HarmonyScheme => ({
    kind,
    label: LABELS[kind],
    colors,
  });
  return [
    scheme('complementary', [self, rotate(base, 180)]),
    scheme('analogous', [rotate(base, -30), self, rotate(base, 30)]),
    scheme('triadic', [self, rotate(base, 120), rotate(base, 240)]),
    scheme('split', [self, rotate(base, 150), rotate(base, 210)]),
    scheme('tetradic', [self, rotate(base, 90), rotate(base, 180), rotate(base, 270)]),
    scheme('monochrome', mono),
  ];
}
