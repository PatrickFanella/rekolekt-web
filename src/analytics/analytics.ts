import type { RekolektClient } from '../client/client';

export type AnalyticsEventType =
  | 'search'
  | 'result_click'
  | 'seek'
  | 'favorite_add'
  | 'favorite_remove'
  | 'video_open'
  | 'export_click'
  | 'web_vital';

export type AnalyticsEvent = {
  type: AnalyticsEventType;
  payload?: Record<string, unknown>;
};

export type Analytics = {
  track: (event: AnalyticsEvent) => void;
  flush: () => Promise<void>;
  /** Stop listening for page unload. */
  dispose: () => void;
};

/**
 * Batch events to Rekolekt's `/events/batch`. Events are queued for three
 * seconds; `sample` drops a share of an event type (0.1 keeps 10%).
 */
export function createAnalytics(
  client: RekolektClient,
  {
    sample = { web_vital: 0.1 },
    delayMs = 3000,
    random = Math.random,
  }: {
    sample?: Partial<Record<AnalyticsEventType, number>>;
    delayMs?: number;
    random?: () => number;
  } = {}
): Analytics {
  const queue: AnalyticsEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function flush() {
    const batch = queue.splice(0, queue.length);
    timer = undefined;
    if (batch.length === 0) return;
    try {
      await client.sendEvents(batch);
    } catch {
      // Analytics never interrupts the reader.
    }
  }

  function track(event: AnalyticsEvent) {
    const probability = sample[event.type];
    if (typeof probability === 'number' && random() > probability) return;
    queue.push(event);
    timer ??= setTimeout(() => void flush(), delayMs);
  }

  // sendBeacon cannot carry the CSRF header; keepalive fetch can.
  const onUnload = () => {
    if (queue.length) void client.sendEvents(queue.splice(0), { keepalive: true }).catch(() => {});
  };
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', onUnload);

  return {
    track,
    flush,
    dispose() {
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', onUnload);
      if (timer) clearTimeout(timer);
      timer = undefined;
    },
  };
}
