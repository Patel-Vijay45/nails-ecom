"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProductView } from "@/lib/catalog";
import { PATTERN_LABEL, SIZES } from "@/lib/constants";
import { swatch } from "@/lib/colors";
import { inr } from "@/lib/format";
import { formatSizes, SEND_LATER } from "@/lib/sizes";
import { useCart } from "../cart/CartProvider";
import { CheckIcon, MinusIcon, PlusIcon, RulerIcon } from "../Icons";
import NailArt from "../NailArt";
import SizePicker, { EMPTY_SIZES, LOCAL_KEY, readSizes, type SizeState } from "./SizePicker";

const SIZE_HELP: Record<string, string> = {
  XS: "Thumb 14mm · Index 10mm",
  S: "Thumb 15mm · Index 11mm",
  M: "Thumb 16mm · Index 12mm",
  L: "Thumb 18mm · Index 13mm",
};

export default function ProductConfigurator({ p, tipWidths }: { p: ProductView; tipWidths: number[] }) {
  const { add } = useCart();
  const router = useRouter();
  const hasOptions = p.shapes.length > 0;
  const [shape, setShape] = useState(p.shapes[0] ?? "");
  const [length, setLength] = useState(p.lengths.includes("Medium") ? "Medium" : (p.lengths[0] ?? ""));
  const [color, setColor] = useState(p.colors[0]?.name ?? "");
  const [size, setSize] = useState<string>(hasOptions ? "M" : "");
  const [sizes, setSizes] = useState<SizeState>(EMPTY_SIZES);
  const [qty, setQty] = useState(1);
  // Show the first real photo if there is one; switch to the live preview when options change.
  const [view, setView] = useState<number>(p.images.length ? 0 : -1); // -1 = live preview, else photo index
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setView(-1);
  }, [shape, length, color]);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const custom = size === "Custom";
  const colorOpt = p.colors.find((c) => c.name === color);
  const palette = colorOpt?.palette ?? p.palette;
  const unit = p.price + (colorOpt?.extra ?? 0) + (custom ? p.madeToMeasureFee : 0);
  const soldOut = p.stock <= 0 && !custom;
  const lowStock = !custom && p.stock > 0 && p.stock <= 5;

  function submit(goCheckout: boolean) {
    setError("");
    const chosen = custom && !sizes.later ? readSizes(sizes) : null;
    if (custom && !sizes.later && !chosen) {
      setError("Choose a size for every finger, or tick 'I'll send my sizes on WhatsApp'.");
      return;
    }
    if (chosen) {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(chosen));
      } catch {}
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
      measurements: !custom ? "" : chosen ? formatSizes(chosen) : SEND_LATER,
      sizes: chosen ?? undefined,
      scans: chosen && sizes.scans.length ? sizes.scans : undefined,
      color,
      palette,
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
              <NailArt palette={palette} pattern={p.pattern} shape={shape || "Almond"} length={length || "Medium"} seed={p.slug} className="relative w-[82%] transition-all duration-500" />
              {hasOptions && (
                <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  Live preview · {[color, shape, length].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          )}
        </div>
        {p.images.length > 0 && (
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {p.images.map((src, i) => (
              <button key={src} onClick={() => setView(i)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 ${view === i ? "border-ink" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            <button onClick={() => setView(-1)} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-shell ${view === -1 ? "border-ink" : "border-transparent"}`} aria-label="Live preview of your choices">
              <NailArt palette={palette} pattern={p.pattern} shape={shape || "Almond"} length={length || "Medium"} seed={p.slug} className="w-full" />
              <span className="absolute inset-x-0 bottom-0 bg-white/85 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">Preview</span>
            </button>
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

        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">
          {p.nailType} · {PATTERN_LABEL[p.pattern] ?? p.pattern}
        </p>

        {p.colors.length > 0 && (
          <div className="mt-8">
            <OptionGroup label="Colour" value={colorOpt ? `${colorOpt.name}${colorOpt.extra ? ` (+${inr(colorOpt.extra)})` : ""}` : ""}>
              {p.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  title={`${c.name}${c.extra ? ` +${inr(c.extra)}` : ""}`}
                  aria-label={`Colour ${c.name}`}
                  aria-pressed={color === c.name}
                  className={`grid h-11 w-11 place-items-center rounded-full border-2 transition ${color === c.name ? "border-ink" : "border-transparent hover:border-line"}`}
                >
                  <span className="h-8 w-8 rounded-full border border-black/10" style={{ background: swatch(c) }} />
                </button>
              ))}
            </OptionGroup>
          </div>
        )}

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

            {custom && <SizePicker value={sizes} onChange={setSizes} tipWidths={tipWidths} />}
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
