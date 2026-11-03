import "server-only";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const uploadDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./uploads");

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};
const MAX_BYTES = 8 * 1024 * 1024;

/** Saves uploaded images to disk and returns their public URLs (/uploads/...). */
export async function saveImages(files: File[], folder: "products" | "requests") {
  const urls: string[] = [];
  const dir = path.join(/*turbopackIgnore: true*/ uploadDir(), folder);
  await mkdir(dir, { recursive: true });
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = ALLOWED[file.type];
    if (!ext) throw new Error("Only JPG, PNG, WEBP or AVIF images are allowed");
    if (file.size > MAX_BYTES) throw new Error("Each image must be under 8 MB");
    const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
    await writeFile(path.join(/*turbopackIgnore: true*/ dir, name), Buffer.from(await file.arrayBuffer()));
    urls.push(`/uploads/${folder}/${name}`);
  }
  return urls;
}
