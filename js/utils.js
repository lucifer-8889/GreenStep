/* ===========================
   EcoTrack — Utility Functions
   Security, performance, and testing helpers
   =========================== */

/**
 * @fileoverview Shared utility functions for sanitization, performance
 * optimization, input validation, and testability across all modules.
 */

// ─── Security: HTML Sanitization ─────────────────────────────────────

/**
 * Escapes HTML special characters to prevent XSS injection.
 * All user-generated or dynamic text must pass through this before
 * being interpolated into innerHTML templates.
 *
 * @param {string} str - Untrusted string to sanitize
 * @returns {string} HTML-escaped safe string
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return String(str ?? '');
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validates that a value is a finite number within an optional range.
 * Returns the clamped value, or the fallback if invalid.
 *
 * @param {*} value - Value to validate
 * @param {number} fallback - Default if value is not a valid number
 * @param {number} [min=-Infinity] - Minimum allowed value
 * @param {number} [max=Infinity] - Maximum allowed value
 * @returns {number} Validated, clamped number
 */
export function safeNumber(value, fallback, min = -Infinity, max = Infinity) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * Validates that a string value is one of the allowed options.
 * Returns the fallback if the value is not in the whitelist.
 *
 * @param {string} value - Value to validate
 * @param {string[]} allowed - Array of allowed values
 * @param {string} fallback - Default if value is not allowed
 * @returns {string} Validated string
 */
export function safeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}


// ─── Performance: Debounce & Throttle ────────────────────────────────

/**
 * Debounces a function call — delays execution until after `wait` ms
 * of inactivity. Useful for scroll/resize/input handlers.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, wait) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Throttles a function call — executes at most once per `limit` ms.
 * Useful for scroll handlers that need periodic updates.
 *
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum interval in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
  let lastCall = 0;
  let timer = null;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = limit - (now - lastCall);
    clearTimeout(timer);
    if (remaining <= 0) {
      lastCall = now;
      fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        lastCall = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}


// ─── DOM Helpers ─────────────────────────────────────────────────────

/**
 * Safely queries a DOM element by ID. Returns null if not found.
 *
 * @param {string} id - Element ID to query
 * @returns {HTMLElement|null}
 */
export function getById(id) {
  return document.getElementById(id);
}

/**
 * Checks whether the user prefers reduced motion.
 * Used to disable animations for accessibility.
 *
 * @returns {boolean} true if user prefers reduced motion
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Creates a unique data-testid attribute string.
 * Standardizes test identifiers across the app.
 *
 * @param {string} section - Section name (e.g., 'calculator')
 * @param {string} element - Element name (e.g., 'next-btn')
 * @returns {string} data-testid attribute string
 */
export function testId(section, element) {
  return `data-testid="${section}-${element}"`;
}

/**
 * Formats a number for display with locale-aware separators.
 *
 * @param {number} num - Number to format
 * @param {number} [decimals=0] - Decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(num, decimals = 0) {
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Generates ARIA-friendly date string.
 *
 * @param {string|Date} date - Date to format
 * @returns {string} Human-readable date string
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


// ─── Accessibility Helpers ───────────────────────────────────────────

/**
 * Announces a message to screen readers via a live region.
 * Creates an aria-live element if it doesn't exist.
 *
 * @param {string} message - Message to announce
 * @param {'polite'|'assertive'} [priority='polite'] - ARIA live priority
 */
export function announce(message, priority = 'polite') {
  let liveRegion = getById('aria-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  liveRegion.setAttribute('aria-live', priority);
  // Clear then set to trigger announcement
  liveRegion.textContent = '';
  requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

/**
 * Traps keyboard focus within a container element.
 * Useful for modals and wizard panels.
 *
 * @param {HTMLElement} container - Container to trap focus within
 * @param {KeyboardEvent} event - Keyboard event
 */
export function trapFocus(container, event) {
  if (event.key !== 'Tab') return;

  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
