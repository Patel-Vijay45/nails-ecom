"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FINGERS } from "@/lib/constants";
import { KIT_SIZES, type NailSizes, type PhotoScale, type Scan } from "@/lib/sizes";
import SizeScanner, { type ScanResult } from "./SizeScanner";

export type SizeState = { right: (number | null)[]; left: (number | null)[]; same: boolean; later: boolean; scans: Scan[] };
export const EMPTY_SIZES: SizeState = { right: [null, null, null, null, null], left: [null, null, null, null, null], same: true, later: false, scans: [] };

export const LOCAL_KEY = "nails_sizes_v1";

/** Returns complete sizes, or null if any finger is missing. */
export function readSizes(s: SizeState): NailSizes | null {
  const left = s.same ? s.right : s.left;
  if ([...s.right, ...left].some((v) => v === null)) return null;
  return { right: s.right as number[], left: left as number[] };
}

function fromSaved(sizes: NailSizes): SizeState {
  const same = sizes.right.every((v, i) => v === sizes.left[i]);
  return { right: sizes.right, left: sizes.left, same, later: false, scans: [] };
}

export default function SizePicker({ value, onChange, tipWidths, photoScale }: { value: SizeState; onChange: (v: SizeState) => void; tipWidths: number[]; photoScale?: PhotoScale }) {
  const [scanning, setScanning] = useState(false);
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Fill in sizes used last time on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      if (saved && value.right.every((v) => v === null)) {
        onChange(fromSaved(JSON.parse(saved)));
        setMsg({ ok: true, text: "Filled in with the sizes you used last time on this device." });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setMsg(null);
    const r = await fetch("/api/sizes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) })
      .then((r) => r.json())
      .catch(() => ({ ok: false, error: "Couldn't connect. Please try again." }));
    setLoading(false);
    if (r.ok) {
      onChange(fromSaved(r.sizes));
      setMsg({ ok: true, text: "Your saved sizes are filled in ✓" });
    } else setMsg({ ok: false, text: r.error });
  }

  function applyScan(r: ScanResult) {
    setScanning(false);
    const scans = [...value.scans.filter((s) => s.hand !== r.hand), ...r.scans];
    // Keep any size the photos didn't measure (e.g. a skipped thumb) as it was.
    const merge = (old: (number | null)[]) => r.sizes.map((v, i) => v ?? old[i]);
    if (r.hand === "right") {
      const right = merge(value.right);
      onChange({ ...value, right, left: value.same ? right : value.left, later: false, scans });
    } else {
      const left = merge(value.same ? value.right : value.left);
      onChange({ ...value, left, same: false, right: value.same && value.right.some((v) => v === null) ? left : value.right, later: false, scans });
    }
    const skipped = r.sizes.some((v) => v === null);
    setMsg({
      ok: true,
      text:
        (r.hand === "right" && value.same
          ? "Sizes filled in from your photos ✓ If your left hand is different, untick 'Both hands are the same' and measure it too."
          : `Sizes for your ${r.hand} hand filled in from your photos ✓`) + (skipped ? " Choose your thumb size below." : ""),
    });
  }

  const setHand = (hand: "right" | "left", i: number, v: string) => {
    const next = [...value[hand]];
    next[i] = v === "" ? null : Number(v);
    onChange({ ...value, [hand]: next });
  };

  const row = (hand: "right" | "left", label: string) => (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <div className="grid grid-cols-5 gap-2">
        {FINGERS.map((f, i) => (
          <label key={f} className="text-center">
            <span className="text-[11px] font-semibold text-muted">{f}</span>
            <select
              value={value[hand][i] ?? ""}
              onChange={(e) => setHand(hand, i, e.target.value)}
              disabled={value.later}
              className="field mt-1 appearance-none px-0 text-center font-semibold disabled:opacity-40"
              aria-label={`${label} ${f} size`}
            >
              <option value="">–</option>
              {KIT_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <p className="text-sm font-semibold">Your nail sizes</p>
      <p className="mt-1 text-xs text-muted">
        Use the numbers from your sizing kit (0 = widest, 11 = narrowest). We save them, so next time they fill in automatically.
      </p>

      <div className="mt-4 rounded-2xl bg-shell p-3">
        <p className="text-xs font-semibold">Ordered made-to-measure before?</p>
        <div className="mt-2 flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            placeholder="Your mobile number"
            className="field py-2"
          />
          <button type="button" onClick={load} disabled={phone.length !== 10 || loading} className="btn-outline shrink-0 px-4 py-2 text-xs">
            {loading ? "…" : "Load my sizes"}
          </button>
        </div>
        {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-[#2f6b44]" : "text-berry"}`}>{msg.text}</p>}
      </div>

      <button
        type="button"
        onClick={() => setScanning(true)}
        disabled={value.later}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-berry/40 bg-blush/30 px-4 py-3 text-sm font-semibold text-berry transition hover:border-berry disabled:opacity-40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        No kit? Measure from 2 photos
      </button>
      {scanning && <SizeScanner tipWidths={tipWidths} scale={photoScale} onClose={() => setScanning(false)} onDone={applyScan} />}

      <div className="mt-4 space-y-4">
        {row("right", value.same ? "Both hands" : "Right hand")}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.same}
            onChange={(e) => onChange({ ...value, same: e.target.checked, left: e.target.checked ? value.left : [...value.right] })}
            disabled={value.later}
            className="h-4 w-4 accent-berry"
          />
          Both hands are the same
        </label>
        {!value.same && row("left", "Left hand")}
      </div>

      <label className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm">
        <input type="checkbox" checked={value.later} onChange={(e) => onChange({ ...value, later: e.target.checked })} className="h-4 w-4 accent-berry" />
        I&apos;ll send my sizes on WhatsApp after ordering
      </label>
      <p className="mt-3 text-xs text-muted">
        No sizing kit yet?{" "}
        <Link href="/product/sizing-kit" className="font-semibold text-berry underline">Get one for ₹99</Link>, and its price comes back as a coupon.
      </p>
    </div>
  );
}
