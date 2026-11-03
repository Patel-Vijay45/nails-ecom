# 6. Shipping Charges and Address Autofill: Business and Tech Plan

*Researched November 2026. Courier and map-API prices change often, so check the live rate cards before deciding. Figures marked "estimate" come from third-party summaries.*

## 6.1 Short answers

| Question | Answer |
|----------|--------|
| **Does "use my location" cost money?** | Getting the phone's GPS position is **free** (built into the browser). Turning it into an address (reverse geocoding) needs a map service. Google Maps and Ola Maps both have **free monthly allowances** big enough for a small shop, but Google needs a billing account (card) and Ola Maps moved to **prepaid credits** from 1 Sept 2026 for usage above the free tier. |
| **What do we recommend first?** | **Pincode autofill, which is free.** The customer types a 6-digit pincode and city + state fill in automatically from the India Post pincode data. It gives most of the benefit at ₹0 and needs no location permission. Add "Use my location" later only if customers ask for it. |
| **How do we charge shipping?** | Keep it **simple for the customer**: a flat fee under a threshold, free above it (what the site does today: ₹79, free above ₹999), plus a **COD fee**. Behind the scenes, ship through a **courier aggregator** and watch the real cost per order. Add zone pricing only if remote areas start losing money. |

## 6.2 Shipping: the business side

### What a parcel weighs

A press-on set in a gift box with prep kit is roughly **100–200 g**, and the box is small (e.g. 15 × 10 × 5 cm). Couriers charge whichever is higher of the real weight or the **volumetric weight** (L × B × H ÷ 5000 = 0.15 kg here), rounded up to the **0.5 kg slab**. So almost every order is billed as **0.5 kg**. Bundles of 3–4 sets still usually fit in 0.5 kg.

### What it costs (estimates, verify on the aggregator's calculator)

| Cost | Typical range (0.5 kg) |
|------|------------------------|
| Same city / zone | from about ₹23–40 |
| Rest of India | about ₹50–90 |
| North-East, J&K, remote areas | higher, varies by courier |
| COD charge (courier) | about ₹30–40 **or** ~2–2.5% of order value, whichever is higher |
| RTO (COD parcel refused) | you pay forward **and** return shipping |
| Weight disputes | extra charges if the declared weight is lower than the courier measures |

### Three ways to charge the customer

| Option | How it works | Pros | Cons |
|--------|--------------|------|------|
| **A. Flat + free above threshold** *(current)* | ₹79 under ₹999, free above | Simple, no surprise at checkout, pushes bigger orders | Remote orders cost you more |
| **B. Zones by pincode** | e.g. Local ₹49 · Rest of India ₹79 · NE/J&K ₹129 | Fairer, protects margin on remote orders | A bit more to explain |
| **C. Live courier rate** | Ask the aggregator for the real price at checkout | Exact | Price jumps between couriers; slows checkout; needs product weights |

**Recommendation: A now, B when needed. Avoid C for a small gift-style product.**

- **Shipping fee ₹79, free above ₹999.** With an average order of about ₹1,000, most orders get free shipping. Budget roughly **₹60–70 average shipping cost per order** (about 6–7% of revenue) and price the sets with that in mind.
- **COD fee ₹49** covers the courier's COD charge. Keep confirming COD orders on WhatsApp to cut refused parcels (RTO).
- **Turn off COD** (prepaid only) for pincodes with many refused parcels, and possibly for remote areas.
- Check the numbers monthly: **real shipping cost per order** vs **shipping charged**. If remote orders lose money, switch to option B. The admin panel already lets you change both fees in seconds.

### Which courier service

Use an **aggregator** (Shiprocket, NimbusPost, iThink Logistics, Shipmozo and others) rather than one courier: one account, many couriers, automatic labels, COD remittance and tracking. Signing up is free; you pay per shipment from a prepaid wallet. Compare 2–3 aggregators on the same 10 pincodes before choosing, and read reviews about weight-dispute and RTO charges.

## 6.3 Address autofill: options and costs

| Option | What the customer does | Cost | Notes |
|--------|------------------------|------|-------|
| **Pincode → city + state** *(recommended first)* | Types pincode; city, state and area suggestions fill in | **Free** | Uses India Post pincode data via a free public API (postalpincode.in). Unofficial, so the site must still work if it's down: customer just types. |
| **Browser "remember address"** *(already built)* | Address is pre-filled on the same phone next time | Free | Already in checkout |
| **Use my location** | Taps a button, allows location, address fills in | Free GPS + reverse geocoding (free monthly allowance on Google / Ola Maps) | Google needs a billing account; Ola Maps uses prepaid credits beyond its free tier from Sept 2026. GPS addresses are often slightly off, so the customer must still check the house/flat number. |
| **Address search (autocomplete)** | Types and picks from suggestions | Google Places / Ola Maps autocomplete; free allowance, then paid | More calls per order, so it uses up the free allowance faster |

## 6.4 Tech plan

### Phase 1: now (free, about 1 day)
- **Pincode autofill at checkout:** server route `/api/pincode/[pin]` calls the free pincode API with a 3-second timeout and caches results. Checkout fills city + state and suggests area names. If the lookup fails, the customer types as today.
- **Pincode rules in admin:** a small table of pincode prefixes (e.g. `79` NE states, `18`/`19` J&K) with "COD off" and/or "extra shipping ₹X". The server applies them when pricing the order.
- **Product weight** field (default 150 g), ready for Phase 2.

### Phase 2: when orders reach ~5+ per day (aggregator integration)
- **At checkout:** serviceability check by pincode (can we deliver? is COD available?) and an estimated delivery date ("Get it by Thursday").
- **In admin:** a **"Create shipment"** button on an order books the courier, gets the AWB number, downloads the label PDF and schedules pickup.
- **Tracking webhook:** order status updates to Shipped / Delivered / RTO automatically and sends the WhatsApp update.
- **Cost:** API access is free; you pay per shipment.

### Phase 3: optional
- **Zone-based shipping table** (option B) editable in admin.
- **"Use my location"** with reverse geocoding (Google or Ola Maps), only if customers ask for it.
- **Analytics:** real shipping cost vs charged, RTO rate per pincode, used to set COD rules automatically.

### Data model additions

| Where | Field | Purpose |
|-------|-------|---------|
| Product | `weightGrams` | Parcel weight for courier booking |
| New table `PincodeRule` | `prefix`, `codAllowed`, `extraShipping`, `note` | Remote-area rules |
| Order | `awb`, `courier`, `labelUrl`, `shippingCost` (real cost) | Booking + profit tracking (courier/tracking fields already exist) |
| Store settings | aggregator API keys (in `.env`, not the database) | Phase 2 |

## Sources

- [Google Maps Platform: India pricing](https://mapsplatform.google.com/intl/en_in/pricing/), [Google blog: Maps Platform for developers in India](https://blog.google/intl/en-in/products/explore-communicate/helping-developers-in-india-build-more-with-google-maps-platform/), [Woosmap: Is Google Maps API free in 2026?](https://www.woosmap.com/blog/is-google-maps-api-free)
- [Ola Maps pricing](https://maps.olakrutrim.com/pricing), [Ola Maps pricing update (Aug 2026)](https://maps.olakrutrim.com/pricing/update-2026), [Ola Maps: Made for India, priced for India](https://tech.olakrutrim.com/ola-maps-made-for-india-priced-for-india/)
- [Shiprocket: how to check COD charges](https://support.shiprocket.in/support/solutions/articles/152000000168-how-to-check-the-applied-cod-charges-), [Shiprocket on Shopify (reviews)](https://apps.shopify.com/shiprocket?locale=he), [Shiprocket alternatives 2026](https://shipprime.live/resources/blogs/11-best-shiprocket-alternatives-in-2026-for-d2c-brands), [Shipmozo pricing](https://www.shipmozo.com/pricing), [Cheapest courier services in India 2026](https://indiapost.org/cheapest-courier-service)
- [Postal PIN code API listing](https://publicapi.dev/postal-pin-code-api)
