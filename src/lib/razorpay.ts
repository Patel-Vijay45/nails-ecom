import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";

export const razorpayEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export async function createRazorpayOrder(amountRupees: number, receipt: string) {
  const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
  return rz.orders.create({ amount: amountRupees * 100, currency: "INR", receipt });
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
