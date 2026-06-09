/**
 * @fileoverview Multi-step carbon footprint calculator with real-time
 * CO₂ estimation. Supports 5 lifestyle categories and compares results
 * to global averages.
 */

import { CALCULATOR_STEPS, EMISSION_FACTORS, COUNTRY_AVERAGES, CATEGORIES } from './data.js';
import { saveProfile } from './storage.js';
import { escapeHTML, safeNumber, safeEnum, announce, formatNumber } from './utils.js';

let currentStep = 0;
let inputs = {};

/** Initializes the calculator wizard, renders steps, and sets defaults. */
export function initCalculator() {
  renderWizard();
  updateProgress();
  showStep(0);
  updateLiveTotal();
}

function renderWizard() {
  const wizard = document.getElementById('calculator-wizard');
  if (!wizard) return;

  // Progress dots with ARIA
  let progressHTML = '<div class="calculator__progress" id="calc-progress" role="progressbar" aria-valuemin="1" aria-valuemax="' + CALCULATOR_STEPS.length + '" aria-valuenow="1" aria-label="Calculator progress">';
  CALCULATOR_STEPS.forEach((step, i) => {
    if (i > 0) progressHTML += `<div class="calculator__step-line" id="calc-line-${i}"></div>`;
    progressHTML += `<div class="calculator__step-dot" id="calc-dot-${i}" data-step="${i}" aria-label="Step ${i + 1}: ${escapeHTML(step.title)}"></div>`;
  });
  progressHTML += '</div>';

  // Step labels
  progressHTML += '<div class="calculator__step-labels">';
  CALCULATOR_STEPS.forEach((step, i) => {
    progressHTML += `<span class="calculator__step-label" id="calc-label-${i}">${step.title.split(' ').slice(1).join(' ')}</span>`;
  });
  progressHTML += '</div>';

  // Panels — each step is a fieldset for semantic grouping
  let panelsHTML = '';
  CALCULATOR_STEPS.forEach((step, i) => {
    panelsHTML += `<div class="calculator__panel" id="calc-panel-${i}" role="tabpanel" aria-label="${escapeHTML(step.title)}">`;
    panelsHTML += `<h3 class="calculator__panel-title">${escapeHTML(step.title)}</h3>`;
    panelsHTML += `<p class="calculator__panel-desc">${escapeHTML(step.description)}</p>`;
    panelsHTML += '<div class="calculator__fields">';

    step.fields.forEach(field => {
      panelsHTML += renderField(field, step.id);
    });

    panelsHTML += '</div></div>';
  });

  // Results panel
  panelsHTML += `<div class="calculator__panel" id="calc-panel-results">
    <div class="results" id="calc-results"></div>
  </div>`;

  // Navigation buttons with data-testid for automated testing
  const navHTML = `
    <div class="calculator__nav">
      <button class="btn btn--secondary" id="calc-prev" data-testid="calc-prev" onclick="window.EcoTrack.calcPrev()" aria-label="Go to previous step">
        <i data-lucide="arrow-left" style="width:16px;height:16px" aria-hidden="true"></i> Back
      </button>
      <button class="btn btn--primary" id="calc-next" data-testid="calc-next" onclick="window.EcoTrack.calcNext()" aria-label="Go to next step">
        Next <i data-lucide="arrow-right" style="width:16px;height:16px" aria-hidden="true"></i>
      </button>
    </div>
  `;

  // Live total with ARIA live region for screen readers
  const liveHTML = `
    <div class="calculator__live-total" id="calc-live-total" aria-live="polite" aria-atomic="true">
      <div class="calculator__live-label">Estimated Annual Footprint</div>
      <div class="calculator__live-value" id="calc-live-value" data-testid="calc-live-total">0.0</div>
      <div class="calculator__live-unit">tonnes CO₂ / year</div>
    </div>
  `;

  wizard.innerHTML = progressHTML + panelsHTML + navHTML + liveHTML;

  // Re-init lucide icons
  if (window.lucide) window.lucide.createIcons();

  // Set default values
  CALCULATOR_STEPS.forEach(step => {
    step.fields.forEach(field => {
      if (field.type === 'slider' && field.defaultValue !== undefined) {
        inputs[field.id] = field.defaultValue;
      }
    });
  });
}

/**
 * Renders a single form field (slider or select) with ARIA labels.
 * Security: all labels are escaped to prevent XSS.
 */
function renderField(field, stepId) {
  const fieldId = `field-${field.id}`;
  let html = `<div class="calculator__field">`;

  if (field.type === 'slider') {
    html += `
      <div class="calculator__field-header">
        <label class="calculator__field-label" for="${fieldId}">${escapeHTML(field.label)}</label>
        <span class="calculator__field-value" id="${fieldId}-display" aria-live="polite">${field.defaultValue} ${escapeHTML(field.unit)}</span>
      </div>
      <input type="range" class="range-slider" id="${fieldId}" data-testid="${fieldId}"
        min="${safeNumber(field.min, 0)}" max="${safeNumber(field.max, 100)}" step="${safeNumber(field.step, 1)}" value="${safeNumber(field.defaultValue, 0)}"
        aria-label="${escapeHTML(field.label)}"
        oninput="window.EcoTrack.calcInput('${field.id}', this.value, '${escapeHTML(field.unit)}')">
    `;
  } else if (field.type === 'select') {
    html += `
      <label class="calculator__field-label" for="${fieldId}">${escapeHTML(field.label)}</label>
      <select class="form-select" id="${fieldId}" data-testid="${fieldId}"
        aria-label="${escapeHTML(field.label)}"
        onchange="window.EcoTrack.calcInput('${field.id}', this.value)">
        ${field.options.map(o => `<option value="${escapeHTML(String(o.value))}">${escapeHTML(o.label)}</option>`).join('')}
      </select>
    `;
    inputs[field.id] = field.options[0].value;
  }

  html += '</div>';
  return html;
}

/**
 * Handles input changes from calculator fields.
 * Security: values are validated before being stored.
 * @param {string} fieldId - Field identifier
 * @param {string|number} value - Raw input value
 * @param {string} [unit] - Display unit for sliders
 */
export function handleInput(fieldId, value, unit) {
  // Security: validate numeric inputs
  inputs[fieldId] = isNaN(value) ? String(value) : safeNumber(value, 0, 0, 100000);

  // Update display for sliders
  const display = document.getElementById(`field-${fieldId}-display`);
  if (display && unit) {
    display.textContent = `${value} ${escapeHTML(unit)}`;
  }

  updateLiveTotal();
}

function calculateEmissions() {
  const result = { transport: 0, energy: 0, diet: 0, shopping: 0, waste: 0 };

  // Transport
  const carType = inputs.carType || 'none';
  const carKm = inputs.carKm || 0;
  if (carType !== 'none' && EMISSION_FACTORS.transport[carType]) {
    result.transport += carKm * EMISSION_FACTORS.transport[carType] / 52;
  }
  result.transport += (inputs.publicTransitKm || 0) * EMISSION_FACTORS.transport.publicTransit / 52;
  result.transport += (inputs.shortFlights || 0) * EMISSION_FACTORS.transport.shortFlight;
  result.transport += (inputs.longFlights || 0) * EMISSION_FACTORS.transport.longFlight;

  // Energy
  const elec = (inputs.electricityKwh || 0) * EMISSION_FACTORS.energy.electricity / 12;
  const gas = (inputs.gasM3 || 0) * EMISSION_FACTORS.energy.naturalGas / 12;
  let energyTotal = elec + gas;

  const solar = inputs.hasSolar || 'no';
  if (solar === 'partial') energyTotal *= 0.7;
  else if (solar === 'full') energyTotal *= 0.3;

  const household = inputs.householdSize || 1;
  result.energy = energyTotal / household;

  // Diet
  const dietType = inputs.dietType || 'mediumMeat';
  result.diet = EMISSION_FACTORS.diet[dietType] || 2500;

  const localFood = inputs.localFood || 'never';
  const localMultiplier = { never: 1, sometimes: 0.9, often: 0.8, always: 0.7 };
  result.diet *= (localMultiplier[localFood] || 1);

  const foodWaste = inputs.foodWaste || 'medium';
  const wasteMultiplier = { high: 1.2, medium: 1, low: 0.85, none: 0.75 };
  result.diet *= (wasteMultiplier[foodWaste] || 1);

  // Shopping
  const clothingItems = inputs.clothingItems || 0;
  const electronics = inputs.electronicsYear || 0;
  result.shopping = clothingItems * 7 * 12 + electronics * 50; // rough per-item estimates

  const shoppingHabit = inputs.shoppingHabit || 'new';
  const shopMultiplier = { new: 1, mixed: 0.7, secondhand: 0.3, minimal: 0.2 };
  result.shopping *= (shopMultiplier[shoppingHabit] || 1);

  // Waste
  const recycling = inputs.recycling || 'recycleSome';
  result.waste = EMISSION_FACTORS.waste[recycling] || 800;

  const composting = inputs.composting || 'no';
  if (composting === 'yes') result.waste += EMISSION_FACTORS.waste.compost;

  const plasticUse = inputs.plasticUse || 'medium';
  const plasticMultiplier = { high: 1.3, medium: 1, low: 0.7, none: 0.4 };
  result.waste *= (plasticMultiplier[plasticUse] || 1);

  return result;
}

/** Recalculates and updates the live total display. */
function updateLiveTotal() {
  const emissions = calculateEmissions();
  const total = Object.values(emissions).reduce((sum, v) => sum + v, 0);
  const tonnes = (total / 1000).toFixed(1);

  const el = document.getElementById('calc-live-value');
  if (el) el.textContent = tonnes;

  // Update ARIA progressbar
  const progress = document.getElementById('calc-progress');
  if (progress) progress.setAttribute('aria-valuenow', String(currentStep + 1));
}

function updateProgress() {
  const totalSteps = CALCULATOR_STEPS.length;

  for (let i = 0; i < totalSteps; i++) {
    const dot = document.getElementById(`calc-dot-${i}`);
    const label = document.getElementById(`calc-label-${i}`);
    const line = document.getElementById(`calc-line-${i}`);

    if (dot) {
      dot.classList.toggle('active', i === currentStep);
      dot.classList.toggle('completed', i < currentStep);
    }
    if (label) {
      label.classList.toggle('active', i === currentStep);
    }
    if (line) {
      line.classList.toggle('active', i <= currentStep);
    }
  }

  // Button visibility
  const prev = document.getElementById('calc-prev');
  const next = document.getElementById('calc-next');
  if (prev) prev.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
  if (next) {
    if (currentStep >= totalSteps) {
      next.style.display = 'none';
      if (prev) prev.style.display = 'none';
    } else {
      next.innerHTML = currentStep === totalSteps - 1
        ? 'See Results <i data-lucide="sparkles" style="width:16px;height:16px"></i>'
        : 'Next <i data-lucide="arrow-right" style="width:16px;height:16px"></i>';
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function showStep(index) {
  const totalSteps = CALCULATOR_STEPS.length;

  // Hide all panels
  for (let i = 0; i < totalSteps; i++) {
    const panel = document.getElementById(`calc-panel-${i}`);
    if (panel) panel.classList.remove('active');
  }
  const resultsPanel = document.getElementById('calc-panel-results');
  if (resultsPanel) resultsPanel.classList.remove('active');

  if (index < totalSteps) {
    const panel = document.getElementById(`calc-panel-${index}`);
    if (panel) panel.classList.add('active');
  } else {
    // Show results
    if (resultsPanel) resultsPanel.classList.add('active');
    showResults();
  }
}

function showResults() {
  const emissions = calculateEmissions();
  const total = Object.values(emissions).reduce((sum, v) => sum + v, 0);
  const tonnes = (total / 1000).toFixed(1);
  const trees = Math.ceil(total / 22);

  // Save profile
  saveProfile({
    date: new Date().toISOString(),
    total: total,
    categories: emissions,
    rawInputs: { ...inputs },
  });

  // Dispatch event for achievements
  window.dispatchEvent(new CustomEvent('ecotrack:calc-complete', { detail: { total, categories: emissions } }));

  const container = document.getElementById('calc-results');
  if (!container) return;

  // Determine comparison to world average
  const worldAvg = COUNTRY_AVERAGES.world;
  const ratio = (total / 1000) / worldAvg;
  let comparisonText = '';
  let comparisonClass = '';
  if (ratio < 0.5) {
    comparisonText = 'Excellent! Well below global average';
    comparisonClass = 'tag--green';
  } else if (ratio < 0.8) {
    comparisonText = 'Good — below global average';
    comparisonClass = 'tag--green';
  } else if (ratio < 1.2) {
    comparisonText = 'Near the global average';
    comparisonClass = 'tag--amber';
  } else {
    comparisonText = 'Above global average — room to improve';
    comparisonClass = 'tag--red';
  }

  container.innerHTML = `
    <h3 class="calculator__panel-title" style="justify-content:center;">🌍 Your Carbon Footprint</h3>
    <p class="calculator__panel-desc" style="text-align:center;">Here's your estimated annual carbon footprint breakdown</p>

    <div style="font-family:var(--font-display); font-size:var(--fs-5xl); font-weight:800; margin: var(--sp-6) 0 var(--sp-2);">
      <span class="text-gradient" data-testid="calc-result-total">${escapeHTML(tonnes)}</span>
    </div>
    <div style="color:var(--clr-text-secondary); margin-bottom:var(--sp-4);">tonnes CO₂ per year</div>

    <span class="tag ${comparisonClass}" style="margin-bottom:var(--sp-2);" data-testid="calc-result-comparison">${escapeHTML(comparisonText)}</span>

    <div style="color:var(--clr-text-muted); font-size:var(--fs-sm); margin: var(--sp-4) 0 var(--sp-6);">
      🌳 You'd need <strong style="color:var(--clr-primary-400)">${formatNumber(trees)} trees</strong> planted to offset your annual emissions
    </div>

    <div class="results__breakdown" role="list" aria-label="Emissions by category">
      ${CATEGORIES.map(cat => {
        const val = emissions[cat.id] || 0;
        const catTonnes = (val / 1000).toFixed(1);
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return `
          <div class="results__category" role="listitem" data-testid="calc-result-${cat.id}">
            <div class="results__category-icon" aria-hidden="true">${cat.emoji}</div>
            <div class="results__category-name">${escapeHTML(cat.name)}</div>
            <div class="results__category-value" style="color:${cat.color}">${catTonnes}t</div>
            <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);">${pct}%</div>
          </div>
        `;
      }).join('')}
    </div>

    <div style="margin-top:var(--sp-8); display:flex; gap:var(--sp-4); justify-content:center; flex-wrap:wrap;">
      <button class="btn btn--primary btn--lg" onclick="window.EcoTrack.navigateTo('dashboard')" data-testid="calc-to-dashboard">
        <i data-lucide="bar-chart-3" style="width:18px;height:18px" aria-hidden="true"></i> View Dashboard
      </button>
      <button class="btn btn--secondary btn--lg" onclick="window.EcoTrack.navigateTo('actions')" data-testid="calc-to-actions">
        <i data-lucide="target" style="width:18px;height:18px" aria-hidden="true"></i> Get Action Plan
      </button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Accessibility: announce result to screen readers
  announce(`Your estimated carbon footprint is ${tonnes} tonnes CO₂ per year. ${comparisonText}.`, 'assertive');
}

/**
 * Advances to the next step or shows results.
 * Announces step change for screen readers.
 */
export function nextStep() {
  const totalSteps = CALCULATOR_STEPS.length;
  if (currentStep < totalSteps) {
    currentStep++;
    updateProgress();
    showStep(currentStep);
    // Accessibility: announce step change
    if (currentStep < totalSteps) {
      announce(`Step ${currentStep + 1} of ${totalSteps}: ${CALCULATOR_STEPS[currentStep].title}`);
    }
  }
}

/** Goes back to the previous step. */
export function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    updateProgress();
    showStep(currentStep);
    announce(`Step ${currentStep + 1} of ${CALCULATOR_STEPS.length}: ${CALCULATOR_STEPS[currentStep].title}`);
  }
}

/** Resets the calculator to step 1 with default values. */
export function resetCalculator() {
  currentStep = 0;
  inputs = {};
  renderWizard();
  updateProgress();
  showStep(0);
  updateLiveTotal();
}
