import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { useRekolekt } from '../provider/context';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { clusterNearbyMoments } from '../search/clusters';
import { plainTextFromSnippet } from '../search/moments';
import { formatTimestamp, formatVideoTitle } from '../format/format';
import type { EpisodeSearchGroup, GroupedSearchResponse, SearchMoment } from '../types/api';
import { HighlightedSnippet } from './HighlightedSnippet';
import { MomentActions, type MomentAction } from './MomentActions';
import { EmptyState, ErrorState, LoadingState } from './states';
import { dataFlag, type ClassNames } from './primitives';

type MomentPart =
  | 'moment'
  | 'time'
  | 'snippet'
  | 'actions'
  | 'nearby'
  | 'nearbySummary'
  | 'nearbyList'
  | 'showMore';

export type SearchMomentsProps = Omit<HTMLAttributes<HTMLOListElement>, 'children'> & {
  videoId: string;
  /** Episode title used in quotes. */
  title: string;
  moments: SearchMoment[];
  query: string;
  /** Number of clusters shown before "show more". */
  initialClusters?: number;
  isSaved?: (moment: SearchMoment) => boolean;
  onSave?: (moment: SearchMoment) => void;
  onOpen?: (moment: SearchMoment) => void;
  actions?: MomentAction[];
  /** Replace how one moment renders; the default markup is passed as `children`. */
  renderMoment?: (props: {
    moment: SearchMoment;
    nearby: boolean;
    children: ReactNode;
  }) => ReactNode;
  classNames?: ClassNames<MomentPart>;
  strings?: Partial<RekolektStrings>;
};

/**
 * One episode's matching moments. Matches within ten seconds of each other form
 * a cluster; extra matches in a cluster sit in a native disclosure.
 */
export const SearchMoments = forwardRef<HTMLOListElement, SearchMomentsProps>(
  function SearchMoments(
    {
      videoId,
      title,
      moments,
      query,
      initialClusters = 3,
      isSaved,
      onSave,
      onOpen,
      actions,
      renderMoment,
      classNames,
      strings: overrides,
      ...props
    },
    ref
  ) {
    const strings = useStrings(overrides);
    const { links, Link } = useRekolekt();
    const [showAll, setShowAll] = useState(false);
    const clusters = clusterNearbyMoments(moments);
    const visible = showAll ? clusters : clusters.slice(0, initialClusters);

    const momentBody = (moment: SearchMoment, nearby: boolean) => {
      const saved = isSaved?.(moment) ?? false;
      const body = (
        <>
          <time
            data-part="time"
            className={classNames?.time}
            dateTime={`PT${Math.floor(moment.start_ms / 1000)}S`}
          >
            {formatTimestamp(moment.start_ms)}
          </time>
          <Link
            href={
              query
                ? links.episode(videoId, { startMs: moment.start_ms, query, playMatches: true })
                : links.episode(videoId, { startMs: moment.start_ms })
            }
            aria-label={strings.playMomentAt(formatTimestamp(moment.start_ms))}
            data-part="snippet"
            className={classNames?.snippet}
            onClick={() => onOpen?.(moment)}
          >
            <HighlightedSnippet snippet={moment.snippet} highlights={moment.highlights} />
          </Link>
          <MomentActions
            videoId={videoId}
            title={title}
            startMs={moment.start_ms}
            endMs={moment.end_ms}
            text={plainTextFromSnippet(moment.snippet, moment.highlights)}
            query={query}
            saved={saved}
            onSave={onSave ? () => onSave(moment) : undefined}
            onOpen={() => onOpen?.(moment)}
            actions={actions}
            data-part="actions"
            className={classNames?.actions}
            strings={overrides}
          />
        </>
      );
      return renderMoment ? renderMoment({ moment, nearby, children: body }) : body;
    };

    return (
      <ol ref={ref} data-rk="search-moments" {...props}>
        {visible.map((cluster) => {
          const [first, ...rest] = cluster;
          if (!first) return null;
          return (
            <li
              key={first.id}
              data-part="moment"
              data-saved={dataFlag(isSaved?.(first))}
              className={classNames?.moment}
            >
              {momentBody(first, false)}
              {rest.length > 0 && (
                <details data-part="nearby" className={classNames?.nearby}>
                  <summary data-part="nearbySummary" className={classNames?.nearbySummary}>
                    {strings.nearbyMatches(rest.length)}
                  </summary>
                  <ol data-part="nearbyList" className={classNames?.nearbyList}>
                    {rest.map((moment) => (
                      <li
                        key={moment.id}
                        data-part="moment"
                        data-nearby=""
                        data-saved={dataFlag(isSaved?.(moment))}
                        className={classNames?.moment}
                      >
                        {momentBody(moment, true)}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </li>
          );
        })}
        {!showAll && clusters.length > visible.length && (
          <li data-part="showMore">
            <button type="button" className={classNames?.showMore} onClick={() => setShowAll(true)}>
              {strings.showMoreClusters(clusters.length - visible.length)}
            </button>
          </li>
        )}
      </ol>
    );
  }
);

type ResultsPart =
  'summary' | 'list' | 'group' | 'groupHeader' | 'groupTitle' | 'groupMeta' | 'loadMore';

export type SearchResultsProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'results'> & {
  query: string;
  results: GroupedSearchResponse | null;
  loading?: boolean;
  loadingMore?: boolean;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
  error?: unknown;
  onRetry?: () => void;
  isSaved?: (videoId: string, moment: SearchMoment) => boolean;
  onSave?: (group: EpisodeSearchGroup, moment: SearchMoment) => void;
  onOpen?: (videoId: string, moment: SearchMoment) => void;
  actions?: MomentAction[];
  /** Replace an episode group's header. */
  renderGroupHeader?: (group: EpisodeSearchGroup) => ReactNode;
  classNames?: ClassNames<ResultsPart>;
  momentClassNames?: SearchMomentsProps['classNames'];
  strings?: Partial<RekolektStrings>;
};

/**
 * Grouped search results, as returned by `useArchiveSearch`: a summary, then
 * one section per episode with its clustered moments, then "load more".
 */
export const SearchResults = forwardRef<HTMLElement, SearchResultsProps>(function SearchResults(
  {
    query,
    results,
    loading,
    loadingMore,
    canLoadMore,
    onLoadMore,
    error,
    onRetry,
    isSaved,
    onSave,
    onOpen,
    actions,
    renderGroupHeader,
    classNames,
    momentClassNames,
    strings: overrides,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  const { links, Link } = useRekolekt();
  let content: ReactNode;
  if (error) content = <ErrorState onRetry={onRetry} title={strings.searchError} />;
  else if (loading && !results) content = <LoadingState strings={overrides} />;
  else if (results && results.groups.length === 0)
    content = <EmptyState>{strings.searchNoResults(query)}</EmptyState>;
  else if (results)
    content = (
      <>
        <p data-part="summary" className={classNames?.summary} aria-live="polite">
          {strings.searchResultsSummary(results.total_moments, results.total_videos)}
        </p>
        <ol data-part="list" className={classNames?.list}>
          {results.groups.map((group) => {
            const title = formatVideoTitle(group.video.title, group.video.uploaded_at);
            const headingId = `rk-result-${group.video.id}`;
            return (
              <li key={group.video.id} data-part="group" className={classNames?.group}>
                <section aria-labelledby={headingId}>
                  {renderGroupHeader ? (
                    renderGroupHeader(group)
                  ) : (
                    <header data-part="groupHeader" className={classNames?.groupHeader}>
                      <h3 id={headingId} data-part="groupTitle" className={classNames?.groupTitle}>
                        <Link href={links.episode(group.video.id)}>{title}</Link>
                      </h3>
                      {group.video.channel_name && (
                        <p data-part="groupMeta" className={classNames?.groupMeta}>
                          {group.video.channel_name}
                        </p>
                      )}
                    </header>
                  )}
                  <SearchMoments
                    videoId={group.video.id}
                    title={title}
                    moments={group.moments}
                    query={query}
                    isSaved={isSaved ? (moment) => isSaved(group.video.id, moment) : undefined}
                    onSave={onSave ? (moment) => onSave(group, moment) : undefined}
                    onOpen={onOpen ? (moment) => onOpen(group.video.id, moment) : undefined}
                    actions={actions}
                    classNames={momentClassNames}
                    strings={overrides}
                  />
                </section>
              </li>
            );
          })}
        </ol>
        {canLoadMore && (
          <button
            type="button"
            data-part="loadMore"
            data-loading={dataFlag(loadingMore)}
            className={classNames?.loadMore}
            disabled={loadingMore}
            aria-busy={loadingMore || undefined}
            onClick={onLoadMore}
          >
            {loadingMore ? strings.searchLoadingMore : strings.searchLoadMore}
          </button>
        )}
      </>
    );
  return (
    <section
      ref={ref}
      data-rk="search-results"
      data-loading={dataFlag(loading)}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </section>
  );
});
