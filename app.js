// Neighcast: tonight's forecast -> blanket or not, and which weight.
// Forecast from Open-Meteo and the National Weather Service (both keyless), compared hour by hour;
// the call uses the colder of the two. NWS also supplies the warnings. Settings live in
// this device's localStorage only - no location is ever written into the site's code.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var KEY = "neighcast.settings.v1";

  // ---------- settings ----------
  var CHART_COATS = ["unclipped", "partial", "clipped"];
  var SHELTERS = ["none", "runin", "stall"];
  var DEFAULTS = { lat: null, lon: null, label: "", horse: "", coat: "unclipped", shelter: "none", warm: false, offset: 0 };
  function loadSettings() {
    try {
      var s = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}"));
      if (SHELTERS.indexOf(s.shelter) < 0) s.shelter = s.shelter === true ? "runin" : "none";  // old true/false setting
      if (s.warm) { s.offset = 10; s.warm = false; }  // old "feels the cold" box: about one weight warmer
      s.offset = clampOffset(s.offset);
      return s;
    }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  // Fine-tune: blanket as if the night were this many °F colder (0-20). Applied to the temperatures
  // before decide() sees them (see shifted()), so the shared rules stay untouched.
  function clampOffset(v) { return isFinite(+v) ? Math.max(0, Math.min(20, Math.round(+v))) : 0; }
  function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var S = loadSettings();

  // Setup link: ?at=LAT,LON&place=Label&horse=Name&coat=unclipped|partial|clipped&shelter=none|runin|stall&offset=0-20
  // Saves those settings on this device, then removes them from the address bar.
  (function fromLink() {
    var q = new URLSearchParams(location.search), at = (q.get("at") || "").split(",");
    if (at.length !== 2 || isNaN(+at[0]) || isNaN(+at[1])) return;
    S.lat = +(+at[0]).toFixed(2); S.lon = +(+at[1]).toFixed(2);
    if (q.has("place")) S.label = q.get("place").slice(0, 60);
    if (q.has("horse")) S.horse = q.get("horse").slice(0, 30);
    if (CHART_COATS.indexOf(q.get("coat")) >= 0) S.coat = q.get("coat");
    var sh = q.get("shelter");
    if (sh) S.shelter = SHELTERS.indexOf(sh) >= 0 ? sh : (sh === "1" ? "runin" : "none");
    if (q.has("offset")) S.offset = clampOffset(q.get("offset"));
    else if (q.get("warm") === "1") S.offset = 10;  // older links
    saveSettings(S);
    if (history.replaceState) history.replaceState(null, "", location.pathname);
  })();

  // ---------- blanket rules ----------
  // Levels: 0 none, 1 sheet, 2 light, 3 medium, 4 heavy, 5 heavy + liner/neck.
  var LEVELS = [
    { name: "No blanket", weight: "Let that winter coat do its job.", icon: "🐴" },
    { name: "Turnout sheet", weight: "Waterproof sheet, no fill (0g).", icon: "🧥" },
    { name: "Lightweight blanket", weight: "Light turnout, about 50–150g fill.", icon: "🧣" },
    { name: "Mediumweight blanket", weight: "Medium turnout, about 180–250g fill.", icon: "🧶" },
    { name: "Heavyweight blanket", weight: "Heavy turnout, 300g+ fill.", icon: "❄️" },
    { name: "Heavyweight + liner", weight: "Heavy turnout plus a liner or neck cover.", icon: "🥶" }
  ];
  // Lower bound (°F, effective temperature) for each level, by coat. Below the last bound -> top level.
  // Unclipped: 40+ none, 30-40 none (sheet if wet), 20-30 light, 10-20 medium, under 10 heavy.
  // Clipped: 65+ none, 55-65 sheet, 45-55 light, 35-45 medium, 20-35 heavy, under 20 heavy + liner
  // (5°F warmer than the classic chart - matches Rutgers/Schneiders and real practice in mild climates).
  var CHART = {
    unclipped: [[30, 0], [20, 2], [10, 3], [-999, 4]],
    partial:   [[55, 0], [45, 1], [35, 2], [25, 3], [10, 4], [-999, 5]],
    clipped:   [[65, 0], [55, 1], [45, 2], [35, 3], [20, 4], [-999, 5]]
  };
  // Warmest temperature each level is comfortable at (used for "take it off by…").
  var MAX_OK = {
    unclipped: { 1: 50, 2: 40, 3: 30, 4: 20 },
    partial:   { 1: 60, 2: 55, 3: 45, 4: 35, 5: 25 },
    clipped:   { 1: 70, 2: 65, 3: 55, 4: 45, 5: 35 }
  };
  // What each level actually is - shown in the "what's this blanket?" popup.
  var ABOUT = [
    "No blanket at all. A healthy horse's own coat insulates best when it can fluff up, so leave it off and let the hair do the work. Make sure there's plenty of hay - digesting forage keeps a horse warm from the inside.",
    "A turnout sheet is a waterproof, windproof outer shell with no stuffing (0g fill). It adds only a little warmth. Its job is to keep rain, wet snow and wind off the coat so the coat stays dry and keeps insulating. Also called a rain sheet. In a box stall, a plain stable sheet does the same job.",
    "A lightweight turnout has a thin layer of insulating fill, about 50–150g (some brands sell 100g or 150g). It takes the edge off a cool night without overheating - the everyday blanket for clipped horses in mild weather.",
    "A mediumweight turnout has about 180–250g of fill (often sold as 200g). It's the workhorse winter blanket: noticeably warmer than a lightweight, still fine if the night doesn't get truly cold.",
    "A heavyweight turnout has 300g of fill or more (often 300–400g). It's for cold nights, especially for clipped horses or horses that feel the cold. Check in the morning - if the day warms up, it gets too hot fast.",
    "A heavyweight turnout plus a liner (an extra 100–200g layer that goes underneath) or an attached neck cover / hood. Only for the coldest nights. Check under it at the withers for sweat."
  ];
  var COAT_NAME = { unclipped: "a full winter coat", partial: "a partly clipped horse", clipped: "a clipped horse" };
  // "Neighcast uses this when it feels like 45–55°F" for the current coat, from CHART.
  function bandText(coat, level) {
    var rows = CHART[coat], parts = [];
    rows.forEach(function (row, i) {
      if (row[1] !== level) return;
      var lo = row[0], hi = i ? rows[i - 1][0] : null;
      parts.push(lo <= -999 ? "below " + hi + "°F" : hi == null ? lo + "°F and up" : lo + "–" + hi + "°F");
    });
    if (!parts.length) return level === 1
      ? "For " + COAT_NAME[coat] + ", Neighcast only picks a sheet when rain or snow is likely, to keep the coat dry."
      : "For " + COAT_NAME[coat] + ", Neighcast only gets here when wind, rain or the horse's own needs bump the call up.";
    return "For " + COAT_NAME[coat] + ", Neighcast picks this when it feels like " + parts.join(" or ") + " (before any bumps for rain, wind or a horse that feels the cold).";
  }

  function chartLevel(coat, t) {
    var rows = CHART[coat];
    for (var i = 0; i < rows.length; i++) if (t >= rows[i][0]) return rows[i][1];
    return rows[rows.length - 1][1];
  }

  function decide(night, s) {
    // Effective temperature: full wind chill outside; a run-in shed takes about half the wind's bite;
    // a box stall takes it all (air temperature only), and keeps the horse dry.
    var stall = s.shelter === "stall", runin = s.shelter === "runin", open = !stall && !runin;
    var eff = stall ? night.low : runin ? night.low - (night.low - night.feelLow) / 2 : night.feelLow;
    var level = chartLevel(s.coat, eff), why = [];
    why.push(stall ? "In the stall it'll get down to about " + Math.round(eff) + "°F, out of the wind"
                   : (runin ? "With the run-in it'll feel like about " : "It'll feel like ") + Math.round(eff) + "°F at the coldest");
    // Weather (wet or wind) moves the call up at most one weight in total.
    var wet = night.precip >= 0.03 || night.precipChance >= 60, bumped = false;
    if (wet && eff < 50 && !stall) {
      if (level === 0 && eff < 45) { level = 1; bumped = true; why.push("rain or snow is likely, so a waterproof sheet keeps the coat dry and fluffy"); }
      else if (level > 0 && level < 5 && open && s.coat === "unclipped" && eff < 35) { level += 1; bumped = true; why.push("a wet coat loses its warmth, so go one weight up"); }
      else why.push("make sure the blanket is a waterproof turnout");
    }
    if (!bumped && night.gust >= 30 && open && level > 0 && level < 5) { level += 1; why.push("gusts to " + Math.round(night.gust) + " mph with no shelter, so go one weight up"); }
    else if (bumped && night.gust >= 30 && open) why.push("it'll be gusty too, so check the blanket's straps");
    if (stall && level > 0) why.push("indoors a stable blanket is fine - it doesn't need to be a waterproof turnout");
    if (s.warm && eff < 50 && level < 5) { level += 1; why.push("bumped one weight up because this horse feels the cold"); }
    return { level: level, eff: eff, wet: wet, why: why };
  }

  // ---------- forecast: Open-Meteo + National Weather Service ----------
  function getJSON(url) {
    return fetch(url, { headers: { Accept: "application/geo+json, application/json" } }).then(function (r) {
      if (!r.ok) throw new Error(url.split("?")[0].replace("https://", "") + " answered " + r.status);
      return r.json();
    });
  }
  function forecastURL(lat, lon) {
    return "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&hourly=temperature_2m,precipitation_probability,precipitation,snowfall,wind_speed_10m,wind_gusts_10m" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=8";
  }
  // NWS: grid point lookup, then its hourly forecast (about 6.5 days). Returns null if unavailable.
  function nwsHourly(lat, lon) {
    return getJSON("https://api.weather.gov/points/" + lat + "," + lon).then(function (p) {
      return getJSON(p.properties.forecastHourly);
    }).then(function (f) {
      var map = {};
      f.properties.periods.forEach(function (p) {
        var t = p.temperatureUnit === "C" ? p.temperature * 9 / 5 + 32 : p.temperature;
        var w = (String(p.windSpeed).match(/\d+/g) || [0]).map(Number);
        map[p.startTime.slice(0, 16)] = { t: t, wind: Math.max.apply(null, w), pop: (p.probabilityOfPrecipitation || {}).value || 0 };
      });
      return map;
    }).catch(function () { return null; });
  }

  // Same wind chill formula for both sources (NWS standard; applies at 50°F and below, wind over 3 mph).
  function windChill(t, v) {
    if (t > 50 || v <= 3) return t;
    var p = Math.pow(v, 0.16);
    return 35.74 + 0.6215 * t - 35.75 * p + 0.4275 * t * p;
  }
  function min(a) { return Math.min.apply(null, a); }
  function max(a) { return Math.max.apply(null, a); }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  // Group hours into nights (6 pm -> 8 am) and the next day (8 am -> 6 pm), per source.
  function nights(h, nws) {
    var out = [], idx = {};
    h.time.forEach(function (t, i) { idx[t] = i; });
    var dates = {};
    h.time.forEach(function (t) { dates[t.slice(0, 10)] = true; });
    Object.keys(dates).sort().forEach(function (d) {
      var start = idx[d + "T18:00"]; if (start == null) return;
      var hours = [], day = [];
      for (var i = start; i < start + 14 && i < h.time.length; i++) hours.push(i);
      for (var j = start + 14; j < start + 24 && j < h.time.length; j++) day.push(j);
      if (hours.length < 10) return;
      var col = function (arr, k) { return arr.map(function (i) { return h[k][i]; }).filter(function (v) { return v != null; }); };
      var temps = col(hours, "temperature_2m");
      var feels = hours.map(function (i) { return windChill(h.temperature_2m[i], h.wind_speed_10m[i]); });
      var om = {
        low: min(temps), feelLow: min(feels), lowAt: h.time[hours[temps.indexOf(min(temps))]],
        wind: max(col(hours, "wind_speed_10m")), chance: max(col(hours, "precipitation_probability").concat([0]))
      };
      var n = {
        date: d, hours: hours, day: day, om: om, nws: null,
        gust: max(col(hours, "wind_gusts_10m")),
        precip: sum(col(hours, "precipitation")), snow: sum(col(hours, "snowfall")),
        dayHigh: day.length ? max(col(day, "temperature_2m")) : null
      };
      if (nws) {
        var nh = hours.map(function (i) { return nws[h.time[i]]; }).filter(Boolean);
        if (nh.length >= 10) {
          var nt = nh.map(function (x) { return x.t; });
          n.nws = { low: min(nt), feelLow: min(nh.map(function (x) { return windChill(x.t, x.wind); })),
                    wind: max(nh.map(function (x) { return x.wind; })), chance: max(nh.map(function (x) { return x.pop; })) };
          var nd = day.map(function (i) { return nws[h.time[i]]; }).filter(Boolean);
          if (nd.length && n.dayHigh != null) n.dayHigh = Math.max(n.dayHigh, max(nd.map(function (x) { return x.t; })));
        }
      }
      // The call uses the colder source - for blanketing, too warm a guess is the worse mistake.
      var s = n.nws;
      n.low = s ? Math.min(om.low, s.low) : om.low;
      n.feelLow = s ? Math.min(om.feelLow, s.feelLow) : om.feelLow;
      n.wind = s ? Math.max(om.wind, s.wind) : om.wind;
      n.precipChance = s ? Math.max(om.chance, s.chance) : om.chance;
      n.lowAt = om.lowAt;
      n.gap = s ? Math.abs(om.feelLow - s.feelLow) : 0;
      n.colder = !s ? "Open-Meteo" : (s.feelLow < om.feelLow ? "NWS" : (s.feelLow > om.feelLow ? "Open-Meteo" : "both"));
      out.push(n);
    });
    return out;
  }
  // The call each source would make on its own (used to flag disagreements).
  function soloLevel(n, src, s) {
    var x = n[src]; if (!x) return null;
    return decide({ low: x.low, feelLow: x.feelLow, gust: n.gust, precip: n.precip, precipChance: x.chance }, s).level;
  }

  // ---------- formatting ----------
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function dateOf(iso) { var p = iso.slice(0, 10).split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function shift(iso, days) { var d = dateOf(iso); d.setDate(d.getDate() + days); return ymd(d); }
  // The first night shown is always "Tonight"; the card underneath spells out the exact dates.
  function nightName(n, i) {
    if (i === 0) return "Tonight";
    if (i === 1) return "Tomorrow";
    return DOW[dateOf(n.date).getDay()] + " night";
  }
  function shortDate(iso) { var d = dateOf(iso); return MON[d.getMonth()] + " " + d.getDate(); }
  // "Sun, Nov 22, 6 pm → Mon 8 am"
  function nightSpan(n) { var a = dateOf(n.date), b = dateOf(shift(n.date, 1));
    return DOW[a.getDay()] + ", " + shortDate(n.date) + ", 6 pm → " + DOW[b.getDay()] + " 8 am"; }
  function hourLabel(iso) {
    var h = +iso.slice(11, 13);
    return (h % 12 || 12) + (h < 12 ? " am" : " pm");
  }
  function r(v) { return Math.round(v); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function horse() { return S.horse ? esc(S.horse) : "your horse"; }
  // The night as the rules should see it: every temperature lowered by the fine-tune offset.
  function shifted(n) {
    var d = S.offset; if (!d) return n;
    var x = Object.assign({}, n, { low: n.low - d, feelLow: n.feelLow - d });
    if (n.om) x.om = Object.assign({}, n.om, { low: n.om.low - d, feelLow: n.om.feelLow - d });
    if (n.nws) x.nws = Object.assign({}, n.nws, { low: n.nws.low - d, feelLow: n.nws.feelLow - d });
    return x;
  }
  // decide() on the shifted night, with the first reason showing the real temperature.
  function call(n) {
    var c = decide(shifted(n), S);
    if (S.offset) c.why[0] = c.why[0].replace(/-?\d+°F/, Math.round(c.eff + S.offset) + "°F") + ", blanketing as if " + S.offset + "° colder";
    return c;
  }
  function solo(n, src) { return soloLevel(shifted(n), src, S); }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  // ---------- render ----------
  function render(data, nws, alerts) {
    var h = data.hourly, ns = nights(h, nws);
    // Location's local time. Before 8 am we're still inside last night.
    var local = new Date(Date.now() + data.utc_offset_seconds * 1000 + new Date().getTimezoneOffset() * 60000);
    var want = new Date(local); if (local.getHours() < 8) want.setDate(want.getDate() - 1);
    var k = ns.findIndex(function (n) { return n.date === ymd(want); });
    if (k < 0) k = ns.findIndex(function (n) { return n.date >= ymd(local); });
    ns = ns.slice(Math.max(0, k));
    if (!ns.length) throw new Error("no overnight hours in the forecast");

    var n0 = ns[0], c0 = call(n0), L = LEVELS[c0.level];
    $("#headline").innerHTML = "Blanket " + horse() + " tonight?";
    $("#call-for").textContent = nightSpan(n0);
    $("#call-answer").textContent = c0.level === 0 ? "No blanket needed" : "Yes – " + L.name.toLowerCase();
    $("#call-weight").innerHTML = esc(L.weight) + ' <button type="button" class="level-link inline" data-night="0">What\'s this? ⓘ</button>';
    $("#call-icon").textContent = L.icon;
    $("#call-card").className = "call-card lvl-" + c0.level;
    var both = n0.nws ? " <small>(Open-Meteo " + r(n0.om.low) + "° · NWS " + r(n0.nws.low) + "°)</small>" : "";
    var bothF = n0.nws ? " <small>(" + r(n0.om.feelLow) + "° · " + r(n0.nws.feelLow) + "°)</small>" : "";
    $("#call-facts").innerHTML = [
      "Low <b>" + r(n0.low) + "°F</b>" + both,
      "Feels like <b>" + r(n0.feelLow) + "°F</b>" + bothF,
      "Wind to <b>" + r(n0.wind) + " mph</b>, gusts " + r(n0.gust),
      n0.snow >= 0.1 ? "Snow <b>" + n0.snow.toFixed(1) + " in</b>" : (n0.precip >= 0.01 ? "Rain <b>" + n0.precip.toFixed(2) + " in</b>" : "Rain/snow chance <b>" + r(n0.precipChance) + "%</b>")
    ].map(function (f) { return "<li>" + f + "</li>"; }).join("");
    $("#call-why").textContent = c0.why.join("; ") + ".";

    // Source agreement
    var src = $("#call-sources"), lo = solo(n0, "om"), ln = solo(n0, "nws");
    if (!n0.nws) {
      src.className = "call-sources warn";
      src.innerHTML = "Only Open-Meteo tonight – the National Weather Service forecast " + (nws ? "doesn't reach this night yet" : "didn't load") + ".";
    } else if (lo !== ln) {
      src.className = "call-sources warn";
      src.innerHTML = "⚖️ <b>The forecasts disagree.</b> Open-Meteo says " + LEVELS[lo].name.toLowerCase() + ", the NWS says " + LEVELS[ln].name.toLowerCase() +
        ". Neighcast goes with the colder one. Worth a look again this evening.";
    } else if (n0.gap > 5) {
      src.className = "call-sources warn";
      src.innerHTML = "⚖️ The forecasts are " + r(n0.gap) + "° apart on the coldest feels-like, but both point to the same blanket.";
    } else {
      src.className = "call-sources ok";
      src.innerHTML = "✓ Open-Meteo and the National Weather Service agree" + (n0.gap >= 1 ? " (within " + r(n0.gap) + "°)" : "") + ".";
    }

    var off = $("#call-off"); off.hidden = true;
    if (c0.level > 0 && n0.day.length) {
      var limit = MAX_OK[S.coat][c0.level] + S.offset;  // comfortable in it that much warmer, too
      var hot = n0.day.filter(function (i) { return h.temperature_2m[i] > limit + 5; })[0];
      if (hot != null) {
        off.hidden = false;
        off.innerHTML = "☀️ <b>Take it off or swap down by about " + hourLabel(h.time[hot]) + "</b> – it reaches " + r(n0.dayHigh) + "°F tomorrow, too warm for a " + L.name.toLowerCase() + ".";
      }
    }
    $("#call-card").hidden = false;

    var al = (alerts && alerts.features) || [];
    $("#alerts").innerHTML = al.slice(0, 3).map(function (a) {
      var p = a.properties;
      return '<details class="alert"><summary>⚠️ ' + esc(p.event) + "</summary><p>" + esc(p.headline || "") + "</p></details>";
    }).join("");

    drawChart(h, n0.hours, nws);
    $("#tonight-chart-wrap").hidden = false;

    WEEK = [];
    $("#week-list").innerHTML = ns.slice(0, 7).map(function (n, i) {
      var c = call(n), Lv = LEVELS[c.level];
      WEEK.push({ n: n, c: c, name: nightName(n, i) });
      var wet = n.snow >= 0.1 ? "❄️ " + n.snow.toFixed(1) + " in" : (n.precipChance >= 40 ? "🌧 " + r(n.precipChance) + "%" : "");
      var a = solo(n, "om"), b = solo(n, "nws");
      var srcLine = n.nws ? '<p class="n-src' + (a !== b || n.gap > 5 ? " split" : "") + '">' + (a !== b ? "⚖️ " : "") + "OM " + r(n.om.low) + "° · NWS " + r(n.nws.low) + "°</p>"
                          : '<p class="n-src">Open-Meteo only</p>';
      return '<div class="night lvl-' + c.level + '"><p class="n-name">' + nightName(n, i) + '</p><p class="n-date">' + shortDate(n.date) + '</p><p class="n-icon">' + Lv.icon +
        '</p><p class="n-call"><button type="button" class="level-link" data-night="' + i + '" aria-label="What is a ' + Lv.name.toLowerCase() + '?">' + Lv.name + ' <span aria-hidden="true">ⓘ</span></button></p><p class="n-temp">' + r(n.low) + "° <small>feels " + r(n.feelLow) + "°</small></p>" +
        srcLine + '<p class="n-wet">' + wet + "</p></div>";
    }).join("");
    var wk = ns.slice(0, 7);
    $("#week-title").textContent = "The week of nights · " + shortDate(wk[0].date) + "–" + (dateOf(wk[0].date).getMonth() === dateOf(wk[wk.length - 1].date).getMonth() ? dateOf(wk[wk.length - 1].date).getDate() : shortDate(wk[wk.length - 1].date));
    $("#week").hidden = false;
    $("#status").textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) +
      (nws ? " from Open-Meteo and the National Weather Service." : ". The National Weather Service didn't answer, so this is Open-Meteo only.");
  }

  function drawChart(h, idx, nws) {
    var W = 720, H = 220, P = { l: 36, r: 12, t: 14, b: 30 };
    var temps = idx.map(function (i) { return h.temperature_2m[i]; });
    var feels = idx.map(function (i) { return windChill(h.temperature_2m[i], h.wind_speed_10m[i]); });
    var nt = nws ? idx.map(function (i) { return nws[h.time[i]] ? nws[h.time[i]].t : null; }) : [];
    var all = temps.concat(feels, nt.filter(function (v) { return v != null; }));
    var lo = Math.floor(min(all) / 5) * 5 - 5, hi = Math.ceil(max(all) / 5) * 5 + 5;
    var x = function (k) { return P.l + k * (W - P.l - P.r) / (idx.length - 1); };
    var y = function (v) { return P.t + (hi - v) * (H - P.t - P.b) / (hi - lo); };
    var line = function (arr) {
      var d = "", pen = false;
      arr.forEach(function (v, k) { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(k).toFixed(1) + " " + y(v).toFixed(1) + " "; pen = true; });
      return d;
    };
    var bw = (W - P.l - P.r) / idx.length * 0.6, svg = "";
    idx.forEach(function (i, k) {
      var p = h.precipitation_probability[i] || 0, bh = p / 100 * 40;
      svg += '<rect class="wet" x="' + (x(k) - bw / 2).toFixed(1) + '" y="' + (H - P.b - bh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2"/>';
    });
    for (var v = lo; v <= hi; v += 10) {
      svg += '<line class="grid" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ax" x="' + (P.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "°</text>";
    }
    if (lo < 32 && hi > 32) svg += '<line class="freeze" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(32) + '" y2="' + y(32) + '"/><text class="ax freeze-t" x="' + (W - P.r) + '" y="' + (y(32) - 4) + '" text-anchor="end">freezing</text>';
    svg += '<path class="feel" d="' + line(feels) + '"/>';
    if (nt.some(function (v) { return v != null; })) svg += '<path class="nws" d="' + line(nt) + '"/>';
    svg += '<path class="temp" d="' + line(temps) + '"/>';
    idx.forEach(function (i, k) { if (k % 2 === 0) svg += '<text class="ax" x="' + x(k) + '" y="' + (H - 8) + '" text-anchor="middle">' + hourLabel(h.time[i]) + "</text>"; });
    $("#chart").innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Tonight\'s temperature by hour from Open-Meteo and the National Weather Service">' + svg + "</svg>";
  }

  function load() {
    if (S.lat == null) { $("#place").textContent = "Set your barn's location to get started"; openSettings(); return; }
    $("#place").textContent = "📍 " + (S.label || "Your barn");
    $("#status").textContent = "Checking the sky…";
    var lat = (+S.lat).toFixed(4), lon = (+S.lon).toFixed(4);
    var alerts = getJSON("https://api.weather.gov/alerts/active?point=" + lat + "," + lon).catch(function () { return null; });
    var nws = nwsHourly(lat, lon);
    getJSON(forecastURL(lat, lon)).then(function (data) {
      return Promise.all([nws, alerts]).then(function (res) { render(data, res[0], res[1]); });
    }).catch(function (e) {
      $("#status").textContent = "Couldn't get the forecast right now (" + e.message + "). Try again in a minute.";
    });
  }

  // ---------- "what's this blanket?" popup ----------
  var WEEK = [];
  function openLevel(i) {
    var w = WEEK[i]; if (!w) return;
    var L = LEVELS[w.c.level], d = $("#level-info");
    d.className = "level-dialog lvl-" + w.c.level;
    $("#level-icon").textContent = L.icon;
    $("#level-name").textContent = L.name;
    $("#level-weight").textContent = L.weight;
    $("#level-about").textContent = ABOUT[w.c.level];
    $("#level-band").textContent = levelBand(S.coat, S.offset, w.c.level);
    $("#level-night").innerHTML = "<b>" + esc(w.name) + " (" + nightSpan(w.n) + "):</b> low " + r(w.n.low) + "°F, feels like " + r(w.n.feelLow) + "°F. " + esc(w.c.why.join("; ")) + ".";
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".level-link");
    if (b) openLevel(+b.dataset.night);
  });

  // ---------- settings dialog ----------
  // searched = the text the last Find looked up, so Save can tell when a typed place was never looked up.
  var dlg = $("#settings"), form = $("#settings-form"), pending = null, searched = null;
  function openSettings() {
    form.horse.value = S.horse || "";
    form.querySelector('input[name=coat][value="' + S.coat + '"]').checked = true;
    form.querySelector('input[name=shelter][value="' + S.shelter + '"]').checked = true; form.offset.value = S.offset;
    $("#place-chosen").textContent = S.label ? "Current: " + S.label : "";
    $("#place-results").innerHTML = ""; pending = null; searched = null; $("#place-input").value = "";
    coatBands();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  // Each blanket's temperature range for a coat and fine-tune offset, worked out degree by degree
  // the way decide() handles a dry night. Used by "With these settings" and the blanket popup.
  var BAND_NAMES = ["No blanket", "Sheet (0g)", "Light (50–150g)", "Medium (180–250g)", "Heavy (300g+)", "Heavy + liner"];
  function bands(coat, offset) {
    var out = [];
    for (var t = 100; t >= -20; t--) {
      var lv = chartLevel(coat, t - offset), last = out[out.length - 1];
      if (last && last.level === lv) last.low = t; else out.push({ level: lv, high: t, low: t });
    }
    return out.map(function (b, i) {
      b.range = i === 0 ? b.low + "° and warmer" : i === out.length - 1 ? "below " + (b.high + 1) + "°" : b.low + "° to " + (b.high + 1) + "°";
      return b;
    });
  }
  function levelBand(coat, offset, level) {
    var b = bands(coat, offset).filter(function (x) { return x.level === level; })[0];
    if (!b) return bandText(coat, level);
    return "For " + COAT_NAME[coat] + (offset ? " fine-tuned " + offset + "° warmer" : "") + ", Neighcast picks this when it feels like " +
      b.range.replace(/°/g, "°F").replace("°F and warmer", "°F and up") + " (before any bump for rain or wind).";
  }
  function coatBands() {
    var coatEl = form.querySelector("input[name=coat]:checked"), shelterEl = form.querySelector("input[name=shelter]:checked");
    var coat = coatEl ? coatEl.value : S.coat, offset = clampOffset(form.offset.value);
    $("#comfort-out").textContent = offset + "°";
    $("#coat-bands").innerHTML = bands(coat, offset).map(function (b) {
      return '<li class="lvl-' + b.level + '"><span>' + BAND_NAMES[b.level] + "</span><span>" + b.range + "</span></li>";
    }).join("");
    var stall = shelterEl && shelterEl.value === "stall";
    $("#coat-bands-note").textContent = (stall ? "Air temperature in a closed stall, overnight. " : "The coldest it feels at your horse's shelter, overnight. ") +
      "Rain, snow or wind can move it up one more weight.";
  }
  form.addEventListener("input", function (e) { if (e.target.name === "offset") coatBands(); });
  form.addEventListener("change", coatBands);
  function choose(p) {
    pending = p; $("#place-results").innerHTML = "";
    $("#place-chosen").textContent = "✓ " + p.label;
  }
  // Shows a message by the location box, scrolls it into view and puts the cursor there.
  function placeNote(msg) {
    $("#place-chosen").textContent = msg;
    $("#place-input").scrollIntoView({ block: "center", behavior: "smooth" }); $("#place-input").focus();
  }
  // Looks the typed place up. Resolves to true once exactly one place is chosen. From Save (fromSave),
  // a miss or several matches scroll back to the box so the person can see why nothing was saved.
  function findPlace(fromSave) {
    var q = $("#place-input").value.trim(); if (!q) return Promise.resolve(false);
    searched = q; pending = null;
    $("#place-chosen").textContent = "Searching…";
    var zip = /^\d{5}$/.test(q);
    var req = zip
      ? getJSON("https://api.zippopotam.us/us/" + q).then(function (d) {
          return d.places.map(function (p) { return { lat: +p.latitude, lon: +p.longitude, label: p["place name"] + ", " + p["state abbreviation"] + " " + q }; });
        }, function (err) { if (/ 404$/.test(err.message)) return []; throw err; })  // unknown ZIP: "couldn't find", not "search failed"
      : getJSON("https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=" + encodeURIComponent(q.split(",")[0])).then(function (d) {
          var st = (q.split(",")[1] || "").trim().toLowerCase();
          return (d.results || []).filter(function (r) { return !st || (r.admin1 || "").toLowerCase().indexOf(st) === 0 || (r.admin1_code || "").toLowerCase() === st; })
            .map(function (r) { return { lat: r.latitude, lon: r.longitude, label: r.name + (r.admin1 ? ", " + r.admin1 : "") + (r.country_code && r.country_code !== "US" ? " (" + r.country_code + ")" : "") }; });
        });
    return req.then(function (list) {
      if (!list.length) { (fromSave ? placeNote : function (m) { $("#place-chosen").textContent = m; })("Couldn't find \u201c" + q + "\u201d - check it, or try a 5-digit ZIP code. Nothing was saved yet."); return false; }
      if (list.length === 1) { choose(list[0]); return true; }
      if (fromSave) placeNote("Pick one, then Save:"); else $("#place-chosen").textContent = "Pick one:";
      $("#place-results").innerHTML = list.map(function (p, i) { return '<li><button type="button" class="link-btn" data-i="' + i + '">' + esc(p.label) + "</button></li>"; }).join("");
      $("#place-results").onclick = function (ev) { var b = ev.target.closest("button"); if (b) choose(list[+b.dataset.i]); };
      return false;
    }).catch(function () { (fromSave ? placeNote : function (m) { $("#place-chosen").textContent = m; })("Search failed - check the spelling or try a ZIP code."); return false; });
  }
  $("#find-place").addEventListener("click", function () { findPlace(false); });
  $("#place-input").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); findPlace(false); } });
  $("#use-gps").addEventListener("click", function () {
    if (!navigator.geolocation) { $("#place-chosen").textContent = "This browser can't share its location."; return; }
    $("#place-chosen").textContent = "Asking for location…";
    navigator.geolocation.getCurrentPosition(function (p) {
      // Two decimals (~1 km) is plenty for weather and keeps the exact spot private.
      $("#place-input").value = ""; searched = null;
      choose({ lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2), label: "This phone's location" });
    }, function () { $("#place-chosen").textContent = "Location not shared - type a ZIP instead."; }, { timeout: 15000 });
  });
  $("#open-settings").addEventListener("click", openSettings);
  form.addEventListener("submit", function (e) {
    if (e.submitter && e.submitter.value === "cancel") return;
    // Typed a place but never pressed Find, changed it since, or nothing was picked: look it up now. One match saves
    // straight away; none or several keep the dialog open, back at the location box.
    var typed = $("#place-input").value.trim();
    if (typed && (typed !== searched || !pending)) {
      e.preventDefault();
      findPlace(true).then(function (ok) { if (ok) { saveForm(); dlg.close(); } });
      return;
    }
    if (!saveForm()) e.preventDefault();
  });
  // Saves the form. Returns false (and says why) when there is still no location.
  function saveForm() {
    if (pending) { S.lat = +(+pending.lat).toFixed(2); S.lon = +(+pending.lon).toFixed(2); S.label = pending.label; }
    S.horse = form.horse.value.trim();
    S.coat = form.querySelector("input[name=coat]:checked").value;
    S.shelter = form.querySelector("input[name=shelter]:checked").value; S.warm = false; S.offset = clampOffset(form.offset.value);
    if (S.lat == null) { placeNote("Type the barn's ZIP code or town first, or use this phone's location."); return false; }
    saveSettings(S);
    setTimeout(load, 0);
    return true;
  }

  load();
})();
