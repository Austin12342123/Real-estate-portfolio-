# listing-import

Listing records used to add assets to the app (see CLAUDE.md, standing rules).

- `*.house.json` (schema `house-listing/1`): a house; read by the app's importer (`fromListing` in v4/engine.js). Example: `example.house.json`, `704-lost-creek-cir.house.json`.
- `*.business.json` (schema `business-listing/1`): a business for sale. Record of the listing facts and the model chosen; the app does not read it. `premier-florida-general-contractor.business.json` is the BizBuySell #2564259 listing. Its price was supplied by the user, the other figures were read from screenshots. It reaches every phone through the ADDITIONS entry `premier-fl-gc-bizbuysell-2564259` in v4/engine.js.
- `claude-prompt.md`: the prompt for turning a listing into a record.
