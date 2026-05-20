/* School Websites Project — atlas.js
   Renders the Atlas page across six units of analysis:
   National, States, Counties, Topics, Compare, Correlations.

   A lightweight school search index is loaded lazily on first keystroke,
   so the initial page paint stays small. There is no school-level map.
*/

(function () {
  "use strict";

  const DATA_URL   = "data/school_summary.json";
  const SEARCH_URL = "data/school_search_index.json";

  const TOPICS = [
    { key: "religious",            label: "Religious identity",   scale: "RdPu",    color: "#be185d" },
    { key: "character",            label: "Character / values",   scale: "Blues",   color: "#1d4ed8" },
    { key: "parent_involvement",   label: "Family partnership",   scale: "Greens",  color: "#15803d" },
    { key: "college_prep",         label: "Academic rigor",       scale: "Oranges", color: "#b45309" },
    { key: "tuition_transparency", label: "Tuition transparency", scale: "Purples", color: "#7c3aed" },
    { key: "stem",                 label: "STEM emphasis",        scale: "YlOrRd",  color: "#b91c1c" },
  ];

  // Cross-sector breakdown for the National panel
  const SECTOR_BREAKDOWN = [
    { topic: "Religious identity",   priv: 70.0, pub: 23.8, chart: 21.3 },
    { topic: "Family partnership",   priv: 64.0, pub: 64.5, chart: 67.5 },
    { topic: "Individualized",       priv: 36.2, pub: 14.8, chart: 35.8 },
    { topic: "Academic rigor",       priv: 78.1, pub: 76.8, chart: 81.3 },
    { topic: "Tuition transparency", priv: 82.8, pub: 49.8, chart: 68.4 },
    { topic: "Market urgency",       priv: 40.7, pub: 29.4, chart: 65.4 },
    { topic: "STEM",                 priv: 73.1, pub: 67.1, chart: 72.5 },
    { topic: "Arts / athletics",     priv: 78.6, pub: 76.6, chart: 77.1 },
    { topic: "DEI / inclusion",      priv: 49.2, pub: 43.3, chart: 54.5 },
    { topic: "Sustainability",       priv: 56.8, pub: 50.3, chart: 55.2 },
    { topic: "SEL / wellness",       priv: 58.3, pub: 63.0, chart: 68.7 },
    { topic: "Character / civic",    priv: 91.8, pub: 85.0, chart: 88.3 },
  ];

  const PLOTLY_BASE = { responsive: true, displayModeBar: false };

  let DATA   = null;
  let SEARCH = null;       // lightweight per-school index, lazy-loaded
  let searchLoadingPromise = null;
  let activeTopic  = TOPICS[4];      // Tuition transparency = headline
  let activeSector = "all";          // all | private | public | charter
  let activeScale  = "continuous";   // continuous | quintile
  let activeUnit   = "national";

  /* ── Bootstrap ─────────────────────────────────────────── */
  function init() {
    populateTopicChips();
    renderSectorBreakdown();
    bindUnitTabs();
    bindSectorToggle();
    bindScaleToggle();
    populateBivariateSelects();
    bindSearchBox();
    bindSchoolProfileClose();
    applyControlVisibility();

    fetch(DATA_URL)
      .then((r) => r.json())
      .then((d) => {
        DATA = d;
        renderCoverageStrip(d.metadata);
        renderStatesPanel();
        renderCountiesPanel();
        renderTopicsGrid();
      })
      .catch((err) => {
        console.error("data load failed", err);
        document.querySelectorAll(".unit-panel").forEach((p) => {
          p.innerHTML = '<p style="padding:2rem; color:#b91c1c;">Failed to load data: ' + err + "</p>";
        });
      });
  }

  /* ── Topic chips ──────────────────────────────────────── */
  function populateTopicChips() {
    const row = document.getElementById("topic-row");
    if (!row) return;
    row.innerHTML = "";
    TOPICS.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "topic-chip" + (i === 4 ? " active" : "");
      b.textContent = t.label;
      b.dataset.key = t.key;
      b.addEventListener("click", () => {
        document.querySelectorAll(".topic-chip").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        activeTopic = t;
        if (!DATA) return;
        if (activeUnit === "states")   renderStatesPanel();
        if (activeUnit === "counties") renderCountiesPanel();
        if (activeUnit === "topics")   renderTopicsGrid();
        if (activeUnit === "correlations" && SEARCH) renderCorrelationsPanel();
      });
      row.appendChild(b);
    });
  }

  /* ── Unit tabs ────────────────────────────────────────── */
  function bindUnitTabs() {
    document.querySelectorAll(".unit-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const unit = tab.dataset.unit;
        activeUnit = unit;
        document.querySelectorAll(".unit-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".unit-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        const panel = document.getElementById("panel-" + unit);
        if (panel) panel.classList.add("active");
        applyControlVisibility();

        if (unit === "correlations") {
          ensureSearchIndex().then(() => {
            if (activeUnit === "correlations") renderCorrelationsPanel();
          });
        } else if (unit === "compare" && DATA) {
          renderComparePanel();
        }
        if (DATA) window.dispatchEvent(new Event("resize"));
      });
    });
  }

  function applyControlVisibility() {
    const topicRow = document.getElementById("topic-row");
    const scaleGrp = document.getElementById("scale-group");
    const sectorNote = document.getElementById("sector-note");
    if (!topicRow) return;
    const hideTopic = (activeUnit === "national" || activeUnit === "compare");
    topicRow.style.display = hideTopic ? "none" : "flex";
    const showScale = (activeUnit === "states" || activeUnit === "counties");
    if (scaleGrp) scaleGrp.style.display = showScale ? "flex" : "none";
    if (sectorNote) {
      if (activeUnit === "correlations") sectorNote.textContent = "Filter applies to correlations";
      else if (activeUnit === "states" || activeUnit === "counties" || activeUnit === "topics") sectorNote.textContent = "State/county aggregates = private only";
      else sectorNote.textContent = "";
    }
  }

  /* ── Sector + scale toggles ───────────────────────────── */
  function bindSectorToggle() {
    document.querySelectorAll("#sector-toggle .seg-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll("#sector-toggle .seg-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        activeSector = b.dataset.sector;
        if (activeUnit === "correlations" && SEARCH) renderCorrelationsPanel();
      });
    });
  }
  function bindScaleToggle() {
    document.querySelectorAll("[data-scale]").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll("[data-scale]").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        activeScale = b.dataset.scale;
        if (activeUnit === "states")   renderStatesPanel();
        if (activeUnit === "counties") renderCountiesPanel();
      });
    });
  }

  /* ── Coverage strip ───────────────────────────────────── */
  function renderCoverageStrip(meta) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    if (!meta) return;
    set("cv-total",    fmt(meta.total_schools));
    set("cv-crawled",  fmt(meta.crawled_schools));
    set("cv-private",  fmt(meta.private_crawled));
    set("cv-public",   fmt(meta.public_crawled));
    set("cv-states",   fmt(meta.n_states));
    set("cv-counties", fmt(meta.n_counties));
  }
  function fmt(n) { return n == null ? "—" : Number(n).toLocaleString(); }

  /* ── National: sector breakdown bars ──────────────────── */
  function renderSectorBreakdown() {
    const target = document.getElementById("nat-sector-bars");
    if (!target) return;
    target.innerHTML = SECTOR_BREAKDOWN.map((row) => {
      const maxv = Math.max(row.priv, row.pub, row.chart);
      const wpc = (v) => (100 * v / maxv).toFixed(1);
      return `
        <div class="sector-bar-row">
          <div class="lbl">${row.topic}</div>
          <div>
            <div class="bar-wrap">
              <div class="bar"><div class="bar-fill priv"  style="width:${wpc(row.priv)}%"></div></div>
              <span class="val">${row.priv.toFixed(1)}%</span>
            </div>
            <div class="bar-wrap" style="margin-top:4px">
              <div class="bar"><div class="bar-fill pub"   style="width:${wpc(row.pub)}%"></div></div>
              <span class="val">${row.pub.toFixed(1)}%</span>
            </div>
            <div class="bar-wrap" style="margin-top:4px">
              <div class="bar"><div class="bar-fill chart" style="width:${wpc(row.chart)}%"></div></div>
              <span class="val">${row.chart.toFixed(1)}%</span>
            </div>
          </div>
        </div>`;
    }).join("");
  }

  /* ── States panel ─────────────────────────────────────── */
  function renderStatesPanel() {
    if (!DATA || !DATA.states) return;
    const t = activeTopic;
    const rows = DATA.states.filter((s) => s[t.key] != null);
    const titleEl = document.getElementById("state-map-title");
    if (titleEl) titleEl.textContent = t.label + " — state-level mean";

    let z = rows.map((r) => r[t.key]);
    if (activeScale === "quintile") {
      const sorted = z.slice().sort((a,b)=>a-b);
      const cuts = [0.2,0.4,0.6,0.8].map((p) => sorted[Math.floor(p*sorted.length)]);
      z = z.map((v) => cuts.reduce((acc,c)=>acc+(v>c?1:0), 0));
    }

    Plotly.react("state-map", [{
      type: "choropleth", locationmode: "USA-states",
      locations: rows.map((r) => r.state),
      z: z, colorscale: t.scale,
      colorbar: { title: { text: activeScale==="quintile"?"Quintile":"Mean", font: { size: 11 } }, thickness: 12, len: 0.7 },
      text: rows.map((r) => `${r.state}<br>${r[t.key].toFixed(1)} · n=${r.crawled}`),
      hovertemplate: "%{text}<extra></extra>",
    }], {
      geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "rgba(0,0,0,0)" },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    }, PLOTLY_BASE);

    const mapEl = document.getElementById("state-map");
    if (mapEl && mapEl.on) {
      mapEl.on("plotly_click", (e) => {
        if (e && e.points && e.points[0]) openStateProfile(e.points[0].location);
      });
    }

    const sorted = rows.slice().sort((a, b) => b[t.key] - a[t.key]);
    const tbody = document.getElementById("state-tbody");
    if (tbody) {
      tbody.innerHTML = sorted.map((r, i) => `
        <tr class="clickable" data-state="${r.state}">
          <td>${i + 1}</td><td>${r.state}</td>
          <td class="num">${r[t.key].toFixed(1)}</td>
          <td class="num">${fmt(r.crawled)}</td>
        </tr>`).join("");
      tbody.querySelectorAll("tr").forEach((tr) => {
        tr.addEventListener("click", () => openStateProfile(tr.dataset.state));
      });
    }

    const top10 = sorted.slice(0, 10);
    const bot10 = sorted.slice(-10).reverse();
    Plotly.react("state-bars", [
      { type: "bar", orientation: "h",
        x: top10.map((r) => r[t.key]).reverse(),
        y: top10.map((r) => r.state).reverse(),
        marker: { color: t.color }, name: "Top 10",
        hovertemplate: "%{y}: %{x:.1f}<extra></extra>" },
      { type: "bar", orientation: "h",
        x: bot10.map((r) => r[t.key]).reverse(),
        y: bot10.map((r) => r.state).reverse(),
        marker: { color: "#94a3b8" }, name: "Bottom 10",
        xaxis: "x2", yaxis: "y2",
        hovertemplate: "%{y}: %{x:.1f}<extra></extra>" },
    ], {
      grid: { rows: 1, columns: 2, pattern: "independent" },
      margin: { l: 36, r: 16, t: 28, b: 26 },
      showlegend: false,
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { size: 11 },
      annotations: [
        { text: "Top 10", x: 0.22, y: 1.05, xref: "paper", yref: "paper", showarrow: false, font: { size: 11, color: "#64748b" } },
        { text: "Bottom 10", x: 0.78, y: 1.05, xref: "paper", yref: "paper", showarrow: false, font: { size: 11, color: "#64748b" } },
      ],
      yaxis:  { automargin: true, tickfont: { size: 11 } },
      yaxis2: { automargin: true, tickfont: { size: 11 } },
      xaxis:  { tickfont: { size: 10 } },
      xaxis2: { tickfont: { size: 10 } },
    }, PLOTLY_BASE);
  }

  function openStateProfile(stateCode) {
    if (!DATA || !DATA.states) return;
    const row = DATA.states.find((s) => s.state === stateCode);
    if (!row) return;
    const card = document.getElementById("state-profile");
    if (!card) return;
    card.classList.add("open");
    document.getElementById("state-profile-name").textContent =
      `${stateCode} — six-topic profile (n=${row.crawled})`;
    const rankByTopic = {};
    TOPICS.forEach((t) => {
      const s = DATA.states.slice().filter((x) => x[t.key] != null).sort((a, b) => b[t.key] - a[t.key]);
      const i = s.findIndex((x) => x.state === stateCode);
      rankByTopic[t.key] = i >= 0 ? i + 1 : null;
    });
    Plotly.react("state-profile-chart", [{
      type: "bar", orientation: "h",
      x: TOPICS.map((t) => row[t.key]),
      y: TOPICS.map((t) => `${t.label} (#${rankByTopic[t.key]})`),
      marker: { color: TOPICS.map((t) => t.color) },
      hovertemplate: "%{y}: %{x:.1f}<extra></extra>",
    }], {
      margin: { l: 200, r: 24, t: 12, b: 32 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { size: 11 },
      xaxis: { title: { text: "Mean keyword matches per page", font: { size: 11 } } },
    }, PLOTLY_BASE);
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* Bind the state-profile close button (was inline onclick — now reliably bound) */
  function bindStateProfileClose() {
    const cards = document.querySelectorAll(".state-profile button");
    cards.forEach((b) => b.addEventListener("click", () => document.getElementById("state-profile").classList.remove("open")));
  }

  /* ── Counties panel ───────────────────────────────────── */
  function renderCountiesPanel() {
    if (!DATA || !DATA.counties) return;
    const t = activeTopic;
    const rows = DATA.counties.filter((c) => c[t.key] != null);
    const titleEl = document.getElementById("county-map-title");
    if (titleEl) titleEl.textContent = t.label + " — county-level mean (" + rows.length.toLocaleString() + " counties, all 50 states)";

    let z = rows.map((r) => r[t.key]);
    if (activeScale === "quintile") {
      const sorted = z.slice().sort((a,b)=>a-b);
      const cuts = [0.2,0.4,0.6,0.8].map((p) => sorted[Math.floor(p*sorted.length)]);
      z = z.map((v) => cuts.reduce((acc,c)=>acc+(v>c?1:0), 0));
    }

    Plotly.react("county-map", [{
      type: "choropleth",
      locationmode: "geojson-id",
      geojson: "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json",
      locations: rows.map((r) => String(r.fips).padStart(5, "0")),
      z: z, colorscale: t.scale,
      colorbar: { title: { text: activeScale==="quintile"?"Quintile":"Mean", font: { size: 11 } }, thickness: 12, len: 0.7 },
      text: rows.map((r) => `FIPS ${r.fips} · n=${r.n||""}<br>${r[t.key].toFixed(1)}`),
      hovertemplate: "%{text}<extra></extra>",
    }], {
      geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "rgba(0,0,0,0)" },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    }, PLOTLY_BASE);
  }

  /* ── Topics small-multiples grid ─────────────────────── */
  function renderTopicsGrid() {
    if (!DATA || !DATA.states) return;
    const grid = document.getElementById("topics-grid");
    if (!grid) return;
    grid.innerHTML = TOPICS.map((t, i) =>
      `<div class="topic-card">
        <div class="tc-title">${t.label}</div>
        <div class="tc-sub">State-mean across crawled schools</div>
        <div class="tc-map" id="tc-map-${i}"></div>
      </div>`).join("");
    TOPICS.forEach((t, i) => {
      const rows = DATA.states.filter((s) => s[t.key] != null);
      Plotly.react("tc-map-" + i, [{
        type: "choropleth", locationmode: "USA-states",
        locations: rows.map((r) => r.state),
        z: rows.map((r) => r[t.key]),
        colorscale: t.scale, showscale: false,
        text: rows.map((r) => `${r.state}: ${r[t.key].toFixed(1)}`),
        hovertemplate: "%{text}<extra></extra>",
      }], {
        geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "rgba(0,0,0,0)" },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      }, PLOTLY_BASE);
    });
  }

  /* ── Lazy school-search index loader ──────────────────── */
  function ensureSearchIndex() {
    if (SEARCH) return Promise.resolve(SEARCH);
    if (searchLoadingPromise) return searchLoadingPromise;
    const inp = document.getElementById("school-search");
    if (inp) inp.placeholder = "Loading school index (~1 MB gz)…";
    searchLoadingPromise = fetch(SEARCH_URL)
      .then((r) => r.json())
      .then((d) => {
        SEARCH = d;
        if (inp) inp.placeholder = `Search ${d.n.toLocaleString()} schools by name…`;
        return d;
      })
      .catch((err) => {
        console.error("search index load failed", err);
        if (inp) inp.placeholder = "Search index unavailable";
        searchLoadingPromise = null;
        throw err;
      });
    return searchLoadingPromise;
  }

  /* ── School search box ───────────────────────────────── */
  function bindSearchBox() {
    const inp = document.getElementById("school-search");
    const res = document.getElementById("school-search-results");
    if (!inp || !res) return;
    let timer;
    inp.addEventListener("input", () => {
      clearTimeout(timer);
      const q = inp.value.trim();
      if (q.length < 2) { res.classList.remove("open"); return; }
      timer = setTimeout(() => {
        ensureSearchIndex().then(() => doSearch(q)).catch(() => {});
      }, 150);
    });
    document.addEventListener("click", (e) => {
      if (!res.contains(e.target) && e.target !== inp) res.classList.remove("open");
    });

    function doSearch(q) {
      if (!SEARCH) return;
      const lq = q.toLowerCase();
      const hits = [];
      const arr = SEARCH.schools;
      for (let i = 0; i < arr.length && hits.length < 12; i++) {
        if (arr[i][0].toLowerCase().indexOf(lq) >= 0) hits.push(i);
      }
      if (!hits.length) {
        res.innerHTML = '<div class="sr-item" style="color:#94a3b8">No match</div>';
        res.classList.add("open");
        return;
      }
      res.innerHTML = hits.map((i) => {
        const r = arr[i];
        const st = SEARCH.states[r[1]];
        const sec = SEARCH.sectors[r[2]];
        return `<div class="sr-item" data-i="${i}"><strong>${escapeHtml(r[0])}</strong> <span style="color:#94a3b8">· ${st} · ${sec}</span></div>`;
      }).join("");
      res.classList.add("open");
      res.querySelectorAll(".sr-item").forEach((el) => {
        el.addEventListener("click", () => {
          const i = parseInt(el.dataset.i, 10);
          openSchoolProfile(i);
          res.classList.remove("open");
          inp.value = arr[i][0];
        });
      });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  /* School profile card */
  function openSchoolProfile(i) {
    if (!SEARCH) return;
    const r = SEARCH.schools[i];
    const name = r[0];
    const st   = SEARCH.states[r[1]];
    const sec  = SEARCH.sectors[r[2]];
    document.getElementById("spc-name").textContent = name;
    document.getElementById("spc-meta").textContent = `${sec} · ${st}`;

    // Sector mean for the same sector
    const arr = SEARCH.schools;
    const sums = [0,0,0,0,0,0];
    let nsec = 0;
    for (let k = 0; k < arr.length; k++) {
      if (arr[k][2] === r[2]) {
        for (let j = 0; j < 6; j++) sums[j] += arr[k][3+j];
        nsec++;
      }
    }
    const means = sums.map((s) => s / Math.max(1, nsec));
    const vals  = [r[3], r[4], r[5], r[6], r[7], r[8]];

    Plotly.react("spc-chart", [
      { type: "bar", orientation: "h",
        x: vals, y: SEARCH.topic_labels,
        name: "This school",
        marker: { color: "#7c3aed" },
        hovertemplate: "%{y}: %{x}<extra>This school</extra>" },
      { type: "bar", orientation: "h",
        x: means, y: SEARCH.topic_labels,
        name: sec + " mean",
        marker: { color: "#cbd5e1" },
        hovertemplate: "%{y}: %{x:.0f}<extra>" + sec + " mean</extra>" },
    ], {
      barmode: "group",
      margin: { l: 150, r: 16, t: 12, b: 32 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { size: 11 },
      legend: { orientation: "h", y: 1.18, x: 0 },
      xaxis: { title: { text: "Intensity (0–1000, percentile-scaled)", font: { size: 10 } } },
    }, PLOTLY_BASE);

    const card = document.getElementById("school-profile-card");
    if (card) { card.classList.add("open"); card.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  }
  function bindSchoolProfileClose() {
    const btn = document.getElementById("spc-close");
    if (btn) btn.addEventListener("click", () => document.getElementById("school-profile-card").classList.remove("open"));
    bindStateProfileClose();
  }

  /* ── Compare panel (bivariate) ───────────────────────── */
  const BIVARIATE_PAL = [
    "#e8e8e8", "#b5d3e7", "#6c83b5",
    "#e4acac", "#ad9eaf", "#574249",
    "#c85a5a", "#985356", "#574249",
  ];
  function populateBivariateSelects() {
    const x = document.getElementById("bv-x");
    const y = document.getElementById("bv-y");
    if (!x || !y) return;
    TOPICS.forEach((t, i) => {
      x.add(new Option(t.label, t.key, false, i === 4));
      y.add(new Option(t.label, t.key, false, i === 0));
    });
    x.addEventListener("change", () => { if (activeUnit === "compare") renderComparePanel(); });
    y.addEventListener("change", () => { if (activeUnit === "compare") renderComparePanel(); });
    renderBivariateLegend();
  }
  function renderBivariateLegend() {
    const el = document.getElementById("bv-legend");
    if (!el) return;
    el.innerHTML = "";
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const d = document.createElement("div");
        d.style.background = BIVARIATE_PAL[r * 3 + c];
        el.appendChild(d);
      }
    }
  }
  function tertile(vals, v) {
    const sorted = vals.slice().sort((a,b)=>a-b);
    const t1 = sorted[Math.floor(sorted.length / 3)];
    const t2 = sorted[Math.floor(2 * sorted.length / 3)];
    if (v <= t1) return 0;
    if (v <= t2) return 1;
    return 2;
  }
  function renderComparePanel() {
    if (!DATA || !DATA.states) return;
    const xKey = document.getElementById("bv-x").value;
    const yKey = document.getElementById("bv-y").value;
    const xLab = (TOPICS.find((t) => t.key === xKey) || {}).label || xKey;
    const yLab = (TOPICS.find((t) => t.key === yKey) || {}).label || yKey;
    const rows = DATA.states.filter((s) => s[xKey] != null && s[yKey] != null);
    const xv = rows.map((r) => r[xKey]);
    const yv = rows.map((r) => r[yKey]);
    const colors = rows.map((r) => {
      const ix = tertile(xv, r[xKey]);
      const iy = tertile(yv, r[yKey]);
      return BIVARIATE_PAL[(2 - iy) * 3 + ix];
    });
    const text = rows.map((r) =>
      `${r.state}<br>${xLab}: ${r[xKey].toFixed(1)}<br>${yLab}: ${r[yKey].toFixed(1)}`);

    document.getElementById("bv-map-title").textContent = `${xLab} × ${yLab}`;

    const traces = [];
    for (let bi = 0; bi < 9; bi++) {
      const idxs = colors.map((c, i) => (c === BIVARIATE_PAL[bi] ? i : -1)).filter((i) => i >= 0);
      if (!idxs.length) continue;
      traces.push({
        type: "choropleth", locationmode: "USA-states",
        locations: idxs.map((i) => rows[i].state),
        z: idxs.map(() => bi),
        zmin: 0, zmax: 8,
        colorscale: [[0, BIVARIATE_PAL[bi]], [1, BIVARIATE_PAL[bi]]],
        showscale: false,
        text: idxs.map((i) => text[i]),
        hovertemplate: "%{text}<extra></extra>",
      });
    }
    Plotly.react("bv-map", traces, {
      geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "rgba(0,0,0,0)" },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    }, PLOTLY_BASE);
  }

  /* ── Correlations panel ──────────────────────────────── */
  function renderCorrelationsPanel() {
    if (!SEARCH) return;
    const arr = SEARCH.schools;
    const sectorMap = { private: 0, public: 1, charter: 2 };
    const want = sectorMap[activeSector];
    // Build per-topic column arrays (filter by sector if needed)
    const ntopics = SEARCH.topics.length;
    const cols = []; for (let j = 0; j < ntopics; j++) cols.push([]);
    for (let k = 0; k < arr.length; k++) {
      if (activeSector !== "all" && arr[k][2] !== want) continue;
      for (let j = 0; j < ntopics; j++) cols[j].push(arr[k][3+j]);
    }
    if (!cols[0].length) return;
    const corr = pearsonMatrix(cols);
    const labs = SEARCH.topic_labels;
    Plotly.react("corr-heatmap", [{
      type: "heatmap",
      x: labs, y: labs, z: corr,
      zmin: -1, zmax: 1,
      colorscale: "RdBu", reversescale: true,
      colorbar: { title: { text: "r", font: { size: 11 } }, thickness: 12, len: 0.7 },
      hovertemplate: "%{y} vs %{x}<br>r = %{z:.2f}<extra></extra>",
    }], {
      margin: { l: 150, r: 30, t: 30, b: 120 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      xaxis: { tickangle: 30, tickfont: { size: 11 } },
      yaxis: { autorange: "reversed", tickfont: { size: 11 } },
      annotations: cellLabels(corr, labs),
    }, PLOTLY_BASE);
  }
  function cellLabels(z, labs) {
    const a = [];
    for (let i = 0; i < z.length; i++) {
      for (let j = 0; j < z[i].length; j++) {
        a.push({ x: labs[j], y: labs[i], text: z[i][j].toFixed(2), showarrow: false,
                 font: { size: 10, color: Math.abs(z[i][j]) > 0.6 ? "#fff" : "#1e293b" } });
      }
    }
    return a;
  }
  function pearsonMatrix(cols) {
    const k = cols.length;
    const n = cols[0].length;
    const means = cols.map((c) => c.reduce((s,x)=>s+x,0)/n);
    const sds   = cols.map((c, j) => Math.sqrt(c.reduce((s,x)=>s+(x-means[j])**2,0)/n) || 1);
    const m = [];
    for (let i = 0; i < k; i++) {
      const row = [];
      for (let j = 0; j < k; j++) {
        if (i === j) { row.push(1); continue; }
        let s = 0;
        for (let q = 0; q < n; q++) s += (cols[i][q]-means[i]) * (cols[j][q]-means[j]);
        row.push(s / (n * sds[i] * sds[j]));
      }
      m.push(row);
    }
    return m;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
