// Fills the database with starter collections, designs, reviews and coupons.
// Run with: npm run db:seed  (safe to run again; it updates by slug/code)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const j = (v: unknown) => JSON.stringify(v);

const collections = [
  { slug: "everyday", name: "Everyday", description: "Nudes, French tips and soft colours for work, college and every day in between.", tint: "#F3E4DA", sortOrder: 1 },
  { slug: "glam", name: "Glam & Party", description: "Chrome, glitter and 3D details for nights out, birthdays and parties.", tint: "#E9DDF0", sortOrder: 2 },
  { slug: "bridal-festive", name: "Bridal & Festive", description: "Rich reds, golds and hand-painted details for weddings, Diwali and Karwa Chauth.", tint: "#F6D9D4", sortOrder: 3 },
  { slug: "essentials", name: "Essentials", description: "Sizing kit, glue, tabs and everything you need for a perfect fit.", tint: "#E3EDE6", sortOrder: 4 },
];

type P = {
  slug: string; name: string; c: string; price: number; compare?: number; palette: string[]; pattern: string;
  desc: string; featured?: boolean; badge?: string; stock?: number; addon?: boolean; mtm?: boolean;
  shapes?: string[]; lengths?: string[]; fee?: number;
};

const products: P[] = [
  { slug: "milk-bath-french", name: "Milk Bath French", c: "everyday", price: 699, compare: 899, palette: ["#F7EEE8", "#FFFFFF"], pattern: "french", featured: true, badge: "Bestseller", desc: "A soft milky base with a crisp white French tip. Goes with everything, from office to weddings." },
  { slug: "rose-latte", name: "Rose Latte", c: "everyday", price: 649, palette: ["#D9A5A0", "#F2D6CF"], pattern: "ombre", featured: true, desc: "A warm rose-to-nude ombre that looks like your nails, only better." },
  { slug: "barely-there-nude", name: "Barely There Nude", c: "everyday", price: 549, palette: ["#E6C3B3", "#F5E1D6"], pattern: "solid", desc: "Glossy skin-tone nude. Our go-to for interviews, exams and long work weeks." },
  { slug: "sage-polka", name: "Sage Polka", c: "everyday", price: 749, palette: ["#A9BFA8", "#FFFFFF"], pattern: "dots", featured: true, badge: "New", desc: "Muted sage green with tiny hand-dotted white polka dots." },
  { slug: "chrome-glazed-donut", name: "Glazed Donut Chrome", c: "glam", price: 999, compare: 1199, palette: ["#F4E9E4", "#D9D2EC"], pattern: "chrome", featured: true, badge: "Trending", desc: "The pearly chrome glaze everyone is asking for, buffed by hand on every nail." },
  { slug: "midnight-galaxy", name: "Midnight Galaxy", c: "glam", price: 1099, palette: ["#1D1B3A", "#7B6FD6"], pattern: "glitter", featured: true, desc: "Deep navy with layered holographic glitter. Made for parties and New Year's Eve." },
  { slug: "lilac-marble", name: "Lilac Marble", c: "glam", price: 1049, palette: ["#C9B6E4", "#FFFFFF"], pattern: "marble", desc: "Hand-swirled lilac and white marble with a high-shine top coat." },
  { slug: "black-cherry-chrome", name: "Black Cherry Chrome", c: "glam", price: 1149, palette: ["#4A0E1E", "#B0314F"], pattern: "chrome", featured: true, badge: "New drop", desc: "Dark cherry with a mirror chrome finish. Moody, glossy and very hard to ignore." },
  { slug: "royal-bride", name: "Royal Bride", c: "bridal-festive", price: 2499, compare: 2999, palette: ["#8E1B2E", "#D4AF6A"], pattern: "glitter", featured: true, badge: "Bridal", mtm: true, fee: 0, desc: "Bridal red with hand-painted gold details. Made to measure as standard, so every nail fits perfectly on your big day." },
  { slug: "mehendi-gold", name: "Mehendi Gold", c: "bridal-festive", price: 1799, palette: ["#B5523B", "#E6C77E"], pattern: "dots", desc: "Henna-inspired terracotta with gold dotted motifs, made to match your mehendi." },
  { slug: "diwali-diya", name: "Diwali Diya", c: "bridal-festive", price: 1299, palette: ["#E2862F", "#F6D27A"], pattern: "ombre", featured: true, badge: "Festive", desc: "A glowing marigold-to-gold ombre, like a lit diya. Our festive bestseller." },
  { slug: "karwa-chauth-red", name: "Karwa Chauth Red", c: "bridal-festive", price: 1199, palette: ["#A3122A", "#F2C9C9"], pattern: "french", desc: "Classic sindoor red French tips on a soft blush base." },
  { slug: "sizing-kit", name: "Sizing Kit", c: "essentials", price: 99, palette: ["#F5EFEA", "#FFFFFF"], pattern: "solid", featured: false, mtm: false, shapes: [], lengths: [], stock: 200, badge: "Start here", desc: "Clear tips in every size so you can find your perfect fit at home. Its full price comes back as a coupon on your first set." },
  { slug: "nail-glue", name: "Brush-on Nail Glue", c: "essentials", price: 149, palette: ["#EADCD3", "#FFFFFF"], pattern: "solid", addon: true, mtm: false, shapes: [], lengths: [], stock: 300, desc: "Salon-strength brush-on glue. Holds for up to 2 weeks." },
  { slug: "adhesive-tabs", name: "Adhesive Tabs (48)", c: "essentials", price: 99, palette: ["#DDE7E0", "#FFFFFF"], pattern: "solid", addon: true, mtm: false, shapes: [], lengths: [], stock: 300, desc: "Gentle sticky tabs for 1–3 day wear. No glue, easy removal." },
  { slug: "prep-removal-kit", name: "Prep & Removal Kit", c: "essentials", price: 199, palette: ["#E8D8EC", "#FFFFFF"], pattern: "solid", addon: true, mtm: false, shapes: [], lengths: [], stock: 300, desc: "Mini file, buffer, cuticle stick, alcohol prep pads and cuticle oil for easy removal." },
];

const reviews = [
  { slug: "milk-bath-french", name: "Ananya", city: "Pune", rating: 5, text: "Fit like they were painted on. My colleagues didn't believe they were press-ons!" },
  { slug: "royal-bride", name: "Riya", city: "Ahmedabad", rating: 5, text: "Wore these for my wedding. They lasted all 4 days of functions and looked stunning in photos." },
  { slug: "chrome-glazed-donut", name: "Sneha", city: "Bengaluru", rating: 5, text: "The chrome is so smooth. Packaging felt like a gift. Ordering again for Diwali." },
  { slug: "midnight-galaxy", name: "Kavya", city: "Mumbai", rating: 4, text: "Gorgeous glitter. Used the sizing kit first and every nail fit perfectly." },
  { slug: "diwali-diya", name: "Pooja", city: "Surat", rating: 5, text: "Got so many compliments at the family puja. Easy to apply with the glue." },
  { slug: "rose-latte", name: "Meghna", city: "Delhi", rating: 5, text: "Reused them three times already. Best ₹649 I've spent on my nails." },
];

async function main() {
  await db.store.upsert({ where: { id: 1 }, update: {}, create: { id: 1, aboutText: "Every set is designed and hand-painted by a professional nail artist in our home studio. Every nail gets the same care as a salon appointment: shaped, painted layer by layer, cured and checked before it's packed for you." } });

  const ids: Record<string, string> = {};
  for (const c of collections) {
    const row = await db.collection.upsert({ where: { slug: c.slug }, update: c, create: c });
    ids[c.slug] = row.id;
  }

  let order = 0;
  for (const p of products) {
    const data = {
      name: p.name,
      description: p.desc,
      price: p.price,
      compareAtPrice: p.compare ?? null,
      collectionId: ids[p.c],
      palette: j(p.palette),
      pattern: p.pattern,
      shapes: j(p.shapes ?? ["Almond", "Coffin", "Square", "Oval"]),
      lengths: j(p.lengths ?? ["Short", "Medium", "Long"]),
      madeToMeasure: p.mtm ?? true,
      madeToMeasureFee: p.fee ?? 200,
      stock: p.stock ?? 25,
      featured: p.featured ?? false,
      isAddon: p.addon ?? false,
      badge: p.badge ?? null,
      sortOrder: order++,
    };
    await db.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
  }

  if ((await db.review.count()) === 0) {
    for (const r of reviews) {
      const prod = await db.product.findUnique({ where: { slug: r.slug } });
      await db.review.create({ data: { productId: prod?.id, name: r.name, city: r.city, rating: r.rating, text: r.text, approved: true } });
    }
  }

  const coupons = [
    { code: "WELCOME10", type: "PERCENT", value: 10, minOrder: 499 },
    { code: "SIZEKIT99", type: "FLAT", value: 99, minOrder: 599 },
  ];
  for (const c of coupons) await db.coupon.upsert({ where: { code: c.code }, update: {}, create: c });

  console.log("Seeded store, collections, products, reviews and coupons.");
}

main().finally(() => db.$disconnect());
