import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useRekolekt } from '../provider/context';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { formatDate, formatTimestamp } from '../format/format';
import type { SavedMoment } from '../favorites/useFavorites';
import type { SavedSearch } from '../types/api';
import { EmptyState, LoadingState } from './states';
import { type ClassNames } from './primitives';

export type SavedMomentsListProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  items: SavedMoment[];
  loading?: boolean;
  onRemove?: (item: SavedMoment) => void;
  renderItem?: (item: SavedMoment) => ReactNode;
  classNames?: ClassNames<'list' | 'item' | 'time' | 'text' | 'open' | 'remove'>;
  strings?: Partial<RekolektStrings>;
};

/** Saved moments from `useFavorites`, each linked to its position. `data-storage` is server or local. */
export const SavedMomentsList = forwardRef<HTMLElement, SavedMomentsListProps>(
  function SavedMomentsList(
    { items, loading, onRemove, renderItem, classNames: c = {}, strings: overrides, ...props },
    ref
  ) {
    const strings = useStrings(overrides);
    const { links, Link } = useRekolekt();
    return (
      <section ref={ref} aria-label={strings.savedMomentsLabel} data-rk="saved-moments" {...props}>
        {loading && items.length === 0 ? (
          <LoadingState strings={overrides} />
        ) : items.length === 0 ? (
          <EmptyState>{strings.savedMomentsEmpty}</EmptyState>
        ) : (
          <ul data-part="list" className={c.list}>
            {items.map((item) => (
              <li
                key={item.id ?? `${item.videoId}:${item.startMs}:${item.endMs}`}
                data-part="item"
                data-storage={item.storage}
                className={c.item}
              >
                {renderItem ? (
                  renderItem(item)
                ) : (
                  <>
                    <time data-part="time" className={c.time}>
                      {formatTimestamp(item.startMs)}
                    </time>
                    <p data-part="text" className={c.text}>
                      {item.text}
                    </p>
                    <Link
                      href={links.episode(item.videoId, { startMs: item.startMs })}
                      data-part="open"
                      className={c.open}
                    >
                      {strings.openMoment}
                    </Link>
                    {onRemove && (
                      <button
                        type="button"
                        data-part="remove"
                        className={c.remove}
                        onClick={() => onRemove(item)}
                      >
                        {strings.remove}
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
);

export type SavedSearchesListProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  items: SavedSearch[];
  loading?: boolean;
  onRemove?: (item: SavedSearch) => void;
  renderItem?: (item: SavedSearch) => ReactNode;
  classNames?: ClassNames<
    'list' | 'item' | 'query' | 'date' | 'filters' | 'filter' | 'open' | 'remove'
  >;
  strings?: Partial<RekolektStrings>;
};

/** Saved searches from `useSavedSearches`, each linked back to the search. */
export const SavedSearchesList = forwardRef<HTMLElement, SavedSearchesListProps>(
  function SavedSearchesList(
    { items, loading, onRemove, renderItem, classNames: c = {}, strings: overrides, ...props },
    ref
  ) {
    const strings = useStrings(overrides);
    const { links, Link } = useRekolekt();
    return (
      <section
        ref={ref}
        aria-label={strings.savedSearchesLabel}
        data-rk="saved-searches"
        {...props}
      >
        {loading && items.length === 0 ? (
          <LoadingState strings={overrides} />
        ) : items.length === 0 ? (
          <EmptyState>{strings.savedSearchesEmpty}</EmptyState>
        ) : (
          <ul data-part="list" className={c.list}>
            {items.map((item) => {
              const filters = Object.entries(item.filters ?? {}).filter(
                ([key, value]) =>
                  key !== 'source' && value !== undefined && value !== null && value !== ''
              );
              return (
                <li key={item.id} data-part="item" className={c.item}>
                  {renderItem ? (
                    renderItem(item)
                  ) : (
                    <>
                      <p data-part="query" className={c.query}>
                        {item.query}
                      </p>
                      {item.created_at && (
                        <p data-part="date" className={c.date}>
                          {strings.savedOn(formatDate(item.created_at))}
                        </p>
                      )}
                      {filters.length > 0 && (
                        <ul data-part="filters" className={c.filters}>
                          {filters.map(([key, value]) => (
                            <li key={key} data-part="filter" data-filter={key} className={c.filter}>
                              {String(value)}
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link
                        href={links.search(item.query, item.filters)}
                        data-part="open"
                        className={c.open}
                      >
                        {strings.reopenSearch}
                      </Link>
                      {onRemove && (
                        <button
                          type="button"
                          data-part="remove"
                          className={c.remove}
                          onClick={() => onRemove(item)}
                        >
                          {strings.remove}
                        </button>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }
);
