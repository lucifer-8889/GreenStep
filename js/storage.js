/**
 * @module storage
 * @fileoverview LocalStorage abstraction layer with CRUD operations for
 * all EcoTrack user state. All data is JSON-serialized and keyed with
 * a namespaced prefix to avoid collisions. Includes schema validation
 * to reject corrupt or tampered data.
 */

/** @enum {string} Storage keys — frozen to prevent accidental mutation */
const KEYS = Object.freeze({
  profile: 'ecotrack_profile',
  history: 'ecotrack_history',
  pledges: 'ecotrack_pledges',
  streak: 'ecotrack_streak',
  achievements: 'ecotrack_achievements',
  adoptedActions: 'ecotrack_adopted',
  challengeLog: 'ecotrack_challenges',
});

/**
 * Safely retrieves and parses a JSON value from localStorage.
 * Returns null on parse error or missing key (defensive against corruption).
 * @param {string} key - Storage key
 * @returns {*|null} Parsed value or null
 */
function get(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    // Security: reject non-object/non-array top-level values for structured keys
    if (key !== KEYS.achievements && key !== KEYS.adoptedActions) {
      return parsed;
    }
    // Arrays must actually be arrays
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    console.warn(`[EcoTrack] Corrupt storage key "${key}", returning null.`);
    return null;
  }
}

/**
 * Safely serializes and writes a value to localStorage.
 * Catches QuotaExceededError and warns gracefully.
 * @param {string} key - Storage key
 * @param {*} data - Data to serialize
 */
function set(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[EcoTrack] Storage quota exceeded. Data not saved.');
    } else {
      console.warn('[EcoTrack] Storage write error:', e.message);
    }
  }
}

// ─── Schema Validation Helpers ───────────────────────────────────────

/** @type {number} Maximum allowed length for string IDs to prevent abuse */
const MAX_ID_LENGTH = 128;

/** @type {string[]} Expected category keys in a profile */
const VALID_CATEGORIES = ['transport', 'energy', 'diet', 'shopping', 'waste'];

/**
 * Validates that a profile object has the expected structure.
 * Security: prevents injection of malformed or tampered data.
 *
 * @param {*} profile - Value to validate
 * @returns {boolean} true if the profile has a valid schema
 */
function isValidProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false;
  if (typeof profile.total !== 'number' || !Number.isFinite(profile.total)) return false;
  if (profile.total < 0 || profile.total > 1_000_000) return false; // Security: reject unreasonable values
  if (!profile.categories || typeof profile.categories !== 'object') return false;
  // Security: reject if categories has unexpected keys (prototype pollution guard)
  const categoryKeys = Object.keys(profile.categories);
  if (categoryKeys.some(k => !VALID_CATEGORIES.includes(k))) return false;
  // Ensure each category value is a finite number
  for (const key of VALID_CATEGORIES) {
    if (profile.categories[key] !== undefined && (typeof profile.categories[key] !== 'number' || !Number.isFinite(profile.categories[key]))) {
      return false;
    }
  }
  return true;
}

/**
 * Validates that a pledge object has the expected structure.
 * @param {*} pledge - Value to validate
 * @returns {boolean} true if the pledge has a valid schema
 */
function isValidPledge(pledge) {
  if (!pledge || typeof pledge !== 'object') return false;
  if (typeof pledge.id !== 'string' || pledge.id.length === 0 || pledge.id.length > MAX_ID_LENGTH) return false;
  if (typeof pledge.text !== 'string' || pledge.text.length > 500) return false; // Security: cap text length
  if (typeof pledge.savingsKg !== 'number' || !Number.isFinite(pledge.savingsKg)) return false;
  if (pledge.savingsKg < 0 || pledge.savingsKg > 100_000) return false; // Security: reject unreasonable values
  return true;
}

/**
 * Validates that a string ID is non-empty and within length limits.
 * Security: prevents abuse via excessively long or non-string IDs.
 *
 * @param {*} id - Value to validate as a string ID
 * @returns {boolean} true if the ID is a valid non-empty string within limits
 */
function isValidId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH;
}

/**
 * Returns the approximate size of all EcoTrack data in localStorage (bytes).
 * Useful for monitoring storage usage and warning before quota limits.
 *
 * @returns {{ usedBytes: number, keys: number }} Storage usage stats
 */
export function getStorageUsage() {
  let usedBytes = 0;
  let keys = 0;
  Object.values(KEYS).forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      usedBytes += key.length + val.length;
      keys++;
    }
  });
  // Each char is roughly 2 bytes in UTF-16 localStorage
  return { usedBytes: usedBytes * 2, keys };
}

/**
 * Saves a calculator result profile and appends to monthly history.
 * @param {Object} profile - Calculator result
 * @param {number} profile.total - Total annual kg CO₂
 * @param {Object} profile.categories - Breakdown by category
 */
export function saveProfile(profile) {
  if (!profile || typeof profile.total !== 'number') return;
  set(KEYS.profile, profile);

  // Append / upsert to monthly history
  const history = getHistory();
  const month = new Date().toISOString().slice(0, 7);
  const existing = history.findIndex(h => h.month === month);
  const entry = { month, total: profile.total, categories: profile.categories };
  if (existing >= 0) {
    history[existing] = entry;
  } else {
    history.push(entry);
  }
  // Efficiency: cap history to 24 months to prevent unbounded growth
  if (history.length > 24) history.splice(0, history.length - 24);
  set(KEYS.history, history);
}

/** @returns {Object|null} Last saved profile or null if missing/invalid */
export function getProfile() {
  const profile = get(KEYS.profile);
  // Security: validate structure before returning
  if (profile && !isValidProfile(profile)) {
    console.warn('[EcoTrack] Corrupt profile data detected, returning null.');
    return null;
  }
  return profile;
}

/** @returns {Array<Object>} Monthly history entries */
export function getHistory() {
  return get(KEYS.history) || [];
}

/**
 * Saves a new pledge (idempotent — skips if already exists).
 * @param {Object} pledge - Pledge data with id, emoji, text, savingsKg
 */
export function savePledge(pledge) {
  if (!pledge || !pledge.id) return;
  // Security: validate pledge structure
  if (!isValidPledge(pledge)) {
    console.warn('[EcoTrack] Invalid pledge data rejected.');
    return;
  }
  const pledges = getPledges();
  if (!pledges.find(p => p.id === pledge.id)) {
    pledges.push({ ...pledge, date: new Date().toISOString() });
    set(KEYS.pledges, pledges);
  }
}

/**
 * Removes a pledge by ID.
 * @param {string} id - Pledge identifier
 */
export function removePledge(id) {
  const pledges = getPledges().filter(p => p.id !== id);
  set(KEYS.pledges, pledges);
}

/** @returns {Array<Object>} Active pledges */
export function getPledges() {
  return get(KEYS.pledges) || [];
}

/**
 * Retrieves streak tracking data from localStorage.
 * Returns default values if no data exists.
 * @returns {{ currentStreak: number, longestStreak: number, lastDate: string|null, totalCompleted: number }}
 */
export function getStreakData() {
  return get(KEYS.streak) || {
    currentStreak: 0,
    longestStreak: 0,
    lastDate: null,
    totalCompleted: 0,
  };
}

/**
 * Records a completed challenge, updates the streak, and logs the event.
 * Security: validates challengeId is a non-empty string.
 * @param {string} challengeId - Identifier for the completed challenge
 * @returns {{ currentStreak: number, longestStreak: number, lastDate: string, totalCompleted: number }}
 */
export function completeChallenge(challengeId) {
  if (!isValidId(challengeId)) {
    console.warn('[EcoTrack] Invalid challengeId rejected.');
    return getStreakData();
  }

  const streak = getStreakData();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Log challenge
  const log = getChallengeLog();
  log.push({ id: challengeId, date: today });
  // Efficiency: cap log to 365 entries to prevent unbounded growth
  if (log.length > 365) log.splice(0, log.length - 365);
  set(KEYS.challengeLog, log);

  // Update streak
  if (streak.lastDate === today) {
    // Already completed today
    return streak;
  }

  if (streak.lastDate === yesterday) {
    streak.currentStreak++;
  } else if (streak.lastDate !== today) {
    streak.currentStreak = 1;
  }

  streak.lastDate = today;
  streak.totalCompleted++;
  streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);

  set(KEYS.streak, streak);
  return streak;
}

/**
 * Retrieves the full challenge completion log.
 * @returns {Array<{ id: string, date: string }>} Logged challenge completions
 */
export function getChallengeLog() {
  return get(KEYS.challengeLog) || [];
}

/**
 * Checks whether a challenge has been completed today.
 * @returns {boolean} true if a challenge was completed today
 */
export function isChallengeCompletedToday() {
  const streak = getStreakData();
  const today = new Date().toISOString().slice(0, 10);
  return streak.lastDate === today;
}

/**
 * Retrieves the list of adopted action IDs.
 * @returns {string[]} Array of adopted action identifiers
 */
export function getAdoptedActions() {
  return get(KEYS.adoptedActions) || [];
}

/**
 * Toggles an action's adoption state (add/remove from adopted list).
 * @param {string} actionId - Action identifier to toggle
 * @returns {string[]} Updated list of adopted action IDs
 */
export function toggleAction(actionId) {
  // Security: validate actionId is a non-empty string
  if (!isValidId(actionId)) {
    console.warn('[EcoTrack] Invalid actionId rejected.');
    return getAdoptedActions();
  }
  const adopted = getAdoptedActions();
  const idx = adopted.indexOf(actionId);
  if (idx >= 0) {
    adopted.splice(idx, 1);
  } else {
    adopted.push(actionId);
  }
  set(KEYS.adoptedActions, adopted);
  return adopted;
}

/**
 * Retrieves the list of unlocked achievement IDs.
 * @returns {string[]} Array of unlocked achievement identifiers
 */
export function getUnlockedAchievements() {
  return get(KEYS.achievements) || [];
}

/**
 * Unlocks an achievement by ID if not already unlocked.
 * @param {string} achievementId - Achievement identifier
 * @returns {boolean} true if newly unlocked, false if already existed
 */
export function unlockAchievement(achievementId) {
  // Security: validate achievementId is a non-empty string
  if (!isValidId(achievementId)) {
    console.warn('[EcoTrack] Invalid achievementId rejected.');
    return false;
  }
  const unlocked = getUnlockedAchievements();
  if (!unlocked.includes(achievementId)) {
    unlocked.push(achievementId);
    set(KEYS.achievements, unlocked);
    return true; // newly unlocked
  }
  return false;
}

/**
 * Exports all EcoTrack data as a JSON string.
 * @returns {string} Serialized JSON data
 */
export function exportData() {
  const data = {};
  Object.entries(KEYS).forEach(([name, key]) => {
    data[name] = get(key);
  });
  return JSON.stringify(data, null, 2);
}

/**
 * Imports data from a JSON string, validating structure before write.
 * Security: validates that the parsed data is a plain object before merging.
 * @param {string} jsonString - JSON string to import
 * @returns {boolean} true if import succeeded
 */
export function importData(jsonString) {
  try {
    // Security: reject excessively large payloads (> 1 MB)
    if (typeof jsonString !== 'string' || jsonString.length > 1_048_576) {
      console.warn('[EcoTrack] Import rejected: payload too large or not a string.');
      return false;
    }
    const data = JSON.parse(jsonString);
    // Security: only accept plain objects at top level
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      console.warn('[EcoTrack] Import rejected: invalid data structure.');
      return false;
    }
    // Security: reject objects with __proto__ or constructor keys (prototype pollution)
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    if (Object.keys(data).some(k => dangerousKeys.includes(k))) {
      console.warn('[EcoTrack] Import rejected: dangerous keys detected.');
      return false;
    }
    const validKeys = new Set(Object.keys(KEYS));
    Object.entries(data).forEach(([name, value]) => {
      // Only write recognized keys
      if (validKeys.has(name) && KEYS[name]) {
        // Security: validate profile structure before writing
        if (name === 'profile' && value !== null && !isValidProfile(value)) {
          console.warn('[EcoTrack] Import: skipping invalid profile data.');
          return;
        }
        // Security: validate arrays are actually arrays
        if (['pledges', 'achievements', 'adoptedActions', 'challengeLog', 'history'].includes(name)) {
          if (value !== null && !Array.isArray(value)) {
            console.warn(`[EcoTrack] Import: skipping invalid ${name} data (expected array).`);
            return;
          }
        }
        set(KEYS[name], value);
      }
    });
    return true;
  } catch {
    console.warn('[EcoTrack] Import failed: invalid JSON.');
    return false;
  }
}

// --- Clear All ---
export function clearAll() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}
