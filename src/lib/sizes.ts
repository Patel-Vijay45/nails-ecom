import { z } from "zod";

/** Sizing-kit numbers: 0 is the widest tip (thumbs), 11 the narrowest (pinkies). */
export const KIT_SIZES = Array.from({ length: 12 }, (_, i) => i);

const hand = z.array(z.number().int().min(0).max(11)).length(5);
export const sizesSchema = z.object({ right: hand, left: hand });
export type NailSizes = z.infer<typeof sizesSchema>;

export const SEND_LATER = "Customer will send sizes on WhatsApp";

export function formatSizes(s: NailSizes) {
  const same = s.right.every((v, i) => v === s.left[i]);
  return same
    ? `Both hands ${s.right.join("-")} (kit sizes, thumb→pinky)`
    : `Right ${s.right.join("-")} · Left ${s.left.join("-")} (kit sizes, thumb→pinky)`;
}

export const normalisePhone = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);
export const isPhone = (p: string) => /^[6-9]\d{9}$/.test(p);
