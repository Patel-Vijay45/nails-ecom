import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReviewForm from "@/components/forms/ReviewForm";
import { StarIcon } from "@/components/Icons";
import ProductCard from "@/components/ProductCard";
import ProductConfigurator from "@/components/product/ProductConfigurator";
import { toView } from "@/lib/catalog";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getRatings } from "@/lib/ratings";
import { parseTipWidths } from "@/lib/sizes";
import { getStore } from "@/lib/store";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.product.findUnique({ where: { slug } });
  return p ? { title: p.name, description: p.description } : {};
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, include: { collection: true } });
  if (!product || !product.active) notFound();

  const [store, reviews, related, ratings] = await Promise.all([
    getStore(),
    db.review.findMany({ where: { productId: product.id, approved: true }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({
      where: { active: true, isAddon: false, id: { not: product.id }, collectionId: product.collectionId ?? undefined },
      include: { collection: true },
      orderBy: { sortOrder: "asc" },
      take: 4,
    }),
    getRatings(),
  ]);
  const p = toView(product);
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  return (
    <div className="container-x pt-8">
      <nav className="mb-6 text-xs text-muted">
        <a href="/shop" className="hover:text-ink">Shop</a>
        {p.collection && (
          <>
            {" / "}
            <a href={`/shop?collection=${p.collection.slug}`} className="hover:text-ink">{p.collection.name}</a>
          </>
        )}
        {" / "}
        <span className="text-ink">{p.name}</span>
      </nav>

      <ProductConfigurator p={p} tipWidths={parseTipWidths(store.tipWidths)} photoScale={{ fingers: store.photoScale, thumb: store.thumbScale }} />

      <section className="mt-20 grid gap-6 md:grid-cols-3">
        {[
          ["Delivery", `${store.dispatchDays}. Delivered in 2–5 days after dispatch, with tracking on WhatsApp.`],
          ["How to apply", "Clean and buff your nails, swipe the prep pad, then press each nail on with glue for 10 seconds, or use the tabs for short wear."],
          ["Care & reuse", "Soak in warm soapy water with cuticle oil for 10 minutes, lift gently, and store them back in the box to wear again."],
        ].map(([t, d]) => (
          <div key={t} className="card p-6">
            <p className="font-bold">{t}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </section>

      <section className="mt-20" id="reviews">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Reviews</p>
            <h2 className="display mt-2 text-4xl">
              {reviews.length ? (
                <span className="flex items-center gap-3">
                  {avg.toFixed(1)} <StarIcon className="text-gold" width={30} height={30} />
                  <span className="text-lg font-normal text-muted">({reviews.length})</span>
                </span>
              ) : (
                "No reviews yet"
              )}
            </h2>
          </div>
          <ReviewForm productId={p.id} />
        </div>
        {reviews.length > 0 && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex text-gold">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <StarIcon key={i} width={14} height={14} />
                    ))}
                  </div>
                  <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
                </div>
                <p className="mt-3 leading-relaxed">{r.text}</p>
                <p className="mt-3 text-sm font-semibold">
                  {r.name}
                  {r.city && <span className="font-normal text-muted">, {r.city}</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <p className="eyebrow">You may also love</p>
          <h2 className="display mt-2 text-4xl">More from {p.collection?.name ?? "the studio"}</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
            {related.map((r, i) => (
              <ProductCard key={r.id} p={toView(r)} index={i + 1} rating={ratings[r.id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
