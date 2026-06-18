/**
 * @fileoverview Unit tests for utils.js
 * Covers: escapeHTML, safeNumber, safeEnum, debounce, throttle,
 * formatNumber, formatDate, generateUniqueId, createSafeElement, testId
 */

import { describe, it, expect, vi } from 'vitest';
import {
  escapeHTML, safeNumber, safeEnum,
  debounce, throttle,
  formatNumber, formatDate,
  generateUniqueId, createSafeElement, testId,
} from '../../js/utils.js';

// ─── escapeHTML ──────────────────────────────────────────────────────────────

describe('escapeHTML', () => {
  it('escapes script tags', () => {
    expect(escapeHTML('<script>alert(1)</script>'))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes quotes and ampersand', () => {
    expect(escapeHTML('"quoted" & \'apostrophe\''))
      .toBe('&quot;quoted&quot; &amp; &#039;apostrophe&#039;');
  });

  it('returns safe text unchanged', () => {
    expect(escapeHTML('safe text')).toBe('safe text');
  });

  it('converts non-string numbers to string', () => {
    expect(escapeHTML(42)).toBe('42');
  });

  it('returns empty string for null', () => {
    expect(escapeHTML(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeHTML(undefined)).toBe('');
  });

  it('keeps empty string empty', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('blocks XSS img onerror payload by escaping angle brackets', () => {
    const escaped = escapeHTML('<img src=x onerror=alert(1)>');
    expect(escaped).not.toContain('<img');
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
  });

  it('blocks XSS svg onload payload by escaping angle brackets', () => {
    const escaped = escapeHTML('<svg onload=alert(1)>');
    expect(escaped).not.toContain('<svg');
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
  });

  it('blocks XSS script injection via closing tag', () => {
    const escaped = escapeHTML('"><script>alert(document.cookie)</script>');
    expect(escaped).not.toContain('<script');
  });

  it('blocks template injection payload', () => {
    const escaped = escapeHTML('{{constructor.constructor("alert(1)")()}}');
    // This payload has no HTML chars, so it passes through — that's correct
    expect(escaped).toBe('{{constructor.constructor(&quot;alert(1)&quot;)()}}');
  });
});

// ─── safeNumber ──────────────────────────────────────────────────────────────

describe('safeNumber', () => {
  it('parses numeric string', () => {
    expect(safeNumber('42', 0)).toBe(42);
  });

  it('returns fallback for NaN', () => {
    expect(safeNumber(NaN, 5)).toBe(5);
  });

  it('returns fallback for Infinity', () => {
    expect(safeNumber(Infinity, 0)).toBe(0);
  });

  it('returns fallback for -Infinity', () => {
    expect(safeNumber(-Infinity, 0)).toBe(0);
  });

  it('clamps to max', () => {
    expect(safeNumber(200, 0, 0, 100)).toBe(100);
  });

  it('clamps to min', () => {
    expect(safeNumber(-5, 0, 0, 100)).toBe(0);
  });

  it('keeps value within range unchanged', () => {
    expect(safeNumber(50, 0, 0, 100)).toBe(50);
  });

  it('returns fallback for non-numeric string', () => {
    expect(safeNumber('abc', 99)).toBe(99);
  });

  it('treats zero as a valid value, not fallback', () => {
    expect(safeNumber(0, 5)).toBe(0);
  });
});

// ─── safeEnum ────────────────────────────────────────────────────────────────

describe('safeEnum', () => {
  const allowed = ['vegan', 'vegetarian', 'mediumMeat'];

  it('passes through a valid value', () => {
    expect(safeEnum('vegan', allowed, 'mediumMeat')).toBe('vegan');
  });

  it('returns fallback for unknown value', () => {
    expect(safeEnum('invalid', allowed, 'mediumMeat')).toBe('mediumMeat');
  });

  it('returns fallback for empty string', () => {
    expect(safeEnum('', allowed, 'vegan')).toBe('vegan');
  });

  it('returns fallback for undefined', () => {
    expect(safeEnum(undefined, allowed, 'vegan')).toBe('vegan');
  });
});

// ─── debounce ────────────────────────────────────────────────────────────────

describe('debounce', () => {
  it('does not fire immediately', () => {
    vi.useFakeTimers();
    let count = 0;
    const fn = debounce(() => count++, 20);

    fn(); fn(); fn();
    expect(count).toBe(0);

    vi.useRealTimers();
  });

  it('fires exactly once after wait', async () => {
    let count = 0;
    const fn = debounce(() => count++, 20);

    fn(); fn(); fn();
    await new Promise(r => setTimeout(r, 40));
    expect(count).toBe(1);
  });

  it('fires again after second debounced call', async () => {
    let count = 0;
    const fn = debounce(() => count++, 20);

    fn();
    await new Promise(r => setTimeout(r, 40));
    expect(count).toBe(1);

    fn();
    await new Promise(r => setTimeout(r, 40));
    expect(count).toBe(2);
  });
});

// ─── throttle ────────────────────────────────────────────────────────────────

describe('throttle', () => {
  it('fires exactly once on rapid calls', () => {
    let count = 0;
    const fn = throttle(() => count++, 50);

    fn(); fn(); fn();
    expect(count).toBe(1);
  });

  it('fires trailing call after limit', async () => {
    let count = 0;
    const fn = throttle(() => count++, 50);

    fn(); fn(); fn();
    await new Promise(r => setTimeout(r, 80));
    expect(count).toBe(2);
  });
});

// ─── formatNumber ────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats large numbers with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('rounds to specified decimals', () => {
    expect(formatNumber(3.14159, 2)).toBe('3.14');
  });

  it('adds thousands separator', () => {
    expect(formatNumber(1000, 0)).toBe('1,000');
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('contains the year', () => {
    expect(formatDate('2024-06-15')).toContain('2024');
  });

  it('contains the month', () => {
    const result = formatDate('2024-06-15');
    expect(result.includes('Jun') || result.includes('June')).toBe(true);
  });

  it('contains the day', () => {
    expect(formatDate('2024-06-15')).toContain('15');
  });
});

// ─── generateUniqueId ────────────────────────────────────────────────────────

describe('generateUniqueId', () => {
  it('returns unique IDs on each call', () => {
    const id1 = generateUniqueId();
    const id2 = generateUniqueId();
    expect(id1).not.toBe(id2);
  });

  it('uses default prefix "eco-"', () => {
    const id = generateUniqueId();
    expect(id.startsWith('eco-')).toBe(true);
  });

  it('applies custom prefix', () => {
    const id = generateUniqueId('test');
    expect(id.startsWith('test-')).toBe(true);
  });
});

// ─── createSafeElement ───────────────────────────────────────────────────────

describe('createSafeElement', () => {
  it('creates correct tag with className and id', () => {
    const div = createSafeElement('div', { className: 'foo', id: 'bar' }, 'hello');
    expect(div.tagName).toBe('DIV');
    expect(div.className).toBe('foo');
    expect(div.id).toBe('bar');
    expect(div.textContent).toBe('hello');
  });

  it('sets type and aria-label attributes', () => {
    const btn = createSafeElement('button', { type: 'button', 'aria-label': 'test' });
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.getAttribute('aria-label')).toBe('test');
  });

  it('escapes HTML in textContent (no XSS)', () => {
    const el = createSafeElement('span', {}, '<img src=x onerror=alert(1)>');
    expect(el.innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('creates element with data- attributes', () => {
    const el = createSafeElement('div', { 'data-testid': 'my-test' });
    expect(el.getAttribute('data-testid')).toBe('my-test');
  });
});

// ─── testId ──────────────────────────────────────────────────────────────────

describe('testId', () => {
  it('returns correct data-testid attribute string', () => {
    expect(testId('calculator', 'next-btn')).toBe('data-testid="calculator-next-btn"');
  });
});
