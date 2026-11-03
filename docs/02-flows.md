# 2. Customer and Order Flows

These diagrams render on GitHub. They show the journey for the customer and the work behind each order.

## 2.1 Big picture: from stranger to repeat customer

```mermaid
flowchart LR
    A[Sees a Reel / creator post / ad] --> B[Visits Instagram or website]
    B --> C{Knows her size?}
    C -- No --> D[Buys sizing kit ₹99<br/>or uses sizing guide]
    D --> E[Gets coupon for first set]
    E --> F[Chooses a set]
    C -- Yes --> F
    F --> G[Checkout and pay]
    G --> H[Receives order + thank-you card]
    H --> I[Posts photo review → gets ₹100 off]
    I --> J[WhatsApp list: new drops & festival offers]
    J --> F
```

## 2.2 Buying a ready-made set on the website

```mermaid
flowchart TD
    A[Home page] --> B[Collection page<br/>Everyday / Glam / Bridal]
    B --> C[Product page<br/>photos, video, reviews, price]
    C --> D[Choose shape & length<br/>Almond / Coffin / Square · Short / Medium / Long]
    D --> E{Size option}
    E -- Standard XS/S/M/L --> F[Add to cart]
    E -- Made to measure --> G[Enter 10 nail sizes<br/>or 'I bought the sizing kit']
    G --> F
    F --> H[Cart: suggest add-ons<br/>glue, tabs, removal kit]
    H --> I[Checkout: phone, address, pincode]
    I --> J{Payment}
    J -- UPI / card / netbanking --> K[Order confirmed]
    J -- COD --> L[WhatsApp confirmation message] --> K
    K --> M[Email + WhatsApp: order received]
```

## 2.3 Custom / bridal order

Custom work takes the artist's time, so take a deposit before starting.

```mermaid
flowchart TD
    A[Customer fills custom-order form<br/>occasion, date, colours, reference photos, sizes] --> B[Artist reviews within 24 h]
    B --> C[Sends quote + sketch / mood board on WhatsApp]
    C --> D{Customer accepts?}
    D -- No --> E[Offer a similar ready-made set]
    D -- Yes --> F[Pays 50% deposit via payment link]
    F --> G[Artist makes the set]
    G --> H[Sends photo for approval]
    H --> I{Approved?}
    I -- Changes --> G
    I -- Yes --> J[Customer pays balance]
    J --> K[Pack and ship<br/>at least 7 days before the event]
```

## 2.4 Behind the scenes: from order to doorstep

```mermaid
flowchart TD
    A[New order] --> B{In stock?}
    B -- Ready-made in stock --> D[Pick set]
    B -- Made to measure / custom --> C[Add to production queue]
    C --> C1[Make set<br/>prep tips → base → design → top coat → cure]
    C1 --> C2[Quality check<br/>every nail, all 10 sizes correct]
    C2 --> D
    D --> E[Pack: nails on card, prep kit,<br/>instructions, thank-you card]
    E --> F[Create shipment in courier panel<br/>print label]
    F --> G[Courier pickup]
    G --> H[Tracking link sent on WhatsApp/email]
    H --> I[Delivered]
    I --> J[Day 3: 'How do they fit?' message<br/>+ ask for review]
```

**Target timings:**
- Ready-made: ship within 1–2 days
- Made-to-measure: ship within 3–5 days
- Custom / bridal: 7–14 days (state this clearly on the website)

## 2.5 Problem handling: wrong size, damage, returns

```mermaid
flowchart TD
    A[Customer reports a problem] --> B{What happened?}
    B -- Wrong size, standard set --> C[Send the missing sizes for free<br/>from spare stock]
    B -- Wrong size, made to measure --> D{Customer measured wrong?}
    D -- Yes --> E[Remake at 50% off]
    D -- No, our mistake --> F[Free remake]
    B -- Damaged in transit --> G[Ask for unboxing video/photo] --> F
    B -- Doesn't like design --> H[No return on hygiene grounds<br/>offer 10% off next order]
```

> Press-on nails are a personal hygiene product, so a "no returns once opened" policy is normal. Be generous on fit and damage — good reviews are worth more than one set.

## 2.6 Daily routine for running the shop

| Time | Task | Who |
|------|------|-----|
| Morning | Check new orders, confirm COD orders on WhatsApp, print labels | Husband / helper |
| Morning | Pack yesterday's finished sets, hand over to courier | Husband / helper |
| Day | Make sets from the production queue | Artist |
| Day | Film process clips while working (phone on a tripod) | Artist |
| Evening | Post 1 Reel, reply to DMs and comments | Either |
| Weekly | Look at the numbers (see business plan 1.7), plan next week's content, restock materials | Both |
| Monthly | Release a new design drop | Artist |

Splitting the work this way keeps the artist making and filming, and the other person handling orders, shipping, and customer messages.
