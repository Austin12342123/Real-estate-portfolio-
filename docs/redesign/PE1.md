Card PE1: page editor (Austin, Nov 27 02:12Z). Replaces RD7. Phase 8 of RD-BRIEFING.md: after RD5, RD8, RD12 and RD16. Push rule (AUTOPUSH.md). Size L, budget 200k; stop and hand back at 200k.

His words: "the user should be able to edit every page and the features that are included. The user should be able to add/remove different sections. The user should also be able to edit each section and feature and what's shown. The user should also be able to move different sections and information on each page. The user should be able to do this on mobile, laptop, and iPad. There should be a button in settings that will allow the user to accomplish this. When the user presses this button they'll be prompted to choose what page they want to change, the user will click the page they want to change and the app will automatically open the page with the ability to move/remove everything on that page."

Do:
1. Section registry (ui/shared/sections.*): every page is a list of sections, every section a list of items (tiles, rows, chart series, table columns, metric-strip cells). Each section and item has a stable id, a label, a default order, a default visible flag, and optional settings (which fields it shows, chart range, row count). RD4 onward register their sections here; PE1 fills in any not yet registered.
2. Layout data: meta.layout = { [pageId]: { sections: [{ id, visible, order, items: [{ id, visible, order }], settings }] } }, schema bump with a migration (missing = defaults). Saved with the portfolio so backups and sync carry it. New sections added in later versions appear in their default place.

<!-- Saved from the relayed message "Part 3 of 7" (2026-11-27). Items 3 onward are appended as they arrive. -->
