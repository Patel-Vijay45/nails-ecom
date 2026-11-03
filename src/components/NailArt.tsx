// Draws a set of press-on nails as an SVG from a product's colours, finish, shape and length.
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

/** Nail outline in local coordinates: base (cuticle) at y = h, tip at y = 0. */
function nailPath(shape: string, w: number, h: number) {
  const base = (l = 0, r = w) => `L ${r} ${h} Q ${(l + r) / 2} ${h + w * 0.28} ${l} ${h} Z`;
  switch (shape.toLowerCase()) {
    case "square":
      return `M 0 ${h} L 0 ${w * 0.12} Q 0 0 ${w * 0.12} 0 L ${w * 0.88} 0 Q ${w} 0 ${w} ${w * 0.12} ${base()}`;
    case "squoval":
      return `M 0 ${h} L 0 ${w * 0.32} Q 0 0 ${w * 0.32} 0 L ${w * 0.68} 0 Q ${w} 0 ${w} ${w * 0.32} ${base()}`;
    case "round":
      return `M 0 ${h} L 0 ${w * 0.42} A ${w / 2} ${w * 0.42} 0 0 1 ${w} ${w * 0.42} ${base()}`;
    case "oval":
      return `M 0 ${h} L 0 ${w * 0.7} A ${w / 2} ${w * 0.7} 0 0 1 ${w} ${w * 0.7} ${base()}`;
    case "coffin":
    case "ballerina":
      return `M 0 ${h} L ${w * 0.16} ${w * 0.12} Q ${w * 0.19} 0 ${w * 0.3} 0 L ${w * 0.7} 0 Q ${w * 0.81} 0 ${w * 0.84} ${w * 0.12} ${base()}`;
    case "stiletto":
      return `M 0 ${h} L 0 ${h * 0.6} Q 0 ${h * 0.28} ${w / 2} 0 Q ${w} ${h * 0.28} ${w} ${h * 0.6} ${base()}`;
    case "lipstick":
      return `M 0 ${h} L 0 ${h * 0.3} Q 0 ${h * 0.22} ${w * 0.12} ${h * 0.2} L ${w * 0.86} ${h * 0.02} Q ${w} 0 ${w} ${h * 0.1} ${base()}`;
    case "flare":
      return `M ${w * 0.1} ${h} L ${-w * 0.1} ${w * 0.14} Q ${-w * 0.1} 0 ${w * 0.06} 0 L ${w * 0.94} 0 Q ${w * 1.1} 0 ${w * 1.1} ${w * 0.14} L ${w * 0.9} ${h} Q ${w / 2} ${h + w * 0.26} ${w * 0.1} ${h} Z`;
    case "edge":
      return `M 0 ${h} L ${w * 0.06} ${h * 0.42} L ${w / 2} 0 L ${w * 0.94} ${h * 0.42} ${base()}`;
    case "mountain peak":
      return `M 0 ${h} L 0 ${h * 0.34} Q ${w * 0.1} ${h * 0.2} ${w / 2} 0 Q ${w * 0.9} ${h * 0.2} ${w} ${h * 0.34} ${base()}`;
    case "almond":
    default:
      return `M 0 ${h} L 0 ${h * 0.46} Q 0 ${h * 0.1} ${w / 2} 0 Q ${w} ${h * 0.1} ${w} ${h * 0.46} ${base()}`;
  }
}

const LENGTH_SCALE: Record<string, number> = { "extra short": 0.66, short: 0.82, medium: 1, long: 1.2, "extra long": 1.38 };
const HOLO = ["#ffd1e8", "#c8f2ff", "#fff5b8", "#d9c8ff"];

export default function NailArt({ palette, pattern, shape = "Almond", length = "Medium", seed = "x", count = 5, className }: Props) {
  const c0 = palette[0] ?? "#E8B4B8";
  const c1 = palette[1] ?? shade(c0, 0.6);
  const ls = LENGTH_SCALE[length.toLowerCase()] ?? 1;
  const uid = `n${hash(`${seed}|${pattern}|${shape}|${length}|${c0}|${c1}|${count}`).toString(36)}`;
  const rand = rng(hash(seed + pattern));
  const glossy = !["matte", "velvet"].includes(pattern);

  const fingers =
    count === 1
      ? [{ w: 54, h: 120, x: 100, y: 180, r: 0 }]
      : [
          { w: 27, h: 66, x: 32, y: 162, r: -22 },
          { w: 30, h: 80, x: 70, y: 146, r: -9 },
          { w: 32, h: 88, x: 110, y: 140, r: 0 },
          { w: 30, h: 80, x: 150, y: 146, r: 9 },
          { w: 36, h: 70, x: 188, y: 160, r: 21 },
        ];
  const vbW = count === 1 ? 200 : 220;

  const fillFor = (p: string) =>
    p === "ombre" ? `url(#${uid}-ombre)`
    : p === "chrome" ? `url(#${uid}-chrome)`
    : p === "aura" ? `url(#${uid}-aura)`
    : p === "holo" ? `url(#${uid}-holo)`
    : p === "velvet" || p === "cateye" ? `url(#${uid}-deep)`
    : p === "matte" ? c0
    : `url(#${uid}-base)`;

  return (
    <svg viewBox={`0 0 ${vbW} 200`} className={className} role="img" aria-label={`${pattern} ${shape} press-on nails`}>
      <defs>
        <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(c0, 0.18)} />
          <stop offset="1" stopColor={shade(c0, -0.08)} />
        </linearGradient>
        <linearGradient id={`${uid}-deep`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(c0, -0.15)} />
          <stop offset="1" stopColor={shade(c0, -0.45)} />
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
        <linearGradient id={`${uid}-holo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(c0, 0.3)} />
          {HOLO.map((h, i) => (
            <stop key={h} offset={(i + 1) / (HOLO.length + 1)} stopColor={h} />
          ))}
          <stop offset="1" stopColor={shade(c1, 0.3)} />
        </linearGradient>
        <radialGradient id={`${uid}-aura`} cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.45" stopColor={shade(c1, 0.25)} />
          <stop offset="1" stopColor={c0} />
        </radialGradient>
        <linearGradient id={`${uid}-cat`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0.3" stopColor={c1} stopOpacity="0" />
          <stop offset="0.5" stopColor={shade(c1, 0.4)} stopOpacity="0.95" />
          <stop offset="0.7" stopColor={c1} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-velvet`} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor={shade(c1, 0.2)} stopOpacity="0.85" />
          <stop offset="1" stopColor={c1} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-gem`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={shade(c1, 0.4)} />
          <stop offset="1" stopColor={shade(c1, -0.2)} />
        </radialGradient>
        <pattern id={`${uid}-check`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill={c1} />
          <rect x="5" y="5" width="5" height="5" fill={c1} />
        </pattern>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-sh`} x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#1e1418" floodOpacity="0.18" />
        </filter>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {fingers.map((f, i) => {
        const w = f.w;
        const h = f.h * ls;
        const d = nailPath(shape, w, h);
        const clip = `${uid}-c${i}`;
        const dots: { x: number; y: number; r: number; c: string; o: number }[] = [];
        if (pattern === "glitter" || pattern === "gems") {
          const n = pattern === "gems" ? 26 : 46;
          for (let k = 0; k < n; k++) {
            const y = Math.pow(rand(), 1.8) * h;
            dots.push({ x: rand() * w, y, r: 0.6 + rand() * 1.7, c: rand() > 0.45 ? c1 : "#ffffff", o: 0.55 + rand() * 0.45 });
          }
        }
        if (pattern === "velvet") {
          for (let k = 0; k < 60; k++) dots.push({ x: rand() * w, y: rand() * h, r: 0.35 + rand() * 0.5, c: "#ffffff", o: 0.25 + rand() * 0.35 });
        }
        if (pattern === "dots") {
          for (let yy = 7; yy < h; yy += 10) for (let xx = (yy / 10) % 2 ? 6 : 11; xx < w; xx += 10) dots.push({ x: xx, y: yy, r: 2.1, c: c1, o: 0.95 });
        }
        return (
          <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.r}) translate(${-w / 2} ${-h})`} filter={`url(#${uid}-sh)`}>
            <clipPath id={clip}>
              <path d={d} />
            </clipPath>
            <path d={d} fill={fillFor(pattern)} opacity={pattern === "jelly" ? 0.62 : 1} />
            <g clipPath={`url(#${clip})`}>
              {pattern === "french" && <path d={`M -9 -4 L ${w + 9} -4 L ${w + 9} ${h * 0.36} Q ${w / 2} ${h * 0.12} -9 ${h * 0.36} Z`} fill={c1} />}
              {pattern === "vfrench" && <path d={`M -9 -4 L ${w + 9} -4 L ${w + 9} ${h * 0.18} L ${w / 2} ${h * 0.42} L -9 ${h * 0.18} Z`} fill={c1} />}
              {pattern === "cateye" && <rect x={-w} y={-4} width={w * 3} height={h + 8} fill={`url(#${uid}-cat)`} />}
              {pattern === "velvet" && <rect x={-4} y={-4} width={w + 8} height={h + 8} fill={`url(#${uid}-velvet)`} />}
              {pattern === "checker" && <rect x={-10} y={-10} width={w + 20} height={h + 20} fill={`url(#${uid}-check)`} opacity="0.9" />}
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
              {pattern === "swirl" &&
                [0, 1].map((k) => (
                  <path
                    key={k}
                    d={`M ${-6} ${h * (0.25 + k * 0.35)} C ${w * 0.35} ${h * (0.05 + k * 0.35)}, ${w * 0.25} ${h * (0.55 + k * 0.3)}, ${w + 6} ${h * (0.35 + k * 0.3)}`}
                    stroke={k === 0 ? c1 : "#ffffff"}
                    strokeWidth={k === 0 ? 4 : 2.2}
                    fill="none"
                    strokeLinecap="round"
                  />
                ))}
              {pattern === "tortoise" &&
                Array.from({ length: 7 }).map((_, k) => (
                  <ellipse
                    key={k}
                    cx={rand() * w}
                    cy={rand() * h}
                    rx={3 + rand() * 6}
                    ry={2 + rand() * 5}
                    fill={k % 2 ? c1 : shade(c0, -0.45)}
                    opacity={0.75}
                    filter={`url(#${uid}-soft)`}
                  />
                ))}
              {pattern === "floral" &&
                [0.3, 0.68].map((fy, k) => {
                  const cx = w * (k ? 0.62 : 0.4), cy = h * fy, r = Math.min(w * 0.16, 5);
                  return (
                    <g key={k}>
                      {[0, 72, 144, 216, 288].map((a) => (
                        <circle key={a} cx={cx + Math.cos((a * Math.PI) / 180) * r} cy={cy + Math.sin((a * Math.PI) / 180) * r} r={r * 0.75} fill={k ? c1 : "#ffffff"} />
                      ))}
                      <circle cx={cx} cy={cy} r={r * 0.55} fill="#e6c77e" />
                    </g>
                  );
                })}
              {dots.map((p, k) => (
                <circle key={k} cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity={p.o} />
              ))}
              {pattern === "gems" &&
                [0.5, 0.72].map((gy, k) => (
                  <circle key={k} cx={w / 2 + (k ? w * 0.18 : -w * 0.1)} cy={h * gy} r={Math.min(w * 0.17, 5.5)} fill={`url(#${uid}-gem)`} stroke="#ffffff" strokeWidth="0.8" />
                ))}
              {pattern === "chrome" && <rect x={w * 0.55} y={-4} width={w * 0.12} height={h + 8} fill="#fff" opacity="0.35" />}
              {shape.toLowerCase() === "edge" && <line x1={w / 2} y1={0} x2={w / 2} y2={h * 0.75} stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />}
              {/* cuticle shadow + glossy highlight */}
              <path d={`M 0 ${h} Q ${w / 2} ${h + w * 0.28} ${w} ${h}`} stroke="#000" strokeOpacity="0.08" strokeWidth="6" fill="none" />
              {glossy && (
                <rect x={w * 0.16} y={h * 0.12} width={w * 0.14} height={h * 0.62} rx={w * 0.07} fill={`url(#${uid}-gloss)`} opacity={pattern === "jelly" ? 0.95 : 0.75} />
              )}
            </g>
            <path d={d} fill="none" stroke="#000" strokeOpacity="0.07" strokeWidth="0.8" />
          </g>
        );
      })}
    </svg>
  );
}
