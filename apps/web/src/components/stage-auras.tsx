/**
 * Drifting colour field for the public "stage" pages (landing, demo): the teal
 * and orange figures of the heart-knot (絆) slowly breathing behind the content.
 * Purely decorative; honours prefers-reduced-motion via the .aura class.
 */
export function StageAuras() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className="aura"
        style={{ left: '-8%', top: '-14%', height: '34rem', width: '34rem', background: 'rgba(46,158,130,0.22)' }}
      />
      <span
        className="aura aura-slow"
        style={{
          right: '-10%',
          top: '-6%',
          height: '30rem',
          width: '30rem',
          background: 'rgba(224,106,65,0.20)',
          animationDelay: '-8s',
        }}
      />
      <span
        className="aura"
        style={{
          left: '26%',
          bottom: '-20%',
          height: '32rem',
          width: '32rem',
          background: 'rgba(63,111,176,0.14)',
          animationDelay: '-15s',
        }}
      />
    </div>
  );
}
