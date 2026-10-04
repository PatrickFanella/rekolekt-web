import axe from 'axe-core';
import { expect } from 'vitest';

/** Fail on any axe violation inside `container` (color contrast is skipped: there are no colors). */
export async function expectAccessible(container: Element) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(' | ')}`
  );
  expect(summary).toEqual([]);
}
