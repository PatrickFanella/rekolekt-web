import type { HighlightRange, SearchHit } from '../types/api';
import { formatTimestamp } from '../format/format';
import { absoluteUrl, episodeLink } from '../format/links';
import { normalizeTranscriptText } from '../transcript/transcript';
import { parseLegacyHighlightedSnippet } from './highlights';

/** Strip legacy `<b>`/`<em>`/`<mark>` markers and collapse whitespace. */
export function plainTextFromSnippet(snippet: string, highlights?: HighlightRange[] | null) {
  const text = highlights == null ? parseLegacyHighlightedSnippet(snippet).text : snippet;
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The citation format the copy-quote actions use:
 *
 *     “quoted text”
 *
 *     — Episode title, 00:12:34
 *     https://archive.example/v/…
 */
export function formatQuote({
  text,
  title,
  startMs,
  url,
}: {
  text: string;
  title: string;
  startMs: number;
  url: string;
}) {
  return `“${normalizeTranscriptText(text)}”\n\n— ${title}, ${formatTimestamp(startMs)}\n${url}`;
}

/** Quote text for a search moment, linked to its episode position. */
export function buildQuoteText(
  videoId: string,
  moment: SearchHit,
  title: string,
  origin?: string,
  link: (videoId: string, startMs: number) => string = (id, startMs) => episodeLink(id, { startMs })
) {
  return formatQuote({
    text: plainTextFromSnippet(moment.snippet, moment.highlights),
    title,
    startMs: moment.start_ms,
    url: absoluteUrl(link(videoId, moment.start_ms), origin),
  });
}

/** Link that opens the episode at a moment and plays the query's matches in order. */
export function buildPlayMatchesLink(videoId: string, moment: SearchHit, query: string) {
  return episodeLink(videoId, { startMs: moment.start_ms, query, playMatches: true });
}
