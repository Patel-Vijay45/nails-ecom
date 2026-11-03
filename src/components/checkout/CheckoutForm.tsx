"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { INDIAN_STATES } from "@/lib/constants";
import { inr } from "@/lib/format";
import { useCart } from "../cart/CartProvider";
import { PackageIcon, ShieldIcon } from "../Icons";
import NailArt from "../NailArt";

type Settings = { shippingFee: number; freeShippingAbove: number; codEnabled: boolean; codFee: number; onlineEnabled: boolean; storeName: string };

type RazorpayOptions = Record<string, unknown> & { handler: (r: RazorpayResponse) => void };
type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => { open: () => void; on: (e: string, cb: () => void) => void };
  }
}

const EMPTY = { name: "", phone: "", email: "", address1: "", address2: "", city: "", state: "", pincode: "", notes: "" };

export default function CheckoutForm({ settings }: { settings: Settings }) {
  const { items, subtotal, ready, clear } = useCart();
  const router = useRouter();
  const [c, setC] = useState(EMPTY);
  const [method, setMethod] = useState<"ONLINE" | "COD">(settings.onlineEnabled ? "ONLINE" : "COD");
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Remember address on this device for next time.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nails_address_v1");
      if (saved) setC({ ...EMPTY, ...JSON.parse(saved), notes: "" });
    } catch {}
  }, []);

  // Re-check coupon when the bag changes.
  useEffect(() => {
    if (!coupon) return;
    fetch("/api/coupon", { method: "POST", body: JSON.stringify({ code: coupon.code, subtotal }) })
      .then((r) => r.json())
      .then((r) => (r.ok ? setCoupon(r) : (setCoupon(null), setCouponMsg(r.error))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const discount = coupon?.discount ?? 0;
  const shipping = subtotal - discount >= settings.freeShippingAbove ? 0 : settings.shippingFee;
  const codFee = method === "COD" ? settings.codFee : 0;
  const total = Math.max(0, subtotal - discount + shipping + codFee);

  async function applyCoupon() {
    setCouponMsg("");
    const r = await fetch("/api/coupon", { method: "POST", body: JSON.stringify({ code, subtotal }) }).then((r) => r.json());
    if (r.ok) {
      setCoupon(r);
      setCode("");
    } else setCouponMsg(r.error);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setC({ ...c, [k]: k === "phone" ? e.target.value.replace(/\D/g, "").slice(-10) : k === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value });

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, shape: i.shape, length: i.length, size: i.size, measurements: i.measurements, sizes: i.sizes, scans: i.scans })),
          customer: c,
          coupon: coupon?.code ?? "",
          paymentMethod: method,
        }),
      }).then((r) => r.json());

      if (!res.ok) {
        setErrors(Object.fromEntries(Object.entries(res.errors ?? {}).map(([k, v]) => [k.replace("customer.", ""), v as string])));
        setError(res.error);
        setBusy(false);
        return;
      }
      try {
        const { notes: _n, ...addr } = c;
        localStorage.setItem("nails_address_v1", JSON.stringify(addr));
      } catch {}

      if (res.razorpay && window.Razorpay) {
        const rz = new window.Razorpay({
          key: res.razorpay.keyId,
          amount: res.razorpay.amount,
          currency: "INR",
          name: res.razorpay.name,
          description: `Order ${res.number}`,
          order_id: res.razorpay.orderId,
          prefill: res.razorpay.prefill,
          theme: { color: "#8e2c48" },
          handler: async (r: RazorpayResponse) => {
            await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: res.orderId, ...r }) });
            clear();
            router.push(`/order/${res.orderId}`);
          },
          modal: { ondismiss: () => { setBusy(false); setError("Payment was not completed. Your order is saved; you can try again or choose cash on delivery."); } },
        });
        rz.open();
        return;
      }
      clear();
      router.push(`/order/${res.orderId}`);
    } catch {
      setError("Couldn't reach the server. Check your internet and try again.");
      setBusy(false);
    }
  }

  if (!ready) return <div className="py-24 text-center text-muted">Loading your bag…</div>;
  if (items.length === 0)
    return (
      <div className="py-24 text-center">
        <p className="display text-3xl">Your bag is empty</p>
        <Link href="/shop" className="btn-primary mt-6">
          Shop designs
        </Link>
      </div>
    );

  const field = (k: keyof typeof EMPTY, label: string, { className, ...props }: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={className}>
      <span className="label">{label}</span>
      <input value={c[k]} onChange={set(k)} {...props} className={`field ${errors[k] ? "border-berry" : ""}`} />
      {errors[k] && <span className="mt-1 block text-xs text-berry">{errors[k]}</span>}
    </label>
  );

  return (
    <form onSubmit={placeOrder} className="mt-8 grid gap-10 lg:grid-cols-[1fr_420px]">
      {settings.onlineEnabled && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />}
      <div className="space-y-8">
        <section className="card p-6 md:p-8">
          <h2 className="text-lg font-bold">1. Contact</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {field("name", "Full name", { autoComplete: "name", required: true })}
            {field("phone", "Mobile (WhatsApp)", { autoComplete: "tel-national", inputMode: "numeric", placeholder: "10-digit number", required: true })}
            {field("email", "Email (optional)", { type: "email", autoComplete: "email", className: "sm:col-span-2" })}
          </div>
        </section>

        <section className="card p-6 md:p-8">
          <h2 className="text-lg font-bold">2. Delivery address</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {field("address1", "House / flat, street", { autoComplete: "address-line1", required: true, className: "sm:col-span-2" })}
            {field("address2", "Area, landmark (optional)", { autoComplete: "address-line2", className: "sm:col-span-2" })}
            {field("pincode", "Pincode", { autoComplete: "postal-code", inputMode: "numeric", required: true })}
            {field("city", "City", { autoComplete: "address-level2", required: true })}
            <label className="sm:col-span-2">
              <span className="label">State</span>
              <select value={c.state} onChange={set("state")} className={`field ${errors.state ? "border-berry" : ""}`} required>
                <option value="">Choose state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="label">Order notes (optional)</span>
              <textarea value={c.notes} onChange={set("notes")} rows={2} className="field" placeholder="Gift message, event date, anything we should know" />
            </label>
          </div>
        </section>

        <section className="card p-6 md:p-8">
          <h2 className="text-lg font-bold">3. Payment</h2>
          <div className="mt-5 space-y-3">
            {settings.onlineEnabled && (
              <PayOption checked={method === "ONLINE"} onSelect={() => setMethod("ONLINE")} title="UPI, cards, netbanking" sub="Pay securely with Razorpay. GPay, PhonePe, Paytm and all cards." />
            )}
            {settings.codEnabled && (
              <PayOption
                checked={method === "COD"}
                onSelect={() => setMethod("COD")}
                title={`Cash on delivery${settings.codFee ? ` (+${inr(settings.codFee)})` : ""}`}
                sub="We'll confirm your order on WhatsApp before we ship it."
              />
            )}
            {!settings.onlineEnabled && !settings.codEnabled && <p className="text-sm text-berry">Ordering is paused right now. Please message us on WhatsApp.</p>}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="card p-6">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="mt-5 space-y-4">
            {items.map((i) => (
              <li key={i.key} className="flex gap-3">
                <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-shell">
                  {i.shape ? <NailArt palette={i.palette} pattern={i.pattern} shape={i.shape} seed={i.slug} className="w-14" /> : <PackageIcon className="text-berry" />}
                  <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-cream">{i.quantity}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-xs text-muted">{[i.shape, i.length, i.size === "Custom" ? "Made to measure" : i.size && `Size ${i.size}`].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="text-sm font-semibold">{inr(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-line pt-5">
            {coupon ? (
              <div className="flex items-center justify-between rounded-xl bg-[#e3ede6] px-4 py-3 text-sm">
                <span>
                  <b>{coupon.code}</b> · {coupon.label}
                </span>
                <button type="button" className="text-xs font-semibold underline" onClick={() => setCoupon(null)}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="field py-2.5" />
                <button type="button" className="btn-outline px-5 py-2.5" onClick={applyCoupon} disabled={!code}>
                  Apply
                </button>
              </div>
            )}
            {couponMsg && <p className="mt-2 text-xs text-berry">{couponMsg}</p>}
          </div>

          <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
            <Row k="Subtotal" v={inr(subtotal)} />
            {discount > 0 && <Row k="Discount" v={`−${inr(discount)}`} accent />}
            <Row k="Shipping" v={shipping === 0 ? "Free" : inr(shipping)} />
            {codFee > 0 && <Row k="COD fee" v={inr(codFee)} />}
            <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
              <dt>Total</dt>
              <dd>{inr(total)}</dd>
            </div>
          </dl>

          {error && <p className="mt-4 rounded-xl bg-blush px-4 py-3 text-sm text-berry-dark">{error}</p>}
          <button className="btn-primary mt-5 w-full py-4 text-base" disabled={busy || (!settings.onlineEnabled && !settings.codEnabled)}>
            {busy ? "Placing order…" : method === "ONLINE" ? `Pay ${inr(total)}` : `Place order · ${inr(total)}`}
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
            <ShieldIcon width={14} height={14} /> Secure checkout · Your details are only used for delivery
          </p>
        </div>
      </aside>
    </form>
  );
}

function PayOption({ checked, onSelect, title, sub }: { checked: boolean; onSelect: () => void; title: string; sub: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked ? "border-ink bg-shell" : "border-line hover:border-ink/30"}`}>
      <input type="radio" name="pay" checked={checked} onChange={onSelect} className="mt-1 h-4 w-4 accent-berry" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{sub}</span>
      </span>
    </label>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className={accent ? "font-semibold text-berry" : ""}>{v}</dd>
    </div>
  );
}
