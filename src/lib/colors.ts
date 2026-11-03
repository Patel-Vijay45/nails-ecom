import { z } from "zod";
import { COLOR_FAMILIES } from "./constants";

/** One colour a design is available in. `extra` is added to the price (e.g. a chrome version). */
export const colorOptionSchema = z.object({
  name: z.string().trim().min(1).max(40),
  family: z.string().refine((f) => f in COLOR_FAMILIES, "Unknown colour family"),
  palette: z.tuple([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.string().regex(/^#[0-9a-fA-F]{6}$/)]),
  extra: z.number().int().min(0).max(100000).default(0),
});
export type ColorOption = z.infer<typeof colorOptionSchema>;

export function parseColors(json: string | null | undefined): ColorOption[] {
  try {
    const v = JSON.parse(json ?? "[]");
    if (!Array.isArray(v)) return [];
    return v.flatMap((c) => {
      const r = colorOptionSchema.safeParse(c);
      return r.success ? [r.data] : [];
    });
  } catch {
    return [];
  }
}

/** CSS background for a swatch. */
export const swatch = (c: Pick<ColorOption, "palette">) => `linear-gradient(135deg, ${c.palette[0]} 55%, ${c.palette[1]} 55%)`;
