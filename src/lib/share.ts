// 画面の状態(ベースカラーと書き出し形式)をURLクエリへ載せ、リンクで共有できるようにする。
// 既定値は省いて短く保つ。読めない値は無視して既定にフォールバックする。

import { normalizeHex } from './color';

export type ExportFormat = 'css' | 'json' | 'scss' | 'tailwind';

const FORMATS: readonly ExportFormat[] = ['css', 'json', 'scss', 'tailwind'];

function isFormat(value: string | null): value is ExportFormat {
  return value !== null && (FORMATS as readonly string[]).includes(value);
}

export interface ShareState {
  color: string;
  format: ExportFormat;
}

export function encodeShare(state: ShareState): string {
  const params = new URLSearchParams();
  params.set('c', state.color.replace(/^#/, ''));
  if (state.format !== 'css') params.set('fmt', state.format);
  return params.toString();
}

export function decodeShare(search: string): Partial<ShareState> {
  const params = new URLSearchParams(search.replace(/^[?#]/, ''));
  const out: Partial<ShareState> = {};
  const c = params.get('c');
  if (c) {
    const hex = normalizeHex(c);
    if (hex) out.color = hex;
  }
  const fmt = params.get('fmt');
  if (isFormat(fmt)) out.format = fmt;
  return out;
}
