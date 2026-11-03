import Link from "next/link";
import { notFound } from "next/navigation";
import { WhatsAppIcon } from "@/components/Icons";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDateTime, inr, waLink } from "@/lib/format";
import { getStore } from "@/lib/store";
import { getSavedSizes } from "@/lib/nailProfile";
import { KIT_SIZES, scanSchema, SEND_LATER, type Scan } from "@/lib/sizes";
import { FINGERS } from "@/lib/constants";
import { saveCustomerSizes, updateOrder } from "../../../actions";
import { Badge, PageTitle, Saved } from "../../ui";

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sizes?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [o, store] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } }), getStore()]);
  if (!o) notFound();
  const saved = await getSavedSizes(o.phone);
  const waitingForSizes = o.items.some((i) => i.measurements === SEND_LATER);
  const hasCustom = o.items.some((i) => i.size === "Custom");

  const first = o.name.split(" ")[0];
  const messages: [string, string][] = [
    ["Confirm COD order", `Hi ${first}! Thank you for ordering from ${store.name} 💅 Your order ${o.number} for ${inr(o.total)} (cash on delivery) is ready to be confirmed. Please reply YES to confirm.`],
    ["Ask for sizes", `Hi ${first}! For your made-to-measure order ${o.number}, please send the width of each nail in mm (thumb, index, middle, ring, pinky). Our sizing guide shows how: ${process.env.SITE_URL ?? ""}/sizing-guide`],
    ["Shipped", `Hi ${first}! Your ${store.name} order ${o.number} has shipped${o.courier ? ` with ${o.courier}` : ""}. ${o.trackingUrl ? `Track it here: ${o.trackingUrl}` : o.trackingNumber ? `Tracking no: ${o.trackingNumber}` : ""}`],
    ["Ask for review", `Hi ${first}! How do your new nails fit? 💕 We'd love a photo review. Reply with a picture and we'll send you ₹100 off your next set.`],
  ];

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-muted hover:text-ink">← All orders</Link>
      <PageTitle title={`Order ${o.number}`} sub={`Placed ${formatDateTime(o.createdAt)}`}>
        <div className="flex gap-2"><Badge value={o.status} /><Badge value={o.paymentStatus} label={o.paymentStatus === "PENDING" ? (o.paymentMethod === "COD" ? "Pay on delivery" : "Unpaid") : undefined} /></div>
      </PageTitle>
      <Saved show={sp.saved === "1"} />
      {sp.sizes === "invalid" && <p className="mb-6 rounded-xl bg-blush px-4 py-3 text-sm font-semibold text-berry-dark">Choose a size (0–11) for every finger.</p>}
      {waitingForSizes && (
        <p className="mb-6 rounded-xl bg-[#fdf0d5] px-4 py-3 text-sm font-semibold text-[#8a5a00]">
          Waiting for this customer&apos;s nail sizes. When they send them on WhatsApp, enter them in &ldquo;Nail sizes&rdquo; on the right.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="font-bold">Items to make & pack</h2>
            <ul className="mt-4 divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-4 text-sm">
                  <div>
                    <p className="font-semibold">{i.quantity} × {i.name}</p>
                    <p className="text-muted">{[i.shape, i.length, i.size === "Custom" ? "MADE TO MEASURE" : i.size && `Size ${i.size}`].filter(Boolean).join(" · ")}</p>
                    {i.measurements && <p className="mt-1 rounded-lg bg-blush px-2 py-1 text-xs font-semibold text-berry-dark">{i.measurements}</p>}
                    {readScans(i.scans).length > 0 && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {readScans(i.scans).map((sc) => <ScanView key={sc.url} scan={sc} />)}
                      </div>
                    )}
                  </div>
                  <p className="font-semibold">{inr(i.unitPrice * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Coupon {o.couponCode}</dt><dd>−{inr(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{inr(o.shipping)}</dd></div>
              {o.codFee > 0 && <div className="flex justify-between"><dt className="text-muted">COD fee</dt><dd>{inr(o.codFee)}</dd></div>}
              <div className="flex justify-between text-base font-bold"><dt>Total {o.paymentMethod === "COD" ? "(collect on delivery)" : ""}</dt><dd>{inr(o.total)}</dd></div>
            </dl>
          </section>

          <form action={updateOrder} className="card grid gap-4 p-6 sm:grid-cols-2">
            <input type="hidden" name="id" value={o.id} />
            <h2 className="font-bold sm:col-span-2">Update order</h2>
            <label>
              <span className="label">Order status</span>
              <select name="status" defaultValue={o.status} className="field">
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Payment</span>
              <select name="paymentStatus" defaultValue={o.paymentStatus} className="field">
                {["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Courier</span>
              <input name="courier" defaultValue={o.courier} className="field" placeholder="Delhivery, Bluedart, India Post…" />
            </label>
            <label>
              <span className="label">Tracking / AWB number</span>
              <input name="trackingNumber" defaultValue={o.trackingNumber} className="field" />
            </label>
            <label className="sm:col-span-2">
              <span className="label">Tracking link</span>
              <input name="trackingUrl" defaultValue={o.trackingUrl} className="field" placeholder="https://…" />
            </label>
            <label className="sm:col-span-2">
              <span className="label">Private notes</span>
              <textarea name="adminNotes" defaultValue={o.adminNotes} rows={3} className="field" />
            </label>
            <button className="btn-primary sm:col-span-2">Save changes</button>
            <p className="text-xs text-muted sm:col-span-2">Cancelling or marking “Returned to us” puts ready-made stock back automatically.</p>
          </form>
        </div>

        <div className="space-y-6">
          <section className="card p-6 text-sm">
            <h2 className="font-bold">Customer</h2>
            <p className="mt-3 leading-relaxed">
              <b>{o.name}</b><br />{o.phone}{o.email && <><br />{o.email}</>}
            </p>
            <h3 className="mt-5 font-bold">Ship to</h3>
            <p className="mt-2 leading-relaxed">
              {o.address1}{o.address2 && <><br />{o.address2}</>}<br />{o.city}, {o.state} {o.pincode}
            </p>
            {o.notes && (<><h3 className="mt-5 font-bold">Customer note</h3><p className="mt-2 rounded-xl bg-shell p-3">{o.notes}</p></>)}
            {o.razorpayPaymentId && <p className="mt-5 text-xs text-muted">Razorpay payment: {o.razorpayPaymentId}</p>}
          </section>
          <section className="card p-6">
            <h2 className="font-bold">WhatsApp the customer</h2>
            <p className="mt-1 text-xs text-muted">Opens WhatsApp with a ready message you can edit.</p>
            <div className="mt-4 space-y-2">
              {messages.map(([label, text]) => (
                <a key={label} href={waLink(`91${o.phone}`, text)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-medium transition hover:border-[#25D366] hover:bg-[#25D366]/5">
                  <WhatsAppIcon width={16} height={16} className="text-[#25D366]" /> {label}
                </a>
              ))}
            </div>
          </section>
          {(hasCustom || saved) && (
            <form action={saveCustomerSizes} className="card p-6">
              <input type="hidden" name="orderId" value={o.id} />
              <input type="hidden" name="phone" value={o.phone} />
              <h2 className="font-bold">Nail sizes</h2>
              <p className="mt-1 text-xs text-muted">
                {saved ? "Saved for this phone number. Future orders fill in automatically." : "Not saved yet. Enter the kit numbers the customer sends you."}
              </p>
              {(["r", "l"] as const).map((h) => (
                <div key={h} className="mt-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{h === "r" ? "Right hand" : "Left hand"}</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {FINGERS.map((f, i) => (
                      <label key={f} className="text-center">
                        <span className="text-[10px] font-semibold text-muted">{f}</span>
                        <select name={`${h}${i}`} defaultValue={saved ? String((h === "r" ? saved.right : saved.left)[i]) : ""} className="field mt-0.5 appearance-none px-0 py-2 text-center text-sm">
                          <option value="">–</option>
                          {KIT_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <label className="mt-3 flex items-center gap-2 text-xs">
                <input type="checkbox" name="same" defaultChecked={!saved} className="accent-berry" /> Left hand same as right
              </label>
              <button className="btn-primary mt-4 w-full py-2.5 text-xs">Save sizes</button>
            </form>
          )}
          <Link href={`/order/${o.id}`} target="_blank" className="btn-outline w-full text-xs">Customer&apos;s order page ↗</Link>
        </div>
      </div>
    </>
  );
}

function readScans(json: string): Scan[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.flatMap((x) => (scanSchema.safeParse(x).success ? [x as Scan] : [])) : [];
  } catch {
    return [];
  }
}

/** Customer's photo with the measuring lines they placed, so the artist can double-check. */
function ScanView({ scan }: { scan: Scan }) {
  const line = (a: [number, number], b: [number, number], color: string, key: string) => (
    <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
  );
  return (
    <figure className="rounded-xl bg-shell p-2">
      <a href={scan.url} target="_blank" rel="noreferrer" className="relative block overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={scan.url} alt={`${scan.hand} hand photo`} className="block w-full" />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {line(scan.card[0], scan.card[1], "#c9a36a", "card")}
          {scan.nails.map(([a, b], f) => line(a, b, "#e0567a", String(f)))}
        </svg>
      </a>
      <figcaption className="mt-1 text-[11px] text-muted">
        <b className="text-ink">{scan.hand === "right" ? "Right" : "Left"} hand photo</b> · {scan.mm.map((m, f) => `${FINGERS[f][0]} ${m}mm`).join(" · ")}
      </figcaption>
    </figure>
  );
}
