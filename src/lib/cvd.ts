// 二色覚(色覚特性)のシミュレーション。配色が特定の色覚で見分けづらくならないかを確かめる。
// Wickline / HCIRN の変換行列をsRGB空間に適用する近似。厳密な医療用途ではなく、設計の目安。

import { hexToRgb, rgbToHex, type Rgb } from './color';

export type CvdType = 'protanopia' | 'deuteranopia' | 'tritanopia';

export const CVD_TYPES: readonly CvdType[] = ['protanopia', 'deuteranopia', 'tritanopia'];

export const CVD_LABEL: Record<CvdType, string> = {
  protanopia: '1型(赤)',
  deuteranopia: '2型(緑)',
  tritanopia: '3型(青)',
};

type Matrix = readonly [number, number, number, number, number, number, number, number, number];

const MATRICES: Record<CvdType, Matrix> = {
  protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
};

function apply(rgb: Rgb, m: Matrix): Rgb {
  return {
    r: m[0] * rgb.r + m[1] * rgb.g + m[2] * rgb.b,
    g: m[3] * rgb.r + m[4] * rgb.g + m[5] * rgb.b,
    b: m[6] * rgb.r + m[7] * rgb.g + m[8] * rgb.b,
  };
}

// hex色を指定の色覚での見え方に変換して返す。読めない色は null。
export function simulateCvd(hex: string, type: CvdType): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHex(apply(rgb, MATRICES[type]));
}
