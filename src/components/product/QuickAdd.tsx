"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductView } from "@/lib/catalog";
import { swatch } from "@/lib/colors";
import { SIZES } from "@/lib/constants";
import { inr } from "@/lib/format";
import { useCart } from "../cart/CartProvider";
import { BagIcon, CloseIcon, RulerIcon } from "../Icons";
import NailArt from "../NailArt";

/** "Add" button on product cards. Simple items go straight into the bag; sets open a quick options sheet. */
export default function QuickAdd({ p }: { p: ProductView }) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const hasOptions = p.shapes.length > 0;
  const simple = !hasOptions && p.colors.length === 0;
  const soldOut = p.stock <= 0;

  function addSimple() {
    add({ productId: p.id, slug: p.slug, name: p.name, price: p.price, quantity: 1, shape: "", length: "", size: "", color: "", measurements: "", palette: p.palette, pattern: p.pattern, image: p.images[0] });
  }

  if (soldOut) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (simple ? addSimple() : setOpen(true))}
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2.5 text-xs font-semibold text-cream shadow-lg transition hover:bg-berry active:scale-95"
        aria-label={`Add ${p.name} to bag`}
      >
        <BagIcon width={15} height={15} /> Add
      </button>
      {open && <QuickSheet p={p} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickSheet({ p, onClose }: { p: ProductView; onClose: () => void }) {
  const { add } = useCart();
  const hasOptions = p.shapes.length > 0;
  const [color, setColor] = useState(p.colors[0]?.name ?? "");
  const [shape, setShape] = useState(p.shapes[0] ?? "");
  const [length, setLength] = useState(p.lengths.includes("Medium") ? "Medium" : (p.lengths[0] ?? ""));
  const [size, setSize] = useState(hasOptions ? "M" : "");
  const colorOpt = p.colors.find((c) => c.name === color);
  const palette = colorOpt?.palette ?? p.palette;
  const unit = p.price + (colorOpt?.extra ?? 0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function submit() {
    add({ productId: p.id, slug: p.slug, name: p.name, price: unit, quantity: 1, shape, length, size, color, measurements: "", palette, pattern: p.pattern, image: p.images[0] });
    onClose();
  }

  const chips = (label: string, items: string[], value: string, set: (v: string) => void) => (
    <div>
      <p className="mb-2 text-sm">
        <b>{label}:</b> <span className="text-muted">{value}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((v) => (
          <button key={v} type="button" className="chip px-3 py-1.5 text-xs" data-active={value === v} onClick={() => set(v)}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-label={`Choose options for ${p.name}`} onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-cream p-5 shadow-2xl sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4">
          <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-white to-blush">
            <NailArt palette={palette} pattern={p.pattern} shape={shape || "Almond"} length={length || "Medium"} seed={p.slug} className="w-24" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="display text-2xl leading-tight">{p.name}</p>
              <button type="button" onClick={onClose} className="btn-ghost -mr-2 -mt-1 rounded-full p-2" aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <p className="mt-1 text-xl font-bold">{inr(unit)}</p>
            <Link href={`/product/${p.slug}`} className="mt-1 inline-block text-xs font-semibold text-berry underline">
              See full details
            </Link>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {p.colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm">
                <b>Colour:</b> <span className="text-muted">{color}{colorOpt?.extra ? ` (+${inr(colorOpt.extra)})` : ""}</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {p.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    aria-label={`Colour ${c.name}`}
                    aria-pressed={color === c.name}
                    className={`grid h-10 w-10 place-items-center rounded-full border-2 ${color === c.name ? "border-ink" : "border-transparent"}`}
                  >
                    <span className="h-7 w-7 rounded-full border border-black/10" style={{ background: swatch(c) }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {hasOptions && chips("Shape", p.shapes, shape, setShape)}
          {hasOptions && p.lengths.length > 0 && chips("Length", p.lengths, length, setLength)}
          {hasOptions && chips("Size", [...SIZES], size, setSize)}
          {hasOptions && p.madeToMeasure && (
            <Link href={`/product/${p.slug}`} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold">
              <RulerIcon width={16} height={16} className="text-berry" /> Need an exact fit? Choose made to measure on the full page →
            </Link>
          )}
        </div>

        <button type="button" onClick={submit} className="btn-primary mt-6 w-full py-4">
          Add to bag · {inr(unit)}
        </button>
      </div>
    </div>
  );
}
