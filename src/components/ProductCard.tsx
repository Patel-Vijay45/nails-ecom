import Link from "next/link";
import type { ProductView } from "@/lib/catalog";
import { inr } from "@/lib/format";
import NailArt from "./NailArt";

const TINTS = ["#F3E4DA", "#EFE3EE", "#F6DEDA", "#E5ECE4", "#F1E8D8", "#E7E4F2"];

export default function ProductCard({ p, index = 0, rating }: { p: ProductView; index?: number; rating?: { avg: number; count: number } }) {
  const img = p.images[0];
  const off = p.compareAtPrice && p.compareAtPrice > p.price ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0;
  const soldOut = p.stock <= 0 && !p.madeToMeasure;
  return (
    <Link href={`/product/${p.slug}`} className="group block">
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
              palette={p.palette}
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
        <span className="absolute bottom-3 right-3 translate-y-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          View set →
        </span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate font-semibold">{p.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {p.collection?.name}
            {rating && rating.count > 0 && (
              <>
                {" "}· <span className="text-gold">★</span> {rating.avg.toFixed(1)} ({rating.count})
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold">{inr(p.price)}</p>
          {off > 0 && <p className="text-xs text-muted line-through">{inr(p.compareAtPrice!)}</p>}
        </div>
      </div>
    </Link>
  );
}
