// WCAG 2.xのコントラスト比。相対輝度の定義はWCAGの式に従う

import { hexToRgb, type Rgb } from './color';

export function relativeLuminance({ r, g, b }: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(a: string, b: string): number {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return 1;
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagLevel = 'AAA' | 'AA' | 'AA-large' | 'fail';

// 通常テキスト基準: AA=4.5、AAA=7。大きいテキストとUI部品: 3
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

export interface WcagChecks {
  normalAA: boolean; // 通常テキスト AA(>=4.5)
  normalAAA: boolean; // 通常テキスト AAA(>=7)
  largeAA: boolean; // 大きいテキスト AA(>=3)
  largeAAA: boolean; // 大きいテキスト AAA(>=4.5)
}

// コントラスト比を、テキストサイズ別のWCAG各基準への合否に展開する。
export function wcagChecks(ratio: number): WcagChecks {
  return {
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
  };
}

// 背景に対して読みやすい文字色(白か黒)を選ぶ
export function readableTextColor(background: string): string {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#000000')
    ? '#ffffff'
    : '#000000';
}
