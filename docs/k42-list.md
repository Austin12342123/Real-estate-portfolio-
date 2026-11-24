# K42 list: text under 12px on phones (left failing on purpose for card M2)

Source: device-matrix run 45115094894 (WebKit, commit d2799c6). Test: K42 inside 'sweep K39 K40 K41 K42 clipping' in tests/e2e/k-grader.spec.js, light scheme. Rule: no text under 12px. iPad profiles pass. Element = class (or TAG in capitals) = computed font-size.

| Screen | Profile | Element = px |
|---|---|---|
| asset-owned | iphone-15-portrait | sub=11px; auto=10px |
| asset-owned | iphone-se-landscape | sub=11px; auto=10px |
| asset-owned | iphone-se-portrait | sub=11px; auto=10px |
| asset-sell | iphone-15-portrait | sub=11px; auto=10px |
| asset-sell | iphone-se-landscape | sub=11px; auto=10px |
| asset-sell | iphone-se-portrait | sub=11px; auto=10px |
| asset | iphone-15-portrait | sub=11px; auto=10px |
| asset | iphone-se-landscape | sub=11px; auto=10px |
| asset | iphone-se-portrait | sub=11px; auto=10px |
| can-i-buy | iphone-15-portrait | sub=11px; auto=10px |
| can-i-buy | iphone-se-landscape | sub=11px; auto=10px |
| can-i-buy | iphone-se-portrait | sub=11px; auto=10px |
| health | iphone-15-portrait | SMALL=10px; pay=11.5px |
| health | iphone-se-landscape | SMALL=10px; pay=11.5px |
| health | iphone-se-portrait | SMALL=10px; pay=11.5px; TH=11px; nw=11px; TD=11.5px |
| import | iphone-15-portrait | pre=11px |
| import | iphone-se-landscape | pre=11px |
| import | iphone-se-portrait | pre=11px |
| order | iphone-15-portrait | pay=11.5px |
| order | iphone-se-landscape | pay=11.5px |
| order | iphone-se-portrait | pay=11.5px |
| planned-open | iphone-15-portrait | sub=11px; pay=11.5px; SPAN=11.5px; SMALL=10px; SMALL=10.833333px |
| planned-open | iphone-se-landscape | sub=11px; pay=11.5px; SPAN=11.5px; SMALL=10px; SMALL=10.833333px |
| planned-open | iphone-se-portrait | sub=11px; pay=11.5px; SPAN=11.5px; SMALL=10px; TH=11px; nw=11px; TD=11.5px; SMALL=10.833333px |
| planned | iphone-15-portrait | SMALL=10px; pay=11.5px |
| planned | iphone-se-landscape | SMALL=10px; pay=11.5px |
| planned | iphone-se-portrait | SMALL=10px; pay=11.5px; TH=11px; nw=11px; TD=11.5px |
| real | iphone-15-portrait | sub=11px; alt=11px; pay=11.5px; SPAN=11.5px; SMALL=10px |
| real | iphone-se-landscape | sub=11px; alt=11px; pay=11.5px; SPAN=11.5px; SMALL=10px |
| real | iphone-se-portrait | sub=11px; alt=11px; pay=11.5px; SPAN=11.5px; SMALL=10px |
| shortfall | iphone-15-portrait | sub=11px; auto=10px |
| shortfall | iphone-se-landscape | sub=11px; auto=10px |
| shortfall | iphone-se-portrait | sub=11px; auto=10px |
| your-savings-row | iphone-15-portrait | sub=11px; pay=11.5px; SPAN=11.5px; SMALL=10px; SMALL=10.833333px |
| your-savings-row | iphone-se-landscape | sub=11px; pay=11.5px; SPAN=11.5px; SMALL=10px; SMALL=10.833333px |
| your-savings-row | iphone-se-portrait | sub=11px; pay=11.5px; SPAN=11.5px; SMALL=10px; TH=11px; nw=11px; TD=11.5px; SMALL=10.833333px |
