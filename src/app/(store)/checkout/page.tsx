import type { Metadata } from "next";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import { razorpayEnabled } from "@/lib/razorpay";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const store = await getStore();
  return (
    <div className="container-x pt-10">
      <h1 className="display text-5xl">Checkout</h1>
      <CheckoutForm
        settings={{
          shippingFee: store.shippingFee,
          freeShippingAbove: store.freeShippingAbove,
          codEnabled: store.codEnabled,
          codFee: store.codFee,
          onlineEnabled: razorpayEnabled(),
          storeName: store.name,
        }}
      />
    </div>
  );
}
