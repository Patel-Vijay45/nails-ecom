import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { findPincodeRule, lookupPincode } from "@/lib/pincode";
import { computeShipping } from "@/lib/pricing";
import { checkServiceability, pickupLocations, shiprocketMode, walletBalance } from "@/lib/shiprocket";
import { dims } from "@/lib/shipments";
import { getStore } from "@/lib/store";
import { deletePincodeRule, savePincodeRule, saveShiprocketSettings } from "../../actions";
import { PageTitle, Saved } from "../ui";

export default async function Shipping({ searchParams }: { searchParams: Promise<{ test?: string; saved?: string }> }) {
  const sp = await searchParams;
  const [store, rules, costed] = await Promise.all([
    getStore(),
    db.pincodeRule.findMany({ orderBy: { prefix: "asc" } }),
    db.order.aggregate({ where: { shippingCost: { not: null }, status: { notIn: ["CANCELLED"] } }, _sum: { shipping: true, shippingCost: true }, _count: { _all: true } }),
  ]);
  const test = sp.test && /^\d{6}$/.test(sp.test) ? sp.test : null;
  const [info, rule] = test ? await Promise.all([lookupPincode(test), findPincodeRule(test)]) : [null, null];

  // Shiprocket connection: pickup addresses and wallet balance (also proves the login works).
  const mode = shiprocketMode();
  let locations: Awaited<ReturnType<typeof pickupLocations>> | null = null;
  let balance: number | null = null;
  let connectError = "";
  if (mode !== "off") {
    try {
      [locations, balance] = await Promise.all([pickupLocations(), walletBalance()]);
    } catch (e) {
      connectError = (e as Error).message;
    }
  }
  const ready = mode !== "off" && Boolean(store.pickupLocation && store.pickupPincode);
  const service = test && ready ? await checkServiceability({ from: store.pickupPincode, to: test, weightKg: 0.5, cod: false, dims: dims(store) }) : null;
  const serviceCod = test && ready && store.codEnabled ? await checkServiceability({ from: store.pickupPincode, to: test, weightKg: 0.5, cod: true, dims: dims(store) }) : null;
  const webhookUrl = `${(process.env.SITE_URL || "https://your-shop.in").replace(/\/+$/, "")}/api/delivery-updates`;

  return (
    <>
      <PageTitle title="Shipping" sub="Base fees, remote-area rules by pincode, courier booking with Shiprocket, and what shipping really costs you." />
      <Saved show={sp.saved === "1"} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Base shipping</p>
          <p className="mt-2 text-2xl font-bold">{inr(store.shippingFee)}</p>
          <p className="text-xs text-muted">Free above {inr(store.freeShippingAbove)} · COD fee {store.codEnabled ? inr(store.codFee) : "COD off"}</p>
          <Link href="/admin/settings" className="mt-2 inline-block text-xs font-semibold text-berry">Change in Settings →</Link>
        </div>
        <div className="card p-5 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Real shipping cost vs charged</p>
          {costed._count._all ? (
            <>
              <p className="mt-2 text-2xl font-bold">
                {inr((costed._sum.shippingCost ?? 0) / costed._count._all)} <span className="text-base font-normal text-muted">avg cost per order</span>
              </p>
              <p className="text-xs text-muted">
                Across {costed._count._all} orders with a cost entered: charged {inr(costed._sum.shipping ?? 0)}, paid couriers {inr(costed._sum.shippingCost ?? 0)} ·{" "}
                <b className={(costed._sum.shipping ?? 0) >= (costed._sum.shippingCost ?? 0) ? "text-[#2f6b44]" : "text-berry"}>
                  {(costed._sum.shipping ?? 0) >= (costed._sum.shippingCost ?? 0) ? "covered" : `short by ${inr((costed._sum.shippingCost ?? 0) - (costed._sum.shipping ?? 0))}`}
                </b>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Enter the courier&apos;s real charge on each order (order page → &ldquo;Real shipping cost&rdquo;) to see this.</p>
          )}
        </div>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="font-bold">Test a pincode</h2>
        <form className="mt-3 flex flex-wrap gap-2">
          <input name="test" defaultValue={sp.test} inputMode="numeric" maxLength={6} placeholder="e.g. 380015" className="field max-w-48" />
          <button className="btn-primary py-3">Check</button>
        </form>
        {test && (
          <div className="mt-4 rounded-2xl bg-shell p-4 text-sm">
            <p>
              <b>{test}</b>: {info?.found ? `${info.city}, ${info.state || "state not matched"}` : info?.unavailable ? "pincode lookup service didn't answer (checkout still works; customers type the address)" : "not found in the pincode directory"}
            </p>
            <p className="mt-1">
              Rule: {rule ? <>prefix <b>{rule.prefix}</b>{rule.note && ` (${rule.note})`} · extra {inr(rule.extraShipping)} · COD {rule.codAllowed ? "allowed" : "not allowed"}</> : "none, normal shipping"}
            </p>
            {service && (
              <div className="mt-2" data-testid="test-couriers">
                {service.status === "unavailable" ? (
                  <p className="text-berry">Shiprocket: {service.message}</p>
                ) : !service.deliverable ? (
                  <p className="font-semibold text-berry">Shiprocket: no courier delivers here. Checkout {store.blockUndeliverable ? "refuses" : "allows"} orders to this pincode.</p>
                ) : (
                  <>
                    <p>
                      Couriers (0.5 kg, prepaid): {service.couriers.slice(0, 4).map((c) => `${c.name} ${inr(c.rate)}${c.days != null ? ` · ${c.days}d` : ""}`).join(" | ")}
                    </p>
                    {serviceCod?.status === "ok" && <p>Cash on delivery: {serviceCod.deliverable ? "available" : <b className="text-berry">no courier collects cash here</b>}</p>}
                  </>
                )}
              </div>
            )}
            <p className="mt-1 text-muted">
              Shipping on a {inr(store.freeShippingAbove - 1)} order: {inr(computeShipping(store, store.freeShippingAbove - 1) + (rule?.extraShipping ?? 0))} · on a {inr(store.freeShippingAbove)} order: {inr(computeShipping(store, store.freeShippingAbove) + (rule?.extraShipping ?? 0))}
            </p>
          </div>
        )}
      </section>

      <section id="shiprocket" className="card mt-6 scroll-mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Shiprocket courier booking</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${mode === "live" && !connectError ? "bg-[#e3ede6] text-[#2f6b44]" : mode === "demo" ? "bg-[#fdf0d5] text-[#8a5a00]" : "bg-line text-muted"}`}
            data-testid="sr-status"
          >
            {mode === "off" ? "Not connected" : mode === "demo" ? "Demo mode" : connectError ? "Login problem" : "Connected"}
          </span>
        </div>
        {mode === "off" && (
          <div className="mt-3 space-y-1 text-sm text-muted">
            <p>Book couriers, print labels and get automatic tracking without leaving this panel. To connect:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Sign up free at shiprocket.in, finish KYC, add your pickup address and recharge the wallet.</li>
              <li>Shiprocket → Settings → API → Configure → <b>Create an API user</b> (use a different email from your login).</li>
              <li>Put <code>SHIPROCKET_EMAIL</code> and <code>SHIPROCKET_PASSWORD</code> (the API user) in the <code>.env</code> file and restart the site.</li>
            </ol>
            <p>Want to try it first? Set <code>SHIPROCKET_DEMO=1</code> in <code>.env</code>: everything works with pretend couriers and nothing is charged. Full guide: docs/07-shiprocket-setup.md.</p>
          </div>
        )}
        {mode !== "off" && (
          <p className="mt-2 text-sm text-muted">
            {connectError ? <span className="font-semibold text-berry">{connectError}</span> : <>Logged in{mode === "live" ? ` as ${process.env.SHIPROCKET_EMAIL}` : " (demo)"}{balance != null && <> · wallet balance <b className="text-ink">{inr(balance)}</b></>}.</>}
          </p>
        )}

        <form action={saveShiprocketSettings} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="label">Pickup address (as named in Shiprocket)</span>
            {locations?.length ? (
              <select name="pickupLocation" defaultValue={store.pickupLocation} className="field">
                <option value="">Choose…</option>
                {locations.map((l) => (
                  <option key={l.name} value={l.name}>{l.name} · {l.city} {l.pincode}</option>
                ))}
              </select>
            ) : (
              <input name="pickupLocation" defaultValue={store.pickupLocation} className="field" placeholder="e.g. Home" />
            )}
          </label>
          <label>
            <span className="label">Pickup pincode</span>
            <input name="pickupPincode" defaultValue={store.pickupPincode} inputMode="numeric" maxLength={6} className="field" placeholder="Filled from the address" />
          </label>
          <div>
            <span className="label">Box size (cm)</span>
            <div className="flex gap-1.5">
              <input name="boxLength" type="number" min={1} defaultValue={store.boxLength} className="field px-2" aria-label="Length" />
              <input name="boxBreadth" type="number" min={1} defaultValue={store.boxBreadth} className="field px-2" aria-label="Breadth" />
              <input name="boxHeight" type="number" min={1} defaultValue={store.boxHeight} className="field px-2" aria-label="Height" />
            </div>
          </div>
          <label>
            <span className="label">Days to pack ready-made</span>
            <input name="readyDays" type="number" min={0} defaultValue={store.readyDays} className="field" />
          </label>
          <label>
            <span className="label">Days to make made-to-measure</span>
            <input name="customDays" type="number" min={0} defaultValue={store.customDays} className="field" />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="showDeliveryDate" defaultChecked={store.showDeliveryDate} className="h-4 w-4 accent-berry" /> Show &ldquo;Delivery by …&rdquo; at checkout
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="blockUndeliverable" defaultChecked={store.blockUndeliverable} className="h-4 w-4 accent-berry" /> Refuse orders to pincodes no courier delivers to (and COD where no courier collects cash)
          </label>
          <button className="btn-primary py-3 sm:col-span-2 lg:col-span-4">Save Shiprocket settings</button>
        </form>

        <div className="mt-6 rounded-2xl bg-shell p-4 text-sm">
          <p className="font-bold">Automatic tracking updates</p>
          <p className="mt-1 text-muted">In Shiprocket → Settings → API → Webhooks, add this URL, turn it on, and enter the same token as <code>SHIPROCKET_WEBHOOK_TOKEN</code> in <code>.env</code>:</p>
          <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs">{webhookUrl}</p>
          <p className="mt-2 text-xs text-muted">
            Token in .env: {process.env.SHIPROCKET_WEBHOOK_TOKEN ? <b className="text-[#2f6b44]">set ✓</b> : <b className="text-berry">not set (updates are ignored until you set it)</b>}. Without the webhook, use &ldquo;Refresh tracking&rdquo; on an order.
            {process.env.SITE_URL ? "" : " Set SITE_URL in .env so this shows your real address."}
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-bold">Pincode rules</h2>
        <p className="mt-1 text-sm text-muted">
          A rule matches every pincode that <b>starts with</b> its prefix; the longest match wins (e.g. &ldquo;79&rdquo; = North-East states, &ldquo;7441&rdquo; would override it for one area). Extra shipping is added even when the order gets free shipping.
        </p>
        <div className="mt-4 space-y-3">
          {[...rules, null].map((r) => (
            <form key={r?.id ?? "new"} action={savePincodeRule} className={`card grid items-end gap-3 p-4 sm:grid-cols-[110px_1fr_120px_auto_auto_auto] ${r && !r.active ? "opacity-60" : ""}`}>
              {r && <input type="hidden" name="id" value={r.id} />}
              <label><span className="label">{r ? "Prefix" : "New prefix"}</span><input name="prefix" defaultValue={r?.prefix} required inputMode="numeric" maxLength={6} className="field py-2.5" placeholder="e.g. 79" /></label>
              <label><span className="label">Note (shown to customer)</span><input name="note" defaultValue={r?.note} className="field py-2.5" placeholder="e.g. North-East delivery" /></label>
              <label><span className="label">Extra ₹</span><input name="extraShipping" type="number" min={0} defaultValue={r?.extraShipping ?? 0} className="field py-2.5" /></label>
              <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="codAllowed" defaultChecked={r?.codAllowed ?? true} className="h-4 w-4 accent-berry" /> COD</label>
              <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={r?.active ?? true} className="h-4 w-4 accent-berry" /> On</label>
              <div className="flex gap-2">
                <button className="btn-primary py-2.5">{r ? "Save" : "Add"}</button>
                {r && <button formAction={deletePincodeRule} className="btn-ghost py-2.5 text-berry">Delete</button>}
              </div>
            </form>
          ))}
        </div>
      </section>
    </>
  );
}
