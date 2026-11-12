# Prompt to paste into Claude (the app's "Copy Claude prompt" button copies this)

Here is a Zillow listing: <PASTE LINK, or paste the listing text / attach screenshots>

Create a file named `house.json` for my real estate portfolio app. Use only facts you can actually
read from the listing. Do not guess. If a value is not shown, set it to null and mark its source "missing".
If you can only estimate a value (for example insurance), mark its source "estimate" and say how in `note`.

Format (JSON only, no commentary):

{
  "schema": "house-listing/1",
  "listingUrl": "<url or null>",
  "capturedOn": "YYYY-MM-DD",
  "address": "street, city, state zip",
  "price":       { "value": 0, "source": "listing" },
  "rentMonthly": { "value": 0, "source": "listing|estimate|missing", "note": "e.g. Zillow rent estimate" },
  "taxAnnual":   { "value": 0, "source": "listing|estimate|missing" },
  "insuranceAnnual": { "value": 0, "source": "listing|estimate|missing" },
  "hoaMonthly":  { "value": 0, "source": "listing|missing" },
  "info": { "beds": 0, "baths": 0, "sqft": 0, "yearBuilt": 0, "propertyType": "" }
}

Rules: all money in US dollars as plain numbers; taxAnnual and insuranceAnnual are per YEAR, hoaMonthly
and rentMonthly are per MONTH. Do not include interest rate or down payment; the app supplies those.
