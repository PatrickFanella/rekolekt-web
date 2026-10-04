import { useCallback } from 'react';
import { useRekolekt } from '../provider/context';
import { absoluteUrl } from '../format/links';
import { useCopy } from '../clipboard/useCopy';
import { formatQuote } from '../search/moments';

/**
 * Copy a moment's link or a formatted quote for one episode, using the
 * provider's link builder. `status`/`lastKey` report the last copy.
 */
export function useMomentActions({ videoId, title }: { videoId: string; title: string }) {
  const { links } = useRekolekt();
  const { copy, status, lastKey } = useCopy();
  const linkFor = useCallback(
    (startMs: number) => absoluteUrl(links.episode(videoId, { startMs })),
    [links, videoId]
  );
  return {
    status,
    lastKey,
    linkFor,
    copyLink: (startMs: number) => copy(linkFor(startMs), `link:${startMs}`),
    copyQuote: (text: string, startMs: number) =>
      copy(formatQuote({ text, title, startMs, url: linkFor(startMs) }), `quote:${startMs}`),
  };
}
