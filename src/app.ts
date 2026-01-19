import { hexToOklch, normalizeHex } from './lib/color';
import { contrastRatio, readableTextColor, wcagLevel } from './lib/contrast';
import {
  randomBaseColor,
  themePair,
  toCssVariables,
  toJson,
  toneScale,
  type ThemeTokens,
} from './lib/palette';
import { applyTheme, nextTheme, readTheme, themeIcon, THEME_LABEL, type ThemeChoice } from './theme';

const DEFAULT_COLOR = '#3f7fd4';

// 三原色の重なりで減法混色を示すマーク。地のテーマに依らず色そのものを見せる。
const LOGO_SVG = `
<svg viewBox="0 0 48 48" width="36" height="36" role="img" aria-label="shikisai">
  <title>shikisai</title>
  <circle cx="19" cy="19.5" r="11" fill="#e0483a" opacity="0.82"/>
  <circle cx="29" cy="19.5" r="11" fill="#3f7fd4" opacity="0.82"/>
  <circle cx="24" cy="28.5" r="11" fill="#eab308" opacity="0.82"/>
</svg>`;

export class App {
  private readonly el: Record<string, HTMLElement> = {};
  private exportKind: 'css' | 'json' = 'css';
  private theme: ThemeChoice = readTheme();
  private current = DEFAULT_COLOR;

  constructor(private readonly root: HTMLElement) {
    this.render();
    this.wire();
    this.update(DEFAULT_COLOR);
  }

  private render(): void {
    this.root.innerHTML = `
      <a class="skip-link" href="#work">本文へスキップ</a>
      <header class="masthead">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">${LOGO_SVG}</span>
          <span class="brand-text">
            <span class="wordmark">shikisai</span>
            <span class="brand-kicker">色見本帳 — palette studio</span>
          </span>
        </div>
        <button type="button" class="ghost-btn theme-toggle" data-id="theme" aria-live="polite"></button>
      </header>

      <section class="chip" aria-labelledby="chip-label">
        <div class="chip-field" data-id="chip">
          <span class="chip-hex" data-id="chip-hex"></span>
        </div>
        <div class="chip-side">
          <p class="kicker" id="chip-label">ベースカラー</p>
          <div class="picker">
            <input type="color" data-id="picker" value="${DEFAULT_COLOR}" aria-label="ベースカラーをピッカーで選ぶ" />
            <input type="text" data-id="hex" value="${DEFAULT_COLOR}" spellcheck="false" autocomplete="off" aria-label="HEX値" />
            <button type="button" class="ghost-btn" data-id="random" title="ランダムな色">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>
              <span>ランダム</span>
            </button>
          </div>
          <p class="parse-error" data-id="error" role="alert" hidden>HEXカラー(#rrggbb)として読めない</p>
          <dl class="readout" data-id="readout"></dl>
        </div>
      </section>

      <main id="work">
        <section class="block">
          <div class="block-head">
            <p class="kicker">tone scale</p>
            <h2>トーンスケール</h2>
          </div>
          <p class="hint">明度を10段に刻んだスケール。バッジは白字・黒字を載せたときのWCAG判定。クリックでHEXをコピーする。</p>
          <div class="fan" data-id="scale" role="list"></div>
        </section>

        <section class="block">
          <div class="block-head">
            <p class="kicker">theme specimens</p>
            <h2>テーマプレビュー</h2>
          </div>
          <p class="hint">同じ色相から導いたライト・ダークのトークン。本文はAAA、ボタン文字はAAを保証する設計。</p>
          <div class="specimens" data-id="themes"></div>
        </section>

        <section class="block">
          <div class="block-head pair">
            <span>
              <p class="kicker">export</p>
              <h2>書き出し</h2>
            </span>
            <span class="export-controls">
              <span class="tabs" role="tablist" aria-label="書き出し形式">
                <button type="button" class="tab" role="tab" aria-selected="true" data-id="tab-css">CSS変数</button>
                <button type="button" class="tab" role="tab" aria-selected="false" data-id="tab-json">JSON</button>
              </span>
              <button type="button" class="solid-btn" data-id="copy">コピー</button>
            </span>
          </div>
          <pre class="code" data-id="output" tabindex="0" aria-label="書き出しコード"></pre>
        </section>
      </main>

      <footer class="colophon">
        <p>パレットは知覚均等なOKLCH色空間で生成し、sRGB色域外の色は彩度を切り詰めて収める。計算はすべてブラウザ内で完結する。</p>
      </footer>
      <p class="sr-only" role="status" aria-live="polite" data-id="live"></p>
    `;
    this.root.querySelectorAll<HTMLElement>('[data-id]').forEach((node) => {
      this.el[node.dataset.id ?? ''] = node;
    });
  }

  private wire(): void {
    const picker = this.el['picker'] as HTMLInputElement;
    const hex = this.el['hex'] as HTMLInputElement;
    picker.addEventListener('input', () => {
      hex.value = picker.value;
      this.update(picker.value);
    });
    hex.addEventListener('input', () => this.update(hex.value));
    this.el['random']!.addEventListener('click', () => {
      const next = randomBaseColor();
      hex.value = next;
      this.update(next);
    });
    this.el['tab-css']!.addEventListener('click', () => this.switchTab('css'));
    this.el['tab-json']!.addEventListener('click', () => this.switchTab('json'));
    this.el['copy']!.addEventListener('click', () => {
      void this.copy(this.el['output']!.textContent ?? '', '書き出しを');
    });
    this.el['theme']!.addEventListener('click', () => {
      this.theme = nextTheme(this.theme);
      applyTheme(this.theme);
      this.renderThemeToggle();
    });
    this.renderThemeToggle();
  }

  private renderThemeToggle(): void {
    const btn = this.el['theme']!;
    btn.innerHTML = `${themeIcon(this.theme)}<span>${THEME_LABEL[this.theme]}</span>`;
    btn.setAttribute('aria-label', `テーマ: ${THEME_LABEL[this.theme]}(切り替え)`);
  }

  private switchTab(kind: 'css' | 'json'): void {
    this.exportKind = kind;
    this.el['tab-css']!.setAttribute('aria-selected', String(kind === 'css'));
    this.el['tab-json']!.setAttribute('aria-selected', String(kind === 'json'));
    this.setExport();
  }

  private update(value: string): void {
    const canonical = normalizeHex(value);
    const error = this.el['error']!;
    if (!canonical) {
      // 入力途中の空欄では出さず、読めない文字列が入っているときだけ知らせる
      error.hidden = value.trim() === '';
      return;
    }
    error.hidden = true;
    this.current = canonical;
    (this.el['picker'] as HTMLInputElement).value = canonical;

    // 地のテーマのアクセント(罫線・フォーカス輪郭)を選択色の色相へ寄せる。
    // --accent は :root で解決されるため :root(html)側に書き込む。
    const base = hexToOklch(canonical)!;
    document.documentElement.style.setProperty('--base-h', String(Math.round(base.h)));

    this.renderChip(canonical, base);
    this.renderScale();
    this.renderThemes();
    this.setExport();
  }

  private renderChip(hex: string, oklch: { l: number; c: number; h: number }): void {
    const field = this.el['chip'] as HTMLElement;
    field.style.background = hex;
    const ink = readableTextColor(hex);
    field.style.color = ink;
    this.el['chip-hex']!.textContent = hex.toUpperCase();
    this.el['readout']!.innerHTML = [
      ['明度 L', `${(oklch.l * 100).toFixed(1)}%`],
      ['彩度 C', oklch.c.toFixed(3)],
      ['色相 H', `${Math.round(oklch.h)}°`],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');
  }

  private renderScale(): void {
    const wrap = this.el['scale']!;
    const scale = toneScale(this.current)!;
    wrap.innerHTML = '';
    for (const { step, hex } of scale.tones) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'swatch';
      cell.setAttribute('role', 'listitem');
      cell.style.background = hex;
      cell.style.color = readableTextColor(hex);
      cell.setAttribute('aria-label', `トーン${step} ${hex} をコピー`);
      const onWhite = wcagLevel(contrastRatio(hex, '#ffffff'));
      const onBlack = wcagLevel(contrastRatio(hex, '#000000'));
      cell.innerHTML = `
        <span class="swatch-step">${step}</span>
        <code class="swatch-hex">${hex}</code>
        <span class="swatch-badges">
          <span class="badge ${onWhite === 'fail' ? 'is-fail' : ''}">白 ${onWhite}</span>
          <span class="badge ${onBlack === 'fail' ? 'is-fail' : ''}">黒 ${onBlack}</span>
        </span>`;
      cell.addEventListener('click', () => void this.copy(hex, `${hex} を`));
      wrap.appendChild(cell);
    }
  }

  private renderThemes(): void {
    const wrap = this.el['themes']!;
    const pair = themePair(this.current)!;
    wrap.innerHTML = '';
    const cards: Array<[string, ThemeTokens]> = [
      ['ライト', pair.light],
      ['ダーク', pair.dark],
    ];
    for (const [name, tokens] of cards) {
      const bodyRatio = contrastRatio(tokens.text, tokens.background).toFixed(1);
      const buttonRatio = contrastRatio(tokens.primaryText, tokens.primary).toFixed(1);
      const card = document.createElement('div');
      card.className = 'specimen';
      card.style.background = tokens.background;
      card.style.color = tokens.text;
      card.style.borderColor = tokens.border;
      card.innerHTML = `
        <p class="specimen-name" style="color:${tokens.textDim}">${name}</p>
        <div class="specimen-surface" style="background:${tokens.surface};border-color:${tokens.border}">
          <p>本文テキストの見え方を確かめるための一文。</p>
          <p style="color:${tokens.textDim}">補足の文字色はこの程度の濃さになる。</p>
          <button type="button" tabindex="-1" style="background:${tokens.primary};color:${tokens.primaryText}">主要ボタン</button>
        </div>
        <p class="specimen-ratios" style="color:${tokens.textDim}">本文 <b>${bodyRatio}</b>:1 / ボタン文字 <b>${buttonRatio}</b>:1</p>
      `;
      wrap.appendChild(card);
    }
  }

  private setExport(): void {
    const scale = toneScale(this.current)!;
    const pair = themePair(this.current)!;
    this.el['output']!.textContent =
      this.exportKind === 'css' ? toCssVariables(pair) : toJson(scale, pair);
  }

  private async copy(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.announce(`${label}コピーした`);
    } catch {
      this.announce('コピーできなかった');
    }
  }

  private announce(message: string): void {
    this.el['live']!.textContent = message;
  }
}
