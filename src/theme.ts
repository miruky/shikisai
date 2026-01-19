// アプリ自身の配色を 自動(OSに追従)/ ライト / ダーク の3状態で切り替える。
// 色を判定するツールなので、地のテーマを手元で固定できることに実用上の意味がある。
// data-theme属性で制御し、選択はlocalStorageへ残す。初期適用のFOUC防止は
// index.html のインラインスクリプトが行い、ここでは以降の操作を受け持つ。

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'shikisai:theme';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

export const THEME_LABEL: Record<ThemeChoice, string> = {
  system: '自動',
  light: 'ライト',
  dark: 'ダーク',
};

function isChoice(value: string | null): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // プライベートブラウズ等で保存できなくても切り替え自体は機能させる
  }
}

export function nextTheme(current: ThemeChoice): ThemeChoice {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
}

// 状態を表すモダンSVG。currentColorで地の文字色に追従する。
// system=半月(自動)、light=太陽、dark=月。
const ICONS: Record<ThemeChoice, string> = {
  system: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none"/>',
  light:
    '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/>',
  dark: '<path d="M20 13.2A7.6 7.6 0 1 1 10.8 4a6 6 0 0 0 9.2 9.2z"/>',
};

export function themeIcon(choice: ThemeChoice): string {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[choice]}</svg>`;
}
