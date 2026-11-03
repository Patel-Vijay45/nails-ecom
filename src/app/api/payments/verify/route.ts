import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { razorpayEnabled, verifyRazorpaySignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  if (!razorpayEnabled()) return NextResponse.json({ ok: false }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = b ?? {};
  if (![orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === "string")) {
    return NextResponse.json({ ok: false, error: "Missing payment details" }, { status: 400 });
  }
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.razorpayOrderId !== razorpay_order_id) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    return NextResponse.json({ ok: false, error: "Payment could not be verified" }, { status: 400 });
  }
  await db.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", razorpayPaymentId: razorpay_payment_id, status: order.status === "PENDING" ? "CONFIRMED" : order.status },
  });
  return NextResponse.json({ ok: true });
}
