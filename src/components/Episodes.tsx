import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { useRekolekt } from '../provider/context';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { formatDate, formatDuration } from '../format/format';
import { episodeStatus, episodeThumbnailUrl } from '../episodes/library';
import type { VideoInfo } from '../types/api';
import { EmptyState, ErrorState, LoadingState } from './states';
import { dataFlag, type ClassNames } from './primitives';

type CardPart =
  | 'media'
  | 'thumbnail'
  | 'thumbnailFallback'
  | 'duration'
  | 'body'
  | 'title'
  | 'meta'
  | 'channel'
  | 'date'
  | 'labels'
  | 'label';

export type EpisodeCardProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  episode: VideoInfo;
  /** Which date to show. Defaults to the upload date. */
  dateField?: 'uploaded_at' | 'created_at' | 'updated_at';
  /** Hide the thumbnail. */
  hideThumbnail?: boolean;
  /** Maximum people and tags listed. */
  labelLimit?: number;
  /** Heading level for the title, default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Extra content after the metadata, e.g. actions. */
  children?: ReactNode;
  classNames?: ClassNames<CardPart>;
  strings?: Partial<RekolektStrings>;
};

/**
 * One episode: thumbnail with duration, linked title, channel, date and up to
 * `labelLimit` people and tags. `data-status` exposes processing state.
 */
export const EpisodeCard = forwardRef<HTMLElement, EpisodeCardProps>(function EpisodeCard(
  {
    episode,
    dateField = 'uploaded_at',
    hideThumbnail = false,
    labelLimit = 3,
    headingLevel = 3,
    children,
    classNames,
    strings: overrides,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  const { links, Link } = useRekolekt();
  const [imageFailed, setImageFailed] = useState(false);
  const title = episode.title || strings.untitledEpisode;
  const href = links.episode(episode.id);
  const Heading = `h${headingLevel}` as const;
  const labels = [
    ...(episode.people ?? []).map((person) => ({
      key: `person:${person.slug}`,
      label: person.display_name,
      kind: 'person',
    })),
    ...(episode.tags ?? []).map((tag) => ({
      key: `tag:${tag.slug}`,
      label: tag.label,
      kind: 'tag',
    })),
  ].slice(0, labelLimit);
  const date = episode[dateField];

  return (
    <article
      ref={ref}
      data-rk="episode-card"
      data-status={episodeStatus(episode).status}
      {...props}
    >
      {!hideThumbnail && (
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          data-part="media"
          className={classNames?.media}
        >
          {imageFailed ? (
            <span data-part="thumbnailFallback" className={classNames?.thumbnailFallback}>
              {strings.thumbnailUnavailable}
            </span>
          ) : (
            <img
              src={episodeThumbnailUrl(episode)}
              alt=""
              loading="lazy"
              width={480}
              height={360}
              data-part="thumbnail"
              className={classNames?.thumbnail}
              onError={() => setImageFailed(true)}
            />
          )}
          <span data-part="duration" className={classNames?.duration}>
            {formatDuration(episode.duration_seconds)}
          </span>
        </Link>
      )}
      <div data-part="body" className={classNames?.body}>
        <Heading data-part="title" className={classNames?.title}>
          <Link href={href} aria-label={strings.watchEpisode(title)}>
            {title}
          </Link>
        </Heading>
        <p data-part="meta" className={classNames?.meta}>
          <span data-part="channel" className={classNames?.channel}>
            {episode.channel_name || strings.unknownChannel}
          </span>{' '}
          {date && (
            <time data-part="date" className={classNames?.date} dateTime={date}>
              {formatDate(date)}
            </time>
          )}
          {hideThumbnail && (
            <span data-part="duration"> {formatDuration(episode.duration_seconds)}</span>
          )}
        </p>
        {labels.length > 0 && (
          <ul data-part="labels" className={classNames?.labels}>
            {labels.map((item) => (
              <li
                key={item.key}
                data-part="label"
                data-kind={item.kind}
                className={classNames?.label}
              >
                {item.label}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </article>
  );
});

export type EpisodeListProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  episodes: VideoInfo[];
  loading?: boolean;
  loadingMore?: boolean;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
  error?: unknown;
  onRetry?: () => void;
  /** Replace the default `EpisodeCard`. */
  renderEpisode?: (episode: VideoInfo) => ReactNode;
  cardProps?: Omit<EpisodeCardProps, 'episode'>;
  classNames?: ClassNames<'list' | 'item' | 'loadMore'>;
  strings?: Partial<RekolektStrings>;
};

/** A list of episodes with loading, empty, error and "load more" states (pairs with `useEpisodes`). */
export const EpisodeList = forwardRef<HTMLElement, EpisodeListProps>(function EpisodeList(
  {
    episodes,
    loading,
    loadingMore,
    canLoadMore,
    onLoadMore,
    error,
    onRetry,
    renderEpisode,
    cardProps,
    classNames,
    strings: overrides,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  let content: ReactNode;
  if (error && episodes.length === 0)
    content = <ErrorState onRetry={onRetry} strings={overrides} />;
  else if (loading && episodes.length === 0) content = <LoadingState strings={overrides} />;
  else if (episodes.length === 0) content = <EmptyState strings={overrides} />;
  else
    content = (
      <>
        <ul data-part="list" className={classNames?.list}>
          {episodes.map((episode) => (
            <li key={episode.id} data-part="item" className={classNames?.item}>
              {renderEpisode ? (
                renderEpisode(episode)
              ) : (
                <EpisodeCard episode={episode} strings={overrides} {...cardProps} />
              )}
            </li>
          ))}
        </ul>
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
            {loadingMore ? strings.loading : strings.loadMore}
          </button>
        )}
      </>
    );
  return (
    <section
      ref={ref}
      aria-label={strings.episodeListLabel}
      data-rk="episode-list"
      data-loading={dataFlag(loading)}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </section>
  );
});
