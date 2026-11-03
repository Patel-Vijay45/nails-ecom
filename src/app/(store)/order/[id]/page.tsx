import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, WhatsAppIcon } from "@/components/Icons";
import { STATUS_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDateTime, inr, waLink } from "@/lib/format";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const STEPS = ["CONFIRMED", "IN_PRODUCTION", "PACKED", "SHIPPED", "DELIVERED"];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, store] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: true } }), getStore()]);
  if (!order) notFound();

  const needsSizes = order.items.some((i) => i.measurements.startsWith("Customer will send"));
  const stepIndex = STEPS.indexOf(order.status);
  const stopped = order.status === "CANCELLED" || order.status === "RTO";
  const waText =
    order.paymentMethod === "COD" && order.status === "PENDING"
      ? `Hi! I've placed order ${order.number} (${inr(order.total)}, cash on delivery). Please confirm it.`
      : `Hi! This is about my order ${order.number}.`;

  return (
    <div className="container-x max-w-4xl pt-12">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-berry text-white">
          <CheckIcon width={30} height={30} />
        </span>
        <p className="eyebrow mt-6">Order {order.number}</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">Thank you, {order.name.split(" ")[0]}!</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          {order.paymentMethod === "COD" && order.status === "PENDING"
            ? "Your order is saved. We'll message you on WhatsApp to confirm it before we start. You can also confirm it now:"
            : order.paymentStatus === "PAID"
              ? "Payment received. Your nails are now in the queue to be hand-painted."
              : order.paymentMethod === "ONLINE" && order.paymentStatus !== "PAID"
                ? "Your order is saved, but the payment isn't complete yet. Message us on WhatsApp and we'll send you a payment link."
                : "We'll keep you updated on WhatsApp."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={waLink(store.whatsapp, waText)} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95">
            <WhatsAppIcon /> {order.status === "PENDING" && order.paymentMethod === "COD" ? "Confirm on WhatsApp" : "Message us"}
          </a>
          <Link href="/shop" className="btn-outline">
            Continue shopping
          </Link>
        </div>
        {needsSizes && (
          <p className="mx-auto mt-6 max-w-xl rounded-2xl bg-blush px-5 py-4 text-sm text-berry-dark">
            Don&apos;t forget to send your nail sizes on WhatsApp. We start painting as soon as we have them.
          </p>
        )}
      </div>

      <section className="card mt-12 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Status</h2>
          <span className="rounded-full bg-shell px-3 py-1 text-sm font-semibold">{STATUS_LABEL[order.status] ?? order.status}</span>
        </div>
        {!stopped && (
          <ol className="mt-6 grid grid-cols-5 gap-2">
            {STEPS.map((s, i) => (
              <li key={s} className="text-center">
                <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-berry" : "bg-line"}`} />
                <p className={`mt-2 text-[11px] font-semibold leading-tight sm:text-xs ${i <= stepIndex ? "text-ink" : "text-muted"}`}>{STATUS_LABEL[s]}</p>
              </li>
            ))}
          </ol>
        )}
        {order.trackingUrl || order.trackingNumber ? (
          <p className="mt-6 text-sm">
            {order.courier && <b>{order.courier}: </b>}
            {order.trackingNumber}{" "}
            {order.trackingUrl && (
              <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-berry underline">
                Track shipment
              </a>
            )}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-muted">Placed {formatDateTime(order.createdAt)} · {store.dispatchDays}</p>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold">Items</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>
                  {i.quantity} × {i.name}
                  <span className="block text-xs text-muted">
                    {[i.shape, i.length, i.size === "Custom" ? "Made to measure" : i.size && `Size ${i.size}`].filter(Boolean).join(" · ")}
                  </span>
                  {i.measurements && <span className="block text-xs text-muted">{i.measurements}</span>}
                </span>
                <span className="font-semibold">{inr(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount ({order.couponCode})</dt><dd className="text-berry">−{inr(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shipping ? inr(order.shipping) : "Free"}</dd></div>
            {order.codFee > 0 && <div className="flex justify-between"><dt className="text-muted">COD fee</dt><dd>{inr(order.codFee)}</dd></div>}
            <div className="flex justify-between pt-2 text-base font-bold"><dt>Total</dt><dd>{inr(order.total)}</dd></div>
          </dl>
        </div>
        <div className="card p-6 text-sm">
          <h2 className="font-bold">Delivering to</h2>
          <p className="mt-4 leading-relaxed">
            {order.name}
            <br />
            {order.address1}
            {order.address2 && <><br />{order.address2}</>}
            <br />
            {order.city}, {order.state} {order.pincode}
            <br />
            {order.phone}
          </p>
          <h2 className="mt-6 font-bold">Payment</h2>
          <p className="mt-2">
            {order.paymentMethod === "COD" ? "Cash on delivery" : "Online (Razorpay)"} ·{" "}
            <span className={order.paymentStatus === "PAID" ? "font-semibold text-[#2f7a4b]" : "text-muted"}>{order.paymentStatus === "PAID" ? "Paid" : order.paymentMethod === "COD" ? "Pay on delivery" : "Not paid yet"}</span>
          </p>
          <p className="mt-6 text-xs text-muted">Save this page, or track it any time with your order number and phone at <Link href="/track" className="underline">Track order</Link>.</p>
        </div>
      </section>
    </div>
  );
}
