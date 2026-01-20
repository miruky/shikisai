import { describe, expect, it } from 'vitest';
import { hexToOklch, normalizeHex } from './color';
import { harmonies, type HarmonyKind } from './harmony';

function hueGap(a: string, b: string): number {
  const ha = hexToOklch(a)!.h;
  const hb = hexToOklch(b)!.h;
  const diff = Math.abs(ha - hb);
  return Math.min(diff, 360 - diff);
}

const find = (hex: string, kind: HarmonyKind) => harmonies(hex)!.find((s) => s.kind === kind)!;

describe('harmonies', () => {
  it('不正な色はnull', () => {
    expect(harmonies('nope')).toBeNull();
  });

  it('すべての色が正規のHEX', () => {
    for (const scheme of harmonies('#3f7fd4')!) {
      for (const c of scheme.colors) expect(normalizeHex(c)).toBe(c);
    }
  });

  it('補色は色相を約180度回す', () => {
    const { colors } = find('#3f7fd4', 'complementary');
    expect(colors).toHaveLength(2);
    expect(hueGap(colors[0]!, colors[1]!)).toBeGreaterThan(168);
  });

  it('トライアドは3色で約120度ずつ離れる', () => {
    const { colors } = find('#c84b3c', 'triadic');
    expect(colors).toHaveLength(3);
    expect(hueGap(colors[0]!, colors[1]!)).toBeGreaterThan(108);
    expect(hueGap(colors[1]!, colors[2]!)).toBeGreaterThan(108);
  });

  it('類似色とテトラードと単色は要素数が合う', () => {
    expect(find('#3f7fd4', 'analogous').colors).toHaveLength(3);
    expect(find('#3f7fd4', 'tetradic').colors).toHaveLength(4);
    expect(find('#3f7fd4', 'monochrome').colors).toHaveLength(4);
  });

  it('単色の濃淡は色相をほぼ保ち明度が下がる', () => {
    const { colors } = find('#3f7fd4', 'monochrome');
    const ls = colors.map((c) => hexToOklch(c)!.l);
    for (let i = 1; i < ls.length; i += 1) expect(ls[i]!).toBeLessThan(ls[i - 1]!);
    for (let i = 1; i < colors.length; i += 1) expect(hueGap(colors[0]!, colors[i]!)).toBeLessThan(12);
  });
});
