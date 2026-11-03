import { db } from "@/lib/db";
import { formatDate, inr } from "@/lib/format";
import { deleteCoupon, saveCoupon, toggleCoupon } from "../../actions";
import { PageTitle } from "../ui";

export default async function Coupons() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageTitle title="Coupons" sub="Discount codes for Instagram posts, creators, festivals and repeat customers." />
      <form action={saveCoupon} className="card grid items-end gap-3 p-5 sm:grid-cols-3 lg:grid-cols-7">
        <label className="lg:col-span-2"><span className="label">Code</span><input name="code" required className="field uppercase" placeholder="DIWALI15" /></label>
        <label><span className="label">Type</span><select name="type" className="field"><option value="PERCENT">% off</option><option value="FLAT">₹ off</option></select></label>
        <label><span className="label">Value</span><input name="value" type="number" min={1} required className="field" /></label>
        <label><span className="label">Min order ₹</span><input name="minOrder" type="number" min={0} defaultValue={0} className="field" /></label>
        <label><span className="label">Max uses</span><input name="maxUses" type="number" min={0} className="field" placeholder="∞" /></label>
        <label><span className="label">Expires</span><input name="expiresAt" type="date" className="field" /></label>
        <button className="btn-primary sm:col-span-3 lg:col-span-7">Create / update coupon</button>
      </form>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="p-4">Code</th><th className="p-4">Discount</th><th className="p-4">Min order</th><th className="p-4">Used</th><th className="p-4">Expires</th><th className="p-4" /></tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className={`border-t border-line ${c.active ? "" : "opacity-50"}`}>
                <td className="p-4 font-mono font-bold">{c.code}</td>
                <td className="p-4">{c.type === "PERCENT" ? `${c.value}%` : inr(c.value)}</td>
                <td className="p-4">{c.minOrder ? inr(c.minOrder) : "—"}</td>
                <td className="p-4">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="p-4">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                <td className="p-4">
                  <form className="flex justify-end gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <button formAction={toggleCoupon} className="btn-outline px-3 py-1.5 text-xs">{c.active ? "Pause" : "Activate"}</button>
                    <button formAction={deleteCoupon} className="btn-ghost px-3 py-1.5 text-xs text-berry">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
