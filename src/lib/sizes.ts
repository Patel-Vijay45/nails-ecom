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

/** Placeholder tip widths (mm) for sizes 0–11. Replace with your own in Admin → Settings. */
export const DEFAULT_TIP_WIDTHS = [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7];

/** A standard bank / credit / debit / Aadhaar PVC card is 85.6 mm wide (ISO/IEC 7810 ID-1). */
export const CARD_WIDTH_MM = 85.6;

/** The ₹10 coin is 27 mm across in every series in circulation (smaller coins changed size between series). */
export const COIN_10_MM = 27;

export const REFERENCES = {
  coin: { label: "₹10 coin", hint: "27 mm, any year" },
  ruler: { label: "Ruler / scale", hint: "most accurate" },
  card: { label: "Bank or Aadhaar card", hint: "85.6 mm wide" },
} as const;
export type RefKind = keyof typeof REFERENCES;

/** Picks the narrowest tip that still covers the nail (if between two sizes, go bigger). */
export function mmToKit(tipWidths: number[], mm: number) {
  for (let i = tipWidths.length - 1; i >= 0; i--) if (tipWidths[i] >= mm - 0.2) return i;
  return 0;
}

export function parseTipWidths(json: string | null | undefined): number[] {
  try {
    const v = JSON.parse(json ?? "");
    if (Array.isArray(v) && v.length === 12 && v.every((n) => typeof n === "number" && n > 0)) return v;
  } catch {}
  return DEFAULT_TIP_WIDTHS;
}

const point = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]);
/** One photo measurement: photo URL, the marked points (0–1 of image size) and mm per finger. */
export const scanSchema = z.object({
  url: z.string().regex(/^(\/uploads\/sizing\/[\w.-]+|https:\/\/res\.cloudinary\.com\/[\w./-]+)$/),
  hand: z.enum(["right", "left"]),
  card: z.tuple([point, point]),
  nails: z.array(z.tuple([point, point])).length(5),
  mm: z.array(z.number().min(0).max(40)).length(5),
  ref: z.object({ kind: z.enum(["coin", "ruler", "card"]), mm: z.number().min(5).max(400) }).optional(),
  // Which nails this photo measured (0 = thumb … 4 = pinky). Missing = all five (older one-photo scans).
  fingers: z.array(z.number().int().min(0).max(4)).max(5).optional(),
});
export type Scan = z.infer<typeof scanSchema>;

/** Calibration multipliers for photo measurements (Admin → Settings → Photo sizing accuracy). */
export type PhotoScale = { fingers: number; thumb: number };
export const DEFAULT_PHOTO_SCALE: PhotoScale = { fingers: 1, thumb: 1 };
