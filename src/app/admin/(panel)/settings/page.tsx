import { parseTipWidths } from "@/lib/sizes";
import { getStore } from "@/lib/store";
import { saveSettings } from "../../actions";
import { PageTitle, Saved } from "../ui";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const s = await getStore();
  const sp = await searchParams;
  const F = ({ name, label, type = "text", hint, wide }: { name: keyof typeof s; label: string; type?: string; hint?: string; wide?: boolean }) => (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="label">{label}</span>
      <input name={name} type={type} defaultValue={String(s[name])} className="field" />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
  return (
    <>
      <PageTitle title="Settings" sub="Everything here updates the live shop instantly." />
      <Saved show={sp.saved === "1"} />
      <form action={saveSettings} className="space-y-6">
        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Brand</h2>
          <F name="name" label="Shop name" />
          <F name="artistName" label="Artist name" hint="Shown as “Hand-painted by …”" />
          <F name="tagline" label="Tagline" wide />
          <F name="announcement" label="Top banner" hint="Separate messages with ·" wide />
          <F name="heroTitle" label="Home page headline" hint="Put *stars* around a word to make it italic and coloured" wide />
          <label className="sm:col-span-2">
            <span className="label">Home page intro</span>
            <textarea name="heroSubtitle" defaultValue={s.heroSubtitle} rows={2} className="field" />
          </label>
          <label className="sm:col-span-2">
            <span className="label">About the artist</span>
            <textarea name="aboutText" defaultValue={s.aboutText} rows={4} className="field" />
          </label>
        </section>
        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Contact</h2>
          <F name="whatsapp" label="WhatsApp number" hint="With country code, e.g. 919876543210" />
          <F name="instagram" label="Instagram handle" />
          <F name="email" label="Email" type="email" wide />
        </section>
        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Shipping & payment</h2>
          <F name="shippingFee" label="Shipping fee (₹)" type="number" />
          <F name="freeShippingAbove" label="Free shipping above (₹)" type="number" />
          <F name="codFee" label="Cash on delivery fee (₹)" type="number" />
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium">
            <input type="checkbox" name="codEnabled" defaultChecked={s.codEnabled} className="h-4 w-4 accent-berry" /> Allow cash on delivery
          </label>
          <F name="dispatchDays" label="Dispatch times" wide />
          <p className="text-xs text-muted sm:col-span-2">
            Online payments (UPI / cards) turn on automatically once Razorpay keys are added to the server&apos;s environment settings. See README.
          </p>
        </section>
        <section className="card p-6">
          <h2 className="font-bold">Sizing kit tip widths (mm)</h2>
          <p className="mt-1 text-sm text-muted">
            Measure each tip you use, size 0 (widest) to 11, <b>straight across the widest part with a ruler</b> (not around the curve).
            Photo sizing uses these to turn a customer&apos;s nail width into a size number. The values shown at first are typical placeholders.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
            {parseTipWidths(s.tipWidths).map((w, i) => (
              <label key={i} className="text-center">
                <span className="label">Size {i}</span>
                <input name={`tip${i}`} type="number" step="0.1" min="1" max="39" defaultValue={w} className="field px-1 text-center" />
              </label>
            ))}
          </div>
        </section>
        <button className="btn-primary w-full py-4">Save settings</button>
      </form>
    </>
  );
}
