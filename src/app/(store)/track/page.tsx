import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Track your order" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ number?: string; phone?: string }> }) {
  const sp = await searchParams;
  let error = "";
  if (sp.number && sp.phone) {
    const order = await db.order.findUnique({ where: { number: sp.number.trim().toUpperCase() } });
    if (order && order.phone === sp.phone.replace(/\D/g, "").slice(-10)) redirect(`/order/${order.id}`);
    error = "We couldn't find an order with that number and phone. Please check and try again.";
  }
  return (
    <div className="container-x max-w-lg pt-16">
      <p className="eyebrow">Where are my nails?</p>
      <h1 className="display mt-3 text-5xl">Track your order</h1>
      <p className="mt-4 text-muted">Enter the order number from your confirmation and the phone number you ordered with.</p>
      <form className="card mt-8 space-y-4 p-6">
        <label className="block">
          <span className="label">Order number</span>
          <input name="number" defaultValue={sp.number} required placeholder="e.g. NA123456" className="field uppercase" />
        </label>
        <label className="block">
          <span className="label">Phone</span>
          <input name="phone" defaultValue={sp.phone} required inputMode="numeric" placeholder="10-digit mobile" className="field" />
        </label>
        {error && <p className="rounded-xl bg-blush px-4 py-3 text-sm text-berry-dark">{error}</p>}
        <button className="btn-primary w-full py-4">Track order</button>
      </form>
    </div>
  );
}
