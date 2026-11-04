# 7. Shiprocket Setup: Book Couriers from the Admin Panel

*Phase 2 of the [shipping plan](06-shipping-and-address-plan.md). Checked against Shiprocket's API reference (apidocs.shiprocket.in) in November 2026.*

## 7.1 What it does

| Where | What happens |
|-------|--------------|
| **Checkout** | After the pincode is typed: **"🚚 Delivery by about Tue, 10 Nov"** (packing or making days + the courier's days). Pincodes no courier serves are refused, and cash on delivery is hidden where no courier collects cash. If Shiprocket doesn't answer, checkout works as before. |
| **Admin → Orders → an order** | A **Shipment** box lists the couriers for that parcel with price, days and rating (Shiprocket's recommendation first). **Book shipment** creates the order in Shiprocket, assigns the courier (AWB number), requests pickup and makes the label. The order moves to *Packed*, the courier's price is saved as the real shipping cost, and the tracking link is filled in. |
| **After booking** | **Print label**, **Manifest**, **Tracking page**, **Refresh tracking**, and **Cancel shipment** (before pickup; you can then book again). If pickup or label fails, **Try again** carries on from where it stopped, without a second order or charge. |
| **Tracking updates** | Shiprocket sends every scan to the site. The order moves to *Shipped* when picked up / in transit, *Delivered* when delivered (COD orders are marked *Paid*), and *Returned to us* on RTO (stock goes back). The customer's order page shows the latest scans. |
| **Admin → Shipping** | Connection status and wallet balance, pickup address, box size, packing/making days, checkout options, webhook address, and a "test a pincode" box that now shows courier prices and COD availability. |

## 7.2 Set it up (about 30 minutes plus KYC)

1. **Create a Shiprocket account** at shiprocket.in (free sign-up), complete **KYC**, and add your **pickup address** (Settings → Pickup Addresses). Give it a short name like "Home"; the site uses that name.
2. **Recharge the wallet** (shipping is paid per parcel from the wallet). Start with a small amount.
3. **Create an API user**: Settings → API → Configure → **Create an API user**. Use an email **different from your login email** and set a password. (Shiprocket's API only accepts this API user, not your normal login.)
4. **Add to `.env`** on the server, then restart the site:

   ```
   SHIPROCKET_EMAIL="the-api-user@email"
   SHIPROCKET_PASSWORD="the API user's password"
   SHIPROCKET_WEBHOOK_TOKEN="any long random text"
   SITE_URL="https://your-shop.in"
   ```

5. **Admin → Shipping → Shiprocket**: the badge should say **Connected** and show your wallet balance. Choose your **pickup address** (the pincode fills in), check the **box size** (default 15 × 10 × 5 cm) and the **days to pack / make**, then **Save**.
6. **Tracking updates**: in Shiprocket → Settings → API → **Webhooks**, paste the URL shown on the Shipping page (`https://your-shop.in/api/delivery-updates`), turn it on, and enter the same **security token** as `SHIPROCKET_WEBHOOK_TOKEN`. Shiprocket doesn't allow the words "shiprocket", "kartrocket", "sr" or "kr" in the URL; ours avoids them, but check your domain name doesn't contain them either.
7. **First real order**: book it, then open the order in the Shiprocket panel and check the **COD amount** equals the order total on our site. After that, it's routine.

Updates only reach the site once it's online at a public address. On your own computer, use **Refresh tracking** on the order instead.

## 7.3 Try it first without an account (demo mode)

Put `SHIPROCKET_DEMO=1` in `.env` and restart. Everything works with pretend couriers (Delhivery, Xpressbees, Ekart, Blue Dart), prices by distance, a printable pretend label, and tracking that moves one step per minute after booking (press **Refresh tracking**). Pincodes starting with `99` are "not serviceable"; `744…` (Andaman) has no cash on delivery. **Nothing is booked or charged.** Remove the line before going live.

## 7.4 Daily routine

1. Confirm COD orders on WhatsApp (the Shipment box warns about unconfirmed ones).
2. Make / pack the order, then open it → **Book shipment** (pick a courier or keep the recommended one).
3. **Print label**, stick it on the parcel, and keep the parcel ready for pickup.
4. Tap **WhatsApp → Shipped** to send the customer the tracking link. Delivery updates arrive by themselves.

## 7.5 Good to know

- **Costs:** the API is free; you pay the courier rate shown when booking (deducted from the wallet). COD parcels include the courier's COD charge in that rate. The price is saved as the order's **real shipping cost**, so **Admin → Shipping** shows whether what you charge covers it.
- **Weight:** the parcel weight comes from each product's **packed weight** (Admin → Products). Couriers bill at least 0.5 kg. Keep weights and box size honest to avoid weight-dispute charges.
- **Delivery date at checkout** uses a 0.5 kg parcel and Shiprocket's recommended courier for the pincode, plus your packing days (or making days if the bag has a made-to-measure set). It's an estimate, worded as "about".
- **Customers without email:** Shiprocket requires one, so the shop's email (Settings) is sent instead.
- **Cancelled and re-booked** orders get a new reference (`NA123456-2`) because Shiprocket doesn't allow reusing a cancelled order's id.
- **Turning it off:** remove `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD`. Checkout and orders keep working; courier and tracking go back to being entered by hand.

## 7.6 If something goes wrong

| Message | What to do |
|---------|------------|
| "Shiprocket login failed" | Use the **API user's** email and password, not your normal login. After a failed login the site waits a minute before trying again. |
| "Wrong Pickup location entered" | The pickup address name must match Shiprocket exactly; choose it again in Admin → Shipping. |
| "Couldn't assign a courier … recharge your Shiprocket wallet" | Recharge the wallet, then press **Book shipment** again (it continues the same booking). |
| "Pickup not booked" / "Label not ready" | Press **Try again** on the order. You can also do it in the Shiprocket panel. |
| Tracking never updates | Check the webhook is on, the URL is your public address, and the token matches `SHIPROCKET_WEBHOOK_TOKEN` (Admin → Shipping shows if it's set). The server log prints `[delivery-updates] …` when it ignores an update. |
| Checkout shows no delivery date | Normal if Shiprocket isn't connected, the pickup pincode isn't set, or Shiprocket didn't answer in time. |

## Sources

- Shiprocket API reference (Postman collection behind apidocs.shiprocket.in): authentication (token valid 10 days), Create Custom Order (`/orders/create/adhoc`), Check Courier Serviceability, Generate AWB, Request Pickup, Generate Label / Manifest, Cancel Order, Track by AWB, Pickup Locations, Wallet Balance, and the Webhooks section (POST JSON, `x-api-key` security token, reply 200, forbidden URL words).
- [Shiprocket API document helpsheet](https://support.shiprocket.in/support/solutions/articles/43000337456-shiprocket-api-document-helpsheet): creating the API user, token lifetime.
