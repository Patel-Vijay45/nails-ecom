import { WhatsAppIcon } from "@/components/Icons";
import { REQUEST_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDateTime, inr, parseList, waLink } from "@/lib/format";
import { getStore } from "@/lib/store";
import { updateRequest } from "../../actions";
import { Badge, PageTitle } from "../ui";

export default async function Requests() {
  const [requests, store] = await Promise.all([db.customRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), getStore()]);
  return (
    <>
      <PageTitle title="Custom requests" sub="Bridal and custom design enquiries. Reply on WhatsApp with a sketch and quote, then take a 50% deposit." />
      {requests.length === 0 && <p className="card p-10 text-center text-muted">No requests yet.</p>}
      <div className="space-y-4">
        {requests.map((r) => {
          const imgs = parseList(r.images);
          const first = r.name.split(" ")[0];
          const quoteMsg = r.quote
            ? `Hi ${first}! Thank you for your ${r.occasion} nail request 💅 Your custom set will be ${inr(r.quote)}. To start, please pay a 50% deposit of ${inr(Math.ceil(r.quote / 2))}. I'll send you the design sketch for approval.`
            : `Hi ${first}! This is ${store.name}. Thank you for your ${r.occasion} nail request 💅 I'd love to design this for you. Could you share a photo of your outfit?`;
          return (
            <div key={r.id} className="card grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold">{r.name}</h2>
                  <Badge value={r.status} />
                  <span className="text-xs text-muted">{formatDateTime(r.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{r.phone}{r.email && ` · ${r.email}`}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  {[["Occasion", r.occasion], ["Event date", r.eventDate], ["Budget", r.budget], ["Shape", r.shape], ["Length", r.length], ["Colours", r.colours]].map(([k, v]) =>
                    v ? (<div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>) : null,
                  )}
                </dl>
                <p className="mt-4 rounded-xl bg-shell p-4 text-sm leading-relaxed">{r.description}</p>
                {r.measurements && <p className="mt-2 text-xs"><b>Sizes:</b> {r.measurements}</p>}
                {imgs.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {imgs.map((src) => (
                      <a key={src} href={src} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Reference" className="h-24 w-24 rounded-xl object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <form action={updateRequest} className="space-y-3">
                <input type="hidden" name="id" value={r.id} />
                <div className="grid grid-cols-2 gap-3">
                  <label><span className="label">Status</span>
                    <select name="status" defaultValue={r.status} className="field">{REQUEST_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                  </label>
                  <label><span className="label">Quote (₹)</span><input type="number" name="quote" defaultValue={r.quote ?? ""} className="field" /></label>
                </div>
                <label className="block"><span className="label">Notes</span><textarea name="adminNotes" defaultValue={r.adminNotes} rows={2} className="field" /></label>
                <div className="flex gap-2">
                  <button className="btn-primary flex-1 py-3">Save</button>
                  <a href={waLink(`91${r.phone}`, quoteMsg)} target="_blank" rel="noreferrer" className="btn flex-1 bg-[#25D366] py-3 text-white">
                    <WhatsAppIcon width={16} height={16} /> {r.quote ? "Send quote" : "Reply"}
                  </a>
                </div>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}
