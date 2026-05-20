/* School Websites Project — atlas.js
   Renders the Atlas page across four units of analysis: National, States,
   Counties, Topics. Depends on Plotly (loaded in atlas.html).            */

(function () {
  "use strict";

  const DATA_URL = "data/school_summary.json";

  const TOPICS = [
    { key: "religious",            label: "Religious identity",   scale: "RdPu",    color: "#be185d" },
    { key: "character",            label: "Character / values",   scale: "Blues",   color: "#1d4ed8" },
    { key: "parent_involvement",   label: "Family partnership",   scale: "Greens",  color: "#15803d" },
    { key: "college_prep",         label: "Academic rigor",       scale: "Oranges", color: "#b45309" },
    { key: "tuition_transparency", label: "Tuition transparency", scale: "Purples", color: "#7c3aed" },
    { key: "stem",                 label: "STEM emphasis",        scale: "YlOrRd",  color: "#b91c1c" },
  ];

  // Cross-sector breakdown — sourced from features_national_20260517_v3.csv.
  // Each row is one topic with prevalence (% schools with any keyword hit).
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

  let DATA = null;
  let activeTopic = TOPICS[4];   // Tuition transparency = headline result

  /* ── Bootstrap ─────────────────────────────────────────── */

  function init() {
    populateTopicChips();
    renderSectorBreakdown();
    bindUnitTabs();

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
    TOPICS.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "topic-chip" + (i === 4 ? " active" : "");
      b.textContent = t.label;
      b.dataset.key = t.key;
      b.addEventListener("click", () => {
        document.querySelectorAll(".topic-chip").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        activeTopic = t;
        if (DATA) {
          renderStatesPanel();
          renderCountiesPanel();
        }
      });
      row.appendChild(b);
    });
  }

  /* ── Unit tabs ────────────────────────────────────────── */

  function bindUnitTabs() {
    document.querySelectorAll(".unit-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const unit = tab.dataset.unit;
        document.querySelectorAll(".unit-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".unit-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("panel-" + unit).classList.add("active");
        // Topic chooser only meaningful for state/county/topics views
        const topicRow = document.getElementById("topic-row");
        if (topicRow) {
          topicRow.style.display = (unit === "national") ? "none" : "flex";
        }
        if (DATA) {
          window.dispatchEvent(new Event("resize"));
        }
      });
    });
    // Initial state: hide topic chips on National (default tab)
    const topicRow = document.getElementById("topic-row");
    if (topicRow) topicRow.style.display = "none";
  }

  /* ── Coverage strip ───────────────────────────────────── */

  function renderCoverageStrip(meta) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    if (!meta) return;
    set("cv-total",    fmt(meta.total_schools));
    set("cv-crawled",  fmt(meta.crawled_schools));
    set("cv-private",  fmt(meta.private_crawled));
    set("cv-public",   fmt(meta.public_crawled));
    set("cv-states",   fmt(meta.n_states));
    set("cv-counties", fmt(meta.n_counties));
  }

  function fmt(n) {
    if (n == null) return "—";
    return Number(n).toLocaleString();
  }

  /* ── National: sector breakdown bars ──────────────────── */

  function renderSectorBreakdown() {
    const target = document.getElementById("nat-sector-bars");
    if (!target) return;
    target.innerHTML = SECTOR_BREAKDOWN.map((row) => {
      // Use the max value to scale the bars proportionally within each row
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

  /* ── States panel: map + table + bar ─────────────────── */

  function renderStatesPanel() {
    if (!DATA || !DATA.states) return;
    const t = activeTopic;
    const rows = DATA.states.filter((s) => s[t.key] != null);

    document.getElementById("state-map-title").textContent =
      t.label + " — state-level mean";

    // Choropleth
    const z = rows.map((r) => r[t.key]);
    Plotly.react("state-map", [{
      type: "choropleth",
      locationmode: "USA-states",
      locations: rows.map((r) => r.state),
      z: z,
      colorscale: t.scale,
      reversescale: false,
      colorbar: { title: { text: "Mean", font: { size: 11 } }, thickness: 12, len: 0.7 },
      text: rows.map((r) => `${r.state}<br>${r[t.key].toFixed(1)} · n=${r.crawled}`),
      hovertemplate: "%{text}<extra></extra>",
    }], {
      geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "rgba(0,0,0,0)" },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    }, PLOTLY_BASE);

    document.getElementById("state-map").on("plotly_click", (e) => {
      if (e && e.points && e.points[0]) {
        const st = e.points[0].location;
        openStateProfile(st);
      }
    });

    // Sorted table
    const sorted = rows.slice().sort((a, b) => b[t.key] - a[t.key]);
    const tbody = document.getElementById("state-tbody");
    tbody.innerHTML = sorted.map((r, i) => `
      <tr class="clickable" data-state="${r.state}">
        <td>${i + 1}</td>
        <td>${r.state}</td>
        <td class="num">${r[t.key].toFixed(1)}</td>
        <td class="num">${fmt(r.crawled)}</td>
      </tr>`).join("");
    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => openStateProfile(tr.dataset.state));
    });

    // Top 10 + bottom 10 bar chart
    const top10 = sorted.slice(0, 10);
    const bot10 = sorted.slice(-10).reverse();
    Plotly.react("state-bars", [
      {
        type: "bar", orientation: "h",
        x: top10.map((r) => r[t.key]).reverse(),
        y: top10.map((r) => r.state).reverse(),
        marker: { color: t.color },
        name: "Top 10",
        hovertemplate: "%{y}: %{x:.1f}<extra></extra>",
      },
      {
        type: "bar", orientation: "h",
        x: bot10.map((r) => r[t.key]).reverse(),
        y: bot10.map((r) => r.state).reverse(),
        marker: { color: "#94a3b8" },
        name: "Bottom 10",
        xaxis: "x2", yaxis: "y2",
        hovertemplate: "%{y}: %{x:.1f}<extra></extra>",
      },
    ], {
      grid: { rows: 1, columns: 2, pattern: "independent" },
      margin: { l: 36, r: 16, t: 28, b: 26 },
      showlegend: false,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
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
    document.getElementById("state-profile").classList.add("open");
    document.getElementById("state-profile-name").textContent =
      `${stateCode} — six-topic profile (n=${row.crawled})`;

    const rankByTopic = {};
    TOPICS.forEach((t) => {
      const sorted = DATA.states.slice().filter((s) => s[t.key] != null).sort((a, b) => b[t.key] - a[t.key]);
      const i = sorted.findIndex((s) => s.state === stateCode);
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
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { size: 11 },
      xaxis: { title: { text: "Mean keyword matches per page", font: { size: 11 } } },
    }, PLOTLY_BASE);

    document.getElementById("state-profile").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── Counties panel: choropleth ──────────────────────── */

  function renderCountiesPanel() {
    if (!DATA || !DATA.counties) return;
    const t = activeTopic;
    const rows = DATA.counties.filter((c) => c[t.key] != null);

    document.getElementById("county-map-title").textContent =
      t.label + " — county-level mean (top 500 by sample)";

    Plotly.react("county-map", [{
      type: "choropleth",
      locationmode: "geojson-id",
      geojson: "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json",
      locations: rows.map((r) => String(Math.round(r.fips)).padStart(5, "0")),
      z: rows.map((r) => r[t.key]),
      colorscale: t.scale,
      colorbar: { title: { text: "Mean", font: { size: 11 } }, thickness: 12, len: 0.7 },
      hovertemplate: "FIPS %{location}: %{z:.1f}<extra></extra>",
    }], {
      geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "rgba(0,0,0,0)" },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    }, PLOTLY_BASE);
  }

  /* ── Topics small-multiples grid ─────────────────────── */

  function renderTopicsGrid() {
    if (!DATA || !DATA.states) return;
    const grid = document.getElementById("topics-grid");
    grid.innerHTML = TOPICS.map((t, i) =>
      `<div class="topic-card">
        <div class="tc-title">${t.label}</div>
        <div class="tc-sub">State-mean across crawled private schools</div>
        <div class="tc-map" id="tc-map-${i}"></div>
      </div>`).join("");

    TOPICS.forEach((t, i) => {
      const rows = DATA.states.filter((s) => s[t.key] != null);
      Plotly.react("tc-map-" + i, [{
        type: "choropleth",
        locationmode: "USA-states",
        locations: rows.map((r) => r.state),
        z: rows.map((r) => r[t.key]),
        colorscale: t.scale,
        showscale: false,
        text: rows.map((r) => `${r.state}: ${r[t.key].toFixed(1)}`),
        hovertemplate: "%{text}<extra></extra>",
      }], {
        geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "rgba(0,0,0,0)" },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
      }, PLOTLY_BASE);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
