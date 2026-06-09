/**
 * @fileoverview Education hub with auto-rotating fact carousel and
 * deep-dive comparison cards. Provides interactive climate literacy.
 */

import { ECO_FACTS, EDU_CARDS } from './data.js';
import { escapeHTML, announce, prefersReducedMotion } from './utils.js';

let currentFact = 0;
let factInterval = null;

/** Initializes the education section and starts the carousel. */
export function initEducation() {
  renderEducation();
  startFactCarousel();
}

/** Renders the fact carousel and education cards. */
export function renderEducation() {
  const container = document.getElementById('education-content');
  if (!container) return;

  container.innerHTML = `
    <!-- Fact Carousel with ARIA -->
    <div class="education__carousel glass-card anim-fade-in-up visible" role="region" aria-label="Climate facts carousel" aria-roledescription="carousel" data-testid="education-carousel">
      <div style="font-size:var(--fs-xs);color:var(--clr-primary-400);text-transform:uppercase;letter-spacing:0.1em;text-align:center;margin-bottom:var(--sp-4);font-weight:var(--fw-semibold);">
        💡 Did You Know?
      </div>
      <div style="overflow:hidden;border-radius:var(--radius-lg);" aria-live="polite" aria-atomic="true">
        <div class="education__facts" id="facts-track">
          ${ECO_FACTS.map((fact, i) => `
            <div class="education__fact" role="group" aria-roledescription="slide" aria-label="Fact ${i + 1} of ${ECO_FACTS.length}" data-testid="education-fact-${i}">
              <div class="education__fact-emoji" aria-hidden="true">${fact.emoji}</div>
              <div class="education__fact-text">${escapeHTML(fact.text)}</div>
              <div class="education__fact-source">— ${escapeHTML(fact.source)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="education__nav-dots" id="fact-dots" role="tablist" aria-label="Fact navigation">
        ${ECO_FACTS.map((_, i) => `
          <button class="education__nav-dot ${i === 0 ? 'active' : ''}"
            onclick="window.EcoTrack.goToFact(${i})"
            role="tab"
            aria-selected="${i === 0}"
            aria-label="Go to fact ${i + 1}"
            data-testid="education-dot-${i}"></button>
        `).join('')}
      </div>
    </div>

    <!-- Deep Dive Cards -->
    <div style="text-align:center;margin: var(--sp-10) 0 var(--sp-6);">
      <h3 style="font-size:var(--fs-xl);font-weight:var(--fw-bold);margin-bottom:var(--sp-2);">Understanding Your Impact</h3>
      <p style="color:var(--clr-text-secondary);font-size:var(--fs-sm);">Explore how everyday choices affect the climate</p>
    </div>
    <div class="education__grid stagger-children" role="list" aria-label="Educational topics">
      ${EDU_CARDS.map((card, i) => `
        <div class="edu-card anim-fade-in-up visible hover-lift" role="listitem" data-testid="edu-card-${i}">
          <div class="edu-card__icon" aria-hidden="true">${card.icon}</div>
          <h4 class="edu-card__title">${escapeHTML(card.title)}</h4>
          <p class="edu-card__text">${escapeHTML(card.text)}</p>
          ${card.comparisons ? `
            <div class="edu-card__comparison" role="table" aria-label="${escapeHTML(card.title)} comparison data">
              ${card.comparisons.map(c => `
                <div class="edu-card__comparison-row" role="row">
                  <span role="cell">${escapeHTML(c.label)}</span>
                  <span style="font-weight:var(--fw-semibold);color:var(--clr-primary-400);" role="cell">${escapeHTML(c.value)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Starts the auto-rotating carousel timer.
 * Respects prefers-reduced-motion (uses longer interval).
 */
function startFactCarousel() {
  if (factInterval) clearInterval(factInterval);
  // Accessibility: longer interval or no auto-rotate for reduced motion
  const interval = prefersReducedMotion() ? 15000 : 6000;
  factInterval = setInterval(() => {
    goToFact((currentFact + 1) % ECO_FACTS.length);
  }, interval);
}

/**
 * Navigates to a specific fact in the carousel.
 * @param {number} index - Fact index to display
 */
export function goToFact(index) {
  if (index < 0 || index >= ECO_FACTS.length) return;
  currentFact = index;

  const track = document.getElementById('facts-track');
  if (track) {
    track.style.transform = `translateX(-${index * 100}%)`;
  }

  // Update dot states
  const dots = document.querySelectorAll('.education__nav-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
    dot.setAttribute('aria-selected', String(i === index));
  });

  // Reset auto-rotation timer
  startFactCarousel();
}

/** Cleans up the carousel interval on teardown. */
export function cleanup() {
  if (factInterval) {
    clearInterval(factInterval);
    factInterval = null;
  }
}
