import { mmToKit } from "./sizes";

// Photo sizing calibration. The owner measures a few hands whose kit sizes are known (tried with the real kit),
// and we pick the multiplier that turns photo millimetres into the right kit size most often.
// Thumbs get their own multiplier because the thumb photo is taken differently.

export type PhotoSample = { id: string; label: string; at: string; mm: (number | null)[]; truth: (number | null)[] };
export type FitStats = { scale: number; n: number; exact: number; within1: number };

export function parseSamples(json: string | null | undefined): PhotoSample[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((s) => s && Array.isArray(s.mm) && Array.isArray(s.truth)) : [];
  } catch {
    return [];
  }
}

/** How many nails the given multiplier gets exactly right / within one size. */
export function score(samples: PhotoSample[], fingers: number[], tipWidths: number[], scale: number): FitStats {
  let n = 0, exact = 0, within1 = 0;
  for (const s of samples)
    for (const f of fingers) {
      const mm = s.mm[f], truth = s.truth[f];
      if (mm == null || truth == null) continue;
      const d = Math.abs(mmToKit(tipWidths, mm * scale) - truth);
      n++;
      if (d === 0) exact++;
      if (d <= 1) within1++;
    }
  return { scale, n, exact, within1 };
}

/** Best multiplier between 0.8 and 1.25 (middle of the best range, so it isn't on a knife edge). */
export function fitScale(samples: PhotoSample[], fingers: number[], tipWidths: number[]): FitStats {
  const base = score(samples, fingers, tipWidths, 1);
  if (!base.n) return base;
  let best = -Infinity;
  const tops: number[] = [];
  for (let s = 0.8; s <= 1.25 + 1e-9; s += 0.0025) {
    const st = score(samples, fingers, tipWidths, s);
    let err = 0;
    for (const smp of samples) for (const f of fingers) if (smp.mm[f] != null && smp.truth[f] != null) err += Math.abs(mmToKit(tipWidths, smp.mm[f]! * s) - smp.truth[f]!);
    const v = st.exact * 100 + st.within1 * 10 - err;
    if (v > best + 1e-9) { best = v; tops.length = 0; }
    if (Math.abs(v - best) < 1e-9) tops.push(s);
  }
  const scale = Math.round(tops[Math.floor(tops.length / 2)] * 10000) / 10000;
  return score(samples, fingers, tipWidths, scale);
}
