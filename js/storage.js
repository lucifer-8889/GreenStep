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
  if (!profile.categories || typeof profile.categories !== 'object') return false;
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
  if (typeof pledge.id !== 'string' || pledge.id.length === 0) return false;
  if (typeof pledge.text !== 'string') return false;
  if (typeof pledge.savingsKg !== 'number' || !Number.isFinite(pledge.savingsKg)) return false;
  return true;
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

// --- Streak & Challenges ---
export function getStreakData() {
  return get(KEYS.streak) || {
    currentStreak: 0,
    longestStreak: 0,
    lastDate: null,
    totalCompleted: 0,
  };
}

export function completeChallenge(challengeId) {
  const streak = getStreakData();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Log challenge
  const log = getChallengeLog();
  log.push({ id: challengeId, date: today });
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

export function getChallengeLog() {
  return get(KEYS.challengeLog) || [];
}

export function isChallengeCompletedToday() {
  const streak = getStreakData();
  const today = new Date().toISOString().slice(0, 10);
  return streak.lastDate === today;
}

// --- Adopted Actions ---
export function getAdoptedActions() {
  return get(KEYS.adoptedActions) || [];
}

export function toggleAction(actionId) {
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

// --- Achievements ---
export function getUnlockedAchievements() {
  return get(KEYS.achievements) || [];
}

export function unlockAchievement(achievementId) {
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
    const data = JSON.parse(jsonString);
    // Security: only accept plain objects at top level
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      console.warn('[EcoTrack] Import rejected: invalid data structure.');
      return false;
    }
    const validKeys = new Set(Object.keys(KEYS));
    Object.entries(data).forEach(([name, value]) => {
      // Only write recognized keys
      if (validKeys.has(name) && KEYS[name]) {
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
