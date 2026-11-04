import Link from "next/link";
import type { Order, OrderItem } from "@prisma/client";
import { inr } from "@/lib/format";
import { shiprocketMode } from "@/lib/shiprocket";
import { couriersForOrder, isCodToCollect, parcelKg, readEvents } from "@/lib/shipments";
import { SEND_LATER } from "@/lib/sizes";
import type { StoreSettings } from "@/lib/store";
import { bookShipmentAction, cancelShipmentAction, refreshTrackingAction } from "../../../actions";
import ConfirmButton from "../../ConfirmButton";

const TONE = { ok: "bg-[#e3ede6] text-[#2f6b44]", warn: "bg-[#fdf0d5] text-[#8a5a00]", error: "bg-blush text-berry-dark" } as const;

/** "Shipment" box on the admin order page: compare couriers, book, print label, track, cancel. */
export default async function ShipmentPanel({ o, store, flash }: { o: Order & { items: OrderItem[] }; store: StoreSettings; flash?: { tone: string; msg: string } }) {
  const mode = shiprocketMode();
  const booked = Boolean(o.srShipmentId && o.trackingNumber);
  const byHand = Boolean(o.trackingNumber && !o.srShipmentId);
  const closed = ["CANCELLED", "RTO", "DELIVERED"].includes(o.status);
  const canBook = mode !== "off" && !booked && !byHand && !closed && Boolean(store.pickupLocation && store.pickupPincode);
  const options = canBook ? await couriersForOrder(store, o) : null;
  const events = readEvents(o.trackingEvents);
  const cod = isCodToCollect(o);
  const tone = flash && flash.tone in TONE ? TONE[flash.tone as keyof typeof TONE] : null;
  const checks = [
    o.paymentMethod === "COD" && o.status === "PENDING" && "This COD order isn't confirmed yet. Confirm it on WhatsApp first to avoid a refused parcel.",
    o.paymentMethod === "ONLINE" && o.paymentStatus !== "PAID" && "This online order isn't paid.",
    o.items.some((i) => i.measurements === SEND_LATER) && "Still waiting for this customer's nail sizes.",
  ].filter(Boolean) as string[];

  return (
    <section id="shipment" className="card scroll-mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Shipment</h2>
        {mode === "demo" && <span className="rounded-full bg-[#fdf0d5] px-2.5 py-1 text-[11px] font-bold text-[#8a5a00]">Shiprocket demo mode: nothing is really booked</span>}
      </div>
      {tone && <p className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${tone}`}>{flash!.msg}</p>}

      {mode === "off" && !o.trackingNumber && (
        <p className="mt-3 text-sm text-muted">
          Connect Shiprocket to compare couriers and book pickups from here. See{" "}
          <Link href="/admin/shipping#shiprocket" className="font-semibold text-berry">Admin → Shipping</Link>. Until then, enter the courier and tracking number below.
        </p>
      )}
      {mode !== "off" && !booked && !byHand && !closed && !(store.pickupLocation && store.pickupPincode) && (
        <p className="mt-3 text-sm text-muted">
          Choose your pickup address first in <Link href="/admin/shipping#shiprocket" className="font-semibold text-berry">Admin → Shipping</Link>.
        </p>
      )}
      {byHand && (
        <p className="mt-3 text-sm">
          Shipped by hand: <b>{o.courier || "courier"}</b> · {o.trackingNumber}
        </p>
      )}

      {booked && (
        <div className="mt-4 space-y-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div><dt className="text-xs text-muted">Courier</dt><dd className="font-semibold">{o.courier}</dd></div>
            <div><dt className="text-xs text-muted">AWB</dt><dd className="font-semibold" data-testid="awb">{o.trackingNumber}</dd></div>
            <div><dt className="text-xs text-muted">Pickup</dt><dd className="font-semibold">{o.pickupDate && o.pickupDate !== "requested" ? o.pickupDate : o.pickupDate ? "Requested" : "Not booked yet"}</dd></div>
            <div><dt className="text-xs text-muted">Latest status</dt><dd className="font-semibold" data-testid="ship-status">{o.shipStatus || "Waiting for pickup"}</dd></div>
            {o.expectedDelivery && <div><dt className="text-xs text-muted">Expected delivery</dt><dd className="font-semibold">{o.expectedDelivery}</dd></div>}
            <div><dt className="text-xs text-muted">{cod ? "Cash to collect" : "Payment"}</dt><dd className="font-semibold">{cod ? inr(o.total) : "Prepaid"}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {o.labelUrl && <a href={o.labelUrl} target="_blank" rel="noreferrer" className="btn-primary py-2.5 text-xs">Print label</a>}
            {o.manifestUrl && <a href={o.manifestUrl} target="_blank" rel="noreferrer" className="btn-outline py-2.5 text-xs">Manifest</a>}
            {o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="btn-outline py-2.5 text-xs">Tracking page ↗</a>}
            <form action={refreshTrackingAction}>
              <input type="hidden" name="id" value={o.id} />
              <button className="btn-outline py-2.5 text-xs">Refresh tracking</button>
            </form>
            {(!o.labelUrl || !o.pickupDate) && (
              <form action={bookShipmentAction}>
                <input type="hidden" name="id" value={o.id} />
                <button className="btn-outline py-2.5 text-xs">Try again: {[!o.pickupDate && "pickup", !o.labelUrl && "label"].filter(Boolean).join(" + ")}</button>
              </form>
            )}
            {!["SHIPPED", "DELIVERED", "RTO"].includes(o.status) && (
              <form action={cancelShipmentAction}>
                <input type="hidden" name="id" value={o.id} />
                <ConfirmButton message="Cancel this shipment in Shiprocket? The courier won't come for it, and you can book it again." className="btn-ghost py-2.5 text-xs text-berry">
                  Cancel shipment
                </ConfirmButton>
              </form>
            )}
          </div>
          {events.length > 0 && (
            <ol className="space-y-2 border-t border-line pt-4" data-testid="tracking-events">
              {events.slice(0, 8).map((e, i) => (
                <li key={`${e.date}-${i}`} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i === 0 ? "bg-berry" : "bg-line"}`} />
                  <span>
                    <b className={i === 0 ? "" : "font-medium text-muted"}>{e.activity}</b>
                    <span className="block text-xs text-muted">{[e.location, e.date].filter(Boolean).join(" · ")}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {canBook && options && (
        <form action={bookShipmentAction} className="mt-4 space-y-3 text-sm">
          <input type="hidden" name="id" value={o.id} />
          <p className="text-muted">
            Parcel {parcelKg(o.weightGrams)} kg · box {store.boxLength}×{store.boxBreadth}×{store.boxHeight} cm · {o.pincode} ·{" "}
            <b className="text-ink">{cod ? `COD: courier collects ${inr(o.total)}` : "Prepaid"}</b>
          </p>
          {checks.map((c) => <p key={c} className="rounded-xl bg-[#fdf0d5] px-4 py-2.5 text-[#8a5a00]">{c}</p>)}
          {options.status === "unavailable" && <p className="rounded-xl bg-blush px-4 py-3 text-berry-dark">Couldn&apos;t load courier prices: {options.message}</p>}
          {options.status === "ok" && !options.deliverable && (
            <p className="rounded-xl bg-blush px-4 py-3 text-berry-dark">
              No courier serves {o.pincode} for this parcel{cod ? " with cash on delivery. Ask the customer to pay online, then mark the order Paid" : ""}.
            </p>
          )}
          {options.status === "ok" && options.deliverable && (
            <div className="space-y-2" data-testid="courier-options">
              {options.couriers.slice(0, 8).map((c, i) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-ink has-[:checked]:bg-shell">
                  <input type="radio" name="courier" value={`${c.id}:${c.rate}`} defaultChecked={i === 0} className="h-4 w-4 accent-berry" />
                  <span className="flex-1">
                    <b>{c.name}</b> {c.recommended && <span className="ml-1 rounded-full bg-[#e3ede6] px-2 py-0.5 text-[10px] font-bold text-[#2f6b44]">Recommended</span>}
                    <span className="block text-xs text-muted">
                      {[c.days != null && `${c.days} day${c.days === 1 ? "" : "s"}`, c.etd && `by ${c.etd}`, c.rating != null && `★ ${c.rating}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <b>{inr(c.rate)}</b>
                </label>
              ))}
            </div>
          )}
          {(options.status === "unavailable" || options.deliverable) && (
            <ConfirmButton message="Book this courier? Shiprocket charges the shipping from your wallet." className="btn-primary w-full py-3">
              {options.status === "ok" ? "Book shipment" : "Book with Shiprocket's pick"}
            </ConfirmButton>
          )}
          <p className="text-xs text-muted">Booking assigns the AWB, requests pickup and makes the label. The order moves to Packed; tracking moves it to Shipped and Delivered.</p>
        </form>
      )}
    </section>
  );
}
