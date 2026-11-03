import { NextResponse } from "next/server";
import { findPincodeRule, lookupPincode } from "@/lib/pincode";

// Checkout calls this when a 6-digit pincode is typed: city/state/areas + delivery rule.
export async function GET(_: Request, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ ok: false, error: "Enter a 6-digit pincode" }, { status: 400 });
  const [info, rule] = await Promise.all([lookupPincode(pin), findPincodeRule(pin)]);
  return NextResponse.json({ ok: true, ...info, rule }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
