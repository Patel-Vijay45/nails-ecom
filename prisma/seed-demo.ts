// Demo / test data for the admin panel: orders in every status and payment state,
// custom requests in every stage, reviews waiting for approval and saved nail sizes.
// Everything uses "Test" names, order numbers starting with TEST, and phones 90000000xx.
// Run with: npm run db:demo   (run "npm run db:seed" first). Safe to run again.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const day = 24 * 60 * 60 * 1000;
const ago = (d: number, h = 10) => new Date(Date.now() - d * day + h * 60 * 60 * 1000 - 12 * 60 * 60 * 1000);

type Item = { slug: string; qty?: number; shape?: string; length?: string; size?: string; color?: string; measurements?: string };
type Demo = {
  n: number; name: string; city: string; state: string; status: string; method: "COD" | "ONLINE"; pay: string;
  items: Item[]; daysAgo: number; coupon?: { code: string; discount: number }; courier?: string; awb?: string; note?: string; adminNotes?: string;
};

const SEND_LATER = "Customer will send sizes on WhatsApp";

const demos: Demo[] = [
  { n: 1001, name: "Test Priya Shah", city: "Ahmedabad", state: "Gujarat", status: "PENDING", method: "COD", pay: "PENDING", daysAgo: 0,
    items: [{ slug: "royal-bride", shape: "Almond", length: "Long", size: "Custom", color: "Bridal Red", measurements: SEND_LATER }],
    note: "Wedding on 12th, please deliver before 8th" },
  { n: 1002, name: "Test Aisha Khan", city: "Mumbai", state: "Maharashtra", status: "PENDING", method: "ONLINE", pay: "PENDING", daysAgo: 0,
    items: [{ slug: "chrome-glazed-donut", shape: "Almond", length: "Medium", size: "M", color: "Pearl" }] },
  { n: 1003, name: "Test Kavya Rao", city: "Bengaluru", state: "Karnataka", status: "CONFIRMED", method: "ONLINE", pay: "PAID", daysAgo: 1,
    items: [{ slug: "cat-eye-magnetic", shape: "Coffin", length: "Long", size: "S", color: "Galaxy" }, { slug: "nail-glue" }],
    coupon: { code: "WELCOME10", discount: 149 } },
  { n: 1004, name: "Test Meera Iyer", city: "Chennai", state: "Tamil Nadu", status: "IN_PRODUCTION", method: "COD", pay: "PENDING", daysAgo: 2,
    items: [{ slug: "barely-there-nude", shape: "Squoval", length: "Extra Short", size: "Custom", color: "Blush", measurements: "Right 3-6-5-6-8 · Left 3-6-5-7-8 (kit sizes, thumb→pinky)" }] },
  { n: 1005, name: "Test Sana Mirza", city: "Hyderabad", state: "Telangana", status: "PACKED", method: "ONLINE", pay: "PAID", daysAgo: 3,
    items: [{ slug: "checkered-picnic", shape: "Square", length: "Short", size: "XS", color: "Pink & White", qty: 2 }] },
  { n: 1006, name: "Test Neha Gupta", city: "Delhi", state: "Delhi", status: "SHIPPED", method: "COD", pay: "PENDING", daysAgo: 4,
    items: [{ slug: "diwali-diya", shape: "Almond", length: "Medium", size: "M", color: "Pure Gold" }],
    courier: "Delhivery", awb: "TESTAWB100006" },
  { n: 1007, name: "Test Ritu Verma", city: "Jaipur", state: "Rajasthan", status: "DELIVERED", method: "ONLINE", pay: "PAID", daysAgo: 8,
    items: [{ slug: "aura-glow", shape: "Oval", length: "Short", size: "L", color: "Lavender" }, { slug: "sizing-kit" }],
    courier: "Bluedart", awb: "TESTAWB100007" },
  { n: 1008, name: "Test Anjali Nair", city: "Kochi", state: "Kerala", status: "CANCELLED", method: "COD", pay: "PENDING", daysAgo: 6,
    items: [{ slug: "midnight-galaxy", shape: "Stiletto", length: "Extra Long", size: "S" }], adminNotes: "Customer did not confirm on WhatsApp" },
  { n: 1009, name: "Test Divya Patel", city: "Surat", state: "Gujarat", status: "RTO", method: "COD", pay: "PENDING", daysAgo: 12,
    items: [{ slug: "lipstick-muse", shape: "Lipstick", length: "Medium", size: "M" }], courier: "Ecom Express", awb: "TESTAWB100009", adminNotes: "Refused at door" },
  { n: 1010, name: "Test Fatima Shaikh", city: "Pune", state: "Maharashtra", status: "PENDING", method: "ONLINE", pay: "FAILED", daysAgo: 1,
    items: [{ slug: "crystal-queen", shape: "Edge", length: "Long", size: "M", color: "Onyx" }] },
  { n: 1011, name: "Test Pooja Desai", city: "Vadodara", state: "Gujarat", status: "CANCELLED", method: "ONLINE", pay: "REFUNDED", daysAgo: 15,
    items: [{ slug: "holo-dream", shape: "Flare", length: "Medium", size: "M" }], adminNotes: "Refunded on request" },
  { n: 1012, name: "Test Simran Kaur", city: "Chandigarh", state: "Chandigarh", status: "DELIVERED", method: "COD", pay: "PAID", daysAgo: 20,
    items: [{ slug: "gel-strips-classics", color: "Classic Red", qty: 2 }, { slug: "floral-nail-stickers" }, { slug: "cuticle-oil" }],
    coupon: { code: "SIZEKIT99", discount: 99 }, courier: "India Post", awb: "TESTEM100012IN" },
];

async function main() {
  const products = await db.product.findMany();
  if (products.length === 0) throw new Error("Run `npm run db:seed` first");
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const colorExtra = (slug: string, color?: string) => {
    if (!color) return 0;
    try {
      const c = (JSON.parse(bySlug.get(slug)!.colors) as { name: string; extra?: number }[]).find((x) => x.name === color);
      return c?.extra ?? 0;
    } catch {
      return 0;
    }
  };

  // Clean previous demo data
  await db.order.deleteMany({ where: { number: { startsWith: "TEST" } } });
  await db.customRequest.deleteMany({ where: { name: { startsWith: "Test " } } });
  await db.review.deleteMany({ where: { name: { startsWith: "Test " } } });
  await db.nailProfile.deleteMany({ where: { phone: { startsWith: "90000000" } } });

  for (const d of demos) {
    const lines = d.items.map((i) => {
      const p = bySlug.get(i.slug);
      if (!p) throw new Error(`Missing product ${i.slug}`);
      const custom = i.size === "Custom";
      const unitPrice = p.price + colorExtra(i.slug, i.color) + (custom ? p.madeToMeasureFee : 0);
      return { productId: p.id, name: p.name, unitPrice, quantity: i.qty ?? 1, shape: i.shape ?? "", length: i.length ?? "", size: i.size ?? "", color: i.color ?? "", measurements: i.measurements ?? "" };
    });
    const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
    const discount = d.coupon?.discount ?? 0;
    const shipping = subtotal - discount >= 999 ? 0 : 79;
    const codFee = d.method === "COD" ? 49 : 0;
    const phone = `90000000${String(d.n % 100).padStart(2, "0")}`;
    await db.order.create({
      data: {
        number: `TEST${d.n}`,
        status: d.status,
        paymentMethod: d.method,
        paymentStatus: d.pay,
        razorpayOrderId: d.method === "ONLINE" ? `order_TEST${d.n}` : null,
        razorpayPaymentId: d.pay === "PAID" && d.method === "ONLINE" ? `pay_TEST${d.n}` : null,
        name: d.name,
        phone,
        email: `test${d.n}@example.com`,
        address1: `${d.n % 50} Test Residency, Main Road`,
        city: d.city,
        state: d.state,
        pincode: "380015",
        notes: d.note ?? "",
        subtotal,
        discount,
        shipping,
        codFee,
        total: subtotal - discount + shipping + codFee,
        couponCode: d.coupon?.code ?? null,
        courier: d.courier ?? "",
        trackingNumber: d.awb ?? "",
        trackingUrl: d.awb ? `https://example.com/track/${d.awb}` : "",
        adminNotes: d.adminNotes ?? "",
        createdAt: ago(d.daysAgo),
        items: { create: lines },
      },
    });
  }

  // Saved nail sizes for one demo customer (loads with "Load my sizes" → 9000000004)
  await db.nailProfile.create({ data: { phone: "9000000004", right: "[3,6,5,6,8]", left: "[3,6,5,7,8]" } });

  const requests = [
    { name: "Test Riya Bride", status: "NEW", occasion: "My wedding", eventDate: "2026-12-12", budget: "₹3,500 – ₹5,000", colours: "Maroon and gold to match lehenga", description: "Bridal set with my partner's initial on the ring finger and small gold motifs.", shape: "Almond", length: "Long" },
    { name: "Test Tanvi Party", status: "QUOTED", quote: 1899, occasion: "Birthday", eventDate: "2026-11-20", budget: "₹1,000 – ₹2,000", colours: "Silver chrome with stars", description: "Silver chrome with tiny star charms, coffin shape.", shape: "Coffin", length: "Medium" },
    { name: "Test Kiara Sangeet", status: "ACCEPTED", quote: 2499, occasion: "Sangeet", eventDate: "2026-12-01", budget: "₹2,000 – ₹3,500", colours: "Pink and mirror work", description: "Pink with mirror-work inspired gems to match outfit.", shape: "Oval", length: "Medium" },
    { name: "Test Esha Festive", status: "IN_PROGRESS", quote: 1599, occasion: "Diwali", eventDate: "2026-11-08", budget: "₹1,000 – ₹2,000", colours: "Orange and gold", description: "Diya and rangoli inspired art.", shape: "Squoval", length: "Short" },
    { name: "Test Mira Done", status: "DONE", quote: 3199, occasion: "Reception", eventDate: "2026-10-20", budget: "₹3,500 – ₹5,000", colours: "Champagne", description: "Champagne glitter ombre with pearls.", shape: "Almond", length: "Long" },
    { name: "Test Nisha Declined", status: "DECLINED", occasion: "Party", eventDate: "2026-11-05", budget: "Not sure yet", colours: "Neon", description: "Needed in 1 day, too soon for us.", shape: "Stiletto", length: "Extra Long" },
  ];
  for (const [i, r] of requests.entries()) {
    await db.customRequest.create({ data: { ...r, phone: `90000001${String(i).padStart(2, "0")}`, createdAt: ago(i * 2) } });
  }

  const nude = bySlug.get("barely-there-nude");
  const holo = bySlug.get("holo-dream");
  await db.review.createMany({
    data: [
      { productId: nude?.id, name: "Test Reviewer One", city: "Ahmedabad", rating: 5, text: "Waiting for approval: lovely fit in extra short squoval.", approved: false },
      { productId: holo?.id, name: "Test Reviewer Two", city: "Mumbai", rating: 3, text: "Waiting for approval: nice colour, but one nail lifted after 4 days.", approved: false },
    ],
  });

  console.log(`Demo data: ${demos.length} orders, ${requests.length} custom requests, 2 pending reviews, 1 saved size profile.`);
}

main().finally(() => db.$disconnect());
