"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { colorOptionSchema } from "@/lib/colors";
import { NAIL_TYPES, ORDER_STATUSES, PATTERNS, REQUEST_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { parseList, slugify } from "@/lib/format";
import { saveSizes } from "@/lib/nailProfile";
import { DEFAULT_TIP_WIDTHS, formatSizes, isPhone, normalisePhone, SEND_LATER, sizesSchema } from "@/lib/sizes";
import { saveImages } from "@/lib/uploads";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, d = 0) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : d;
};
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

// ---------- Auth ----------
export async function login(_: { error: string }, form: FormData) {
  if (!checkPassword(str(form, "password"))) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Wrong password" };
  }
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ---------- Orders ----------
export async function updateOrder(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const status = str(form, "status");
  const paymentStatus = str(form, "paymentStatus");
  const order = await db.order.findUniqueOrThrow({ where: { id }, include: { items: true } });

  // Put ready-made stock back when an order is cancelled or returned.
  const wasLive = !["CANCELLED", "RTO"].includes(order.status);
  const nowDead = ["CANCELLED", "RTO"].includes(status);
  if (wasLive && nowDead) {
    for (const i of order.items) if (i.productId && i.size !== "Custom") await db.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
  }

  await db.order.update({
    where: { id },
    data: {
      status: (ORDER_STATUSES as readonly string[]).includes(status) ? status : order.status,
      paymentStatus: ["PENDING", "PAID", "FAILED", "REFUNDED"].includes(paymentStatus) ? paymentStatus : order.paymentStatus,
      courier: str(form, "courier"),
      trackingNumber: str(form, "trackingNumber"),
      trackingUrl: str(form, "trackingUrl"),
      adminNotes: str(form, "adminNotes"),
      shippingCost: str(form, "shippingCost") === "" ? null : Math.max(0, int(form, "shippingCost")),
    },
  });
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?saved=1`);
}

// ---------- Products ----------
export async function saveProduct(_: { error: string }, form: FormData): Promise<{ error: string }> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Please enter a product name." };
  const slug = slugify(str(form, "slug") || name);

  const existing = id ? await db.product.findUnique({ where: { id } }) : null;
  const keep = form.getAll("keepImages").map(String);
  let uploaded: string[] = [];
  try {
    uploaded = await saveImages(form.getAll("newImages").filter((f): f is File => f instanceof File && f.size > 0), "products");
  } catch (e) {
    return { error: `Photos not saved: ${(e as Error).message}. Nothing else was changed, please try again.` };
  }
  const urlImages = str(form, "imageUrls").split(/\s+/).filter((u) => /^https?:\/\//.test(u));
  // Keep existing photos in the order chosen in the form (first = main photo).
  const existingImages = existing ? parseList(existing.images) : [];
  const images = [...keep.filter((u) => existingImages.includes(u)), ...uploaded, ...urlImages];

  const palette = [str(form, "color1") || "#E8B4B8", str(form, "color2") || "#FFFFFF"];
  const pattern = (PATTERNS as readonly string[]).includes(str(form, "pattern")) ? str(form, "pattern") : "solid";
  const compare = int(form, "compareAtPrice", 0);
  let colors: unknown[] = [];
  try {
    colors = JSON.parse(str(form, "colors") || "[]");
  } catch {}
  const colorOptions = (Array.isArray(colors) ? colors : []).flatMap((c) => {
    const r = colorOptionSchema.safeParse(c);
    return r.success ? [r.data] : [];
  }).filter((c, i, all) => all.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === i);
  const nailType = (NAIL_TYPES as readonly string[]).includes(str(form, "nailType")) ? str(form, "nailType") : "Soft gel";

  const data = {
    name,
    slug,
    description: str(form, "description"),
    price: Math.max(0, int(form, "price")),
    compareAtPrice: compare > 0 ? compare : null,
    collectionId: str(form, "collectionId") || null,
    images: JSON.stringify(images),
    palette: JSON.stringify(palette),
    pattern,
    colors: JSON.stringify(colorOptions),
    nailType,
    shapes: JSON.stringify(form.getAll("shapes").map(String)),
    lengths: JSON.stringify(form.getAll("lengths").map(String)),
    madeToMeasure: bool(form, "madeToMeasure"),
    madeToMeasureFee: Math.max(0, int(form, "madeToMeasureFee")),
    stock: Math.max(0, int(form, "stock")),
    weightGrams: Math.min(20000, Math.max(1, int(form, "weightGrams", 150))),
    featured: bool(form, "featured"),
    active: bool(form, "active"),
    isAddon: bool(form, "isAddon"),
    badge: str(form, "badge") || null,
    sortOrder: int(form, "sortOrder"),
  };

  const clash = await db.product.findUnique({ where: { slug } });
  if (clash && clash.id !== id) data.slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const saved = id ? await db.product.update({ where: { id }, data }) : await db.product.create({ data });
  redirect(`/admin/products/${saved.id}?saved=1`);
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  await db.product.delete({ where: { id: str(form, "id") } });
  redirect("/admin/products");
}

// ---------- Collections ----------
export async function saveCollection(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return;
  const data = { name, slug: slugify(str(form, "slug") || name), description: str(form, "description"), tint: str(form, "tint") || "#F4D9D6", sortOrder: int(form, "sortOrder") };
  if (id) await db.collection.update({ where: { id }, data });
  else await db.collection.create({ data });
  revalidatePath("/admin/collections");
}

export async function deleteCollection(form: FormData) {
  await requireAdmin();
  await db.collection.delete({ where: { id: str(form, "id") } });
  revalidatePath("/admin/collections");
}

// ---------- Custom requests ----------
export async function updateRequest(form: FormData) {
  await requireAdmin();
  const status = str(form, "status");
  const quote = int(form, "quote", 0);
  await db.customRequest.update({
    where: { id: str(form, "id") },
    data: {
      status: (REQUEST_STATUSES as readonly string[]).includes(status) ? status : "NEW",
      quote: quote > 0 ? quote : null,
      adminNotes: str(form, "adminNotes"),
    },
  });
  revalidatePath("/admin/requests");
}

// ---------- Coupons ----------
export async function saveCoupon(form: FormData) {
  await requireAdmin();
  const code = str(form, "code").toUpperCase().replace(/\s/g, "");
  if (!code) return;
  const expires = str(form, "expiresAt");
  const maxUses = int(form, "maxUses", 0);
  const data = {
    code,
    type: str(form, "type") === "FLAT" ? "FLAT" : "PERCENT",
    value: Math.max(1, int(form, "value", 1)),
    minOrder: Math.max(0, int(form, "minOrder")),
    maxUses: maxUses > 0 ? maxUses : null,
    expiresAt: expires ? new Date(`${expires}T23:59:59+05:30`) : null,
    active: true,
  };
  await db.coupon.upsert({ where: { code }, update: data, create: data });
  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(form: FormData) {
  await requireAdmin();
  const c = await db.coupon.findUniqueOrThrow({ where: { id: str(form, "id") } });
  await db.coupon.update({ where: { id: c.id }, data: { active: !c.active } });
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(form: FormData) {
  await requireAdmin();
  await db.coupon.delete({ where: { id: str(form, "id") } });
  revalidatePath("/admin/coupons");
}

// ---------- Reviews ----------
export async function moderateReview(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  if (str(form, "op") === "delete") await db.review.delete({ where: { id } });
  else await db.review.update({ where: { id }, data: { approved: str(form, "op") === "approve" } });
  revalidatePath("/admin/reviews");
}

// ---------- Settings ----------
export async function saveSettings(form: FormData) {
  await requireAdmin();
  await db.store.update({
    where: { id: 1 },
    data: {
      name: str(form, "name") || "My Nail Studio",
      tagline: str(form, "tagline"),
      artistName: str(form, "artistName"),
      announcement: str(form, "announcement"),
      heroTitle: str(form, "heroTitle"),
      heroSubtitle: str(form, "heroSubtitle"),
      aboutText: str(form, "aboutText"),
      whatsapp: str(form, "whatsapp").replace(/\D/g, ""),
      email: str(form, "email"),
      instagram: str(form, "instagram").replace(/^@/, ""),
      shippingFee: Math.max(0, int(form, "shippingFee")),
      freeShippingAbove: Math.max(0, int(form, "freeShippingAbove")),
      codEnabled: bool(form, "codEnabled"),
      codFee: Math.max(0, int(form, "codFee")),
      dispatchDays: str(form, "dispatchDays"),
      tipWidths: JSON.stringify(
        Array.from({ length: 12 }, (_, i) => {
          const v = parseFloat(str(form, `tip${i}`));
          return Number.isFinite(v) && v > 0 && v < 40 ? Math.round(v * 10) / 10 : DEFAULT_TIP_WIDTHS[i];
        }),
      ),
    },
  });
  redirect("/admin/settings?saved=1");
}

// ---------- Customer nail sizes ----------
export async function saveCustomerSizes(form: FormData) {
  await requireAdmin();
  const orderId = str(form, "orderId");
  const phone = normalisePhone(str(form, "phone"));
  const read = (h: string) => [0, 1, 2, 3, 4].map((i) => parseInt(str(form, `${h}${i}`), 10));
  const right = read("r");
  const left = bool(form, "same") ? right : read("l");
  const parsed = sizesSchema.safeParse({ right, left });
  if (!isPhone(phone) || !parsed.success) redirect(`/admin/orders/${orderId}?sizes=invalid`);
  await saveSizes(phone, parsed.data);
  // Fill in any made-to-measure items on this order that were waiting for sizes.
  if (orderId) await db.orderItem.updateMany({ where: { orderId, measurements: SEND_LATER }, data: { measurements: formatSizes(parsed.data) } });
  redirect(`/admin/orders/${orderId}?saved=1`);
}

// ---------- Shipping: pincode rules ----------
export async function savePincodeRule(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const prefix = str(form, "prefix").replace(/\D/g, "").slice(0, 6);
  if (!prefix) return;
  const data = {
    prefix,
    codAllowed: bool(form, "codAllowed"),
    extraShipping: Math.max(0, int(form, "extraShipping")),
    note: str(form, "note").slice(0, 80),
    active: bool(form, "active"),
  };
  const clash = await db.pincodeRule.findUnique({ where: { prefix } });
  if (clash && clash.id !== id) await db.pincodeRule.update({ where: { id: clash.id }, data });
  else if (id) await db.pincodeRule.update({ where: { id }, data });
  else await db.pincodeRule.create({ data });
  revalidatePath("/admin/shipping");
}

export async function deletePincodeRule(form: FormData) {
  await requireAdmin();
  await db.pincodeRule.delete({ where: { id: str(form, "id") } });
  revalidatePath("/admin/shipping");
}
