import "server-only";
import { INDIAN_STATES } from "./constants";
import { db } from "./db";

export type PincodeInfo = { found: boolean; city: string; state: string; areas: string[]; unavailable?: boolean };
export type DeliveryRule = { prefix: string; codAllowed: boolean; extraShipping: number; note: string };

const CACHE = new Map<string, { at: number; info: PincodeInfo }>();
const TTL = 7 * 24 * 60 * 60 * 1000;

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
const STATE_BY_KEY = new Map(INDIAN_STATES.map((s) => [norm(s), s]));
const ALIASES: Record<string, string> = {
  orissa: "Odisha",
  pondicherry: "Puducherry",
  dadraandnagarhaveli: "Dadra and Nagar Haveli and Daman and Diu",
  damananddiu: "Dadra and Nagar Haveli and Daman and Diu",
  andamanandnicobar: "Andaman and Nicobar Islands",
  newdelhi: "Delhi",
  nctofdelhi: "Delhi",
  uttaranchal: "Uttarakhand",
};
export const matchState = (raw: string) => STATE_BY_KEY.get(norm(raw)) ?? ALIASES[norm(raw)] ?? "";

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * City, state and area names for a pincode, from the free India Post data at api.postalpincode.in.
 * It's an unofficial service: on any error we return found=false and checkout simply works without autofill.
 */
export async function lookupPincode(pin: string): Promise<PincodeInfo> {
  const hit = CACHE.get(pin);
  if (hit && Date.now() - hit.at < TTL) return hit.info;
  const empty = { found: false, city: "", state: "", areas: [] };
  try {
    const base = process.env.PINCODE_API_URL || "https://api.postalpincode.in/pincode/";
    const res = await fetch(`${base}${pin}`, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    if (!res.ok) return { ...empty, unavailable: true };
    const json = (await res.json()) as { Status?: string; PostOffice?: { Name: string; District: string; State: string; DeliveryStatus?: string }[] | null }[];
    const offices = json?.[0]?.Status === "Success" ? json[0].PostOffice ?? [] : [];
    if (!offices.length) {
      const info = { ...empty };
      CACHE.set(pin, { at: Date.now(), info }); // remember "not a real pincode" too
      return info;
    }
    const sorted = [...offices].sort((a, b) => Number(b.DeliveryStatus === "Delivery") - Number(a.DeliveryStatus === "Delivery"));
    const info: PincodeInfo = {
      found: true,
      city: title(offices[0].District),
      state: matchState(offices[0].State),
      areas: [...new Set(sorted.map((o) => o.Name.trim()))].slice(0, 15),
    };
    CACHE.set(pin, { at: Date.now(), info });
    return info;
  } catch {
    return { ...empty, unavailable: true }; // timeout / network error: don't cache, try again next time
  }
}

/** The active rule with the longest prefix matching this pincode, if any. */
export async function findPincodeRule(pin: string): Promise<DeliveryRule | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  const rules = await db.pincodeRule.findMany({ where: { active: true } });
  const match = rules.filter((r) => pin.startsWith(r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? { prefix: match.prefix, codAllowed: match.codAllowed, extraShipping: match.extraShipping, note: match.note } : null;
}
