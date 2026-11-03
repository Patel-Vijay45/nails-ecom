import type { Metadata } from "next";
import CustomOrderForm from "@/components/forms/CustomOrderForm";
import NailArt from "@/components/NailArt";
import RichTitle from "@/components/RichTitle";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Custom & bridal nails" };

export default async function CustomPage() {
  const store = await getStore();
  return (
    <div className="container-x pt-12">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Custom & bridal</p>
          <h1 className="display mt-3 text-5xl md:text-6xl">
            <RichTitle text="Dream it. We'll *paint* it." />
          </h1>
          <p className="mt-5 max-w-md text-muted">
            One-of-a-kind sets for weddings, festivals and special days, designed with you and hand-painted to your exact size.
          </p>
          <ol className="mt-10 space-y-6">
            {[
              ["Share your idea", "Fill in the form with photos of your outfit or inspiration."],
              ["Get a sketch & quote", "We reply on WhatsApp within 24 hours with a design and price."],
              ["Approve & pay 50%", "Once you love the design, pay a deposit and we start painting."],
              ["See it before it ships", "We send you a photo of your finished set before shipping it."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blush text-lg italic text-berry">{i + 1}</span>
                <div>
                  <p className="font-bold">{t}</p>
                  <p className="text-sm text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <NailArt palette={["#8E1B2E", "#D4AF6A"]} pattern="dots" shape="Almond" length="Long" seed="custom" className="mt-10 hidden w-72 lg:block" />
        </div>
        <CustomOrderForm whatsapp={store.whatsapp} />
      </div>
    </div>
  );
}
