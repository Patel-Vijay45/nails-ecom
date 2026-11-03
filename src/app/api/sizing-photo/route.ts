import { NextResponse } from "next/server";
import { saveImages } from "@/lib/uploads";

// Stores a hand photo from the photo sizing tool so the artist can double-check the sizes.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: "No photo" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Photo is too large" }, { status: 400 });
  try {
    const [url] = await saveImages([file], "sizing");
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
