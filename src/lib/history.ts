// 最近使ったベースカラーの履歴。新しい色を先頭へ、重複は畳んで上限数で打ち切る。
// 純粋な配列操作にしておき、永続化(localStorage)は呼び出し側が受け持つ。

export const RECENT_LIMIT = 8;

export function pushRecent(list: readonly string[], color: string, limit = RECENT_LIMIT): string[] {
  return [color, ...list.filter((c) => c !== color)].slice(0, limit);
}
