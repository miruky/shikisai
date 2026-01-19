import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from './share';

describe('encodeShare', () => {
  it('色は#を外して載せ、既定のCSS形式は省く', () => {
    expect(encodeShare({ color: '#3f7fd4', format: 'css' })).toBe('c=3f7fd4');
  });

  it('既定でない形式は明示する', () => {
    expect(encodeShare({ color: '#3f7fd4', format: 'json' })).toBe('c=3f7fd4&fmt=json');
  });
});

describe('decodeShare', () => {
  it('?や#の接頭辞があっても読む', () => {
    expect(decodeShare('?c=c84b3c&fmt=json')).toEqual({ color: '#c84b3c', format: 'json' });
    expect(decodeShare('#c=c84b3c')).toEqual({ color: '#c84b3c' });
  });

  it('短縮形も正規化する', () => {
    expect(decodeShare('c=abc')).toEqual({ color: '#aabbcc' });
  });

  it('読めない色や不明な形式は無視する', () => {
    expect(decodeShare('c=nope&fmt=xml')).toEqual({});
    expect(decodeShare('')).toEqual({});
  });
});
