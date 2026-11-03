import CartDrawer from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { WhatsAppIcon } from "@/components/Icons";
import { db } from "@/lib/db";
import { parseList, waLink } from "@/lib/format";
import { getStore } from "@/lib/store";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  const addons = await db.product.findMany({ where: { isAddon: true, active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <CartProvider>
      <Header
        storeName={store.name}
        announcement={store.announcement}
        links={[
          { href: "/shop", label: "Shop" },
          { href: "/shop?collection=bridal-festive", label: "Bridal" },
          { href: "/custom", label: "Custom order" },
          { href: "/sizing-guide", label: "Sizing" },
          { href: "/track", label: "Track order" },
        ]}
      />
      <main>{children}</main>
      <Footer store={store} />
      <CartDrawer
        freeShippingAbove={store.freeShippingAbove}
        addons={addons.map((a) => ({ id: a.id, slug: a.slug, name: a.name, price: a.price, palette: parseList(a.palette), pattern: a.pattern, image: parseList(a.images)[0] }))}
      />
      <a
        href={waLink(store.whatsapp, `Hi ${store.name}! I'd like some help choosing nails.`)}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105"
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon width={26} height={26} />
      </a>
    </CartProvider>
  );
}
