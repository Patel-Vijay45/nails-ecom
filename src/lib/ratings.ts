import { db } from "./db";

/** Average rating and count of approved reviews, per product id. */
export async function getRatings() {
  const rows = await db.review.groupBy({
    by: ["productId"],
    where: { approved: true, productId: { not: null } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const map: Record<string, { avg: number; count: number }> = {};
  for (const r of rows) if (r.productId) map[r.productId] = { avg: r._avg.rating ?? 0, count: r._count._all };
  return map;
}
