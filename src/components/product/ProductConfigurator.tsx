"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductView } from "@/lib/catalog";
import { FINGERS, SIZES } from "@/lib/constants";
import { inr } from "@/lib/format";
import { useCart } from "../cart/CartProvider";
import { CheckIcon, MinusIcon, PlusIcon, RulerIcon } from "../Icons";
import NailArt from "../NailArt";

const SIZE_HELP: Record<string, string> = {
  XS: "Thumb 14mm · Index 10mm",
  S: "Thumb 15mm · Index 11mm",
  M: "Thumb 16mm · Index 12mm",
  L: "Thumb 18mm · Index 13mm",
};

export default function ProductConfigurator({ p }: { p: ProductView }) {
  const { add } = useCart();
  const router = useRouter();
  const hasOptions = p.shapes.length > 0;
  const [shape, setShape] = useState(p.shapes[0] ?? "");
  const [length, setLength] = useState(p.lengths[1] ?? p.lengths[0] ?? "");
  const [size, setSize] = useState<string>(hasOptions ? "M" : "");
  const [mm, setMm] = useState<Record<string, string>>({});
  const [later, setLater] = useState(false);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<number>(-1); // -1 = live preview, else image index
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const custom = size === "Custom";
  const unit = p.price + (custom ? p.madeToMeasureFee : 0);
  const soldOut = p.stock <= 0 && !custom;
  const lowStock = !custom && p.stock > 0 && p.stock <= 5;

  function buildMeasurements() {
    if (!custom) return "";
    if (later) return "Customer will send sizes on WhatsApp";
    return FINGERS.map((f) => `${f} ${mm[f]}`).join(", ") + " (mm)";
  }

  function submit(goCheckout: boolean) {
    setError("");
    if (custom && !later && FINGERS.some((f) => !mm[f] || Number(mm[f]) < 5 || Number(mm[f]) > 25)) {
      setError("Enter all 5 nail widths in mm (between 5 and 25), or tick 'I'll send my sizes later'.");
      return;
    }
    add({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      price: unit,
      quantity: qty,
      shape,
      length,
      size,
      measurements: buildMeasurements(),
      palette: p.palette,
      pattern: p.pattern,
      image: p.images[0],
    }, { openDrawer: !goCheckout });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    if (goCheckout) router.push("/checkout");
  }

  return (
    <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
      {/* Gallery */}
      <div className="md:sticky md:top-28 md:self-start">
        <div className="relative aspect-square overflow-hidden rounded-[36px] bg-gradient-to-br from-white via-shell to-blush">
          {view >= 0 && p.images[view] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[view]} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center">
              <div className="absolute h-1/2 w-1/2 rounded-full bg-white/70 blur-3xl" />
              <NailArt palette={p.palette} pattern={p.pattern} shape={shape || "Almond"} length={length || "Medium"} seed={p.slug} className="relative w-[82%] transition-all duration-500" />
              {hasOptions && (
                <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  Live preview · {shape} · {length}
                </span>
              )}
            </div>
          )}
        </div>
        {p.images.length > 0 && (
          <div className="mt-3 flex gap-3 overflow-x-auto">
            <button onClick={() => setView(-1)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-shell ${view === -1 ? "border-ink" : "border-transparent"}`}>
              <NailArt palette={p.palette} pattern={p.pattern} shape={shape || "Almond"} seed={p.slug} className="w-full" />
            </button>
            {p.images.map((src, i) => (
              <button key={src} onClick={() => setView(i)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 ${view === i ? "border-ink" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Options */}
      <div>
        {p.collection && <p className="eyebrow">{p.collection.name}</p>}
        <h1 className="display mt-3 text-4xl md:text-5xl">{p.name}</h1>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-bold">{inr(unit)}</span>
          {p.compareAtPrice && p.compareAtPrice > p.price && !custom && <span className="text-lg text-muted line-through">{inr(p.compareAtPrice)}</span>}
          {p.badge && <span className="rounded-full bg-blush px-3 py-1 text-xs font-bold uppercase tracking-wide text-berry">{p.badge}</span>}
        </div>
        <p className="mt-5 leading-relaxed text-muted">{p.description}</p>

        {hasOptions && (
          <div className="mt-8 space-y-7">
            <OptionGroup label="Shape" value={shape}>
              {p.shapes.map((s) => (
                <button key={s} className="chip" data-active={shape === s} onClick={() => setShape(s)}>
                  {s}
                </button>
              ))}
            </OptionGroup>
            {p.lengths.length > 0 && (
              <OptionGroup label="Length" value={length}>
                {p.lengths.map((l) => (
                  <button key={l} className="chip" data-active={length === l} onClick={() => setLength(l)}>
                    {l}
                  </button>
                ))}
              </OptionGroup>
            )}
            <OptionGroup label="Size" value={custom ? "Made to measure" : size} help={<a href="/sizing-guide" target="_blank" className="text-berry underline">Size guide</a>}>
              {SIZES.map((s) => (
                <button key={s} className="chip min-w-14" data-active={size === s} onClick={() => setSize(s)} title={SIZE_HELP[s]}>
                  {s}
                </button>
              ))}
              {p.madeToMeasure && (
                <button className="chip gap-2" data-active={custom} onClick={() => setSize("Custom")}>
                  <RulerIcon width={16} height={16} /> Made to measure{p.madeToMeasureFee > 0 && ` +${inr(p.madeToMeasureFee)}`}
                </button>
              )}
            </OptionGroup>
            {!custom && size && <p className="-mt-4 text-xs text-muted">Size {size}: {SIZE_HELP[size]}. Every set includes 24 nails across 12 sizes.</p>}

            {custom && (
              <div className="rounded-3xl border border-line bg-white p-5">
                <p className="text-sm font-semibold">Your nail widths (mm)</p>
                <p className="mt-1 text-xs text-muted">Measure the widest part of each nail on your dominant hand. See the sizing guide for help.</p>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {FINGERS.map((f) => (
                    <label key={f} className="text-center">
                      <span className="text-[11px] font-semibold text-muted">{f}</span>
                      <input
                        inputMode="decimal"
                        disabled={later}
                        value={mm[f] ?? ""}
                        onChange={(e) => setMm({ ...mm, [f]: e.target.value.replace(/[^\d.]/g, "") })}
                        className="field mt-1 px-1 text-center disabled:opacity-40"
                        placeholder="—"
                      />
                    </label>
                  ))}
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={later} onChange={(e) => setLater(e.target.checked)} className="h-4 w-4 accent-berry" />
                  I&apos;ll send my sizes on WhatsApp after ordering
                </label>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center gap-3">
          <div className="flex items-center rounded-full border border-line bg-white">
            <button className="p-3.5" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">
              <MinusIcon width={16} height={16} />
            </button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <button className="p-3.5" onClick={() => setQty(Math.min(10, qty + 1))} aria-label="Increase quantity">
              <PlusIcon width={16} height={16} />
            </button>
          </div>
          <button className="btn-primary flex-1 py-4" disabled={soldOut} onClick={() => submit(false)}>
            {soldOut ? "Sold out" : added ? (<><CheckIcon width={18} height={18} /> Added to bag</>) : `Add to bag · ${inr(unit * qty)}`}
          </button>
        </div>
        {!soldOut && (
          <button className="btn-berry mt-3 w-full py-4" onClick={() => submit(true)}>
            Buy now
          </button>
        )}
        {soldOut && p.madeToMeasure && <p className="mt-3 text-sm text-muted">Standard sizes are sold out, but you can still order this set made to measure.</p>}
        {lowStock && <p className="mt-3 text-sm font-semibold text-berry">Only {p.stock} left in standard sizes</p>}
        {error && <p className="mt-3 rounded-xl bg-blush px-4 py-3 text-sm text-berry-dark">{error}</p>}

        {hasOptions && (
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {["24 nails in 12 sizes", "Free prep kit inside", "Reusable 3–5 times", "Glue or tab application"].map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3">
                <CheckIcon className="text-berry" width={16} height={16} /> {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OptionGroup({ label, value, help, children }: { label: string; value: string; help?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <p>
          <span className="font-bold">{label}:</span> <span className="text-muted">{value}</span>
        </p>
        {help}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
