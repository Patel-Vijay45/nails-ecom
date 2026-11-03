import { cache } from "react";
import { db } from "./db";

/** Store settings row (created on first use if missing). */
export const getStore = cache(async () => {
  return (await db.store.findUnique({ where: { id: 1 } })) ?? (await db.store.create({ data: { id: 1 } }));
});

export type StoreSettings = Awaited<ReturnType<typeof getStore>>;
