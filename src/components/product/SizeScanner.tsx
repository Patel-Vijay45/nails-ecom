"use client";

// Photo sizing helper: the customer photographs their hand next to a ₹10 coin, a ruler or a bank card.
// Fingers are found automatically (MediaPipe, runs in the browser), dots are placed
// on each nail, the customer fine-tunes them, and nail widths are converted to kit sizes.

import { useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { FINGERS } from "@/lib/constants";
import { CARD_WIDTH_MM, COIN_10_MM, mmToKit, REFERENCES, type RefKind, type Scan } from "@/lib/sizes";
import { CheckIcon, CloseIcon } from "../Icons";

type P = [number, number]; // 0–1 of image width / height
type Hand = "right" | "left";
type DragId = { kind: "card"; i: 0 | 1 } | { kind: "nail"; f: number; i: 0 | 1 };

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FINGER_JOINTS: [number, number][] = [[3, 4], [7, 8], [11, 12], [15, 16], [19, 20]]; // [last joint, tip]
const MAX_SIDE = 1600;

let landmarker: Promise<HandLandmarker> | null = null;
function getLandmarker() {
  landmarker ??= (async () => {
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    return HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" }, runningMode: "IMAGE", numHands: 1 });
  })().catch((e) => {
    landmarker = null;
    throw e;
  });
  return landmarker;
}

function defaultNails(): [P, P][] {
  return FINGERS.map((_, f) => {
    const x = 0.22 + f * 0.14;
    return [[x - 0.035, 0.35], [x + 0.035, 0.35]];
  });
}

const DEFAULT_REF: Record<RefKind, [P, P]> = {
  coin: [[0.74, 0.82], [0.84, 0.82]],
  ruler: [[0.25, 0.88], [0.55, 0.88]],
  card: [[0.3, 0.85], [0.7, 0.85]],
};

export type ScanResult = { hand: Hand; sizes: number[]; scan: Scan | null };

export default function SizeScanner({ tipWidths, onClose, onDone }: { tipWidths: number[]; onClose: () => void; onDone: (r: ScanResult) => void }) {
  const [step, setStep] = useState<"intro" | "mark">("intro");
  const [hand, setHand] = useState<Hand>("right");
  const [img, setImg] = useState<{ url: string; w: number; h: number; blob: Blob } | null>(null);
  const [refKind, setRefKind] = useState<RefKind>("coin");
  const [rulerCm, setRulerCm] = useState(5);
  const [card, setCard] = useState<[P, P]>(DEFAULT_REF.coin); // the two reference points
  const [nails, setNails] = useState<[P, P][]>(defaultNails());
  const [detect, setDetect] = useState<"idle" | "busy" | "found" | "none">("idle");
  const [drag, setDrag] = useState<DragId | null>(null);
  const [cursor, setCursor] = useState<P | null>(null);
  const [consent, setConsent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    getLandmarker().catch(() => {}); // start loading early
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  useEffect(() => () => {
    if (img) URL.revokeObjectURL(img.url);
  }, [img]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale);
      const h = Math.round(bmp.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.88));
      setImg({ url: URL.createObjectURL(blob), w, h, blob });
      setNails(defaultNails());
      setCard(DEFAULT_REF[refKind]);
      setStep("mark");
      findFingers(canvas, w, h);
    } catch {
      setError("Couldn't open that photo. Please try a JPG or PNG.");
    }
  }

  async function findFingers(canvas: HTMLCanvasElement, w: number, h: number) {
    setDetect("busy");
    try {
      const lm = await getLandmarker();
      const res = lm.detect(canvas);
      const pts = res.landmarks[0];
      if (!pts) return setDetect("none");
      setNails(
        FINGER_JOINTS.map(([j, t], f) => {
          const jx = pts[j].x * w, jy = pts[j].y * h, tx = pts[t].x * w, ty = pts[t].y * h;
          const dx = tx - jx, dy = ty - jy;
          const len = Math.hypot(dx, dy) || 1;
          const cx = jx + dx * 0.55, cy = jy + dy * 0.55; // nail centre, a bit toward the tip
          const half = len * (f === 0 ? 0.3 : 0.28); // rough nail half-width; customer fine-tunes
          const nx = -dy / len, ny = dx / len;
          const clamp = (v: number) => Math.min(1, Math.max(0, v));
          return [
            [clamp((cx + nx * half) / w), clamp((cy + ny * half) / h)],
            [clamp((cx - nx * half) / w), clamp((cy - ny * half) / h)],
          ];
        }),
      );
      setDetect("found");
    } catch {
      setDetect("none");
    }
  }

  // ----- measuring -----
  const W = img?.w ?? 1, H = img?.h ?? 1;
  const dist = (a: P, b: P) => Math.hypot((a[0] - b[0]) * W, (a[1] - b[1]) * H);
  const cardPx = dist(card[0], card[1]);
  const refMm = refKind === "coin" ? COIN_10_MM : refKind === "card" ? CARD_WIDTH_MM : Math.max(1, rulerCm) * 10;
  const mmPerPx = cardPx > 0 ? refMm / cardPx : 0;
  const mm = nails.map(([a, b]) => Math.round(dist(a, b) * mmPerPx * 10) / 10);
  const sizes = mm.map((v) => mmToKit(tipWidths, v));
  const refHelp =
    refKind === "coin" ? "opposite edges of the coin, straight through the middle (line up the gold circle with the coin)" : refKind === "ruler" ? `two marks on the ruler exactly ${rulerCm} cm apart` : "both short ends of the card";
  const cardTooSmall = cardPx < W * (refKind === "coin" ? 0.035 : refKind === "ruler" ? 0.05 : 0.12);
  const odd = mm.some((v) => v < 6 || v > 22);

  // ----- dragging -----
  function toPoint(e: React.PointerEvent): P | null {
    const r = box.current?.getBoundingClientRect();
    if (!r) return null;
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  }
  function move(e: React.PointerEvent) {
    if (!drag) return;
    const p = toPoint(e);
    if (!p) return;
    setCursor(p);
    if (drag.kind === "card") setCard((c) => (drag.i === 0 ? [p, c[1]] : [c[0], p]));
    else setNails((ns) => ns.map((n, f) => (f === drag.f ? (drag.i === 0 ? [p, n[1]] : [n[0], p]) : n)) as [P, P][]);
  }
  function start(e: React.PointerEvent, id: DragId) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag(id);
    setCursor(toPoint(e));
  }
  const end = () => {
    setDrag(null);
    setCursor(null);
  };

  async function finish() {
    if (!img) return;
    setSaving(true);
    setError("");
    let scan: Scan | null = null;
    if (consent) {
      const fd = new FormData();
      fd.append("photo", new File([img.blob], "hand.jpg", { type: "image/jpeg" }));
      const r = await fetch("/api/sizing-photo", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ ok: false }));
      if (r.ok) scan = { url: r.url, hand, card, nails, mm, ref: { kind: refKind, mm: refMm } };
    }
    setSaving(false);
    onDone({ hand, sizes, scan });
  }

  const handle = (p: P, id: DragId, color: string, label?: string) => (
    <button
      type="button"
      key={JSON.stringify(id)}
      onPointerDown={(e) => start(e, id)}
      className="absolute z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none place-items-center active:cursor-grabbing"
      style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%` }}
      aria-label={label ?? "Move point"}
    >
      <span className="h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ background: color }} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-label="Measure from a photo">
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-cream shadow-2xl sm:max-h-[92vh] sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="font-bold">Measure from a photo</p>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2 rounded-full" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {step === "intro" && (
            <div>
              <div className="grid place-items-center rounded-3xl bg-white p-6">
                <svg viewBox="0 0 240 150" className="w-64" aria-hidden>
                  {refKind === "card" && (
                    <>
                      <rect x="140" y="80" width="86" height="54" rx="6" fill="#e9dfd6" stroke="#c9a36a" strokeWidth="2" />
                      <rect x="150" y="92" width="18" height="13" rx="2" fill="#c9a36a" />
                      <text x="183" y="125" fontSize="9" textAnchor="middle" fill="#6f5f63">bank / Aadhaar card</text>
                    </>
                  )}
                  {refKind === "coin" && (
                    <>
                      <circle cx="170" cy="112" r="20" fill="#e6c77e" stroke="#b08a3e" strokeWidth="2" />
                      <circle cx="170" cy="112" r="12" fill="#cfd3d8" stroke="#9aa0a8" strokeWidth="1.5" />
                      <text x="170" y="116" fontSize="10" fontWeight="700" textAnchor="middle" fill="#5a4a2a">₹10</text>
                    </>
                  )}
                  {refKind === "ruler" && (
                    <>
                      <rect x="128" y="104" width="104" height="24" rx="3" fill="#f6e7b4" stroke="#c9a36a" strokeWidth="1.5" />
                      {Array.from({ length: 11 }).map((_, k) => (
                        <line key={k} x1={134 + k * 9} y1="104" x2={134 + k * 9} y2={k % 5 === 0 ? 116 : 111} stroke="#6f5f63" strokeWidth="1" />
                      ))}
                      <text x="180" y="125" fontSize="8" textAnchor="middle" fill="#6f5f63">school ruler / scale</text>
                    </>
                  )}
                  <path d="M30 140 C30 110 40 95 50 90 L48 40 Q50 30 58 32 L62 80 L66 22 Q70 12 78 16 L80 78 L86 18 Q92 10 98 16 L98 80 L106 34 Q112 26 118 34 L114 96 C112 120 100 140 90 140 Z" fill="#f4d9d6" stroke="#8e2c48" strokeWidth="1.5" />
                  {[[51, 36], [70, 20], [90, 17], [111, 32]].map(([x, y]) => (
                    <ellipse key={x} cx={x + 2} cy={y + 6} rx="5" ry="7" fill="#8e2c48" opacity="0.8" />
                  ))}
                </svg>
              </div>
              <ol className="mt-5 space-y-2 text-sm text-ink/80">
                <li><b>1.</b> Lay one hand <b>flat on a table</b>, fingers slightly apart, nails facing up.</li>
                <li>
                  <b>2.</b>{" "}
                  {refKind === "coin" && <>Put a <b>₹10 coin</b> flat on the table right next to your fingers.</>}
                  {refKind === "ruler" && <>Put a <b>ruler or scale</b> flat on the table right next to your fingers, with the cm marks visible.</>}
                  {refKind === "card" && <>Put any <b>bank, debit, credit or Aadhaar card</b> flat on the table right next to your fingers.</>}
                </li>
                <li><b>3.</b> Hold your phone <b>straight above</b> (not at an angle), about 30 cm away, in good light.</li>
              </ol>
              <p className="label mt-6">What will you put next to your hand?</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(REFERENCES) as RefKind[]).map((k) => (
                  <button type="button" key={k} onClick={() => setRefKind(k)} data-active={refKind === k} className="chip h-auto flex-col rounded-2xl px-2 py-2.5 text-center">
                    <span className="text-xs font-semibold leading-tight">{REFERENCES[k].label}</span>
                    <span className="mt-0.5 text-[10px] font-normal opacity-70">{REFERENCES[k].hint}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">Only the ₹10 coin works: ₹1, ₹2 and ₹5 coins come in different sizes depending on the year.</p>
              <p className="label mt-5">Which hand is in the photo?</p>
              <div className="flex gap-2">
                {(["right", "left"] as const).map((h) => (
                  <button type="button" key={h} className="chip flex-1 capitalize" data-active={hand === h} onClick={() => setHand(h)}>
                    {h} hand
                  </button>
                ))}
              </div>
              <label className="btn-primary mt-6 w-full cursor-pointer py-4">
                Take or choose a photo
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              {error && <p className="mt-3 text-sm text-berry">{error}</p>}
              <p className="mt-4 text-center text-xs text-muted">The photo is measured on your phone. It's only uploaded if you choose to save it with your order.</p>
            </div>
          )}

          {step === "mark" && img && (
            <div>
              <p className="text-sm">
                {detect === "busy" && "Finding your fingers…"}
                {detect === "found" && <>We found your fingers ✓ <b>Drag the pink dots</b> to the left and right edges of each nail (the widest part), and the <b>gold dots</b> to {refHelp}.</>}
                {detect === "none" && <>We couldn&apos;t find your fingers automatically. <b>Drag each pair of pink dots</b> onto the edges of a nail, and the <b>gold dots</b> to {refHelp}.</>}
                {detect === "idle" && "Loading…"}
              </p>

              <div
                ref={box}
                className="relative mt-3 select-none overflow-hidden rounded-2xl bg-ink touch-none"
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="Your hand" className="block w-full" draggable={false} />
                <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full">
                  <line x1={card[0][0] * W} y1={card[0][1] * H} x2={card[1][0] * W} y2={card[1][1] * H} stroke="#c9a36a" strokeWidth={W / 300} strokeDasharray={`${W / 80} ${W / 160}`} />
                  {refKind === "coin" && (
                    <circle cx={((card[0][0] + card[1][0]) / 2) * W} cy={((card[0][1] + card[1][1]) / 2) * H} r={cardPx / 2} fill="none" stroke="#c9a36a" strokeWidth={W / 400} />
                  )}
                  {nails.map(([a, b], f) => (
                    <g key={f}>
                      <line x1={a[0] * W} y1={a[1] * H} x2={b[0] * W} y2={b[1] * H} stroke="#e0567a" strokeWidth={W / 350} />
                      <text x={((a[0] + b[0]) / 2) * W} y={((a[1] + b[1]) / 2) * H - W / 70} fontSize={W / 40} fontWeight="700" fill="#fff" stroke="#1e1418" strokeWidth={W / 400} paintOrder="stroke" textAnchor="middle">
                        {FINGERS[f][0]}
                      </text>
                    </g>
                  ))}
                </svg>
                {card.map((p, i) => handle(p, { kind: "card", i: i as 0 | 1 }, "#c9a36a", `Reference point ${i + 1}`))}
                {nails.flatMap(([a, b], f) => [
                  handle(a, { kind: "nail", f, i: 0 }, "#e0567a", `${FINGERS[f]} nail edge 1`),
                  handle(b, { kind: "nail", f, i: 1 }, "#e0567a", `${FINGERS[f]} nail edge 2`),
                ])}
                {/* Magnifier while dragging, so the finger doesn't hide the dot */}
                {drag && cursor && (
                  <div
                    className={`pointer-events-none absolute top-2 z-20 h-32 w-32 ${cursor[0] < 0.4 && cursor[1] < 0.4 ? "right-2" : "left-2"} overflow-hidden rounded-full border-4 border-white shadow-xl`}
                    style={{
                      backgroundImage: `url(${img.url})`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: `${(box.current?.clientWidth ?? 0) * 3}px auto`,
                      backgroundPosition: `${60 - cursor[0] * (box.current?.clientWidth ?? 0) * 3}px ${60 - cursor[1] * (box.current?.clientHeight ?? 0) * 3}px`,
                    }}
                  >
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/80" />
                    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80" />
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                {FINGERS.map((f, i) => (
                  <div key={f} className="rounded-2xl bg-white p-2">
                    <p className="text-[11px] font-semibold text-muted">{f}</p>
                    <p className="text-xl font-bold">{sizes[i]}</p>
                    <p className="text-[11px] text-muted">{mm[i].toFixed(1)} mm</p>
                  </div>
                ))}
              </div>
              {refKind === "ruler" && (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  Gold dots are
                  <input type="number" min={1} max={30} value={rulerCm} onChange={(e) => setRulerCm(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} className="field w-20 px-2 py-1.5 text-center" aria-label="Distance between gold dots in cm" />
                  cm apart on the ruler
                </label>
              )}
              {cardTooSmall && <p className="mt-3 rounded-xl bg-[#fdf0d5] px-4 py-2 text-xs text-[#8a5a00]">Move the gold dots to {refHelp}.</p>}
              {!cardTooSmall && odd && <p className="mt-3 rounded-xl bg-[#fdf0d5] px-4 py-2 text-xs text-[#8a5a00]">Some sizes look unusual. Check that each pink pair sits on the edges of one nail.</p>}

              <label className="mt-4 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-berry" />
                <span>Save this photo with my order so the artist can double-check my sizes</span>
              </label>
              {error && <p className="mt-3 text-sm text-berry">{error}</p>}
              <div className="mt-5 flex gap-2">
                <label className="btn-outline cursor-pointer">
                  New photo
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                <button type="button" onClick={finish} disabled={saving || cardTooSmall} className="btn-primary flex-1">
                  {saving ? "Saving…" : (<><CheckIcon width={18} height={18} /> Use these sizes for my {hand} hand</>)}
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-muted">Photo sizes are a close estimate. For the most exact fit, use the sizing kit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
