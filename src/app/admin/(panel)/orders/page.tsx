import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDateTime, inr } from "@/lib/format";
import { Badge, PageTitle } from "../ui";

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.OrderWhereInput = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.q ? { OR: [{ number: { contains: sp.q.toUpperCase() } }, { name: { contains: sp.q } }, { phone: { contains: sp.q } }] } : {}),
  };
  const [orders, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } }, take: 200 }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <PageTitle title="Orders" sub="Newest first. Click an order to update it." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/orders" className="chip" data-active={!sp.status}>All</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className="chip" data-active={sp.status === s}>
            {STATUS_LABEL[s]} {count(s) > 0 && <span className="ml-1.5 opacity-60">{count(s)}</span>}
          </Link>
        ))}
      </div>
      <form className="mb-4">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={sp.q} placeholder="Search order no., name or phone" className="field max-w-sm" />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Payment</th><th className="p-4">Status</th><th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-line hover:bg-shell/50">
                <td className="p-4">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-berry">{o.number}</Link>
                  <p className="text-xs text-muted">{formatDateTime(o.createdAt)} · {o._count.items} items</p>
                </td>
                <td className="p-4">{o.name}<p className="text-xs text-muted">{o.city} · {o.phone}</p></td>
                <td className="p-4">
                  <span className="text-xs font-semibold">{o.paymentMethod}</span>{" "}
                  <Badge value={o.paymentStatus} label={o.paymentStatus === "PENDING" ? (o.paymentMethod === "COD" ? "On delivery" : "Unpaid") : undefined} />
                </td>
                <td className="p-4">
                  <Badge value={o.status} />
                  {o.shipStatus && !["DELIVERED", "RTO"].includes(o.status) && <p className="mt-1 text-[11px] text-muted">{o.shipStatus.toLowerCase()}</p>}
                </td>
                <td className="p-4 text-right font-semibold">{inr(o.total)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-muted">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
