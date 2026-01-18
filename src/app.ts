import { hexToRgb } from './lib/color';
import { contrastRatio, readableTextColor, wcagLevel } from './lib/contrast';
import { themePair, toCssVariables, toJson, toneScale, type ThemeTokens } from './lib/palette';

const DEFAULT_COLOR = '#3f7fd4';

const LOGO_SVG = `
<svg viewBox="0 0 64 64" width="44" height="44" role="img" aria-label="shikisaiのロゴ">
  <title>shikisai</title>
  <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="4"/>
  <path d="M32 8a24 24 0 0 1 0 48z" fill="currentColor" opacity="0.25"/>
  <circle cx="24" cy="26" r="5" fill="#3f7fd4"/>
  <circle cx="38" cy="20" r="5" fill="#c84b3c"/>
  <circle cx="40" cy="40" r="5" fill="#e8b04b"/>
</svg>`;

export class App {
  private readonly el: Record<string, HTMLElement> = {};
  private exportKind: 'css' | 'json' = 'css';

  constructor(private readonly root: HTMLElement) {
    this.render();
    this.wire();
    this.update(DEFAULT_COLOR);
  }

  private render(): void {
    this.root.innerHTML = `
      <header class="site-header">
        <span class="logo" aria-hidden="true">${LOGO_SVG}</span>
        <div>
          <h1>shikisai</h1>
          <p class="tagline">ベースカラーからトーンスケールとライト・ダーク両テーマを同時設計する</p>
        </div>
        <div class="picker">
          <input type="color" data-id="picker" value="${DEFAULT_COLOR}" aria-label="ベースカラー">
          <input type="text" data-id="hex" value="${DEFAULT_COLOR}" spellcheck="false" aria-label="HEX値">
        </div>
      </header>
      <p class="parse-error" data-id="error" hidden>HEXカラー(#rrggbb)として読めない</p>
      <main>
        <section class="pane">
          <h2>トーンスケール</h2>
          <p class="hint">バッジは白・黒それぞれの文字を載せたときのWCAGコントラスト判定</p>
          <div class="scale" data-id="scale"></div>
        </section>
        <section class="pane">
          <h2>テーマプレビュー</h2>
          <p class="hint">同じ色相から導いたライト・ダークのトークン。本文はAAA、ボタン文字はAAを保証する設計</p>
          <div class="themes" data-id="themes"></div>
        </section>
        <section class="pane">
          <div class="pane-head">
            <h2>書き出し</h2>
            <span>
              <button type="button" class="tab-btn active" data-id="tab-css">CSS変数</button>
              <button type="button" class="tab-btn" data-id="tab-json">JSON</button>
              <button type="button" class="primary-btn" data-id="copy">コピー</button>
            </span>
          </div>
          <pre class="code-view" data-id="output"></pre>
        </section>
      </main>
      <footer class="site-footer">
        <p>パレットは知覚均等なOKLCH色空間で生成し、sRGB色域外の色は彩度を切り詰めて収める。計算はすべてブラウザ内で行う。</p>
      </footer>
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
    this.el['tab-css']!.addEventListener('click', () => this.switchTab('css'));
    this.el['tab-json']!.addEventListener('click', () => this.switchTab('json'));
    this.el['copy']!.addEventListener('click', () => {
      void navigator.clipboard.writeText(this.el['output']!.textContent ?? '');
    });
  }

  private switchTab(kind: 'css' | 'json'): void {
    this.exportKind = kind;
    this.el['tab-css']!.classList.toggle('active', kind === 'css');
    this.el['tab-json']!.classList.toggle('active', kind === 'json');
    this.update((this.el['hex'] as HTMLInputElement).value);
  }

  private update(value: string): void {
    const error = this.el['error']!;
    if (!hexToRgb(value)) {
      error.hidden = false;
      return;
    }
    error.hidden = true;
    const normalized = value.startsWith('#') ? value : `#${value}`;
    (this.el['picker'] as HTMLInputElement).value =
      normalized.length === 4 ? DEFAULT_COLOR : normalized;

    const scale = toneScale(normalized)!;
    const pair = themePair(normalized)!;
    this.renderScale(scale.tones);
    this.renderThemes(pair);
    this.el['output']!.textContent =
      this.exportKind === 'css' ? toCssVariables(pair) : toJson(scale, pair);
  }

  private renderScale(tones: Array<{ step: number; hex: string }>): void {
    const wrap = this.el['scale']!;
    wrap.innerHTML = '';
    for (const { step, hex } of tones) {
      const cell = document.createElement('div');
      cell.className = 'tone';
      cell.style.background = hex;
      cell.style.color = readableTextColor(hex);
      const onWhite = wcagLevel(contrastRatio(hex, '#ffffff'));
      const onBlack = wcagLevel(contrastRatio(hex, '#000000'));
      cell.innerHTML = `
        <span class="tone-step">${step}</span>
        <code class="tone-hex">${hex}</code>
        <span class="tone-badges">
          <span class="badge ${onWhite === 'fail' ? 'badge-fail' : ''}">白字 ${onWhite}</span>
          <span class="badge ${onBlack === 'fail' ? 'badge-fail' : ''}">黒字 ${onBlack}</span>
        </span>`;
      wrap.appendChild(cell);
    }
  }

  private renderThemes(pair: { light: ThemeTokens; dark: ThemeTokens }): void {
    const wrap = this.el['themes']!;
    wrap.innerHTML = '';
    const cards: Array<[string, ThemeTokens]> = [
      ['ライト', pair.light],
      ['ダーク', pair.dark],
    ];
    for (const [name, tokens] of cards) {
      const bodyRatio = contrastRatio(tokens.text, tokens.background).toFixed(1);
      const buttonRatio = contrastRatio(tokens.primaryText, tokens.primary).toFixed(1);
      const card = document.createElement('div');
      card.className = 'theme-card';
      card.style.background = tokens.background;
      card.style.color = tokens.text;
      card.style.borderColor = tokens.border;
      card.innerHTML = `
        <p class="theme-name" style="color:${tokens.textDim}">${name}</p>
        <div class="theme-surface" style="background:${tokens.surface};border-color:${tokens.border}">
          <p>本文テキストの見え方を確かめるための一文。</p>
          <p style="color:${tokens.textDim}">補足の文字色はこの程度の濃さになる。</p>
          <button type="button" style="background:${tokens.primary};color:${tokens.primaryText}">主要ボタン</button>
        </div>
        <p class="theme-ratios" style="color:${tokens.textDim}">本文 ${bodyRatio}:1 / ボタン文字 ${buttonRatio}:1</p>
      `;
      wrap.appendChild(card);
    }
  }
}
