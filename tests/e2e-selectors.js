/**
 * @module e2e-selectors
 * @fileoverview Centralized reference of all data-testid attributes
 * used across the EcoTrack application. This file serves as a contract
 * between the UI and automated end-to-end tests, ensuring selectors
 * remain consistent and discoverable.
 *
 * Usage in tests:
 *   import { SELECTORS } from './e2e-selectors.js';
 *   const el = document.querySelector(`[data-testid="${SELECTORS.NAV.HOME}"]`);
 */

export const SELECTORS = Object.freeze({

  // ─── Navigation ─────────────────────────────────────────────
  NAV: {
    SKIP:          'skip-nav',
    HOME:          'nav-home',
    CALCULATOR:    'nav-calculator',
    DASHBOARD:     'nav-dashboard',
    ACTIONS:       'nav-actions',
    CHALLENGES:    'nav-challenges',
    LEARN:         'nav-learn',
    PLEDGE:        'nav-pledge',
    MOBILE_TOGGLE: 'nav-mobile-toggle',
  },

  // ─── Hero ───────────────────────────────────────────────────
  HERO: {
    CTA_CALCULATE: 'hero-cta-calculate',
    CTA_LEARN:     'hero-cta-learn',
  },

  // ─── Calculator ─────────────────────────────────────────────
  CALCULATOR: {
    LIVE_TOTAL:       'calc-live-total',
    PREV_BTN:         'calc-prev',
    NEXT_BTN:         'calc-next',
    RESULT_TOTAL:     'calc-result-total',
    RESULT_COMPARISON:'calc-result-comparison',
    TO_DASHBOARD:     'calc-to-dashboard',
    TO_ACTIONS:       'calc-to-actions',
    // Dynamic per category: 'calc-result-{categoryId}'
    // Dynamic per field: 'field-{fieldId}'
  },

  // ─── Dashboard ──────────────────────────────────────────────
  DASHBOARD: {
    EMPTY:             'dashboard-empty',
    CALC_BTN:          'dashboard-calc-btn',
    STAT_FOOTPRINT:    'stat-footprint',
    STAT_TREES:        'stat-trees',
    STAT_FLIGHTS:      'stat-flights',
    STAT_DRIVING:      'stat-driving',
    CHART_DOUGHNUT:    'chart-doughnut-container',
    CHART_BAR:         'chart-bar-container',
    GAUGE:             'dashboard-gauge',
    // Dynamic per gauge: 'gauge-{label}'
  },

  // ─── Actions ────────────────────────────────────────────────
  ACTIONS: {
    FILTER_ALL:      'actions-filter-all',
    // Dynamic per category: 'actions-filter-{categoryId}'
    // Dynamic per action: 'action-card-{actionId}'
    // Dynamic adopt button: 'action-adopt-{actionId}'
  },

  // ─── Challenges ─────────────────────────────────────────────
  CHALLENGES: {
    TODAY:          'challenge-today',
    COMPLETE_BTN:   'challenge-complete-btn',
    COMPLETED:      'challenge-completed',
    STREAK:         'challenge-streak',
    // Dynamic per badge: 'badge-{achievementId}'
  },

  // ─── Education ──────────────────────────────────────────────
  EDUCATION: {
    CAROUSEL:       'education-carousel',
    PREV:           'education-prev',
    NEXT:           'education-next',
    PAUSE:          'education-pause',
    // Dynamic per fact: 'education-fact-{index}'
    // Dynamic per dot: 'education-dot-{index}'
    // Dynamic per card: 'edu-card-{index}'
  },

  // ─── Pledges ────────────────────────────────────────────────
  PLEDGES: {
    COUNTER:         'pledges-counter',
    WALL:            'pledges-wall',
    // Dynamic per option: 'pledge-opt-{pledgeId}'
    // Dynamic per tile: 'pledge-tile-{pledgeId}'
    // Dynamic per remove: 'pledge-remove-{pledgeId}'
  },

  // ─── Global ─────────────────────────────────────────────────
  GLOBAL: {
    TOAST:           'toast-notification',
    TOAST_DISMISS:   'toast-dismiss',
    FOOTER:          'site-footer',
  },
});

/**
 * Helper to build a CSS selector string for a data-testid value.
 * @param {string} testId - The data-testid value
 * @returns {string} CSS selector string
 */
export function sel(testId) {
  return `[data-testid="${testId}"]`;
}
