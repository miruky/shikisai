import { describe, expect, it } from 'vitest';
import { pushRecent } from './history';

describe('pushRecent', () => {
  it('新しい色を先頭へ積む', () => {
    expect(pushRecent(['#111111'], '#222222')).toEqual(['#222222', '#111111']);
  });

  it('既出の色は重複させず先頭へ繰り上げる', () => {
    expect(pushRecent(['#a', '#b', '#c'], '#b')).toEqual(['#b', '#a', '#c']);
  });

  it('上限を超えたら古いものから捨てる', () => {
    const list = ['#1', '#2', '#3'];
    expect(pushRecent(list, '#0', 3)).toEqual(['#0', '#1', '#2']);
  });
});
