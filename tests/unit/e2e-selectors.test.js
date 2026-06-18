/**
 * @fileoverview Unit tests for e2e-selectors.js
 * Covers: SELECTORS contract completeness, sel() helper
 */

import { describe, it, expect } from 'vitest';
import { SELECTORS, sel } from '../e2e-selectors.js';

// ─── SELECTORS Object ────────────────────────────────────────────────────────

describe('SELECTORS object is frozen', () => {
  it('top-level is frozen', () => {
    expect(Object.isFrozen(SELECTORS)).toBe(true);
  });
});

describe('required sections exist', () => {
  const requiredSections = [
    'NAV', 'HERO', 'CALCULATOR', 'DASHBOARD', 'ACTIONS',
    'CHALLENGES', 'EDUCATION', 'PLEDGES', 'GLOBAL',
  ];

  requiredSections.forEach(section => {
    it(`SELECTORS.${section} is defined`, () => {
      expect(typeof SELECTORS[section]).toBe('object');
      expect(SELECTORS[section]).not.toBeNull();
    });
  });
});

describe('key selector values are non-empty strings', () => {
  const checks = [
    ['NAV', 'HOME'],
    ['NAV', 'CALCULATOR'],
    ['NAV', 'DASHBOARD'],
    ['HERO', 'CTA_CALCULATE'],
    ['CALCULATOR', 'LIVE_TOTAL'],
    ['CALCULATOR', 'NEXT_BTN'],
    ['CALCULATOR', 'PREV_BTN'],
    ['DASHBOARD', 'STAT_FOOTPRINT'],
    ['ACTIONS', 'FILTER_ALL'],
    ['CHALLENGES', 'STREAK'],
    ['EDUCATION', 'CAROUSEL'],
    ['PLEDGES', 'COUNTER'],
    ['GLOBAL', 'TOAST'],
  ];

  checks.forEach(([section, key]) => {
    it(`SELECTORS.${section}.${key} is a non-empty string`, () => {
      const val = SELECTORS[section][key];
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    });
  });
});

// ─── sel() Helper ────────────────────────────────────────────────────────────

describe('sel() helper', () => {
  it('generates correct CSS selector for a data-testid value', () => {
    expect(sel('calc-live-total')).toBe('[data-testid="calc-live-total"]');
  });

  it('works with real SELECTORS values', () => {
    expect(sel(SELECTORS.NAV.HOME)).toBe('[data-testid="nav-home"]');
  });
});

// ─── No Duplicate Selector Values ────────────────────────────────────────────

describe('no duplicate selector values across sections', () => {
  it('all data-testid values are unique', () => {
    const allValues = [];
    Object.values(SELECTORS).forEach(section => {
      Object.values(section).forEach(val => allValues.push(val));
    });
    const unique = new Set(allValues);
    expect(unique.size).toBe(allValues.length);
  });
});
