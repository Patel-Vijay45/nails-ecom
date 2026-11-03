import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { findPincodeRule, lookupPincode } from "@/lib/pincode";
import { computeShipping } from "@/lib/pricing";
import { getStore } from "@/lib/store";
import { deletePincodeRule, savePincodeRule } from "../../actions";
import { PageTitle } from "../ui";

export default async function Shipping({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const sp = await searchParams;
  const [store, rules, costed] = await Promise.all([
    getStore(),
    db.pincodeRule.findMany({ orderBy: { prefix: "asc" } }),
    db.order.aggregate({ where: { shippingCost: { not: null }, status: { notIn: ["CANCELLED"] } }, _sum: { shipping: true, shippingCost: true }, _count: { _all: true } }),
  ]);
  const test = sp.test && /^\d{6}$/.test(sp.test) ? sp.test : null;
  const [info, rule] = test ? await Promise.all([lookupPincode(test), findPincodeRule(test)]) : [null, null];

  return (
    <>
      <PageTitle title="Shipping" sub="Base fees, remote-area rules by pincode, and what shipping really costs you." />

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
            <p className="mt-1 text-muted">
              Shipping on a {inr(store.freeShippingAbove - 1)} order: {inr(computeShipping(store, store.freeShippingAbove - 1) + (rule?.extraShipping ?? 0))} · on a {inr(store.freeShippingAbove)} order: {inr(computeShipping(store, store.freeShippingAbove) + (rule?.extraShipping ?? 0))}
            </p>
          </div>
        )}
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
