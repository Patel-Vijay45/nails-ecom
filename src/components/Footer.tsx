import Link from "next/link";
import type { StoreSettings } from "@/lib/store";
import { waLink } from "@/lib/format";
import { InstagramIcon, WhatsAppIcon } from "./Icons";

export default function Footer({ store }: { store: StoreSettings }) {
  return (
    <footer className="mt-24 bg-ink text-cream">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="display text-4xl">
            {store.name}
            <span className="text-gold">.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/70">
            {store.tagline}. Every set is designed and painted by hand, so no two are exactly alike.
          </p>
          <div className="mt-6 flex gap-3">
            <a href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full border border-cream/20 transition hover:border-gold hover:text-gold" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href={waLink(store.whatsapp, "Hi! I have a question about your nails.")} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full border border-cream/20 transition hover:border-gold hover:text-gold" aria-label="WhatsApp">
              <WhatsAppIcon />
            </a>
          </div>
        </div>
        <FooterCol title="Shop" links={[["All designs", "/shop"], ["Everyday", "/shop?collection=everyday"], ["Glam & Party", "/shop?collection=glam"], ["Bridal & Festive", "/shop?collection=bridal-festive"], ["Essentials", "/shop?collection=essentials"]]} />
        <FooterCol title="Help" links={[["Sizing guide", "/sizing-guide"], ["How to apply", "/sizing-guide#apply"], ["Track your order", "/track"], ["Custom & bridal", "/custom"], ["About us", "/about"]]} />
        <FooterCol title="Policies" links={[["Shipping", "/policies/shipping"], ["Returns & refunds", "/policies/returns"], ["Privacy", "/policies/privacy"], ["Terms", "/policies/terms"]]} />
      </div>
      <div className="border-t border-cream/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-cream/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {store.name}. Handmade in India.</p>
          <p>UPI · Cards · Netbanking · Cash on Delivery</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="md:col-span-2 lg:col-span-2">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{title}</p>
      <ul className="mt-4 space-y-3 text-sm text-cream/75">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="transition hover:text-cream">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
