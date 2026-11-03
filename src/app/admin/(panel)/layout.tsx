import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStore } from "@/lib/store";
import { logout } from "../actions";
import AdminNav from "./AdminNav";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [store, pendingOrders, newRequests, pendingReviews] = await Promise.all([
    getStore(),
    db.order.count({ where: { status: "PENDING" } }),
    db.customRequest.count({ where: { status: "NEW" } }),
    db.review.count({ where: { approved: false } }),
  ]);
  return (
    <div className="min-h-screen bg-shell md:flex">
      <aside className="border-b border-line bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:py-6">
          <Link href="/admin" className="display text-2xl">
            {store.name}
            <span className="text-berry">.</span>
          </Link>
          <Link href="/" target="_blank" className="text-xs font-semibold text-berry md:hidden">View shop ↗</Link>
        </div>
        <AdminNav counts={{ orders: pendingOrders, requests: newRequests, reviews: pendingReviews }} />
        <div className="mt-auto hidden space-y-2 p-5 md:block">
          <Link href="/" target="_blank" className="btn-outline w-full py-2 text-xs">View shop ↗</Link>
          <form action={logout}>
            <button className="btn-ghost w-full py-2 text-xs text-muted">Log out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">{children}</div>
    </div>
  );
}
