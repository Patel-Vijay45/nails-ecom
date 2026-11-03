import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import ProductCard from "@/components/ProductCard";
import RichTitle from "@/components/RichTitle";
import { toView } from "@/lib/catalog";
import { ALL_SHAPES } from "@/lib/constants";
import { db } from "@/lib/db";
import { getRatings } from "@/lib/ratings";

export const metadata: Metadata = { title: "Shop all designs" };

type SP = Promise<{ collection?: string; sort?: string; shape?: string; q?: string }>;

const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }> = {
  featured: { label: "Featured", orderBy: { sortOrder: "asc" } },
  new: { label: "Newest", orderBy: { createdAt: "desc" } },
  "price-asc": { label: "Price: low to high", orderBy: { price: "asc" } },
  "price-desc": { label: "Price: high to low", orderBy: { price: "desc" } },
};

export default async function Shop({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const sort = SORTS[sp.sort ?? ""] ? sp.sort! : "featured";
  const collections = await db.collection.findMany({ orderBy: { sortOrder: "asc" } });
  const active = collections.find((c) => c.slug === sp.collection);

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(active ? { collectionId: active.id } : { isAddon: false }),
    ...(sp.shape ? { shapes: { contains: `"${sp.shape}"` } } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { description: { contains: sp.q } }] } : {}),
  };
  const [products, ratings] = await Promise.all([
    db.product.findMany({ where, include: { collection: true }, orderBy: SORTS[sort].orderBy }),
    getRatings(),
  ]);

  const qs = (patch: Record<string, string | undefined>) => {
    const next = { collection: sp.collection, sort: sp.sort, shape: sp.shape, q: sp.q, ...patch };
    const s = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="container-x pt-10">
      <div className="max-w-2xl">
        <p className="eyebrow">{active ? "Collection" : "Shop"}</p>
        <h1 className="display mt-3 text-5xl md:text-6xl">
          <RichTitle text={active ? active.name : "All *designs*"} />
        </h1>
        <p className="mt-4 text-muted">{active ? active.description : "Every set is hand-painted to order or from small batches. Pick a design, then choose your shape, length and size."}</p>
      </div>

      <div className="sticky top-16 z-20 -mx-4 mt-10 border-y border-line bg-cream/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-20">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            <Link href={qs({ collection: undefined })} className="chip shrink-0" data-active={!active}>
              All
            </Link>
            {collections.map((c) => (
              <Link key={c.id} href={qs({ collection: c.slug })} className="chip shrink-0" data-active={active?.id === c.id}>
                {c.name}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <form action="/shop" className="hidden sm:block">
              {sp.collection && <input type="hidden" name="collection" value={sp.collection} />}
              <input name="q" defaultValue={sp.q} placeholder="Search designs…" className="field w-44 rounded-full py-2" />
            </form>
            <details className="relative">
              <summary className="chip list-none">Shape{sp.shape ? `: ${sp.shape}` : ""} ▾</summary>
              <div className="absolute right-0 z-30 mt-2 w-44 rounded-2xl border border-line bg-white p-2 shadow-xl">
                <Link href={qs({ shape: undefined })} className="block rounded-xl px-3 py-2 text-sm hover:bg-shell">
                  Any shape
                </Link>
                {ALL_SHAPES.map((s) => (
                  <Link key={s} href={qs({ shape: s })} className="block rounded-xl px-3 py-2 text-sm hover:bg-shell">
                    {s}
                  </Link>
                ))}
              </div>
            </details>
            <details className="relative">
              <summary className="chip list-none">{SORTS[sort].label} ▾</summary>
              <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-line bg-white p-2 shadow-xl">
                {Object.entries(SORTS).map(([k, v]) => (
                  <Link key={k} href={qs({ sort: k === "featured" ? undefined : k })} className="block rounded-xl px-3 py-2 text-sm hover:bg-shell">
                    {v.label}
                  </Link>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted">
        {products.length} {products.length === 1 ? "design" : "designs"}
        {sp.q && <> for &ldquo;{sp.q}&rdquo;</>}
      </p>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-3xl">Nothing here yet</p>
          <p className="mt-2 text-muted">Try another filter, or ask us for a custom design.</p>
          <Link href="/custom" className="btn-primary mt-6">
            Request a custom set
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} p={toView(p)} index={i} rating={ratings[p.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
