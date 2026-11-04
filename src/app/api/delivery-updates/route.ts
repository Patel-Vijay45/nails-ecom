import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseWebhook } from "@/lib/shiprocket";
import { applyTracking } from "@/lib/shipments";

// Shiprocket tracking webhook (Shiprocket → Settings → API → Webhooks).
// The URL must not contain "shiprocket", "kartrocket", "sr" or "kr", hence the neutral name.
// Shiprocket sends the security token in the x-api-key header and expects a 200 reply every time.

const ok = () => NextResponse.json({ ok: true });

function tokenMatches(got: string | null) {
  const want = process.env.SHIPROCKET_WEBHOOK_TOKEN ?? "";
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!process.env.SHIPROCKET_WEBHOOK_TOKEN) {
    console.warn("[delivery-updates] Ignored a tracking update: set SHIPROCKET_WEBHOOK_TOKEN in .env and the same token in Shiprocket.");
    return ok();
  }
  if (!tokenMatches(req.headers.get("x-api-key"))) {
    console.warn("[delivery-updates] Ignored a tracking update with a wrong or missing x-api-key token.");
    return ok();
  }
  const body = await req.json().catch(() => null);
  const w = parseWebhook(body);
  if (!w.awb && !w.srOrderId) return ok();

  // Match on the AWB first, then on Shiprocket's order id.
  const order =
    (w.awb ? await db.order.findFirst({ where: { trackingNumber: w.awb } }) : null) ??
    (w.srOrderId ? await db.order.findFirst({ where: { srOrderId: w.srOrderId } }) : null);
  if (!order) {
    console.warn(`[delivery-updates] No order found for AWB ${w.awb || "-"} / Shiprocket order ${w.srOrderId || "-"}.`);
    return ok();
  }
  try {
    await applyTracking(order.id, w.update);
  } catch (e) {
    console.error("[delivery-updates] Couldn't save tracking update", e);
  }
  return ok();
}

// Lets you open the URL in a browser to check it's reachable.
export async function GET() {
  return NextResponse.json({ ok: true, info: "Delivery updates endpoint. Shiprocket sends tracking events here with POST." });
}
