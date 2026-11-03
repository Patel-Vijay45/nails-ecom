import { NextResponse } from "next/server";
import { getSavedSizes } from "@/lib/nailProfile";
import { isPhone, normalisePhone } from "@/lib/sizes";

// Returns only the saved size numbers for a phone (no name or address).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalisePhone(body?.phone);
  if (!isPhone(phone)) return NextResponse.json({ ok: false, error: "Enter your 10-digit mobile number" });
  const sizes = await getSavedSizes(phone);
  if (!sizes) return NextResponse.json({ ok: false, error: "No saved sizes for this number yet. Enter them below and we'll remember them." });
  return NextResponse.json({ ok: true, sizes });
}
