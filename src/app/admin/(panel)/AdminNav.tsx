"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/admin", "Dashboard", null],
  ["/admin/orders", "Orders", "orders"],
  ["/admin/products", "Products", null],
  ["/admin/collections", "Collections", null],
  ["/admin/requests", "Custom requests", "requests"],
  ["/admin/coupons", "Coupons", null],
  ["/admin/reviews", "Reviews", "reviews"],
  ["/admin/settings", "Settings", null],
] as const;

export default function AdminNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] md:flex-col md:pb-0">
      {LINKS.map(([href, label, key]) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        const n = key ? counts[key] : 0;
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-ink text-cream" : "text-ink hover:bg-shell"}`}
          >
            {label}
            {n > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-cream text-ink" : "bg-berry text-white"}`}>{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
