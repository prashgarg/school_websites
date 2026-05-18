/* ── School Websites Project — explorer.js ─────────────────── */
/* Depends on Plotly.js (loaded from CDN in explorer.html)      */

(function () {
  "use strict";

  /* ── Topic config ─────────────────────────────────────────── */
  const DATA_URL = "data/school_summary.json";

  const TOPICS = [
    { key: "religious",            label: "Religious Presence",    color: "#be185d", scale: "RdPu"    },
    { key: "character",            label: "Character / Values",    color: "#1d4ed8", scale: "Blues"   },
    { key: "parent_involvement",   label: "Family Partnership",    color: "#15803d", scale: "Greens"  },
    { key: "college_prep",         label: "College Prep / Rigor",  color: "#b45309", scale: "Oranges" },
    { key: "tuition_transparency", label: "Tuition Transparency",  color: "#7c3aed", scale: "Purples" },
    { key: "stem",                 label: "STEM Emphasis",         color: "#b91c1c", scale: "YlOrRd"  },
  ];

  const BAR_COLORS = {
    "RdPu": "#be185d", "Blues": "#1d4ed8", "Greens": "#15803d",
    "Oranges": "#ea580c", "Purples": "#7c3aed", "YlOrRd": "#b91c1c",
  };

  /* ── Research findings per topic ─────────────────────────── */
  const TOPIC_FINDINGS = {
    religious: {
      headline: "Religious identity retreats under competition",
      stat: "r = −0.083***",
      statLabel: "with local competitor count — strongest suppression effect",
      chips: [
        { label: "Enrollment",  val: "Not significant",   good: false },
        { label: "Competition", val: "r = −0.083***",     good: false },
        { label: "GOP county",  val: "r = +0.072***",     good: null  },
      ],
      insight: "Tripling the number of private-school competitors within 10 km is associated with a one-third standard-deviation decline in religious emphasis — the largest competitive-suppression effect among all topics. Religious schools serve bounded denominational markets; when forced to compete broadly, they moderate that signal. County Republican vote share is the strongest geographic predictor.",
      leaders: "AR · MS · TN · AL · IA",
      trailers: "WA · OR · ME · NH · VT",
    },
    character: {
      headline: "Character-focused schools win the LinkedIn economy",
      stat: "r = +0.239***",
      statLabel: "with LinkedIn presence — strongest platform signal",
      chips: [
        { label: "Enrollment",  val: "Positive, ns",      good: null  },
        { label: "Competition", val: "r = +0.058***",     good: true  },
        { label: "LinkedIn",    val: "r = +0.239***",     good: true  },
      ],
      insight: "Schools that signal character formation are markedly more likely to maintain a LinkedIn presence — consistent with a market of career-conscious, college-educated families. Character emphasis rises with local competition, suggesting it is a deliberate differentiation strategy rather than a niche signal.",
      leaders: "DC · CT · DE · NJ · MA",
      trailers: "MS · AR · WV · MT · SD",
    },
    parent_involvement: {
      headline: "Family partnership is the strongest predictor of public-school achievement",
      stat: "r = +0.056***",
      statLabel: "with school-level SEDA test scores (public schools)",
      chips: [
        { label: "Private enroll", val: "Not significant", good: false },
        { label: "SEDA achieve",   val: "r = +0.056***",   good: true  },
        { label: "Competition",    val: "r = +0.015 (min)", good: null  },
      ],
      insight: "Among public schools, family-partnership emphasis on the website predicts school-level test scores more strongly than any other topic — even after accounting for free-lunch share and state. The website signal captures both a cultural orientation toward parental engagement and real communication infrastructure. Private-school enrollment growth does not respond to this signal.",
      leaders: "UT · MN · MA · WI · NH",
      trailers: "MS · NM · LA · WV · HI",
    },
    college_prep: {
      headline: "Academic rigor: second only to price transparency as an enrollment driver",
      stat: "+2.8 pp / SD",
      statLabel: "annual enrollment growth (p < 0.001)",
      chips: [
        { label: "Enrollment",  val: "β = +0.028***",  good: true },
        { label: "Competition", val: "r = +0.043***",  good: true },
        { label: "GOP county",  val: "r = −0.068***",  good: null },
      ],
      insight: "Schools that signal academic rigor grow 2.8 percentage points faster per year — the second-largest enrollment effect in the data. The effect holds across binary and tercile representations, and is robust across grade spans. College-prep emphasis also rises with competition: schools facing more competitors differentiate on academics.",
      leaders: "DC · MA · CT · NJ · NY",
      trailers: "WV · MS · AR · WY · SD",
    },
    tuition_transparency: {
      headline: "Posting your price is the single strongest enrollment signal",
      stat: "+4.0 pp / SD",
      statLabel: "annual enrollment growth — largest effect across all topics",
      chips: [
        { label: "Enrollment",  val: "β = +0.040*** (#1)", good: true  },
        { label: "Closure",     val: "OR = +0.277*",       good: false },
        { label: "Page premium",val: "+117 pts / page",    good: null  },
      ],
      insight: "A one-standard-deviation increase in tuition-transparency scores is associated with 4 percentage points faster annual enrollment growth — the largest effect in the data. The effect concentrates in elementary schools (β = +0.041***). The flip side: transparent schools face higher closure risk, consistent with financially stressed schools posting prices to attract price-sensitive families.",
      leaders: "DC · HI · AZ · CO · CT",
      trailers: "AR · MS · WV · ID · SD",
    },
    stem: {
      headline: "STEM emphasis rises with competition and tracks achievement",
      stat: "r = +0.080***",
      statLabel: "with local competitor count — strongest positive competition effect",
      chips: [
        { label: "Enrollment",  val: "β = +0.021**",   good: true },
        { label: "Competition", val: "r = +0.080*** (#1)", good: true },
        { label: "GOP county",  val: "r = −0.074***",  good: null },
      ],
      insight: "STEM is the only topic that rises strongly with both competition and local achievement. Schools in denser markets signal STEM more — consistent with STEM programs drawing from a broad, secular market willing to commute for a specialty. County SEDA scores correlate positively (r = +0.036***); Republican vote share strongly negatively (r = −0.074***).",
      leaders: "DC · MA · CT · WA · NJ",
      trailers: "MS · AR · WV · ID · MT",
    },
  };

  /* ── App state ────────────────────────────────────────────── */
  let appData = null;
  let activeTopic = TOPICS[0];
  let activeState = null;
  let tableSearchVal = "";

  /* ── Boot ─────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    buildTopicList();
    wireSearch();
    wireDownload();
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
        var el = document.getElementById("map-container");
        if (el) el.innerHTML =
          '<div style="padding:3rem;text-align:center;color:var(--text-muted)">' +
          '<p style="font-size:1.25rem;margin-bottom:.5rem">⚠</p>' +
          '<p>Could not load data. Open via a local server:<br>' +
          '<code style="font-size:.85rem;background:var(--bg-secondary);padding:.2rem .5rem;border-radius:4px">python -m http.server</code><br>' +
          'or visit the live GitHub Pages URL.</p></div>';
        setLoading(false);
      });
  }

  function setLoading(on) {
    var el = document.getElementById("loading-indicator");
    if (el) el.style.display = on ? "flex" : "none";
  }

  function populateMeta(meta) {
    setText("meta-total",    (meta.total_schools   || 0).toLocaleString());
    setText("meta-crawled",  (meta.crawled_schools || 0).toLocaleString());
    setText("meta-private",  (meta.private_crawled || 0).toLocaleString());
    setText("meta-public",   (meta.public_crawled  || 0).toLocaleString());
    setText("meta-states",   (meta.n_states        || 0).toLocaleString());
    setText("meta-counties", (meta.n_counties      || 0).toLocaleString());
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Sidebar topic list ───────────────────────────────────── */
  function buildTopicList() {
    var ul = document.getElementById("topic-list");
    if (!ul) return;
    TOPICS.forEach(function (t) {
      var li = document.createElement("li");
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

  /* ── Findings panel ───────────────────────────────────────── */
  function renderFindings() {
    var el = document.getElementById("findings-panel");
    if (!el) return;
    var f = TOPIC_FINDINGS[activeTopic.key];
    if (!f) { el.style.display = "none"; return; }

    var chipsHtml = f.chips.map(function (c) {
      var cls = c.good === true ? "chip-good" : c.good === false ? "chip-bad" : "chip-neutral";
      return '<span class="finding-chip ' + cls + '">' + c.label + ': <strong>' + c.val + '</strong></span>';
    }).join("");

    el.innerHTML =
      '<div class="finding-headline" style="border-left:3px solid ' + activeTopic.color + ';padding-left:.75rem;margin-bottom:.75rem">' +
        '<div class="finding-stat" style="color:' + activeTopic.color + '">' + f.stat + '</div>' +
        '<div class="finding-stat-label">' + f.statLabel + '</div>' +
      '</div>' +
      '<p class="finding-header">' + f.headline + '</p>' +
      '<div class="finding-chips">' + chipsHtml + '</div>' +
      '<p class="finding-insight">' + f.insight + '</p>' +
      '<div class="finding-geo">' +
        '<span class="geo-label">Highest:</span> ' + f.leaders + '<br>' +
        '<span class="geo-label">Lowest:</span> ' + f.trailers +
      '</div>';
    el.style.display = "block";
  }

  /* ── Master render ────────────────────────────────────────── */
  function renderAll() {
    updateTopicHeader();
    renderFindings();
    renderChoropleth();
    renderBarChart();
    renderTable();
    if (activeState) renderStateProfile(activeState);
  }

  function updateTopicHeader() {
    var el = document.getElementById("topic-header");
    if (el) {
      el.innerHTML = 'Mean score per state — <span style="color:' +
        activeTopic.color + '">' + activeTopic.label + '</span>';
    }
  }

  /* ── Choropleth ───────────────────────────────────────────── */
  function renderChoropleth() {
    var states = appData.states;
    var key = activeTopic.key;
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var paperBg  = isDark ? "#1e293b" : "#ffffff";
    var geoLand  = isDark ? "#334155" : "#f1f5f9";
    var geoCoast = isDark ? "#475569" : "#cbd5e1";
    var geoBg    = isDark ? "#0f172a" : "#e2e8f0";

    var data = [{
      type: "choropleth",
      locationmode: "USA-states",
      locations: states.map(function (s) { return s.state; }),
      z: states.map(function (s) { return +(s[key] || 0); }),
      text: states.map(function (s) {
        var rank = rankOf(s.state, key);
        return "<b>" + s.state + "</b><br>" +
               activeTopic.label + ": " + (s[key] || 0).toFixed(1) + " (rank " + rank + ")<br>" +
               "Crawled: " + (s.crawled || 0).toLocaleString() + " private schools";
      }),
      hovertemplate: "%{text}<extra></extra>",
      colorscale: activeTopic.scale,
      colorbar: {
        title: { text: "Score", font: { size: 11 } },
        thickness: 14, len: 0.75, x: 1.01,
      },
      marker: { line: { color: geoCoast, width: 0.5 } },
    }];

    var layout = {
      geo: {
        scope: "usa", projection: { type: "albers usa" },
        showlakes: false, showframe: false,
        showcoastlines: true, coastlinecolor: geoCoast,
        showland: true, landcolor: geoLand,
        bgcolor: geoBg, subunitcolor: geoCoast,
      },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: paperBg, plot_bgcolor: paperBg,
      font: { family: "Inter, sans-serif", size: 11,
              color: isDark ? "#f1f5f9" : "#0f172a" },
    };

    Plotly.react("map-container", data, layout, { responsive: true, displayModeBar: false });
  }

  /* ── Bar chart (top 20, clickable) ──────────────────────── */
  function renderBarChart() {
    var states = appData.states.slice();
    var key = activeTopic.key;
    states.sort(function (a, b) { return (b[key] || 0) - (a[key] || 0); });
    var top20 = states.slice(0, 20).reverse();

    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var paperBg   = isDark ? "#1e293b" : "#ffffff";
    var gridColor = isDark ? "#334155" : "#e2e8f0";
    var textColor = isDark ? "#f1f5f9" : "#0f172a";
    var barColor  = BAR_COLORS[activeTopic.scale] || activeTopic.color;

    // Highlight active state
    var colors = top20.map(function (s) {
      return s.state === activeState ? activeTopic.color : barColor;
    });
    var opacities = top20.map(function (s) {
      return s.state === activeState ? 1.0 : 0.82;
    });

    var data = [{
      type: "bar", orientation: "h",
      x: top20.map(function (s) { return +(s[key] || 0); }),
      y: top20.map(function (s) { return s.state; }),
      marker: { color: colors, opacity: opacities },
      hovertemplate: "<b>%{y}</b>: %{x:.1f}<extra></extra>",
    }];

    var layout = {
      margin: { l: 36, r: 10, t: 10, b: 36 },
      paper_bgcolor: paperBg, plot_bgcolor: paperBg,
      font: { family: "Inter, sans-serif", size: 10, color: textColor },
      xaxis: { title: "Mean score", gridcolor: gridColor, zeroline: false, tickfont: { size: 9 } },
      yaxis: { tickfont: { size: 10 }, gridcolor: gridColor },
      bargap: 0.35,
    };

    var el = document.getElementById("bar-container");
    Plotly.react("bar-container", data, layout, { responsive: true, displayModeBar: false });

    // Click handler
    el.removeAllListeners && el.removeAllListeners("plotly_click");
    el.on("plotly_click", function (eventData) {
      if (!eventData.points || !eventData.points.length) return;
      var stateName = eventData.points[0].label || eventData.points[0].y;
      activeState = (activeState === stateName) ? null : stateName;
      renderBarChart();
      if (activeState) renderStateProfile(activeState);
      else hideStateProfile();
    });
  }

  /* ── State profile ────────────────────────────────────────── */
  function renderStateProfile(stateName) {
    var panel = document.getElementById("state-profile-panel");
    if (!panel) return;

    var stateData = null;
    for (var i = 0; i < appData.states.length; i++) {
      if (appData.states[i].state === stateName) { stateData = appData.states[i]; break; }
    }
    if (!stateData) return;

    // Build all-topics chart data, sorted by value
    var topicVals = TOPICS.map(function (t) {
      return { t: t, val: +(stateData[t.key] || 0), rank: rankOf(stateName, t.key) };
    });

    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var paperBg   = isDark ? "#1e293b" : "#ffffff";
    var gridColor = isDark ? "#334155" : "#e2e8f0";
    var textColor = isDark ? "#f1f5f9" : "#0f172a";

    var data = [{
      type: "bar",
      orientation: "h",
      x: topicVals.map(function (d) { return d.val; }),
      y: topicVals.map(function (d) { return d.t.label; }),
      marker: { color: topicVals.map(function (d) { return d.t.color; }), opacity: 0.9 },
      text: topicVals.map(function (d) {
        return "Score: " + d.val.toFixed(1) + " | Rank #" + d.rank;
      }),
      hovertemplate: "<b>%{y}</b><br>%{text}<extra></extra>",
    }];

    var annotations = topicVals.map(function (d, idx) {
      return {
        x: 0, y: idx, text: "#" + d.rank,
        xanchor: "left", showarrow: false,
        font: { size: 9, color: d.t.color },
        xshift: 4,
      };
    });

    var layout = {
      margin: { l: 130, r: 50, t: 10, b: 30 },
      paper_bgcolor: paperBg, plot_bgcolor: paperBg,
      font: { family: "Inter, sans-serif", size: 10, color: textColor },
      xaxis: { title: "Mean score", gridcolor: gridColor, zeroline: false },
      yaxis: { tickfont: { size: 10 }, autorange: "reversed" },
      bargap: 0.4,
      annotations: annotations,
    };

    // Header
    var headerEl = document.getElementById("profile-state-name");
    if (headerEl) {
      headerEl.innerHTML = stateName +
        '<span style="font-size:.85rem;font-weight:400;color:var(--text-muted);margin-left:.75rem">' +
        (stateData.crawled || 0).toLocaleString() + ' schools crawled of ' +
        (stateData.total || 0).toLocaleString() + ' total</span>';
    }

    var chartEl = document.getElementById("profile-chart");
    if (chartEl) {
      Plotly.react("profile-chart", data, layout, { responsive: true, displayModeBar: false });
    }

    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideStateProfile() {
    var panel = document.getElementById("state-profile-panel");
    if (panel) panel.style.display = "none";
    activeState = null;
  }

  /* ── Rank helper ──────────────────────────────────────────── */
  function rankOf(stateName, key) {
    var vals = appData.states.slice().sort(function (a, b) {
      return (b[key] || 0) - (a[key] || 0);
    });
    for (var i = 0; i < vals.length; i++) {
      if (vals[i].state === stateName) return i + 1;
    }
    return "—";
  }

  /* ── Table with search ────────────────────────────────────── */
  function wireSearch() {
    var input = document.getElementById("table-search");
    if (!input) return;
    input.addEventListener("input", function () {
      tableSearchVal = input.value.trim().toUpperCase();
      if (appData) renderTable();
    });
  }

  function renderTable() {
    var states = appData.states.slice();
    var key = activeTopic.key;
    states.sort(function (a, b) { return (b[key] || 0) - (a[key] || 0); });

    // Add rank before filtering
    states.forEach(function (s, i) { s._rank = i + 1; });

    // Filter
    if (tableSearchVal) {
      states = states.filter(function (s) {
        return s.state.toUpperCase().indexOf(tableSearchVal) >= 0;
      });
    }

    var maxVal = 0;
    appData.states.forEach(function (s) { if ((s[key] || 0) > maxVal) maxVal = s[key] || 0; });

    var tbody = document.getElementById("state-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!states.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem">No states match</td></tr>';
      return;
    }

    states.forEach(function (s) {
      var score = +(s[key] || 0);
      var pct   = maxVal > 0 ? (score / maxVal * 100).toFixed(1) : 0;
      var isActive = s.state === activeState;
      var tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      if (isActive) tr.style.background = "var(--bg-hover)";
      tr.innerHTML =
        '<td style="font-weight:600;color:var(--text-muted)">' + s._rank + '</td>' +
        '<td style="font-weight:700;color:' + (isActive ? activeTopic.color : "inherit") + '">' + s.state + '</td>' +
        '<td>' +
          '<div class="score-bar">' +
            '<div class="bar-bg"><div class="bar-fill" style="width:' + pct + '%;background:' +
            activeTopic.color + '"></div></div>' +
            '<span class="score-val">' + score.toFixed(1) + '</span>' +
          '</div>' +
        '</td>' +
        '<td style="text-align:right;color:var(--text-muted)">' + (s.crawled || 0).toLocaleString() + '</td>' +
        '<td style="text-align:right;color:var(--text-muted)">' + (s.total || 0).toLocaleString() + '</td>';

      tr.addEventListener("click", function () {
        activeState = (activeState === s.state) ? null : s.state;
        renderBarChart();
        renderTable();
        if (activeState) renderStateProfile(activeState);
        else hideStateProfile();
      });
      tbody.appendChild(tr);
    });
  }

  /* ── Download CSV ─────────────────────────────────────────── */
  function wireDownload() {
    var btn = document.getElementById("download-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!appData) return;
      var rows = ["state,crawled,total,religious,character,parent_involvement,college_prep,tuition_transparency,stem"];
      appData.states.forEach(function (s) {
        rows.push([
          s.state, s.crawled || 0, s.total || 0,
          (s.religious || 0).toFixed(2),
          (s.character || 0).toFixed(2),
          (s.parent_involvement || 0).toFixed(2),
          (s.college_prep || 0).toFixed(2),
          (s.tuition_transparency || 0).toFixed(2),
          (s.stem || 0).toFixed(2),
        ].join(","));
      });
      var blob = new Blob([rows.join("\n")], { type: "text/csv" });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement("a");
      a.href   = url;
      a.download = "school_websites_state_scores.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  /* ── Re-render on theme change ───────────────────────────── */
  var themeObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === "data-theme" && appData) {
        renderChoropleth();
        renderBarChart();
        if (activeState) renderStateProfile(activeState);
      }
    });
  });
  themeObserver.observe(document.documentElement, { attributes: true });

})();
