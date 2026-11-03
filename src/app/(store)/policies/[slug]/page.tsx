import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { inr } from "@/lib/format";
import { getStore, type StoreSettings } from "@/lib/store";

// Starter policy text. Review it with your CA / lawyer before going live.
const POLICIES: Record<string, { title: string; body: (s: StoreSettings) => string[] }> = {
  shipping: {
    title: "Shipping policy",
    body: (s) => [
      `We ship across India. Dispatch times: ${s.dispatchDays}. Custom and bridal sets take 7–14 days; we confirm the timeline with you before starting.`,
      `Shipping is ${inr(s.shippingFee)} per order, and free on orders above ${inr(s.freeShippingAbove)}.`,
      "Once your order ships, we send the courier name and tracking link on WhatsApp. Delivery usually takes 2–5 working days after dispatch, depending on your pincode.",
      s.codEnabled ? `Cash on delivery is available for a ${inr(s.codFee)} handling fee. We confirm every COD order on WhatsApp before we ship it.` : "We currently accept prepaid orders only.",
    ],
  },
  returns: {
    title: "Returns & refunds",
    body: () => [
      "Press-on nails are a personal-care product, so we can't accept returns of opened sets or sets that have been tried on.",
      "Wrong fit on a standard set? Message us within 3 days of delivery and we'll send the sizes you need for free.",
      "Made-to-measure set doesn't fit because of our mistake? We'll remake it for free. If the sizes sent to us were wrong, we'll remake it at 50% off.",
      "Damaged in transit? Send us an unboxing photo or video within 48 hours of delivery and we'll replace it for free.",
      "Approved refunds go back to the original payment method within 5–7 working days. COD refunds are made by UPI.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: (s) => [
      `${s.name} collects your name, phone, email and address only to process and deliver your order and to talk to you about it.`,
      "Online payments are handled by Razorpay. We never see or store your card or UPI details.",
      "We share your address and phone only with our courier partner, so they can deliver your order. We never sell your data.",
      `To see, change or delete your data, email us at ${s.email} or message us on WhatsApp.`,
    ],
  },
  terms: {
    title: "Terms of service",
    body: (s) => [
      `By placing an order with ${s.name}, you agree to these terms.`,
      "Every set is hand-painted, so small differences from the photos are part of what makes each set unique.",
      "Prices are in Indian Rupees and include applicable taxes unless stated otherwise. We may change prices or designs at any time; orders already placed are not affected.",
      "Do a patch test with the glue before full use. Don't use press-ons on broken, infected or damaged nails.",
      "Custom-design deposits are non-refundable once we have started painting your set.",
    ],
  },
};

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = POLICIES[(await params).slug];
  return p ? { title: p.title } : {};
}

export default async function PolicyPage({ params }: { params: Params }) {
  const p = POLICIES[(await params).slug];
  if (!p) notFound();
  const store = await getStore();
  return (
    <div className="container-x max-w-3xl pt-12">
      <p className="eyebrow">Policies</p>
      <h1 className="display mt-3 text-5xl">{p.title}</h1>
      <div className="mt-10 space-y-5 text-lg leading-relaxed text-ink/80">
        {p.body(store).map((t, i) => (
          <p key={i}>{t}</p>
        ))}
        <p className="text-base text-muted">Questions? Email {store.email} or message us on WhatsApp.</p>
      </div>
    </div>
  );
}
