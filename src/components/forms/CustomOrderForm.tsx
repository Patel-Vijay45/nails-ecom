"use client";

import { useActionState, useState } from "react";
import { submitCustomRequest, type FormState } from "@/app/(store)/actions";
import { ALL_LENGTHS, ALL_SHAPES } from "@/lib/constants";
import { waLink } from "@/lib/format";
import { CheckIcon, UploadIcon, WhatsAppIcon } from "../Icons";

export default function CustomOrderForm({ whatsapp }: { whatsapp: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitCustomRequest, { ok: false, message: "" });
  const [files, setFiles] = useState<string[]>([]);
  const err = (k: string) => state.errors?.[k] && <span className="mt-1 block text-xs text-berry">{state.errors[k]}</span>;

  if (state.ok)
    return (
      <div className="card p-8 text-center md:p-12">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-berry text-white">
          <CheckIcon width={26} height={26} />
        </span>
        <h2 className="display mt-5 text-3xl">We&apos;ve got your idea!</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Our artist will look at your request and send you a quote and design sketch on WhatsApp within 24 hours.
        </p>
        <a href={waLink(whatsapp, "Hi! I just sent a custom nail request on your website.")} target="_blank" rel="noreferrer" className="btn mt-6 bg-[#25D366] text-white">
          <WhatsAppIcon /> Say hi on WhatsApp
        </a>
      </div>
    );

  return (
    <form action={action} className="card grid gap-5 p-6 sm:grid-cols-2 md:p-8">
      <label>
        <span className="label">Your name *</span>
        <input name="name" required className="field" autoComplete="name" />
        {err("name")}
      </label>
      <label>
        <span className="label">WhatsApp number *</span>
        <input name="phone" required inputMode="numeric" maxLength={10} className="field" placeholder="10-digit mobile" />
        {err("phone")}
      </label>
      <label>
        <span className="label">Email</span>
        <input name="email" type="email" className="field" />
        {err("email")}
      </label>
      <label>
        <span className="label">Occasion *</span>
        <input name="occasion" required className="field" placeholder="Wedding, sangeet, birthday, Diwali…" list="occasions" />
        <datalist id="occasions">
          {["My wedding", "Bridesmaid", "Mehendi", "Sangeet", "Reception", "Engagement", "Birthday", "Diwali", "Karwa Chauth", "Party"].map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
        {err("occasion")}
      </label>
      <label>
        <span className="label">Event date</span>
        <input name="eventDate" type="date" className="field" />
      </label>
      <label>
        <span className="label">Budget</span>
        <select name="budget" className="field" defaultValue="">
          <option value="">Not sure yet</option>
          <option>₹1,000 – ₹2,000</option>
          <option>₹2,000 – ₹3,500</option>
          <option>₹3,500 – ₹5,000</option>
          <option>₹5,000+</option>
        </select>
      </label>
      <label>
        <span className="label">Shape</span>
        <select name="shape" className="field" defaultValue="">
          <option value="">Help me choose</option>
          {ALL_SHAPES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label>
        <span className="label">Length</span>
        <select name="length" className="field" defaultValue="">
          <option value="">Help me choose</option>
          {ALL_LENGTHS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="label">Colours</span>
        <input name="colours" className="field" placeholder="e.g. maroon and gold to match my lehenga" />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Describe your dream nails *</span>
        <textarea name="description" required rows={4} className="field" placeholder="Tell us about your outfit, theme, any details like initials, charms or patterns…" />
        {err("description")}
      </label>
      <label className="sm:col-span-2">
        <span className="label">Nail sizes (if you know them)</span>
        <input name="measurements" className="field" placeholder="e.g. Thumb 16, Index 12, Middle 13, Ring 12, Pinky 10 mm" />
      </label>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-shell/50 p-6 text-center transition hover:border-berry sm:col-span-2">
        <UploadIcon className="text-berry" />
        <span className="text-sm font-semibold">Add inspiration photos (up to 5)</span>
        <span className="text-xs text-muted">{files.length ? files.join(", ") : "Your outfit, Pinterest ideas, anything that helps"}</span>
        <input
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5).map((f) => f.name))}
        />
      </label>
      {state.message && !state.ok && <p className="rounded-xl bg-blush px-4 py-3 text-sm text-berry-dark sm:col-span-2">{state.message}</p>}
      <button className="btn-primary py-4 sm:col-span-2" disabled={pending}>
        {pending ? "Sending…" : "Send my request"}
      </button>
      <p className="text-center text-xs text-muted sm:col-span-2">No payment now. You only pay a 50% deposit after you approve the design and quote.</p>
    </form>
  );
}
