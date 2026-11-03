import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { moderateReview } from "../../actions";
import { PageTitle } from "../ui";

export default async function Reviews() {
  const reviews = await db.review.findMany({ include: { product: true }, orderBy: [{ approved: "asc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageTitle title="Reviews" sub="New reviews stay hidden until you approve them." />
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className={`card flex flex-wrap items-start justify-between gap-4 p-5 ${r.approved ? "" : "border-gold"}`}>
            <div className="max-w-2xl">
              <p className="text-sm">
                <span className="text-gold">{"★".repeat(r.rating)}</span> <b>{r.name}</b>
                {r.city && `, ${r.city}`} · <span className="text-muted">{r.product?.name ?? "General"} · {formatDate(r.createdAt)}</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed">{r.text}</p>
            </div>
            <form className="flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              {r.approved ? (
                <button name="op" value="hide" formAction={moderateReview} className="btn-outline px-4 py-2 text-xs">Hide</button>
              ) : (
                <button name="op" value="approve" formAction={moderateReview} className="btn-primary px-4 py-2 text-xs">Approve</button>
              )}
              <button name="op" value="delete" formAction={moderateReview} className="btn-ghost px-4 py-2 text-xs text-berry">Delete</button>
            </form>
          </div>
        ))}
        {reviews.length === 0 && <p className="card p-10 text-center text-muted">No reviews yet.</p>}
      </div>
    </>
  );
}
