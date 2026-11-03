// Draws a set of press-on nails as an SVG from a product's colours, pattern, shape and length.
// Used whenever a product has no photo yet, and for the live preview on product pages.

type Props = {
  palette: string[];
  pattern: string;
  shape?: string;
  length?: string;
  seed?: string;
  count?: 1 | 5;
  className?: string;
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function nailPath(shape: string, w: number, h: number) {
  const base = `L ${w} ${h} Q ${w / 2} ${h + w * 0.28} 0 ${h} Z`;
  switch (shape.toLowerCase()) {
    case "square":
      return `M 0 ${h} L 0 ${w * 0.18} Q 0 0 ${w * 0.18} 0 L ${w * 0.82} 0 Q ${w} 0 ${w} ${w * 0.18} ${base}`;
    case "oval":
      return `M 0 ${h} L 0 ${w / 2} A ${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2} ${base}`;
    case "coffin":
      return `M 0 ${h} L ${w * 0.16} ${w * 0.12} Q ${w * 0.19} 0 ${w * 0.3} 0 L ${w * 0.7} 0 Q ${w * 0.81} 0 ${w * 0.84} ${w * 0.12} L ${w} ${h} Q ${w / 2} ${h + w * 0.28} 0 ${h} Z`;
    case "stiletto":
      return `M 0 ${h} L 0 ${h * 0.6} Q 0 ${h * 0.28} ${w / 2} 0 Q ${w} ${h * 0.28} ${w} ${h * 0.6} ${base}`;
    case "almond":
    default:
      return `M 0 ${h} L 0 ${h * 0.46} Q 0 ${h * 0.1} ${w / 2} 0 Q ${w} ${h * 0.1} ${w} ${h * 0.46} ${base}`;
  }
}

const LENGTH_SCALE: Record<string, number> = { short: 0.82, medium: 1, long: 1.2 };

export default function NailArt({ palette, pattern, shape = "Almond", length = "Medium", seed = "x", count = 5, className }: Props) {
  const c0 = palette[0] ?? "#E8B4B8";
  const c1 = palette[1] ?? shade(c0, 0.6);
  const ls = LENGTH_SCALE[length.toLowerCase()] ?? 1;
  const uid = `n${hash(`${seed}|${pattern}|${shape}|${length}|${c0}|${c1}|${count}`).toString(36)}`;
  const rand = rng(hash(seed));

  const fingers =
    count === 1
      ? [{ w: 54, h: 120, x: 100, y: 176, r: 0 }]
      : [
          { w: 27, h: 66, x: 32, y: 158, r: -22 },
          { w: 30, h: 80, x: 70, y: 140, r: -9 },
          { w: 32, h: 88, x: 110, y: 134, r: 0 },
          { w: 30, h: 80, x: 150, y: 140, r: 9 },
          { w: 36, h: 70, x: 188, y: 156, r: 21 },
        ];

  const vbW = count === 1 ? 200 : 220;

  return (
    <svg viewBox={`0 0 ${vbW} 200`} className={className} role="img" aria-label={`${pattern} ${shape} press-on nails`}>
      <defs>
        <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(c0, 0.18)} />
          <stop offset="1" stopColor={shade(c0, -0.08)} />
        </linearGradient>
        <linearGradient id={`${uid}-ombre`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c0} />
          <stop offset="1" stopColor={c1} />
        </linearGradient>
        <linearGradient id={`${uid}-chrome`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor={shade(c0, 0.5)} />
          <stop offset="0.35" stopColor={c0} />
          <stop offset="0.55" stopColor={shade(c1, 0.35)} />
          <stop offset="0.75" stopColor={shade(c0, -0.15)} />
          <stop offset="1" stopColor={shade(c1, 0.55)} />
        </linearGradient>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-sh`} x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#1e1418" floodOpacity="0.18" />
        </filter>
      </defs>

      {fingers.map((f, i) => {
        const w = f.w;
        const h = f.h * ls;
        const d = nailPath(shape, w, h);
        const clip = `${uid}-c${i}`;
        const fill =
          pattern === "ombre" ? `url(#${uid}-ombre)` : pattern === "chrome" ? `url(#${uid}-chrome)` : `url(#${uid}-base)`;
        const dots: { x: number; y: number; r: number; c: string; o: number }[] = [];
        if (pattern === "glitter") {
          for (let k = 0; k < 46; k++) {
            const y = Math.pow(rand(), 1.8) * h;
            dots.push({ x: rand() * w, y, r: 0.6 + rand() * 1.7, c: rand() > 0.45 ? c1 : "#ffffff", o: 0.55 + rand() * 0.45 });
          }
        }
        if (pattern === "dots") {
          for (let yy = 7; yy < h; yy += 10) for (let xx = (yy / 10) % 2 ? 6 : 11; xx < w; xx += 10) dots.push({ x: xx, y: yy, r: 2.1, c: c1, o: 0.95 });
        }
        return (
          <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.r}) translate(${-w / 2} ${-h})`} filter={`url(#${uid}-sh)`}>
            <clipPath id={clip}>
              <path d={d} />
            </clipPath>
            <path d={d} fill={fill} />
            <g clipPath={`url(#${clip})`}>
              {pattern === "french" && (
                <path d={`M -4 -4 L ${w + 4} -4 L ${w + 4} ${h * 0.36} Q ${w / 2} ${h * 0.12} -4 ${h * 0.36} Z`} fill={c1} />
              )}
              {pattern === "marble" &&
                [0, 1, 2].map((k) => (
                  <path
                    key={k}
                    d={`M ${-4 + k * 6} ${h * (0.15 + k * 0.25)} C ${w * 0.3} ${h * (0.05 + k * 0.3)}, ${w * 0.6} ${h * (0.45 + k * 0.1)}, ${w + 4} ${h * (0.2 + k * 0.28)}`}
                    stroke={k === 1 ? shade(c0, -0.25) : c1}
                    strokeWidth={k === 1 ? 1.2 : 3 + k}
                    strokeOpacity={0.85}
                    fill="none"
                    strokeLinecap="round"
                  />
                ))}
              {dots.map((p, k) => (
                <circle key={k} cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity={p.o} />
              ))}
              {pattern === "chrome" && <rect x={w * 0.55} y={-4} width={w * 0.12} height={h + 8} fill="#fff" opacity="0.35" />}
              {/* cuticle shadow + glossy highlight */}
              <path d={`M 0 ${h} Q ${w / 2} ${h + w * 0.28} ${w} ${h}`} stroke="#000" strokeOpacity="0.08" strokeWidth="6" fill="none" />
              <rect x={w * 0.16} y={h * 0.12} width={w * 0.14} height={h * 0.62} rx={w * 0.07} fill={`url(#${uid}-gloss)`} opacity="0.75" />
            </g>
            <path d={d} fill="none" stroke="#000" strokeOpacity="0.07" strokeWidth="0.8" />
          </g>
        );
      })}
    </svg>
  );
}
