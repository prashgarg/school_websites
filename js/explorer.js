/* ── School Websites Project — explorer.js ─────────────────── */
/* Depends on Plotly.js (loaded from CDN in explorer.html)      */

(function () {
  "use strict";

  /* ── Config ───────────────────────────────────────────────── */
  const DATA_URL = "data/school_summary.json";

  const TOPICS = [
    { key: "religious",            label: "Religious Presence",    color: "#be185d", scale: "RdPu"    },
    { key: "character",            label: "Character / Values",    color: "#1d4ed8", scale: "Blues"   },
    { key: "parent_involvement",   label: "Family Partnership",    color: "#15803d", scale: "Greens"  },
    { key: "college_prep",         label: "College Prep / Rigor",  color: "#b45309", scale: "Oranges" },
    { key: "tuition_transparency", label: "Tuition Transparency",  color: "#7c3aed", scale: "Purples" },
    { key: "stem",                 label: "STEM Emphasis",         color: "#b91c1c", scale: "YlOrRd"  },
  ];

  // Map Plotly scale names → hex arrays for the bar chart
  const BAR_COLORS = {
    "RdPu":    "#be185d",
    "Blues":   "#1d4ed8",
    "Greens":  "#15803d",
    "Oranges": "#ea580c",
    "Purples": "#7c3aed",
    "YlOrRd":  "#b91c1c",
  };

  let appData = null;   // loaded JSON
  let activeTopic = TOPICS[0];

  /* ── Boot ─────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    buildTopicList();
    loadData();
  });

  /* ── Load data ────────────────────────────────────────────── */
  function loadData() {
    setLoading(true);
    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        appData = data;
        populateMeta(data.metadata);
        renderAll();
        setLoading(false);
      })
      .catch(function (err) {
        console.error("Failed to load data:", err);
        document.getElementById("map-container").innerHTML =
          '<p style="padding:2rem;color:var(--text-muted);text-align:center">⚠ Could not load data. ' +
          'Open this page via a local server (e.g. <code>python -m http.server</code>) ' +
          'or from the GitHub Pages URL.</p>';
        setLoading(false);
      });
  }

  function setLoading(on) {
    const el = document.getElementById("loading-indicator");
    if (el) el.style.display = on ? "block" : "none";
  }

  /* ── Populate metadata strip ─────────────────────────────── */
  function populateMeta(meta) {
    setText("meta-total",   (meta.total_schools || 0).toLocaleString());
    setText("meta-crawled", (meta.crawled_schools || 0).toLocaleString());
    setText("meta-private", (meta.private_crawled || 0).toLocaleString());
    setText("meta-public",  (meta.public_crawled || 0).toLocaleString());
    setText("meta-states",  (meta.n_states || 0).toLocaleString());
    setText("meta-counties",(meta.n_counties || 0).toLocaleString());
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Build sidebar topic list ────────────────────────────── */
  function buildTopicList() {
    const ul = document.getElementById("topic-list");
    if (!ul) return;
    TOPICS.forEach(function (t) {
      const li = document.createElement("li");
      li.innerHTML = '<span class="dot" style="background:' + t.color + '"></span>' + t.label;
      if (t.key === activeTopic.key) li.classList.add("active");
      li.addEventListener("click", function () {
        activeTopic = t;
        ul.querySelectorAll("li").forEach(function (el) { el.classList.remove("active"); });
        li.classList.add("active");
        if (appData) renderAll();
      });
      ul.appendChild(li);
    });
  }

  /* ── Master render ────────────────────────────────────────── */
  function renderAll() {
    updateTopicHeader();
    renderChoropleth();
    renderBarChart();
    renderTable();
  }

  function updateTopicHeader() {
    const el = document.getElementById("topic-header");
    if (el) {
      el.innerHTML = 'Mean score per state — <span style="color:' +
        activeTopic.color + '">' + activeTopic.label + '</span>';
    }
  }

  /* ── State choropleth ─────────────────────────────────────── */
  function renderChoropleth() {
    const states = appData.states;
    const key = activeTopic.key;
    const locs  = states.map(function (s) { return s.state; });
    const vals  = states.map(function (s) { return +(s[key] || 0); });
    const texts = states.map(function (s) {
      return s.state + ": " + (s[key] || 0).toFixed(1) + "<br>" +
             "Crawled: " + (s.crawled || 0).toLocaleString() + " / " + (s.total || 0).toLocaleString();
    });

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const paperBg = isDark ? "#1e293b" : "#ffffff";
    const geoLand  = isDark ? "#334155" : "#f1f5f9";
    const geoCoast = isDark ? "#475569" : "#cbd5e1";
    const geoBg    = isDark ? "#0f172a" : "#e2e8f0";

    const data = [{
      type: "choropleth",
      locationmode: "USA-states",
      locations: locs,
      z: vals,
      text: texts,
      hovertemplate: "<b>%{text}</b><extra></extra>",
      colorscale: activeTopic.scale,
      colorbar: {
        title: { text: "Score", font: { size: 11 } },
        thickness: 14,
        len: 0.75,
        x: 1.01,
      },
      marker: { line: { color: geoCoast, width: 0.5 } },
    }];

    const layout = {
      geo: {
        scope: "usa",
        projection: { type: "albers usa" },
        showlakes: false,
        showframe: false,
        showcoastlines: true,
        coastlinecolor: geoCoast,
        showland: true,
        landcolor: geoLand,
        bgcolor: geoBg,
        subunitcolor: geoCoast,
      },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: paperBg,
      plot_bgcolor: paperBg,
      font: { family: "Inter, sans-serif", size: 11, color: isDark ? "#f1f5f9" : "#0f172a" },
    };

    const config = {
      responsive: true,
      displayModeBar: false,
    };

    Plotly.react("map-container", data, layout, config);
  }

  /* ── State bar chart ──────────────────────────────────────── */
  function renderBarChart() {
    const states = appData.states.slice();
    const key = activeTopic.key;
    states.sort(function (a, b) { return (b[key] || 0) - (a[key] || 0); });
    const top20 = states.slice(0, 20).reverse();  // reverse so highest is at top

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const paperBg = isDark ? "#1e293b" : "#ffffff";
    const gridColor = isDark ? "#334155" : "#e2e8f0";
    const textColor = isDark ? "#f1f5f9" : "#0f172a";

    const data = [{
      type: "bar",
      orientation: "h",
      x: top20.map(function (s) { return +(s[key] || 0); }),
      y: top20.map(function (s) { return s.state; }),
      marker: { color: BAR_COLORS[activeTopic.scale] || activeTopic.color, opacity: 0.85 },
      hovertemplate: "<b>%{y}</b>: %{x:.1f}<extra></extra>",
    }];

    const layout = {
      margin: { l: 36, r: 10, t: 10, b: 36 },
      paper_bgcolor: paperBg,
      plot_bgcolor: paperBg,
      font: { family: "Inter, sans-serif", size: 10, color: textColor },
      xaxis: {
        title: "Mean score",
        gridcolor: gridColor,
        zeroline: false,
        tickfont: { size: 9 },
      },
      yaxis: {
        tickfont: { size: 10 },
        gridcolor: gridColor,
      },
      bargap: 0.35,
    };

    Plotly.react("bar-container", data, layout, { responsive: true, displayModeBar: false });
  }

  /* ── State table ──────────────────────────────────────────── */
  function renderTable() {
    const states = appData.states.slice();
    const key = activeTopic.key;
    states.sort(function (a, b) { return (b[key] || 0) - (a[key] || 0); });

    const maxVal = Math.max.apply(null, states.map(function (s) { return s[key] || 0; }));

    const tbody = document.getElementById("state-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    states.forEach(function (s, i) {
      const score = +(s[key] || 0);
      const pct   = maxVal > 0 ? (score / maxVal * 100).toFixed(1) : 0;
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td style="font-weight:600">' + (i + 1) + '</td>' +
        '<td style="font-weight:600">' + s.state + '</td>' +
        '<td>' +
          '<div class="score-bar">' +
            '<div class="bar-bg"><div class="bar-fill" style="width:' + pct + '%;background:' + activeTopic.color + '"></div></div>' +
            '<span class="score-val">' + score.toFixed(1) + '</span>' +
          '</div>' +
        '</td>' +
        '<td style="text-align:right">' + (s.crawled || 0).toLocaleString() + '</td>' +
        '<td style="text-align:right">' + (s.total || 0).toLocaleString() + '</td>';
      tbody.appendChild(tr);
    });
  }

  /* ── Re-render on theme change ───────────────────────────── */
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === "data-theme" && appData) {
        renderChoropleth();
        renderBarChart();
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true });

})();
