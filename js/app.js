/**
 * @module app
 * @fileoverview Main application controller for EcoTrack.
 * Handles navigation, global event binding, scroll-based UI updates,
 * accessibility (keyboard nav, ARIA), and toast notifications.
 */

import { initCalculator, handleInput, nextStep, prevStep } from './calculator.js';
import { initDashboard, renderDashboard } from './dashboard.js';
import { initActions, renderActions, filterActions, handleToggleAction } from './actions.js';
import { initChallenges, renderChallenges, handleCompleteChallenge } from './challenges.js';
import { initEducation, goToFact } from './education.js';
import { initPledges, renderPledges, handleTogglePledge, handleRemovePledge } from './pledges.js';
import { escapeHTML, throttle, prefersReducedMotion, announce } from './utils.js';

// ─── Global API ──────────────────────────────────────────────────────
// Exposed to the window for inline onclick handlers.
// All functions here are thin wrappers — logic lives in modules.
window.EcoTrack = Object.freeze({
  navigateTo,
  calcInput: handleInput,
  calcNext: nextStep,
  calcPrev: prevStep,
  filterActions,
  toggleActionAdopt: handleToggleAction,
  completeChallenge: handleCompleteChallenge,
  togglePledge: handleTogglePledge,
  removePledge: handleRemovePledge,
  goToFact,
  showToast,
});

// ─── Initialization ────────────────────────────────────────────────────────
// Efficiency: { once: true } ensures listener is auto-removed after first call
document.addEventListener('DOMContentLoaded', () => {
  try {
    initNavbar();
    initScrollAnimations();
    initKeyboardNavigation();
    initCalculator();
    initDashboard();
    initActions();
    initChallenges();
    initEducation();
    initPledges();

    // Init Lucide icons
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    // Code Quality: error boundary prevents a single module failure
    // from breaking the entire application
    console.error('[EcoTrack] Initialization error:', err);
  }
}, { once: true });


// ─── Navigation ──────────────────────────────────────────────────────

/**
 * Smooth-scrolls to a section and re-renders its dynamic content.
 * @param {string} sectionId - ID of the target section element
 */
function navigateTo(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const navHeight = document.querySelector('.navbar')?.offsetHeight || 72;
  const top = section.getBoundingClientRect().top + window.scrollY - navHeight - 20;
  window.scrollTo({
    top,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });

  // Update active link
  document.querySelectorAll('.navbar__link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });

  // Re-render data-dependent sections
  const renderers = { dashboard: renderDashboard, actions: renderActions, challenges: renderChallenges, pledges: renderPledges };
  if (renderers[sectionId]) renderers[sectionId]();

  // Move focus to the section heading for keyboard/screen reader users
  const heading = section.querySelector('h1, h2, h3');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}


// ─── Navbar ──────────────────────────────────────────────────────────

/** Initializes navbar scroll effect, mobile toggle, and link handlers. */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const toggle = document.getElementById('mobile-menu-toggle');
  const links = document.getElementById('navbar-links');

  // Efficiency: throttled scroll handler instead of raw scroll listener
  const onScroll = throttle(() => {
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
    updateActiveSection();
  }, 100);

  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile toggle with ARIA
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      // Accessibility: update aria-expanded state
      toggle.setAttribute('aria-expanded', String(isOpen));
      const icon = toggle.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // Close mobile menu on link click
    links.querySelectorAll('.navbar__link').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Accessibility: close menu on Escape key
    links.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Nav link clicks
  document.querySelectorAll('.navbar__link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  });
}

/** Updates the active nav link based on current scroll position. */
function updateActiveSection() {
  const sections = document.querySelectorAll('section[id]');
  const navHeight = 100;

  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - navHeight;
    if (window.scrollY >= top) {
      current = section.id;
    }
  });

  document.querySelectorAll('.navbar__link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === current);
  });
}


// ─── Keyboard Navigation ─────────────────────────────────────────────

/**
 * Global keyboard shortcuts for power users:
 * - Alt+1..7: Jump to sections
 * - Escape: Close any open mobile menu
 */
function initKeyboardNavigation() {
  const sectionIds = ['hero', 'calculator', 'dashboard', 'actions', 'challenges', 'education', 'pledges'];

  document.addEventListener('keydown', (e) => {
    // Alt + number keys for section navigation
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= sectionIds.length) {
        e.preventDefault();
        navigateTo(sectionIds[num - 1]);
      }
    }
  });
}


// ─── Scroll Animations (Intersection Observer) ──────────────────────

/**
 * Uses IntersectionObserver to trigger CSS animations when elements
 * scroll into view. Skips if user prefers reduced motion.
 */
function initScrollAnimations() {
  // Accessibility: skip animations if user prefers reduced motion
  if (prefersReducedMotion()) {
    document.querySelectorAll('.anim-fade-in-up, .anim-fade-in-left, .anim-fade-in-right, .anim-scale-in, .reveal').forEach(el => {
      el.classList.add('visible');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Efficiency: stop observing once animated
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  document.querySelectorAll('.anim-fade-in-up, .anim-fade-in-left, .anim-fade-in-right, .anim-scale-in, .reveal').forEach(el => {
    observer.observe(el);
  });
}


// ─── Toast Notification ─────────────────────────────────────────────

/**
 * Shows a toast notification with auto-dismiss.
 * Security: title and message are HTML-escaped to prevent XSS.
 *
 * @param {string} title - Toast heading
 * @param {string} message - Toast body
 * @param {'success'|'info'|'warning'} [type='success'] - Visual style
 */
function showToast(title, message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  // Security: whitelist allowed types
  const validTypes = ['success', 'info', 'warning'];
  const safeType = validTypes.includes(type) ? type : 'success';

  const iconMap = { success: 'check-circle', info: 'info', warning: 'alert-triangle' };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('data-testid', 'toast-notification');

  // Security: escape dynamic text to prevent XSS
  toast.innerHTML = `
    <div class="toast__icon toast__icon--${safeType}" aria-hidden="true">
      <i data-lucide="${iconMap[safeType]}" style="width:20px;height:20px"></i>
    </div>
    <div class="toast__content">
      <div class="toast__title">${escapeHTML(title)}</div>
      <div class="toast__message">${escapeHTML(message)}</div>
    </div>
    <button class="btn btn--ghost btn--icon btn--sm" onclick="this.closest('.toast').remove()" aria-label="Dismiss notification" data-testid="toast-dismiss">
      <i data-lucide="x" style="width:16px;height:16px" aria-hidden="true"></i>
    </button>
  `;

  document.body.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  // Trigger show animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto dismiss after 4 seconds
  const dismissTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);

  // Allow manual dismiss to clear timer (efficiency: prevent orphaned timers)
  toast.addEventListener('click', () => clearTimeout(dismissTimer), { once: true });
}
