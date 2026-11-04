// Automatic nail measuring from a photo (runs in the browser; no DOM needed, so it can be tested in Node).
//
// 1. Find the ₹10 coin (27 mm, two-coloured) → millimetres per pixel.
// 2. For each finger (rough position from the hand model, or the customer's tap), find the nail's two side
//    edges: from the finger's outline against the paper when possible, otherwise by searching around the
//    nail for the best matching pair of colour edges. The widest part of the nail is its size.
// 3. Correct for the nails being a little closer to the camera than the coin on the table.

export type Img = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };
export type Pt = { x: number; y: number };
export type Circle = { x: number; y: number; r: number; score: number; ellipticity: number };
type F3 = [number, number, number];

export const COIN_MM = 27;
const LUMA_W = 0.6; // shading changes brightness more than colour, so brightness counts a bit less

// ---------- pixels ----------

function rgbAt(img: Img, x: number, y: number): F3 {
  const w = img.width, h = img.height;
  const cx = Math.min(w - 1.001, Math.max(0, x)), cy = Math.min(h - 1.001, Math.max(0, y));
  const x0 = Math.floor(cx), y0 = Math.floor(cy), fx = cx - x0, fy = cy - y0;
  const i00 = (y0 * w + x0) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
  const d = img.data;
  const out: F3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const top = d[i00 + c] * (1 - fx) + d[i10 + c] * fx;
    const bot = d[i01 + c] * (1 - fx) + d[i11 + c] * fx;
    out[c] = top * (1 - fy) + bot * fy;
  }
  return out;
}

/** Colour as weighted YCbCr, so plain distances between colours make sense. */
function feat([r, g, b]: F3): F3 {
  return [(0.299 * r + 0.587 * g + 0.114 * b) * LUMA_W, -0.1687 * r - 0.3313 * g + 0.5 * b, 0.5 * r - 0.4187 * g - 0.0813 * b];
}
const fAt = (img: Img, x: number, y: number) => feat(rgbAt(img, x, y));
const dist = (a: F3, b: F3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function median(v: number[]) {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const medianF = (list: F3[]): F3 => [median(list.map((c) => c[0])), median(list.map((c) => c[1])), median(list.map((c) => c[2]))];

function smooth(f: F3[], sigma: number): F3[] {
  if (sigma < 0.5) return f;
  const rad = Math.ceil(sigma * 2.5);
  const k = Array.from({ length: rad * 2 + 1 }, (_, i) => Math.exp(-((i - rad) ** 2) / (2 * sigma * sigma)));
  return f.map((_, i) => {
    const acc: F3 = [0, 0, 0];
    let wsum = 0;
    for (let j = -rad; j <= rad; j++) {
      const q = f[i + j];
      if (!q) continue;
      const w = k[j + rad];
      acc[0] += q[0] * w; acc[1] += q[1] * w; acc[2] += q[2] * w;
      wsum += w;
    }
    return [acc[0] / wsum, acc[1] / wsum, acc[2] / wsum];
  });
}

// ---------- coin ----------

/**
 * Finds the coin: circle votes along edge directions on a small copy of the photo, then a precise
 * fit on the full photo. `skip` rejects centres inside the hand (fingertips are round too).
 */
export function findCoin(img: Img, o: { rMin: number; rMax: number; skip?: (p: Pt) => boolean; near?: Pt; nearDist?: number }): Circle | null {
  const k = Math.min(1, 720 / Math.max(img.width, img.height));
  const w = Math.max(16, Math.round(img.width * k)), h = Math.max(16, Math.round(img.height * k));
  // Small grey copy (average of 4 samples per cell)
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const [r, gg, b] = rgbAt(img, (x + ox) / k, (y + oy) / k);
        s += 0.299 * r + 0.587 * gg + 0.114 * b;
      }
      g[y * w + x] = s / 4;
    }
  // Sobel
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h), mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = g[i - w - 1], b = g[i - w], c = g[i - w + 1], d = g[i - 1], f = g[i + 1], gg = g[i + w - 1], hh = g[i + w], ii = g[i + w + 1];
      gx[i] = c + 2 * f + ii - a - 2 * d - gg;
      gy[i] = gg + 2 * hh + ii - a - 2 * b - c;
      mag[i] = Math.hypot(gx[i], gy[i]);
    }
  const sample: number[] = [];
  for (let i = 0; i < mag.length; i += 7) sample.push(mag[i]);
  sample.sort((a, b) => a - b);
  const thr = Math.max(40, sample[Math.floor(sample.length * 0.88)]);
  const edges: number[] = [];
  for (let i = 0; i < mag.length; i++) if (mag[i] > thr) edges.push(i);
  if (edges.length < 20) return null;

  const rMin = Math.max(3, o.rMin * k), rMax = Math.max(rMin + 2, o.rMax * k);
  const steps = Math.min(70, Math.max(4, Math.ceil(rMax - rMin)));
  const acc = new Float32Array(w * h);
  for (const i of edges) {
    const x = i % w, y = (i / w) | 0;
    const dx = gx[i] / mag[i], dy = gy[i] / mag[i];
    for (let s = 0; s <= steps; s++) {
      const r = rMin + ((rMax - rMin) * s) / steps;
      for (const sign of [1, -1]) {
        const cx = Math.round(x + sign * dx * r), cy = Math.round(y + sign * dy * r);
        if (cx >= 0 && cy >= 0 && cx < w && cy < h) acc[cy * w + cx] += 1;
      }
    }
  }
  // Candidate centres: strongest local maxima, spread apart
  const cands: { x: number; y: number; v: number }[] = [];
  for (let y = 2; y < h - 2; y++)
    for (let x = 2; x < w - 2; x++) {
      let v = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) v += acc[(y + j) * w + x + i];
      if (v < 6) continue;
      cands.push({ x, y, v });
    }
  cands.sort((a, b) => b.v - a.v);
  const picked: { x: number; y: number }[] = [];
  for (const c of cands) {
    if (picked.length >= 150) break;
    if (picked.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < rMin * 0.8)) continue;
    const full = { x: (c.x + 0.5) / k, y: (c.y + 0.5) / k };
    if (o.near && Math.hypot(full.x - o.near.x, full.y - o.near.y) > (o.nearDist ?? o.rMax)) continue;
    if (o.skip?.(full)) continue;
    picked.push(c);
  }

  // How much of a circle around each candidate is covered by edges pointing out from the centre,
  // counted per angle sector (a coin is a full circle; a nail or fingertip is not).
  const SECT = 72;
  type Cand = { x: number; y: number; r: number; s: number; inner: number };
  const scored: Cand[] = [];
  for (const c of picked) {
    const nb = Math.ceil(rMax) + 3;
    const cover = Array.from({ length: nb }, () => new Uint8Array(SECT));
    const x0 = Math.max(1, Math.floor(c.x - rMax - 2)), x1 = Math.min(w - 2, Math.ceil(c.x + rMax + 2));
    const y0 = Math.max(1, Math.floor(c.y - rMax - 2)), y1 = Math.min(h - 2, Math.ceil(c.y + rMax + 2));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (mag[i] <= thr * 0.6) continue;
        const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy);
        if (d < 2 || d > rMax + 1.5) continue;
        if (Math.abs((gx[i] * dx + gy[i] * dy) / (mag[i] * d)) < 0.85) continue;
        const sec = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * SECT) % SECT;
        cover[Math.round(d)][sec] = 1;
      }
    const coverage = (r: number) => {
      if (r < 2 || r + 1 >= nb) return 0;
      let n = 0;
      for (let k = 0; k < SECT; k++) if (cover[r - 1][k] || cover[r][k] || cover[r + 1][k]) n++;
      return n / SECT;
    };
    let top = 0;
    const cov: number[] = [];
    for (let r = Math.ceil(rMin); r <= Math.floor(rMax); r++) top = Math.max(top, (cov[r] = coverage(r)));
    // Two-colour coins also have an inner ring: prefer the outermost strong circle.
    let rBest = 0;
    for (let r = Math.floor(rMax); r >= Math.ceil(rMin); r--) if (cov[r] >= top * 0.85 && cov[r] >= 0.5) { rBest = r; break; }
    if (!rBest) continue;
    // The ₹10 coin's second ring sits at about 0.6–0.72 of the radius. Round nails don't have one.
    let inner = 0;
    for (let r = Math.round(rBest * 0.56); r <= Math.round(rBest * 0.76); r++) inner = Math.max(inner, coverage(r));
    scored.push({ x: c.x, y: c.y, r: rBest, s: cov[rBest], inner });
  }
  if (!scored.length) return null;
  // Precise fit for the best few; the winner is the cleanest, roundest, two-ring circle.
  scored.sort((a, b) => b.s * (0.6 + 0.4 * b.inner) - a.s * (0.6 + 0.4 * a.inner));
  let win: (Circle & { final: number }) | null = null;
  for (const c of scored.slice(0, 6)) {
    const ref = refineCircle(img, { x: (c.x + 0.5) / k, y: (c.y + 0.5) / k, r: c.r / k });
    if (!ref || ref.r < o.rMin * 0.85 || ref.r > o.rMax * 1.15) continue;
    if (o.skip?.(ref)) continue;
    const final = ref.score * c.s * (0.6 + 0.4 * c.inner) / (1 + 6 * Math.max(0, ref.ellipticity - 1));
    if (!win || final > win.final) win = { ...ref, score: ref.score * c.s, final };
  }
  if (!win || win.final < 0.25) return null;
  const { final: _f, ...circle } = win;
  void _f;
  return circle;
}

/** Precise circle from many rays: strongest colour change near the expected radius, then a robust circle fit. */
function refineCircle(img: Img, c: { x: number; y: number; r: number }) {
  let cur = c;
  let result: { x: number; y: number; r: number; score: number; ellipticity: number } | null = null;
  for (let pass = 0; pass < 2; pass++) {
    const pts: Pt[] = [];
    const rays = 96;
    const step = Math.max(0.5, cur.r / 120);
    for (let a = 0; a < rays; a++) {
      const th = (a / rays) * Math.PI * 2, ux = Math.cos(th), uy = Math.sin(th);
      const from = cur.r * (pass ? 0.9 : 0.8), to = cur.r * (pass ? 1.1 : 1.2);
      const prof: F3[] = [];
      for (let t = from; t <= to; t += step) prof.push(fAt(img, cur.x + ux * t, cur.y + uy * t));
      const sm = smooth(prof, 1);
      let bi = -1, bv = 0;
      for (let i = 1; i < sm.length - 1; i++) {
        const v = dist(sm[i - 1], sm[i + 1]);
        if (v > bv) { bv = v; bi = i; }
      }
      if (bi > 0 && bv > 6) {
        const t = from + bi * step;
        pts.push({ x: cur.x + ux * t, y: cur.y + uy * t });
      }
    }
    if (pts.length < rays * 0.35) return result;
    let fit = fitCircle(pts);
    if (!fit) return result;
    const res = pts.map((p) => Math.abs(Math.hypot(p.x - fit!.x, p.y - fit!.y) - fit!.r));
    const mad = median(res) || 0.5;
    const inl = pts.filter((_, i) => res[i] <= Math.max(1.2, 3 * mad));
    fit = fitCircle(inl) ?? fit;
    const radii = inl.map((p) => Math.hypot(p.x - fit!.x, p.y - fit!.y)).sort((a, b) => a - b);
    const ell = radii.length > 8 ? radii[Math.floor(radii.length * 0.92)] / radii[Math.floor(radii.length * 0.08)] : 1;
    result = { ...fit, score: inl.length / rays, ellipticity: ell };
    cur = fit;
  }
  return result;
}

function fitCircle(p: Pt[]) {
  // Least squares: x² + y² + Dx + Ey + F = 0
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  const n = p.length;
  if (n < 3) return null;
  const mx = p.reduce((s, q) => s + q.x, 0) / n, my = p.reduce((s, q) => s + q.y, 0) / n;
  for (const q of p) {
    const x = q.x - mx, y = q.y - my, z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
  }
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
  const B = [-sxz, -syz, -sz];
  const sol = solve3(A, B);
  if (!sol) return null;
  const [D, E, F] = sol;
  const cx = -D / 2, cy = -E / 2, r2 = cx * cx + cy * cy - F;
  if (!(r2 > 0)) return null;
  return { x: cx + mx, y: cy + my, r: Math.sqrt(r2) };
}

function solve3(A: number[][], b: number[]) {
  const m = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-9) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k];
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

/** Typical colour of the paper/table: a ring just outside the coin. */
export function backgroundAround(img: Img, c: Circle): F3 {
  const list: F3[] = [];
  for (let a = 0; a < 48; a++) {
    const th = (a / 48) * Math.PI * 2;
    for (const f of [1.3, 1.45, 1.6]) list.push(fAt(img, c.x + Math.cos(th) * c.r * f, c.y + Math.sin(th) * c.r * f));
  }
  return medianF(list);
}

// ---------- nails ----------

export type NailMeasure = { a: Pt; b: Pt; px: number; confident: boolean; method: "edges" | "finger" };

// ---------- nail from the finger outline (main method) ----------

type Edges = { l: number; r: number } | null;

/**
 * Finger edges on a line across the finger. A light nail can look like white paper, so the edge is where
 * skin (a run of non-background colour) is followed by a long run of background colour.
 */
function fingerEdges(f: F3[], ci: number, B: F3, S: F3, step: number, mm: number): Edges {
  const isBg = (i: number) => dist(f[i], B) < dist(f[i], S) * 0.85;
  const minSkin = Math.max(2, Math.round((0.3 * mm) / step));
  const needBg = Math.max(3, Math.round((1.5 * mm) / step));
  const side = (dir: 1 | -1) => {
    let skinRun = 0;
    for (let i = ci; i >= 0 && i < f.length; i += dir) {
      if (!isBg(i)) { skinRun++; continue; }
      if (skinRun >= minSkin) {
        let ok = true;
        for (let j = 0; j < needBg; j++) {
          const k = i + dir * j;
          if (k < 0 || k >= f.length || !isBg(k)) { ok = false; break; }
        }
        if (ok) {
          // exact edge: strongest change within 1 mm around this point
          let bi = i, bv = -1;
          const span = Math.round((1 * mm) / step);
          for (let k = i - dir * span; dir > 0 ? k <= i + span : k >= i - span; k += dir) {
            if (k <= 0 || k >= f.length - 1) continue;
            const g = dist(f[k - 1], f[k + 1]);
            if (g > bv) { bv = g; bi = k; }
          }
          return bi;
        }
      }
      skinRun = 0;
    }
    return null;
  };
  const l = side(-1), r = side(1);
  if (l == null || r == null) return null;
  return { l: (l - ci) * step, r: (r - ci) * step };
}

function sampleLine(img: Img, c: Pt, v: Pt, half: number, step: number, sigma: number) {
  const n = Math.round((2 * half) / step) + 1;
  const raw: F3[] = [];
  for (let i = 0; i < n; i++) {
    const t = -half + i * step;
    raw.push(fAt(img, c.x + v.x * t, c.y + v.y * t));
  }
  return { f: smooth(raw, sigma), ci: Math.round(half / step) };
}

/**
 * Measures a nail using the finger's outline against the background:
 * 1. lines across the finger near the tip give the finger's true centre line and direction,
 * 2. walking along that line finds the real fingertip,
 * 3. on lines across the nail, the nail's two side edges are the strongest matching pair of colour edges
 *    inside the finger outline. The widest part of the nail is its size.
 * `tip` and `u` (direction towards the tip) only need to be roughly right.
 */
export function measureNailOutline(img: Img, tip: Pt, u0: Pt, o: { pxPerMm: number; bg: F3; thumb?: boolean }): NailMeasure | null {
  const mm = o.pxPerMm;
  const step = Math.max(0.35, Math.min(1, mm * 0.08));
  const sigma = Math.max(0.8, (0.12 * mm) / step);
  const half = (o.thumb ? 16 : 14) * mm;
  let u = { ...u0 };
  let T = { ...tip };
  // Skin colour from further down the finger (past the nail)
  const S = medianF([16, 18, 20].flatMap((d) => [-1, 0, 1].map((t) => fAt(img, T.x - u.x * d * mm - u.y * t * mm, T.y - u.y * d * mm + u.x * t * mm))));

  // 1. Centre line and direction from the finger outline (twice, the second time on the corrected line)
  for (let pass = 0; pass < 2; pass++) {
    const v = { x: -u.y, y: u.x };
    const pts: { d: number; m: number }[] = [];
    for (let d = 2; d <= 17; d += 1.5) {
      const c = { x: T.x - u.x * d * mm, y: T.y - u.y * d * mm };
      const { f, ci } = sampleLine(img, c, v, half, step, sigma);
      const e = fingerEdges(f, ci, o.bg, S, step, mm);
      if (!e) continue;
      const w = (e.r - e.l) / mm;
      if (w < 8 || w > (o.thumb ? 30 : 26)) continue;
      pts.push({ d: d * mm, m: (e.l + e.r) / 2 });
    }
    if (pts.length < 4) return null;
    // straight line m = a + b·d through the centres (median slope for robustness)
    const slopes: number[] = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) slopes.push((pts[j].m - pts[i].m) / (pts[j].d - pts[i].d));
    const b = median(slopes);
    const a = median(pts.map((p) => p.m - b * p.d));
    // New tip-side point on the centre line and new direction
    const vx = -u.y, vy = u.x;
    const p0 = { x: T.x + vx * a, y: T.y + vy * a };
    // moving back by d along -u shifts sideways by b·d → direction tilts by atan(b)
    const back = { x: -u.x + vx * b, y: -u.y + vy * b };
    const bl = Math.hypot(back.x, back.y);
    u = { x: -back.x / bl, y: -back.y / bl };
    T = p0;
  }
  // 2. The fingertip point now sits on the finger's centre line (a light nail tip can't be told from paper,
  //    so lines are taken from just beyond the tip; lines that miss the finger are skipped).
  const v = { x: -u.y, y: u.x };
  const tipPt = T;
  if (dist(S, o.bg) < 15) return null; // skin and background look alike: outline unusable

  // 3. Nail side edges on lines across the nail
  type Row = { c: Pt; l: number; r: number; fl: number; fr: number; score: number };
  const rows: Row[] = [];
  for (let d = -1.5; d <= 14; d += 0.6) {
    const c = { x: tipPt.x - u.x * d * mm, y: tipPt.y - u.y * d * mm };
    const { f, ci } = sampleLine(img, c, v, half, step, sigma);
    const e = fingerEdges(f, ci, o.bg, S, step, mm);
    if (!e) continue;
    const fl = ci + Math.round(e.l / step), fr = ci + Math.round(e.r / step);
    const w = fr - fl;
    if ((w * step) / mm < 7) continue;
    const g = f.map((_, i) => (i > 0 && i < f.length - 1 ? dist(f[i - 1], f[i + 1]) : 0));
    const minBand = Math.max(1, Math.round(Math.max(0.25 * mm, 0.03 * w * step) / step));
    const maxBand = Math.round(0.3 * w);
    // strongest edges on each side (local maxima), then the best-matching pair
    const peaks = (from: number, to: number) => {
      const list: { i: number; g: number }[] = [];
      for (let i = Math.max(1, from); i <= Math.min(f.length - 2, to); i++) if (g[i] >= g[i - 1] && g[i] >= g[i + 1] && g[i] > 2) list.push({ i, g: g[i] });
      return list.sort((x, y) => y.g - x.g).slice(0, 6);
    };
    const L = peaks(fl + minBand, fl + maxBand), R = peaks(fr - maxBand, fr - minBand);
    let best: { l: number; r: number; score: number } | null = null;
    for (const pl of L)
      for (const pr of R) {
        const bl = pl.i - fl, br = fr - pr.i;
        const sym = 1 - Math.min(1, Math.abs(bl - br) / Math.max(bl, br, 1)) * 0.6;
        const score = Math.min(pl.g, pr.g) * sym;
        if (!best || score > best.score) best = { l: pl.i, r: pr.i, score };
      }
    if (!best) continue;
    // sub-sample peak positions
    const refine = (i: number) => {
      const a = g[i - 1], b = g[i], cc = g[i + 1], den = a - 2 * b + cc;
      return i + (den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - cc)) / den)) : 0);
    };
    rows.push({ c, l: (refine(best.l) - ci) * step, r: (refine(best.r) - ci) * step, fl: e.l, fr: e.r, score: best.score });
  }
  if (rows.length < 3) return null;
  const top = Math.max(...rows.map((r) => r.score));
  const good = rows.filter((r) => r.score >= top * 0.45);
  const widths = good.map((r) => r.r - r.l).sort((a, b) => a - b);
  const est = widths[Math.min(widths.length - 1, Math.floor(widths.length * 0.75))];
  const pick = good.reduce((a, b) => (Math.abs(b.r - b.l - est) < Math.abs(a.r - a.l - est) ? b : a));
  const fingerW = median(good.map((r) => r.fr - r.fl));
  const ratio = est / fingerW;
  const near = widths.filter((w) => Math.abs(w - est) / est < 0.08).length;
  const confident = good.length >= 4 && near >= 3 && ratio > 0.6 && ratio < 0.95 && top >= 8;
  const mid = (pick.l + pick.r) / 2;
  return {
    a: { x: pick.c.x + v.x * (mid - est / 2), y: pick.c.y + v.y * (mid - est / 2) },
    b: { x: pick.c.x + v.x * (mid + est / 2), y: pick.c.y + v.y * (mid + est / 2) },
    px: est,
    confident,
    method: "edges",
  };
}

/**
 * Finds a nail around a point that is roughly on it (a tap, or an estimate from the hand model).
 * On lines across the finger, the nail's sides are the best pair of colour edges: both strong, centred
 * near the point, with a clear colour change between inside and just outside (shine streaks fail this).
 */
export function measureNailAround(img: Img, P: Pt, u0: Pt, o: { pxPerMm: number; thumb?: boolean; offCentre?: number; bg?: F3 | null }): NailMeasure | null {
  // The finger direction may be off: try angles around it. Nail sides run roughly parallel, so a line straight
  // across gives the narrowest width; lines at a slant measure wider.
  const rot = (d: number) => ({ x: u0.x * Math.cos(d) - u0.y * Math.sin(d), y: u0.x * Math.sin(d) + u0.y * Math.cos(d) });
  const tries: { d: number; m: NailMeasure; top: number }[] = [];
  const run = (d: number) => {
    const r = nailRowsAt(img, P, rot(d), o);
    if (r) tries.push({ d, ...r });
  };
  const deg = Math.PI / 180;
  for (let d = -35; d <= 35; d += 7) run(d * deg);
  if (!tries.length) return null;
  const pickBest = () => {
    const strong = Math.max(...tries.map((t) => t.top));
    return tries.filter((t) => t.top >= strong * 0.6).reduce((a, b) => (b.m.px < a.m.px ? b : a));
  };
  const first = pickBest();
  for (const d of [-4, -2, 2, 4]) run(first.d + d * deg);
  return pickBest().m;
}

function nailRowsAt(img: Img, P: Pt, u: Pt, o: { pxPerMm: number; thumb?: boolean; offCentre?: number; bg?: F3 | null }): { m: NailMeasure; top: number } | null {
  const mm = o.pxPerMm;
  const step = Math.max(0.35, Math.min(1, mm * 0.08));
  const sigma = Math.max(0.8, (0.12 * mm) / step);
  const half = (o.thumb ? 13 : 11) * mm;
  const v = { x: -u.y, y: u.x };
  const maxW = (o.thumb ? 24 : 20) * mm, minW = 6 * mm;
  const offScale = (o.offCentre ?? 4) * mm;
  type Row = { c: Pt; l: number; r: number; score: number };
  const rows: Row[] = [];
  for (let a = -5; a <= 5; a += 0.6) {
    const c = { x: P.x + u.x * a * mm, y: P.y + u.y * a * mm };
    const { f, ci } = sampleLine(img, c, v, half, step, sigma);
    const g = f.map((_, i) => (i > 0 && i < f.length - 1 ? dist(f[i - 1], f[i + 1]) : 0));
    const peaks = (from: number, to: number) => {
      const list: { i: number; g: number }[] = [];
      for (let i = Math.max(1, from); i <= Math.min(f.length - 2, to); i++) if (g[i] >= g[i - 1] && g[i] >= g[i + 1] && g[i] > 3) list.push({ i, g: g[i] });
      return list.sort((x, y) => y.g - x.g).slice(0, 8);
    };
    const inner = Math.round((1.5 * mm) / step);
    const L = peaks(0, ci - inner), R = peaks(ci + inner, f.length - 1);
    const out = Math.max(1, Math.round((0.4 * mm) / step)), out2 = Math.max(out + 1, Math.round((1.3 * mm) / step));
    let best: { l: number; r: number; score: number } | null = null;
    for (const pl of L)
      for (const pr of R) {
        const w = (pr.i - pl.i) * step;
        if (w < minW || w > maxW) continue;
        const off = Math.abs(((pl.i + pr.i) / 2 - ci) * step);
        const centre = 1 - 0.6 * Math.min(1, off / offScale);
        const outL = medianF(f.slice(Math.max(0, pl.i - out2), Math.max(1, pl.i - out + 1)));
        const outR = medianF(f.slice(pr.i + out, Math.min(f.length, pr.i + out2 + 1)));
        const inL = medianF(f.slice(pl.i + out, pl.i + out2 + 1));
        const inR = medianF(f.slice(Math.max(0, pr.i - out2), pr.i - out + 1));
        const contrast = Math.min(1, Math.min(dist(inL, outL), dist(inR, outR)) / 25);
        // A nail has the same colour on both inner sides and skin on both outer sides; a shine streak doesn't.
        const sym = (1 - 0.6 * Math.min(1, dist(outL, outR) / 40)) * (1 - 0.2 * Math.min(1, dist(inL, inR) / 60));
        // Paper just outside an edge = that's the finger's outline, not the nail's side
        const outline = o.bg && Math.min(dist(outL, o.bg), dist(outR, o.bg)) < 18 ? 0.25 : 1;
        const score = Math.min(pl.g, pr.g) * centre * contrast * sym * outline;
        if (!Number.isFinite(score)) continue; // edge too close to the end of the line
        if (!best || score > best.score) best = { l: pl.i, r: pr.i, score };
      }
    if (!best || best.score < 2) continue;
    const refine = (i: number) => {
      const p0 = g[i - 1], p1 = g[i], p2 = g[i + 1], den = p0 - 2 * p1 + p2;
      return i + (den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (p0 - p2)) / den)) : 0);
    };
    rows.push({ c, l: (refine(best.l) - ci) * step, r: (refine(best.r) - ci) * step, score: best.score });
  }
  if (rows.length < 3) return null;
  const top = Math.max(...rows.map((r) => r.score));
  // Keep lines that agree with most others (lines past the cuticle or the tip can grab other edges)
  const strong = rows.filter((r) => r.score >= top * 0.5);
  const medW = median(strong.map((r) => r.r - r.l)), medC = median(strong.map((r) => (r.l + r.r) / 2));
  const good = strong.filter((r) => Math.abs(r.r - r.l - medW) <= medW * 0.15 && Math.abs((r.l + r.r) / 2 - medC) <= 1.5 * mm);
  if (good.length < 2) return null;
  const widths = good.map((r) => r.r - r.l).sort((a, b) => a - b);
  const est = widths[Math.min(widths.length - 1, Math.floor(widths.length * 0.75))];
  const pick = good.reduce((a, b) => (Math.abs(b.r - b.l - est) < Math.abs(a.r - a.l - est) ? b : a));
  const near = widths.filter((w) => Math.abs(w - est) / est < 0.08).length;
  const mid = (pick.l + pick.r) / 2;
  return {
    top,
    m: {
      a: { x: pick.c.x + v.x * (mid - est / 2), y: pick.c.y + v.y * (mid - est / 2) },
      b: { x: pick.c.x + v.x * (mid + est / 2), y: pick.c.y + v.y * (mid + est / 2) },
      px: est,
      confident: good.length >= 5 && near >= 4 && top >= 6,
      method: "edges",
    },
  };
}

// ---------- taps (when the hand isn't found automatically) ----------

/** Finger direction around a tapped nail, from which way the edges run (structure tensor). */
export function axisAt(img: Img, p: Pt, radius: number): Pt {
  let jxx = 0, jyy = 0, jxy = 0;
  const step = Math.max(1, radius / 25);
  for (let y = -radius; y <= radius; y += step)
    for (let x = -radius; x <= radius; x += step) {
      if (x * x + y * y > radius * radius) continue;
      const q = { x: p.x + x, y: p.y + y };
      const l = (a: F3) => a[0];
      const dx = l(fAt(img, q.x + 1, q.y)) - l(fAt(img, q.x - 1, q.y));
      const dy = l(fAt(img, q.x, q.y + 1)) - l(fAt(img, q.x, q.y - 1));
      jxx += dx * dx; jyy += dy * dy; jxy += dx * dy;
    }
  // Main gradient direction runs across the finger; the finger runs at right angles to it.
  const th = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
  return { x: -Math.sin(th), y: Math.cos(th) };
}

// ---------- whole photo ----------

export type PhotoPart = "fingers" | "thumb";
export const PART_FINGERS: Record<PhotoPart, number[]> = { fingers: [1, 2, 3, 4], thumb: [0] };
/** [last joint, tip] landmark numbers for thumb, index, middle, ring, pinky (MediaPipe hand model). */
export const NAIL_JOINTS: [number, number][] = [[3, 4], [7, 8], [11, 12], [15, 16], [19, 20]];
const BONES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
/** How far the nails sit above the table (mm): flat fingers vs the thumb laid on its side. */
const NAIL_HEIGHT: Record<PhotoPart, number> = { fingers: 11, thumb: 15 };

export type NailResult = { finger: number; a: Pt; b: Pt; mm: number; confident: boolean };
export type Analysis = {
  coin: Circle | null;
  pxPerMm: number | null;
  mmPerPx: number | null; // at the height of the nails (after the camera-distance correction)
  tilted: boolean;
  nails: NailResult[];
  handFound: boolean;
  missing: number[]; // fingers we couldn't measure
};

function segDist(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/**
 * Camera-distance correction: nails are `h` mm above the coin, so they look a little bigger.
 * Distance comes from the coin's size and the lens (35 mm-equivalent focal length, 26 mm on most phone main cameras).
 */
export function heightFactor(img: Img, coinR: number, part: PhotoPart, focal35 = 26) {
  const fPx = (focal35 * Math.hypot(img.width, img.height)) / 43.27;
  const distMm = Math.min(800, Math.max(120, (fPx * COIN_MM) / (2 * coinR)));
  return (distMm - NAIL_HEIGHT[part]) / distMm;
}

/**
 * Measures the nails in one photo. `landmarks` = 21 hand points in pixels (or null if no hand was found);
 * `taps` = nail centres tapped by the customer, by finger number; `coinTap` = where they tapped the coin.
 */
export function analyzePhoto(img: Img, o: { part: PhotoPart; landmarks: Pt[] | null; taps?: Record<number, Pt>; coinTap?: Pt; focal35?: number }): Analysis {
  const fingers = PART_FINGERS[o.part];
  const lm = o.landmarks;
  const minSide = Math.min(img.width, img.height);
  // Coin size range from the finger length (distal finger bone ≈ 18–30 mm; coin radius 13.5 mm)
  let rMin = minSide * 0.02, rMax = minSide * 0.2;
  if (lm) {
    const segs = fingers.map((f) => Math.hypot(lm[NAIL_JOINTS[f][1]].x - lm[NAIL_JOINTS[f][0]].x, lm[NAIL_JOINTS[f][1]].y - lm[NAIL_JOINTS[f][0]].y));
    const L = median(segs);
    rMin = L * (o.part === "thumb" ? 0.32 : 0.4);
    rMax = L * (o.part === "thumb" ? 0.85 : 1.0);
  }
  const fingerHalf = lm ? median(fingers.map((f) => Math.hypot(lm[NAIL_JOINTS[f][1]].x - lm[NAIL_JOINTS[f][0]].x, lm[NAIL_JOINTS[f][1]].y - lm[NAIL_JOINTS[f][0]].y))) * 0.4 : 0;
  const skip = lm ? (p: Pt) => BONES.some(([a, b]) => segDist(p, lm[a], lm[b]) < fingerHalf) : undefined;
  const coin = findCoin(img, o.coinTap ? { rMin: minSide * 0.015, rMax: minSide * 0.25, near: o.coinTap, nearDist: minSide * 0.12 } : { rMin, rMax, skip });
  const out: Analysis = { coin, pxPerMm: null, mmPerPx: null, tilted: false, nails: [], handFound: Boolean(lm), missing: [] };
  if (!coin) {
    out.missing = fingers;
    return out;
  }
  const pxPerMm = (2 * coin.r) / COIN_MM;
  out.pxPerMm = pxPerMm;
  out.tilted = coin.ellipticity > 1.08;
  const bg = backgroundAround(img, coin);
  const hf = heightFactor(img, coin.r, o.part, o.focal35);
  out.mmPerPx = hf / pxPerMm;
  for (const f of fingers) {
    const thumb = f === 0;
    let m: NailMeasure | null = null;
    // Finger direction from the hand model (middle joint → tip is steadier than last joint → tip)
    const dirOf = (): Pt | null => {
      if (!lm) return null;
      const t = lm[NAIL_JOINTS[f][1]], from = lm[NAIL_JOINTS[f][1] - 2];
      const l = Math.hypot(t.x - from.x, t.y - from.y) || 1;
      return { x: (t.x - from.x) / l, y: (t.y - from.y) / l };
    };
    const tapPt = o.taps?.[f];
    if (tapPt) {
      // The customer tapped this nail: measure around the tap.
      const u = dirOf() ?? axisAt(img, tapPt, 9 * pxPerMm);
      m = measureNailAround(img, tapPt, u, { pxPerMm, thumb, offCentre: 3, bg });
    } else if (lm) {
      const tip = lm[NAIL_JOINTS[f][1]], base = lm[NAIL_JOINTS[f][0]], u = dirOf()!;
      // 1. Finger outline against the paper (best when fingers are apart on plain paper)
      m = measureNailOutline(img, tip, u, { pxPerMm, bg, thumb });
      // 2. Otherwise search around where the hand model thinks the nail is
      if (!m) {
        const L = Math.hypot(tip.x - base.x, tip.y - base.y);
        const guess = { x: tip.x - u.x * L * 0.3, y: tip.y - u.y * L * 0.3 };
        m = measureNailAround(img, guess, u, { pxPerMm, thumb, offCentre: 5, bg });
        if (m) m.confident = false; // less sure without the outline: ask the customer to check
      }
    }
    if (!m) {
      out.missing.push(f);
      continue;
    }
    out.nails.push({ finger: f, a: m.a, b: m.b, mm: Math.round(((m.px / pxPerMm) * hf) * 10) / 10, confident: m.confident });
  }
  // Fingers of one hand follow similar proportions; a nail far outside them was probably measured wrong.
  if (out.nails.length >= 3) {
    const norm = out.nails.map((n) => n.mm / TYPICAL_RATIO[n.finger]);
    const mid = median(norm);
    out.nails.forEach((n, i) => {
      if (Math.abs(norm[i] - mid) / mid > 0.18) n.confident = false;
    });
  }
  return out;
}

/** Typical nail width relative to the index nail (thumb, index, middle, ring, pinky). */
const TYPICAL_RATIO = [1.35, 1, 1.03, 0.95, 0.8];
