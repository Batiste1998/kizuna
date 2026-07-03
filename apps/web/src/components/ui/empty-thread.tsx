import type { ReactNode } from 'react';

/**
 * Empty state: a loose thread with hollow beads — nothing strung on it yet.
 * The three voice colours hint at what belongs here once content arrives.
 */
export function EmptyThread({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="animate-rise grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <svg
        viewBox="0 0 220 48"
        className="mb-5 h-12 w-56 text-border"
        aria-hidden
        fill="none"
      >
        <path
          d="M4 30 C 40 8, 70 44, 110 24 S 180 10, 216 28"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 7"
          pathLength="1"
          className="thread-path"
        />
        <circle cx="52" cy="26" r="5" fill="var(--card)" stroke="var(--voice-auto)" strokeWidth="2" opacity="0.55" />
        <circle cx="110" cy="24" r="5" fill="var(--card)" stroke="var(--voice-peda)" strokeWidth="2" opacity="0.55" />
        <circle cx="168" cy="19" r="5" fill="var(--card)" stroke="var(--voice-entreprise)" strokeWidth="2" opacity="0.55" />
      </svg>
      {title && <p className="mb-1 font-display text-[15px] font-semibold text-foreground">{title}</p>}
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
