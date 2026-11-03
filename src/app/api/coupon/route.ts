import { NextResponse } from "next/server";
import { evaluateCoupon } from "@/lib/pricing";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  const subtotal = Number(body.subtotal) || 0;
  return NextResponse.json(await evaluateCoupon(code, subtotal));
}
