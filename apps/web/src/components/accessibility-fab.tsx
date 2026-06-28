import { useEffect, useState } from 'react';
import { Accessibility, X } from 'lucide-react';
import { cn } from '#/lib/utils';

type TextSize = 'normal' | 'grand' | 'xl';

interface A11ySettings {
  text: TextSize;
  dyslexia: boolean;
  spacing: boolean;
  underline: boolean;
  contrast: boolean;
  reduceMotion: boolean;
}

const DEFAULTS: A11ySettings = {
  text: 'normal',
  dyslexia: false,
  spacing: false,
  underline: false,
  contrast: false,
  reduceMotion: false,
};

const STORAGE_KEY = 'kizuna-a11y';

function load(): A11ySettings {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** Reflect the settings onto <html> so the CSS rules in styles.css take effect. */
function apply(s: A11ySettings) {
  const el = document.documentElement;
  el.classList.toggle('a11y-text-grand', s.text === 'grand');
  el.classList.toggle('a11y-text-xl', s.text === 'xl');
  el.classList.toggle('a11y-dyslexia', s.dyslexia);
  el.classList.toggle('a11y-spacing', s.spacing);
  el.classList.toggle('a11y-underline', s.underline);
  el.classList.toggle('a11y-contrast', s.contrast);
  el.classList.toggle('a11y-reduce-motion', s.reduceMotion);
}

/**
 * Floating accessibility control, available across every /app space. Preferences
 * persist in localStorage and are applied as classes on the document root.
 */
export function AccessibilityFab() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS);

  // Load + apply persisted preferences on mount.
  useEffect(() => {
    const loaded = load();
    setSettings(loaded);
    apply(loaded);
  }, []);

  function update(patch: Partial<A11ySettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function reset() {
    setSettings(DEFAULTS);
    apply(DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed right-5 bottom-5 z-40">
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-16 w-[300px] overflow-hidden rounded-2xl border border-hairline bg-popover text-popover-foreground shadow-lg">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <div className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                <span className="text-[15px] font-bold tracking-tight">Accessibilité</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1 px-4 py-3">
              <div className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                Taille du texte
              </div>
              <div className="mt-1.5 flex rounded-xl bg-muted p-1">
                {(
                  [
                    { key: 'normal', label: 'Normal' },
                    { key: 'grand', label: 'Grand' },
                    { key: 'xl', label: 'Très grand' },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    onClick={() => update({ text: o.key })}
                    className={cn(
                      'flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold transition-colors',
                      settings.text === o.key
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-secondary-foreground',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2 pb-2">
              <Row
                title="Police adaptée"
                sub="Police plus lisible (dyslexie)"
                value={settings.dyslexia}
                onChange={(v) => update({ dyslexia: v })}
              />
              <Row
                title="Espacement aéré"
                sub="Interligne et espacement augmentés"
                value={settings.spacing}
                onChange={(v) => update({ spacing: v })}
              />
              <Row
                title="Liens soulignés"
                sub="Souligne tous les liens"
                value={settings.underline}
                onChange={(v) => update({ underline: v })}
              />
              <Row
                title="Contraste renforcé"
                sub="Augmente le contraste visuel"
                value={settings.contrast}
                onChange={(v) => update({ contrast: v })}
              />
              <Row
                title="Réduire les animations"
                sub="Limite les mouvements à l'écran"
                value={settings.reduceMotion}
                onChange={(v) => update({ reduceMotion: v })}
              />
            </div>

            <div className="border-t border-hairline p-3">
              <button
                onClick={reset}
                className="w-full rounded-xl border border-hairline py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Options d'accessibilité"
        aria-expanded={open}
        className="flex items-center justify-center rounded-full bg-[#14161c] text-white shadow-lg ring-2 ring-brand/60 transition-transform hover:scale-105"
        style={{ height: 52, width: 52 }}
      >
        <Accessibility className="h-6 w-6" />
      </button>
    </div>
  );
}

function Row({
  title,
  sub,
  value,
  onChange,
}: {
  title: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[12px] text-muted-foreground">{sub}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        onClick={() => onChange(!value)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          value ? 'bg-brand' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            value && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}
