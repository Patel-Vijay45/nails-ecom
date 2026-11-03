import "server-only";
import { db } from "./db";
import { sizesSchema, type NailSizes } from "./sizes";

export async function getSavedSizes(phone: string): Promise<NailSizes | null> {
  const row = await db.nailProfile.findUnique({ where: { phone } });
  if (!row) return null;
  try {
    const parsed = sizesSchema.safeParse({ right: JSON.parse(row.right), left: JSON.parse(row.left) });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveSizes(phone: string, sizes: NailSizes) {
  const data = { right: JSON.stringify(sizes.right), left: JSON.stringify(sizes.left) };
  await db.nailProfile.upsert({ where: { phone }, update: data, create: { phone, ...data } });
}
