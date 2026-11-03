import { NextResponse } from "next/server";
import { CheckoutError, checkoutSchema, placeOrder } from "@/lib/orders";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[i.path.join(".")] ??= i.message;
    return NextResponse.json({ ok: false, error: "Please check your details", errors }, { status: 400 });
  }
  try {
    const { order, razorpay } = await placeOrder(parsed.data);
    const store = await getStore();
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      number: order.number,
      razorpay: razorpay && { ...razorpay, name: store.name, prefill: { name: order.name, contact: order.phone, email: order.email } },
    });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("Order failed", e);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again or message us on WhatsApp." }, { status: 500 });
  }
}
