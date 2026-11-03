import { db } from "./db";
import type { StoreSettings } from "./store";

export type CouponResult = { ok: true; code: string; discount: number; label: string } | { ok: false; error: string };

/** Checks a coupon against the subtotal and returns the discount in rupees. */
export async function evaluateCoupon(rawCode: string, subtotal: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code" };
  const c = await db.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { ok: false, error: "This code isn't valid" };
  if (c.expiresAt && c.expiresAt < new Date()) return { ok: false, error: "This code has expired" };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { ok: false, error: "This code has been fully used" };
  if (subtotal < c.minOrder) return { ok: false, error: `Add ₹${c.minOrder - subtotal} more to use this code` };
  const discount = c.type === "PERCENT" ? Math.floor((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
  return { ok: true, code, discount, label: c.type === "PERCENT" ? `${c.value}% off` : `₹${c.value} off` };
}

export function computeShipping(store: StoreSettings, subtotalAfterDiscount: number) {
  return subtotalAfterDiscount >= store.freeShippingAbove ? 0 : store.shippingFee;
}
