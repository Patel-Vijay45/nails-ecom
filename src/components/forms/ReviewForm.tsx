"use client";

import { useActionState, useState } from "react";
import { submitReview, type FormState } from "@/app/(store)/actions";
import { StarIcon } from "../Icons";

export default function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReview, { ok: false, message: "" });
  const [rating, setRating] = useState(5);
  const [open, setOpen] = useState(false);

  if (state.ok) return <p className="rounded-2xl bg-[#e3ede6] px-5 py-4 text-sm">{state.message}</p>;
  if (!open)
    return (
      <button className="btn-outline" onClick={() => setOpen(true)}>
        Write a review
      </button>
    );

  return (
    <form action={action} className="card grid gap-4 p-6 sm:grid-cols-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="sm:col-span-2">
        <span className="label">Your rating</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} className={n <= rating ? "text-gold" : "text-line"} aria-label={`${n} stars`}>
              <StarIcon width={28} height={28} />
            </button>
          ))}
        </div>
      </div>
      <label>
        <span className="label">Name</span>
        <input name="name" required className="field" />
      </label>
      <label>
        <span className="label">City (optional)</span>
        <input name="city" className="field" />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Your review</span>
        <textarea name="text" required rows={4} className="field" placeholder="How was the fit, the finish, the packaging?" />
      </label>
      {state.message && <p className="text-sm text-berry sm:col-span-2">{state.message}</p>}
      <button className="btn-primary sm:col-span-2" disabled={pending}>
        {pending ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
