# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: k-grader.spec.js >> K44 touch drag on Buy order: hold lifts a row and a drag reorders it; a quick swipe moves nothing; O / N / ? do nothing on touch
- Location: tests/e2e/k-grader.spec.js:71:1

# Error details

```
Error: order@568x320 hold 560 ms lifts the row and a drag moves row 3 to the top [{"lifted":true,"left":false},["maple","cedar","birch"],["maple","cedar","birch"]]

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- main [ref=f1e2]:
  - generic [ref=f1e3]:
    - button "Back" [ref=f1e4] [cursor=pointer]: ‹
    - heading "Buy order" [level=2] [ref=f1e5]
  - paragraph [ref=f1e7]: The first asset is bought first, paid for by the trust from everything above it. Drag a row, use the arrows or type a number. Assets you already own are not in this list.
  - paragraph [ref=f1e8]: "Drag a row to move it (on a phone or tablet: press and hold first)"
  - generic [ref=f1e9]:
    - generic [ref=f1e11]:
      - generic [ref=f1e13]:
        - button "Hold and drag to move 1412 Maple Ridge Dr" [ref=f1e14]: ⋮⋮
        - generic [ref=f1e15]:
          - generic "Buy number 1" [ref=f1e16]: "1"
          - text: 1412 Maple Ridge Dr
        - generic [ref=f1e17]: Home price $35,000
      - generic [ref=f1e20]:
        - generic [ref=f1e21]: Possible
        - text: · funded 6 months from today (May 2027)
      - generic [ref=f1e22]:
        - button "Move 1412 Maple Ridge Dr up" [disabled] [ref=f1e23]: ↑ Up
        - button "Move 1412 Maple Ridge Dr down" [ref=f1e24] [cursor=pointer]: ↓ Down
        - button "Move 1412 Maple Ridge Dr to the top" [disabled] [ref=f1e25]: ⤒ Top
        - generic [ref=f1e26]:
          - generic [ref=f1e27]: "Move to #"
          - textbox "Buy position for 1412 Maple Ridge Dr" [ref=f1e28]: "1"
    - generic [ref=f1e30]:
      - generic [ref=f1e32]:
        - button "Hold and drag to move 2207 Cedar Hollow Ln" [ref=f1e33]: ⋮⋮
        - generic [ref=f1e34]:
          - generic "Buy number 2" [ref=f1e35]: "2"
          - text: 2207 Cedar Hollow Ln
        - generic [ref=f1e36]: Home price $45,000
      - generic [ref=f1e39]:
        - generic [ref=f1e40]: Possible
        - text: · funded 11 months from today (Oct 2027)
      - generic [ref=f1e41]:
        - button "Move 2207 Cedar Hollow Ln up" [ref=f1e42] [cursor=pointer]: ↑ Up
        - button "Move 2207 Cedar Hollow Ln down" [ref=f1e43] [cursor=pointer]: ↓ Down
        - button "Move 2207 Cedar Hollow Ln to the top" [ref=f1e44] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e45]:
          - generic [ref=f1e46]: "Move to #"
          - textbox "Buy position for 2207 Cedar Hollow Ln" [ref=f1e47]: "2"
    - generic [ref=f1e49]:
      - generic [ref=f1e51]:
        - button "Hold and drag to move 908 Birchwood Ct" [ref=f1e52]: ⋮⋮
        - generic [ref=f1e53]:
          - generic "Buy number 3" [ref=f1e54]: "3"
          - text: 908 Birchwood Ct
        - generic [ref=f1e55]: Home price $55,000 · sold in the plan
      - generic [ref=f1e58]:
        - generic [ref=f1e59]: Possible
        - text: · funded 14 months from today (Jan 2028)
      - generic [ref=f1e60]:
        - button "Move 908 Birchwood Ct up" [ref=f1e61] [cursor=pointer]: ↑ Up
        - button "Move 908 Birchwood Ct down" [ref=f1e62] [cursor=pointer]: ↓ Down
        - button "Move 908 Birchwood Ct to the top" [ref=f1e63] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e64]:
          - generic [ref=f1e65]: "Move to #"
          - textbox "Buy position for 908 Birchwood Ct" [ref=f1e66]: "3"
    - generic [ref=f1e68]:
      - generic [ref=f1e70]:
        - button "Hold and drag to move 3350 Willow Bend Rd" [ref=f1e71]: ⋮⋮
        - generic [ref=f1e72]:
          - generic "Buy number 4" [ref=f1e73]: "4"
          - text: 3350 Willow Bend Rd
        - generic [ref=f1e74]: Home price $65,000
      - generic [ref=f1e77]:
        - generic [ref=f1e78]: Possible
        - text: · funded 18 months from today (May 2028)
      - generic [ref=f1e79]:
        - button "Move 3350 Willow Bend Rd up" [ref=f1e80] [cursor=pointer]: ↑ Up
        - button "Move 3350 Willow Bend Rd down" [ref=f1e81] [cursor=pointer]: ↓ Down
        - button "Move 3350 Willow Bend Rd to the top" [ref=f1e82] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e83]:
          - generic [ref=f1e84]: "Move to #"
          - textbox "Buy position for 3350 Willow Bend Rd" [ref=f1e85]: "4"
    - generic [ref=f1e87]:
      - generic [ref=f1e89]:
        - button "Hold and drag to move 2914 Linden Way" [ref=f1e90]: ⋮⋮
        - generic [ref=f1e91]:
          - generic "Buy number 5" [ref=f1e92]: "5"
          - text: 2914 Linden Way
        - generic [ref=f1e93]: Home price $80,000
      - generic [ref=f1e96]:
        - generic [ref=f1e97]: Possible
        - text: · funded 18 months from today (May 2028)
      - generic [ref=f1e98]:
        - button "Move 2914 Linden Way up" [ref=f1e99] [cursor=pointer]: ↑ Up
        - button "Move 2914 Linden Way down" [ref=f1e100] [cursor=pointer]: ↓ Down
        - button "Move 2914 Linden Way to the top" [ref=f1e101] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e102]:
          - generic [ref=f1e103]: "Move to #"
          - textbox "Buy position for 2914 Linden Way" [ref=f1e104]: "5"
    - generic [ref=f1e106]:
      - generic [ref=f1e108]:
        - button "Hold and drag to move 5521 Ridgeview Ct" [ref=f1e109]: ⋮⋮
        - generic [ref=f1e110]:
          - generic "Buy number 6" [ref=f1e111]: "6"
          - text: 5521 Ridgeview Ct
        - generic [ref=f1e112]: Home price $100,000
      - generic [ref=f1e115]:
        - generic [ref=f1e116]: Possible
        - text: · funded 21 months from today (Aug 2028)
      - generic [ref=f1e117]:
        - button "Move 5521 Ridgeview Ct up" [ref=f1e118] [cursor=pointer]: ↑ Up
        - button "Move 5521 Ridgeview Ct down" [ref=f1e119] [cursor=pointer]: ↓ Down
        - button "Move 5521 Ridgeview Ct to the top" [ref=f1e120] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e121]:
          - generic [ref=f1e122]: "Move to #"
          - textbox "Buy position for 5521 Ridgeview Ct" [ref=f1e123]: "6"
    - generic [ref=f1e125]:
      - generic [ref=f1e127]:
        - button "Hold and drag to move 7702 Sycamore Dr" [ref=f1e128]: ⋮⋮
        - generic [ref=f1e129]:
          - generic "Buy number 7" [ref=f1e130]: "7"
          - text: 7702 Sycamore Dr
        - generic [ref=f1e131]: Home price $120,000
      - generic [ref=f1e134]:
        - generic [ref=f1e135]: Possible
        - text: · funded 21 months from today (Aug 2028)
      - generic [ref=f1e136]:
        - button "Move 7702 Sycamore Dr up" [ref=f1e137] [cursor=pointer]: ↑ Up
        - button "Move 7702 Sycamore Dr down" [ref=f1e138] [cursor=pointer]: ↓ Down
        - button "Move 7702 Sycamore Dr to the top" [ref=f1e139] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e140]:
          - generic [ref=f1e141]: "Move to #"
          - textbox "Buy position for 7702 Sycamore Dr" [ref=f1e142]: "7"
    - generic [ref=f1e144]:
      - generic [ref=f1e146]:
        - button "Hold and drag to move 418 Elm Street" [ref=f1e147]: ⋮⋮
        - generic [ref=f1e148]:
          - generic "Buy number 8" [ref=f1e149]: "8"
          - text: 418 Elm Street
        - generic [ref=f1e150]: Home price $150,000
      - generic [ref=f1e153]:
        - generic [ref=f1e154]: Possible
        - text: · funded 29 months from today (Apr 2029)
      - generic [ref=f1e155]:
        - button "Move 418 Elm Street up" [ref=f1e156] [cursor=pointer]: ↑ Up
        - button "Move 418 Elm Street down" [ref=f1e157] [cursor=pointer]: ↓ Down
        - button "Move 418 Elm Street to the top" [ref=f1e158] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e159]:
          - generic [ref=f1e160]: "Move to #"
          - textbox "Buy position for 418 Elm Street" [ref=f1e161]: "8"
    - generic [ref=f1e163]:
      - generic [ref=f1e165]:
        - 'button "Hold and drag to move 1412 Maple Ridge Dr #2" [ref=f1e166]': ⋮⋮
        - generic [ref=f1e167]:
          - generic "Buy number 9" [ref=f1e168]: "9"
          - text: "1412 Maple Ridge Dr #2"
        - generic [ref=f1e169]: Home price $185,000
      - generic [ref=f1e172]:
        - generic [ref=f1e173]: Possible
        - text: · funded 39 months from today (Feb 2030)
      - generic [ref=f1e174]:
        - 'button "Move 1412 Maple Ridge Dr #2 up" [ref=f1e175] [cursor=pointer]': ↑ Up
        - 'button "Move 1412 Maple Ridge Dr #2 down" [ref=f1e176] [cursor=pointer]': ↓ Down
        - 'button "Move 1412 Maple Ridge Dr #2 to the top" [ref=f1e177] [cursor=pointer]': ⤒ Top
        - generic [ref=f1e178]:
          - generic [ref=f1e179]: "Move to #"
          - 'textbox "Buy position for 1412 Maple Ridge Dr #2" [ref=f1e180]': "9"
    - generic [ref=f1e182]:
      - generic [ref=f1e184]:
        - 'button "Hold and drag to move 2207 Cedar Hollow Ln #2" [ref=f1e185]': ⋮⋮
        - generic [ref=f1e186]:
          - generic "Buy number 10" [ref=f1e187]: "10"
          - text: "2207 Cedar Hollow Ln #2"
        - generic [ref=f1e188]: Home price $225,000
      - generic [ref=f1e191]:
        - generic [ref=f1e192]: Possible
        - text: · funded 45 months from today (Aug 2030)
      - generic [ref=f1e193]:
        - 'button "Move 2207 Cedar Hollow Ln #2 up" [ref=f1e194] [cursor=pointer]': ↑ Up
        - 'button "Move 2207 Cedar Hollow Ln #2 down" [ref=f1e195] [cursor=pointer]': ↓ Down
        - 'button "Move 2207 Cedar Hollow Ln #2 to the top" [ref=f1e196] [cursor=pointer]': ⤒ Top
        - generic [ref=f1e197]:
          - generic [ref=f1e198]: "Move to #"
          - 'textbox "Buy position for 2207 Cedar Hollow Ln #2" [ref=f1e199]': "10"
    - generic [ref=f1e201]:
      - generic [ref=f1e203]:
        - 'button "Hold and drag to move 908 Birchwood Ct #2" [ref=f1e204]': ⋮⋮
        - generic [ref=f1e205]:
          - generic "Buy number 11" [ref=f1e206]: "11"
          - text: "908 Birchwood Ct #2"
        - generic [ref=f1e207]: Home price $275,000
      - generic [ref=f1e210]:
        - generic [ref=f1e211]: Possible
        - text: · funded 53 months from today (Apr 2031)
      - generic [ref=f1e212]:
        - 'button "Move 908 Birchwood Ct #2 up" [ref=f1e213] [cursor=pointer]': ↑ Up
        - 'button "Move 908 Birchwood Ct #2 down" [ref=f1e214] [cursor=pointer]': ↓ Down
        - 'button "Move 908 Birchwood Ct #2 to the top" [ref=f1e215] [cursor=pointer]': ⤒ Top
        - generic [ref=f1e216]:
          - generic [ref=f1e217]: "Move to #"
          - 'textbox "Buy position for 908 Birchwood Ct #2" [ref=f1e218]': "11"
    - generic [ref=f1e220]:
      - generic [ref=f1e222]:
        - 'button "Hold and drag to move 3350 Willow Bend Rd #2" [ref=f1e223]': ⋮⋮
        - generic [ref=f1e224]:
          - generic "Buy number 12" [ref=f1e225]: "12"
          - text: "3350 Willow Bend Rd #2"
        - generic [ref=f1e226]: Home price $340,000
      - generic [ref=f1e229]:
        - generic [ref=f1e230]: Possible
        - text: · funded 64 months from today (Mar 2032)
      - generic [ref=f1e231]:
        - 'button "Move 3350 Willow Bend Rd #2 up" [ref=f1e232] [cursor=pointer]': ↑ Up
        - 'button "Move 3350 Willow Bend Rd #2 down" [ref=f1e233] [cursor=pointer]': ↓ Down
        - 'button "Move 3350 Willow Bend Rd #2 to the top" [ref=f1e234] [cursor=pointer]': ⤒ Top
        - generic [ref=f1e235]:
          - generic [ref=f1e236]: "Move to #"
          - 'textbox "Buy position for 3350 Willow Bend Rd #2" [ref=f1e237]': "12"
    - generic [ref=f1e239]:
      - generic [ref=f1e241]:
        - button "Hold and drag to move Northgate Retail Strip" [ref=f1e242]: ⋮⋮
        - generic [ref=f1e243]:
          - generic "Buy number 13" [ref=f1e244]: "13"
          - text: Northgate Retail Strip
        - generic [ref=f1e245]: Commercial price $420,000
      - generic [ref=f1e248]:
        - generic [ref=f1e249]: Possible
        - text: · funded 84 months from today (Nov 2033)
      - generic [ref=f1e250]:
        - button "Move Northgate Retail Strip up" [ref=f1e251] [cursor=pointer]: ↑ Up
        - button "Move Northgate Retail Strip down" [ref=f1e252] [cursor=pointer]: ↓ Down
        - button "Move Northgate Retail Strip to the top" [ref=f1e253] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e254]:
          - generic [ref=f1e255]: "Move to #"
          - textbox "Buy position for Northgate Retail Strip" [ref=f1e256]: "13"
    - generic [ref=f1e258]:
      - generic [ref=f1e260]:
        - button "Hold and drag to move Harbor St Self-Storage" [ref=f1e261]: ⋮⋮
        - generic [ref=f1e262]:
          - generic "Buy number 14" [ref=f1e263]: "14"
          - text: Harbor St Self-Storage
        - generic [ref=f1e264]: Commercial price $515,000
      - generic [ref=f1e267]:
        - generic [ref=f1e268]: Possible
        - text: · funded 93 months from today (Aug 2034)
      - generic [ref=f1e269]:
        - button "Move Harbor St Self-Storage up" [ref=f1e270] [cursor=pointer]: ↑ Up
        - button "Move Harbor St Self-Storage down" [ref=f1e271] [cursor=pointer]: ↓ Down
        - button "Move Harbor St Self-Storage to the top" [ref=f1e272] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e273]:
          - generic [ref=f1e274]: "Move to #"
          - textbox "Buy position for Harbor St Self-Storage" [ref=f1e275]: "14"
    - generic [ref=f1e277]:
      - generic [ref=f1e279]:
        - button "Hold and drag to move Lakeview Medical Office" [ref=f1e280]: ⋮⋮
        - generic [ref=f1e281]:
          - generic "Buy number 15" [ref=f1e282]: "15"
          - text: Lakeview Medical Office
        - generic [ref=f1e283]: Commercial price $635,000
      - generic [ref=f1e286]:
        - generic [ref=f1e287]: Possible
        - text: · funded 101 months from today (Apr 2035)
      - generic [ref=f1e288]:
        - button "Move Lakeview Medical Office up" [ref=f1e289] [cursor=pointer]: ↑ Up
        - button "Move Lakeview Medical Office down" [ref=f1e290] [cursor=pointer]: ↓ Down
        - button "Move Lakeview Medical Office to the top" [ref=f1e291] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e292]:
          - generic [ref=f1e293]: "Move to #"
          - textbox "Buy position for Lakeview Medical Office" [ref=f1e294]: "15"
    - generic [ref=f1e296]:
      - generic [ref=f1e298]:
        - button "Hold and drag to move Westfield Office Park" [ref=f1e299]: ⋮⋮
        - generic [ref=f1e300]:
          - generic "Buy number 16" [ref=f1e301]: "16"
          - text: Westfield Office Park
        - generic [ref=f1e302]: Commercial price $780,000
      - generic [ref=f1e305]:
        - generic [ref=f1e306]: Possible
        - text: · funded 116 months from today (Jul 2036)
      - generic [ref=f1e307]:
        - button "Move Westfield Office Park up" [ref=f1e308] [cursor=pointer]: ↑ Up
        - button "Move Westfield Office Park down" [ref=f1e309] [cursor=pointer]: ↓ Down
        - button "Move Westfield Office Park to the top" [ref=f1e310] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e311]:
          - generic [ref=f1e312]: "Move to #"
          - textbox "Buy position for Westfield Office Park" [ref=f1e313]: "16"
    - generic [ref=f1e315]:
      - generic [ref=f1e317]:
        - button "Hold and drag to move Eastgate Shopping Plaza" [ref=f1e318]: ⋮⋮
        - generic [ref=f1e319]:
          - generic "Buy number 17" [ref=f1e320]: "17"
          - text: Eastgate Shopping Plaza
        - generic [ref=f1e321]: Commercial price $960,000
      - generic [ref=f1e324]:
        - generic [ref=f1e325]: Possible
        - text: · funded 125 months from today (Apr 2037)
      - generic [ref=f1e326]:
        - button "Move Eastgate Shopping Plaza up" [ref=f1e327] [cursor=pointer]: ↑ Up
        - button "Move Eastgate Shopping Plaza down" [ref=f1e328] [cursor=pointer]: ↓ Down
        - button "Move Eastgate Shopping Plaza to the top" [ref=f1e329] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e330]:
          - generic [ref=f1e331]: "Move to #"
          - textbox "Buy position for Eastgate Shopping Plaza" [ref=f1e332]: "17"
    - generic [ref=f1e334]:
      - generic [ref=f1e336]:
        - button "Hold and drag to move Cornerstone Plumbing Co" [ref=f1e337]: ⋮⋮
        - generic [ref=f1e338]:
          - generic "Buy number 18" [ref=f1e339]: "18"
          - text: Cornerstone Plumbing Co
        - generic [ref=f1e340]: Business price $1.18M
      - generic [ref=f1e343]:
        - generic [ref=f1e344]: Possible
        - text: · funded 125 months from today (Apr 2037)
      - generic [ref=f1e345]:
        - button "Move Cornerstone Plumbing Co up" [ref=f1e346] [cursor=pointer]: ↑ Up
        - button "Move Cornerstone Plumbing Co down" [ref=f1e347] [cursor=pointer]: ↓ Down
        - button "Move Cornerstone Plumbing Co to the top" [ref=f1e348] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e349]:
          - generic [ref=f1e350]: "Move to #"
          - textbox "Buy position for Cornerstone Plumbing Co" [ref=f1e351]: "18"
    - generic [ref=f1e353]:
      - generic [ref=f1e355]:
        - button "Hold and drag to move Summit Freight & Logistics" [ref=f1e356]: ⋮⋮
        - generic [ref=f1e357]:
          - generic "Buy number 19" [ref=f1e358]: "19"
          - text: Summit Freight & Logistics
        - generic [ref=f1e359]: Business price $1.46M
      - generic [ref=f1e362]:
        - generic [ref=f1e363]: Possible
        - text: · funded 127 months from today (Jun 2037)
      - generic [ref=f1e364]:
        - button "Move Summit Freight & Logistics up" [ref=f1e365] [cursor=pointer]: ↑ Up
        - button "Move Summit Freight & Logistics down" [ref=f1e366] [cursor=pointer]: ↓ Down
        - button "Move Summit Freight & Logistics to the top" [ref=f1e367] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e368]:
          - generic [ref=f1e369]: "Move to #"
          - textbox "Buy position for Summit Freight & Logistics" [ref=f1e370]: "19"
    - generic [ref=f1e372]:
      - generic [ref=f1e374]:
        - button "Hold and drag to move Keystone HVAC Services" [ref=f1e375]: ⋮⋮
        - generic [ref=f1e376]:
          - generic "Buy number 20" [ref=f1e377]: "20"
          - text: Keystone HVAC Services
        - generic [ref=f1e378]: Business price $1.79M
      - generic [ref=f1e381]:
        - generic [ref=f1e382]: Possible
        - text: · funded 132 months from today (Nov 2037)
      - generic [ref=f1e383]:
        - button "Move Keystone HVAC Services up" [ref=f1e384] [cursor=pointer]: ↑ Up
        - button "Move Keystone HVAC Services down" [ref=f1e385] [cursor=pointer]: ↓ Down
        - button "Move Keystone HVAC Services to the top" [ref=f1e386] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e387]:
          - generic [ref=f1e388]: "Move to #"
          - textbox "Buy position for Keystone HVAC Services" [ref=f1e389]: "20"
    - generic [ref=f1e391]:
      - generic [ref=f1e393]:
        - button "Hold and drag to move Redwood Logistics Center" [ref=f1e394]: ⋮⋮
        - generic [ref=f1e395]:
          - generic "Buy number 21" [ref=f1e396]: "21"
          - text: Redwood Logistics Center
        - generic [ref=f1e397]: Commercial price $2.20M
      - generic [ref=f1e400]:
        - generic [ref=f1e401]: Possible
        - text: · funded 147 months from today (Feb 2039)
      - generic [ref=f1e402]:
        - button "Move Redwood Logistics Center up" [ref=f1e403] [cursor=pointer]: ↑ Up
        - button "Move Redwood Logistics Center down" [ref=f1e404] [cursor=pointer]: ↓ Down
        - button "Move Redwood Logistics Center to the top" [ref=f1e405] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e406]:
          - generic [ref=f1e407]: "Move to #"
          - textbox "Buy position for Redwood Logistics Center" [ref=f1e408]: "21"
    - generic [ref=f1e410]:
      - generic [ref=f1e412]:
        - button "Hold and drag to move Apex Property Services" [ref=f1e413]: ⋮⋮
        - generic [ref=f1e414]:
          - generic "Buy number 22" [ref=f1e415]: "22"
          - text: Apex Property Services
        - generic [ref=f1e416]: Business price $2.71M
      - generic [ref=f1e419]:
        - generic [ref=f1e420]: Possible
        - text: · funded 150 months from today (May 2039)
      - generic [ref=f1e421]:
        - button "Move Apex Property Services up" [ref=f1e422] [cursor=pointer]: ↑ Up
        - button "Move Apex Property Services down" [ref=f1e423] [cursor=pointer]: ↓ Down
        - button "Move Apex Property Services to the top" [ref=f1e424] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e425]:
          - generic [ref=f1e426]: "Move to #"
          - textbox "Buy position for Apex Property Services" [ref=f1e427]: "22"
    - generic [ref=f1e429]:
      - generic [ref=f1e431]:
        - button "Hold and drag to move Meridian Staffing Group" [ref=f1e432]: ⋮⋮
        - generic [ref=f1e433]:
          - generic "Buy number 23" [ref=f1e434]: "23"
          - text: Meridian Staffing Group
        - generic [ref=f1e435]: Business price $3.33M
      - generic [ref=f1e438]:
        - generic [ref=f1e439]: Possible
        - text: · funded 160 months from today (Mar 2040)
      - generic [ref=f1e440]:
        - button "Move Meridian Staffing Group up" [ref=f1e441] [cursor=pointer]: ↑ Up
        - button "Move Meridian Staffing Group down" [ref=f1e442] [cursor=pointer]: ↓ Down
        - button "Move Meridian Staffing Group to the top" [ref=f1e443] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e444]:
          - generic [ref=f1e445]: "Move to #"
          - textbox "Buy position for Meridian Staffing Group" [ref=f1e446]: "23"
    - generic [ref=f1e448]:
      - generic [ref=f1e450]:
        - button "Hold and drag to move Ironwood Manufacturing" [ref=f1e451]: ⋮⋮
        - generic [ref=f1e452]:
          - generic "Buy number 24" [ref=f1e453]: "24"
          - text: Ironwood Manufacturing
        - generic [ref=f1e454]: Business price $4.09M
      - generic [ref=f1e457]:
        - generic [ref=f1e458]: Possible
        - text: · funded 171 months from today (Feb 2041)
      - generic [ref=f1e459]:
        - button "Move Ironwood Manufacturing up" [ref=f1e460] [cursor=pointer]: ↑ Up
        - button "Move Ironwood Manufacturing down" [ref=f1e461] [cursor=pointer]: ↓ Down
        - button "Move Ironwood Manufacturing to the top" [ref=f1e462] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e463]:
          - generic [ref=f1e464]: "Move to #"
          - textbox "Buy position for Ironwood Manufacturing" [ref=f1e465]: "24"
    - generic [ref=f1e467]:
      - generic [ref=f1e469]:
        - button "Hold and drag to move Bayview Medical Plaza" [ref=f1e470]: ⋮⋮
        - generic [ref=f1e471]:
          - generic "Buy number 25" [ref=f1e472]: "25"
          - text: Bayview Medical Plaza
        - generic [ref=f1e473]: Commercial price $5.04M
      - generic [ref=f1e476]:
        - generic [ref=f1e477]: Possible
        - text: · funded 188 months from today (Jul 2042)
      - generic [ref=f1e478]:
        - button "Move Bayview Medical Plaza up" [ref=f1e479] [cursor=pointer]: ↑ Up
        - button "Move Bayview Medical Plaza down" [ref=f1e480] [cursor=pointer]: ↓ Down
        - button "Move Bayview Medical Plaza to the top" [ref=f1e481] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e482]:
          - generic [ref=f1e483]: "Move to #"
          - textbox "Buy position for Bayview Medical Plaza" [ref=f1e484]: "25"
    - generic [ref=f1e486]:
      - generic [ref=f1e488]:
        - button "Hold and drag to move Granite Industrial Supply" [ref=f1e489]: ⋮⋮
        - generic [ref=f1e490]:
          - generic "Buy number 26" [ref=f1e491]: "26"
          - text: Granite Industrial Supply
        - generic [ref=f1e492]: Business price $6.19M
      - generic [ref=f1e495]:
        - generic [ref=f1e496]: Possible
        - text: · funded 189 months from today (Aug 2042)
      - generic [ref=f1e497]:
        - button "Move Granite Industrial Supply up" [ref=f1e498] [cursor=pointer]: ↑ Up
        - button "Move Granite Industrial Supply down" [ref=f1e499] [cursor=pointer]: ↓ Down
        - button "Move Granite Industrial Supply to the top" [ref=f1e500] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e501]:
          - generic [ref=f1e502]: "Move to #"
          - textbox "Buy position for Granite Industrial Supply" [ref=f1e503]: "26"
    - generic [ref=f1e505]:
      - generic [ref=f1e507]:
        - button "Hold and drag to move Bayview Dental Group" [ref=f1e508]: ⋮⋮
        - generic [ref=f1e509]:
          - generic "Buy number 27" [ref=f1e510]: "27"
          - text: Bayview Dental Group
        - generic [ref=f1e511]: Business price $7.62M
      - generic [ref=f1e514]:
        - generic [ref=f1e515]: Possible
        - text: · funded 198 months from today (May 2043)
      - generic [ref=f1e516]:
        - button "Move Bayview Dental Group up" [ref=f1e517] [cursor=pointer]: ↑ Up
        - button "Move Bayview Dental Group down" [ref=f1e518] [cursor=pointer]: ↓ Down
        - button "Move Bayview Dental Group to the top" [ref=f1e519] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e520]:
          - generic [ref=f1e521]: "Move to #"
          - textbox "Buy position for Bayview Dental Group" [ref=f1e522]: "27"
    - generic [ref=f1e524]:
      - generic [ref=f1e526]:
        - button "Hold and drag to move Pioneer Healthcare Staffing" [ref=f1e527]: ⋮⋮
        - generic [ref=f1e528]:
          - generic "Buy number 28" [ref=f1e529]: "28"
          - text: Pioneer Healthcare Staffing
        - generic [ref=f1e530]: Business price $9.37M
      - generic [ref=f1e533]:
        - generic [ref=f1e534]: Possible
        - text: · funded 207 months from today (Feb 2044)
      - generic [ref=f1e535]:
        - button "Move Pioneer Healthcare Staffing up" [ref=f1e536] [cursor=pointer]: ↑ Up
        - button "Move Pioneer Healthcare Staffing down" [ref=f1e537] [cursor=pointer]: ↓ Down
        - button "Move Pioneer Healthcare Staffing to the top" [ref=f1e538] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e539]:
          - generic [ref=f1e540]: "Move to #"
          - textbox "Buy position for Pioneer Healthcare Staffing" [ref=f1e541]: "28"
    - generic [ref=f1e543]:
      - generic [ref=f1e545]:
        - button "Hold and drag to move Summit Business Park" [ref=f1e546]: ⋮⋮
        - generic [ref=f1e547]:
          - generic "Buy number 29" [ref=f1e548]: "29"
          - text: Summit Business Park
        - generic [ref=f1e549]: Commercial price $11.5M
      - generic [ref=f1e552]:
        - generic [ref=f1e553]: Possible
        - text: · funded 221 months from today (Apr 2045)
      - generic [ref=f1e554]:
        - button "Move Summit Business Park up" [ref=f1e555] [cursor=pointer]: ↑ Up
        - button "Move Summit Business Park down" [ref=f1e556] [cursor=pointer]: ↓ Down
        - button "Move Summit Business Park to the top" [ref=f1e557] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e558]:
          - generic [ref=f1e559]: "Move to #"
          - textbox "Buy position for Summit Business Park" [ref=f1e560]: "29"
    - generic [ref=f1e562]:
      - generic [ref=f1e564]:
        - button "Hold and drag to move Atlas Distribution Group" [ref=f1e565]: ⋮⋮
        - generic [ref=f1e566]:
          - generic "Buy number 30" [ref=f1e567]: "30"
          - text: Atlas Distribution Group
        - generic [ref=f1e568]: Business price $14.2M
      - generic [ref=f1e571]:
        - generic [ref=f1e572]: Possible
        - text: · funded 224 months from today (Jul 2045)
      - generic [ref=f1e573]:
        - button "Move Atlas Distribution Group up" [ref=f1e574] [cursor=pointer]: ↑ Up
        - button "Move Atlas Distribution Group down" [ref=f1e575] [cursor=pointer]: ↓ Down
        - button "Move Atlas Distribution Group to the top" [ref=f1e576] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e577]:
          - generic [ref=f1e578]: "Move to #"
          - textbox "Buy position for Atlas Distribution Group" [ref=f1e579]: "30"
    - generic [ref=f1e581]:
      - generic [ref=f1e583]:
        - button "Hold and drag to move Beacon Engineering Services" [ref=f1e584]: ⋮⋮
        - generic [ref=f1e585]:
          - generic "Buy number 31" [ref=f1e586]: "31"
          - text: Beacon Engineering Services
        - generic [ref=f1e587]: Business price $17.4M
      - generic [ref=f1e590]:
        - generic [ref=f1e591]: Possible
        - text: · funded 234 months from today (May 2046)
      - generic [ref=f1e592]:
        - button "Move Beacon Engineering Services up" [ref=f1e593] [cursor=pointer]: ↑ Up
        - button "Move Beacon Engineering Services down" [ref=f1e594] [cursor=pointer]: ↓ Down
        - button "Move Beacon Engineering Services to the top" [ref=f1e595] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e596]:
          - generic [ref=f1e597]: "Move to #"
          - textbox "Buy position for Beacon Engineering Services" [ref=f1e598]: "31"
    - generic [ref=f1e600]:
      - generic [ref=f1e602]:
        - button "Hold and drag to move Northstar Packaging" [ref=f1e603]: ⋮⋮
        - generic [ref=f1e604]:
          - generic "Buy number 32" [ref=f1e605]: "32"
          - text: Northstar Packaging
        - generic [ref=f1e606]: Business price $21.4M
      - generic [ref=f1e609]:
        - generic [ref=f1e610]: Possible
        - text: · funded 244 months from today (Mar 2047)
      - generic [ref=f1e611]:
        - button "Move Northstar Packaging up" [ref=f1e612] [cursor=pointer]: ↑ Up
        - button "Move Northstar Packaging down" [ref=f1e613] [cursor=pointer]: ↓ Down
        - button "Move Northstar Packaging to the top" [ref=f1e614] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e615]:
          - generic [ref=f1e616]: "Move to #"
          - textbox "Buy position for Northstar Packaging" [ref=f1e617]: "32"
    - generic [ref=f1e619]:
      - generic [ref=f1e621]:
        - button "Hold and drag to move Crossroads Retail Center" [ref=f1e622]: ⋮⋮
        - generic [ref=f1e623]:
          - generic "Buy number 33" [ref=f1e624]: "33"
          - text: Crossroads Retail Center
        - generic [ref=f1e625]: Commercial price $26.4M
      - generic [ref=f1e628]:
        - generic [ref=f1e629]: Possible
        - text: · funded 255 months from today (Feb 2048)
      - generic [ref=f1e630]:
        - button "Move Crossroads Retail Center up" [ref=f1e631] [cursor=pointer]: ↑ Up
        - button "Move Crossroads Retail Center down" [ref=f1e632] [cursor=pointer]: ↓ Down
        - button "Move Crossroads Retail Center to the top" [ref=f1e633] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e634]:
          - generic [ref=f1e635]: "Move to #"
          - textbox "Buy position for Crossroads Retail Center" [ref=f1e636]: "33"
    - generic [ref=f1e638]:
      - generic [ref=f1e640]:
        - button "Hold and drag to move Harvest Foods Wholesale" [ref=f1e641]: ⋮⋮
        - generic [ref=f1e642]:
          - generic "Buy number 34" [ref=f1e643]: "34"
          - text: Harvest Foods Wholesale
        - generic [ref=f1e644]: Business price $32.4M
      - generic [ref=f1e647]:
        - generic [ref=f1e648]: Possible
        - text: · funded 259 months from today (Jun 2048)
      - generic [ref=f1e649]:
        - button "Move Harvest Foods Wholesale up" [ref=f1e650] [cursor=pointer]: ↑ Up
        - button "Move Harvest Foods Wholesale down" [ref=f1e651] [cursor=pointer]: ↓ Down
        - button "Move Harvest Foods Wholesale to the top" [ref=f1e652] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e653]:
          - generic [ref=f1e654]: "Move to #"
          - textbox "Buy position for Harvest Foods Wholesale" [ref=f1e655]: "34"
    - generic [ref=f1e657]:
      - generic [ref=f1e659]:
        - button "Hold and drag to move Lighthouse Security Services" [ref=f1e660]: ⋮⋮
        - generic [ref=f1e661]:
          - generic "Buy number 35" [ref=f1e662]: "35"
          - text: Lighthouse Security Services
        - generic [ref=f1e663]: Business price $39.9M
      - generic [ref=f1e666]:
        - generic [ref=f1e667]: Possible
        - text: · funded 269 months from today (Apr 2049)
      - generic [ref=f1e668]:
        - button "Move Lighthouse Security Services up" [ref=f1e669] [cursor=pointer]: ↑ Up
        - button "Move Lighthouse Security Services down" [ref=f1e670] [cursor=pointer]: ↓ Down
        - button "Move Lighthouse Security Services to the top" [ref=f1e671] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e672]:
          - generic [ref=f1e673]: "Move to #"
          - textbox "Buy position for Lighthouse Security Services" [ref=f1e674]: "35"
    - generic [ref=f1e676]:
      - generic [ref=f1e678]:
        - button "Hold and drag to move 704 Lost Creek Cir, Stone Mountain, GA 30088" [ref=f1e679]: ⋮⋮
        - generic [ref=f1e680]:
          - generic "Buy number 36" [ref=f1e681]: "36"
          - text: 704 Lost Creek Cir, Stone Mountain, GA 30088
        - generic [ref=f1e682]: Home price $140,000
      - generic [ref=f1e685]:
        - generic [ref=f1e686]: Possible
        - text: · funded 269 months from today (Apr 2049)
      - generic [ref=f1e687]:
        - button "Move 704 Lost Creek Cir, Stone Mountain, GA 30088 up" [ref=f1e688] [cursor=pointer]: ↑ Up
        - button "Move 704 Lost Creek Cir, Stone Mountain, GA 30088 down" [disabled] [ref=f1e689]: ↓ Down
        - button "Move 704 Lost Creek Cir, Stone Mountain, GA 30088 to the top" [ref=f1e690] [cursor=pointer]: ⤒ Top
        - generic [ref=f1e691]:
          - generic [ref=f1e692]: "Move to #"
          - textbox "Buy position for 704 Lost Creek Cir, Stone Mountain, GA 30088" [ref=f1e693]: "36"
```

# Test source

```ts
  1   | /* M1.4 Grader checks K38-K58 (prototype/grader/design-grade.js) ported as named Playwright tests. One Playwright project per profile (8), 60 s per test.
  2   |    PORT STATUS: K38-K43, K46, K50 (touch pages) are faithful ports of the grader's measurements (same in-page sweep). K47, K48, K52, K53 are reduced ports (the core assertion, not every sub-rule).
  3   |    K54-K58 are REDUCED: they assert the copy / structure exists on the screen, not the engine-derived numbers. K44 (touch drag) and K45 (screenshots) are not ported (listed as skipped).
  4   |    The grader stays the full authority; these tests exist to name each phone / iPad problem. Real Safari is only exercised in CI (WebKit); a local Chromium stand-in is labelled in the hand-back. */
  5   | const { test, expect } = require('@playwright/test');
  6   | const L = require('./lib');
  7   | const SCHEMES = ['light', 'dark'];
  8   | test.beforeEach(async ({ context }) => { await L.pin(context); });
  9   | const vwOf = (page) => page.viewportSize().width;
  10  | const where = (page, name, sc) => name + '@' + vwOf(page) + 'x' + page.viewportSize().height + (sc ? ' ' + sc : '');
  11  | 
  12  | /* per-screen sweep tests: K39 (overflow + clipped), K40 (tap size), K41 (contrast), K42 (fonts, radii, input size) */
  13  | for (const name of L.PAGE_NAMES) {
  14  |   test('K39 no sideways scroll, nothing past the edge, no clipped text: ' + name, async ({ page }) => {
  15  |     const bad = [];
  16  |     for (const sc of SCHEMES) { await page.emulateMedia({ colorScheme: sc }); await L.goPage(page, name); const r = await page.evaluate(L.SWEEP_JS);
  17  |       if (r.ov) bad.push(where(page, name, sc) + ' page scrolls sideways'); if (r.wide.length) bad.push(where(page, name, sc) + ' past edge: ' + r.wide.slice(0, 3).join(',')); if (r.clipped.length) bad.push(where(page, name, sc) + ' clipped: ' + r.clipped.slice(0, 3).join(' | ')); }
  18  |     expect(bad).toEqual([]);
  19  |   });
  20  |   test('K40 tap targets >= 44px: ' + name, async ({ page }) => {
  21  |     await L.goPage(page, name); const r = await page.evaluate(L.SWEEP_JS);
  22  |     expect(r.small.slice(0, 6), where(page, name)).toEqual([]);
  23  |   });
  24  |   test('K41 contrast >= 4.5:1 light and dark: ' + name, async ({ page }) => {
  25  |     const bad = [];
  26  |     for (const sc of SCHEMES) { await page.emulateMedia({ colorScheme: sc }); await L.goPage(page, name); const r = await page.evaluate(L.SWEEP_JS); if (r.low.length) bad.push(where(page, name, sc) + ': ' + r.low.slice(0, 3).join(' | ')); }
  27  |     expect(bad).toEqual([]);
  28  |   });
  29  |   test('K42 Manrope everywhere, token radii, inputs 16px, text >= 12px: ' + name, async ({ page }) => {
  30  |     await L.goPage(page, name); const r = await page.evaluate(L.SWEEP_JS);
  31  |     const t = await page.evaluate(() => { const bad = []; document.querySelectorAll('#app *').forEach((el) => { if (el.closest('svg') || el.closest('.info')) return; const rc = el.getBoundingClientRect(), s = getComputedStyle(el); if (rc.width < 1 || s.display === 'none') return;
  32  |       if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(s.fontSize) < 12) bad.push('small text ' + (el.className || el.tagName) + '=' + s.fontSize);
  33  |       if ((el.tagName === 'INPUT' && !/^(hidden|checkbox|radio|file|range)$/.test(el.type) || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') && parseFloat(s.fontSize) < 16) bad.push('input under 16px (iOS zooms) ' + (el.dataset.p || el.dataset.testid || el.tagName) + '=' + s.fontSize); }); return bad.slice(0, 5); });
  34  |     expect([].concat(r.fonts.slice(0, 3), r.radii.slice(0, 3), t), where(page, name)).toEqual([]);
  35  |   });
  36  | }
  37  | 
  38  | test('K38 layout mode follows the width (phone column < 600, tablet column 600-899, master-detail >= 900)', async ({ page }) => {
  39  |   const w = vwOf(page); await L.goPage(page, 'asset');
  40  |   const T = await page.evaluate(() => { const a = document.getElementById('app'), r = a.getBoundingClientRect(); return { appW: Math.round(r.width), pl: parseFloat(getComputedStyle(a).paddingLeft), mdw: !!document.querySelector('.mdw'), mdd: (() => { const l = document.querySelector('.mdl'), d = document.querySelector('.mdd'); return l && d ? [l.getBoundingClientRect().right, d.getBoundingClientRect().left] : null; })() }; });
  41  |   const msg = where(page, 'asset') + ' ' + JSON.stringify(T);
  42  |   if (w < 600) { expect(T.appW <= Math.min(w, 520) && !T.mdw, msg).toBe(true); }
  43  |   else if (w < 900) { expect(T.appW >= Math.min(w, 720) - 2 && T.appW <= 720 && !T.mdw && T.pl >= 32, msg).toBe(true); }
  44  |   else { expect(T.mdw && T.mdd && T.mdd[0] <= T.mdd[1] + 1, msg).toBe(true); await L.goPage(page, 'planned'); const cols = await page.evaluate(() => getComputedStyle(document.querySelector('#app .pg')).gridTemplateColumns.split(' ').filter(Boolean).length); expect(cols, 'landscape Planned: two columns').toBe(2); }
  45  | });
  46  | test('K38b turning the device changes the layout live (no reload)', async ({ page }) => {
  47  |   const vp = page.viewportSize(); await L.goPage(page, 'asset'); await page.evaluate(() => { window.__stay = 1; });
  48  |   const mode = () => page.evaluate(() => ({ mdw: !!document.querySelector('.mdw'), stay: window.__stay === 1, ov: document.documentElement.scrollWidth > innerWidth + 1 }));
  49  |   const a = await mode(); await page.setViewportSize({ width: vp.height, height: vp.width }); await page.waitForTimeout(250); const b = await mode();
  50  |   expect(b.stay && !b.ov, 'after rotating ' + vp.width + 'x' + vp.height + ' -> ' + vp.height + 'x' + vp.width + ': ' + JSON.stringify(b)).toBe(true);
  51  |   expect(b.mdw, 'master-detail follows the new width (' + vp.height + ')').toBe(vp.height >= 900);
  52  |   expect(a.mdw).toBe(vp.width >= 900);
  53  | });
  54  | test('K43 page tabs float at the bottom on a tablet, inside the screen, and a tap switches page', async ({ page }) => {
  55  |   test.skip(vwOf(page) < 600, 'tablet only');
  56  |   await L.goPage(page, 'planned'); const t = await page.evaluate(() => { const e = document.querySelector('[data-testid=page-tabs]'), r = e.getBoundingClientRect(); return { pos: getComputedStyle(e).position, bottom: r.bottom, vh: innerHeight, h: Math.round(r.height), btnH: Math.min.apply(null, [...e.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().height))) }; });
  57  |   expect(t.pos, 'tabs position on ' + where(page, 'planned')).toBe('fixed'); expect(t.bottom).toBeLessThanOrEqual(t.vh); expect(t.btnH, 'tab button height >= 48').toBeGreaterThanOrEqual(48);
  58  |   await page.click('[data-testid=tab-real]'); await expect(page.locator('[data-testid=tab-real]')).toHaveAttribute('aria-selected', 'true');
  59  | });
  60  | /* K44 port: WebKit has no CDP, so the touch is dispatched as real PointerEvents (pointerType 'touch') on the row; the app's hold / move / up handlers see the same events a finger produces. */
  61  | const touchSeq = (page, fromSel, toSel, holdMs, steps) => page.evaluate(async ([fromSel, toSel, holdMs, steps]) => {
  62  |   const pt = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; };
  63  |   const f = pt(fromSel), t = pt(toSel), el = document.querySelector(fromSel), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  64  |   const ev = (type, x, y, tgt) => (tgt || document).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
  65  |   ev('pointerdown', f.x, f.y, el); await sleep(holdMs);
  66  |   const lifted = !!document.querySelector('.rw.lift') && document.getElementById('app').classList.contains('dragmode');
  67  |   for (let i = 1; i <= steps; i++) { ev('pointermove', f.x, f.y + (t.y - f.y - 6) * i / steps, document); await sleep(16); }
  68  |   ev('pointerup', f.x, t.y, document); await sleep(150);
  69  |   return { lifted, left: !!document.querySelector('.rw.lift') };
  70  | }, [fromSel, toSel, holdMs, steps]);
  71  | test('K44 touch drag on Buy order: hold lifts a row and a drag reorders it; a quick swipe moves nothing; O / N / ? do nothing on touch', async ({ page }) => {
  72  |   const ids = () => page.evaluate(() => [...document.querySelectorAll('[data-testid=order-row]')].map((e) => e.dataset.row));
  73  |   await L.boot(page, L.seedS(), '#order'); const a = await ids();
  74  |   const row = (id) => '[data-row="' + id + '"] [data-testid=order-status]';
  75  |   const r1 = await touchSeq(page, row(a[2]), row(a[0]), 560, 10); const b = await ids();
> 76  |   expect(r1.lifted && b[0] === a[2] && b.length === a.length, where(page, 'order') + ' hold 560 ms lifts the row and a drag moves row 3 to the top ' + JSON.stringify([r1, a.slice(0, 3), b.slice(0, 3)])).toBe(true);
      |                                                                                                                                                                                                            ^ Error: order@568x320 hold 560 ms lifts the row and a drag moves row 3 to the top [{"lifted":true,"left":false},["maple","cedar","birch"],["maple","cedar","birch"]]
  77  |   await L.boot(page, L.seedS(), '#order'); const r2 = await touchSeq(page, row(a[2]), row(a[0]), 0, 6); const c = await ids();
  78  |   expect(c.join() === a.join() && !r2.left, where(page, 'order') + ' a quick swipe moves nothing ' + c.slice(0, 3)).toBe(true);
  79  |   await L.boot(page, L.seedS(), '#'); for (const k of ['o', 'n', 'f', '?', '2']) { await page.keyboard.press(k); await page.waitForTimeout(40); }
  80  |   const st = await page.evaluate(() => ({ h: location.hash, sheet: !!document.querySelector('#infopop'), real: document.querySelector('[data-testid=tab-planned]').getAttribute('aria-selected') }));
  81  |   expect(st.h === '' || st.h === '#', 'O / N / F do not navigate on touch: ' + st.h).toBe(true); expect(!st.sheet && st.real === 'true', '? and 2 do nothing on touch ' + JSON.stringify(st)).toBe(true);
  82  | });
  83  | /* K45 port: every page screenshotted light and dark at this project's size (PNGs go to test-results/, uploaded by CI) */
  84  | test('K45 screenshots of every page, light and dark, at this size', async ({ page }, info) => {
  85  |   const bad = []; let n = 0;
  86  |   for (const sc of SCHEMES) { await page.emulateMedia({ colorScheme: sc });
  87  |     for (const name of L.PAGE_NAMES) { try { await L.goPage(page, name); const buf = await page.screenshot({ fullPage: false }); if (buf.length < 1000) throw new Error('empty'); await info.attach('v7-' + name + '-' + info.project.name + '-' + sc + '.png', { body: buf, contentType: 'image/png' }); n++; } catch (e) { bad.push(name + ' ' + sc); } } }
  88  |   expect(bad, n + ' screenshots saved').toEqual([]); expect(n).toBe(L.PAGE_NAMES.length * 2);
  89  | });
  90  | 
  91  | test('K46 page margin: gutter >= 20px phone / 32px tablet on every screen', async ({ page }) => {
  92  |   const w = vwOf(page), need = w < 600 ? 20 : 32, bad = [];
  93  |   for (const name of ['planned', 'real', 'saved', 'asset', 'finances', 'assumptions', 'order', 'add', 'import']) {
  94  |     await L.goPage(page, name);
  95  |     const g = await page.evaluate(() => { let minL = 1e9, maxR = 0; document.querySelectorAll('#app *').forEach((el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); if (r.width < 1 || r.height < 1 || el.closest('svg') || s.display === 'none' || s.visibility === 'hidden') return; if (s.position !== 'fixed' && !el.closest('.infopop,.toast,.pagetabs,.info,.chint,.dropline')) { minL = Math.min(minL, r.left); maxR = Math.max(maxR, r.right); } }); return [Math.round(minL), Math.round(innerWidth - maxR)]; });
  96  |     if (g[0] < need - 0.5 || g[1] < need - 0.5) bad.push(where(page, name) + ' gutter left/right ' + g.join('/') + ' < ' + need);
  97  |   }
  98  |   expect(bad).toEqual([]);
  99  | });
  100 | test('K47 Planned order: Health, More figures, then Sold directly after it', async ({ page }) => {
  101 |   await L.goPage(page, 'planned');
  102 |   const o = await page.evaluate(() => { const m = document.querySelector('[data-testid=more-figures]'), s = document.querySelector('[data-testid=cat-sold]'); return m && s ? { next: m.nextElementSibling === s } : { miss: true }; });
  103 |   expect(o, where(page, 'planned')).toEqual({ next: true });
  104 | });
  105 | test('K48 cap rate chip (Good / Okay / Low word) on the asset page', async ({ page }) => {
  106 |   await L.goPage(page, 'asset'); const txt = await page.evaluate(() => document.getElementById('app').innerText);
  107 |   expect(/\b(Good|Okay|Low)\b/.test(txt) && /cap rate/i.test(txt), where(page, 'asset') + ' cap rate chip').toBe(true);
  108 | });
  109 | test('K50 one scroll only: no element other than the page scrolls', async ({ page }) => {
  110 |   const bad = [];
  111 |   for (const name of ['planned', 'asset', 'real', 'saved', 'finances', 'assumptions', 'order', 'add', 'import', 'health', 'shortfall']) { await L.goPage(page, name);
  112 |     const r = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { if (/^(TEXTAREA|SELECT|INPUT|svg)$/i.test(e.tagName) || e.closest('svg') || e.id === 'infopop') return false; const s = getComputedStyle(e); return /(auto|scroll|overlay)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1; }).map((e) => (e.className || e.tagName) + ' ' + e.scrollHeight + '>' + e.clientHeight).slice(0, 3));
  113 |     if (r.length) bad.push(where(page, name) + ': ' + r.join(', ')); }
  114 |   expect(bad).toEqual([]);
  115 | });
  116 | test('K52 info popover: opens on tap of (i), sits inside the screen, closes on Escape', async ({ page }) => {
  117 |   await L.goPage(page, 'asset'); const i = page.locator('#app .info, #app [data-info]').first(); await i.scrollIntoViewIfNeeded(); await i.click();
  118 |   const pop = page.locator('#infopop'); await expect(pop, 'popover opens on ' + where(page, 'asset')).toBeVisible();
  119 |   const r = await pop.boundingBox(); const vp = page.viewportSize(); expect(r.x >= 0 && r.x + r.width <= vp.width + 1, 'popover inside the screen ' + JSON.stringify(r)).toBe(true);
  120 |   await page.keyboard.press('Escape'); await expect(pop).toBeHidden();
  121 | });
  122 | test('K53 accent token is calm blue, not red/orange', async ({ page }) => {
  123 |   await L.goPage(page, 'planned');
  124 |   const hues = await page.evaluate(() => { const out = {}; for (const sc of ['light']) { const c = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(); const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const [r, g, b] = cv.getImageData(0, 0, 1, 1).data; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0; if (mx !== mn) { const d = mx - mn; h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } out[sc] = Math.round(h); out.c = c; } return out; });
  125 |   expect(hues.light >= 180 && hues.light <= 290, '--acc ' + hues.c + ' hue ' + hues.light).toBe(true);
  126 | });
  127 | 
  128 | /* K54-K58: REDUCED ports (copy / structure exists on the screen) */
  129 | const appText = (page) => page.evaluate(() => document.getElementById('app').innerText);
  130 | test('K54 hero: net worth TODAY; status sentence is not in the hero by default (reduced)', async ({ page }) => {
  131 |   await L.goPage(page, 'planned'); const t = await appText(page);
  132 |   expect(/Nothing bought yet[^\n]*is funded at/.test(t), 'status sentence "Nothing bought yet ... is funded at" must not show in the hero by default').toBe(false);
  133 |   expect(/at year \d+/.test(t), 'plan-end figure is a small "$X at year N" line').toBe(true);
  134 | });
  135 | test('K55 comp value under New appraised value, with Job money saved up (reduced)', async ({ page }) => {
  136 |   await L.goPage(page, 'asset'); const t = await appText(page); const a = t.indexOf('New appraised value'), c = t.indexOf('Average comp value');
  137 |   expect(a >= 0 && c > a, 'Average comp value follows New appraised value (' + a + ',' + c + ')').toBe(true); expect(/Job money saved up/.test(t)).toBe(true);
  138 | });
  139 | test('K56 Extra / month breakdown line (reduced)', async ({ page }) => {
  140 |   await L.goPage(page, 'asset-owned'); expect(/Total paying this loan down/.test(await appText(page)), 'breakdown line under Extra / month').toBe(true);
  141 | });
  142 | test('K57 job money card: "Total from your job this month" row (reduced)', async ({ page }) => {
  143 |   await L.goPage(page, 'asset-owned'); expect(/Total from your job this month/.test(await appText(page))).toBe(true);
  144 | });
  145 | test('K58 Funded by the trust rows (reduced)', async ({ page }) => {
  146 |   await L.boot(page, L.seedS(), '#house-cedar'); await L.openAll(page); const t = await appText(page);
  147 |   expect(/Funded by the trust/i.test(t) && /borrowing room/i.test(t) && /pool total/i.test(t), 'Funded by the trust: borrowing room + pool total rows').toBe(true);
  148 | });
  149 | 
```