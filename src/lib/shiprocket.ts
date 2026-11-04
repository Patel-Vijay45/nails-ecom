import "server-only";
import { demoCall } from "./shiprocketDemo";

// Shiprocket courier aggregator (https://apidocs.shiprocket.in).
// Settings in .env: SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD (an "API user" made in Shiprocket → Settings → API,
// not your normal login), SHIPROCKET_WEBHOOK_TOKEN for tracking updates, SHIPROCKET_DEMO=1 to try without an account.

export type ShiprocketMode = "off" | "demo" | "live";

export function shiprocketMode(): ShiprocketMode {
  if (["1", "true", "yes"].includes((process.env.SHIPROCKET_DEMO ?? "").toLowerCase())) return "demo";
  return process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD ? "live" : "off";
}

export class ShiprocketError extends Error {}

const BASE = () => (process.env.SHIPROCKET_API_URL || "https://apiv2.shiprocket.in/v1/external").replace(/\/+$/, "");
const TIMEOUT = 12000;

type Json = Record<string, unknown>;
type TokenState = { token: string; at: number } | null;
const g = globalThis as unknown as { __srToken?: TokenState; __srLoginFailedAt?: number };

/** Logs in with the API user. Tokens last 10 days; we renew after 9 or when a call says 401. */
async function token(force = false) {
  const t = g.__srToken;
  if (!force && t && Date.now() - t.at < 9 * 86400000) return t.token;
  // After a failed login wait a minute before trying again, so a wrong password can't lock the account.
  if (g.__srLoginFailedAt && Date.now() - g.__srLoginFailedAt < 60000) {
    throw new ShiprocketError("Shiprocket login failed a moment ago. Check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD, then try again in a minute.");
  }
  const res = await fetch(`${BASE()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  }).catch(() => {
    throw new ShiprocketError("Couldn't reach Shiprocket. Check the internet connection and try again.");
  });
  const json = (await res.json().catch(() => ({}))) as { token?: string; message?: string };
  if (!res.ok || !json.token) {
    g.__srLoginFailedAt = Date.now();
    throw new ShiprocketError(
      `Shiprocket login failed${json.message ? ` (${json.message})` : ""}. Use the API user's email and password from Shiprocket → Settings → API, not your normal login.`,
    );
  }
  g.__srLoginFailedAt = 0;
  g.__srToken = { token: json.token, at: Date.now() };
  return json.token;
}

/** One API call. Returns the HTTP status and JSON body; throws ShiprocketError only when Shiprocket can't be reached. */
async function call(method: "GET" | "POST", path: string, opts: { query?: Record<string, string | number>; body?: Json } = {}) {
  const query = Object.fromEntries(Object.entries(opts.query ?? {}).map(([k, v]) => [k, String(v)]));
  if (shiprocketMode() === "demo") return demoCall(method, path, query, opts.body ?? {});
  if (shiprocketMode() === "off") throw new ShiprocketError("Shiprocket isn't set up yet. See Admin → Shipping.");
  const url = `${BASE()}${path}${Object.keys(query).length ? `?${new URLSearchParams(query)}` : ""}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token(attempt > 0)}` },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT),
      cache: "no-store",
    }).catch(() => {
      throw new ShiprocketError("Shiprocket didn't answer in time. Please try again.");
    });
    if (res.status === 401 && attempt === 0) continue; // token expired: log in again once
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { message: text.slice(0, 200) };
    }
    return { status: res.status, json };
  }
  throw new ShiprocketError("Shiprocket refused the login token.");
}

/** Readable error text from a Shiprocket error response. */
function errorText(json: unknown, fallback: string) {
  const j = (json ?? {}) as { message?: string; errors?: Record<string, string[] | string>; response?: { data?: { awb_assign_error?: string } } };
  const details = j.errors ? Object.values(j.errors).flat().join(" ") : "";
  return [j.response?.data?.awb_assign_error || j.message, details].filter(Boolean).join(": ") || fallback;
}

// ---------- Serviceability (can a courier deliver here? price, days) ----------

export type CourierOption = { id: number; name: string; rate: number; codCharges: number; days: number | null; etd: string; rating: number | null; cod: boolean; recommended: boolean };
export type Serviceability = { status: "ok"; deliverable: boolean; couriers: CourierOption[]; message?: string } | { status: "unavailable"; message: string };

const SERVICE_CACHE = new Map<string, { at: number; value: Serviceability }>();
const SERVICE_TTL = 6 * 60 * 60 * 1000;

export async function checkServiceability(p: { from: string; to: string; weightKg: number; cod: boolean; value?: number; dims?: { l: number; b: number; h: number } }): Promise<Serviceability> {
  if (!/^\d{6}$/.test(p.from) || !/^\d{6}$/.test(p.to)) return { status: "unavailable", message: "Pickup pincode not set" };
  const key = [p.from, p.to, p.weightKg, p.cod ? 1 : 0, p.dims ? `${p.dims.l}x${p.dims.b}x${p.dims.h}` : ""].join("|");
  const hit = SERVICE_CACHE.get(key);
  if (hit && Date.now() - hit.at < SERVICE_TTL) return hit.value;
  try {
    const query: Record<string, string | number> = { pickup_postcode: p.from, delivery_postcode: p.to, weight: p.weightKg, cod: p.cod ? 1 : 0 };
    if (p.value) query.declared_value = Math.round(p.value);
    if (p.dims) Object.assign(query, { length: p.dims.l, breadth: p.dims.b, height: p.dims.h });
    const { status, json } = await call("GET", "/courier/serviceability/", { query });
    const j = (json ?? {}) as { status?: number; message?: string; data?: { available_courier_companies?: Json[]; recommended_courier_company_id?: number } };
    if (status >= 500 || status === 401 || status === 429) return { status: "unavailable", message: errorText(json, `Shiprocket error ${status}`) };
    const list = j.data?.available_courier_companies ?? [];
    const recommended = Number(j.data?.recommended_courier_company_id ?? 0);
    const couriers: CourierOption[] = list
      .map((c) => ({
        id: Number(c.courier_company_id),
        name: String(c.courier_name ?? "Courier"),
        rate: Math.round(Number(c.rate ?? c.freight_charge ?? 0)),
        codCharges: Math.round(Number(c.cod_charges ?? 0)),
        days: Number.isFinite(parseInt(String(c.estimated_delivery_days), 10)) ? parseInt(String(c.estimated_delivery_days), 10) : null,
        etd: String(c.etd ?? ""),
        rating: c.rating != null && Number.isFinite(Number(c.rating)) ? Number(c.rating) : null,
        cod: Number(c.cod) === 1,
        recommended: Number(c.courier_company_id) === recommended,
      }))
      .filter((c) => c.id && (!p.cod || c.cod))
      .sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.rate - b.rate);
    // 4xx with no couriers = Shiprocket's way of saying "not serviceable". A 422 means our request was wrong.
    if (status === 422) return { status: "unavailable", message: errorText(json, "Invalid serviceability request") };
    const value: Serviceability = { status: "ok", deliverable: couriers.length > 0, couriers, message: couriers.length ? undefined : errorText(json, "No courier serves this pincode") };
    SERVICE_CACHE.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    return { status: "unavailable", message: (e as Error).message };
  }
}

// ---------- Booking ----------

export type ShipmentOrder = {
  orderId: string; // our reference, shown in Shiprocket
  orderDate: Date;
  pickupLocation: string;
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
  phone: string;
  items: { name: string; sku: string; units: number; price: number }[];
  cod: boolean;
  subtotal: number;
  discount: number;
  shipping: number;
  codFee: number;
  weightKg: number;
  dims: { l: number; b: number; h: number };
};

const istDate = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 16);

export async function createShiprocketOrder(o: ShipmentOrder) {
  const [first, ...rest] = o.name.trim().split(/\s+/);
  const body = {
    order_id: o.orderId,
    order_date: istDate(o.orderDate),
    pickup_location: o.pickupLocation,
    billing_customer_name: first,
    billing_last_name: rest.join(" "),
    billing_address: o.address1,
    billing_address_2: o.address2,
    billing_city: o.city.slice(0, 30),
    billing_pincode: o.pincode,
    billing_state: o.state,
    billing_country: "India",
    billing_email: o.email,
    billing_phone: o.phone,
    shipping_is_billing: true,
    order_items: o.items.map((i) => ({ name: i.name.slice(0, 120), sku: i.sku.slice(0, 50), units: i.units, selling_price: i.price, discount: 0, tax: 0 })),
    payment_method: o.cod ? "COD" : "Prepaid",
    // Shiprocket's order total = sub_total + shipping + transaction charges − total_discount (= what COD collects).
    sub_total: o.subtotal,
    total_discount: o.discount,
    shipping_charges: o.shipping,
    transaction_charges: o.codFee,
    giftwrap_charges: 0,
    length: o.dims.l,
    breadth: o.dims.b,
    height: o.dims.h,
    weight: o.weightKg,
  };
  const { status, json } = await call("POST", "/orders/create/adhoc", { body });
  const j = (json ?? {}) as { order_id?: number; shipment_id?: number };
  if (status >= 300 || !j.shipment_id) throw new ShiprocketError(`Couldn't create the Shiprocket order: ${errorText(json, `error ${status}`)}`);
  return { srOrderId: String(j.order_id), srShipmentId: String(j.shipment_id) };
}

export async function assignAwb(shipmentId: string, courierId?: number) {
  const body: Json = { shipment_id: Number(shipmentId) };
  if (courierId) body.courier_id = courierId;
  const { status, json } = await call("POST", "/courier/assign/awb", { body });
  const j = (json ?? {}) as { awb_assign_status?: number; response?: { data?: { awb_code?: string; courier_name?: string; courier_company_id?: number; pickup_scheduled_date?: string } } };
  const d = j.response?.data;
  if (status >= 300 || j.awb_assign_status !== 1 || !d?.awb_code) {
    const msg = errorText(json, `error ${status}`);
    throw new ShiprocketError(`Couldn't assign a courier: ${msg}${/balance|wallet|recharge/i.test(msg) ? " (recharge your Shiprocket wallet)" : ""}`);
  }
  return { awb: String(d.awb_code), courier: String(d.courier_name ?? ""), courierId: Number(d.courier_company_id ?? courierId ?? 0) };
}

export async function requestPickup(shipmentId: string) {
  const { status, json } = await call("POST", "/courier/generate/pickup", { body: { shipment_id: [Number(shipmentId)] } });
  const j = (json ?? {}) as { pickup_status?: number; response?: { pickup_scheduled_date?: string } };
  if (status >= 300 || j.pickup_status !== 1) throw new ShiprocketError(`Pickup not booked: ${errorText(json, `error ${status}`)}`);
  return { pickupDate: String(j.response?.pickup_scheduled_date ?? "") };
}

export async function generateLabel(shipmentId: string) {
  const { status, json } = await call("POST", "/courier/generate/label", { body: { shipment_id: [Number(shipmentId)] } });
  const j = (json ?? {}) as { label_created?: number; label_url?: string };
  if (status >= 300 || !j.label_url) throw new ShiprocketError(`Label not ready: ${errorText(json, `error ${status}`)}`);
  return j.label_url;
}

export async function generateManifest(shipmentId: string) {
  const { status, json } = await call("POST", "/manifests/generate", { body: { shipment_id: [Number(shipmentId)] } });
  const j = (json ?? {}) as { manifest_url?: string };
  if (status >= 300 || !j.manifest_url) throw new ShiprocketError(`Manifest not ready: ${errorText(json, `error ${status}`)}`);
  return j.manifest_url;
}

export async function cancelShiprocketOrder(srOrderId: string) {
  const { status, json } = await call("POST", "/orders/cancel", { body: { ids: [Number(srOrderId)] } });
  if (status >= 300) throw new ShiprocketError(`Couldn't cancel in Shiprocket: ${errorText(json, `error ${status}`)}`);
}

// ---------- Tracking ----------

export type TrackingEvent = { date: string; activity: string; location: string };
export type TrackingUpdate = { status: string; events: TrackingEvent[]; etd: string };

type Scan = { date?: string; activity?: string; location?: string; "sr-status-label"?: string };
const toEvents = (scans: Scan[] | undefined) =>
  (scans ?? [])
    .filter((s) => s.date && s.activity)
    .map((s) => ({ date: String(s.date), activity: String(s.activity).slice(0, 160), location: String(s.location ?? "").slice(0, 80) }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40);

export async function trackAwb(awb: string): Promise<TrackingUpdate | null> {
  const { status, json } = await call("GET", `/courier/track/awb/${encodeURIComponent(awb)}`);
  const t = ((json ?? {}) as { tracking_data?: { shipment_track?: { current_status?: string; edd?: string | null }[]; shipment_track_activities?: Scan[]; etd?: string; error?: string } }).tracking_data;
  if (status >= 300 || !t) throw new ShiprocketError(`Tracking not available: ${errorText(json, `error ${status}`)}`);
  if (t.error && !t.shipment_track_activities?.length) return null; // no scans yet (not picked up)
  return { status: String(t.shipment_track?.[0]?.current_status ?? "").toUpperCase(), events: toEvents(t.shipment_track_activities), etd: String(t.shipment_track?.[0]?.edd || t.etd || "") };
}

/** Body Shiprocket POSTs to our webhook on every tracking event. */
export function parseWebhook(body: unknown) {
  const b = (body ?? {}) as { awb?: string | number; order_id?: string; sr_order_id?: string | number; current_status?: string; shipment_status?: string; etd?: string; scans?: Scan[] };
  return {
    awb: b.awb != null ? String(b.awb) : "",
    orderId: String(b.order_id ?? ""),
    srOrderId: b.sr_order_id != null ? String(b.sr_order_id) : "",
    update: { status: String(b.shipment_status || b.current_status || "").toUpperCase(), events: toEvents(b.scans), etd: String(b.etd ?? "") } as TrackingUpdate,
  };
}

/** Courier status → our order status (null = no change). */
export function orderStatusFor(courierStatus: string): "SHIPPED" | "DELIVERED" | "RTO" | null {
  const s = courierStatus.toUpperCase().replace(/[_-]/g, " ").trim();
  if (!s) return null;
  if (s.startsWith("RTO") || s.includes("RETURN")) return "RTO";
  if (s === "DELIVERED") return "DELIVERED";
  if (["PICKED UP", "SHIPPED", "IN TRANSIT", "OUT FOR DELIVERY", "REACHED AT DESTINATION HUB", "UNDELIVERED", "DELAYED", "MISROUTED", "DESTINATION HUB"].includes(s) || s.includes("TRANSIT") || s.includes("OUT FOR DELIVERY")) return "SHIPPED";
  return null;
}

// ---------- Account ----------

export async function pickupLocations(): Promise<{ name: string; pincode: string; city: string; address: string }[]> {
  const { status, json } = await call("GET", "/settings/company/pickup");
  if (status >= 300) throw new ShiprocketError(errorText(json, `error ${status}`));
  const list = ((json ?? {}) as { data?: { shipping_address?: Json[] } }).data?.shipping_address ?? [];
  return list.map((a) => ({ name: String(a.pickup_location ?? ""), pincode: String(a.pin_code ?? ""), city: String(a.city ?? ""), address: String(a.address ?? "") })).filter((a) => a.name);
}

export async function walletBalance(): Promise<number | null> {
  const { status, json } = await call("GET", "/account/details/wallet-balance");
  if (status >= 300) return null;
  const v = Number(((json ?? {}) as { data?: { balance_amount?: string } }).data?.balance_amount);
  return Number.isFinite(v) ? v : null;
}

export const trackingLink = (awb: string) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
