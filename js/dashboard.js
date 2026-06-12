/**
 * @module dashboard
 * @fileoverview Dashboard with Chart.js visualizations: doughnut breakdown,
 * bar comparison, line trend, and gauge comparison against country averages.
 * Charts are lazily rendered after DOM paint via requestAnimationFrame,
 * and deferred until the dashboard section is visible via IntersectionObserver.
 */

import { getProfile, getHistory } from './storage.js';
import { CATEGORIES, COUNTRY_AVERAGES, PARIS_TARGET, relatableUnits } from './data.js';
import { escapeHTML, prefersReducedMotion, formatNumber } from './utils.js';

/** @type {Object<string, Chart>} Active Chart.js instances for cleanup */
let charts = {};

/** @type {IntersectionObserver|null} Lazy rendering observer */
let _dashboardObserver = null;

/**
 * Shared Chart.js tooltip configuration.
 * Code Quality: DRY — extracted to avoid repetition across charts.
 * @type {Object}
 */
const SHARED_TOOLTIP_CONFIG = Object.freeze({
  backgroundColor: '#1e293b',
  titleColor: '#f1f5f9',
  bodyColor: '#94a3b8',
  borderColor: 'rgba(148,163,184,0.12)',
  borderWidth: 1,
  cornerRadius: 8,
  padding: 12,
});

/**
 * Returns shared animation config based on user motion preference.
 * @param {number} [duration=1200] - Animation duration in ms
 * @returns {Object} Chart.js animation config
 */
function getAnimationConfig(duration = 1200) {
  const reduceMotion = prefersReducedMotion();
  return {
    duration: reduceMotion ? 0 : duration,
    easing: 'easeOutQuart',
  };
}

/** Initializes the dashboard with current profile data. */
export function initDashboard() {
  renderDashboard();
  // Efficiency: set up IntersectionObserver for lazy chart rendering
  setupDashboardObserver();
}

/**
 * Observes the dashboard section for visibility. Charts are only
 * rendered when the section enters the viewport, saving CPU/GPU
 * on initial page load.
 */
function setupDashboardObserver() {
  if (_dashboardObserver) _dashboardObserver.disconnect();
  const section = document.getElementById('dashboard');
  if (!section) return;

  _dashboardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        renderDashboard();
        // Efficiency: stop observing once rendered
        _dashboardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });

  _dashboardObserver.observe(section);
}

/** Renders dashboard cards, charts, and comparisons from profile data. */
export function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  const profile = getProfile();

  if (!profile) {
    container.innerHTML = `
      <div class="dashboard__empty anim-fade-in-up visible" data-testid="dashboard-empty">
        <div class="dashboard__empty-icon" aria-hidden="true">📊</div>
        <h3 class="dashboard__empty-title">No Data Yet</h3>
        <p class="dashboard__empty-desc">Complete the carbon calculator to see your personalized dashboard with charts and insights.</p>
        <button class="btn btn--primary btn--lg" onclick="window.EcoTrack.navigateTo('calculator')" data-testid="dashboard-calc-btn">
          <i data-lucide="calculator" style="width:18px;height:18px" aria-hidden="true"></i> Calculate Now
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const totalKg = profile.total;
  const tonnes = (totalKg / 1000).toFixed(1);
  const rel = relatableUnits(totalKg);
  const history = getHistory();

  container.innerHTML = `
    <!-- Stat Cards -->
    <div class="dashboard__grid stagger-children" role="group" aria-label="Carbon footprint statistics">
      <div class="stat-card anim-fade-in-up visible" data-testid="stat-footprint">
        <div class="stat-card__icon stat-card__icon--green" aria-hidden="true"><i data-lucide="footprints" style="width:24px;height:24px"></i></div>
        <div class="stat-card__value text-gradient">${tonnes}t</div>
        <div class="stat-card__label">Annual CO₂ Footprint</div>
      </div>
      <div class="stat-card anim-fade-in-up visible" data-testid="stat-trees">
        <div class="stat-card__icon stat-card__icon--blue" aria-hidden="true"><i data-lucide="tree-pine" style="width:24px;height:24px"></i></div>
        <div class="stat-card__value" style="color:var(--clr-info-400)">${formatNumber(rel.trees)}</div>
        <div class="stat-card__label">Trees Needed to Offset</div>
      </div>
      <div class="stat-card anim-fade-in-up visible" data-testid="stat-flights">
        <div class="stat-card__icon stat-card__icon--purple" aria-hidden="true"><i data-lucide="plane" style="width:24px;height:24px"></i></div>
        <div class="stat-card__value" style="color:var(--clr-purple-400)">${formatNumber(rel.flights)}</div>
        <div class="stat-card__label">Equivalent Long Flights</div>
      </div>
      <div class="stat-card anim-fade-in-up visible" data-testid="stat-driving">
        <div class="stat-card__icon stat-card__icon--amber" aria-hidden="true"><i data-lucide="car" style="width:24px;height:24px"></i></div>
        <div class="stat-card__value" style="color:var(--clr-warning-400)">${formatNumber(rel.drivingKm)}</div>
        <div class="stat-card__label">Equivalent Driving (km)</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="dashboard__charts">
      <div class="dashboard__chart-card anim-fade-in-up visible" data-testid="chart-doughnut-container">
        <div class="dashboard__chart-title">
          <i data-lucide="pie-chart" style="width:18px;height:18px;color:var(--clr-primary-400)" aria-hidden="true"></i>
          Category Breakdown
        </div>
        <div class="dashboard__chart-wrapper">
          <canvas id="chart-doughnut" role="img" aria-label="Doughnut chart showing carbon footprint breakdown by category"></canvas>
        </div>
      </div>
      <div class="dashboard__chart-card anim-fade-in-up visible" data-testid="chart-bar-container">
        <div class="dashboard__chart-title">
          <i data-lucide="bar-chart-3" style="width:18px;height:18px;color:var(--clr-info-400)" aria-hidden="true"></i>
          Category Comparison
        </div>
        <div class="dashboard__chart-wrapper">
          <canvas id="chart-bar" role="img" aria-label="Bar chart comparing carbon emissions by category"></canvas>
        </div>
      </div>
    </div>

    <!-- Gauge -->
    <div class="dashboard__comparison-gauge anim-fade-in-up visible" data-testid="dashboard-gauge">
      <div class="dashboard__chart-title" style="justify-content:center;">
        <i data-lucide="gauge" style="width:18px;height:18px;color:var(--clr-warning-400)" aria-hidden="true"></i>
        How You Compare
      </div>
      <div id="comparison-gauge" style="margin-top:var(--sp-4);" role="figure" aria-label="Comparison of your carbon footprint against country averages"></div>
    </div>

    ${history.length > 1 ? `
    <div class="dashboard__chart-card anim-fade-in-up visible" style="margin-top:var(--sp-6);">
      <div class="dashboard__chart-title">
        <i data-lucide="trending-down" style="width:18px;height:18px;color:var(--clr-primary-400)"></i>
        Monthly Trend
      </div>
      <div class="dashboard__chart-wrapper">
        <canvas id="chart-line"></canvas>
      </div>
    </div>
    ` : ''}
  `;

  if (window.lucide) window.lucide.createIcons();

  // Render charts after DOM is ready
  requestAnimationFrame(() => {
    renderDoughnutChart(profile);
    renderBarChart(profile);
    renderGauge(totalKg);
    if (history.length > 1) renderLineChart(history);
  });
}

/**
 * Renders the doughnut chart showing emission category breakdown.
 * Efficiency: destroys previous instance to prevent memory leaks.
 */
function renderDoughnutChart(profile) {
  const canvas = document.getElementById('chart-doughnut');
  if (!canvas || !window.Chart) return;

  if (charts.doughnut) charts.doughnut.destroy();

  const reduceMotion = prefersReducedMotion();

  const labels = CATEGORIES.map(c => c.name);
  const data = CATEGORIES.map(c => Math.round((profile.categories[c.id] || 0) / 10) / 100); // tonnes
  const colors = CATEGORIES.map(c => c.color);

  charts.doughnut = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + '33'),
        borderColor: colors,
        borderWidth: 2,
        hoverBorderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            padding: 16,
            font: { family: 'Inter', size: 12 },
            usePointStyle: true,
            pointStyleWidth: 12,
          }
        },
        tooltip: {
          ...SHARED_TOOLTIP_CONFIG,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(2)} tonnes CO₂`
          }
        }
      },
      animation: {
        animateRotate: !reduceMotion,
        ...getAnimationConfig(1200),
      }
    }
  });
}

/**
 * Renders the bar chart comparing emissions per category.
 */
function renderBarChart(profile) {
  const canvas = document.getElementById('chart-bar');
  if (!canvas || !window.Chart) return;

  if (charts.bar) charts.bar.destroy();

  const labels = CATEGORIES.map(c => c.name);
  const data = CATEGORIES.map(c => Math.round(profile.categories[c.id] || 0));
  const colors = CATEGORIES.map(c => c.color);

  charts.bar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'kg CO₂/year',
        data,
        backgroundColor: colors.map(c => c + '44'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(148,163,184,0.08)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 },
            callback: v => v >= 1000 ? (v / 1000).toFixed(1) + 't' : v + 'kg'
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...SHARED_TOOLTIP_CONFIG,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y.toLocaleString()} kg CO₂/year`
          }
        }
      },
      animation: getAnimationConfig(1000),
    }
  });
}

function renderLineChart(history) {
  const canvas = document.getElementById('chart-line');
  if (!canvas || !window.Chart) return;

  if (charts.line) charts.line.destroy();

  const labels = history.map(h => h.month);
  const data = history.map(h => (h.total / 1000).toFixed(2));

  charts.line = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'tonnes CO₂/year',
        data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#0b1120',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(148,163,184,0.08)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 },
            callback: v => v + 't'
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { ...SHARED_TOOLTIP_CONFIG }
      },
      animation: getAnimationConfig(1200),
    }
  });
}

/**
 * Renders the comparison gauge showing user vs. country averages.
 * Uses inline bar visualizations for each benchmark.
 */
function renderGauge(totalKg) {
  const container = document.getElementById('comparison-gauge');
  if (!container) return;

  const userTonnes = totalKg / 1000;

  const benchmarks = [
    { label: 'Paris Target', value: PARIS_TARGET, color: '#10b981' },
    { label: 'India', value: COUNTRY_AVERAGES.india, color: '#6ee7b7' },
    { label: 'France', value: COUNTRY_AVERAGES.france, color: '#34d399' },
    { label: 'World Avg', value: COUNTRY_AVERAGES.world, color: '#f59e0b' },
    { label: 'EU', value: COUNTRY_AVERAGES.eu, color: '#fbbf24' },
    { label: 'China', value: COUNTRY_AVERAGES.china, color: '#f97316' },
    { label: 'Japan', value: COUNTRY_AVERAGES.japan, color: '#ef4444' },
    { label: 'USA', value: COUNTRY_AVERAGES.usa, color: '#dc2626' },
  ];

  const maxVal = Math.max(20, userTonnes * 1.2);

  let html = '<div style="display:flex;flex-direction:column;gap:var(--sp-3);max-width:500px;margin:0 auto;">';

  // User row
  const userPct = Math.min((userTonnes / maxVal) * 100, 100);
  html += `
    <div style="display:flex;align-items:center;gap:var(--sp-3);">
      <span style="min-width:90px;font-size:var(--fs-xs);color:var(--clr-primary-400);font-weight:600;">You</span>
      <div style="flex:1;position:relative;">
        <div style="height:10px;background:var(--clr-bg-tertiary);border-radius:var(--radius-full);overflow:hidden;">
          <div style="height:100%;width:${userPct}%;background:var(--grad-primary);border-radius:var(--radius-full);transition:width 1s ease;"></div>
        </div>
      </div>
      <span style="min-width:50px;font-size:var(--fs-sm);font-weight:700;color:var(--clr-primary-400);">${userTonnes.toFixed(1)}t</span>
    </div>
  `;

  // Benchmark rows
  benchmarks.forEach(b => {
    const pct = Math.min((b.value / maxVal) * 100, 100);
    html += `
      <div style="display:flex;align-items:center;gap:var(--sp-3);" data-testid="gauge-${b.label.toLowerCase().replace(/\s+/g, '-')}">
        <span style="min-width:90px;font-size:var(--fs-xs);color:var(--clr-text-muted);">${escapeHTML(b.label)}</span>
        <div style="flex:1;" role="progressbar" aria-valuenow="${b.value}" aria-valuemin="0" aria-valuemax="${maxVal.toFixed(0)}" aria-label="${escapeHTML(b.label)}: ${b.value} tonnes">
          <div style="height:6px;background:var(--clr-bg-tertiary);border-radius:var(--radius-full);overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${b.color};border-radius:var(--radius-full);opacity:0.6;"></div>
          </div>
        </div>
        <span style="min-width:50px;font-size:var(--fs-xs);color:var(--clr-text-muted);">${b.value}t</span>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}
