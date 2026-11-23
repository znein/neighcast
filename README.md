# 🐴 Neighcast

**Should your horse wear a blanket tonight?** Neighcast turns the overnight forecast into one
answer: blanket or not, and which weight. It also shows the week of nights ahead.

Live at **https://znein.github.io/neighcast/**

## What it does

- **Tonight's call:** the blanket weight for the coming night (6 pm to 8 am), with the reasons
  behind it: low, wind chill, wind, rain or snow.
- **The week ahead:** one card per night, coloured from light to dark like a barometer. Tap a
  blanket name to see what that weight means.
- **Hour-by-hour chart** for tonight, with both forecasts drawn.
- **National Weather Service alerts** for the barn's location.

## How it decides

1. It fetches two forecasts, [Open-Meteo](https://open-meteo.com/) and the
   [National Weather Service](https://www.weather.gov/), and uses whichever is **colder** for each
   night. Nights where the two disagree are flagged.
2. It works out the "feels like" temperature with the NWS wind-chill formula.
3. It looks that up in a blanketing chart for the horse's coat: **unclipped**, **partly clipped**
   or **clipped**.
4. It adjusts for conditions:
   - Rain or snow can bump the call up one weight, because a wet coat loses its warmth.
   - A strong wind can bump it up one weight when there's no shelter.
   - Only one weather bump is ever applied in a night.
   - A **run-in shed** takes some of the bite out of the wind.
   - A **box stall** takes all of it.
5. **Fine-tune** (optional, 0–20°F): start each blanket that many degrees warmer, for a horse
   that runs colder than the chart: a senior, a thin horse or hard keeper, or one new to the
   climate.

The chart is based on university extension guidance (Maine, Rutgers, Minnesota, Penn State) and
retailer charts. See [blanket-guide.html](blanket-guide.html) for the chart, and
[memory.md](memory.md) for the full rules, sources and calibration notes.

**A guide, not a vet.** Every horse is different. Check under the blanket at the withers: warm
and dry is right; damp or sweaty means too much.

## Settings and privacy

Open **Settings** and choose:
- the barn's location: a ZIP code, a town, or the phone's location;
- the horse's name;
- the coat;
- where the horse spends the night.

Settings are saved **only on that device**, in the browser. Coordinates are rounded to
2 decimals (about 1 km), and the location is sent only to the weather services.

A setup link can pre-fill the settings for someone else's phone:

```
https://znein.github.io/neighcast/?at=LAT,LON&place=Town%2C%20ST&horse=Name&coat=clipped&shelter=stall&offset=5
```

| Parameter | Values |
|---|---|
| `at` | `LAT,LON` |
| `place` | label shown in the header |
| `horse` | horse's name |
| `coat` | `unclipped`, `partial`, `clipped` |
| `shelter` | `none`, `runin`, `stall` |
| `offset` | fine-tune, `0` to `20` (°F) |

When the link is opened, Neighcast saves the settings and removes them from the address bar.

## Run it locally

It's a static site: plain HTML, CSS and one script. There's no build step and no server code.

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/.

| File | What it is |
|---|---|
| `index.html` | The page |
| `app.js` | Forecast fetching, blanket rules and rendering |
| `styles.css` | Styles |
| `blanket-guide.html` | The full blanketing chart |
| `memory.md` | The rules and where they came from, for other apps that reuse them |

## Data

- Forecasts: [Open-Meteo](https://open-meteo.com/) (free for non-commercial use) and the
  [National Weather Service API](https://www.weather.gov/documentation/services-web-api).
- Place search: [Zippopotam.us](https://zippopotam.us/) and Open-Meteo geocoding.

---

Made by Team Mikey · © 2026
