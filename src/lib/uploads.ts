import "server-only";
import { createHash, randomBytes } from "crypto";
import { access, mkdir, readdir, writeFile } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";

// Where uploaded photos go:
// - On a normal computer / VPS: a folder on disk (UPLOAD_DIR, default ./uploads), served at /uploads/...
// - When CLOUDINARY_URL is set: Cloudinary (free tier available). Use this on hosts whose disk
//   is temporary (Vercel, Netlify, Render/Railway without a volume), otherwise photos disappear → 404.

export const uploadDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./uploads");
export const usingCloudinary = () => Boolean(process.env.CLOUDINARY_URL);

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};
const MAX_BYTES = 8 * 1024 * 1024;

type Folder = "products" | "requests" | "sizing";

/** Saves uploaded images and returns their public URLs. */
export async function saveImages(files: File[], folder: Folder) {
  const urls: string[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = ALLOWED[file.type];
    if (!ext) throw new Error("Only JPG, PNG, WEBP or AVIF images are allowed");
    if (file.size > MAX_BYTES) throw new Error("Each image must be under 8 MB");
    urls.push(usingCloudinary() ? await uploadToCloudinary(file, folder) : await saveToDisk(file, folder, ext));
  }
  return urls;
}

async function saveToDisk(file: File, folder: Folder, ext: string) {
  const dir = path.join(/*turbopackIgnore: true*/ uploadDir(), folder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${name}`;
}

/** Signed upload to Cloudinary. CLOUDINARY_URL looks like cloudinary://API_KEY:API_SECRET@CLOUD_NAME */
async function uploadToCloudinary(file: File, folder: Folder) {
  const u = new URL(process.env.CLOUDINARY_URL!);
  const key = decodeURIComponent(u.username);
  const secret = decodeURIComponent(u.password);
  const cloud = u.hostname;
  const target = `${process.env.CLOUDINARY_FOLDER || "nails-shop"}/${folder}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha1").update(`folder=${target}&timestamp=${timestamp}${secret}`).digest("hex");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", key);
  fd.append("timestamp", timestamp);
  fd.append("folder", target);
  fd.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
  const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) throw new Error(`Cloudinary: ${json.error?.message ?? res.statusText}`);
  return json.secure_url;
}

/** Turns /uploads/a/b.jpg parts into a file path, refusing anything outside the upload folder. */
export function resolveUploadPath(parts: string[]) {
  const root = uploadDir();
  const file = path.resolve(/*turbopackIgnore: true*/ root, ...parts);
  const rel = path.relative(root, file);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return file;
}

/** Facts for the Settings → Photo storage check. */
export async function storageStatus() {
  if (usingCloudinary()) {
    const cloud = (() => {
      try {
        return new URL(process.env.CLOUDINARY_URL!).hostname;
      } catch {
        return "(CLOUDINARY_URL is not valid)";
      }
    })();
    return { mode: "cloudinary" as const, where: `Cloudinary account "${cloud}"`, writable: true, files: null as number | null, cwd: process.cwd() };
  }
  const dir = uploadDir();
  let writable = false;
  try {
    await mkdir(path.join(/*turbopackIgnore: true*/ dir, "products"), { recursive: true });
    await access(dir, fsConstants.W_OK);
    writable = true;
  } catch {}
  let files: number | null = null;
  try {
    files = (await readdir(path.join(/*turbopackIgnore: true*/ dir, "products"))).length;
  } catch {}
  return { mode: "disk" as const, where: dir, writable, files, cwd: process.cwd() };
}
