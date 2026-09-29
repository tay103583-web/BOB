// ============================================================
//  Dashboard Penjualan 2024 — dashboard.js
//  Stack: Vanilla JS + Chart.js + Tailwind CSS
//  Data source: data/sales.json
// ============================================================

// ── Helpers ─────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtShort = (n) => {
  if (n >= 1_000_000_000) return "Rp " + (n / 1_000_000_000).toFixed(1) + "M";
  if (n >= 1_000_000)     return "Rp " + (n / 1_000_000).toFixed(1) + " Jt";
  return fmt(n);
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const CATEGORY_BADGE = {
  Electronics: "badge badge-electronics",
  Accessories:  "badge badge-accessories",
  Furniture:    "badge badge-furniture",
};

// ── Chart.js instances (kept for update/destroy) ─────────────
let charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ── Main entry point ─────────────────────────────────────────
async function init() {
  // Set last updated timestamp
  document.getElementById("last-updated").textContent =
    new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  // Fetch JSON data
  const res  = await fetch("data/sales.json");
  const json = await res.json();
  const allData = json.transactions;

  // Wire up filters
  const filterIds = ["filter-month", "filter-category", "filter-region", "filter-salesperson"];
  filterIds.forEach((id) => {
    document.getElementById(id).addEventListener("change", () => render(allData));
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    filterIds.forEach((id) => (document.getElementById(id).value = "all"));
    render(allData);
  });

  // Initial render
  render(allData);
}

// ── Filter logic ─────────────────────────────────────────────
function getFiltered(data) {
  const month      = document.getElementById("filter-month").value;
  const category   = document.getElementById("filter-category").value;
  const region     = document.getElementById("filter-region").value;
  const salesperson = document.getElementById("filter-salesperson").value;

  return data.filter((t) => {
    const tMonth = String(new Date(t.date).getMonth() + 1);
    if (month      !== "all" && tMonth       !== month)       return false;
    if (category   !== "all" && t.category   !== category)    return false;
    if (region     !== "all" && t.region     !== region)      return false;
    if (salesperson !== "all" && t.salesperson !== salesperson) return false;
    return true;
  });
}

// ── Master render ─────────────────────────────────────────────
function render(allData) {
  const data = getFiltered(allData);
  updateKPIs(data);
  renderMonthlyChart(data);
  renderCategoryChart(data);
  renderRegionChart(data);
  renderSalespersonChart(data);
  renderTopProducts(data);
  renderTransactions(data);
}

// ── KPI Cards ─────────────────────────────────────────────────
function updateKPIs(data) {
  const totalRevenue      = data.reduce((s, t) => s + t.revenue, 0);
  const totalCost         = data.reduce((s, t) => s + t.cost, 0);
  const totalProfit       = totalRevenue - totalCost;
  const totalUnits        = data.reduce((s, t) => s + t.quantity, 0);
  const totalTransactions = data.length;
  const margin            = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgOrder          = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  document.getElementById("kpi-revenue").textContent       = fmtShort(totalRevenue);
  document.getElementById("kpi-revenue-sub").textContent   = `${totalTransactions} transaksi`;
  document.getElementById("kpi-profit").textContent        = fmtShort(totalProfit);
  document.getElementById("kpi-margin").textContent        = `Margin ${margin.toFixed(1)}%`;
  document.getElementById("kpi-transactions").textContent  = totalTransactions.toLocaleString("id-ID");
  document.getElementById("kpi-avg-order").textContent     = `Avg ${fmtShort(avgOrder)}`;
  document.getElementById("kpi-units").textContent         = totalUnits.toLocaleString("id-ID") + " unit";
  document.getElementById("kpi-avg-unit").textContent      =
    `Avg ${(totalTransactions > 0 ? totalUnits / totalTransactions : 0).toFixed(1)} unit/trx`;
}

// ── Chart: Monthly Revenue ────────────────────────────────────
function renderMonthlyChart(data) {
  const monthly = Array(12).fill(0);
  const monthlyProfit = Array(12).fill(0);
  data.forEach((t) => {
    const m = new Date(t.date).getMonth();
    monthly[m]       += t.revenue;
    monthlyProfit[m] += (t.revenue - t.cost);
  });

  destroyChart("monthly");
  const ctx = document.getElementById("chart-monthly-revenue").getContext("2d");
  charts["monthly"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: MONTH_NAMES,
      datasets: [
        {
          label: "Revenue",
          data: monthly,
          backgroundColor: "rgba(59,130,246,0.75)",
          borderRadius: 5,
          order: 2,
        },
        {
          label: "Profit",
          data: monthlyProfit,
          type: "line",
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.15)",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 3,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top", labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${fmtShort(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => fmtShort(v),
            font: { size: 10 },
          },
          grid: { color: "#f1f5f9" },
        },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

// ── Chart: Revenue per Category (Pie) ─────────────────────────
function renderCategoryChart(data) {
  const categories = {};
  data.forEach((t) => {
    categories[t.category] = (categories[t.category] || 0) + t.revenue;
  });

  destroyChart("category");
  const ctx = document.getElementById("chart-category").getContext("2d");
  charts["category"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: ["#3b82f6", "#f59e0b", "#10b981"],
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${fmtShort(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

// ── Chart: Revenue per Region (Horizontal Bar) ────────────────
function renderRegionChart(data) {
  const regions = {};
  data.forEach((t) => {
    regions[t.region] = (regions[t.region] || 0) + t.revenue;
  });

  const sorted = Object.entries(regions).sort((a, b) => b[1] - a[1]);

  destroyChart("region");
  const ctx = document.getElementById("chart-region").getContext("2d");
  charts["region"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((e) => e[0]),
      datasets: [{
        label: "Revenue",
        data: sorted.map((e) => e[1]),
        backgroundColor: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"],
        borderRadius: 5,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Revenue: ${fmtShort(ctx.parsed.x)}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: (v) => fmtShort(v), font: { size: 10 } },
          grid: { color: "#f1f5f9" },
        },
        y: { ticks: { font: { size: 12 } }, grid: { display: false } },
      },
    },
  });
}

// ── Chart: Salesperson Performance (Bar) ─────────────────────
function renderSalespersonChart(data) {
  const persons = {};
  data.forEach((t) => {
    if (!persons[t.salesperson]) persons[t.salesperson] = { revenue: 0, profit: 0 };
    persons[t.salesperson].revenue += t.revenue;
    persons[t.salesperson].profit  += (t.revenue - t.cost);
  });

  const sorted = Object.entries(persons).sort((a, b) => b[1].revenue - a[1].revenue);

  destroyChart("salesperson");
  const ctx = document.getElementById("chart-salesperson").getContext("2d");
  charts["salesperson"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((e) => e[0]),
      datasets: [
        {
          label: "Revenue",
          data: sorted.map((e) => e[1].revenue),
          backgroundColor: "rgba(59,130,246,0.8)",
          borderRadius: 4,
        },
        {
          label: "Profit",
          data: sorted.map((e) => e[1].profit),
          backgroundColor: "rgba(16,185,129,0.8)",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top", labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${fmtShort(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => fmtShort(v), font: { size: 10 } },
          grid: { color: "#f1f5f9" },
        },
        x: { ticks: { font: { size: 12 } }, grid: { display: false } },
      },
    },
  });
}

// ── Top Products Table ────────────────────────────────────────
function renderTopProducts(data) {
  const products = {};
  data.forEach((t) => {
    if (!products[t.product]) {
      products[t.product] = { category: t.category, revenue: 0, cost: 0 };
    }
    products[t.product].revenue += t.revenue;
    products[t.product].cost    += t.cost;
  });

  const sorted = Object.entries(products)
    .map(([name, v]) => ({ name, ...v, profit: v.revenue - v.cost }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const tbody = document.getElementById("top-products-body");
  tbody.innerHTML = sorted.map((p, i) => {
    const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0;
    const badgeClass = CATEGORY_BADGE[p.category] || "badge";
    return `
      <tr>
        <td class="py-3 pr-4 text-gray-400 font-bold">${i + 1}</td>
        <td class="py-3 pr-4 font-medium text-gray-800">${p.name}</td>
        <td class="py-3 pr-4"><span class="${badgeClass}">${p.category}</span></td>
        <td class="py-3 pr-4 text-right font-semibold text-gray-700">${fmtShort(p.revenue)}</td>
        <td class="py-3 pr-4 text-right text-green-600 font-semibold">${fmtShort(p.profit)}</td>
        <td class="py-3 text-right">
          <span class="text-xs font-bold ${parseFloat(margin) >= 30 ? 'text-green-600' : 'text-orange-500'}">${margin}%</span>
        </td>
      </tr>`;
  }).join("");
}

// ── Recent Transactions Table ─────────────────────────────────
function renderTransactions(data) {
  const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
  document.getElementById("tx-count").textContent =
    `Menampilkan ${sorted.length} dari ${data.length} transaksi`;

  const tbody = document.getElementById("transactions-body");
  tbody.innerHTML = sorted.map((t) => {
    const date = new Date(t.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    return `
      <tr>
        <td class="py-2.5 pr-4 text-xs font-mono text-gray-400">${t.id}</td>
        <td class="py-2.5 pr-4 text-gray-600">${date}</td>
        <td class="py-2.5 pr-4 font-medium text-gray-800">${t.product}</td>
        <td class="py-2.5 pr-4 text-gray-500">${t.region}</td>
        <td class="py-2.5 pr-4 text-gray-600">${t.salesperson}</td>
        <td class="py-2.5 pr-4 text-right text-gray-600">${t.quantity}</td>
        <td class="py-2.5 text-right font-semibold text-blue-600">${fmtShort(t.revenue)}</td>
      </tr>`;
  }).join("");
}

// ── Bootstrap ─────────────────────────────────────────────────
init();
