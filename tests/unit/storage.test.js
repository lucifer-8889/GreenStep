/**
 * @fileoverview Unit tests for storage.js
 * Covers: profile CRUD, schema validation, history upsert,
 * pledge CRUD & validation, action toggling, streaks, achievements,
 * export/import, storage usage, clearAll
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveProfile, getProfile, getHistory,
  savePledge, removePledge, getPledges,
  toggleAction, getAdoptedActions,
  getStreakData, completeChallenge, isChallengeCompletedToday, getChallengeLog,
  unlockAchievement, getUnlockedAchievements,
  exportData, importData, clearAll, getStorageUsage,
} from '../../js/storage.js';

// Clean slate before each test
beforeEach(() => {
  clearAll();
});

// ─── Profile ─────────────────────────────────────────────────────────────────

describe('saveProfile / getProfile', () => {
  it('returns null when no profile saved', () => {
    expect(getProfile()).toBeNull();
  });

  it('saves and retrieves a profile', () => {
    const profile = {
      total: 5000,
      categories: { transport: 1000, energy: 1500, diet: 2000, shopping: 300, waste: 200 },
    };
    saveProfile(profile);

    const loaded = getProfile();
    expect(loaded).not.toBeNull();
    expect(loaded.total).toBe(5000);
    expect(loaded.categories.diet).toBe(2000);
  });

  it('rejects corrupt profile with non-numeric total', () => {
    localStorage.setItem('ecotrack_profile', JSON.stringify({ total: 'not-a-number', categories: {} }));
    expect(getProfile()).toBeNull();
  });

  it('rejects profile with Infinity total', () => {
    localStorage.setItem('ecotrack_profile', JSON.stringify({ total: Infinity, categories: {} }));
    expect(getProfile()).toBeNull();
  });

  it('handles malformed JSON gracefully', () => {
    localStorage.setItem('ecotrack_profile', 'this is not json{{{');
    expect(getProfile()).toBeNull();
  });

  it('does not save profile with missing total', () => {
    saveProfile({ categories: {} });
    // saveProfile guards against missing total, so getProfile returns null
    expect(getProfile()).toBeNull();
  });
});

// ─── History ─────────────────────────────────────────────────────────────────

describe('getHistory — monthly upsert', () => {
  it('creates one history entry on first save', () => {
    saveProfile({ total: 4000, categories: { transport: 1000, energy: 800, diet: 1200, shopping: 600, waste: 400 } });
    expect(getHistory().length).toBe(1);
  });

  it('upserts same-month entries instead of duplicating', () => {
    saveProfile({ total: 4000, categories: { transport: 1000, energy: 800, diet: 1200, shopping: 600, waste: 400 } });
    saveProfile({ total: 4500, categories: { transport: 1100, energy: 900, diet: 1200, shopping: 600, waste: 700 } });

    const history = getHistory();
    expect(history.length).toBe(1);
    expect(history[0].total).toBe(4500);
  });

  it('returns empty array when no history', () => {
    expect(getHistory()).toEqual([]);
  });
});

// ─── Pledges ─────────────────────────────────────────────────────────────────

describe('pledge CRUD', () => {
  it('starts with empty pledge list', () => {
    expect(getPledges()).toEqual([]);
  });

  it('saves a pledge', () => {
    savePledge({ id: 'p1', text: 'Go vegan', savingsKg: 600, emoji: '🌱' });
    expect(getPledges().length).toBe(1);
    expect(getPledges()[0].id).toBe('p1');
  });

  it('is idempotent — does not add duplicate pledges', () => {
    const pledge = { id: 'p1', text: 'Go vegan', savingsKg: 600, emoji: '🌱' };
    savePledge(pledge);
    savePledge(pledge);
    expect(getPledges().length).toBe(1);
  });

  it('adds multiple distinct pledges', () => {
    savePledge({ id: 'p1', text: 'Go vegan', savingsKg: 600, emoji: '🌱' });
    savePledge({ id: 'p2', text: 'Cycle to work', savingsKg: 200, emoji: '🚲' });
    expect(getPledges().length).toBe(2);
  });

  it('removes a pledge by ID', () => {
    savePledge({ id: 'p1', text: 'Go vegan', savingsKg: 600, emoji: '🌱' });
    savePledge({ id: 'p2', text: 'Cycle to work', savingsKg: 200, emoji: '🚲' });

    removePledge('p1');
    expect(getPledges().length).toBe(1);
    expect(getPledges()[0].id).toBe('p2');
  });
});

describe('savePledge validation', () => {
  it('rejects null pledge', () => {
    savePledge(null);
    expect(getPledges().length).toBe(0);
  });

  it('rejects pledge with empty id', () => {
    savePledge({ id: '', text: 'test', savingsKg: 10 });
    expect(getPledges().length).toBe(0);
  });

  it('rejects pledge with non-numeric savingsKg', () => {
    savePledge({ id: 'x', text: 'test', savingsKg: 'not-a-number' });
    expect(getPledges().length).toBe(0);
  });
});

// ─── Actions ─────────────────────────────────────────────────────────────────

describe('toggleAction', () => {
  it('starts with empty adopted actions', () => {
    expect(getAdoptedActions()).toEqual([]);
  });

  it('adopts an action', () => {
    toggleAction('action-car-free');
    expect(getAdoptedActions()).toContain('action-car-free');
  });

  it('adds multiple actions', () => {
    toggleAction('action-car-free');
    toggleAction('action-solar');
    expect(getAdoptedActions().length).toBe(2);
  });

  it('un-adopts on second toggle', () => {
    toggleAction('action-car-free');
    toggleAction('action-car-free');
    expect(getAdoptedActions()).not.toContain('action-car-free');
    expect(getAdoptedActions().length).toBe(0);
  });
});

// ─── Streaks & Challenges ────────────────────────────────────────────────────

describe('streaks and challenge completion', () => {
  it('starts with zero streak', () => {
    const initial = getStreakData();
    expect(initial.currentStreak).toBe(0);
    expect(initial.totalCompleted).toBe(0);
  });

  it('increments streak on first completion', () => {
    const result = completeChallenge('challenge-1');
    expect(result.currentStreak).toBe(1);
    expect(result.totalCompleted).toBe(1);
  });

  it('does not increment streak on same-day completion', () => {
    completeChallenge('challenge-1');
    const result2 = completeChallenge('challenge-1');
    expect(result2.currentStreak).toBe(1);
    expect(result2.totalCompleted).toBe(1);
  });

  it('reports challenge as completed today', () => {
    completeChallenge('challenge-1');
    expect(isChallengeCompletedToday()).toBe(true);
  });

  it('logs challenge completion', () => {
    completeChallenge('challenge-1');
    const log = getChallengeLog();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].id).toBe('challenge-1');
  });
});

// ─── Achievements ────────────────────────────────────────────────────────────

describe('achievements', () => {
  it('starts with no achievements', () => {
    expect(getUnlockedAchievements()).toEqual([]);
  });

  it('returns true on first unlock (newly unlocked)', () => {
    expect(unlockAchievement('streak-7')).toBe(true);
    expect(getUnlockedAchievements()).toContain('streak-7');
  });

  it('returns false on duplicate unlock', () => {
    unlockAchievement('streak-7');
    expect(unlockAchievement('streak-7')).toBe(false);
    expect(getUnlockedAchievements().length).toBe(1);
  });

  it('stores multiple distinct achievements', () => {
    unlockAchievement('streak-7');
    unlockAchievement('eco-hero');
    expect(getUnlockedAchievements().length).toBe(2);
  });
});

// ─── Export / Import ─────────────────────────────────────────────────────────

describe('exportData / importData', () => {
  it('exports a valid JSON string', () => {
    savePledge({ id: 'p-test', text: 'Test pledge', savingsKg: 100, emoji: '🌿' });
    toggleAction('action-test');
    unlockAchievement('first-pledge');

    const json = exportData();
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes pledges and achievements in export', () => {
    savePledge({ id: 'p-test', text: 'Test pledge', savingsKg: 100, emoji: '🌿' });
    unlockAchievement('first-pledge');

    const parsed = JSON.parse(exportData());
    expect(Array.isArray(parsed.pledges)).toBe(true);
    expect(Array.isArray(parsed.achievements)).toBe(true);
  });

  it('restores data after clear and reimport', () => {
    savePledge({ id: 'p-test', text: 'Test pledge', savingsKg: 100, emoji: '🌿' });
    unlockAchievement('first-pledge');

    const json = exportData();
    clearAll();
    expect(getPledges()).toEqual([]);

    const success = importData(json);
    expect(success).toBe(true);
    expect(getPledges().length).toBe(1);
    expect(getUnlockedAchievements()).toContain('first-pledge');
  });

  it('rejects invalid JSON', () => {
    expect(importData('not json')).toBe(false);
  });

  it('rejects array top-level', () => {
    expect(importData('[]')).toBe(false);
  });

  it('rejects null top-level', () => {
    expect(importData('null')).toBe(false);
  });

  it('rejects primitive string', () => {
    expect(importData('"string"')).toBe(false);
  });
});

// ─── Storage Usage ───────────────────────────────────────────────────────────

describe('getStorageUsage', () => {
  it('reports zero keys and bytes after clearAll', () => {
    const usage = getStorageUsage();
    expect(usage.keys).toBe(0);
    expect(usage.usedBytes).toBe(0);
  });

  it('reports positive usage after saving data', () => {
    saveProfile({ total: 3000, categories: { transport: 600, energy: 600, diet: 600, shopping: 600, waste: 600 } });
    const usage = getStorageUsage();
    expect(usage.keys).toBeGreaterThanOrEqual(1);
    expect(usage.usedBytes).toBeGreaterThan(0);
  });
});

// ─── clearAll ────────────────────────────────────────────────────────────────

describe('clearAll', () => {
  it('clears all stored data', () => {
    savePledge({ id: 'c1', text: 'foo', savingsKg: 10, emoji: '🌿' });
    toggleAction('test-action');
    saveProfile({ total: 1000, categories: { transport: 200, energy: 200, diet: 200, shopping: 200, waste: 200 } });

    clearAll();

    expect(getPledges()).toEqual([]);
    expect(getAdoptedActions()).toEqual([]);
    expect(getProfile()).toBeNull();
  });
});
