import "server-only";

// Demo mode (SHIPROCKET_DEMO=1): answers like the real Shiprocket API, without an account or any charges.
// Used to try the booking flow before signing up. Data lives in memory and is lost on restart.
// The shapes copy the examples in Shiprocket's API reference (apidocs.shiprocket.in).

type Shipment = {
  srOrderId: number;
  channelOrderId: string;
  pincode: string;
  cod: boolean;
  awb?: string;
  courierId?: number;
  courierName?: string;
  pickupAt?: number;
  cancelled?: boolean;
};

const g = globalThis as unknown as { __srDemo?: { next: number; shipments: Map<number, Shipment>; orderIds: Set<string> } };
const state = (g.__srDemo ??= { next: 7100000, shipments: new Map(), orderIds: new Set() });

const COURIERS = [
  { id: 43, name: "Delhivery Surface", mult: 1, days: 0, rating: 4.6, cod: true },
  { id: 51, name: "Xpressbees Surface", mult: 0.92, days: 1, rating: 4.3, cod: true },
  { id: 10, name: "Ekart Logistics", mult: 0.88, days: 1, rating: 4.1, cod: true },
  { id: 6, name: "Blue Dart Air", mult: 1.9, days: -1, rating: 4.8, cod: false },
];
const REMOTE = ["18", "19", "78", "79", "737", "744", "682"];

function zone(from: string, to: string) {
  if (REMOTE.some((p) => to.startsWith(p))) return { rate: 96, days: 7 };
  if (from.slice(0, 3) === to.slice(0, 3)) return { rate: 32, days: 2 };
  if (from.slice(0, 2) === to.slice(0, 2)) return { rate: 42, days: 3 };
  if (from[0] === to[0]) return { rate: 55, days: 4 };
  return { rate: 68, days: 5 };
}

const etd = (days: number) =>
  new Date(Date.now() + days * 86400000).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" });
const ist = (t = Date.now()) => new Date(t).toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });

// Scans a parcel goes through after pickup, one per minute so the demo moves along while you watch.
const JOURNEY = [
  { label: "PICKED UP", activity: "In Transit - Shipment picked up", location: "Origin hub" },
  { label: "SHIPPED", activity: "In Transit - Shipment received at origin center", location: "Origin hub" },
  { label: "IN TRANSIT", activity: "In Transit - Bag added to trip", location: "Bhiwandi_Mega_GW (Maharashtra)" },
  { label: "REACHED AT DESTINATION HUB", activity: "Reached at destination", location: "Destination hub" },
  { label: "OUT FOR DELIVERY", activity: "Out for delivery", location: "Destination hub" },
  { label: "DELIVERED", activity: "Delivered", location: "Customer address" },
];
const STATUS_ID: Record<string, number> = { "PICKED UP": 42, SHIPPED: 6, "IN TRANSIT": 18, "REACHED AT DESTINATION HUB": 38, "OUT FOR DELIVERY": 17, DELIVERED: 7 };

type Json = Record<string, unknown>;

export function demoCall(method: string, path: string, query: Record<string, string>, body: Json): { status: number; json: unknown } {
  const p = path.replace(/\/+$/, "");
  if (p === "/auth/login") return { status: 200, json: { token: "demo-token", email: "demo@example.com" } };

  if (p === "/courier/serviceability") {
    const from = String(query.pickup_postcode ?? "");
    const to = String(query.delivery_postcode ?? "");
    if (to.startsWith("99") || to.startsWith("0")) return { status: 404, json: { status: 404, message: "Delivery postcode not serviceable" } };
    const z = zone(from, to);
    const cod = query.cod === "1";
    const noCod = to.startsWith("744");
    const list = COURIERS.filter((c) => !cod || (c.cod && !noCod)).map((c) => {
      const freight = Math.round(z.rate * c.mult);
      const codCharges = cod ? 30 : 0;
      const days = Math.max(1, z.days + c.days);
      return {
        courier_company_id: c.id,
        courier_name: c.name,
        cod: c.cod && !noCod ? 1 : 0,
        freight_charge: freight,
        cod_charges: codCharges,
        rate: freight + codCharges,
        estimated_delivery_days: String(days),
        etd: etd(days),
        rating: c.rating,
        is_surface: !c.name.includes("Air"),
      };
    });
    if (!list.length) return { status: 404, json: { status: 404, message: "No courier available for COD on this pincode" } };
    return { status: 200, json: { status: 200, currency: "INR", data: { available_courier_companies: list, recommended_courier_company_id: list[0].courier_company_id } } };
  }

  if (p === "/orders/create/adhoc") {
    const orderId = String(body.order_id ?? "");
    if (state.orderIds.has(orderId)) return { status: 422, json: { message: "Order Id already exists", status_code: 422 } };
    state.orderIds.add(orderId);
    const id = state.next++;
    state.shipments.set(id + 1000, { srOrderId: id, channelOrderId: orderId, pincode: String(body.billing_pincode), cod: body.payment_method === "COD" });
    return { status: 200, json: { order_id: id, shipment_id: id + 1000, status: "NEW", status_code: 1, awb_code: null, courier_company_id: null, courier_name: null } };
  }

  const shipmentOf = (v: unknown) => state.shipments.get(Number(Array.isArray(v) ? v[0] : v));

  if (p === "/courier/assign/awb") {
    const s = shipmentOf(body.shipment_id);
    if (!s || s.cancelled) return { status: 400, json: { message: "Invalid shipment id", status_code: 400 } };
    const c = COURIERS.find((x) => x.id === Number(body.courier_id)) ?? COURIERS[0];
    s.awb ??= `DEMO${Date.now().toString().slice(-9)}`;
    s.courierId = c.id;
    s.courierName = c.name;
    return {
      status: 200,
      json: { awb_assign_status: 1, response: { data: { awb_code: s.awb, courier_company_id: c.id, courier_name: c.name, shipment_id: Number(body.shipment_id), applied_weight: 0.5, pickup_scheduled_date: ist(Date.now() + 3600000) } } },
    };
  }

  if (p === "/courier/generate/pickup") {
    const s = shipmentOf(body.shipment_id);
    if (!s?.awb) return { status: 400, json: { message: "AWB not assigned", status_code: 400 } };
    s.pickupAt ??= Date.now();
    return { status: 200, json: { pickup_status: 1, response: { pickup_scheduled_date: ist(s.pickupAt + 3600000), pickup_token_number: `Reference No: DEMO_${s.awb}`, data: `Pickup is confirmed by ${s.courierName} For AWB :- ${s.awb}` } } };
  }

  if (p === "/courier/generate/label") {
    const s = shipmentOf(body.shipment_id);
    if (!s?.awb) return { status: 422, json: { message: "AWB not assigned", status_code: 422 } };
    return { status: 200, json: { label_created: 1, label_url: `/admin/demo-label?awb=${s.awb}`, response: "Label has been created and uploaded successfully!", not_created: [] } };
  }

  if (p === "/manifests/generate") {
    const s = shipmentOf(body.shipment_id);
    if (!s?.awb) return { status: 400, json: { message: "Pickup not generated", status_code: 400 } };
    return { status: 200, json: { status: 1, manifest_url: `/admin/demo-label?awb=${s.awb}&manifest=1` } };
  }

  if (p === "/orders/cancel") {
    const ids = (body.ids as unknown[]) ?? [];
    for (const s of state.shipments.values()) if (ids.map(Number).includes(s.srOrderId)) s.cancelled = true;
    return { status: 204, json: null };
  }

  if (p.startsWith("/courier/track/awb/")) {
    const awb = p.split("/").pop();
    const s = [...state.shipments.values()].find((x) => x.awb === awb);
    if (!s || !s.pickupAt) return { status: 200, json: { tracking_data: { track_status: 0, shipment_status: 0, shipment_track: [], shipment_track_activities: [], error: "Aahh! There is no activities found in our DB for this AWB." } } };
    const steps = Math.min(JOURNEY.length, Math.floor((Date.now() - s.pickupAt) / 60000));
    const done = JOURNEY.slice(0, steps).map((j, i) => ({ date: ist(s.pickupAt! + (i + 1) * 60000), status: j.label, activity: j.activity, location: j.location, "sr-status": String(STATUS_ID[j.label]), "sr-status-label": j.label }));
    const last = done[done.length - 1];
    return {
      status: 200,
      json: {
        tracking_data: {
          track_status: done.length ? 1 : 0,
          shipment_status: last ? STATUS_ID[last.status] : 0,
          shipment_track: [{ awb_code: s.awb, courier_name: s.courierName, current_status: last ? last["sr-status-label"] : "PICKUP SCHEDULED", edd: null }],
          shipment_track_activities: done.reverse(),
          track_url: `https://shiprocket.co/tracking/${s.awb}`,
          etd: ist(s.pickupAt + 4 * 86400000),
        },
      },
    };
  }

  if (p === "/settings/company/pickup") {
    return { status: 200, json: { data: { shipping_address: [{ id: 1, pickup_location: "Home", address: "Demo studio address", city: "Ahmedabad", state: "Gujarat", pin_code: "380015", phone: "9999999999", status: 2 }] } } };
  }
  if (p === "/account/details/wallet-balance") return { status: 200, json: { data: { balance_amount: "500.00" } } };

  return { status: 404, json: { message: "404 Not Found", status_code: 404 } };
}
