import "server-only";
import { randomInt } from "crypto";
import { z } from "zod";
import { SIZES } from "./constants";
import { db } from "./db";
import { parseList } from "./format";
import { computeShipping, evaluateCoupon } from "./pricing";
import { createRazorpayOrder, razorpayEnabled } from "./razorpay";
import { getStore } from "./store";
import { getSavedSizes, saveSizes } from "./nailProfile";
import { parseColors } from "./colors";
import { formatSizes, scanSchema, SEND_LATER, sizesSchema, type NailSizes } from "./sizes";

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(10),
        shape: z.string().max(30).default(""),
        length: z.string().max(30).default(""),
        size: z.string().max(10).default(""),
        color: z.string().max(40).default(""),
        measurements: z.string().max(200).default(""),
        sizes: sizesSchema.optional(),
        scans: z.array(scanSchema).max(2).optional(),
      }),
    )
    .min(1, "Your bag is empty")
    .max(30),
  customer: z.object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
    email: z.union([z.literal(""), z.email("Enter a valid email")]).default(""),
    address1: z.string().trim().min(5, "Enter your house / flat and street").max(160),
    address2: z.string().trim().max(160).default(""),
    city: z.string().trim().min(2, "Enter your city").max(60),
    state: z.string().trim().min(2, "Choose your state").max(60),
    pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
    notes: z.string().trim().max(500).default(""),
  }),
  coupon: z.string().trim().max(30).default(""),
  paymentMethod: z.enum(["COD", "ONLINE"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {}

async function newOrderNumber(prefix: string) {
  for (let i = 0; i < 5; i++) {
    const n = `${prefix}${randomInt(100000, 999999)}`;
    if (!(await db.order.findUnique({ where: { number: n } }))) return n;
  }
  return `${prefix}${Date.now()}`;
}

/** Validates the cart against the database, prices it, saves the order and (for online payment) opens a Razorpay order. */
export async function placeOrder(input: CheckoutInput) {
  const store = await getStore();
  if (input.paymentMethod === "COD" && !store.codEnabled) throw new CheckoutError("Cash on delivery isn't available right now");
  if (input.paymentMethod === "ONLINE" && !razorpayEnabled()) throw new CheckoutError("Online payment isn't set up yet. Please choose cash on delivery.");

  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const savedSizes = await getSavedSizes(input.customer.phone);
  let sizesToSave: NailSizes | null = null;

  const lines = input.items.map((i) => {
    const p = byId.get(i.productId);
    if (!p) throw new CheckoutError("One of the items in your bag is no longer available. Please remove it and try again.");
    const shapes = parseList(p.shapes);
    const lengths = parseList(p.lengths);
    const hasOptions = shapes.length > 0;
    const custom = i.size === "Custom";
    if (hasOptions) {
      if (!shapes.includes(i.shape)) throw new CheckoutError(`Please choose a shape for ${p.name}`);
      if (lengths.length && !lengths.includes(i.length)) throw new CheckoutError(`Please choose a length for ${p.name}`);
      if (!custom && !(SIZES as readonly string[]).includes(i.size)) throw new CheckoutError(`Please choose a size for ${p.name}`);
      if (custom && !p.madeToMeasure) throw new CheckoutError(`${p.name} isn't available made to measure`);
    }
    // Made to measure: use the sizes they picked, else their saved sizes, else they'll send them on WhatsApp.
    let measurements = "";
    if (hasOptions && custom) {
      if (i.sizes) {
        measurements = formatSizes(i.sizes);
        sizesToSave = i.sizes;
      } else if (savedSizes) measurements = `${formatSizes(savedSizes)} (saved sizes)`;
      else if (i.measurements === SEND_LATER) measurements = SEND_LATER;
      else throw new CheckoutError(`Please choose your nail sizes for ${p.name}`);
    }
    const colors = parseColors(p.colors);
    const colorOpt = colors.find((c) => c.name === i.color);
    if (colors.length && !colorOpt) throw new CheckoutError(`Please choose a colour for ${p.name}`);
    const unitPrice = p.price + (colorOpt?.extra ?? 0) + (custom ? p.madeToMeasureFee : 0);
    return {
      product: p,
      custom,
      data: {
        productId: p.id,
        name: p.name,
        unitPrice,
        quantity: i.quantity,
        shape: hasOptions ? i.shape : "",
        length: hasOptions ? i.length : "",
        size: hasOptions ? i.size : "",
        color: colorOpt?.name ?? "",
        measurements,
        scans: custom && i.sizes && i.scans?.length ? JSON.stringify(i.scans) : "[]",
      },
    };
  });

  // Stock applies to ready-made items (standard sizes and extras), not made-to-measure.
  const need = new Map<string, number>();
  for (const l of lines) if (!l.custom) need.set(l.product.id, (need.get(l.product.id) ?? 0) + l.data.quantity);
  for (const [id, qty] of need) {
    const p = byId.get(id)!;
    if (p.stock < qty) throw new CheckoutError(p.stock > 0 ? `Only ${p.stock} of ${p.name} left in stock` : `${p.name} is sold out in standard sizes`);
  }

  const subtotal = lines.reduce((n, l) => n + l.data.unitPrice * l.data.quantity, 0);
  let discount = 0;
  let couponCode: string | null = null;
  if (input.coupon) {
    const c = await evaluateCoupon(input.coupon, subtotal);
    if (!c.ok) throw new CheckoutError(c.error);
    discount = c.discount;
    couponCode = c.code;
  }
  const shipping = computeShipping(store, subtotal - discount);
  const codFee = input.paymentMethod === "COD" ? store.codFee : 0;
  const total = Math.max(0, subtotal - discount + shipping + codFee);
  const number = await newOrderNumber(store.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "OR");

  const order = await db.$transaction(async (tx) => {
    for (const [id, qty] of need) {
      const res = await tx.product.updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
      if (res.count === 0) throw new CheckoutError("Sorry, an item just sold out. Please review your bag.");
    }
    if (couponCode) await tx.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
    return tx.order.create({
      data: {
        number,
        paymentMethod: input.paymentMethod,
        ...input.customer,
        subtotal,
        discount,
        shipping,
        codFee,
        total,
        couponCode,
        items: { create: lines.map((l) => l.data) },
      },
    });
  });

  if (sizesToSave) await saveSizes(input.customer.phone, sizesToSave);

  if (input.paymentMethod === "ONLINE") {
    const rz = await createRazorpayOrder(total, order.number);
    await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: rz.id } });
    return { order, razorpay: { keyId: process.env.RAZORPAY_KEY_ID!, orderId: rz.id, amount: total * 100 } };
  }
  return { order, razorpay: null };
}

