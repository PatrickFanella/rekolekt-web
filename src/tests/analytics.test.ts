import { describe, expect, it, vi } from 'vitest';
import { createAnalytics } from '../analytics/analytics';
import { createTestClient } from './test-utils';

describe('analytics', () => {
  it('batches events and sends them after the delay', async () => {
    vi.useFakeTimers();
    const { client, calls } = createTestClient({ 'POST /events/batch': { ok: true } });
    const analytics = createAnalytics(client, { delayMs: 100 });
    analytics.track({ type: 'search', payload: { q: 'rent' } });
    analytics.track({ type: 'seek' });
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100);
    vi.useRealTimers();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(JSON.parse(calls[0].body)).toEqual({
      events: [{ type: 'search', payload: { q: 'rent' } }, { type: 'seek' }],
    });
    analytics.dispose();
  });

  it('samples event types', async () => {
    const { client, calls } = createTestClient({ 'POST /events/batch': {} });
    const analytics = createAnalytics(client, { random: () => 0.9, delayMs: 0 });
    analytics.track({ type: 'web_vital' });
    await analytics.flush();
    expect(calls).toHaveLength(0);
    analytics.dispose();
  });

  it('uses a CSRF-capable keepalive request on unload instead of sendBeacon', async () => {
    const beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon });
    const { client, calls } = createTestClient({ 'POST /events/batch': {} });
    client.setCsrfToken('analytics-csrf-token');
    const send = vi.spyOn(client, 'sendEvents');
    const analytics = createAnalytics(client, { delayMs: 60_000 });
    analytics.track({ type: 'search' });

    window.dispatchEvent(new Event('beforeunload'));

    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].path).toBe('/events/batch');
    expect(calls[0].request.headers.get('X-CSRF-Token')).toBe('analytics-csrf-token');
    expect(send).toHaveBeenCalledWith([{ type: 'search' }], { keepalive: true });
    expect(beacon).not.toHaveBeenCalled();
    analytics.dispose();
  });
});
