/**
 * @module actions
 * @fileoverview Personalized action plan with category filtering,
 * adoption tracking, and projected CO₂ savings calculation.
 */

import { ACTIONS, CATEGORIES } from './data.js';
import { getProfile, getAdoptedActions, toggleAction } from './storage.js';
import { escapeHTML, announce, formatNumber } from './utils.js';

let currentFilter = 'all';

/** Initializes the actions section. */
export function initActions() {
  renderActions();
}

export function renderActions() {
  const container = document.getElementById('actions-content');
  if (!container) return;

  const profile = getProfile();
  const adopted = getAdoptedActions();

  // Sorting strategy: prioritize actions in the user's highest-emission
  // categories first. This ensures the most impactful recommendations
  // appear at the top. catRank orders categories by emission (descending),
  // then we sort actions by their category's rank position.
  let sortedActions = [...ACTIONS];
  if (profile) {
    const catRank = Object.entries(profile.categories)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    sortedActions.sort((a, b) => {
      const aRank = catRank.indexOf(a.category);
      const bRank = catRank.indexOf(b.category);
      return aRank - bRank;
    });
  }

  // Filter
  const filtered = currentFilter === 'all'
    ? sortedActions
    : sortedActions.filter(a => a.category === currentFilter);

  // Total potential savings from adopted actions
  const totalSavings = adopted.reduce((sum, id) => {
    const action = ACTIONS.find(a => a.id === id);
    return sum + (action ? action.savingsKg : 0);
  }, 0);

  container.innerHTML = `
    <!-- Impact summary -->
    ${adopted.length > 0 ? `
      <div class="glass-card anim-fade-in-up visible" style="text-align:center; margin-bottom:var(--sp-8);">
        <div style="font-size:var(--fs-sm);color:var(--clr-text-secondary);margin-bottom:var(--sp-2);">
          Projected Annual Savings from ${adopted.length} Adopted Actions
        </div>
        <div style="font-family:var(--font-display);font-size:var(--fs-3xl);font-weight:800;">
          <span class="text-gradient">${(totalSavings / 1000).toFixed(1)} tonnes</span>
        </div>
        <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:var(--sp-1);">
          CO₂ reduction per year • 🌳 ${Math.ceil(totalSavings / 22)} trees equivalent
        </div>
      </div>
    ` : ''}

    <!-- Filters -->
    <div class="actions__filters">
      <div class="tabs" id="actions-tabs" role="tablist" aria-label="Filter actions by category">
        <button class="tab ${currentFilter === 'all' ? 'active' : ''}" onclick="window.EcoTrack.filterActions('all')" role="tab" aria-selected="${currentFilter === 'all'}" data-testid="actions-filter-all">All</button>
        ${CATEGORIES.map(c => `
          <button class="tab ${currentFilter === c.id ? 'active' : ''}" onclick="window.EcoTrack.filterActions('${c.id}')" role="tab" aria-selected="${currentFilter === c.id}" data-testid="actions-filter-${c.id}">
            <span aria-hidden="true">${c.emoji}</span> ${escapeHTML(c.name)}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Actions Grid -->
    <div class="actions__grid stagger-children" id="actions-grid" role="list" aria-label="Available eco-actions">
      ${filtered.map(action => renderActionCard(action, adopted.includes(action.id))).join('')}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renders a single action card with security-escaped content.
 * @param {Object} action - Action data from data.js
 * @param {boolean} isAdopted - Whether user has adopted this action
 * @returns {string} HTML string
 */
function renderActionCard(action, isAdopted) {
  const difficultyTag = {
    easy: '<span class="tag tag--green">Easy</span>',
    medium: '<span class="tag tag--amber">Medium</span>',
    hard: '<span class="tag tag--red">Hard</span>',
  };

  const cat = CATEGORIES.find(c => c.id === action.category);

  return `
    <div class="action-card ${isAdopted ? 'adopted' : ''} anim-fade-in-up visible hover-lift" role="listitem" data-testid="action-card-${action.id}">
      <div class="action-card__header">
        <div class="action-card__icon" style="background:${cat ? cat.color + '22' : ''}" aria-hidden="true">
          ${action.icon}
        </div>
        ${difficultyTag[action.difficulty] || ''}
      </div>
      <h4 class="action-card__title">${escapeHTML(action.title)}</h4>
      <p class="action-card__desc">${escapeHTML(action.description)}</p>
      <div class="action-card__meta">
        <div class="action-card__saving">
          <i data-lucide="leaf" style="width:14px;height:14px" aria-hidden="true"></i>
          ${formatNumber(action.savingsKg)} kg CO₂/yr
        </div>
        <span class="tag tag--blue">${escapeHTML(action.costSaving)}</span>
      </div>
      <button class="btn ${isAdopted ? 'btn--outline' : 'btn--primary'} w-full action-card__adopt-btn"
        onclick="window.EcoTrack.toggleActionAdopt('${action.id}')"
        aria-pressed="${isAdopted}"
        aria-label="${isAdopted ? 'Remove' : 'Adopt'}: ${escapeHTML(action.title)}"
        data-testid="action-adopt-${action.id}">
        ${isAdopted
          ? '<i data-lucide="check-circle" style="width:16px;height:16px" aria-hidden="true"></i> Adopted'
          : '<i data-lucide="plus-circle" style="width:16px;height:16px" aria-hidden="true"></i> Adopt This Action'
        }
      </button>
    </div>
  `;
}

/**
 * Filters actions by category.
 * @param {string} category - Category ID or 'all'
 */
export function filterActions(category) {
  currentFilter = category;
  renderActions();
  // Accessibility: announce filter change with result count
  const count = category === 'all'
    ? ACTIONS.length
    : ACTIONS.filter(a => a.category === category).length;
  const label = category === 'all' ? 'all' : category;
  announce(`Showing ${count} ${label} action${count !== 1 ? 's' : ''}`);
}

/**
 * Toggles action adoption and dispatches event for achievements.
 * @param {string} actionId - Action identifier
 */
export function handleToggleAction(actionId) {
  toggleAction(actionId);

  const adopted = getAdoptedActions();
  const action = ACTIONS.find(a => a.id === actionId);
  const isNowAdopted = adopted.includes(actionId);

  window.dispatchEvent(new CustomEvent('ecotrack:actions-updated', { detail: { count: adopted.length } }));

  renderActions();

  // Accessibility: announce adoption change
  if (action) {
    announce(isNowAdopted
      ? `Adopted: ${action.title}. Saves ${action.savingsKg} kg CO₂ per year.`
      : `Removed: ${action.title} from adopted actions.`);
  }
}
