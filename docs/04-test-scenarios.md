# 4. Test Scenarios

A checklist for testing every part of the shop by hand. Load the test data first:

```bash
npm run db:reset
```

```bash
npm run db:demo
```

`db:reset` **deletes everything** and loads the full test catalogue (34 products, 6 coupons). `db:demo` adds test orders, custom requests and pending reviews (all named "Test …"). Don't run them on the live shop's database.

✅ = checked automatically in the browser during development.

## A. Browsing (home and shop listing)

| # | Scenario | How to test | Expected |
|---|----------|-------------|----------|
| A1 ✅ | Home page loads | Open `/` | Hero with 3 boldest featured designs, collections, 8 bestsellers, reviews, FAQ |
| A2 ✅ | Collection filter | Shop → click "Nail Art & Trends" | Only marble, swirl, checks, florals |
| A3 ✅ | Type filter | Shop → Type → Acrylic | Only Acrylic sets (Cat Eye, Midnight Galaxy, Black Cherry, Crystal Queen) |
| A4 ✅ | Shape filter | Shape → Mountain Peak | Crystal Queen and Classic Nude Glaze |
| A5 ✅ | Length filter | Length → Extra Short | Only designs offered in extra short |
| A6 ✅ | Finish filter | Finish → Cat eye | Cat Eye Magnetic |
| A7 ✅ | Colour filter | Colour → Gold | Diwali Diya (has a "Pure Gold" colour) |
| A8 ✅ | Combined filters + clear | Type Soft gel + Colour Pink, then "Clear filters" | Results narrow, then all come back |
| A9 | Sort | Sort → Price: low to high | Cheapest first |
| A10 ✅ | Search | Type "chrome" in search | Chrome designs only |
| A11 | No results | Shape Lipstick + Finish Floral | "Nothing here yet" + custom-order button |
| A12 ✅ | Colour swatches on cards | Look at cards with several colours | Small colour dots under the name, "+n" if more than 5 |
| A13 ✅ | Hidden product | Visit `/product/winter-drop-preview` | Page not found; not listed in shop |

## B. Add to bag from the listing (quick add)

| # | Scenario | How to test | Expected |
|---|----------|-------------|----------|
| B1 ✅ | Simple item | Essentials → Add on "Brush-on Nail Glue" | Goes straight into the bag; bag opens |
| B2 ✅ | Item with colours only | Gel Strips → Add on "Semi-Cured Gel Strips" | Sheet with colours only → Add → bag shows the colour |
| B3 ✅ | Full set | Add on "Cat Eye Magnetic" | Sheet with colour, shape, length, size; preview updates |
| B4 ✅ | Extra-price colour in quick add | Cat Eye → choose Galaxy | Price shows ₹1,349 (+₹150) |
| B5 ✅ | Sold out | Look at "Tortoise Shell" | "Sold out" label, no Add button |
| B6 | Made to measure only | Look at "Velvet Wine" | "Made to measure only" label, no Add button; open the page to order |
| B7 | Exact fit link | Quick add sheet → "Need an exact fit?" | Opens product page |

## C. Product page (colours, options, sizes)

| # | Scenario | How to test | Expected |
|---|----------|-------------|----------|
| C1 ✅ | Colour options | Classic Nude Glaze → click Mocha | Preview turns mocha, label "Colour: Mocha" |
| C2 ✅ | Extra-price colour | Glazed Donut Chrome → Silver Mirror | Price +₹100 |
| C3 ✅ | All shapes | Classic Nude Glaze → click each of the 11 shapes | Preview redraws each shape |
| C4 ✅ | All lengths | Classic Nude Glaze → Extra Short … Extra Long | Preview gets shorter / longer |
| C5 | Sale price | Milk Bath French | Price + crossed-out price + "−22%" on card |
| C6 | Low stock | Jelly Pop | "Only 3 left in standard sizes" |
| C7 ✅ | Standard sold out, made to measure available | Velvet Wine | Standard sizes show "Sold out"; choosing Made to measure enables Add |
| C8 | No made to measure | Matte Mauve | No "Made to measure" option |
| C9 | Free made to measure | Royal Bride → Made to measure | No extra fee |
| C10 | No options | Floral Nail Stickers | No colour/shape/size, just Add to bag |
| C11 | Made to measure validation | Royal Bride → Made to measure → Add without sizes | Error asking for every finger |
| C12 | Saved sizes by phone | Made to measure → enter 9000000004 → Load my sizes | Right 3-6-5-6-8, Left 3-6-5-7-8 |
| C13 ✅ | Photo sizing with ₹10 coin | Made to measure → Measure from a photo → ₹10 coin | Gold circle fits the coin; sizes fill in |
| C13b ✅ | Photo sizing with ruler | Same, choose Ruler, put gold dots 5 cm apart | Sizes fill in |
| C13c | Photo sizing with card | Same, choose Bank or Aadhaar card | Sizes fill in |
| C15 ✅ | Real photo first | Product with uploaded photos | Main photo shows first; changing colour/shape/length switches to the live preview |
| C14 | Write a review | Any product → Write a review | "Thank you" message; appears after admin approves |

## D. Bag and checkout

| # | Scenario | How to test | Expected |
|---|----------|-------------|----------|
| D1 ✅ | Same design, different colours | Add Cat Eye in Emerald and Ruby | Two separate lines in the bag |
| D2 | Free-shipping meter | Bag under ₹999 | "Add ₹… more for free shipping" |
| D3 | Add-on suggestions | Open bag with a set in it | "Complete your kit" items |
| D4 ✅ | Coupon: percentage | WELCOME10 on ₹499+ | 10% off |
| D5 | Coupon: flat with minimum | FLAT200 on a ₹999 bag | "Add ₹501 more to use this code" |
| D6 ✅ | Coupon: expired | EXPIRED20 | "This code has expired" |
| D7 ✅ | Coupon: used up | USEDUP | "This code has been fully used" |
| D8 ✅ | Coupon: paused | PAUSED15 | "This code isn't valid" |
| D9 | Wrong phone / pincode | Phone 12345, pincode 12 | Field errors, order not placed |
| D10 ✅ | Cash on delivery order | Place COD order | Confirmation page, "Confirm on WhatsApp", +₹49 COD fee |
| D11 | Online payment | Add Razorpay **test** keys, pay with a test UPI/card | Order marked Paid + Confirmed |
| D12 ✅ | Colour saved on order | Order with a coloured item | Colour shows on confirmation and in admin |
| D13 ✅ | Price can't be faked | (automatic) Server recalculates prices incl. colour extra | Total matches database prices |
| D14 | Track order | `/track` with order number + phone | Opens the order page; wrong phone shows an error |

## E. Admin panel (`/admin`)

| # | Scenario | How to test | Expected |
|---|----------|-------------|----------|
| E1 ✅ | Dashboard with demo data | After `db:demo` | Sales, orders to confirm, custom requests, best sellers |
| E2 | Orders by status | Orders → each status chip | TEST1001–TEST1012 spread across all 8 statuses |
| E3 | Payment states | Orders list | On delivery / Unpaid / Paid / Failed / Refunded badges |
| E4 | Waiting for sizes | Open TEST1001 | Yellow "waiting for sizes" notice + size entry form |
| E5 | Ship an order | TEST1005 → Shipped + courier + AWB | Customer's order page shows Shipped + tracking |
| E6 | Cancel returns stock | Cancel an order with a ready-made set | Product stock goes back up |
| E7 ✅ | Add colours to a product | Products → edit → "+ Add colour" | Saved; shows on product page and as card dots |
| E8 | Hide a product | Untick "Live on shop" | Disappears from shop |
| E9 | Custom requests | Custom requests | 6 requests in every stage; "Send quote" opens WhatsApp |
| E10 | Approve reviews | Reviews | 2 "Test Reviewer" reviews waiting; Approve shows them on product page |
| E11 | Coupons | Create, pause, delete | Works at checkout as expected |
| E12 | Settings | Change shop name / shipping fee / tip widths | Shop updates instantly |
| E13 ✅ | Upload big phone photos | Product → Add photos → a 10 MB+ photo | Shrunk automatically, preview shown, saves fine |
| E14 ✅ | Unsupported photo | Add a HEIC photo on Windows/Chrome | Friendly message, nothing breaks |
| E15 ✅ | Main photo / remove | ★ Make main, Remove, Save | Order and removals saved; main photo first on shop |
| E17 ✅ | Photo storage check | Settings → Photo storage check | Shows folder, writable ✓, latest photos load |
| E16 ✅ | Big inspiration photo | Custom order form with a 10 MB photo | Request sends fine |
