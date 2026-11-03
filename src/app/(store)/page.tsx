import Link from "next/link";
import { ArrowRight, BrushIcon, ClockIcon, HeartIcon, RulerIcon, SparkleIcon, StarIcon, TruckIcon } from "@/components/Icons";
import NailArt from "@/components/NailArt";
import ProductCard from "@/components/ProductCard";
import RichTitle from "@/components/RichTitle";
import { toView } from "@/lib/catalog";
import { parseColors } from "@/lib/colors";
import { db } from "@/lib/db";
import { inr, parseList } from "@/lib/format";
import { getRatings } from "@/lib/ratings";
import { getStore } from "@/lib/store";

export default async function Home() {
  const [store, featured, collections, reviews, ratings, sizingKit, agg] = await Promise.all([
    getStore(),
    db.product.findMany({ where: { active: true, featured: true, isAddon: false }, include: { collection: true }, orderBy: { sortOrder: "asc" }, take: 8 }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { products: { where: { active: true, isAddon: false }, orderBy: { sortOrder: "asc" }, take: 1 } } }),
    db.review.findMany({ where: { approved: true }, include: { product: true }, orderBy: { createdAt: "desc" }, take: 9 }),
    getRatings(),
    db.product.findUnique({ where: { slug: "sizing-kit" } }),
    db.review.aggregate({ where: { approved: true }, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  // Hero shows the three boldest featured designs (darkest main colour first) so they stand out on the light background.
  const lum = (hex: string) => {
    const n = parseInt((hex || "#ffffff").slice(1, 7), 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  };
  const heroSets = featured
    .map(toView)
    .sort((a, b) => lum((a.colors[0]?.palette ?? a.palette)[0]) - lum((b.colors[0]?.palette ?? b.palette)[0]))
    .slice(0, 3);
  const avg = agg._avg.rating ?? 5;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-blush/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#efe3ee] blur-3xl" />
        <div className="container-x relative grid items-center gap-12 pb-16 pt-10 md:grid-cols-2 md:pb-24 md:pt-16">
          <div className="animate-fade-up">
            <p className="eyebrow flex items-center gap-2">
              <SparkleIcon width={14} height={14} /> Hand-painted by {store.artistName}
            </p>
            <h1 className="display mt-5 text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              <RichTitle text={store.heroTitle} />
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted md:text-lg">{store.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-primary px-8 py-4">
                Shop the collection <ArrowRight width={16} height={16} />
              </Link>
              <Link href="/custom" className="btn-outline px-8 py-4">
                Design a custom set
              </Link>
            </div>
            {agg._count._all > 0 && (
              <div className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {["#E6C3B3", "#C9B6E4", "#8E1B2E", "#A9BFA8"].map((c) => (
                    <span key={c} className="h-10 w-10 rounded-full border-2 border-cream" style={{ background: c }} />
                  ))}
                </div>
                <div className="text-sm">
                  <p className="flex items-center gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} width={14} height={14} />
                    ))}
                    <b className="ml-1 text-ink">{avg.toFixed(1)}</b>
                  </p>
                  <p className="text-muted">from {agg._count._all} customer reviews</p>
                </div>
              </div>
            )}
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[560px]">
            <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-white via-blush to-[#e9d3dc] shadow-[inset_0_-30px_60px_rgba(142,44,72,0.12)]" />
            <div className="absolute inset-[8%] rounded-full grain opacity-40" />
            {heroSets[0] && (
              <HeroCard p={heroSets[0]} className="left-[20%] top-[8%] w-[60%] animate-float" rotate="-4deg" big />
            )}
            {heroSets[1] && <HeroCard p={heroSets[1]} className="-left-4 bottom-[2%] w-[38%] animate-float-slow" rotate="-10deg" />}
            {heroSets[2] && <HeroCard p={heroSets[2]} className="-right-4 top-[52%] w-[36%] animate-float" rotate="9deg" />}
            <div className="absolute right-[6%] top-[4%] rotate-6 rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-widest text-cream shadow-lg">
              ✦ Made to your size
            </div>
          </div>
        </div>

        <div className="container-x relative">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-4">
            {[
              [BrushIcon, "Hand-painted", "By a professional nail artist"],
              [RulerIcon, "Your exact size", "Standard or made to measure"],
              [ClockIcon, "On in 10 minutes", "No salon visit, no drill"],
              [TruckIcon, "Fast shipping", `Free above ${inr(store.freeShippingAbove)}`],
            ].map(([Icon, t, s]) => {
              const I = Icon as typeof BrushIcon;
              return (
                <div key={t as string} className="flex flex-col items-start gap-3 bg-white/80 p-4 sm:flex-row sm:items-center md:p-6">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blush text-berry sm:h-11 sm:w-11">
                    <I />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{t as string}</p>
                    <p className="text-xs text-muted">{s as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="mt-20 overflow-hidden border-y border-line bg-white py-6">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["Almond", "Chrome", "French tips", "Bridal", "Glitter", "Coffin", "Ombre", "Marble", "Festive"].map((w, i) => (
              <span key={`${k}-${i}`} className="display flex items-center gap-10 text-4xl italic text-ink/80 md:text-5xl">
                {w} <span className="not-italic text-gold">✦</span>
              </span>
            )),
          )}
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="container-x mt-24">
        <SectionHead eyebrow="Shop by mood" title="Find your *set*" href="/shop" cta="View all designs" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((c, i) => {
            const first = c.products[0];
            return (
              <Link
                key={c.id}
                href={`/shop?collection=${c.slug}`}
                className={`group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[32px] p-6 transition duration-500 hover:-translate-y-1 ${i === 0 ? "lg:row-span-1" : ""}`}
                style={{ background: c.tint }}
              >
                <div>
                  <p className="display text-3xl">{c.name}</p>
                  <p className="mt-2 max-w-[24ch] text-sm text-ink/70">{c.description}</p>
                </div>
                {first && (
                  <NailArt
                    palette={parseColors(first.colors)[0]?.palette ?? parseList(first.palette)}
                    pattern={first.pattern}
                    shape={parseList(first.shapes)[0] ?? "Square"}
                    seed={first.slug}
                    className="mx-auto -mb-10 w-[85%] transition duration-700 group-hover:-translate-y-3 group-hover:rotate-[-3deg]"
                  />
                )}
                <span className="absolute bottom-5 right-5 grid h-11 w-11 place-items-center rounded-full bg-ink text-cream transition group-hover:bg-berry">
                  <ArrowRight width={18} height={18} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="container-x mt-28">
        <SectionHead eyebrow="Loved right now" title="Our *bestsellers*" href="/shop" cta="Shop all" />
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
          {featured.map((p, i) => (
            <ProductCard key={p.id} p={toView(p)} index={i} rating={ratings[p.id]} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-x mt-28">
        <div className="rounded-[40px] bg-white p-6 sm:p-10 md:p-16">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">
              <RichTitle text="From our studio to your *fingertips*" />
            </h2>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              ["Pick a design", "Browse ready-made sets or ask for something completely custom."],
              ["Choose your fit", "Pick a standard size or send your measurements for a perfect fit."],
              ["We paint it by hand", `Painted layer by layer, cured and checked. ${store.dispatchDays}.`],
              ["Apply in 10 minutes", "Glue for up to 2 weeks or tabs for a weekend. Reuse them again and again."],
            ].map(([t, d], i) => (
              <li key={t} className="relative">
                <span className="display text-6xl italic text-blush">0{i + 1}</span>
                <p className="mt-2 text-lg font-bold">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SIZING KIT */}
      {sizingKit && sizingKit.active && (
        <section className="container-x mt-28">
          <div className="grid items-center gap-10 overflow-hidden rounded-[40px] bg-[#e3ede6] p-8 md:grid-cols-2 md:p-14">
            <div>
              <p className="eyebrow">New here?</p>
              <h2 className="display mt-3 text-4xl md:text-5xl">
                <RichTitle text="Start with the *sizing kit*" />
              </h2>
              <p className="mt-4 max-w-md text-muted">
                Try clear tips in every size at home and find your perfect fit before you order. The {inr(sizingKit.price)} comes back to you as a
                coupon on your first set.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/product/sizing-kit" className="btn-primary">
                  Get the sizing kit · {inr(sizingKit.price)}
                </Link>
                <Link href="/sizing-guide" className="btn-outline">
                  Read the sizing guide
                </Link>
              </div>
            </div>
            <div className="relative grid place-items-center">
              <div className="flex items-end gap-3">
                {[10, 12, 13, 14, 15, 16, 18].map((mm, i) => (
                  <div key={mm} className="flex flex-col items-center gap-2">
                    <div
                      className="rounded-t-full border border-white bg-white/70 shadow-sm backdrop-blur"
                      style={{ width: mm * 2.4, height: 60 + i * 9 }}
                    />
                    <span className="text-[10px] font-semibold text-ink/50">{mm}mm</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BRIDAL */}
      <section className="mt-28 bg-ink text-cream">
        <div className="container-x grid items-center gap-12 py-20 md:grid-cols-2 md:py-28">
          <div className="relative order-2 mx-auto w-full max-w-md md:order-1">
            <div className="absolute inset-0 rounded-full bg-berry/40 blur-3xl" />
            <NailArt palette={["#8E1B2E", "#D4AF6A"]} pattern="glitter" shape="Almond" length="Long" seed="bridal-hero" className="relative w-full" />
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Bridal & occasion</p>
            <h2 className="display mt-4 text-5xl leading-tight md:text-6xl">
              <RichTitle text="Your big day, *your* design." accent="text-gold" />
            </h2>
            <p className="mt-6 max-w-lg text-cream/70">
              Share your outfit, colours and inspiration. {store.artistName.charAt(0).toUpperCase() + store.artistName.slice(1)} will sketch a design
              for you, send it to you for approval, and hand-paint every nail to your exact size, for brides, bridesmaids and every function from
              mehendi to reception.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-cream/80">
              {["Free design consultation on WhatsApp", "You approve a photo before we ship", "Matching sets for your bridal party"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <HeartIcon className="text-gold" width={18} height={18} /> {t}
                </li>
              ))}
            </ul>
            <Link href="/custom" className="btn mt-10 bg-gold px-8 py-4 text-ink hover:bg-cream">
              Start a custom order <ArrowRight width={16} height={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section className="container-x mt-28">
          <SectionHead eyebrow="Kind words" title="Hands that *love* us" />
          <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6">
            {reviews.map((r) => (
              <figure key={r.id} className="card flex w-[300px] shrink-0 snap-start flex-col p-6 md:w-[360px]">
                <div className="flex gap-0.5 text-gold">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <StarIcon key={i} width={16} height={16} />
                  ))}
                </div>
                <blockquote className="display mt-4 flex-1 text-xl leading-snug">&ldquo;{r.text}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center justify-between text-sm">
                  <span>
                    <b>{r.name}</b>
                    {r.city && <span className="text-muted">, {r.city}</span>}
                  </span>
                  {r.product && (
                    <Link href={`/product/${r.product.slug}`} className="text-xs text-berry hover:underline">
                      {r.product.name}
                    </Link>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT */}
      <section className="container-x mt-28">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow">The artist</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">
              <RichTitle text="Made by hand, *never* by machine" />
            </h2>
          </div>
          <div className="md:col-span-7">
            <p className="text-lg leading-relaxed text-ink/80">{store.aboutText}</p>
            <Link href="/about" className="mt-6 inline-flex items-center gap-2 font-semibold text-berry hover:underline">
              Read our story <ArrowRight width={16} height={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-x mt-28">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">Questions</p>
            <h2 className="display mt-3 text-4xl">Good to know</h2>
          </div>
          <div className="divide-y divide-line border-y border-line md:col-span-8">
            {[
              ["How long do press-on nails last?", "With glue, 7–14 days. With adhesive tabs, 1–3 days, which is perfect for an event or a weekend. Removed gently, a set can be reused 3–5 times."],
              ["How do I know my size?", "Use our sizing guide with a tape measure, or order the sizing kit. Its price comes back as a coupon on your first set. Every standard set also includes extra sizes."],
              ["Do they damage natural nails?", "No, if you apply and remove them properly. Soak them in warm soapy water with cuticle oil and lift them gently. Never pull them off dry."],
              ["Can I pay cash on delivery?", store.codEnabled ? `Yes. COD is available across India for a small ${inr(store.codFee)} handling fee. UPI and card payments have no extra charge.` : "We currently accept UPI, cards and netbanking."],
              ["How long does delivery take?", `${store.dispatchDays}. Delivery usually takes 2–5 days after that, depending on your city.`],
            ].map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {q}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line transition group-open:rotate-45 group-open:bg-ink group-open:text-cream">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, href, cta }: { eyebrow: string; title: string; href?: string; cta?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display mt-3 text-4xl md:text-5xl">
          <RichTitle text={title} />
        </h2>
      </div>
      {href && cta && (
        <Link href={href} className="group inline-flex items-center gap-2 text-sm font-semibold">
          {cta}
          <span className="grid h-9 w-9 place-items-center rounded-full border border-ink/20 transition group-hover:bg-ink group-hover:text-cream">
            <ArrowRight width={16} height={16} />
          </span>
        </Link>
      )}
    </div>
  );
}

function HeroCard({ p, className, rotate, big }: { p: ReturnType<typeof toView>; className: string; rotate: string; big?: boolean }) {
  return (
    <Link
      href={`/product/${p.slug}`}
      className={`group absolute flex flex-col rounded-[28px] border border-white/70 bg-white/60 p-3 shadow-2xl shadow-berry/15 backdrop-blur-xl transition hover:scale-[1.03] ${className}`}
      style={{ ["--r" as string]: rotate, transform: `rotate(${rotate})` }}
    >
      <div className={`items-center justify-between px-2 ${big ? "order-first flex pb-3 pt-1" : "hidden pb-1 pt-3 sm:flex"}`}>
        <span className={`font-semibold ${big ? "text-base" : "text-xs"}`}>{p.name}</span>
        <span className={`font-bold text-berry ${big ? "text-base" : "text-xs"}`}>{inr(p.price)}</span>
      </div>
      <div className="rounded-[20px] bg-gradient-to-b from-white to-shell">
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} className="aspect-square w-full rounded-[20px] object-cover" />
        ) : (
          <NailArt palette={p.colors[0]?.palette ?? p.palette} pattern={p.pattern} shape={p.shapes[0] ?? "Almond"} seed={`${p.slug}-hero`} className="w-full p-2" />
        )}
      </div>

    </Link>
  );
}
