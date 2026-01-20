// 控えめなモーションの土台。物理的なイージングと、reduced-motion を尊重する数値アニメ。
// 装飾的なスピナーや点滅は持たない。値の変化を短時間で滑らかに見せるだけ。

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// from から to へ duration(ms)かけて step を呼ぶ。reduced-motion 時は一度だけ最終値を渡す。
// 返り値で進行中のアニメをキャンセルできる。
export function animateValue(
  from: number,
  to: number,
  duration: number,
  step: (value: number) => void,
): () => void {
  if (from === to || duration <= 0 || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
    step(to);
    return () => {};
  }
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    step(from + (to - from) * easeOutCubic(t));
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
