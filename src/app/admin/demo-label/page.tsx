import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { shiprocketMode } from "@/lib/shiprocket";
import { isCodToCollect, parcelKg } from "@/lib/shipments";
import { getStore } from "@/lib/store";

export const metadata = { title: "Demo label", robots: { index: false } };

// Shiprocket demo mode only: a pretend shipping label, so the "Print label" button has something to show.
export default async function DemoLabel({ searchParams }: { searchParams: Promise<{ awb?: string; manifest?: string }> }) {
  await requireAdmin();
  if (shiprocketMode() !== "demo") notFound();
  const { awb, manifest } = await searchParams;
  const [o, store] = await Promise.all([awb ? db.order.findFirst({ where: { trackingNumber: awb } }) : null, getStore()]);
  if (!o) notFound();
  return (
    <div className="mx-auto my-10 max-w-md border-2 border-dashed border-ink bg-white p-6 font-mono text-sm text-ink">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-berry">Demo {manifest ? "manifest" : "label"}, not a real shipment</p>
      <p className="mt-4 text-lg font-bold">{o.courier}</p>
      <p className="mt-1 text-2xl font-bold tracking-wider">AWB {o.trackingNumber}</p>
      <div className="mt-3 h-14 bg-[repeating-linear-gradient(90deg,#1f1a1c_0_2px,transparent_2px_5px,#1f1a1c_5px_6px,transparent_6px_9px)]" />
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink pt-4">
        <div>
          <p className="text-xs font-bold">SHIP TO</p>
          <p>{o.name}<br />{o.address1}{o.address2 && <><br />{o.address2}</>}<br />{o.city}, {o.state}<br />{o.pincode} · {o.phone}</p>
        </div>
        <div>
          <p className="text-xs font-bold">FROM</p>
          <p>{store.name}<br />{store.pickupLocation} · {store.pickupPincode}</p>
        </div>
      </div>
      <p className="mt-4 border-t border-ink pt-4 font-bold">{isCodToCollect(o) ? `COD · COLLECT ${inr(o.total)}` : "PREPAID · DO NOT COLLECT CASH"}</p>
      <p className="mt-1 text-xs">Order {o.number} · {parcelKg(o.weightGrams)} kg · {store.boxLength}×{store.boxBreadth}×{store.boxHeight} cm</p>
    </div>
  );
}
