Card PE1: page editor (Austin, Nov 27 02:12Z). Replaces RD7. Phase 8 of RD-BRIEFING.md: after RD5, RD8, RD12 and RD16. Push rule (AUTOPUSH.md). Size L, budget 200k; stop and hand back at 200k.

His words: "the user should be able to edit every page and the features that are included. The user should be able to add/remove different sections. The user should also be able to edit each section and feature and what's shown. The user should also be able to move different sections and information on each page. The user should be able to do this on mobile, laptop, and iPad. There should be a button in settings that will allow the user to accomplish this. When the user presses this button they'll be prompted to choose what page they want to change, the user will click the page they want to change and the app will automatically open the page with the ability to move/remove everything on that page."

Do:
1. Section registry (ui/shared/sections.*): every page is a list of sections, every section a list of items (tiles, rows, chart series, table columns, metric-strip cells). Each section and item has a stable id, a label, a default order, a default visible flag, and optional settings (which fields it shows, chart range, row count). RD4 onward register their sections here; PE1 fills in any not yet registered.
2. Layout data: meta.layout = { [pageId]: { sections: [{ id, visible, order, items: [{ id, visible, order }], settings }] } }, schema bump with a migration (missing = defaults). Saved with the portfolio so backups and sync carry it. New sections added in later versions appear in their default place.

3. Settings button "Edit pages" (Display card, beside Theme). It opens a page picker: one row per page (Home, Properties, Property page, Table view, Can I buy this?, Compare, Buy order, Money, Reports, Plan, Settings), each with a small preview and its count of hidden sections.
4. Tapping a page opens that page in edit mode, on the user's own data:
   - Each section gets a handle to drag, plus Move up / Move down buttons (needed for touch, keyboard and screen readers).
   - Each section gets Hide (eye) and Edit (opens a sheet: show or hide each item, reorder items, the section's settings).
   - Items inside a section (tiles, rows, columns, metric cells) can be dragged or moved with up/down the same way.
   - "Add section" at the bottom lists every hidden or available section for that page; tap to add it back where it was.
   - Top bar: page name, Reset page (back to defaults, asks once), Cancel, Done. Done saves; Cancel drops the changes.
   - "Edit page" also opens from a small pencil on each page's header in normal mode, straight into that page.
5. Works on phone (393px, touch drag with long-press, 44px targets), iPad portrait and landscape, and laptop (mouse drag and keyboard). No sideways scroll in edit mode.
6. Safety: hiding never deletes data or changes a figure; engine-diff 0. A page can't be left empty: at least one section stays (say so in one line). Hidden alerts still count for anything that blocks a buy, and the attention list says "1 hidden" with a Show link. Settings can't hide "Edit pages" itself, so the user can always get back.
7. Every (i) stays on any shown term or number. Gains and losses keep sign and arrow. Status keeps icon plus word.

Done when: on all three device sizes, a user can open Settings > Edit pages, pick each page, move, hide, edit and re-add every section and item, save, reload and see the same layout, restore it from a backup, and Reset page restores the default; T1-T6, grader, device matrix and engine-diff 0 pass in all six themes; one 393px and one 1280px screenshot of edit mode per page in the handback.
Files: ui/shared/sections.*, ui/shared/edit-mode.*, ui/**/ (register sections, edit-mode hooks, markup and CSS only), ui/more/settings.*, data/schema (meta.layout + migration), tests/e2e/page-editor.*, tests for the migration and backup round trip. No engine/.
Owner pe1.

<!-- Saved from the relayed messages "Part 3 of 7" to "Part 5 of 7" (2026-11-27). PE1.md is complete. -->
