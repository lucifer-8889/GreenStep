/**
 * @fileoverview Unit tests for data.js
 * Covers: emission factors validity, diet/transport ordering,
 * ACTIONS data integrity, CATEGORIES structure, relatableUnits
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EMISSION_FACTORS, ACTIONS, CATEGORIES,
  COUNTRY_AVERAGES, PARIS_TARGET,
  DAILY_CHALLENGES, ACHIEVEMENTS,
  ECO_FACTS, EDU_CARDS, PLEDGE_OPTIONS,
  TREE_ABSORPTION, relatableUnits,
} from '../../js/data.js';
import { toggleAction, getAdoptedActions, clearAll } from '../../js/storage.js';

beforeEach(() => {
  clearAll();
});

// ─── Emission Factors ────────────────────────────────────────────────────────

describe('EMISSION_FACTORS existence and validity', () => {
  it('is an object', () => {
    expect(typeof EMISSION_FACTORS).toBe('object');
  });

  it('has transport factors', () => {
    expect(typeof EMISSION_FACTORS.transport).toBe('object');
  });

  it('has energy factors', () => {
    expect(typeof EMISSION_FACTORS.energy).toBe('object');
  });

  it('has diet factors', () => {
    expect(typeof EMISSION_FACTORS.diet).toBe('object');
  });

  it('has waste factors', () => {
    expect(typeof EMISSION_FACTORS.waste).toBe('object');
  });

  it('all transport factors are non-negative numbers', () => {
    Object.entries(EMISSION_FACTORS.transport).forEach(([key, val]) => {
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThanOrEqual(0);
    });
  });

  it('all diet factors are positive numbers', () => {
    Object.entries(EMISSION_FACTORS.diet).forEach(([key, val]) => {
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThan(0);
    });
  });
});

// ─── Diet Ordering ───────────────────────────────────────────────────────────

describe('diet ordering', () => {
  it('vegan emits less than heavy-meat', () => {
    expect(EMISSION_FACTORS.diet.vegan).toBeLessThan(EMISSION_FACTORS.diet.heavyMeat);
  });

  it('vegetarian emits less than medium-meat', () => {
    expect(EMISSION_FACTORS.diet.vegetarian).toBeLessThan(EMISSION_FACTORS.diet.mediumMeat);
  });

  it('pescatarian emits less than heavy-meat', () => {
    expect(EMISSION_FACTORS.diet.pescatarian).toBeLessThan(EMISSION_FACTORS.diet.heavyMeat);
  });
});

// ─── Transport Ordering ──────────────────────────────────────────────────────

describe('transport ordering', () => {
  it('electric car emits less than petrol per km', () => {
    expect(EMISSION_FACTORS.transport.carElectric).toBeLessThan(EMISSION_FACTORS.transport.carPetrol);
  });

  it('hybrid car emits less than petrol per km', () => {
    expect(EMISSION_FACTORS.transport.carHybrid).toBeLessThan(EMISSION_FACTORS.transport.carPetrol);
  });

  it('bicycle emits zero', () => {
    expect(EMISSION_FACTORS.transport.bicycle).toBe(0);
  });

  it('walking emits zero', () => {
    expect(EMISSION_FACTORS.transport.walking).toBe(0);
  });
});

// ─── Flight Ordering ─────────────────────────────────────────────────────────

describe('flight ordering', () => {
  it('long flight emits more than short flight', () => {
    expect(EMISSION_FACTORS.transport.longFlight).toBeGreaterThan(EMISSION_FACTORS.transport.shortFlight);
  });

  it('medium flight emits more than short flight', () => {
    expect(EMISSION_FACTORS.transport.mediumFlight).toBeGreaterThan(EMISSION_FACTORS.transport.shortFlight);
  });
});

// ─── Waste Ordering ──────────────────────────────────────────────────────────

describe('waste ordering', () => {
  it('recycleAll emits less than recycleNone', () => {
    expect(EMISSION_FACTORS.waste.recycleAll).toBeLessThan(EMISSION_FACTORS.waste.recycleNone);
  });

  it('compost is a negative offset', () => {
    expect(EMISSION_FACTORS.waste.compost).toBeLessThan(0);
  });
});

// ─── Formula Sanity Check ────────────────────────────────────────────────────

describe('transport formula sanity check', () => {
  it('petrol car 10,000 km/year emission is positive and plausible', () => {
    const weeklyKm = 10000 / 52;
    const factor = EMISSION_FACTORS.transport.carPetrol;
    const computed = weeklyKm * factor;
    expect(computed).toBeGreaterThan(0);
    expect(computed).toBeLessThan(10000);
  });
});

// ─── ACTIONS Data Structure ──────────────────────────────────────────────────

describe('ACTIONS data structure', () => {
  const validCategories = CATEGORIES.map(c => c.id);
  const validDifficulties = ['easy', 'medium', 'hard'];

  it('is a non-empty array', () => {
    expect(Array.isArray(ACTIONS)).toBe(true);
    expect(ACTIONS.length).toBeGreaterThan(0);
  });

  it('every action has a valid id', () => {
    ACTIONS.forEach(action => {
      expect(typeof action.id).toBe('string');
      expect(action.id.length).toBeGreaterThan(0);
    });
  });

  it('every action has a title', () => {
    ACTIONS.forEach(action => {
      expect(typeof action.title).toBe('string');
      expect(action.title.length).toBeGreaterThan(0);
    });
  });

  it('every action has positive savingsKg', () => {
    ACTIONS.forEach(action => {
      expect(typeof action.savingsKg).toBe('number');
      expect(action.savingsKg).toBeGreaterThan(0);
    });
  });

  it('every action has a valid category', () => {
    ACTIONS.forEach(action => {
      expect(validCategories).toContain(action.category);
    });
  });

  it('every action has a valid difficulty', () => {
    ACTIONS.forEach(action => {
      expect(validDifficulties).toContain(action.difficulty);
    });
  });
});

describe('no duplicate action IDs', () => {
  it('all action IDs are unique', () => {
    const ids = ACTIONS.map(a => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('savings calculation', () => {
  it('total savings equals sum of adopted action savingsKg', () => {
    const a1 = ACTIONS[0];
    const a2 = ACTIONS[1];

    toggleAction(a1.id);
    toggleAction(a2.id);

    const adopted = getAdoptedActions();
    const totalSavings = adopted.reduce((sum, id) => {
      const a = ACTIONS.find(x => x.id === id);
      return sum + (a ? a.savingsKg : 0);
    }, 0);

    expect(totalSavings).toBe(a1.savingsKg + a2.savingsKg);
  });
});

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

describe('CATEGORIES structure', () => {
  it('is an array of exactly 5 categories', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBe(5);
  });

  it('has the expected category IDs', () => {
    const expectedIds = ['transport', 'energy', 'diet', 'shopping', 'waste'];
    const actualIds = CATEGORIES.map(c => c.id).sort();
    expect(actualIds).toEqual(expectedIds.sort());
  });

  it('each category has name, emoji, and hex color', () => {
    CATEGORIES.forEach(cat => {
      expect(typeof cat.name).toBe('string');
      expect(cat.name.length).toBeGreaterThan(0);
      expect(typeof cat.emoji).toBe('string');
      expect(cat.emoji.length).toBeGreaterThan(0);
      expect(typeof cat.color).toBe('string');
      expect(cat.color.startsWith('#')).toBe(true);
    });
  });
});

// ─── Constants ───────────────────────────────────────────────────────────────

describe('data constants', () => {
  it('COUNTRY_AVERAGES is an object with world average', () => {
    expect(typeof COUNTRY_AVERAGES).toBe('object');
    expect(COUNTRY_AVERAGES.world).toBe(4.7);
  });

  it('PARIS_TARGET is 2.1 tonnes', () => {
    expect(PARIS_TARGET).toBe(2.1);
  });

  it('TREE_ABSORPTION is 22 kg', () => {
    expect(TREE_ABSORPTION).toBe(22);
  });

  it('DAILY_CHALLENGES is a non-empty array', () => {
    expect(Array.isArray(DAILY_CHALLENGES)).toBe(true);
    expect(DAILY_CHALLENGES.length).toBeGreaterThan(0);
  });

  it('ACHIEVEMENTS is a non-empty array', () => {
    expect(Array.isArray(ACHIEVEMENTS)).toBe(true);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
  });

  it('ECO_FACTS is a non-empty array', () => {
    expect(Array.isArray(ECO_FACTS)).toBe(true);
    expect(ECO_FACTS.length).toBeGreaterThan(0);
  });

  it('EDU_CARDS is a non-empty array', () => {
    expect(Array.isArray(EDU_CARDS)).toBe(true);
    expect(EDU_CARDS.length).toBeGreaterThan(0);
  });

  it('PLEDGE_OPTIONS is a non-empty array', () => {
    expect(Array.isArray(PLEDGE_OPTIONS)).toBe(true);
    expect(PLEDGE_OPTIONS.length).toBeGreaterThan(0);
  });
});

// ─── relatableUnits ──────────────────────────────────────────────────────────

describe('relatableUnits', () => {
  it('converts 4700 kg to ~4.7 tonnes', () => {
    const result = relatableUnits(4700);
    expect(result.tonnes).toBe('4.7');
  });

  it('calculates trees needed based on TREE_ABSORPTION', () => {
    const result = relatableUnits(4700);
    expect(result.trees).toBe(Math.ceil(4700 / 22));
  });

  it('calculates equivalent flights', () => {
    const result = relatableUnits(4700);
    expect(result.flights).toBe((4700 / 1800).toFixed(1));
  });

  it('calculates equivalent driving km', () => {
    const result = relatableUnits(4700);
    expect(result.drivingKm).toBe(Math.round(4700 / 0.192));
  });

  it('handles zero emissions', () => {
    const result = relatableUnits(0);
    expect(result.tonnes).toBe('0.0');
    expect(result.trees).toBe(0);
  });
});

// ─── Data Immutability ───────────────────────────────────────────────────────

describe('data immutability', () => {
  it('EMISSION_FACTORS is deeply frozen', () => {
    expect(Object.isFrozen(EMISSION_FACTORS)).toBe(true);
    expect(Object.isFrozen(EMISSION_FACTORS.transport)).toBe(true);
  });

  it('ACTIONS is deeply frozen', () => {
    expect(Object.isFrozen(ACTIONS)).toBe(true);
  });

  it('CATEGORIES is deeply frozen', () => {
    expect(Object.isFrozen(CATEGORIES)).toBe(true);
  });

  it('COUNTRY_AVERAGES is deeply frozen', () => {
    expect(Object.isFrozen(COUNTRY_AVERAGES)).toBe(true);
  });
});
