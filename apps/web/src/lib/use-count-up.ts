import { useEffect, useRef, useState } from 'react';

/** True when the user asked for less motion (OS setting or the a11y panel). */
function reducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('a11y-reduce-motion')
  );
}

/**
 * Animates a number from 0 to `target` once, easing out over `duration` ms.
 * Re-runs when `target` changes (from its previous displayed value).
 * Respects reduced-motion by jumping straight to the target.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (reducedMotion() || target === fromRef.current) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    fromRef.current = target;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
