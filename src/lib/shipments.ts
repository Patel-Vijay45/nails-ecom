import "server-only";
import type { Order, OrderItem, Product } from "@prisma/client";
import { db } from "./db";
import { slugify } from "./format";
import {
  assignAwb,
  cancelShiprocketOrder,
  checkServiceability,
  createShiprocketOrder,
  generateLabel,
  generateManifest,
  orderStatusFor,
  requestPickup,
  ShiprocketError,
  shiprocketMode,
  trackAwb,
  trackingLink,
  type TrackingEvent,
  type TrackingUpdate,
} from "./shiprocket";
import type { StoreSettings } from "./store";

type FullOrder = Order & { items: (OrderItem & { product: Product | null })[] };

const LIVE_STEPS: Record<string, number> = { PENDING: 0, CONFIRMED: 1, IN_PRODUCTION: 2, PACKED: 3, SHIPPED: 4, DELIVERED: 5 };

/** Puts ready-made stock back (used when an order is cancelled or comes back to us). */
export async function restoreStock(order: Order & { items: OrderItem[] }) {
  for (const i of order.items) if (i.productId && i.size !== "Custom") await db.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
}

export const parcelKg = (grams: number) => Math.round(Math.max(50, grams || 150)) / 1000;
export const isCodToCollect = (o: Pick<Order, "paymentMethod" | "paymentStatus">) => o.paymentMethod === "COD" && o.paymentStatus !== "PAID";
export const dims = (s: StoreSettings) => ({ l: Math.max(1, s.boxLength), b: Math.max(1, s.boxBreadth), h: Math.max(1, s.boxHeight) });

export function readEvents(json: string): TrackingEvent[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((e) => e && typeof e.date === "string" && typeof e.activity === "string") : [];
  } catch {
    return [];
  }
}

/** Courier options for an order (for the admin "Book shipment" box). */
export function couriersForOrder(store: StoreSettings, o: Order) {
  return checkServiceability({ from: store.pickupPincode, to: o.pincode, weightKg: parcelKg(o.weightGrams), cod: isCodToCollect(o), value: o.total, dims: dims(store) });
}

/**
 * Delivery check for checkout: can a courier deliver to this pincode, can it collect cash, and in how many days.
 * Returns null when Shiprocket isn't set up or didn't answer, so checkout carries on as before.
 */
export async function deliveryInfo(store: StoreSettings, pincode: string, opts: { cod: boolean }) {
  if (shiprocketMode() === "off" || !/^\d{6}$/.test(store.pickupPincode)) return null;
  const base = { from: store.pickupPincode, to: pincode, weightKg: 0.5, dims: dims(store) };
  const [prepaid, cod] = await Promise.all([checkServiceability({ ...base, cod: false }), opts.cod ? checkServiceability({ ...base, cod: true }) : null]);
  if (prepaid.status !== "ok") return null;
  const best = prepaid.couriers.find((c) => c.recommended) ?? prepaid.couriers[0];
  const days = best ? (best.days ?? Math.min(...prepaid.couriers.map((c) => c.days ?? 99))) : null;
  return {
    deliverable: prepaid.deliverable,
    codAvailable: cod ? (cod.status === "ok" ? cod.deliverable : null) : null,
    days: days != null && days < 99 ? days : null,
  };
}

/**
 * Books the order with Shiprocket: creates the order, assigns the courier (AWB), requests pickup, and gets the label.
 * Each step is saved as it succeeds, so pressing the button again carries on from where it stopped.
 */
export async function bookShipment(orderId: string, store: StoreSettings, courierId?: number, rate?: number) {
  let o = (await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { product: true } } } })) as FullOrder;
  if (["CANCELLED", "RTO", "DELIVERED"].includes(o.status)) throw new ShiprocketError("This order is closed, so it can't be shipped.");
  if (!store.pickupLocation) throw new ShiprocketError("Choose your pickup location first in Admin → Shipping → Shiprocket.");
  const warnings: string[] = [];

  let justCreated = false;
  if (!o.srShipmentId) {
    const attempt = o.shipAttempts + 1;
    const used = new Map<string, number>();
    const items = o.items.map((i) => {
      const variant = [i.color, i.shape, i.length, i.size === "Custom" ? "Made to measure" : i.size && `Size ${i.size}`].filter(Boolean).join(", ");
      const base = [i.product?.slug ?? slugify(i.name), slugify(i.color)].filter(Boolean).join("-") || "item";
      const n = (used.get(base) ?? 0) + 1;
      used.set(base, n);
      return { name: variant ? `${i.name} (${variant})` : i.name, sku: n > 1 ? `${base}-${n}` : base, units: i.quantity, price: i.unitPrice };
    });
    const created = await createShiprocketOrder({
      // Shiprocket won't reuse the id of a cancelled order, so re-bookings get "-2", "-3"…
      orderId: attempt > 1 ? `${o.number}-${attempt}` : o.number,
      orderDate: o.createdAt,
      pickupLocation: store.pickupLocation,
      name: o.name,
      address1: o.address1,
      address2: o.address2,
      city: o.city,
      state: o.state,
      pincode: o.pincode,
      email: o.email || store.email,
      phone: o.phone,
      items,
      cod: isCodToCollect(o),
      subtotal: o.subtotal,
      discount: o.discount,
      shipping: o.shipping,
      codFee: o.codFee,
      weightKg: parcelKg(o.weightGrams),
      dims: dims(store),
    });
    o = (await db.order.update({ where: { id: o.id }, data: { ...created, shipAttempts: attempt }, include: { items: { include: { product: true } } } })) as FullOrder;
    justCreated = true;
  }

  // A tracking number typed by hand earlier is replaced by the one Shiprocket assigns.
  if (justCreated || !o.trackingNumber) {
    const awb = await assignAwb(o.srShipmentId!, courierId);
    o = (await db.order.update({
      where: { id: o.id },
      data: {
        trackingNumber: awb.awb,
        courier: awb.courier,
        trackingUrl: trackingLink(awb.awb),
        shippingCost: rate && rate > 0 ? Math.round(rate) : o.shippingCost,
        status: (LIVE_STEPS[o.status] ?? 0) < LIVE_STEPS.PACKED ? "PACKED" : o.status,
      },
      include: { items: { include: { product: true } } },
    })) as FullOrder;
  }

  const extra: Partial<Order> = {};
  if (!o.pickupDate) {
    try {
      extra.pickupDate = (await requestPickup(o.srShipmentId!)).pickupDate || "requested";
    } catch (e) {
      warnings.push((e as Error).message);
    }
  }
  if (!o.labelUrl) {
    try {
      extra.labelUrl = await generateLabel(o.srShipmentId!);
    } catch (e) {
      warnings.push((e as Error).message);
    }
  }
  if (!o.manifestUrl && (o.pickupDate || extra.pickupDate)) {
    try {
      extra.manifestUrl = await generateManifest(o.srShipmentId!);
    } catch {
      // Optional: the courier can still collect without a printed manifest.
    }
  }
  if (Object.keys(extra).length) await db.order.update({ where: { id: o.id }, data: extra });
  return { warnings };
}

/** Cancels the Shiprocket booking (before pickup) so the order can be booked again. */
export async function cancelShipment(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (o.srOrderId) await cancelShiprocketOrder(o.srOrderId);
  await db.order.update({
    where: { id: o.id },
    data: { srOrderId: null, srShipmentId: null, trackingNumber: "", trackingUrl: "", courier: "", labelUrl: "", manifestUrl: "", pickupDate: "", shipStatus: "", expectedDelivery: "", trackingEvents: "[]" },
  });
}

/** Saves a tracking update (from the webhook or "Refresh tracking") and moves the order status forward. */
export async function applyTracking(orderId: string, u: TrackingUpdate) {
  const o = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!o) return null;
  const stored = readEvents(o.trackingEvents);
  // Ignore updates older than what we already have (webhooks can arrive out of order).
  if (u.events.length && stored.length && u.events[0].date < stored[0].date) return o;

  const target = orderStatusFor(u.status);
  let status = o.status;
  let paymentStatus = o.paymentStatus;
  if (target && !["CANCELLED", "RTO", "DELIVERED"].includes(o.status)) {
    if (target === "RTO") {
      status = "RTO";
      await restoreStock(o);
    } else if (LIVE_STEPS[target] > (LIVE_STEPS[o.status] ?? 0)) status = target;
  }
  // The courier collected the cash.
  if (status === "DELIVERED" && o.paymentMethod === "COD" && o.paymentStatus === "PENDING") paymentStatus = "PAID";

  return db.order.update({
    where: { id: o.id },
    data: {
      status,
      paymentStatus,
      shipStatus: u.status || o.shipStatus,
      expectedDelivery: u.etd || o.expectedDelivery,
      trackingEvents: u.events.length ? JSON.stringify(u.events) : o.trackingEvents,
    },
  });
}

export async function refreshTracking(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!o.trackingNumber) throw new ShiprocketError("No AWB on this order yet.");
  const u = await trackAwb(o.trackingNumber);
  if (!u) return { updated: false };
  await applyTracking(o.id, u);
  return { updated: true };
}
