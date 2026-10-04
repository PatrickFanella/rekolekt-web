import { forwardRef, Fragment, type ElementType, type HTMLAttributes } from 'react';
import { normalizeHighlightRanges, parseLegacyHighlightedSnippet } from '../search/highlights';
import type { HighlightRange } from '../types/api';

export type HighlightedSnippetProps = HTMLAttributes<HTMLElement> & {
  snippet: string;
  /** Code-point ranges from the API. When absent, legacy `<b>`/`<em>`/`<mark>` markers are parsed. */
  highlights?: HighlightRange[] | null;
  as?: ElementType;
  /** Class for each `<mark>`. */
  markClassName?: string;
};

/** Search snippet text with matches wrapped in `<mark>`. Never renders snippet HTML. */
export const HighlightedSnippet = forwardRef<HTMLElement, HighlightedSnippetProps>(
  function HighlightedSnippet(
    { snippet, highlights, as: Wrapper = 'span', markClassName, ...props },
    ref
  ) {
    const parsed =
      highlights == null
        ? parseLegacyHighlightedSnippet(snippet)
        : { text: snippet, highlights: [] };
    const codePoints = Array.from(parsed.text);
    const ranges = normalizeHighlightRanges(
      [...parsed.highlights, ...(highlights ?? [])],
      codePoints.length
    );
    const children = [];
    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) children.push(codePoints.slice(cursor, range.start).join(''));
      children.push(
        <mark key={`${range.start}:${range.end}`} className={markClassName}>
          {codePoints.slice(range.start, range.end).join('')}
        </mark>
      );
      cursor = range.end;
    }
    if (cursor < codePoints.length) children.push(codePoints.slice(cursor).join(''));

    return (
      <Wrapper ref={ref} data-rk="snippet" {...props}>
        {children.map((child, index) => (
          <Fragment key={index}>{child}</Fragment>
        ))}
      </Wrapper>
    );
  }
);
