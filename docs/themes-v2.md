# Themes v2 (Austin, Nov 25)

Rules (his words, summarized): every rectangular box has rounded corners; each theme has its own unique, rounder font; each theme uses exactly 4 colors that complement each other and the theme. Every other color token is a mix of two palette colors (recipe in themes-v2.json "mixes"). Kept: light/dark defaults (Oxford light, Tech Noir dark), 3:1 outline rule on control outlines only, text 4.5:1, heavier text in Oxford and Cottagecore, no orange in Dark Academia.

Roles: palette[0] paper, [1] ink (text), [2] and [3] the two accents. good = one accent, bad and warn = the other. Gains and losses always carry a sign and arrow, because the green/red pairs get close for color-blind readers (deltaE under 20 in deuteranopia for Oxford, Cottagecore, Ember).

| Theme | Mode | Palette | Font | Radius sm/md/lg |
|---|---|---|---|---|
| oxford | light | ivory #F7F3EA, navy #14213D, Oxford green #1F5135, oxblood #7A1F2B | Lora | 10px/14px/20px |
| clay | light | off-white #F4F2EF, near-black #171513, sage #4D6A48, terracotta #9C3E25 | Nunito | 14px/20px/28px |
| cottagecore | light | cream #F4F0E1, bark brown #3A2E24, moss #4A6A36, rosewood #98413A | M PLUS Rounded 1c | 12px/18px/24px |
| technoir | dark | black #0B0C0F, silver #E3E6EC, cyan #5CC8D6, neon rose #FF6B85 | Recursive (Casual) | 10px/12px/16px |
| darkacademia | dark | forest black #111A14, parchment #E8DFCB, brass #C8A75E, claret rose #D98A8A | Fraunces (Soft); figures in Young Serif | 10px/12px/16px |
| ember | dark | charcoal #161311, cream #F2EBE3, flame gold #E9B65A, ember red #F0775A | Baloo 2 | 14px/18px/24px |

Font files (all OFL, from npm @fontsource 5.3.0, latin subset only):
- oxford: @fontsource-variable/lora, lora-latin-wght-normal.woff2
- clay: @fontsource-variable/nunito, nunito-latin-wght-normal.woff2
- cottagecore: @fontsource/m-plus-rounded-1c, m-plus-rounded-1c-latin-500-normal.woff2 + -700-normal.woff2
- technoir: @fontsource-variable/recursive, recursive-latin-casl-normal.woff2
- darkacademia: @fontsource-variable/fraunces, fraunces-latin-soft-normal.woff2 ; @fontsource/young-serif, young-serif-latin-400-normal.woff2
- ember: @fontsource-variable/baloo-2, baloo-2-latin-wght-normal.woff2

Tabular digits: Lora, Baloo 2, Young Serif have tnum; Nunito, M PLUS Rounded 1c, Recursive have tabular digits by default. Fraunces has neither, so Dark Academia figures use Young Serif.

Checks: build-themes-v2.py regenerates the JSON and fails on contrast below 4.5 (text, muted, accent, good, warn, bad on bg/surface/surface2; onAccent on accent), control below 3:1, or a direct color outside the palette.
