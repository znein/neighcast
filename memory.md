# Neighcast blanketing logic – reference

How Neighcast decides whether a horse needs a blanket tonight, and which weight. Written so another
app can reproduce it exactly. The source of truth is `app.js` (`decide()`, `CHART`, `MAX_OK`,
`nights()`); this file explains it. Last updated 2026-11-22 (box stall added; clipped chart shifted 5°F warmer after the mild-climate calibration).

## Where the rules come from (read this first)

The chart was first written from general knowledge of published horse-blanketing charts, then
checked against the sources in "Sources and how Neighcast compares" below. It sits within the range
those sources give. Several adjustments are Neighcast's own heuristics, marked below.

| Part | Provenance |
|---|---|
| Temperature bands per coat type (`CHART`) | Written from general knowledge, then checked against published charts (see below). **Unclipped:** close to the University of Maine extension chart and less aggressive than the retailers. **Clipped:** shifted 5°F warmer on 2026-11-22 (see the mild-climate calibration). Now at the warm end of SmartPak / Schneiders and Rutgers' "below 60°F", and about 10°F warmer than Maine. |
| Using wind chill ("feels like") instead of air temperature | Common practice in published guidance; the formula is the NWS standard. |
| Wet coat → waterproof sheet / one weight up | Published guidance (a wet coat loses its insulation). The exact triggers (0.03 in, 60%) are Neighcast's own. |
| Run-in shed = count half the wind chill | **Neighcast's own heuristic.** |
| Box stall = air temperature only, no wet or wind adjustments | **Neighcast's own heuristic.** Indoors there is no wind chill and no rain. Rutgers says shelter saves up to 20% body heat, but no source gives a stall-specific number. |
| Gusts ≥ 30 mph with no shelter → one weight up | **Neighcast's own heuristic.** |
| Fine-tune slider (0–20°F colder) | Replaced "feels the cold more → one weight up" on 2026-11-23. The direction is published guidance (seniors, thin horses, hard keepers need more); the owner sets the size, because it varies by horse. |
| Weather bumps capped at +1 in total | **Neighcast's own** (stops rain + wind from stacking to a heavyweight at mild temperatures). |
| "Take it off by…" (`MAX_OK`) | **Neighcast's own**, derived from the band edges. |
| Using the colder of two forecasts | **Neighcast's own** safety choice. |

If you change a band, change it here and in `app.js` together.

## Sources and how Neighcast compares (checked 2026-11-22)

**Caveat:** these figures came from automated page reads that mostly paraphrased the pages. Before
quoting any number as the source's own wording, open the URL and confirm it. The University of Maine
table in particular wasn't read word for word.

| # | Source | What it gives |
|---|---|---|
| 1 | University of Maine Extension, Bulletin #1038 (White, 2025) – https://extension.umaine.edu/publications/?p=32170 | Full chart by coat, **air temperature**. Unclipped: none ≥ 25°F (rain sheet if raining 25–39°F); light/mid 15–24; heavy 0–14; heavy + liner + hood < 0. Clipped (full and partial together): sheet/light ≥ 40; light/mid 25–39; heavy 15–24; heavy + liner + hood < 15. Never blanket a wet horse. Unacclimated horses: blanket like clipped for 1–2 winters. Remove in the morning to avoid sweating. |
| 2 | Rutgers Equine Science Center, "To Blanket or Not to Blanket?" – https://esc.rutgers.edu/fact_sheet/to-blanket-or-not-to-blanket/ | Check temperature **and wind chill**. Waterproof for turnout. Shelter saves up to 20% body heat. Lower critical temperature (LCT) ≈ 18°F dry winter coat, ≈ 59°F wet/clipped/summer coat (from cattle data). Medium ≈ 200g, heavy ≈ 300g. |
| 3 | University of Minnesota Extension, "Caring for your horse in winter" – https://extension.umn.edu/horse-care-and-management/caring-your-horse-winter | LCT 41°F summer coat, 18°F winter coat. Blanket if no shelter and air temp **or wind chill** < 5°F, or if clipped, very young/old, body condition ≤ 3 or unacclimated. **As little as 0.1 in of rain can cause cold stress.** |
| 4 | Penn State Extension, "When to Blanket a Horse" – https://extension.psu.edu/when-to-blanket-a-horse | Same 5°F rule, 0.1 in rain point and risk factors as Minnesota. Remove the blanket on warm days. |
| 5 | SmartPak (retailer) – https://www.smartpakequine.com/content/blanketingClipping | Clipped: light 40–50, medium 30–40, heavy < 30. Unclipped: light 30–40, medium 20–30, heavy < 20. Stalled/sheltered horses may need nothing. Doesn't say air temperature or wind chill. |
| 6 | Schneiders / StormShield (retailer) – https://www.sstack.com/blogs/learning-center/what-blanket-weight-for-what-temperature | Unclipped and trace-clipped together: sheet for rain/wind; light 30–50; medium 30–45; heavy 15–30; extra-heavy < 15. Fully clipped: sheet 50–65; light 40–60; medium 35–50; heavy 20–40; extra-heavy < 20. Wind, wet, clipping and no shelter each add one layer. |

How Neighcast's bands compare:

| eff (°F) | Neighcast unclipped | Sources, unclipped | Neighcast clipped | Sources, clipped |
|---|---|---|---|---|
| ≥ 50 | none | none (all) | none ≥ 65, sheet 55–65, light 50–55 | sheet/light (Maine, Schneiders; Rutgers "below 60") |
| 40–50 | none | none | light ≥ 45, medium 40–45 | light (all charts) |
| 30–40 | none | none (Maine, extensions) to light (retailers) | medium ≥ 35, heavy 30–35 | light/medium |
| 20–30 | light | none ≥ 25 (Maine) to medium (SmartPak) | heavy | medium to heavy |
| 10–20 | medium | light/mid (Maine) to heavy (SmartPak) | heavy + liner | heavy |
| < 10 | heavy | heavy (Maine, Schneiders); heavy + liner < 0 (Maine) | heavy + liner | heavy + liner/hood |

Where the sources agree, and Neighcast follows them:
- Clipped horses need about one layer more, starting about 10°F warmer.
- Wet is worse than cold, so use waterproof turnouts and never put a blanket on a wet horse.
- Shelter reduces the need.
- Seniors, thin horses, hard keepers and unacclimated horses need a blanket sooner.
- Take the blanket off or lighten it on warm days.

Where the sources disagree (Neighcast's choice in brackets):
- **Air temperature vs wind chill.** Maine uses air temperature; Rutgers, Minnesota and Penn State
  accept wind chill. [Neighcast uses wind chill, which is more cautious.]
- **Partial clip.** Maine treats it as clipped; Schneiders treats it as unclipped. [Neighcast puts it
  in between.]
- **Unclipped at 20–40°F.** Retailers blanket 10–20°F warmer than the extension services do.
  [Neighcast follows the extension services.]

Possible changes suggested by the sources (**not applied yet**):
1. **Wet threshold:** Minnesota and Penn State say about 0.1 in of rain causes cold stress. Neighcast
   triggers at 0.03 in or 60% chance, which is more cautious. Consider 0.1 in.
2. **Unclipped extreme cold:** Maine adds heavy + liner + hood below 0°F. Neighcast tops out at heavy
   for unclipped horses. Consider level 5 below 0°F.
3. **Unacclimated horses:** Maine says to use the clipped chart for 1–2 winters. Neighcast's "feels
   the cold" setting adds only +1. Consider a separate "new to this climate" option that switches to
   the clipped chart.
4. **Shelter:** the extension services credit shelter strongly (Minnesota: "as low as -40°F" with
   shelter). Neighcast's "half the wind chill" is a moderate, unsourced middle ground.

## Blanket levels

| Level | Name | Fill |
|---|---|---|
| 0 | No blanket | – |
| 1 | Turnout sheet | waterproof, 0g |
| 2 | Lightweight | ~50–150g |
| 3 | Mediumweight | ~180–250g |
| 4 | Heavyweight | 300g+ |
| 5 | Heavyweight + liner | heavy plus a liner or neck cover |

## Inputs

Per horse (user settings):
- `coat`: `unclipped` (full winter coat) | `partial` (trace/bib clip) | `clipped` (full clip, or a thin summer coat)
- `shelter`: `none` (out in the field) | `runin` (run-in shed or open shelter) | `stall` (box stall inside a barn).
  Older saved settings used a bool: `true` → `runin`, `false` → `none`.
- `offset`: fine-tune, 0–20 °F (slider, default 0). Every temperature in the night is lowered by this much
  before `decide()` sees it, so every band moves that many degrees warmer. It replaced the `warm` box on
  2026-11-23; an old saved `warm: true` (or `?warm=1` link) becomes `offset: 10`. `decide()` still reads
  `warm`, but Neighcast always passes `false`, as The Mane Forecast does.

Per night, from the forecast (°F, mph, inches):
- **Night window: 18:00 → 08:00 next morning, local time at the barn** (14 hourly values; skip a night with fewer than 10).
- `low` = min air temperature in the window
- `feelLow` = min wind chill in the window (formula below, per hour)
- `gust` = max wind gust
- `precip` = total precipitation (in); `snow` = total snowfall (in)
- `precipChance` = max precipitation probability (%)
- Day window for "take it off": 08:00 → 18:00 the next day.

### Wind chill (NWS formula, used for every source so they compare like for like)

```
if T > 50°F or V <= 3 mph:  WC = T
else:                        WC = 35.74 + 0.6215·T − 35.75·V^0.16 + 0.4275·T·V^0.16
```
T = air temperature °F, V = sustained wind mph (not gusts).

## The decision

### 1. Effective temperature
```
eff = shelter == stall ? low                          // indoors: air temperature, no wind chill
    : shelter == runin ? low − (low − feelLow) / 2    // run-in takes about half the wind's bite
    :                    feelLow                      // out in the field: full wind chill
```

### 2. Chart lookup (`CHART`): first row where `eff >= lower bound` wins

| eff (°F) | unclipped | partial | clipped |
|---|---|---|---|
| ≥ 65 | 0 none | 0 none | 0 none |
| 60–65 | 0 | 0 | 1 sheet |
| 55–60 | 0 | 0 | 1 sheet |
| 50–55 | 0 | 1 sheet | 2 light |
| 45–50 | 0 | 1 sheet | 2 light |
| 40–45 | 0 | 2 light | 3 medium |
| 35–40 | 0 | 2 light | 3 medium |
| 30–35 | 0 | 3 medium | 4 heavy |
| 25–30 | 2 light | 3 medium | 4 heavy |
| 20–25 | 2 light | 4 heavy | 4 heavy |
| 10–20 | 3 medium | 4 heavy | 5 heavy + liner |
| < 10 | 4 heavy | 5 heavy + liner | 5 heavy + liner |

As code (lower bound, level), checked top to bottom:
```
unclipped: [30,0] [20,2] [10,3] [-999,4]
partial:   [55,0] [45,1] [35,2] [25,3] [10,4] [-999,5]
clipped:   [65,0] [55,1] [45,2] [35,3] [20,4] [-999,5]   // 5°F warmer than classic charts - see calibration
```
Note: an unclipped horse never gets a plain sheet from the chart. A sheet only comes from the wet rule below.

### 3. Weather adjustments – at most ONE bump in total
```
wet = precip >= 0.03 or precipChance >= 60
bumped = false
open = shelter == none
if wet and eff < 50 and shelter != stall:                             // a stall keeps the horse dry
    if level == 0 and eff < 45:                                       level = 1; bumped = true   // sheet keeps the coat dry
    elif 0 < level < 5 and open and coat == unclipped and eff < 35:   level += 1; bumped = true  // wet coat loses warmth
    else: advise "use a waterproof turnout" (no level change)
if not bumped and gust >= 30 and open and 0 < level < 5:             level += 1
if shelter == stall and level > 0: advise "a stable blanket is fine; it needn't be a waterproof turnout"
```

### 4. Horse adjustment (separate from the weather cap)
```
// before step 1, outside decide(): low, feelLow (and each source's) -= offset
// the first reason shows the real temperature, plus "with each blanket starting N° warmer"
// "take it off" limit: MAX_OK + offset
if warm and eff < 50 and level < 5:  level += 1   // legacy; Neighcast now always passes warm = false
```

### 5. "Take it off by…" warning
Warmest temperature each level is still comfortable at (`MAX_OK`):

| level | unclipped | partial | clipped |
|---|---|---|---|
| 1 sheet | 50 | 60 | 70 |
| 2 light | 40 | 55 | 65 |
| 3 medium | 30 | 45 | 55 |
| 4 heavy | 20 | 35 | 45 |
| 5 heavy + liner | – | 25 | 35 |

If `level > 0` and any hour in the next day's 08:00–18:00 window is warmer than `MAX_OK + 5°F`, show
"Take it off or swap down by about <that hour>".

## Two forecasts: Open-Meteo + National Weather Service

- Open-Meteo: `api.open-meteo.com/v1/forecast` with hourly `temperature_2m, precipitation_probability,
  precipitation, snowfall, wind_speed_10m, wind_gusts_10m`, `temperature_unit=fahrenheit`,
  `wind_speed_unit=mph`, `precipitation_unit=inch`, `timezone=auto`, `forecast_days=8`. No key.
- NWS: `api.weather.gov/points/{lat},{lon}` → `properties.forecastHourly` → `periods[]` (`temperature`,
  `windSpeed` like "5 to 10 mph" → take the highest number, `probabilityOfPrecipitation.value`). About
  6.5 days. No key; send a descriptive User-Agent from a server (browsers send their own). Gusts and
  precipitation amounts come from Open-Meteo only.
- Match hours by local time: Open-Meteo `time` ("2026-11-22T18:00") equals NWS `startTime[0:16]`.
- Per night, compute `low` / `feelLow` / `wind` / `precipChance` for each source. **The call uses the
  colder source**: `low = min`, `feelLow = min`, `wind = max`, `precipChance = max`.
- Agreement flag: run the decision on each source alone. Different levels → "the forecasts disagree"
  (show both calls). Same level but `feelLow` more than 5°F apart → "far apart, same blanket".
  Otherwise "agree".
- If the NWS fails or doesn't cover the night, use Open-Meteo alone and say so.
- NWS alerts: `api.weather.gov/alerts/active?point={lat},{lon}` – show the event names.

## Which night is "tonight"
Use the barn's local time (Open-Meteo `utc_offset_seconds`). Before 08:00 the current night is the one
that started yesterday at 18:00; from 08:00 on, it's today's. Fall back to the next available night.

## Worked examples (Lexington, KY test data, 2026-11-22)
- Unclipped, no shelter: low 42°F, wind chill 35°F, 0.30 in rain → chart 0 → wet and eff < 45 →
  **turnout sheet**.
- Unclipped, no shelter: wind chill 24°F, gusts ≥ 30, dry → chart 2 (light) → gust bump →
  **mediumweight**.
- Clipped, run-in, feels the cold: low 42, wind chill 34 → eff 38 → chart 3 (medium) → wet, but the
  run-in rule only advises waterproof → warm +1 → **heavyweight**.
- Same night, clipped, three overnight options (feels the cold off), with the 5°F-warmer clipped chart:
  - no shelter: eff 34.8 (shown as 35) → just under 35 → **heavyweight**, waterproof turnout;
  - run-in: eff 38 → **mediumweight**, waterproof turnout;
  - box stall: eff 42 (air low) → **mediumweight**, stable blanket is fine. (It was lightweight before the shift.)

## Calibration check: clipped horses in a mild coastal climate

Real-world practice reported there: clipped horses wear **150–250g every night** all blanket
season. Checked against Open-Meteo's archive of real overnight lows (18:00–08:00 minimum air
temperature), 2025-11-15 to 2026-03-15, 120 nights: median low 51°F, 10th percentile 45°F,
coldest 37°F, warmest 62°F.

| Clipped horse in a box stall | Sheet (0g) | Light (50–150g) | Medium (180–250g) | Heavy |
|---|---|---|---|---|
| Current chart | 57% | 36% | 3% | – |
| Current chart + "feels the cold" | 57% | – | 36% | 3% |
| **Clipped chart 5°F warmer** | 15% | 75% | 9% | – |
| Clipped chart 5°F warmer + "feels the cold" | 15% | 45% | 30% | 9% |

**Finding:** the current clipped chart is lighter than this real practice. It says "sheet" on most
mild-climate nights where owners use 150–250g. Shifting the clipped bands 5°F warmer
(sheet 55–65, light 45–55, medium 35–45, heavy 20–35, heavy + liner < 20) puts 84% of nights in light
or medium. That matches Rutgers ("below 60°F" for clipped horses; LCT up to 59°F when clipped or wet)
and Schneiders (clipped light at 40–60°F).

Why practice runs heavier than a pure warmth chart:
- Horses in warm climates are acclimated to warmth, so their lower critical temperature runs higher.
- Owners also blanket clipped horses to keep the coat short for showing, not only for warmth.

**Status: applied 2026-11-22.** `CHART.clipped` is now `[65,0] [55,1] [45,2] [35,3] [20,4] [-999,5]`
and `MAX_OK.clipped` is sheet 70, light 65, medium 55, heavy 45, heavy + liner 35. The chart and
`MAX_OK` tables above already show the new values.

To recheck another place, replay the same night window over the archive API
(`archive-api.open-meteo.com/v1/archive`, hourly `temperature_2m`, `timezone=auto`) and count how
often each level comes up.

## Privacy
Store the barn's location only on the device. Round coordinates to 2 decimals (~1 km), which is
plenty for weather. Never put a real location in source code or a public repo.
