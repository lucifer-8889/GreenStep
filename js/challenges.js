/**
 * @module challenges
 * @fileoverview Daily eco-challenges, streak tracking, and achievement badges
 * with gamification mechanics. Challenges rotate deterministically by date.
 */

import { DAILY_CHALLENGES, ACHIEVEMENTS } from './data.js';
import {
  getStreakData, completeChallenge, isChallengeCompletedToday,
  getUnlockedAchievements, unlockAchievement, getAdoptedActions
} from './storage.js';
import { escapeHTML, announce, prefersReducedMotion } from './utils.js';

/**
 * Announces a newly unlocked achievement to screen readers.
 * @param {string} achievementId - The ID of the unlocked achievement
 */
function announceAchievement(achievementId) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (achievement) {
    announce(`Achievement unlocked: ${achievement.name}! ${achievement.desc}`, 'assertive');
  }
}

/** Initializes challenges and sets up cross-module achievement listeners. */
export function initChallenges() {
  renderChallenges();
  setupAchievementListeners();
}

/**
 * Returns today's challenge using date-seeded deterministic selection.
 * @returns {Object} Challenge object from DAILY_CHALLENGES
 */
function getTodayChallenge() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = seed % DAILY_CHALLENGES.length;
  return DAILY_CHALLENGES[idx];
}

/** Renders the challenges section: today's challenge, streak stats, and badges. */
export function renderChallenges() {
  const container = document.getElementById('challenges-content');
  if (!container) return;

  const challenge = getTodayChallenge();
  const completed = isChallengeCompletedToday();
  const streak = getStreakData();
  const unlocked = getUnlockedAchievements();

  container.innerHTML = `
    <!-- Today's Challenge -->
    <div class="challenges__today anim-fade-in-up visible">
      <div class="challenge-card ${completed ? 'anim-pulse-glow' : ''}" role="article" aria-label="Today's eco challenge" data-testid="challenge-today">
        <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sp-4);">
          Today's Eco Challenge
        </div>
        <div class="challenge-card__emoji" aria-hidden="true">${challenge.emoji}</div>
        <h3 class="challenge-card__title">${escapeHTML(challenge.title)}</h3>
        <p class="challenge-card__desc">${escapeHTML(challenge.desc)}</p>
        <div class="challenge-card__impact">
          <i data-lucide="leaf" style="width:14px;height:14px" aria-hidden="true"></i>
          Saves ${challenge.impactKg} kg CO₂
        </div>
        ${completed ? `
          <div style="margin-top:var(--sp-4);">
            <span class="tag tag--green" style="font-size:var(--fs-sm);padding:var(--sp-2) var(--sp-5);" data-testid="challenge-completed">
              ✅ Completed Today!
            </span>
          </div>
        ` : `
          <button class="btn btn--primary btn--lg" onclick="window.EcoTrack.completeChallenge('${challenge.id}')"
            style="margin-top:var(--sp-4);"
            aria-label="Mark today's challenge as complete: ${escapeHTML(challenge.title)}"
            data-testid="challenge-complete-btn">
            <i data-lucide="check" style="width:18px;height:18px" aria-hidden="true"></i>
            Mark Complete
          </button>
        `}
      </div>
    </div>

    <!-- Streak Display -->
    <div class="challenges__streak anim-fade-in-up visible" role="group" aria-label="Challenge statistics" data-testid="challenge-streak">
      <div class="streak-display">
        <div class="streak-display__number" aria-label="Current streak: ${streak.currentStreak} days">${streak.currentStreak}</div>
        <div class="streak-display__label">Current Streak 🔥</div>
      </div>
      <div class="streak-display">
        <div class="streak-display__number" style="background:linear-gradient(135deg,#f59e0b,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;" aria-label="Longest streak: ${streak.longestStreak} days">${streak.longestStreak}</div>
        <div class="streak-display__label">Longest Streak ⭐</div>
      </div>
      <div class="streak-display">
        <div class="streak-display__number" style="background:linear-gradient(135deg,#a78bfa,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;" aria-label="Total completed: ${streak.totalCompleted}">${streak.totalCompleted}</div>
        <div class="streak-display__label">Total Completed 🏅</div>
      </div>
    </div>

    <!-- Achievement Badges -->
    <div style="text-align:center;margin-bottom:var(--sp-6);">
      <h3 style="font-size:var(--fs-xl);font-weight:var(--fw-bold);margin-bottom:var(--sp-2);">Achievements</h3>
      <p style="color:var(--clr-text-secondary);font-size:var(--fs-sm);">Complete challenges and adopt actions to unlock badges</p>
    </div>
    <div class="challenges__badges stagger-children" role="list" aria-label="Achievement badges">
      ${ACHIEVEMENTS.map(a => {
        const isUnlocked = unlocked.includes(a.id);
        return `
          <div class="badge anim-fade-in-up visible" role="listitem" data-testid="badge-${a.id}">
            <div class="badge__icon badge__icon--${isUnlocked ? a.tier : 'locked'}"
              ${isUnlocked ? 'style="animation: badge-unlock 0.6s ease both;"' : ''}
              aria-hidden="true">
              ${isUnlocked ? a.emoji : '🔒'}
            </div>
            <div class="badge__name">${escapeHTML(a.name)}</div>
            <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);max-width:100px;">${escapeHTML(a.desc)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Handles challenge completion: updates streak, checks achievements,
 * shows celebration, and announces to screen readers.
 * @param {string} challengeId - Challenge identifier
 */
export function handleCompleteChallenge(challengeId) {
  if (isChallengeCompletedToday()) return;

  const newStreak = completeChallenge(challengeId);
  const challenge = getTodayChallenge();

  checkAchievements(newStreak);

  // Accessibility: skip confetti animation if user prefers reduced motion
  if (!prefersReducedMotion()) {
    showCelebration();
  }

  window.EcoTrack.showToast('🎉 Challenge Complete!', `Streak: ${newStreak.currentStreak} days`, 'success');
  announce(`Challenge completed! ${challenge.title}. Current streak: ${newStreak.currentStreak} days.`, 'assertive');

  renderChallenges();
}

function checkAchievements(streak) {
  // Streak achievements
  if (streak.currentStreak >= 3 && unlockAchievement('streak-3')) announceAchievement('streak-3');
  if (streak.currentStreak >= 7 && unlockAchievement('streak-7')) announceAchievement('streak-7');
  if (streak.currentStreak >= 14 && unlockAchievement('streak-14')) announceAchievement('streak-14');
  if (streak.currentStreak >= 30 && unlockAchievement('streak-30')) announceAchievement('streak-30');

  // Action achievements
  const adoptedCount = getAdoptedActions().length;
  if (adoptedCount >= 3 && unlockAchievement('actions-3')) announceAchievement('actions-3');
  if (adoptedCount >= 5 && unlockAchievement('actions-5')) announceAchievement('actions-5');
  if (adoptedCount >= 10 && unlockAchievement('actions-10')) announceAchievement('actions-10');
}

function setupAchievementListeners() {
  // Listen for calc complete
  window.addEventListener('ecotrack:calc-complete', (e) => {
    unlockAchievement('first-calc');

    const totalTonnes = e.detail.total / 1000;
    if (totalTonnes < 4.7) unlockAchievement('below-avg');
    if (totalTonnes <= 2.1) unlockAchievement('paris-ready');
  });

  // Listen for action adoption
  window.addEventListener('ecotrack:actions-updated', (e) => {
    const count = e.detail.count;
    if (count >= 3) unlockAchievement('actions-3');
    if (count >= 5) unlockAchievement('actions-5');
    if (count >= 10) unlockAchievement('actions-10');
  });

  // Listen for pledge
  window.addEventListener('ecotrack:pledge-added', (e) => {
    const count = e.detail.count;
    if (count >= 1) unlockAchievement('pledge-1');
    if (count >= 5) unlockAchievement('pledge-5');
  });
}

/**
 * Shows a confetti celebration animation.
 * Efficiency: uses DocumentFragment for batch DOM insertion.
 */
function showCelebration() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  container.setAttribute('aria-hidden', 'true');

  const colors = ['#10b981', '#14b8a6', '#f59e0b', '#a78bfa', '#38bdf8', '#f87171', '#34d399'];

  // Efficiency: batch DOM operations with DocumentFragment
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background-color: ${colors[i % colors.length]};
      animation-duration: ${2 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 0.5}s;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    fragment.appendChild(piece);
  }
  container.appendChild(fragment);
  document.body.appendChild(container);

  setTimeout(() => container.remove(), 4000);
}
