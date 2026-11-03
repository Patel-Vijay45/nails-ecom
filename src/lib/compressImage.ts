// Browser-side photo preparation: rotates, shrinks and converts photos to JPEG before upload,
// so big phone photos (10–15 MB) upload fast and stay well under the server limits.

const KEEP_AS_IS = ["image/jpeg", "image/png", "image/webp"];

async function decode(file: File): Promise<{ draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; w: number; h: number }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { w: bmp.width, h: bmp.height, draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h) };
  } catch {
    // Fallback (e.g. Safari opening HEIC photos): let an <img> element decode it.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { w: img.naturalWidth, h: img.naturalHeight, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h) };
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

/** Returns a JPEG no larger than maxSide pixels, or the original file if it's already small and supported. */
export async function compressImage(file: File, maxSide = 2000, quality = 0.85): Promise<File> {
  const { w, h, draw } = await decode(file).catch(() => {
    throw new Error(`"${file.name}" couldn't be opened. Please use a JPG or PNG photo (on iPhone: Settings → Camera → Formats → Most Compatible).`);
  });
  if (KEEP_AS_IS.includes(file.type) && file.size <= 1024 * 1024 && Math.max(w, h) <= maxSide) return file;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // JPEG has no transparency
  ctx.fillRect(0, 0, cw, ch);
  draw(ctx, cw, ch);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error(`"${file.name}" couldn't be prepared for upload.`);
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
