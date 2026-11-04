"use client";

import { useState } from "react";
import SizeScanner, { type ScanResult } from "@/components/product/SizeScanner";
import { FINGERS } from "@/lib/constants";
import { KIT_SIZES } from "@/lib/sizes";
import { addPhotoSample } from "../../actions";

/** Admin: measure a hand whose kit sizes are known, then enter the true sizes. */
export default function PhotoCalibration({ tipWidths }: { tipWidths: number[] }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  return (
    <div>
      <button type="button" className="btn-primary" onClick={() => { setResult(null); setScanning(true); }}>
        Measure a hand with known sizes
      </button>
      {scanning && <SizeScanner tipWidths={tipWidths} calibrate onClose={() => setScanning(false)} onDone={(r) => { setScanning(false); setResult(r); }} />}
      {result && (
        <form action={addPhotoSample} className="mt-4 rounded-2xl bg-shell p-4" data-testid="calibration-form">
          <p className="text-sm font-semibold">Now enter the sizes that really fit this hand (tried with your kit):</p>
          <label className="mt-3 block max-w-xs">
            <span className="label">Whose hand</span>
            <input name="label" className="field" placeholder={`e.g. Priya, ${result.hand} hand`} />
          </label>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {FINGERS.map((f, i) => (
              <label key={f} className="text-center">
                <span className="text-[11px] font-semibold text-muted">{f}</span>
                <span className="block text-[11px] text-muted">photo: {result.mm[i] != null ? `${result.mm[i]} mm → ${result.sizes[i]}` : "–"}</span>
                <input type="hidden" name={`mm${i}`} value={result.mm[i] ?? ""} />
                <select name={`truth${i}`} defaultValue={result.sizes[i] ?? ""} className="field mt-1 px-0 text-center" aria-label={`${f} true size`}>
                  <option value="">–</option>
                  {KIT_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
          </div>
          <button className="btn-primary mt-4">Save and recalculate</button>
        </form>
      )}
    </div>
  );
}
