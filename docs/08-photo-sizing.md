# 8. Photo Sizing: How It Works and How Accurate It Is

Customers without a sizing kit can get their nail sizes from **two photos and a ₹10 coin**. Measuring happens on the customer's phone. Photos are only uploaded if they agree to save them with the order.

## 8.1 What the customer does

1. Puts a **₹10 coin** on **white paper** (or any plain, light surface).
2. **Photo 1, four fingers:** hand flat on the paper, nails up, fingers slightly apart, coin just above the fingertips, phone straight above, about 20–25 cm away.
3. **Photo 2, thumb:** hand like a handshake at the edge of the table, fingers curled down over the edge, thumb lying flat on the paper with its nail facing up, coin next to it.
4. Looks at the result. Each nail has a line across it and a size. If a nail is marked **"Please check"**, they tap it to see it **close up** and drag the two dots to the nail's edges if needed.
5. Sizes fill in on the product page, and the artist gets the photos with the measuring lines.

Why a separate thumb photo: with the hand flat, the thumbnail faces sideways, so it can't be measured. That was the main problem with the first version.

## 8.2 What happens automatically

| Step | How |
|------|-----|
| Find the coin | Looks for a perfect circle with a second ring inside (the ₹10 coin is two-coloured), so round fingernails aren't mistaken for it. Gives millimetres per pixel (27 mm coin). |
| Find the fingers | Google's MediaPipe hand model, running in the browser. If it can't find the hand, the customer taps each nail once instead. |
| Find each nail's edges | The finger's outline against the paper gives its true direction and centre. Across the nail, the two side edges are the strongest matching pair of colour edges with skin on both sides. The widest part of the nail is used. If the outline can't be seen (fingers touching, table close to skin colour), it searches around the nail and asks the customer to check. |
| Sanity checks | A nail is marked "Please check" when the edges are faint (e.g. nude polish on fair skin), lines disagree, or one finger is far outside the usual proportions of the others. |
| Camera distance | Nails sit about 1 cm above the coin, so they look slightly bigger. The phone's distance is estimated from the coin's size and the lens, and the size is corrected. |
| Kit size | Width × your shop's **correction** (below), then the narrowest tip in your kit that covers it (Admin → Settings → tip widths). |

## 8.3 How accurate is it?

Tested on 250 synthetic nails with known widths. These cover four skin tones, natural / red / nude / dark nails, paper / grey / wood surfaces, 4–9 pixels per mm, and hand-model errors of ±3 mm:

| | Result |
|---|---|
| Coin found | 100% (size within 1.7%) |
| Nails the system is confident about (3 in 4) | **all within 0.5 mm**, i.e. the right kit size or one step away (tips usually differ by ~1 mm) |
| All nails | 92% within 0.5 mm; the rest are marked "Please check" or need a tap |
| Tapped nails | the same result within 0.1 mm even when the tap is 1 mm off-centre |

**First real phone test** (darker skin, dim indoor light, lined notebook paper, phone about 10 cm away): the coin and the hand were found, but the first version put two lines on the finger's edge instead of the nail's (17 mm instead of ~12 mm) and drew the thumb line along the nail. Both bugs are fixed. On that photo the nail is only slightly lighter than the skin around it, so automatic results are still not reliable there. That's why any nail the system is unsure about must now be **checked up close** before the customer can continue, and the app warns when a photo is too dark or taken too close.

**Third real phone photo** (plain paper, ₹10 coin, good light, fingers apart), compared with nail widths measured by hand from the photo: the coin was exact; middle and pinky came out right (about +0.6 mm and +0.1 mm); the index line sat at the cuticle (6.7 mm instead of ~10.8 mm); the ring nail wasn't found and needs a tap. So on real photos the automatic line is right for roughly half to two-thirds of nails. **That's why every nail now gets a quick close-up check** (one tap when the line is right, a drag when it isn't), until calibration on real hands shows the automatic result can be trusted.

**On stock photos**, polished nails were measured well. **Natural nails on fair skin** were the hardest: their edges are faint, so they're usually marked "Please check" and fitted in the close-up. Real-world accuracy also depends on things a test can't copy: how flat the hand is, nail curve, and lighting. Measure it on real hands with the calibration below.

What to tell customers: *"Photo sizing is usually spot on or one size off. Our artist checks your photos before making your set."* For a guaranteed fit, the ₹99 sizing kit is still the safest.

## 8.4 Calibrate it to your kit (do this once, 15 minutes)

Your tips, and how your artist fits them, decide which size is "right". The shop learns this from a few hands whose sizes you know.

1. **Admin → Settings → Sizing kit tip widths:** measure each tip straight across with a ruler and save.
2. Pick 5–10 people (you, family, regular customers) and find their real sizes with the kit.
3. **Admin → Settings → Photo sizing accuracy → Measure a hand with known sizes.** Take the same two photos as a customer would, then enter the sizes that really fit.
4. The shop works out the best correction (separately for fingers and thumbs) and shows **how many nails it now gets exactly right** on those hands. Add more hands any time; delete any that were measured badly.

The correction is applied to every customer's photo sizing straight away.

## 8.5 Tips if results look off

- **Plain white paper** (printer paper) under the hand and coin. No lines; wooden tables are close to skin colour.
- **Bright light**, near a window in daylight. In dim light the nail edges disappear.
- **A hand-span away** (20–25 cm). Very close shots distort the size and are hard to correct.
- **Fingers apart**, so there's paper between them.
- **Straight above** the hand. If the coin looks oval, the app asks for a retake.
- **No zoom, no flash**, good daylight.
- The coin must be a **₹10 coin**. ₹1, ₹2 and ₹5 coins changed size between series.

## 8.6 Files

| File | What |
|------|------|
| `src/lib/nailMeasure.ts` | Coin detection, nail edges, camera-distance correction (no browser APIs, so it can be tested in Node) |
| `src/components/product/SizeScanner.tsx` | The two-photo screens, taps and close-up |
| `src/lib/photoCalibration.ts` | Fitting the correction from known hands |
| `src/lib/exif.ts` | Reads the lens focal length from the photo, when the phone records it |
