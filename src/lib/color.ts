// sRGBとOKLCHの相互変換。パレット生成は知覚均等なOKLCH空間で行い、
// 出力時にsRGBへ戻す。変換式はOKLab原典(Bjorn Ottosson)に従う

export interface Rgb {
  r: number; // 0..255
  g: number;
  b: number;
}

export interface Oklch {
  l: number; // 0..1 明度
  c: number; // 0..約0.37 彩度
  h: number; // 0..360 色相
}

export function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    const short = /^#?([0-9a-f]{3})$/i.exec(hex.trim());
    if (!short) return null;
    const [r, g, b] = short[1]!.split('');
    return hexToRgb(`#${r}${r}${g}${g}${b}${b}`);
  }
  const value = Number.parseInt(match[1]!, 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, '0')}`;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
  const c = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return c * 255;
}

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.hypot(okA, okB);
  let h = (Math.atan2(okB, okA) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: okL, c, h: c < 1e-6 ? 0 : h };
}

// 色域外はチャネルを切り詰めてsRGBへ収める
export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const hRad = (h * Math.PI) / 180;
  const okA = c * Math.cos(hRad);
  const okB = c * Math.sin(hRad);

  const l_ = (l + 0.3963377774 * okA + 0.2158037573 * okB) ** 3;
  const m_ = (l - 0.1055613458 * okA - 0.0638541728 * okB) ** 3;
  const s_ = (l - 0.0894841775 * okA - 1.291485548 * okB) ** 3;

  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;

  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) };
}

// sRGBで表現できるか(切り詰めが起きないか)
export function inGamut({ l, c, h }: Oklch): boolean {
  const hRad = (h * Math.PI) / 180;
  const okA = c * Math.cos(hRad);
  const okB = c * Math.sin(hRad);
  const l_ = (l + 0.3963377774 * okA + 0.2158037573 * okB) ** 3;
  const m_ = (l - 0.1055613458 * okA - 0.0638541728 * okB) ** 3;
  const s_ = (l - 0.0894841775 * okA - 1.291485548 * okB) ** 3;
  const channels = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return channels.every((v) => v >= -1e-6 && v <= 1 + 1e-6);
}

// 彩度を下げて色域内に収めた色を返す
export function clampChroma(color: Oklch): Oklch {
  if (inGamut(color)) return color;
  let low = 0;
  let high = color.c;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (inGamut({ ...color, c: mid })) low = mid;
    else high = mid;
  }
  return { ...color, c: low };
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToOklch(rgb) : null;
}

export function oklchToHex(color: Oklch): string {
  return rgbToHex(oklchToRgb(clampChroma(color)));
}
