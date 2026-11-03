"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { inr } from "@/lib/format";
import NailArt from "../NailArt";
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon, TruckIcon } from "../Icons";
import { useCart } from "./CartProvider";

export type Addon = { id: string; slug: string; name: string; price: number; palette: string[]; pattern: string; image?: string };

export default function CartDrawer({ freeShippingAbove, addons }: { freeShippingAbove: number; addons: Addon[] }) {
  const { items, open, setOpen, subtotal, setQty, remove, add } = useCart();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname, setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!mounted) return null;
  const remaining = Math.max(0, freeShippingAbove - subtotal);
  const progress = Math.min(100, (subtotal / Math.max(1, freeShippingAbove)) * 100);
  const suggestions = addons.filter((a) => !items.some((i) => i.productId === a.id)).slice(0, 3);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="Shopping bag"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="display text-2xl">Your bag</h2>
          <button className="btn-ghost rounded-full" onClick={() => setOpen(false)} aria-label="Close bag">
            <CloseIcon />
          </button>
        </div>

        {items.length > 0 && (
          <div className="border-b border-line px-5 py-3">
            <p className="flex items-center gap-2 text-sm">
              <TruckIcon className="text-berry" width={18} height={18} />
              {remaining > 0 ? (
                <span>
                  Add <b>{inr(remaining)}</b> more for <b>free shipping</b>
                </span>
              ) : (
                <span>
                  You&apos;ve unlocked <b>free shipping</b> 🎉
                </span>
              )}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-gradient-to-r from-berry to-gold transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <NailArt palette={["#F4D9D6", "#fff"]} pattern="french" seed="empty" className="w-40 opacity-80" />
              <p className="display mt-4 text-xl">Your bag is empty</p>
              <p className="mt-1 text-sm text-muted">Find a set you love.</p>
              <Link href="/shop" className="btn-primary mt-6" onClick={() => setOpen(false)}>
                Shop all designs
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.key} className="flex gap-4">
                  <Link href={`/product/${i.slug}`} onClick={() => setOpen(false)} className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-shell">
                    {i.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image} alt="" className="h-full w-full object-cover" />
                    ) : i.shape ? (
                      <NailArt palette={i.palette} pattern={i.pattern} shape={i.shape} length={i.length || "Medium"} seed={i.slug} className="w-20" />
                    ) : (
                      <PackageIcon />
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="truncate font-semibold">{i.name}</p>
                      <p className="font-semibold">{inr(i.price * i.quantity)}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {[i.shape, i.length, i.size && (i.size === "Custom" ? "Made to measure" : `Size ${i.size}`)].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-line bg-white">
                        <button className="p-2" onClick={() => setQty(i.key, i.quantity - 1)} aria-label="Decrease">
                          <MinusIcon width={14} height={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                        <button className="p-2" onClick={() => setQty(i.key, i.quantity + 1)} aria-label="Increase">
                          <PlusIcon width={14} height={14} />
                        </button>
                      </div>
                      <button className="p-2 text-muted hover:text-berry" onClick={() => remove(i.key)} aria-label="Remove">
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && suggestions.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow">Complete your kit</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {suggestions.map((a) => (
                  <button
                    key={a.id}
                    className="group rounded-2xl border border-line bg-white p-2 text-left transition hover:border-ink/30"
                    onClick={() =>
                      add({ productId: a.id, slug: a.slug, name: a.name, price: a.price, quantity: 1, shape: "", length: "", size: "", measurements: "", palette: a.palette, pattern: a.pattern, image: a.image })
                    }
                  >
                    <div className="grid aspect-square place-items-center rounded-xl bg-shell">
                      <PackageIcon />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold leading-tight">{a.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {inr(a.price)} <span className="text-berry group-hover:underline">+ Add</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line bg-white px-5 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="text-lg font-bold">{inr(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Shipping and coupons are applied at checkout.</p>
            <Link href="/checkout" className="btn-primary mt-4 w-full py-4" onClick={() => setOpen(false)}>
              Checkout securely
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}

function PackageIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8e2c48" strokeWidth="1.5" aria-hidden>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}
