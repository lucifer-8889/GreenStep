/**
 * @fileoverview Green pledge commitment system. Allows users to commit
 * to sustainable habits and tracks projected CO₂ savings. Dispatches
 * events for cross-module achievement unlocks.
 */

import { PLEDGE_OPTIONS } from './data.js';
import { savePledge, getPledges, removePledge } from './storage.js';
import { escapeHTML, announce, formatNumber, formatDate } from './utils.js';

/** Initializes the pledges section. */
export function initPledges() {
  renderPledges();
}

/** Renders the pledge options, pledge wall, and savings counter. */
export function renderPledges() {
  const container = document.getElementById('pledges-content');
  if (!container) return;

  const activePledges = getPledges();
  const totalSavings = activePledges.reduce((sum, p) => sum + (p.savingsKg || 0), 0);

  container.innerHTML = `
    <!-- Pledge Counter -->
    ${activePledges.length > 0 ? `
      <div class="pledges__counter anim-fade-in-up visible" data-testid="pledges-counter">
        <div class="pledges__counter-value">${(totalSavings / 1000).toFixed(1)} tonnes</div>
        <div class="pledges__counter-label">Projected CO₂ savings from ${activePledges.length} pledge${activePledges.length > 1 ? 's' : ''}</div>
      </div>
    ` : ''}

    <!-- Pledge Form -->
    <div class="pledges__form-card anim-fade-in-up visible">
      <h3 class="pledges__form-title">🌱 Make a Pledge</h3>
      <p class="pledges__form-desc">Commit to sustainable habits. Every action counts!</p>
      <div class="pledges__options" id="pledge-options" role="group" aria-label="Available pledges">
        ${PLEDGE_OPTIONS.map(opt => {
          const isActive = activePledges.some(p => p.id === opt.id);
          return `
            <div class="pledge-option ${isActive ? 'selected' : ''}"
              onclick="window.EcoTrack.togglePledge('${opt.id}')"
              id="pledge-opt-${opt.id}"
              role="checkbox"
              aria-checked="${isActive}"
              aria-label="${escapeHTML(opt.text)}"
              tabindex="0"
              data-testid="pledge-opt-${opt.id}"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
              <div class="pledge-option__emoji" aria-hidden="true">${opt.emoji}</div>
              <div class="pledge-option__text">${escapeHTML(opt.text)}</div>
              <div class="pledge-option__saving">
                ${isActive ? '✅ Pledged' : `Saves ${formatNumber(opt.savingsKg)} kg/yr`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Pledge Wall -->
    ${activePledges.length > 0 ? `
      <div style="text-align:center;margin:var(--sp-10) 0 var(--sp-6);">
        <h3 style="font-size:var(--fs-xl);font-weight:var(--fw-bold);margin-bottom:var(--sp-2);">Your Pledge Wall</h3>
        <p style="color:var(--clr-text-secondary);font-size:var(--fs-sm);">Your commitments to a greener future</p>
      </div>
      <div class="pledges__wall stagger-children" role="list" aria-label="Your active pledges" data-testid="pledges-wall">
        ${activePledges.map(p => `
          <div class="pledge-tile hover-lift" role="listitem" data-testid="pledge-tile-${p.id}">
            <div class="pledge-tile__emoji" aria-hidden="true">${p.emoji}</div>
            <div class="pledge-tile__text">${escapeHTML(p.text)}</div>
            <div class="pledge-tile__date">${formatDate(p.date)}</div>
            <button class="btn btn--ghost btn--sm" style="margin-top:var(--sp-2);font-size:var(--fs-xs);color:var(--clr-text-muted);"
              onclick="event.stopPropagation(); window.EcoTrack.removePledge('${p.id}')"
              aria-label="Remove pledge: ${escapeHTML(p.text)}"
              data-testid="pledge-remove-${p.id}">
              Remove
            </button>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

/**
 * Toggles a pledge on/off and dispatches events for achievements.
 * @param {string} pledgeId - Pledge identifier
 */
export function handleTogglePledge(pledgeId) {
  const existing = getPledges();
  const isActive = existing.some(p => p.id === pledgeId);

  if (isActive) {
    removePledge(pledgeId);
    announce('Pledge removed.');
  } else {
    const opt = PLEDGE_OPTIONS.find(o => o.id === pledgeId);
    if (opt) {
      savePledge({
        id: opt.id,
        emoji: opt.emoji,
        text: opt.text,
        savingsKg: opt.savingsKg,
      });

      // Dispatch event for achievements
      const pledges = getPledges();
      window.dispatchEvent(new CustomEvent('ecotrack:pledge-added', { detail: { count: pledges.length } }));

      window.EcoTrack.showToast('🌱 Pledge Made!', `You pledged to: ${opt.text}`, 'success');
      announce(`Pledge made: ${opt.text}. Saves ${opt.savingsKg} kilograms of CO₂ per year.`);
    }
  }

  renderPledges();
}

/**
 * Removes a pledge by ID and re-renders.
 * @param {string} pledgeId - Pledge identifier
 */
export function handleRemovePledge(pledgeId) {
  removePledge(pledgeId);
  renderPledges();
  announce('Pledge removed.');
}
