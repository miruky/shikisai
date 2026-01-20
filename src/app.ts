import { hexToOklch, normalizeHex } from './lib/color';
import { contrastRatio, readableTextColor, wcagLevel } from './lib/contrast';
import { pushRecent } from './lib/history';
import {
  randomBaseColor,
  themePair,
  toCssVariables,
  toJson,
  toneScale,
  type ThemeTokens,
} from './lib/palette';
import { decodeShare, encodeShare, type ExportFormat } from './lib/share';
import { animateValue, prefersReducedMotion } from './motion';
import { applyTheme, nextTheme, readTheme, themeIcon, THEME_LABEL, type ThemeChoice } from './theme';

const DEFAULT_COLOR = '#3f7fd4';
const RECENT_KEY = 'shikisai:recent';

// 三原色の重なりで減法混色を示すマーク。地のテーマに依らず色そのものを見せる。
const LOGO_SVG = `
<svg viewBox="0 0 48 48" width="36" height="36" role="img" aria-label="shikisai">
  <title>shikisai</title>
  <circle cx="19" cy="19.5" r="11" fill="#e0483a" opacity="0.82"/>
  <circle cx="29" cy="19.5" r="11" fill="#3f7fd4" opacity="0.82"/>
  <circle cx="24" cy="28.5" r="11" fill="#eab308" opacity="0.82"/>
</svg>`;

const LINK_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 4.34l-1.5 1.5"/><path d="M14 11a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 19.66l1.5-1.5"/></svg>`;

export class App {
  private readonly el: Record<string, HTMLElement> = {};
  private exportKind: ExportFormat = 'css';
  private theme: ThemeChoice = readTheme();
  private current = DEFAULT_COLOR;
  private recent: string[] = [];
  private prevRatios: number[] = [];
  private scaleEntered = false;

  constructor(private readonly root: HTMLElement) {
    this.recent = this.readRecent();
    const initial = decodeShare(location.search);
    this.exportKind = initial.format ?? 'css';
    this.render();
    this.wire();
    this.update(initial.color ?? DEFAULT_COLOR, true);
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
            <button type="button" class="ghost-btn" data-id="share" title="この配色への共有リンクをコピー">
              ${LINK_ICON}<span>リンク</span>
            </button>
          </div>
          <p class="parse-error" data-id="error" role="alert" hidden>HEXカラー(#rrggbb)として読めない</p>
          <dl class="readout" data-id="readout"></dl>
          <div class="recent" data-id="recent-row" hidden>
            <span class="recent-label kicker">最近</span>
            <span class="recent-dots" data-id="recent"></span>
          </div>
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
    // input はドラッグ・打鍵ごとの即時プレビュー、change は確定(履歴に残す)
    picker.addEventListener('input', () => {
      hex.value = picker.value;
      this.update(picker.value, false);
    });
    picker.addEventListener('change', () => this.update(picker.value, true));
    hex.addEventListener('input', () => this.update(hex.value, false));
    hex.addEventListener('change', () => this.update(hex.value, true));
    this.el['random']!.addEventListener('click', () => {
      this.rollDice();
      this.pick(randomBaseColor());
    });
    const share = this.el['share']!;
    share.addEventListener('click', () => {
      void this.copyText(location.href, '共有リンクを').then((ok) => ok && this.flash(share, 'ring'));
    });
    this.el['tab-css']!.addEventListener('click', () => this.switchTab('css'));
    this.el['tab-json']!.addEventListener('click', () => this.switchTab('json'));
    const copyBtn = this.el['copy']!;
    copyBtn.addEventListener('click', () => {
      void this.copyText(this.el['output']!.textContent ?? '', '書き出しを').then(
        (ok) => ok && this.flash(copyBtn, 'label'),
      );
    });
    this.el['theme']!.addEventListener('click', () => {
      this.theme = nextTheme(this.theme);
      applyTheme(this.theme);
      this.renderThemeToggle();
    });
    this.renderThemeToggle();
    this.applyTabUI();
  }

  // ボタン経由で色を確定する(ピッカーとHEX欄も同期させる)
  private pick(color: string): void {
    (this.el['picker'] as HTMLInputElement).value = color;
    (this.el['hex'] as HTMLInputElement).value = color;
    this.update(color, true);
  }

  // ランダム時にサイコロのアイコンを一度だけ回す(reduced-motionでは何もしない)
  private rollDice(): void {
    if (prefersReducedMotion()) return;
    const svg = this.el['random']!.querySelector('svg');
    if (!svg) return;
    svg.classList.remove('rolling');
    void svg.getBoundingClientRect();
    svg.classList.add('rolling');
  }

  private renderThemeToggle(): void {
    const btn = this.el['theme']!;
    btn.innerHTML = `${themeIcon(this.theme)}<span>${THEME_LABEL[this.theme]}</span>`;
    btn.setAttribute('aria-label', `テーマ: ${THEME_LABEL[this.theme]}(切り替え)`);
  }

  private switchTab(kind: ExportFormat): void {
    this.exportKind = kind;
    this.applyTabUI();
    this.setExport();
    this.syncUrl();
  }

  private applyTabUI(): void {
    this.el['tab-css']!.setAttribute('aria-selected', String(this.exportKind === 'css'));
    this.el['tab-json']!.setAttribute('aria-selected', String(this.exportKind === 'json'));
  }

  private update(value: string, commit: boolean): void {
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
    // ピッカー・ランダム・URL読込・最近の色など、HEX欄以外からの変更を欄へ反映する。
    // 欄を編集中(フォーカス中)のときは打鍵を妨げないよう触らない。
    const hexInput = this.el['hex'] as HTMLInputElement;
    if (document.activeElement !== hexInput) hexInput.value = canonical;

    // 地のテーマのアクセント(罫線・フォーカス輪郭)を選択色の色相へ寄せる。
    // --accent は :root で解決されるため :root(html)側に書き込む。
    const base = hexToOklch(canonical)!;
    document.documentElement.style.setProperty('--base-h', String(Math.round(base.h)));

    this.renderChip(canonical, base);
    this.renderScale();
    this.renderThemes(commit);
    this.setExport();
    this.syncUrl();
    if (commit) this.remember(canonical);
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
    // 入場のスタッガは初回だけ。色変更のたびに animate すると目障りなため。
    const enter = !this.scaleEntered && !prefersReducedMotion();
    this.scaleEntered = true;
    wrap.innerHTML = '';
    scale.tones.forEach(({ step, hex }, i) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = enter ? 'swatch enter' : 'swatch';
      if (enter) cell.style.animationDelay = `${i * 35}ms`;
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
      cell.addEventListener('click', () => {
        void this.copyText(hex, `${hex} を`).then((ok) => ok && this.flash(cell, 'ring'));
      });
      wrap.appendChild(cell);
    });
  }

  private renderThemes(animate: boolean): void {
    const wrap = this.el['themes']!;
    const pair = themePair(this.current)!;
    wrap.innerHTML = '';
    const cards: Array<[string, ThemeTokens]> = [
      ['ライト', pair.light],
      ['ダーク', pair.dark],
    ];
    const ratios: number[] = [];
    for (const [name, tokens] of cards) {
      const bodyRatio = contrastRatio(tokens.text, tokens.background);
      const buttonRatio = contrastRatio(tokens.primaryText, tokens.primary);
      ratios.push(bodyRatio, buttonRatio);
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
        <p class="specimen-ratios" style="color:${tokens.textDim}">本文 <b></b>:1 / ボタン文字 <b></b>:1</p>
      `;
      wrap.appendChild(card);
    }
    // コントラスト比は確定操作(commit)のときだけカウントアップする。打鍵中は即時表示。
    const cells = wrap.querySelectorAll<HTMLElement>('.specimen-ratios b');
    const canAnimate = animate && this.prevRatios.length === ratios.length;
    cells.forEach((b, i) => {
      const to = ratios[i]!;
      const from = canAnimate ? this.prevRatios[i]! : to;
      animateValue(from, to, 480, (v) => {
        b.textContent = v.toFixed(1);
      });
    });
    this.prevRatios = ratios;
  }

  private setExport(): void {
    const scale = toneScale(this.current)!;
    const pair = themePair(this.current)!;
    this.el['output']!.textContent =
      this.exportKind === 'css' ? toCssVariables(pair) : toJson(scale, pair);
  }

  private syncUrl(): void {
    const qs = encodeShare({ color: this.current, format: this.exportKind });
    history.replaceState(null, '', `${location.pathname}?${qs}`);
  }

  private remember(color: string): void {
    this.recent = pushRecent(this.recent, color);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(this.recent));
    } catch {
      // 保存できなくても表示は続ける
    }
    this.renderRecent();
  }

  private readRecent(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((c): c is string => typeof c === 'string' && normalizeHex(c) === c);
    } catch {
      return [];
    }
  }

  private renderRecent(): void {
    const row = this.el['recent-row']!;
    const dots = this.el['recent']!;
    const others = this.recent.filter((c) => c !== this.current);
    row.hidden = others.length === 0;
    dots.innerHTML = '';
    for (const color of others) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'recent-dot';
      dot.style.background = color;
      dot.title = color;
      dot.setAttribute('aria-label', `${color} に戻す`);
      dot.addEventListener('click', () => this.pick(color));
      dots.appendChild(dot);
    }
  }

  private async copyText(text: string, label: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      this.announce(`${label}コピーした`);
      return true;
    } catch {
      this.announce('コピーできなかった');
      return false;
    }
  }

  // コピー成功を短時間だけ見せる。label=文言の差し替え、ring=枠の点灯。
  private flash(el: HTMLElement, kind: 'label' | 'ring'): void {
    if (kind === 'label') {
      if (el.dataset['label'] === undefined) el.dataset['label'] = el.textContent ?? '';
      el.textContent = 'コピー済み';
    }
    el.classList.add('is-copied');
    const prev = Number(el.dataset['flash'] ?? 0);
    if (prev) clearTimeout(prev);
    const ms = kind === 'label' ? 1100 : 750;
    el.dataset['flash'] = String(
      setTimeout(() => {
        el.classList.remove('is-copied');
        if (kind === 'label' && el.dataset['label'] !== undefined) {
          el.textContent = el.dataset['label'];
        }
        el.dataset['flash'] = '';
      }, ms),
    );
  }

  private announce(message: string): void {
    this.el['live']!.textContent = message;
  }
}
