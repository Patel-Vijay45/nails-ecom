import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import ProductCard from "@/components/ProductCard";
import RichTitle from "@/components/RichTitle";
import { toView } from "@/lib/catalog";
import { ALL_LENGTHS, ALL_SHAPES, COLOR_FAMILIES, NAIL_TYPES, PATTERN_LABEL, PATTERNS } from "@/lib/constants";
import { db } from "@/lib/db";
import { getRatings } from "@/lib/ratings";

export const metadata: Metadata = { title: "Shop all designs" };

type Filters = { collection?: string; sort?: string; shape?: string; length?: string; type?: string; finish?: string; color?: string; q?: string };

const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }> = {
  featured: { label: "Featured", orderBy: { sortOrder: "asc" } },
  new: { label: "Newest", orderBy: { createdAt: "desc" } },
  "price-asc": { label: "Price: low to high", orderBy: { price: "asc" } },
  "price-desc": { label: "Price: high to low", orderBy: { price: "desc" } },
};

const pick = (v: string | undefined, list: readonly string[]) => (v && list.includes(v) ? v : undefined);

export default async function Shop({ searchParams }: { searchParams: Promise<Filters> }) {
  const raw = await searchParams;
  const sp: Filters = {
    collection: raw.collection,
    sort: SORTS[raw.sort ?? ""] ? raw.sort : undefined,
    shape: pick(raw.shape, ALL_SHAPES),
    length: pick(raw.length, ALL_LENGTHS),
    type: pick(raw.type, NAIL_TYPES),
    finish: pick(raw.finish, PATTERNS),
    color: pick(raw.color, Object.keys(COLOR_FAMILIES)),
    q: raw.q?.trim() || undefined,
  };
  const sort = sp.sort ?? "featured";
  const collections = await db.collection.findMany({ orderBy: { sortOrder: "asc" } });
  const active = collections.find((c) => c.slug === sp.collection);

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(active ? { collectionId: active.id } : sp.type ? {} : { isAddon: false }),
    ...(sp.shape ? { shapes: { contains: `"${sp.shape}"` } } : {}),
    ...(sp.length ? { lengths: { contains: `"${sp.length}"` } } : {}),
    ...(sp.type ? { nailType: sp.type } : {}),
    ...(sp.finish ? { pattern: sp.finish } : {}),
    ...(sp.color ? { colors: { contains: `"family":"${sp.color}"` } } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { description: { contains: sp.q } }] } : {}),
  };
  const [products, ratings] = await Promise.all([
    db.product.findMany({ where, include: { collection: true }, orderBy: SORTS[sort].orderBy }),
    getRatings(),
  ]);

  const qs = (patch: Partial<Filters>) => {
    const next = { ...sp, ...patch };
    const s = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const anyFilter = Boolean(sp.shape || sp.length || sp.type || sp.finish || sp.color || sp.q);

  const Menu = ({ label, value, k, options }: { label: string; value?: string; k: keyof Filters; options: [string, string][] }) => (
    <details className="relative">
      <summary className="chip list-none whitespace-nowrap" data-active={Boolean(value)}>
        {label}
        {value ? `: ${options.find(([v]) => v === value)?.[1] ?? value}` : ""} ▾
      </summary>
      <div className="absolute left-0 z-30 mt-2 max-h-80 w-52 overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-xl sm:left-auto sm:right-0">
        <Link href={qs({ [k]: undefined })} className="block rounded-xl px-3 py-2 text-sm text-muted hover:bg-shell">
          Any
        </Link>
        {options.map(([v, l]) => (
          <Link key={v} href={qs({ [k]: v })} className={`block rounded-xl px-3 py-2 text-sm hover:bg-shell ${value === v ? "font-bold" : ""}`}>
            {l}
          </Link>
        ))}
      </div>
    </details>
  );

  return (
    <div className="container-x pt-10">
      <div className="max-w-2xl">
        <p className="eyebrow">{active ? "Collection" : "Shop"}</p>
        <h1 className="display mt-3 text-5xl md:text-6xl">
          <RichTitle text={active ? active.name : "All *designs*"} />
        </h1>
        <p className="mt-4 text-muted">{active ? active.description : "Every set is hand-painted to order or from small batches. Pick a design, then choose your colour, shape, length and size."}</p>
      </div>

      <div className="sticky top-16 z-20 -mx-4 mt-10 space-y-3 border-y border-line bg-cream/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-20">
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
        <div className="flex flex-wrap items-center gap-2">
          <Menu label="Type" value={sp.type} k="type" options={NAIL_TYPES.map((t) => [t, t])} />
          <Menu label="Shape" value={sp.shape} k="shape" options={ALL_SHAPES.map((t) => [t, t])} />
          <Menu label="Length" value={sp.length} k="length" options={ALL_LENGTHS.map((t) => [t, t])} />
          <Menu label="Finish" value={sp.finish} k="finish" options={PATTERNS.map((t) => [t, PATTERN_LABEL[t] ?? t])} />
          <details className="relative">
            <summary className="chip list-none whitespace-nowrap" data-active={Boolean(sp.color)}>
              Colour{sp.color ? `: ${sp.color}` : ""} ▾
            </summary>
            <div className="absolute left-0 z-30 mt-2 grid w-64 grid-cols-2 gap-1 rounded-2xl border border-line bg-white p-2 shadow-xl sm:left-auto sm:right-0">
              <Link href={qs({ color: undefined })} className="col-span-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-shell">
                Any colour
              </Link>
              {Object.entries(COLOR_FAMILIES).map(([name, bg]) => (
                <Link key={name} href={qs({ color: name })} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-shell ${sp.color === name ? "font-bold" : ""}`}>
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: bg }} /> {name}
                </Link>
              ))}
            </div>
          </details>
          <Menu label="Sort" value={sp.sort} k="sort" options={Object.entries(SORTS).filter(([k]) => k !== "featured").map(([k, v]) => [k, v.label])} />
          <form action="/shop" className="ml-auto hidden sm:block">
            {Object.entries(sp).map(([k, v]) => (v && k !== "q" ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <input name="q" defaultValue={sp.q} placeholder="Search designs…" className="field w-44 rounded-full py-2" />
          </form>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>
          {products.length} {products.length === 1 ? "design" : "designs"}
          {sp.q && <> for &ldquo;{sp.q}&rdquo;</>}
        </span>
        {anyFilter && (
          <Link href={qs({ shape: undefined, length: undefined, type: undefined, finish: undefined, color: undefined, q: undefined })} className="font-semibold text-berry underline">
            Clear filters
          </Link>
        )}
      </div>

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
            <ProductCard key={p.id} p={toView(p)} index={i} rating={ratings[p.id]} preferFamily={sp.color} />
          ))}
        </div>
      )}
    </div>
  );
}
