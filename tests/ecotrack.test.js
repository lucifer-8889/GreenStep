/**
 * @fileoverview EcoTrack — Comprehensive Unit Test Suite
 *
 * Covers:
 *  1. utils.js  — escapeHTML, safeNumber, safeEnum, debounce, throttle,
 *                 formatNumber, formatDate, generateUniqueId, createSafeElement, testId
 *  2. storage.js — saveProfile/getProfile, savePledge/removePledge/getPledges,
 *                  toggleAction/getAdoptedActions, streak/challenge logic,
 *                  unlockAchievement/getUnlockedAchievements, exportData/importData,
 *                  getStorageUsage, clearAll, schema validation (corrupt data)
 *  3. calculator logic — emission formula correctness (pure business logic)
 *  4. actions.js  — filterActions state, savings accumulation
 *  5. e2e-selectors — SELECTORS contract completeness and sel() helper
 *
 * Run via: tests/tests.html
 */

import { escapeHTML, safeNumber, safeEnum, debounce, throttle,
         formatNumber, formatDate, generateUniqueId, createSafeElement, testId } from '../js/utils.js';

import {
  saveProfile, getProfile, getHistory,
  savePledge, removePledge, getPledges,
  toggleAction, getAdoptedActions,
  getStreakData, completeChallenge, isChallengeCompletedToday, getChallengeLog,
  unlockAchievement, getUnlockedAchievements,
  exportData, importData, clearAll, getStorageUsage,
} from '../js/storage.js';

import { SELECTORS, sel } from './e2e-selectors.js';
import { EMISSION_FACTORS, ACTIONS, CATEGORIES } from '../js/data.js';

// ─── Tiny Test Runner ─────────────────────────────────────────────────────────

let _passed = 0;
let _failed = 0;
let _total  = 0;
const _results = [];

function _record(suiteName, testName, ok, message) {
  _total++;
  if (ok) { _passed++; } else { _failed++; }
  _results.push({ suite: suiteName, test: testName, ok, message });
}

/**
 * Registers a named test suite.
 * @param {string} name
 * @param {Function} fn
 */
export async function describe(name, fn) {
  const assert = {
    /** Passes when value is truthy. */
    ok(value, msg = 'Expected truthy') {
      _record(name, msg, Boolean(value), value);
    },
    /** Passes when actual === expected. */
    equal(actual, expected, msg = `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`) {
      _record(name, msg, actual === expected, `actual=${JSON.stringify(actual)}`);
    },
    /** Passes when actual !== expected. */
    notEqual(actual, expected, msg = `Expected values to differ`) {
      _record(name, msg, actual !== expected, `actual=${JSON.stringify(actual)}`);
    },
    /** Passes when actual deeply equals expected (JSON comparison). */
    deepEqual(actual, expected, msg = 'Deep equality check') {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      _record(name, msg, a === b, `actual=${a} expected=${b}`);
    },
    /** Passes when fn throws. */
    throws(fn, msg = 'Expected throw') {
      let threw = false;
      try { fn(); } catch { threw = true; }
      _record(name, msg, threw, '');
    },
    /** Passes when fn does NOT throw. */
    doesNotThrow(fn, msg = 'Expected no throw') {
      let threw = false;
      try { fn(); } catch (e) { threw = true; }
      _record(name, msg, !threw, '');
    },
  };

  try {
    await fn(assert);
  } catch (err) {
    _record(name, `UNEXPECTED ERROR: ${err.message}`, false, err.stack);
  }
}

/** Returns final summary. */
export function summary() {
  return { passed: _passed, failed: _failed, total: _total, results: _results };
}

// ─── Helper: localStorage mock for node-like isolation ────────────────────────
// (Not needed here — the browser provides real localStorage; we just clearAll()
//  before each storage suite to ensure a clean slate.)

// ══════════════════════════════════════════════════════════════════════════════
// 1. UTILS — escapeHTML
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › escapeHTML', (t) => {
  t.equal(escapeHTML('<script>alert(1)</script>'),
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    'escapes script tags');

  t.equal(escapeHTML('"quoted" & \'apostrophe\''),
    '&quot;quoted&quot; &amp; &#039;apostrophe&#039;',
    'escapes quotes and ampersand');

  t.equal(escapeHTML('safe text'), 'safe text',
    'safe text is returned unchanged');

  t.equal(escapeHTML(42), '42',
    'non-string numbers are converted to string');

  t.equal(escapeHTML(null), '',
    'null returns empty string');

  t.equal(escapeHTML(undefined), '',
    'undefined returns empty string');

  t.equal(escapeHTML(''), '',
    'empty string stays empty');
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. UTILS — safeNumber
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › safeNumber', (t) => {
  t.equal(safeNumber('42', 0), 42, 'parses numeric string');
  t.equal(safeNumber(NaN, 5), 5, 'returns fallback for NaN');
  t.equal(safeNumber(Infinity, 0), 0, 'returns fallback for Infinity');
  t.equal(safeNumber(-Infinity, 0), 0, 'returns fallback for -Infinity');
  t.equal(safeNumber(200, 0, 0, 100), 100, 'clamps to max');
  t.equal(safeNumber(-5, 0, 0, 100), 0, 'clamps to min');
  t.equal(safeNumber(50, 0, 0, 100), 50, 'value within range unchanged');
  t.equal(safeNumber('abc', 99), 99, 'non-numeric string returns fallback');
  t.equal(safeNumber(0, 5), 0, 'zero is a valid value, not fallback');
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. UTILS — safeEnum
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › safeEnum', (t) => {
  const allowed = ['vegan', 'vegetarian', 'mediumMeat'];
  t.equal(safeEnum('vegan', allowed, 'mediumMeat'), 'vegan', 'valid value passes through');
  t.equal(safeEnum('invalid', allowed, 'mediumMeat'), 'mediumMeat', 'unknown value returns fallback');
  t.equal(safeEnum('', allowed, 'vegan'), 'vegan', 'empty string returns fallback');
  t.equal(safeEnum(undefined, allowed, 'vegan'), 'vegan', 'undefined returns fallback');
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. UTILS — debounce
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › debounce', (t) => {
  let count = 0;
  const fn = debounce(() => count++, 20);

  fn(); fn(); fn(); // fire 3 times rapidly
  t.equal(count, 0, 'debounced function does not fire immediately');

  await new Promise(r => setTimeout(r, 40));
  t.equal(count, 1, 'debounced function fires exactly once after wait');

  fn();
  await new Promise(r => setTimeout(r, 40));
  t.equal(count, 2, 'second debounced call fires after wait');
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. UTILS — throttle
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › throttle', (t) => {
  let count = 0;
  const fn = throttle(() => count++, 50);

  fn(); // fires immediately
  fn(); // throttled
  fn(); // throttled
  t.equal(count, 1, 'throttled function fires exactly once on rapid calls');

  await new Promise(r => setTimeout(r, 80));
  t.equal(count, 2, 'throttled function fires trailing call after limit');
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. UTILS — formatNumber
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › formatNumber', (t) => {
  t.equal(formatNumber(1234567), '1,234,567', 'formats large numbers with commas');
  t.equal(formatNumber(0), '0', 'zero is formatted');
  t.equal(formatNumber(3.14159, 2), '3.14', 'rounds to specified decimals');
  t.equal(formatNumber(1000, 0), '1,000', 'thousands separator');
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. UTILS — formatDate
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › formatDate', (t) => {
  const result = formatDate('2024-06-15');
  t.ok(result.includes('2024'), 'contains year');
  t.ok(result.includes('Jun') || result.includes('June'), 'contains month');
  t.ok(result.includes('15'), 'contains day');
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. UTILS — generateUniqueId
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › generateUniqueId', (t) => {
  const id1 = generateUniqueId();
  const id2 = generateUniqueId();
  t.notEqual(id1, id2, 'each call returns a unique ID');
  t.ok(id1.startsWith('eco-'), 'default prefix is "eco-"');

  const custom = generateUniqueId('test');
  t.ok(custom.startsWith('test-'), 'custom prefix is applied');
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. UTILS — createSafeElement
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › createSafeElement', (t) => {
  const div = createSafeElement('div', { className: 'foo', id: 'bar' }, 'hello');
  t.equal(div.tagName, 'DIV', 'creates correct tag');
  t.equal(div.className, 'foo', 'sets className');
  t.equal(div.id, 'bar', 'sets id');
  t.equal(div.textContent, 'hello', 'sets textContent safely');

  const btn = createSafeElement('button', { type: 'button', 'aria-label': 'test' });
  t.equal(btn.getAttribute('type'), 'button', 'sets type attribute');
  t.equal(btn.getAttribute('aria-label'), 'test', 'sets aria-label attribute');

  // Verify no innerHTML injection via textContent
  const injected = createSafeElement('span', {}, '<img src=x onerror=alert(1)>');
  t.equal(injected.innerHTML, '&lt;img src=x onerror=alert(1)&gt;',
    'textContent escapes HTML (no XSS via createSafeElement)');
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. UTILS — testId
// ══════════════════════════════════════════════════════════════════════════════

await describe('utils › testId', (t) => {
  const result = testId('calculator', 'next-btn');
  t.equal(result, 'data-testid="calculator-next-btn"', 'returns correct data-testid attribute string');
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. STORAGE — Profile (save/get/history)
// ══════════════════════════════════════════════════════════════════════════════

await describe('storage › saveProfile / getProfile', (t) => {
  clearAll();

  t.equal(getProfile(), null, 'returns null when no profile saved');

  const profile = {
    total: 5000,
    categories: { transport: 1000, energy: 1500, diet: 2000, shopping: 300, waste: 200 },
  };
  saveProfile(profile);

  const loaded = getProfile();
  t.ok(loaded !== null, 'profile is saved and retrieved');
  t.equal(loaded.total, 5000, 'total is preserved');
  t.equal(loaded.categories.diet, 2000, 'category value is preserved');

  clearAll();
});

await describe('storage › getHistory — monthly upsert', (t) => {
  clearAll();

  saveProfile({ total: 4000, categories: { transport: 1000, energy: 800, diet: 1200, shopping: 600, waste: 400 } });
  const h1 = getHistory();
  t.equal(h1.length, 1, 'first save creates one history entry');

  // Same profile saved again in same month — should upsert not duplicate
  saveProfile({ total: 4500, categories: { transport: 1100, energy: 900, diet: 1200, shopping: 600, waste: 700 } });
  const h2 = getHistory();
  t.equal(h2.length, 1, 'saving again in same month upserts, not duplicates');
  t.equal(h2[0].total, 4500, 'upserted entry has updated total');

  clearAll();
});

await describe('storage › schema validation rejects corrupt profile', (t) => {
  clearAll();

  // Manually write corrupt data
  localStorage.setItem('ecotrack_profile', JSON.stringify({ total: 'not-a-number', categories: {} }));
  t.equal(getProfile(), null, 'corrupt profile (non-numeric total) is rejected');

  localStorage.setItem('ecotrack_profile', JSON.stringify({ total: Infinity, categories: {} }));
  t.equal(getProfile(), null, 'Infinity total is rejected');

  localStorage.setItem('ecotrack_profile', 'this is not json{{{');
  t.equal(getProfile(), null, 'malformed JSON returns null gracefully');

  clearAll();
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. STORAGE — Pledges
// ══════════════════════════════════════════════════════════════════════════════

await describe('storage › pledges CRUD', (t) => {
  clearAll();

  const pledge = { id: 'p1', text: 'Go vegan', savingsKg: 600, emoji: '🌱' };

  t.deepEqual(getPledges(), [], 'empty pledge list on fresh start');

  savePledge(pledge);
  t.equal(getPledges().length, 1, 'pledge is saved');
  t.equal(getPledges()[0].id, 'p1', 'pledge id is preserved');

  // Saving same pledge again is idempotent
  savePledge(pledge);
  t.equal(getPledges().length, 1, 'duplicate pledge is not added (idempotent)');

  // Add a second pledge
  savePledge({ id: 'p2', text: 'Cycle to work', savingsKg: 200, emoji: '🚲' });
  t.equal(getPledges().length, 2, 'second pledge added');

  removePledge('p1');
  t.equal(getPledges().length, 1, 'pledge removed by id');
  t.equal(getPledges()[0].id, 'p2', 'correct pledge remains');

  clearAll();
});

await describe('storage › savePledge rejects invalid data', (t) => {
  clearAll();

  savePledge(null);
  t.equal(getPledges().length, 0, 'null pledge is rejected');

  savePledge({ id: '', text: 'test', savingsKg: 10 });
  t.equal(getPledges().length, 0, 'pledge with empty id is rejected');

  savePledge({ id: 'x', text: 'test', savingsKg: 'not-a-number' });
  t.equal(getPledges().length, 0, 'pledge with non-numeric savingsKg is rejected');

  clearAll();
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. STORAGE — Actions (adoptedActions)
// ══════════════════════════════════════════════════════════════════════════════

await describe('storage › toggleAction', (t) => {
  clearAll();

  t.deepEqual(getAdoptedActions(), [], 'empty on start');

  toggleAction('action-car-free');
  t.ok(getAdoptedActions().includes('action-car-free'), 'action is adopted');

  toggleAction('action-solar');
  t.equal(getAdoptedActions().length, 2, 'second action added');

  toggleAction('action-car-free');
  t.ok(!getAdoptedActions().includes('action-car-free'), 'action is un-adopted on second toggle');
  t.equal(getAdoptedActions().length, 1, 'only one action remains');

  clearAll();
});

// ══════════════════════════════════════════════════════════════════════════════
// 14. STORAGE — Streak & Challenges
// ══════════════════════════════════════════════════════════════════════════════

await describe('storage › streaks and challenge completion', (t) => {
  clearAll();

  const initial = getStreakData();
  t.equal(initial.currentStreak, 0, 'fresh streak is 0');
  t.equal(initial.totalCompleted, 0, 'fresh totalCompleted is 0');

  const result = completeChallenge('challenge-1');
  t.equal(result.currentStreak, 1, 'streak becomes 1 after first completion');
  t.equal(result.totalCompleted, 1, 'totalCompleted increments');

  // Completing again the same day should NOT increment streak or totalCompleted
  const result2 = completeChallenge('challenge-1');
  t.equal(result2.currentStreak, 1, 'same-day completion does not increment streak');
  t.equal(result2.totalCompleted, 1, 'same-day completion does not increment totalCompleted');

  t.ok(isChallengeCompletedToday(), 'isChallengeCompletedToday returns true');

  const log = getChallengeLog();
  t.ok(log.length >= 1, 'challenge is logged');

  clearAll();
});

// ══════════════════════════════════════════════════════════════════════════════
// 15. STORAGE — Achievements
// ══════════════════════════════════════════════════════════════════════════════

await describe('storage › achievements', (t) => {
  clearAll();

  t.deepEqual(getUnlockedAchievements(), [], 'no achievements on start');

  const firstUnlock = unlockAchievement('streak-7');
  t.equal(firstUnlock, true, 'first unlock returns true (newly unlocked)');
  t.ok(getUnlockedAchievements().includes('streak-7'), 'achievement is stored');

  const secondUnlock = unlockAchievement('streak-7');
  t.equal(secondUnlock, false, 'duplicate unlock returns false');
  t.equal(getUnlockedAchievements().length, 1, 'no duplicate in storage');

  unlockAchievement('eco-hero');
  t.equal(getUnlockedAchievements().length, 2, 'second distinct achievement saved');

  clearAll();
});

// ══════════════════════════════════════════════════════════════════════════════
// 16. STORAGE — Export / Import
// ══════════════════════════════════════════════════════════════════════════════

await describe('storage › exportData / importData', (t) => {
  clearAll();

  savePledge({ id: 'p-test', text: 'Test pledge', savingsKg: 100, emoji: '🌿' });
  toggleAction('action-test');
  unlockAchievement('first-pledge');

  const json = exportData();
  t.ok(typeof json === 'string', 'exportData returns a string');
  t.doesNotThrow(() => JSON.parse(json), 'exported JSON is valid');

  const parsed = JSON.parse(json);
  t.ok(Array.isArray(parsed.pledges), 'pledges key is present in export');
  t.ok(Array.isArray(parsed.achievements), 'achievements key is present in export');

  // Clear and reimport
  clearAll();
  t.deepEqual(getPledges(), [], 'cleared state has no pledges');

  const success = importData(json);
  t.equal(success, true, 'importData returns true on success');
  t.equal(getPledges().length, 1, 'pledges restored after import');
  t.ok(getUnlockedAchievements().includes('first-pledge'), 'achievements restored after import');

  clearAll();
});

await describe('storage › importData rejects invalid input', (t) => {
  clearAll();

  t.equal(importData('not json'), false, 'invalid JSON returns false');
  t.equal(importData('[]'), false, 'array top-level rejected');
  t.equal(importData('null'), false, 'null top-level rejected');
  t.equal(importData('"string"'), false, 'primitive string rejected');

  clearAll();
});

// ══════════════════════════════════════════════════════════════════════════════
// 17. STORAGE — getStorageUsage
// ══════════════════════════════════════════════════════════════════════════════

await describe('storage › getStorageUsage', (t) => {
  clearAll();

  const emptyUsage = getStorageUsage();
  t.equal(emptyUsage.keys, 0, 'no keys used after clearAll');
  t.equal(emptyUsage.usedBytes, 0, 'zero bytes used after clearAll');

  saveProfile({ total: 3000, categories: { transport: 600, energy: 600, diet: 600, shopping: 600, waste: 600 } });
  const usageAfter = getStorageUsage();
  t.ok(usageAfter.keys >= 1, 'at least one key used after saving profile');
  t.ok(usageAfter.usedBytes > 0, 'bytes used is positive');

  clearAll();
});

// ══════════════════════════════════════════════════════════════════════════════
// 18. STORAGE — clearAll
// ══════════════════════════════════════════════════════════════════════════════

await describe('storage › clearAll', (t) => {
  savePledge({ id: 'c1', text: 'foo', savingsKg: 10, emoji: '🌿' });
  toggleAction('test-action');

  clearAll();

  t.deepEqual(getPledges(), [], 'pledges cleared');
  t.deepEqual(getAdoptedActions(), [], 'adopted actions cleared');
  t.equal(getProfile(), null, 'profile cleared');
});

// ══════════════════════════════════════════════════════════════════════════════
// 19. CALCULATOR — Emission Formula Correctness
// ══════════════════════════════════════════════════════════════════════════════

await describe('calculator › emission factors exist', (t) => {
  t.ok(typeof EMISSION_FACTORS === 'object', 'EMISSION_FACTORS is an object');
  t.ok(typeof EMISSION_FACTORS.transport === 'object', 'transport factors exist');
  t.ok(typeof EMISSION_FACTORS.energy === 'object', 'energy factors exist');
  t.ok(typeof EMISSION_FACTORS.diet === 'object', 'diet factors exist');
  t.ok(typeof EMISSION_FACTORS.waste === 'object', 'waste factors exist');

  // Each factor must be a positive number
  Object.entries(EMISSION_FACTORS.transport).forEach(([key, val]) => {
    t.ok(typeof val === 'number' && val >= 0,
      `transport factor "${key}" is a non-negative number`);
  });

  Object.entries(EMISSION_FACTORS.diet).forEach(([key, val]) => {
    t.ok(typeof val === 'number' && val > 0,
      `diet factor "${key}" is a positive number`);
  });
});

await describe('calculator › vegan emits less than heavy-meat diet', (t) => {
  const vegan = EMISSION_FACTORS.diet.vegan;
  const heavy = EMISSION_FACTORS.diet.heavyMeat;
  t.ok(vegan < heavy, `vegan (${vegan}) < heavyMeat (${heavy})`);
});

await describe('calculator › electric car emits less than petrol per km', (t) => {
  const electric = EMISSION_FACTORS.transport.carElectric;
  const petrol   = EMISSION_FACTORS.transport.carPetrol;
  t.ok(electric < petrol, `electric (${electric} kg/km) < petrol (${petrol} kg/km)`);
});

await describe('calculator › long flight emits more than short flight', (t) => {
  const shortFlight = EMISSION_FACTORS.transport.shortFlight;
  const longFlight  = EMISSION_FACTORS.transport.longFlight;
  t.ok(longFlight > shortFlight,
    `longFlight (${longFlight}) > shortFlight (${shortFlight})`);
});

await describe('calculator › recycleAll emits less than recycleNone', (t) => {
  const all  = EMISSION_FACTORS.waste.recycleAll;
  const none = EMISSION_FACTORS.waste.recycleNone;
  t.ok(all < none, `recycleAll (${all}) < recycleNone (${none})`);
});

await describe('calculator › manual transport formula sanity check', (t) => {
  // Petrol car: 10,000 km/year ÷ 52 weeks * factor
  const weeklyKm = 10000 / 52;
  const factor   = EMISSION_FACTORS.transport.carPetrol;  // kg per km-week
  const computed = weeklyKm * factor;
  t.ok(computed > 0, 'petrol car transport emission is positive');
  t.ok(computed < 10000, 'petrol car annual emission is plausibly below 10,000 kg');
});

// ══════════════════════════════════════════════════════════════════════════════
// 20. ACTIONS — data integrity
// ══════════════════════════════════════════════════════════════════════════════

await describe('actions › ACTIONS data structure', (t) => {
  t.ok(Array.isArray(ACTIONS), 'ACTIONS is an array');
  t.ok(ACTIONS.length > 0, 'ACTIONS has at least one entry');

  const validCategories = CATEGORIES.map(c => c.id);
  const validDifficulties = ['easy', 'medium', 'hard'];

  ACTIONS.forEach((action) => {
    t.ok(typeof action.id === 'string' && action.id.length > 0,
      `action "${action.id}" has a valid id`);
    t.ok(typeof action.title === 'string' && action.title.length > 0,
      `action "${action.id}" has a title`);
    t.ok(typeof action.savingsKg === 'number' && action.savingsKg > 0,
      `action "${action.id}" has positive savingsKg`);
    t.ok(validCategories.includes(action.category),
      `action "${action.id}" has a valid category`);
    t.ok(validDifficulties.includes(action.difficulty),
      `action "${action.id}" has valid difficulty`);
  });
});

await describe('actions › no duplicate action IDs', (t) => {
  const ids = ACTIONS.map(a => a.id);
  const unique = new Set(ids);
  t.equal(unique.size, ids.length, 'all action IDs are unique');
});

await describe('actions › savings calculation', (t) => {
  clearAll();

  // Adopt first two actions
  const a1 = ACTIONS[0];
  const a2 = ACTIONS[1];

  toggleAction(a1.id);
  toggleAction(a2.id);

  const adopted = getAdoptedActions();
  const totalSavings = adopted.reduce((sum, id) => {
    const a = ACTIONS.find(x => x.id === id);
    return sum + (a ? a.savingsKg : 0);
  }, 0);

  t.equal(totalSavings, a1.savingsKg + a2.savingsKg,
    'total savings equals sum of adopted action savingsKg values');

  clearAll();
});

// ══════════════════════════════════════════════════════════════════════════════
// 21. CATEGORIES — data integrity
// ══════════════════════════════════════════════════════════════════════════════

await describe('data › CATEGORIES structure', (t) => {
  t.ok(Array.isArray(CATEGORIES), 'CATEGORIES is an array');
  t.equal(CATEGORIES.length, 5, 'there are exactly 5 categories');

  const expectedIds = ['transport', 'energy', 'diet', 'shopping', 'waste'];
  const actualIds = CATEGORIES.map(c => c.id).sort();
  t.deepEqual(actualIds.sort(), expectedIds.sort(), 'category IDs match expected set');

  CATEGORIES.forEach(cat => {
    t.ok(typeof cat.name === 'string' && cat.name.length > 0,
      `category "${cat.id}" has a name`);
    t.ok(typeof cat.emoji === 'string' && cat.emoji.length > 0,
      `category "${cat.id}" has an emoji`);
    t.ok(typeof cat.color === 'string' && cat.color.startsWith('#'),
      `category "${cat.id}" has a hex color`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 22. E2E SELECTORS — Contract Completeness
// ══════════════════════════════════════════════════════════════════════════════

await describe('e2e-selectors › SELECTORS object is frozen', (t) => {
  t.ok(Object.isFrozen(SELECTORS), 'SELECTORS top-level is frozen');
});

await describe('e2e-selectors › required sections exist', (t) => {
  const requiredSections = ['NAV', 'HERO', 'CALCULATOR', 'DASHBOARD', 'ACTIONS',
                            'CHALLENGES', 'EDUCATION', 'PLEDGES', 'GLOBAL'];
  requiredSections.forEach(section => {
    t.ok(typeof SELECTORS[section] === 'object' && SELECTORS[section] !== null,
      `SELECTORS.${section} is defined`);
  });
});

await describe('e2e-selectors › key selector values are non-empty strings', (t) => {
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
    const val = SELECTORS[section][key];
    t.ok(typeof val === 'string' && val.length > 0,
      `SELECTORS.${section}.${key} is a non-empty string`);
  });
});

await describe('e2e-selectors › sel() helper generates correct CSS selector', (t) => {
  t.equal(sel('calc-live-total'),
    '[data-testid="calc-live-total"]',
    'sel() wraps value in data-testid attribute selector');

  t.equal(sel(SELECTORS.NAV.HOME),
    '[data-testid="nav-home"]',
    'sel() works with real SELECTORS value');
});

await describe('e2e-selectors › no duplicate selector values across sections', (t) => {
  const allValues = [];
  Object.values(SELECTORS).forEach(section => {
    Object.values(section).forEach(val => allValues.push(val));
  });
  const unique = new Set(allValues);
  t.equal(unique.size, allValues.length, 'all data-testid values are unique');
});

// ══════════════════════════════════════════════════════════════════════════════
// 23. SECURITY — XSS prevention via escapeHTML
// ══════════════════════════════════════════════════════════════════════════════

await describe('security › XSS via escapeHTML', (t) => {
  const payloads = [
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '"><script>alert(document.cookie)</script>',
    "' OR '1'='1",
    '{{constructor.constructor("alert(1)")()}}',
  ];

  payloads.forEach(payload => {
    const escaped = escapeHTML(payload);
    t.ok(!escaped.includes('<script'), `payload "${payload.slice(0,20)}..." has no <script`);
    t.ok(!escaped.includes('onerror'), `payload has no onerror`);
    t.ok(!escaped.includes('onload'), `payload has no onload`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Done — results exported via summary()
// ══════════════════════════════════════════════════════════════════════════════
