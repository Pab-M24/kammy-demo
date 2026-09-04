# Kammy — product demo

**Client:** Kammy — Team Shark Bait, IFG × Tetr Global Business Challenge 2026
**Live URL:** <!-- PENDIENTE: pegar la URL de Vercel cuando termine el deploy -->

---

## What this is

A single-page, front-end-only product demo. It exists so an investor panel can watch
the product behave for ninety seconds instead of reading a slide about it.

**Nothing here is real.** No backend, no database, no API calls, no form submissions.
The soft check, the approval, the purchase, the schedule and the onsale race are all
simulated in JavaScript from one local state object. No data leaves the browser.

## The mechanic the page has to communicate

1. A fan picks a ticket and runs a soft check inside Kammy.
2. The licensed lending partner underwrites and pays the organizer 100% upfront, same day.
3. The fan repays the **lending partner** over 3, 6 or 9 months.
4. Kammy charges the organizer 4% and the lending partner 5% — a 9% take rate.
5. The fan pays Kammy $0.

Kammy is the infrastructure layer, not the lender. It never lends, never holds funds,
never sets the credit limit. Two launch markets: Mexico (SOFOM partner) and India
(NBFC partner). Phases 2 and 3 of the roadmap are explicitly labelled as roadmap.

## Identity

**Atmosphere:** precise · kinetic · trustworthy.

**Palette — three colours plus one alert:**

| Token | Hex | Use |
|---|---|---|
| `--navy` | `#08202E` | dominant |
| `--teal` | `#0E7C6E` | accent — state changes, the split, CTAs |
| `--offwhite` | `#F4F8F8` | neutral |
| `--alert` | `#B4472F` | exactly two places: "Above your limit" and SOLD OUT |

Every other tone in the page is derived from those four with `color-mix()`.
Light and dark are both first-class: `:root` + `[data-theme="dark"]`, defaulting from
`prefers-color-scheme`, overridden by the navbar toggle (a drawn SVG, not an emoji).

**Type:**

- **Fraunces** (300, 600) — headlines only. The hero H1, section headings, card titles,
  and the big display numbers like the `9%` take rate.
- **Plus Jakarta Sans** (400, 500, 600) — body, buttons, labels, everything read in a line.
- **IBM Plex Mono** (400, 500) — numerals only. Prices, instalments, the simulator clock,
  the credit limit, percentages. Every mono rule carries
  `font-variant-numeric: tabular-nums` so figures stay in column.

**Visual signature — the perforation.** A ticket tear line: 1px dashed rule, 3px dashes,
6px gaps, teal at 40%, punctuated by semicircular notches cut into the edges. It is the
page's only decorative element and it recurs as: the tear line in the hero ticket, the
divider between major sections, the connector on both step rails, and the vertical rail
down the instalment schedule with a notch at every payment date.

**Animation budget — three decorative animations, no more:**

1. The hero price splitting into instalment chips.
2. Section entry: fade + 12px translateY, one shared IntersectionObserver, 60ms stagger.
3. Card hover: `translateY(-4px)` and a stronger border.

Functional state changes (the clock, the schedule reveal, the status panel) are outside
that budget and are deliberately fast. `prefers-reduced-motion: reduce` disables the
split and the section fades; the simulator still runs.

## Files

```
index.html    structure and copy
styles.css    tokens, the perforation, layout, light/dark
main.js       state, money/date maths, every simulated flow
```

No frameworks, no build step, no CDNs except Google Fonts. Open `index.html`, or:

```bash
python3 -m http.server 3470
```

## How it works under the hood

One shared state object drives every section:

```js
{ market: 'MX' | 'IN', approved: bool, limit: number, term: 3|6|9, purchases: [], profile }
```

- `formatMoney()` — one helper, `Intl.NumberFormat` with `es-MX`, `en-IN`, `en-US`.
  INR uses Indian digit grouping.
- `splitInstalments()` — one helper. Parts always sum back to the total; the last one
  absorbs the rounding remainder.
- `addMonths()` / `formatDate()` — one helper each, real dates, `14 Dec 2026` format.
- Eligibility is computed (`price > limit`), never hardcoded per card.
- The onsale simulator runs on a **single** wall-clock timer driving both panels, so the
  two sides can never desync — even if the tab is backgrounded mid-run.

## PENDIENTE

- [ ] **Navbar wordmark → client logo.** `index.html`, marked with a comment beside the
      `KAMMY` wordmark. If `.jpg` use `mix-blend-mode: multiply`; if `.png` use
      `object-fit: contain`; `max-width: 140px`; never distort.
- [ ] **FX date.** `index.html`, in the line under the catalogue grid: replace the
      placeholder with the date of the pitch.
- [ ] **Vercel URL.** Paste at the top of this file once deployed.

## One data note for the team

The brief specifies both the catalogue prices and the partner limits, and separately
says exactly one event per market should land above the limit. Those two do not
reconcile: at the specified limits (**$4,600 MXN** / **₹21,000**) two Mexican events and
three Indian events are above the limit.

All specified prices and limits are kept as given, and the check is data-driven, so the
page is internally honest — a card is locked because its price genuinely exceeds the
limit. If you want exactly one locked card per market, change one number each in
`main.js` → `MARKETS`: `MX.limit` to `6500` and `IN.limit` to `28000` (and the matching
`limitUSD` values, `350` and `320`). Nothing else needs to change.

## Content rules this build follows

- No wording about rates or the cost of credit anywhere — that is the partner's to state.
  The only approved line is: "$0 Kammy fee — your lending partner sets the terms."
- No wording that implies Kammy operates beyond its two launch markets. Kammy operates in
  Mexico and India. Roadmap phrasing is "Two launch markets. Built to travel."
- Kammy connects, routes and runs the check with the partner. The **partner** approves.
- No invented partner brand names — only "Licensed SOFOM partner · Mexico" and
  "Licensed NBFC partner · India".
- Venues and cities are real. Every artist, tour, festival and date is invented.
- The footer states plainly that this is a demo, not a live financial service.
