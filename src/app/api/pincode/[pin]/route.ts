import { NextResponse } from "next/server";
import { findPincodeRule, lookupPincode } from "@/lib/pincode";
import { deliveryInfo } from "@/lib/shipments";
import { getStore } from "@/lib/store";

// Checkout calls this when a 6-digit pincode is typed: city/state/areas, delivery rule,
// and (with Shiprocket connected) whether couriers deliver there, COD availability and days in transit.
export async function GET(_: Request, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ ok: false, error: "Enter a 6-digit pincode" }, { status: 400 });
  const store = await getStore();
  const [info, rule, delivery] = await Promise.all([lookupPincode(pin), findPincodeRule(pin), deliveryInfo(store, pin, { cod: store.codEnabled })]);
  return NextResponse.json({ ok: true, ...info, rule, delivery }, { headers: { "Cache-Control": "public, max-age=1800" } });
}
