"use client";

// Photo sizing: two photos per hand (four fingers, then the thumb on its own), each with a ₹10 coin.
// Everything is measured automatically on the phone: the coin gives the scale, the hand model finds the
// fingers, and each nail's edges are found from the colours. If something isn't found, one tap fixes it.

import { useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { decode } from "@/lib/compressImage";
import { FINGERS } from "@/lib/constants";
import { focal35FromJpeg } from "@/lib/exif";
import { analyzePhoto, PART_FINGERS, type Analysis, type PhotoPart, type Pt } from "@/lib/nailMeasure";
import { COIN_10_MM, DEFAULT_PHOTO_SCALE, mmToKit, type PhotoScale, type Scan } from "@/lib/sizes";
import { CheckIcon, CloseIcon } from "../Icons";

type Hand = "right" | "left";
type Shot = {
  url: string; // shown on screen (and uploaded)
  blob: Blob;
  w: number; // size of the measured image; overlay coordinates use it
  h: number;
  data: ImageData;
  landmarks: Pt[] | null;
  focal35: number | null;
  analysis: Analysis;
  taps: Record<number, Pt>;
  coinTap?: Pt;
  adj: Record<number, number>; // customer's − / + changes in mm
  manual: Record<number, { a: Pt; b: Pt }>; // lines the customer placed by hand in the close-up
  reviewed: Record<number, boolean>; // nails the customer looked at close up and confirmed
};
/** One nail as shown: automatic result or the customer's own line. */
type Eff = { finger: number; a: Pt; b: Pt; raw: number; confident: boolean; manual: boolean };
type TapMode = { kind: "coin" } | { kind: "nail"; queue: number[] } | null;

export type ScanResult = { hand: Hand; sizes: (number | null)[]; mm: (number | null)[]; scans: Scan[] };

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const ANALYZE_SIDE = 2400;
const SHOW_SIDE = 1600;
const STEP_MM = 0.3;

let landmarker: Promise<HandLandmarker> | null = null;
function getLandmarker() {
  landmarker ??= (async () => {
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    return HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" }, runningMode: "IMAGE", numHands: 1, minHandDetectionConfidence: 0.3 });
  })().catch((e) => {
    landmarker = null;
    throw e;
  });
  return landmarker;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export default function SizeScanner({
  tipWidths,
  scale = DEFAULT_PHOTO_SCALE,
  calibrate = false,
  onClose,
  onDone,
}: {
  tipWidths: number[];
  scale?: PhotoScale;
  calibrate?: boolean; // admin calibration: raw measurements, no upload
  onClose: () => void;
  onDone: (r: ScanResult) => void;
}) {
  const [step, setStep] = useState<"intro" | PhotoPart | "summary">("intro");
  const [hand, setHand] = useState<Hand>("right");
  const [shots, setShots] = useState<Partial<Record<PhotoPart, Shot>>>({});
  const [skipThumb, setSkipThumb] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tap, setTap] = useState<TapMode>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(true);
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    getLandmarker().catch(() => {}); // start loading early
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const [zoom, setZoom] = useState<number | null>(null); // finger shown close up

  const cal = (part: PhotoPart) => (calibrate ? 1 : part === "thumb" ? scale.thumb : scale.fingers);

  /** Nails of one photo with the customer's changes applied (raw mm, before calibration and − / +). */
  function eff(part: PhotoPart): Eff[] {
    const s = shots[part];
    if (!s?.analysis.coin) return [];
    const list: Eff[] = [];
    for (const f of PART_FINGERS[part]) {
      const n = s.analysis.nails.find((x) => x.finger === f);
      const man = s.manual[f];
      const perPx = n ? n.mm / (Math.hypot(n.b.x - n.a.x, n.b.y - n.a.y) || 1) : s.analysis.mmPerPx ?? 0;
      if (man) list.push({ finger: f, a: man.a, b: man.b, raw: r1(Math.hypot(man.b.x - man.a.x, man.b.y - man.a.y) * perPx), confident: true, manual: true });
      else if (n) list.push({ finger: f, a: n.a, b: n.b, raw: n.mm, confident: n.confident || Boolean(s.reviewed[f]), manual: false });
    }
    return list;
  }

  /** Final mm and kit size per finger (null = not measured). */
  function results() {
    const mm: (number | null)[] = [null, null, null, null, null];
    for (const part of ["fingers", "thumb"] as PhotoPart[]) {
      const s = shots[part];
      if (!s || (part === "thumb" && skipThumb)) continue;
      for (const n of eff(part)) mm[n.finger] = r1(n.raw * cal(part) + (s.adj[n.finger] ?? 0));
    }
    return { mm, sizes: mm.map((v) => (v == null ? null : mmToKit(tipWidths, v))) };
  }

  function nextTap(a: Analysis, part: PhotoPart, hadLandmarks: boolean): TapMode {
    if (!a.coin) return { kind: "coin" };
    const missing = PART_FINGERS[part].filter((f) => !a.nails.some((n) => n.finger === f));
    if (!hadLandmarks || missing.length) return { kind: "nail", queue: hadLandmarks ? missing : PART_FINGERS[part] };
    return null;
  }

  async function onFile(part: PhotoPart, file: File | undefined) {
    if (!file) return;
    setError("");
    setNote("");
    setBusy(true);
    try {
      const focal35 = focal35FromJpeg(await file.slice(0, 256 * 1024).arrayBuffer());
      const { w: ow, h: oh, draw } = await decode(file);
      const k = Math.min(1, ANALYZE_SIDE / Math.max(ow, oh));
      const w = Math.round(ow * k), h = Math.round(oh * k);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      draw(ctx, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      // Smaller copy to show and to upload
      const ks = Math.min(1, SHOW_SIDE / Math.max(w, h));
      const show = document.createElement("canvas");
      show.width = Math.round(w * ks);
      show.height = Math.round(h * ks);
      show.getContext("2d")!.drawImage(canvas, 0, 0, show.width, show.height);
      const blob = await new Promise<Blob>((res, rej) => show.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.86));
      let landmarks: Pt[] | null = null;
      try {
        const res = (await getLandmarker()).detect(canvas);
        landmarks = res.landmarks[0]?.map((p) => ({ x: p.x * w, y: p.y * h })) ?? null;
      } catch {
        landmarks = null;
      }
      await new Promise((r) => setTimeout(r, 20)); // let the "Measuring…" message paint
      const analysis = analyzePhoto(data, { part, landmarks, focal35: focal35 ?? undefined });
      try {
        // For testing: localStorage.sizingDebug = "1" exposes what was found.
        if (localStorage.getItem("sizingDebug")) (window as unknown as { __sizing?: unknown }).__sizing = { part, w, h, landmarks, analysis, focal35 };
      } catch {}
      const prev = shots[part];
      if (prev) URL.revokeObjectURL(prev.url);
      setShots((s) => ({ ...s, [part]: { url: URL.createObjectURL(blob), blob, w, h, data, landmarks, focal35, analysis, taps: {}, adj: {}, manual: {}, reviewed: {} } }));
      setZoom(null);
      setTap(nextTap(analysis, part, Boolean(landmarks)));
    } catch {
      setError("Couldn't open that photo. Please try again with a JPG or PNG photo.");
    } finally {
      setBusy(false);
    }
  }

  function rerun(part: PhotoPart, patch: Partial<Shot>) {
    const s = { ...shots[part]!, ...patch };
    const analysis = analyzePhoto(s.data, { part, landmarks: s.landmarks, taps: s.taps, coinTap: s.coinTap, focal35: s.focal35 ?? undefined });
    setShots((all) => ({ ...all, [part]: { ...s, analysis } }));
    return analysis;
  }

  function onPhotoTap(part: PhotoPart, e: React.MouseEvent) {
    const s = shots[part];
    const r = box.current?.getBoundingClientRect();
    if (!s || !r || !tap) return;
    const p = { x: ((e.clientX - r.left) / r.width) * s.w, y: ((e.clientY - r.top) / r.height) * s.h };
    setNote("");
    if (tap.kind === "coin") {
      const a = rerun(part, { coinTap: p });
      if (!a.coin) return setNote("We still can't see the coin's edge there. Tap right in the middle of the ₹10 coin, or take a new photo on plain paper.");
      setTap(nextTap(a, part, Boolean(s.landmarks)));
      return;
    }
    const [f, ...rest] = tap.queue;
    const taps = { ...s.taps, [f]: p };
    const { [f]: _m, ...manual } = s.manual;
    const { [f]: _a, ...adj } = s.adj;
    void _m; void _a;
    if (rest.length) {
      setShots((all) => ({ ...all, [part]: { ...s, taps, manual, adj } }));
      setTap({ kind: "nail", queue: rest });
      return;
    }
    const a = rerun(part, { taps, manual, adj });
    setTap(null);
    // Nails still not found: put a line on the tapped spot for the customer to fit in the close-up.
    const still = PART_FINGERS[part].filter((x) => !a.nails.some((n) => n.finger === x));
    if (still.length && a.mmPerPx) {
      const half = 5.5 / a.mmPerPx;
      setShots((all) => {
        const cur = all[part]!;
        const add = Object.fromEntries(still.map((x) => { const t = taps[x] ?? p; return [x, { a: { x: t.x - half, y: t.y }, b: { x: t.x + half, y: t.y } }]; }));
        return { ...all, [part]: { ...cur, manual: { ...cur.manual, ...add } } };
      });
      setZoom(still[0]);
      setNote("We couldn't find that nail's edges on our own. Drag the two dots to the left and right edges of the nail.");
    }
  }

  const adjust = (part: PhotoPart, f: number, d: number) =>
    setShots((all) => {
      const s = all[part]!;
      return { ...all, [part]: { ...s, adj: { ...s.adj, [f]: r1((s.adj[f] ?? 0) + d) } } };
    });

  async function finish() {
    const { mm, sizes } = results();
    const scans: Scan[] = [];
    if (!calibrate && consent) {
      setSaving(true);
      for (const part of ["fingers", "thumb"] as PhotoPart[]) {
        const s = shots[part];
        if (!s?.analysis.coin || (part === "thumb" && skipThumb)) continue;
        const fd = new FormData();
        fd.append("photo", new File([s.blob], `${part}.jpg`, { type: "image/jpeg" }));
        const r = await fetch("/api/sizing-photo", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ ok: false }));
        if (!r.ok) continue;
        const c = s.analysis.coin;
        const nx = (p: Pt): [number, number] => [Math.min(1, Math.max(0, p.x / s.w)), Math.min(1, Math.max(0, p.y / s.h))];
        const nails: [[number, number], [number, number]][] = [0, 1, 2, 3, 4].map(() => [[0, 0], [0, 0]]);
        const mmArr = [0, 0, 0, 0, 0];
        for (const n of eff(part)) {
          const [a, b] = adjustedLine(n, s.adj[n.finger] ?? 0, cal(part));
          nails[n.finger] = [nx(a), nx(b)];
          mmArr[n.finger] = mm[n.finger] ?? 0;
        }
        scans.push({ url: r.url, hand, card: [nx({ x: c.x - c.r, y: c.y }), nx({ x: c.x + c.r, y: c.y })], nails, mm: mmArr, ref: { kind: "coin", mm: COIN_10_MM }, fingers: PART_FINGERS[part] });
      }
      setSaving(false);
    }
    onDone({ hand, sizes, mm, scans });
  }

  const shot = step === "fingers" || step === "thumb" ? shots[step] : undefined;
  const part = step === "fingers" || step === "thumb" ? step : null;
  /** Nails marked "please check" that the customer hasn't confirmed yet. */
  const toCheck = (p: PhotoPart) => {
    const s = shots[p];
    return eff(p).filter((n) => !n.confident && !s?.reviewed[n.finger]).map((n) => n.finger);
  };
  const confirmNail = (p: PhotoPart, f: number) => {
    setShots((all) => {
      const cur = all[p]!;
      return { ...all, [p]: { ...cur, reviewed: { ...cur.reviewed, [f]: true } } };
    });
    const next = toCheck(p).filter((x) => x !== f);
    setNote("");
    setZoom(next.length ? next[0] : null);
  };
  const partDone = (p: PhotoPart) => {
    const list = eff(p);
    return PART_FINGERS[p].every((f) => list.some((n) => n.finger === f));
  };
  const { mm, sizes } = results();

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-label="Measure from photos">
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-cream shadow-2xl sm:max-h-[94vh] sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <p className="font-bold">{calibrate ? "Calibration photos" : "Measure from photos"}</p>
            {step !== "intro" && (
              <p className="text-[11px] font-semibold text-muted" data-testid="scan-progress">
                <span className="capitalize">{hand}</span> hand · {(["fingers", "thumb", "summary"] as const).map((x, i) => (
                  <span key={x} className={step === x ? "text-berry" : ""}>{i > 0 && " → "}{x === "fingers" ? "1. Fingers" : x === "thumb" ? "2. Thumb" : "3. Sizes"}</span>
                ))}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2 rounded-full" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {step === "intro" && (
            <div>
              <p className="text-sm text-ink/80">Two quick photos and we measure every nail for you. No dragging, no ruler.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Need icon="coin" title="A ₹10 coin" sub="27 mm, any year. Other coins vary in size." />
                <Need icon="paper" title="Plain white paper" sub="Printer paper is best (no lines)" />
              </div>
              <p className="label mt-6">Which hand?</p>
              <div className="flex gap-2">
                {(["right", "left"] as const).map((h) => (
                  <button type="button" key={h} className="chip flex-1 capitalize" data-active={hand === h} onClick={() => setHand(h)}>
                    {h} hand
                  </button>
                ))}
              </div>
              <button type="button" className="btn-primary mt-6 w-full py-4" onClick={() => setStep("fingers")}>
                Start
              </button>
              <p className="mt-4 text-center text-xs text-muted">Photos are measured on your phone. They&apos;re only uploaded if you choose to save them with your order.</p>
            </div>
          )}

          {part && !shot && (
            <div>
              <div className="grid place-items-center rounded-3xl bg-white p-4">{part === "fingers" ? <FingersArt /> : <ThumbArt />}</div>
              <p className="mt-4 font-bold">{part === "fingers" ? "Photo 1: your four fingers" : "Photo 2: your thumb"}</p>
              <ol className="mt-2 space-y-1.5 text-sm text-ink/80">
                {part === "fingers" ? (
                  <>
                    <li>• Lay your {hand} hand <b>flat on the paper</b>, nails up, fingers <b>slightly apart</b>. Your thumb can stay out of the photo.</li>
                    <li>• Put the <b>₹10 coin</b> on the paper just above your fingertips.</li>
                    <li>• Hold the phone <b>straight above</b>, about a hand-span (20–25 cm) away, not closer. No zoom.</li>
                    <li>• <b>Bright light</b>: near a window in daylight is best. No flash.</li>
                  </>
                ) : (
                  <>
                    <li>• Rest your hand at the <b>edge of the table</b> like a handshake, fingers curled down over the edge.</li>
                    <li>• Lay your <b>thumb flat on the paper</b> so the thumbnail faces up at the camera.</li>
                    <li>• Put the <b>₹10 coin</b> right next to the thumbnail and take the photo from straight above, a hand-span away, in bright light.</li>
                  </>
                )}
              </ol>
              <PhotoButtons onFile={(f) => onFile(part, f)} busy={busy} />
              {error && <p className="mt-3 text-sm text-berry">{error}</p>}
              {part === "thumb" && (
                <button type="button" className="mt-4 w-full text-center text-xs font-semibold text-muted underline" onClick={() => { setSkipThumb(true); setStep("summary"); }}>
                  Skip the thumb, I&apos;ll choose its size myself
                </button>
              )}
              {part === "thumb" && <button type="button" className="mt-2 w-full text-center text-xs text-muted" onClick={() => setStep("fingers")}>← Back to fingers</button>}
            </div>
          )}

          {part && shot && (
            <div>
              <Status shot={shot} part={part} tap={tap} busy={busy} note={note} nails={eff(part)} />
              <div
                ref={box}
                className={`relative mt-3 select-none overflow-hidden rounded-2xl bg-ink ${tap ? "cursor-crosshair ring-4 ring-berry/60" : ""}`}
                onClick={(e) => onPhotoTap(part, e)}
                data-testid="scan-photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.url} alt="Your photo" className="block w-full" draggable={false} />
                <svg viewBox={`0 0 ${shot.w} ${shot.h}`} className="pointer-events-none absolute inset-0 h-full w-full">
                  {shot.analysis.coin && (
                    <circle cx={shot.analysis.coin.x} cy={shot.analysis.coin.y} r={shot.analysis.coin.r} fill="none" stroke="#e8c26a" strokeWidth={shot.w / 300} />
                  )}
                  {eff(part).map((n) => {
                    const [a, b] = adjustedLine(n, shot.adj[n.finger] ?? 0, cal(part));
                    const color = n.confident ? "#ff4f86" : "#ffb020";
                    return (
                      <g key={n.finger}>
                        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={shot.w / 180} strokeLinecap="round" />
                        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={shot.w / 320} strokeLinecap="round" />
                        <text x={(a.x + b.x) / 2} y={Math.min(a.y, b.y) - shot.w / 60} fontSize={shot.w / 34} fontWeight="700" fill="#fff" stroke="#1e1418" strokeWidth={shot.w / 450} paintOrder="stroke" textAnchor="middle">
                          {sizes[n.finger] ?? ""}{n.confident ? "" : "?"}
                        </text>
                      </g>
                    );
                  })}
                  {Object.entries(shot.taps).map(([f, p]) => (
                    <circle key={f} cx={p.x} cy={p.y} r={shot.w / 140} fill="#ff4f86" stroke="#fff" strokeWidth={shot.w / 600} />
                  ))}
                </svg>
              </div>

              {shot.analysis.coin && zoom != null && PART_FINGERS[part].includes(zoom) && (() => {
                const n = eff(part).find((x) => x.finger === zoom);
                if (!n) return null;
                const [a, b] = adjustedLine(n, shot.adj[zoom] ?? 0, cal(part));
                const perPx = n.raw / (Math.hypot(n.b.x - n.a.x, n.b.y - n.a.y) || 1);
                return (
                  <NailZoom
                    shot={shot}
                    a={a}
                    b={b}
                    mmPerPx={perPx}
                    label={FINGERS[zoom]}
                    size={sizes[zoom]}
                    mm={mm[zoom]}
                    onMove={(na, nb) => {
                      // The customer's own line replaces the automatic one (and any − / +)
                      setShots((all) => {
                        const cur = all[part]!;
                        const { [zoom]: _x, ...adj } = cur.adj;
                        void _x;
                        return { ...all, [part]: { ...cur, adj, manual: { ...cur.manual, [zoom]: { a: na, b: nb } } } };
                      });
                    }}
                    onStep={(d) => adjust(part, zoom, d)}
                    onRetap={() => { setZoom(null); setNote(""); setTap({ kind: "nail", queue: [zoom] }); }}
                    onClose={() => confirmNail(part, zoom)}
                    left={toCheck(part).filter((x) => x !== zoom).length}
                  />
                );
              })()}

              {shot.analysis.coin && (
                <div className={`mt-4 grid gap-2 ${part === "thumb" ? "grid-cols-1" : "grid-cols-4"}`} data-testid="finger-results">
                  {PART_FINGERS[part].map((f) => {
                    const n = eff(part).find((x) => x.finger === f);
                    return (
                      <button
                        type="button"
                        key={f}
                        onClick={() => { setNote(""); if (n) setZoom(f); else setTap({ kind: "nail", queue: [f] }); }}
                        className={`rounded-2xl bg-white p-2 text-center transition hover:shadow ${n && !n.confident ? "ring-2 ring-[#ffb020]" : ""} ${zoom === f ? "ring-2 ring-berry" : ""}`}
                        data-testid={`finger-${f}`}
                      >
                        <span className="block text-[11px] font-semibold text-muted">{FINGERS[f]}</span>
                        <span className="block text-2xl font-bold" data-testid={`size-${f}`}>{n ? sizes[f] : "–"}</span>
                        <span className="block text-[11px] text-muted">{n ? `${mm[f]?.toFixed(1)} mm` : "not found"}</span>
                        <span className="mt-1 block text-[11px] font-semibold text-berry underline">{n ? (n.confident ? "Check" : "Please check") : "Tap nail"}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <label className="btn-outline cursor-pointer">
                  Retake
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(part, e.target.files?.[0])} />
                </label>
                {toCheck(part).length > 0 ? (
                  <button type="button" className="btn-primary flex-1" disabled={busy || Boolean(tap)} onClick={() => { setNote(""); setZoom(toCheck(part)[0]); }}>
                    Check {toCheck(part).length} nail{toCheck(part).length > 1 ? "s" : ""} up close →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    disabled={!partDone(part) || busy || Boolean(tap)}
                    onClick={() => { setTap(null); setNote(""); setZoom(null); setStep(part === "fingers" ? "thumb" : "summary"); }}
                  >
                    {part === "fingers" ? "Looks right → thumb" : "Looks right → see sizes"}
                  </button>
                )}
              </div>
              {part === "thumb" && !partDone("thumb") && (
                <button type="button" className="mt-3 w-full text-center text-xs font-semibold text-muted underline" onClick={() => { setSkipThumb(true); setTap(null); setStep("summary"); }}>
                  Skip the thumb, I&apos;ll choose its size myself
                </button>
              )}
            </div>
          )}

          {step === "summary" && (
            <div>
              <p className="font-bold">Your {hand} hand sizes</p>
              <div className="mt-3 grid grid-cols-5 gap-2 text-center" data-testid="summary-sizes">
                {FINGERS.map((f, i) => (
                  <div key={f} className="rounded-2xl bg-white p-2">
                    <p className="text-[11px] font-semibold text-muted">{f}</p>
                    <p className="text-2xl font-bold">{sizes[i] ?? "–"}</p>
                    <p className="text-[11px] text-muted">{mm[i] != null ? `${mm[i]!.toFixed(1)} mm` : "choose later"}</p>
                  </div>
                ))}
              </div>
              {!calibrate && (
                <>
                  <p className="mt-4 rounded-2xl bg-shell p-3 text-xs text-muted">
                    Photo sizes are usually right or one size off. Our nail artist checks your photos before making your set, and messages you on WhatsApp if anything looks off.
                  </p>
                  <label className="mt-4 flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-berry" />
                    <span>Save my photos with the order so the artist can double-check my sizes</span>
                  </label>
                </>
              )}
              <div className="mt-5 flex gap-2">
                <button type="button" className="btn-outline" onClick={() => { setSkipThumb(false); setStep(shots.thumb ? "thumb" : "fingers"); }}>Back</button>
                <button type="button" onClick={finish} disabled={saving} className="btn-primary flex-1">
                  {saving ? "Saving…" : (<><CheckIcon width={18} height={18} /> {calibrate ? "Use these measurements" : `Use these sizes for my ${hand} hand`}</>)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Nail line endpoints after the customer's − / + (in shown mm). */
function adjustedLine(n: { a: Pt; b: Pt; raw: number }, adj: number, cal: number): [Pt, Pt] {
  // The line marks the nail's edges in the photo: calibration changes the millimetres, not the line.
  const k = n.raw > 0 ? (n.raw + adj / cal) / n.raw : 1;
  const m = { x: (n.a.x + n.b.x) / 2, y: (n.a.y + n.b.y) / 2 };
  return [
    { x: m.x + (n.a.x - m.x) * k, y: m.y + (n.a.y - m.y) * k },
    { x: m.x + (n.b.x - m.x) * k, y: m.y + (n.b.y - m.y) * k },
  ];
}

function Status({ shot, part, tap, busy, note, nails }: { shot: Shot; part: PhotoPart; tap: TapMode; busy: boolean; note: string; nails: Eff[] }) {
  const a = shot.analysis;
  const box = (tone: "ok" | "warn" | "tap", text: React.ReactNode) => (
    <p
      className={`rounded-2xl px-4 py-3 text-sm ${tone === "ok" ? "bg-[#e3ede6] text-[#2f6b44]" : tone === "tap" ? "bg-berry text-white" : "bg-[#fdf0d5] text-[#8a5a00]"}`}
      data-testid="scan-status"
    >
      {text}
    </p>
  );
  if (busy) return box("warn", "Measuring your nails…");
  if (note) return box("warn", note);
  if (tap?.kind === "coin") return box("tap", <><b>Tap the ₹10 coin</b> in the photo. We couldn&apos;t spot it on our own.</>);
  if (tap?.kind === "nail") {
    const f = tap.queue[0];
    return box("tap", <><b>Tap the middle of your {FINGERS[f].toLowerCase()} nail</b>{tap.queue.length > 1 ? ` (${tap.queue.length} to go)` : ""}.{!shot.landmarks && part === "fingers" ? " We couldn't find your hand on our own." : ""}</>);
  }
  const unsure = nails.filter((n) => !n.confident).length;
  if (a.tilted) return box("warn", <>The coin looks oval, so the phone was tilted. For the most exact size, <b>retake from straight above</b>. Otherwise check the lines.</>);
  if (a.dark) return box("warn", <>The photo is quite <b>dark</b>, so nail edges are hard to see. For the most exact size, retake near a window in daylight. Otherwise check each nail up close.</>);
  if (a.tooClose) return box("warn", <>The phone was very <b>close</b> to your hand. For the most exact size, retake from about 20–25 cm (a hand-span) away. Otherwise check each nail up close.</>);
  if (unsure) return box("warn", <>We&apos;re not sure about the <b>orange lines</b>. Next, you&apos;ll see each of those nails up close: confirm or drag the line onto the nail&apos;s edges.</>);
  return box("ok", <>✓ Measured. Each line should go across a nail at its widest, edge to edge. Tap a finger below to check it up close.</>);
}

function PhotoButtons({ onFile, busy }: { onFile: (f: File | undefined) => void; busy: boolean }) {
  return (
    <div className="mt-5 space-y-2">
      <label className={`btn-primary w-full cursor-pointer py-4 ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? "Measuring…" : "Take photo"}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} data-testid="photo-camera" />
      </label>
      <label className={`btn-outline w-full cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        Choose from gallery
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} data-testid="photo-gallery" />
      </label>
    </div>
  );
}

function Need({ icon, title, sub }: { icon: "coin" | "paper"; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
        {icon === "coin" ? (
          <>
            <circle cx="20" cy="20" r="17" fill="#e6c77e" stroke="#b08a3e" strokeWidth="2" />
            <circle cx="20" cy="20" r="10" fill="#cfd3d8" stroke="#9aa0a8" strokeWidth="1.5" />
            <text x="20" y="24" fontSize="10" fontWeight="700" textAnchor="middle" fill="#5a4a2a">₹10</text>
          </>
        ) : (
          <rect x="7" y="4" width="26" height="32" rx="2" fill="#fff" stroke="#c9bdb5" strokeWidth="2" />
        )}
      </svg>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[11px] text-muted">{sub}</span>
      </span>
    </div>
  );
}

function FingersArt() {
  return (
    <svg viewBox="0 0 260 170" className="w-64" aria-hidden>
      <rect x="20" y="10" width="220" height="150" rx="4" fill="#fbfaf7" stroke="#d9d0c8" />
      <circle cx="196" cy="42" r="15" fill="#e6c77e" stroke="#b08a3e" strokeWidth="2" />
      <circle cx="196" cy="42" r="9" fill="#cfd3d8" stroke="#9aa0a8" strokeWidth="1.2" />
      <path d="M70 168 L72 120 L66 62 Q66 50 76 50 Q86 50 86 62 L92 112 L96 46 Q97 34 107 34 Q117 34 117 46 L118 110 L124 44 Q125 32 135 32 Q145 33 144 46 L142 112 L152 62 Q154 52 163 54 Q172 57 169 68 L160 124 L156 168 Z" fill="#f2cdbb" stroke="#8e2c48" strokeWidth="1.4" />
      {[[76, 57], [107, 41], [135, 39], [162, 61]].map(([x, y]) => (
        <ellipse key={x} cx={x} cy={y + 3} rx="5.5" ry="7" fill="#e58aa5" stroke="#8e2c48" strokeWidth="0.8" />
      ))}
      <g transform="translate(212 92)">
        <rect x="-11" y="-20" width="22" height="38" rx="4" fill="#1f1a1c" />
        <circle cx="0" cy="-12" r="3" fill="#6f6a6c" />
      </g>
      <path d="M212 118 L212 140" stroke="#8e2c48" strokeWidth="1.4" strokeDasharray="3 3" />
      <text x="212" y="152" fontSize="9" textAnchor="middle" fill="#6f5f63">straight above</text>
    </svg>
  );
}

function ThumbArt() {
  return (
    <svg viewBox="0 0 260 170" className="w-64" aria-hidden>
      <rect x="10" y="10" width="240" height="96" rx="3" fill="#fbfaf7" stroke="#d9d0c8" />
      <line x1="0" y1="106" x2="260" y2="106" stroke="#8a7a70" strokeWidth="3" />
      <text x="16" y="122" fontSize="9" fill="#6f5f63">table edge</text>
      <path d="M60 106 Q58 80 80 70 L150 64 Q172 62 176 74 Q180 88 160 92 L104 98 Q96 104 100 106 Z" fill="#f2cdbb" stroke="#8e2c48" strokeWidth="1.4" />
      <ellipse cx="160" cy="78" rx="11" ry="8" fill="#e58aa5" stroke="#8e2c48" strokeWidth="0.8" />
      <path d="M60 106 Q56 140 76 160 L118 160 Q132 140 118 106" fill="#f2cdbb" stroke="#8e2c48" strokeWidth="1.4" opacity="0.55" />
      <text x="96" y="140" fontSize="8" textAnchor="middle" fill="#6f5f63">fingers curled</text>
      <text x="96" y="150" fontSize="8" textAnchor="middle" fill="#6f5f63">below the edge</text>
      <circle cx="208" cy="76" r="15" fill="#e6c77e" stroke="#b08a3e" strokeWidth="2" />
      <circle cx="208" cy="76" r="9" fill="#cfd3d8" stroke="#9aa0a8" strokeWidth="1.2" />
      <text x="160" y="56" fontSize="9" textAnchor="middle" fill="#8e2c48" fontWeight="700">nail faces up</text>
    </svg>
  );
}

/** Close-up of one nail with its measuring line; the two dots can be dragged to the nail's edges. */
function NailZoom({ shot, a, b, mmPerPx, label, size, mm, onMove, onStep, onRetap, onClose, left }: {
  shot: Shot; a: Pt; b: Pt; mmPerPx: number; label: string; size: number | null; mm: number | null;
  onMove: (a: Pt, b: Pt) => void; onStep: (d: number) => void; onRetap: () => void; onClose: () => void; left: number;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<0 | 1 | null>(null);
  // Fixed view while dragging, so the picture doesn't move under the finger
  const [view, setView] = useState(() => {
    const R = 11 / Math.max(mmPerPx, 1e-6);
    const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return { x: c.x - R, y: c.y - R, s: 2 * R };
  });
  useEffect(() => {
    if (drag != null) return;
    const R = 11 / Math.max(mmPerPx, 1e-6);
    const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    setView((v) => (Math.hypot(v.x + v.s / 2 - c.x, v.y + v.s / 2 - c.y) > R * 0.5 ? { x: c.x - R, y: c.y - R, s: 2 * R } : v));
  }, [a.x, a.y, b.x, b.y, mmPerPx, drag]);
  const toSvg = (e: React.PointerEvent): Pt | null => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const dot = view.s / 34;
  return (
    <div className="mt-4 rounded-3xl bg-white p-3" data-testid="nail-zoom">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-bold">{label} nail, close up</p>
        <p className="text-sm"><b className="text-lg">{size ?? "–"}</b> <span className="text-muted">· {mm?.toFixed(1)} mm</span></p>
      </div>
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.s} ${view.s}`}
        className="mt-2 aspect-square w-full touch-none select-none rounded-2xl bg-ink"
        onPointerMove={(e) => {
          if (drag == null) return;
          const p = toSvg(e);
          if (p) onMove(drag === 0 ? p : a, drag === 1 ? p : b);
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <image href={shot.url} x={0} y={0} width={shot.w} height={shot.h} preserveAspectRatio="none" />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={dot * 0.45} strokeLinecap="round" />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ff4f86" strokeWidth={dot * 0.25} strokeLinecap="round" />
        {[a, b].map((p, i) => (
          <g key={i} onPointerDown={(e) => { e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(i as 0 | 1); }} className="cursor-grab" data-testid={`zoom-dot-${i}`}>
            <circle cx={p.x} cy={p.y} r={dot * 2.2} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={dot * 0.8} fill="#ff4f86" stroke="#fff" strokeWidth={dot * 0.3} />
          </g>
        ))}
      </svg>
      <p className="mt-2 px-1 text-xs text-muted">Is the pink line exactly from one side of the nail to the other, at its widest? If not, drag the dots onto the nail&apos;s edges (not the skin around it).</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-outline h-10 w-10 p-0 text-lg" onClick={() => onStep(-STEP_MM)} aria-label="Narrower">−</button>
        <button type="button" className="btn-outline h-10 w-10 p-0 text-lg" onClick={() => onStep(STEP_MM)} aria-label="Wider">+</button>
        <button type="button" className="btn-ghost text-xs text-berry" onClick={onRetap}>Tap this nail again</button>
        <button type="button" className="btn-primary ml-auto py-2.5" onClick={onClose}>{left ? `Correct ✓ next nail` : "Correct ✓"}</button>
      </div>
    </div>
  );
}
