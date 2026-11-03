"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./cart/CartProvider";
import { BagIcon, CloseIcon, MenuIcon } from "./Icons";

type NavLink = { href: string; label: string };

export default function Header({ storeName, announcement, links }: { storeName: string; announcement: string; links: NavLink[] }) {
  const { count, setOpen, ready } = useCart();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const parts = announcement.split("·").map((s) => s.trim()).filter(Boolean);

  return (
    <>
      {parts.length > 0 && (
        <div className="overflow-hidden bg-ink py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/90">
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
            {Array.from({ length: 8 }).flatMap((_, k) =>
              parts.map((p, i) => (
                <span key={`${k}-${i}`} className="flex items-center gap-12">
                  {p} <span className="text-gold">✦</span>
                </span>
              )),
            )}
          </div>
        </div>
      )}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "border-b border-line/80 bg-cream/80 backdrop-blur-xl" : "bg-cream"}`}>
        <div className="container-x flex h-16 items-center justify-between gap-4 md:h-20">
          <button className="btn-ghost -ml-3 rounded-full md:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
            <MenuIcon />
          </button>
          <Link href="/" className="display text-2xl md:text-[28px]">
            {storeName}
            <span className="text-berry">.</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/5 ${pathname === l.href.split("?")[0] && !l.href.includes("?") ? "text-berry" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <button onClick={() => setOpen(true)} className="btn-ghost relative -mr-3 rounded-full" aria-label={`Open bag, ${count} items`}>
            <BagIcon width={22} height={22} />
            {ready && count > 0 && (
              <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-berry px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className={`fixed inset-0 z-50 md:hidden ${menu ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-ink/40 transition-opacity ${menu ? "opacity-100" : "opacity-0"}`} onClick={() => setMenu(false)} />
        <div className={`absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-cream p-6 transition-transform duration-300 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between">
            <span className="display text-2xl">
              {storeName}
              <span className="text-berry">.</span>
            </span>
            <button className="btn-ghost -mr-3 rounded-full" onClick={() => setMenu(false)} aria-label="Close menu">
              <CloseIcon />
            </button>
          </div>
          <nav className="mt-10 flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="display border-b border-line py-4 text-2xl">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
