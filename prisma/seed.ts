// Fills the database with a complete starter / test catalogue:
// every nail shape, length, finish and type, plus products set up for each test scenario
// (see docs/04-test-scenarios.md). Safe to run again; it updates rows by slug / code.
// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const j = (v: unknown) => JSON.stringify(v);

const ALL_SHAPES = ["Square", "Squoval", "Round", "Oval", "Almond", "Coffin", "Stiletto", "Lipstick", "Flare", "Edge", "Mountain Peak"];
const ALL_LENGTHS = ["Extra Short", "Short", "Medium", "Long", "Extra Long"];
const CLASSIC = ["Square", "Squoval", "Round", "Oval", "Almond"];
const POPULAR = ["Almond", "Coffin", "Square", "Oval"];
const STD = ["Short", "Medium", "Long"];
const SHORTISH = ["Extra Short", "Short", "Medium"];
const LONGISH = ["Medium", "Long", "Extra Long"];

type Color = { name: string; family: string; palette: [string, string]; extra: number };
const col = (name: string, family: string, a: string, b: string, extra = 0): Color => ({ name, family, palette: [a, b], extra });

const collections = [
  { slug: "everyday", name: "Everyday", description: "Nudes, French tips and soft colours for work, college and every day in between.", tint: "#F3E4DA", sortOrder: 1 },
  { slug: "glam", name: "Glam & Party", description: "Chrome, cat eye, glitter and 3D gems for nights out, birthdays and parties.", tint: "#E9DDF0", sortOrder: 2 },
  { slug: "art", name: "Nail Art & Trends", description: "Hand-painted marble, swirls, checks and florals: the trends of the season.", tint: "#E5ECE4", sortOrder: 3 },
  { slug: "bridal-festive", name: "Bridal & Festive", description: "Rich reds, golds and hand-painted details for weddings, Diwali and Karwa Chauth.", tint: "#F6D9D4", sortOrder: 4 },
  { slug: "strips", name: "Gel Strips & Stickers", description: "Quick, lamp-cured gel strips and no-lamp nail stickers. One size fits most.", tint: "#F1E8D8", sortOrder: 5 },
  { slug: "essentials", name: "Essentials", description: "Sizing kit, glue, tabs and everything you need for a perfect fit.", tint: "#E3EDE6", sortOrder: 6 },
];

type P = {
  slug: string; name: string; c: string; price: number; compare?: number; type?: string;
  pattern: string; palette: [string, string]; colors?: Color[];
  shapes?: string[]; lengths?: string[]; mtm?: boolean; fee?: number; stock?: number;
  featured?: boolean; badge?: string; addon?: boolean; active?: boolean; desc: string;
};

const products: P[] = [
  // ---------- Everyday ----------
  { slug: "milk-bath-french", name: "Milk Bath French", c: "everyday", price: 699, compare: 899, pattern: "french", palette: ["#F7EEE8", "#FFFFFF"],
    colors: [col("Milky White", "White", "#F7EEE8", "#FFFFFF"), col("Pink Base", "Pink", "#F4CFCF", "#FFFFFF"), col("Nude Base", "Nude", "#E6C3B3", "#FFFFFF")],
    shapes: [...CLASSIC, "Coffin"], lengths: [...SHORTISH, "Long"], featured: true, badge: "Bestseller",
    desc: "A soft milky base with a crisp white French tip. Goes with everything, from office to weddings." },
  { slug: "rose-latte", name: "Rose Latte", c: "everyday", price: 649, pattern: "ombre", palette: ["#D9A5A0", "#F2D6CF"],
    colors: [col("Rose", "Pink", "#D9A5A0", "#F2D6CF"), col("Mocha", "Brown", "#9C6B55", "#E8CDBF"), col("Peach", "Orange", "#F0A07A", "#FBE0D2")],
    shapes: POPULAR, lengths: STD, desc: "A warm rose-to-nude ombre that looks like your nails, only better." },
  { slug: "barely-there-nude", name: "Classic Nude Glaze", c: "everyday", price: 549, pattern: "solid", palette: ["#E6C3B3", "#F5E1D6"],
    colors: [col("Nude", "Nude", "#E6C3B3", "#F5E1D6"), col("Blush", "Pink", "#F2C4C4", "#FBE6E6"), col("Mocha", "Brown", "#A87A63", "#E3C9BB"), col("Milky", "White", "#F4EEE8", "#FFFFFF")],
    shapes: ALL_SHAPES, lengths: ALL_LENGTHS, featured: true, badge: "Every shape",
    desc: "Glossy skin-tone nude in every shape and every length we make. Our go-to for interviews, exams and long work weeks." },
  { slug: "sage-polka", name: "Sage Polka", c: "everyday", price: 749, pattern: "dots", palette: ["#A9BFA8", "#FFFFFF"],
    colors: [col("Sage", "Green", "#A9BFA8", "#FFFFFF"), col("Sky", "Blue", "#A8C4E0", "#FFFFFF"), col("Butter", "Yellow", "#F2DD8E", "#FFFFFF")],
    shapes: ["Square", "Squoval", "Round"], lengths: ["Extra Short", "Short"], badge: "Short nails",
    desc: "Muted pastel with tiny hand-dotted polka dots. Made for short nails." },
  { slug: "matte-mauve", name: "Matte Mauve", c: "everyday", price: 599, pattern: "matte", palette: ["#9C7A8F", "#C9AFC0"],
    shapes: ["Squoval", "Oval", "Almond"], lengths: STD, mtm: false,
    desc: "Velvety matte mauve with no shine. Available in standard sizes only." },
  { slug: "jelly-cherry", name: "Jelly Pop", c: "everyday", price: 649, pattern: "jelly", palette: ["#D2324F", "#F5A3B4"], stock: 3,
    colors: [col("Cherry", "Red", "#D2324F", "#F5A3B4"), col("Grape", "Purple", "#7B4FC2", "#C9B3F0"), col("Lime", "Green", "#7CC26A", "#D2F0C6")],
    shapes: ["Round", "Oval", "Almond"], lengths: SHORTISH,
    desc: "Sheer, glassy jelly colour you can see the light through. A 90s favourite." },
  { slug: "v-french-noir", name: "V-French Noir", c: "everyday", price: 749, pattern: "vfrench", palette: ["#EBD3C6", "#1E1418"],
    shapes: ["Coffin", "Square", "Almond"], lengths: STD,
    desc: "A sharp black V-shaped French tip on a soft nude base." },

  // ---------- Glam & Party ----------
  { slug: "chrome-glazed-donut", name: "Glazed Donut Chrome", c: "glam", price: 999, compare: 1199, pattern: "chrome", palette: ["#F4E9E4", "#D9D2EC"],
    colors: [col("Pearl", "White", "#F4E9E4", "#D9D2EC"), col("Blush Glaze", "Pink", "#F2C9D2", "#FFF0F4"), col("Lilac Glaze", "Purple", "#CDBDF0", "#F3EEFF"), col("Silver Mirror", "Silver", "#C9CCD3", "#FFFFFF", 100)],
    shapes: POPULAR, lengths: STD, featured: true, badge: "Trending",
    desc: "The pearly chrome glaze everyone is asking for, buffed by hand on every nail. Silver Mirror costs a little more." },
  { slug: "cat-eye-magnetic", name: "Cat Eye Magnetic", c: "glam", price: 1199, type: "Acrylic", pattern: "cateye", palette: ["#0F4D3A", "#7DE3B5"],
    colors: [col("Emerald", "Green", "#0F4D3A", "#7DE3B5"), col("Sapphire", "Blue", "#13285C", "#7FA8FF"), col("Ruby", "Red", "#5C0A1C", "#FF6F8E"), col("Galaxy", "Multi", "#241A3D", "#E6B8FF", 150)],
    shapes: ["Almond", "Coffin", "Stiletto"], lengths: LONGISH, featured: true, badge: "New",
    desc: "A shimmering magnetic band that moves as your hands move. Galaxy has an extra holographic layer." },
  { slug: "midnight-galaxy", name: "Midnight Galaxy", c: "glam", price: 1099, type: "Acrylic", pattern: "glitter", palette: ["#1D1B3A", "#7B6FD6"],
    shapes: ["Stiletto", "Almond", "Coffin"], lengths: LONGISH,
    desc: "Deep navy with layered holographic glitter. Made for parties and New Year's Eve." },
  { slug: "velvet-wine", name: "Velvet Wine", c: "glam", price: 1049, pattern: "velvet", palette: ["#5A0F24", "#D2577A"], stock: 0,
    colors: [col("Wine", "Red", "#5A0F24", "#D2577A"), col("Plum", "Purple", "#3B1450", "#A777D0")],
    shapes: ["Almond", "Oval", "Coffin"], lengths: STD, badge: "Made to order",
    desc: "Soft-focus velvet shimmer. Standard sizes are sold out, but you can still order it made to measure." },
  { slug: "holo-dream", name: "Holo Dream", c: "glam", price: 1149, pattern: "holo", palette: ["#F1E6FF", "#C8F2FF"],
    shapes: ["Coffin", "Flare"], lengths: STD, badge: "Y2K",
    desc: "Rainbow holographic finish on a trendy flare or coffin shape." },
  { slug: "black-cherry-chrome", name: "Black Cherry Chrome", c: "glam", price: 1149, type: "Acrylic", pattern: "chrome", palette: ["#4A0E1E", "#B0314F"],
    shapes: ["Coffin", "Stiletto", "Edge"], lengths: ["Long", "Extra Long"], featured: true, badge: "New drop",
    desc: "Dark cherry with a mirror chrome finish. Moody, glossy and very hard to ignore." },
  { slug: "crystal-queen", name: "Crystal Queen", c: "glam", price: 1499, compare: 1799, type: "Acrylic", pattern: "gems", palette: ["#D9DCE3", "#B7E3FF"],
    colors: [col("Silver", "Silver", "#D9DCE3", "#B7E3FF"), col("Rose Gold", "Pink", "#E8B4A6", "#FFE3D6"), col("Onyx", "Black", "#1E1418", "#C9CCD3")],
    shapes: ["Stiletto", "Edge", "Mountain Peak"], lengths: LONGISH,
    desc: "3D rhinestones and glitter on a long sharp shape. Every gem is placed by hand." },
  { slug: "tortoise-shell", name: "Tortoise Shell", c: "glam", price: 899, pattern: "tortoise", palette: ["#B5672A", "#3B1D0E"], stock: 0, mtm: false,
    shapes: ["Square", "Squoval", "Oval"], lengths: STD, badge: "Sold out",
    desc: "Hand-blended amber tortoise shell. Sold out right now." },
  { slug: "aura-glow", name: "Aura Glow", c: "glam", price: 949, pattern: "aura", palette: ["#F7C9B0", "#FF7A59"],
    colors: [col("Sunset", "Orange", "#F7C9B0", "#FF7A59"), col("Lavender", "Purple", "#E6DDF7", "#9C7BE0"), col("Mint", "Green", "#DDF3E8", "#5CC59A")],
    shapes: ["Almond", "Oval", "Round"], lengths: STD, featured: true,
    desc: "Airbrushed glow in the centre of each nail that fades out to the edges." },
  { slug: "lipstick-muse", name: "Lipstick Muse", c: "glam", price: 299, compare: 399, type: "ABS", pattern: "solid", palette: ["#C1121F", "#F28C8C"],
    shapes: ["Lipstick", "Flare"], lengths: STD, mtm: false, badge: "Budget",
    desc: "Our budget ABS set in a classic red, in the fashion-forward lipstick or flare shape." },

  // ---------- Nail Art & Trends ----------
  { slug: "lilac-marble", name: "Lilac Marble", c: "art", price: 1049, pattern: "marble", palette: ["#C9B6E4", "#FFFFFF"],
    shapes: POPULAR, lengths: STD, desc: "Hand-swirled lilac and white marble with a high-shine top coat." },
  { slug: "retro-swirl", name: "Retro Swirl", c: "art", price: 899, pattern: "swirl", palette: ["#F2B880", "#E5487A"],
    colors: [col("Retro", "Multi", "#F2B880", "#E5487A"), col("Berry", "Pink", "#F6C1D3", "#B3124F"), col("Ocean", "Blue", "#B9D9F2", "#1E5BB5")],
    shapes: ["Almond", "Oval", "Squoval"], lengths: STD, desc: "Groovy hand-painted 70s swirls in two tones." },
  { slug: "checkered-picnic", name: "Checkered Picnic", c: "art", price: 849, pattern: "checker", palette: ["#FFFFFF", "#1E1418"],
    colors: [col("Black & White", "Black", "#FFFFFF", "#1E1418"), col("Pink & White", "Pink", "#FFFFFF", "#F28AB0"), col("Sage Check", "Green", "#FFFFFF", "#7FA889")],
    shapes: ["Square", "Squoval"], lengths: SHORTISH, desc: "Hand-painted checkerboard. Bold on short square nails." },
  { slug: "spring-floral", name: "Spring Floral", c: "art", price: 949, pattern: "floral", palette: ["#F7D9DE", "#F28AB0"],
    colors: [col("Blush Garden", "Pink", "#F7D9DE", "#F28AB0"), col("Lilac Garden", "Purple", "#E6DDF7", "#9C7BE0"), col("Sky Garden", "Blue", "#DCEBF7", "#5C8FD6")],
    shapes: ["Oval", "Almond", "Round"], lengths: STD, desc: "Tiny hand-painted daisies on a soft sheer base." },

  // ---------- Bridal & Festive ----------
  { slug: "royal-bride", name: "Royal Bride", c: "bridal-festive", price: 2499, compare: 2999, pattern: "glitter", palette: ["#8E1B2E", "#D4AF6A"],
    colors: [col("Bridal Red", "Red", "#8E1B2E", "#D4AF6A"), col("Maroon", "Red", "#5C0F1E", "#D4AF6A"), col("Rani Pink", "Pink", "#C2185B", "#E6C77E")],
    shapes: ["Almond", "Coffin", "Oval", "Stiletto"], lengths: ALL_LENGTHS, fee: 0, featured: true, badge: "Bridal",
    desc: "Bridal colours with hand-painted gold details. Made to measure is free on this set, so every nail fits perfectly on your big day." },
  { slug: "mehendi-gold", name: "Mehendi Gold", c: "bridal-festive", price: 1799, pattern: "dots", palette: ["#B5523B", "#E6C77E"],
    shapes: ["Almond", "Oval"], lengths: STD, desc: "Henna-inspired terracotta with gold dotted motifs, made to match your mehendi." },
  { slug: "diwali-diya", name: "Diwali Diya", c: "bridal-festive", price: 1299, pattern: "ombre", palette: ["#E2862F", "#F6D27A"], featured: true, badge: "Festive",
    colors: [col("Marigold", "Orange", "#E2862F", "#F6D27A"), col("Pure Gold", "Gold", "#B8862B", "#F6E3A1", 100), col("Rangoli Pink", "Pink", "#D81B60", "#F6D27A")],
    shapes: POPULAR, lengths: STD, desc: "A glowing marigold-to-gold ombre, like a lit diya. Our festive bestseller." },
  { slug: "karwa-chauth-red", name: "Karwa Chauth Red", c: "bridal-festive", price: 1199, pattern: "french", palette: ["#F2C9C9", "#A3122A"],
    shapes: POPULAR, lengths: STD, desc: "Classic sindoor red French tips on a soft blush base." },
  { slug: "haldi-sunshine", name: "Haldi Sunshine", c: "bridal-festive", price: 1099, pattern: "aura", palette: ["#FFF1C1", "#F2B705"],
    shapes: ["Round", "Oval", "Almond"], lengths: SHORTISH, desc: "Sunny yellow glow for your haldi ceremony. Comfortable shorter lengths." },

  // ---------- Gel Strips & Stickers (no shape / length options) ----------
  { slug: "gel-strips-classics", name: "Semi-Cured Gel Strips", c: "strips", price: 449, type: "Gel strips", pattern: "solid", palette: ["#F2C4C4", "#FFFFFF"],
    colors: [col("Nude Pink", "Pink", "#F2C4C4", "#FFFFFF"), col("Milky White", "White", "#F4EEE8", "#FFFFFF"), col("Classic Red", "Red", "#B3122E", "#F28C8C")],
    shapes: [], lengths: [], mtm: false, stock: 60,
    desc: "20 gel strips that stick on and harden under a UV/LED lamp for up to 2 weeks of wear. One size fits most; trim to fit." },
  { slug: "floral-nail-stickers", name: "Floral Nail Stickers", c: "strips", price: 199, type: "Nail stickers", pattern: "floral", palette: ["#F7D9DE", "#F28AB0"],
    shapes: [], lengths: [], mtm: false, stock: 80,
    desc: "No-lamp polish stickers with printed florals. Peel, press and file off the extra. Lasts 3–7 days." },

  // ---------- Essentials ----------
  { slug: "sizing-kit", name: "Sizing Kit", c: "essentials", price: 99, type: "Kit", pattern: "solid", palette: ["#F5EFEA", "#FFFFFF"], mtm: false, shapes: [], lengths: [], stock: 200, badge: "Start here",
    desc: "Clear tips numbered 0 (widest) to 11 so you can find your perfect fit at home. Its full price comes back as a coupon on your first set." },
  { slug: "nail-glue", name: "Brush-on Nail Glue", c: "essentials", price: 149, type: "Accessory", pattern: "solid", palette: ["#EADCD3", "#FFFFFF"], addon: true, mtm: false, shapes: [], lengths: [], stock: 300,
    desc: "Salon-strength brush-on glue. Holds for up to 2 weeks." },
  { slug: "adhesive-tabs", name: "Adhesive Tabs (48)", c: "essentials", price: 99, type: "Accessory", pattern: "solid", palette: ["#DDE7E0", "#FFFFFF"], addon: true, mtm: false, shapes: [], lengths: [], stock: 300,
    desc: "Gentle sticky tabs for 1–3 day wear. No glue, easy removal." },
  { slug: "prep-removal-kit", name: "Prep & Removal Kit", c: "essentials", price: 199, type: "Kit", pattern: "solid", palette: ["#E8D8EC", "#FFFFFF"], addon: true, mtm: false, shapes: [], lengths: [], stock: 300,
    desc: "Mini file, buffer, cuticle stick, alcohol prep pads and cuticle oil for easy removal." },
  { slug: "cuticle-oil", name: "Rose Cuticle Oil", c: "essentials", price: 249, type: "Accessory", pattern: "solid", palette: ["#F2C4C4", "#FFFFFF"], addon: true, mtm: false, shapes: [], lengths: [], stock: 4,
    desc: "Nourishing rose and almond oil for healthy cuticles between sets." },

  // ---------- Hidden (not live) ----------
  { slug: "winter-drop-preview", name: "Winter Drop (coming soon)", c: "glam", price: 1299, pattern: "holo", palette: ["#DCE8F7", "#FFFFFF"], active: false,
    shapes: POPULAR, lengths: STD, desc: "Hidden from the shop until launch. Only visible in the admin panel." },
];

const reviews = [
  { slug: "milk-bath-french", name: "Ananya", city: "Pune", rating: 5, text: "Fit like they were painted on. My colleagues didn't believe they were press-ons!" },
  { slug: "royal-bride", name: "Riya", city: "Ahmedabad", rating: 5, text: "Wore these for my wedding. They lasted all 4 days of functions and looked stunning in photos." },
  { slug: "chrome-glazed-donut", name: "Sneha", city: "Bengaluru", rating: 5, text: "The chrome is so smooth. Packaging felt like a gift. Ordering again for Diwali." },
  { slug: "midnight-galaxy", name: "Kavya", city: "Mumbai", rating: 4, text: "Gorgeous glitter. Used the sizing kit first and every nail fit perfectly." },
  { slug: "diwali-diya", name: "Pooja", city: "Surat", rating: 5, text: "Got so many compliments at the family puja. Easy to apply with the glue." },
  { slug: "rose-latte", name: "Meghna", city: "Delhi", rating: 5, text: "Reused them three times already. Best ₹649 I've spent on my nails." },
  { slug: "cat-eye-magnetic", name: "Ishita", city: "Jaipur", rating: 5, text: "The cat eye moves when I move my hand. Ruby is unreal in sunlight." },
  { slug: "barely-there-nude", name: "Nidhi", city: "Vadodara", rating: 4, text: "Got squoval in extra short for office. Looks so natural." },
  { slug: "checkered-picnic", name: "Zara", city: "Hyderabad", rating: 5, text: "Pink & White checks are the cutest thing on my hands." },
];

async function main() {
  await db.store.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      aboutText:
        "Every set is designed and hand-painted by a professional nail artist in our home studio. Every nail gets the same care as a salon appointment: shaped, painted layer by layer, cured and checked before it's packed for you.",
    },
  });

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
      nailType: p.type ?? "Soft gel",
      palette: j(p.palette),
      colors: j(p.colors ?? []),
      pattern: p.pattern,
      shapes: j(p.shapes ?? POPULAR),
      lengths: j(p.lengths ?? STD),
      madeToMeasure: p.mtm ?? true,
      madeToMeasureFee: p.fee ?? 200,
      stock: p.stock ?? 25,
      featured: p.featured ?? false,
      isAddon: p.addon ?? false,
      active: p.active ?? true,
      badge: p.badge ?? null,
      sortOrder: order++,
    };
    await db.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
  }

  for (const r of reviews) {
    const prod = await db.product.findUnique({ where: { slug: r.slug } });
    const exists = await db.review.findFirst({ where: { name: r.name, text: r.text } });
    if (!exists) await db.review.create({ data: { productId: prod?.id, name: r.name, city: r.city, rating: r.rating, text: r.text, approved: true } });
  }

  const day = 24 * 60 * 60 * 1000;
  const coupons = [
    { code: "WELCOME10", type: "PERCENT", value: 10, minOrder: 499, active: true, maxUses: null, usedCount: 0, expiresAt: null },
    { code: "SIZEKIT99", type: "FLAT", value: 99, minOrder: 599, active: true, maxUses: null, usedCount: 0, expiresAt: null },
    { code: "FLAT200", type: "FLAT", value: 200, minOrder: 1500, active: true, maxUses: null, usedCount: 0, expiresAt: null },
    { code: "EXPIRED20", type: "PERCENT", value: 20, minOrder: 0, active: true, maxUses: null, usedCount: 0, expiresAt: new Date(Date.now() - day) },
    { code: "USEDUP", type: "PERCENT", value: 15, minOrder: 0, active: true, maxUses: 1, usedCount: 1, expiresAt: null },
    { code: "PAUSED15", type: "PERCENT", value: 15, minOrder: 0, active: false, maxUses: null, usedCount: 0, expiresAt: null },
  ];
  for (const c of coupons) await db.coupon.upsert({ where: { code: c.code }, update: c, create: c });

  console.log(`Seeded ${collections.length} collections, ${products.length} products, ${reviews.length} reviews, ${coupons.length} coupons.`);
}

main().finally(() => db.$disconnect());
