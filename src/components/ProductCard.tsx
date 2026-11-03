import Link from "next/link";
import type { ProductView } from "@/lib/catalog";
import { swatch } from "@/lib/colors";
import { inr } from "@/lib/format";
import NailArt from "./NailArt";
import QuickAdd from "./product/QuickAdd";

const TINTS = ["#F3E4DA", "#EFE3EE", "#F6DEDA", "#E5ECE4", "#F1E8D8", "#E7E4F2"];

export default function ProductCard({ p: product, index = 0, rating, preferFamily }: { p: ProductView; index?: number; rating?: { avg: number; count: number }; preferFamily?: string }) {
  // When shopping by colour, show the matching colour first.
  const p = preferFamily
    ? { ...product, colors: [...product.colors].sort((a, b) => Number(b.family === preferFamily) - Number(a.family === preferFamily)) }
    : product;
  const img = p.images[0];
  const off = p.compareAtPrice && p.compareAtPrice > p.price ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0;
  const soldOut = p.stock <= 0 && !p.madeToMeasure;
  const madeToOrderOnly = p.stock <= 0 && p.madeToMeasure;
  const palette = p.colors[0]?.palette ?? p.palette;
  return (
    <div className="group relative">
      <Link href={`/product/${p.slug}`} className="block">
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-[28px] transition duration-500 group-hover:shadow-xl group-hover:shadow-berry/10"
          style={{ background: TINTS[index % TINTS.length] }}
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={p.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className="absolute h-2/3 w-2/3 rounded-full bg-white/50 blur-2xl" />
              <NailArt
                palette={palette}
                pattern={p.pattern}
                shape={p.shapes[0] ?? "Almond"}
                seed={p.slug}
                className="relative w-[78%] transition duration-700 group-hover:-translate-y-2 group-hover:scale-[1.04]"
              />
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {p.badge && <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink backdrop-blur">{p.badge}</span>}
            {off > 0 && <span className="rounded-full bg-berry px-3 py-1 text-[11px] font-bold text-white">−{off}%</span>}
          </div>
          {soldOut && <span className="absolute inset-x-3 bottom-3 rounded-full bg-ink/80 py-2 text-center text-xs font-semibold text-white">Sold out</span>}
          {madeToOrderOnly && <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-2 text-[11px] font-semibold">Made to measure only</span>}
        </div>
        <div className="mt-4 flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {p.nailType}
              {rating && rating.count > 0 && (
                <>
                  {" "}· <span className="text-gold">★</span> {rating.avg.toFixed(1)} ({rating.count})
                </>
              )}
            </p>
            {p.colors.length > 1 && (
              <div className="mt-2 flex items-center gap-1" aria-label={`${p.colors.length} colours`}>
                {p.colors.slice(0, 5).map((c) => (
                  <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: swatch(c) }} />
                ))}
                {p.colors.length > 5 && <span className="text-[11px] text-muted">+{p.colors.length - 5}</span>}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold">{inr(p.price)}</p>
            {off > 0 && <p className="text-xs text-muted line-through">{inr(p.compareAtPrice!)}</p>}
          </div>
        </div>
      </Link>
      {/* Sits over the image, outside the link so it doesn't open the product page */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5]">
        <div className="pointer-events-auto">
          <QuickAdd p={p} />
        </div>
      </div>
    </div>
  );
}
