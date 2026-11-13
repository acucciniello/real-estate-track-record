const NUMERIC_SORT = new Set([
  "purchasePrice",
  "rehab",
  "salePrice",
  "purchaseDate",
  "saleDate",
]);

const COLUMNS = [
  { key: "address", label: "Property" },
  { key: "strategy", label: "Strategy" },
  { key: "status", label: "Status" },
  { key: "type", label: "Property type" },
  { key: "entity", label: "Entity" },
  { key: "purchaseDate", label: "Purchased" },
  { key: "purchasePrice", label: "Purchase price", align: "end" },
  { key: "rehab", label: "Rehab", align: "end" },
  { key: "saleDate", label: "Sold" },
  { key: "salePrice", label: "Sale price", align: "end" },
];

const state = {
  data: null,
  view: "flips",
  query: "",
  strategy: "All",
  status: "All",
  typeFilter: "All",
  market: "All",
  sortKey: "saleDate",
  sortDir: "desc",
};

function money(n) {
  if (n == null) return "—";
  const frac = Number.isInteger(n) ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(n);
}

function dateFmt(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function line(p) {
  return `${p.address}, ${p.city}, ${p.state}${p.zip ? ` ${p.zip}` : ""}`;
}

function statusTone(status) {
  if (status === "Closed") return "accent";
  if (
    status === "Under contract to purchase" ||
    status === "Purchased, rehab not started" ||
    status === "Rehab finished, awaiting sale" ||
    status === "Rehab finished, awaiting refinance"
  ) {
    return "warning";
  }
  return "neutral";
}

function flipRows(properties) {
  return properties.filter((p) => p.id === "hanger" || !p.rentalSheet);
}

function rentalRows(properties) {
  return properties.filter((p) => p.rentalSheet);
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function fillSelect(select, options, value) {
  const current = options.some((o) => o.value === value) ? value : "All";
  select.innerHTML = options
    .map(
      (o) =>
        `<option value="${escapeAttr(o.value)}"${o.value === current ? " selected" : ""}>${escapeHtml(o.label)}</option>`
    )
    .join("");
  if (current !== value) {
    if (select.id === "filter-status") state.status = current;
    if (select.id === "filter-type") state.typeFilter = current;
    if (select.id === "filter-market") state.market = current;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function viewBase() {
  const properties = state.data.properties;
  return state.view === "rentals" ? rentalRows(properties) : flipRows(properties);
}

function filteredRows() {
  const q = state.query.trim().toLowerCase();
  let list = viewBase();
  if (q) {
    list = list.filter((p) =>
      `${line(p)} ${p.entity} ${p.strategy} ${p.type} ${p.status}`
        .toLowerCase()
        .includes(q)
    );
  }
  if (state.strategy !== "All") list = list.filter((p) => p.strategy === state.strategy);
  if (state.status !== "All") list = list.filter((p) => p.status === state.status);
  if (state.typeFilter !== "All") list = list.filter((p) => p.type === state.typeFilter);
  if (state.market !== "All") list = list.filter((p) => p.state === state.market);

  const dir = state.sortDir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = a[state.sortKey];
    const bv = b[state.sortKey];
    if (av == null || av === "") {
      if (bv == null || bv === "") return 0;
      return 1;
    }
    if (bv == null || bv === "") return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

function setSort(key) {
  if (key === state.sortKey) {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  } else {
    state.sortKey = key;
    state.sortDir = NUMERIC_SORT.has(key) ? "desc" : "asc";
  }
  document.getElementById("sort-key").value = state.sortKey;
  updateDirButtons();
  renderTableAndCaption();
}

function updateDirButtons() {
  document.querySelectorAll(".seg").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.dir === state.sortDir);
  });
}

function renderMeta() {
  const { title, owner, summary, entities, role, asOf } = state.data;
  document.title = title;
  document.getElementById("site-title").textContent = owner || "Antonio Cucciniello";
  document.getElementById("site-summary").textContent = summary;
  document.getElementById("site-meta").innerHTML = `
    <div><dt>Entities</dt><dd>${escapeHtml(entities)}</dd></div>
    <div><dt>Role</dt><dd>${escapeHtml(role)}</dd></div>
    <div><dt>As of</dt><dd>${escapeHtml(asOf)}</dd></div>
  `;
  document.getElementById("footer-asof").textContent = `As of ${asOf}. Blank fields were not estimated.`;
}

function renderTabsAndMetrics() {
  const properties = state.data.properties;
  const flips = flipRows(properties);
  const rentals = rentalRows(properties);
  document.getElementById("count-flips").textContent = String(flips.length);
  document.getElementById("count-rentals").textContent = String(rentals.length);

  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.view === state.view;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.getElementById("panel").setAttribute(
    "aria-labelledby",
    state.view === "rentals" ? "tab-rentals" : "tab-flips"
  );

  const completedOwn = flips.filter(
    (p) => p.countsAsCompleted && p.status !== "Under contract to purchase"
  );
  const saleVolumeIds = new Set(state.data.saleVolumeIds || []);
  const confirmedSaleVolume = flips
    .filter((p) => saleVolumeIds.has(p.id))
    .reduce((sum, p) => sum + (p.salePrice ?? 0), 0);
  const markets = uniqueSorted(flips.map((p) => p.state)).join(", ");
  const rentalMarkets = uniqueSorted(rentals.map((p) => p.state)).join(", ");
  const heldRentals = rentals.filter((p) => !p.saleDate);

  const metrics =
    state.view === "flips"
      ? [
          {
            value: String(flips.length),
            label: "Properties listed",
            detail: "Including pending and listed deals",
          },
          {
            value: String(completedOwn.length),
            label: "Completed exits",
            detail:
              "Sold or other completed exits; Salisbury and under-contract purchases are excluded",
          },
          {
            value: money(confirmedSaleVolume),
            label: "Sale volume",
            detail: "Six completed flip sales",
          },
          {
            value: markets,
            label: "Markets",
            detail: "From the properties on this view",
          },
        ]
      : [
          {
            value: String(rentals.length),
            label: "Rental properties",
            detail: "Held rentals plus the sold 1601 Hanger St exit",
          },
          {
            value: String(heldRentals.length),
            label: "Still held",
            detail: "Unsold rentals currently owned",
          },
          {
            value: "1",
            label: "Sold rental exits",
            detail: "1601 Hanger St, Little Rock, AR",
          },
          {
            value: rentalMarkets,
            label: "Rental markets",
            detail: "From the rental rows on this view",
          },
        ];

  document.getElementById("metrics").innerHTML = metrics
    .map(
      (m) => `
        <article class="metric">
          <div class="metric-value">${escapeHtml(m.value)}</div>
          <p class="metric-label">${escapeHtml(m.label)}</p>
          <p class="metric-detail">${escapeHtml(m.detail)}</p>
        </article>`
    )
    .join("");
}

function renderFilterOptions() {
  const base = viewBase();
  const statuses = uniqueSorted(base.map((p) => p.status));
  const types = uniqueSorted(base.map((p) => p.type));
  const markets = uniqueSorted(base.map((p) => p.state));

  fillSelect(
    document.getElementById("filter-status"),
    [{ value: "All", label: "All statuses" }, ...statuses.map((s) => ({ value: s, label: s }))],
    state.status
  );
  fillSelect(
    document.getElementById("filter-type"),
    [{ value: "All", label: "All types" }, ...types.map((s) => ({ value: s, label: s }))],
    state.typeFilter
  );
  fillSelect(
    document.getElementById("filter-market"),
    [{ value: "All", label: "All markets" }, ...markets.map((s) => ({ value: s, label: s }))],
    state.market
  );
  document.getElementById("filter-strategy").value = state.strategy;
  document.getElementById("sort-key").value = state.sortKey;
  updateDirButtons();
}

function renderTableAndCaption() {
  const rows = filteredRows();
  const noun = rows.length === 1 ? "property" : "properties";
  document.getElementById("section-heading").textContent =
    state.view === "flips" ? "Property table" : "Rental properties";
  document.getElementById("section-caption").textContent =
    `${rows.length} ${noun} shown. Use the dropdowns to filter or sort, or click a column header to sort.`;

  const header = COLUMNS.map((col) => {
    const active = state.sortKey === col.key;
    const mark = active ? (state.sortDir === "asc" ? " ↑" : " ↓") : "";
    const cls = [col.align === "end" ? "num" : "", active ? "is-active" : ""]
      .filter(Boolean)
      .join(" ");
    const aria = active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none";
    return `<th class="${cls}" data-key="${col.key}" scope="col" tabindex="0" aria-sort="${aria}">${escapeHtml(col.label)}${mark}</th>`;
  }).join("");

  const body = rows
    .map((p) => {
      const tone = statusTone(p.status);
      const cells = [
        escapeHtml(line(p)),
        escapeHtml(p.strategy),
        `<span class="status status-${tone}">${escapeHtml(p.status)}</span>`,
        escapeHtml(p.type || "—"),
        escapeHtml(p.entity || "—"),
        escapeHtml(dateFmt(p.purchaseDate)),
        escapeHtml(money(p.purchasePrice)),
        escapeHtml(money(p.rehab)),
        escapeHtml(dateFmt(p.saleDate)),
        escapeHtml(money(p.salePrice)),
      ];
      return `<tr>${cells
        .map((cell, j) => {
          const num = COLUMNS[j].align === "end" ? " class=\"num\"" : "";
          return `<td${num}>${cell}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");

  const empty =
    rows.length === 0
      ? `<p class="empty">No properties match the current filters.</p>`
      : "";

  document.getElementById("table-wrap").innerHTML = empty
    ? empty
    : `<table>
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>`;

  document.querySelectorAll("th[data-key]").forEach((th) => {
    const sort = () => setSort(th.dataset.key);
    th.addEventListener("click", sort);
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        sort();
      }
    });
  });
}

function render() {
  renderTabsAndMetrics();
  renderFilterOptions();
  renderTableAndCaption();
}

function switchView(view) {
  if (state.view === view) return;
  state.view = view;
  state.strategy = "All";
  state.status = "All";
  state.typeFilter = "All";
  state.market = "All";
  state.query = "";
  document.getElementById("filter-query").value = "";
  state.sortKey = view === "rentals" ? "purchaseDate" : "saleDate";
  state.sortDir = "desc";
  render();
}

function bindControls() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });
  document.getElementById("filter-query").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderTableAndCaption();
  });
  document.getElementById("filter-status").addEventListener("change", (e) => {
    state.status = e.target.value;
    renderTableAndCaption();
  });
  document.getElementById("filter-strategy").addEventListener("change", (e) => {
    state.strategy = e.target.value;
    renderTableAndCaption();
  });
  document.getElementById("filter-type").addEventListener("change", (e) => {
    state.typeFilter = e.target.value;
    renderTableAndCaption();
  });
  document.getElementById("filter-market").addEventListener("change", (e) => {
    state.market = e.target.value;
    renderTableAndCaption();
  });
  document.getElementById("sort-key").addEventListener("change", (e) => {
    state.sortKey = e.target.value;
    renderTableAndCaption();
  });
  document.querySelectorAll(".seg").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.sortDir = btn.dataset.dir;
      updateDirButtons();
      renderTableAndCaption();
    });
  });

  const back = document.getElementById("back-to-top");
  const onScroll = () => {
    back.hidden = window.scrollY < 400;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  back.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  onScroll();
}

async function init() {
  const wrap = document.getElementById("table-wrap");
  try {
    const res = await fetch("data/properties.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load data (${res.status})`);
    state.data = await res.json();
    if (!state.data || !Array.isArray(state.data.properties)) {
      throw new Error("properties.json is missing a properties array");
    }
    renderMeta();
    bindControls();
    render();
  } catch (err) {
    wrap.innerHTML = `<p class="error">The track record could not be loaded. ${escapeHtml(err.message)}</p>`;
  }
}

init();
