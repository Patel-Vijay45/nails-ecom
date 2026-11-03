import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, inr } from "@/lib/format";
import { Badge, PageTitle } from "./ui";

export default async function Dashboard() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const live = { status: { notIn: ["CANCELLED", "RTO"] } };

  const [month, today, toConfirm, toShip, requests, lowStock, recent, top] = await Promise.all([
    db.order.aggregate({ where: { ...live, createdAt: { gte: startOfMonth } }, _sum: { total: true }, _count: { _all: true } }),
    db.order.aggregate({ where: { ...live, createdAt: { gte: startOfDay } }, _sum: { total: true }, _count: { _all: true } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: { in: ["CONFIRMED", "IN_PRODUCTION", "PACKED"] } } }),
    db.customRequest.count({ where: { status: "NEW" } }),
    db.product.findMany({ where: { active: true, stock: { lte: 5 } }, orderBy: { stock: "asc" }, take: 6 }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.orderItem.groupBy({ by: ["name"], where: { order: live }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
  ]);
  const monthCount = month._count._all;
  const aov = monthCount ? (month._sum.total ?? 0) / monthCount : 0;

  return (
    <>
      <PageTitle title="Dashboard" sub={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}>
        <Link href="/admin/products/new" className="btn-primary">+ Add product</Link>
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sales this month" value={inr(month._sum.total ?? 0)} sub={`${monthCount} ${monthCount === 1 ? "order" : "orders"}`} />
        <Stat label="Today" value={inr(today._sum.total ?? 0)} sub={`${today._count._all} ${today._count._all === 1 ? "order" : "orders"}`} />
        <Stat label="Average order" value={inr(aov)} sub="this month" />
        <Stat label="To ship" value={String(toShip)} sub="confirmed, not shipped" />
      </div>

      {(toConfirm > 0 || requests > 0) && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {toConfirm > 0 && (
            <Link href="/admin/orders?status=PENDING" className="rounded-2xl bg-[#fdf0d5] p-5 text-[#8a5a00] transition hover:brightness-95">
              <p className="text-2xl font-bold">{toConfirm}</p>
              <p className="text-sm font-semibold">orders waiting for confirmation (COD / unpaid). Confirm them on WhatsApp →</p>
            </Link>
          )}
          {requests > 0 && (
            <Link href="/admin/requests" className="rounded-2xl bg-[#efe3ee] p-5 text-[#6b2a78] transition hover:brightness-95">
              <p className="text-2xl font-bold">{requests}</p>
              <p className="text-sm font-semibold">new custom / bridal requests to reply to →</p>
            </Link>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-berry">All orders →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No orders yet. Share your shop link on Instagram to get the first one!</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-berry">{o.number}</Link>
                      <p className="text-xs text-muted">{o.name} · {formatDateTime(o.createdAt)}</p>
                    </td>
                    <td className="py-3 text-right"><Badge value={o.status} /></td>
                    <td className="py-3 text-right font-semibold">{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-bold">Best sellers</h2>
            {top.length === 0 ? <p className="mt-4 text-sm text-muted">No sales yet.</p> : (
              <ol className="mt-4 space-y-2 text-sm">
                {top.map((t, i) => (
                  <li key={t.name} className="flex justify-between"><span>{i + 1}. {t.name}</span><b>{t._sum.quantity}</b></li>
                ))}
              </ol>
            )}
          </section>
          <section className="card p-6">
            <h2 className="font-bold">Low stock</h2>
            {lowStock.length === 0 ? <p className="mt-4 text-sm text-muted">All good.</p> : (
              <ul className="mt-4 space-y-2 text-sm">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <Link href={`/admin/products/${p.id}`} className="hover:text-berry">{p.name}</Link>
                    <b className={p.stock === 0 ? "text-berry" : ""}>{p.stock}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold md:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}
