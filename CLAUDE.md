# Standing rules

When asked to add a house/asset to the app: look the listing up online (price, beds/baths/sqft, year built, rent and Section 8 rent, property tax, insurance, HOA); ask the user for anything that cannot be found BEFORE adding it; add it to the PLANNED portfolio as the LAST asset (next number in the buy order) by default; write a listing-import JSON in prototype/listing-import/.

To add an asset to the app, append an entry to ADDITIONS in prototype/v4/engine.js (key + make) and bump DATA_V; NEVER replace users' portfolios in a migration; the entry is appended once to each device's own planned portfolio.

When the user pastes an in-app bug report: parse build stamps/invariants/events, reproduce it (Playwright against v4 with the described state), fix the root cause, add a regression check to the graders, run the full grader, push to main and publish the Artifact as usual.
