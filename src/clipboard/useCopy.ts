import { useCallback, useEffect, useRef, useState } from 'react';

export type CopyStatus = 'idle' | 'copied' | 'failed';

export async function copyText(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard)
    throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(text);
}

/**
 * Copy text to the clipboard and report the outcome. `status` returns to
 * `idle` after `resetMs`; `lastKey` tells which action copied.
 */
export function useCopy({ resetMs = 2500 }: { resetMs?: number } = {}) {
  const [state, setState] = useState<{ status: CopyStatus; key: string | null }>({
    status: 'idle',
    key: null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const copy = useCallback(
    async (text: string, key = 'default') => {
      let status: CopyStatus;
      try {
        await copyText(text);
        status = 'copied';
      } catch {
        status = 'failed';
      }
      setState({ status, key });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState({ status: 'idle', key: null }), resetMs);
      return status === 'copied';
    },
    [resetMs]
  );
  return { copy, status: state.status, lastKey: state.key };
}
