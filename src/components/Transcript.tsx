import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { formatTimestamp } from '../format/format';
import { momentAnchorId } from '../format/links';
import {
  buildTranscriptTurns,
  normalizeTranscriptText,
  type TranscriptTurn,
} from '../transcript/transcript';
import { findSegmentIndexAt } from '../transcript/usePlaybackSync';
import { useMomentActions } from '../transcript/useMomentActions';
import type { SearchHit, Segment } from '../types/api';
import { HighlightedSnippet } from './HighlightedSnippet';
import { dataFlag, type ClassNames } from './primitives';

type SegmentActionsPart = 'action' | 'status';

export type SegmentActionsProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  videoId: string;
  title: string;
  segment: Segment;
  saved?: boolean;
  onPlay?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onClose?: () => void;
  children?: ReactNode;
  classNames?: ClassNames<SegmentActionsPart>;
  strings?: Partial<RekolektStrings>;
};

/** Actions for a selected transcript segment: play, copy quote, copy link, save, share, close. */
export const SegmentActions = forwardRef<HTMLDivElement, SegmentActionsProps>(
  function SegmentActions(
    {
      videoId,
      title,
      segment,
      saved = false,
      onPlay,
      onSave,
      onShare,
      onClose,
      children,
      classNames,
      strings: overrides,
      ...props
    },
    ref
  ) {
    const strings = useStrings(overrides);
    const { copyLink, copyQuote, status, lastKey } = useMomentActions({ videoId, title });
    const action = classNames?.action;
    const message =
      status === 'copied'
        ? lastKey?.startsWith('quote:')
          ? strings.quoteCopied
          : strings.linkCopied
        : status === 'failed'
          ? strings.copyFailed
          : '';
    return (
      <div
        ref={ref}
        role="group"
        aria-label={strings.momentActionsLabel}
        data-rk="segment-actions"
        data-saved={dataFlag(saved)}
        {...props}
      >
        {onPlay && (
          <button
            type="button"
            data-part="action"
            data-action="play"
            className={action}
            onClick={onPlay}
          >
            {strings.playFromHere}
          </button>
        )}
        <button
          type="button"
          data-part="action"
          data-action="copyQuote"
          className={action}
          onClick={() => void copyQuote(segment.text, segment.start_ms)}
        >
          {strings.copyQuote}
        </button>
        <button
          type="button"
          data-part="action"
          data-action="copyLink"
          className={action}
          onClick={() => void copyLink(segment.start_ms)}
        >
          {strings.copyLink}
        </button>
        {onSave && (
          <button
            type="button"
            data-part="action"
            data-action="save"
            data-saved={dataFlag(saved)}
            aria-pressed={saved}
            className={action}
            onClick={onSave}
          >
            {saved ? strings.saved : strings.save}
          </button>
        )}
        {onShare && (
          <button
            type="button"
            data-part="action"
            data-action="share"
            className={action}
            onClick={onShare}
          >
            {strings.sharePassage}
          </button>
        )}
        {children}
        {onClose && (
          <button
            type="button"
            data-part="action"
            data-action="close"
            className={action}
            onClick={onClose}
          >
            {strings.closeActions}
          </button>
        )}
        <span
          role="status"
          aria-live="polite"
          data-part="status"
          data-state={status}
          className={classNames?.status}
        >
          {message}
        </span>
      </div>
    );
  }
);

type TranscriptPart =
  | 'turn'
  | 'meta'
  | 'timecode'
  | 'speaker'
  | 'text'
  | 'segment'
  | 'matches'
  | 'matchesTitle'
  | 'actions';

export type TranscriptProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  videoId: string;
  /** Episode title used in copied quotes. */
  title: string;
  segments: Segment[];
  /** Search hits to mark in the transcript. */
  hits?: SearchHit[] | null;
  /** Playback position; marks the current segment and the ones already played. */
  currentMs?: number | null;
  /** Scroll the current segment into view as playback advances. */
  followPlayback?: boolean;
  /** 1-based id of the selected segment whose actions are open. */
  selectedSegmentId?: number | null;
  onSelectSegment?: (segmentId: number | null, segment: Segment | null) => void;
  /** Seek the player. Shown as timecode buttons and the "play from here" action. */
  onPlayFrom?: (segment: Segment, segmentId: number) => void;
  isSaved?: (segment: Segment, segmentId: number) => boolean;
  onSave?: (segment: Segment, segmentId: number) => void;
  onShare?: (segment: Segment, segmentId: number) => void;
  /** Replace the actions shown under a selected segment. */
  renderSegmentActions?: (props: {
    segment: Segment;
    segmentId: number;
    saved: boolean;
    close: () => void;
  }) => ReactNode;
  /** Pre-built turns; computed from `segments` and `hits` when omitted. */
  turns?: TranscriptTurn[];
  classNames?: ClassNames<TranscriptPart>;
  actionClassNames?: SegmentActionsProps['classNames'];
  strings?: Partial<RekolektStrings>;
};

const TranscriptSegment = memo(function TranscriptSegment({
  segment,
  segmentId,
  match,
  current,
  played,
  selected,
  saved,
  className,
  label,
  onSelect,
}: {
  segment: Segment;
  segmentId: number;
  match: boolean;
  current: boolean;
  played: boolean;
  selected: boolean;
  saved: boolean;
  className?: string;
  label: string;
  onSelect?: (segmentId: number, segment: Segment) => void;
}) {
  return (
    <span>
      <span id={momentAnchorId(segment.start_ms)} aria-hidden="true" />
      <button
        id={`rk-seg-${segmentId}`}
        type="button"
        data-part="segment"
        data-segment-id={segmentId}
        data-start-ms={segment.start_ms}
        data-end-ms={segment.end_ms}
        data-current={dataFlag(current)}
        data-played={dataFlag(played)}
        data-selected={dataFlag(selected)}
        data-saved={dataFlag(saved)}
        data-match={dataFlag(match)}
        aria-current={current ? 'time' : undefined}
        aria-expanded={onSelect ? selected : undefined}
        aria-label={label}
        className={className}
        onClick={() => onSelect?.(segmentId, segment)}
      >
        {normalizeTranscriptText(segment.text)}
      </button>{' '}
    </span>
  );
});

/**
 * Readable transcript grouped into speaker turns or paragraphs. Each segment is
 * a button: selecting it opens its actions. Playback state is exposed as
 * `data-current`, `data-played`, `data-selected`, `data-saved` and `data-match`.
 */
export const Transcript = forwardRef<HTMLDivElement, TranscriptProps>(function Transcript(
  {
    videoId,
    title,
    segments,
    hits = null,
    currentMs = null,
    followPlayback = false,
    selectedSegmentId = null,
    onSelectSegment,
    onPlayFrom,
    isSaved,
    onSave,
    onShare,
    renderSegmentActions,
    turns: providedTurns,
    classNames,
    actionClassNames,
    strings: overrides,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  const turns = useMemo(
    () => providedTurns ?? buildTranscriptTurns(segments, hits),
    [hits, providedTurns, segments]
  );
  const currentIndex = currentMs == null ? -1 : findSegmentIndexAt(segments, currentMs);
  const currentId = currentIndex >= 0 ? currentIndex + 1 : null;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastScroll = useRef(0);

  useEffect(() => {
    if (!followPlayback || currentId == null) return;
    const now = Date.now();
    if (now - lastScroll.current < 1500) return;
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-segment-id="${currentId}"]`);
    if (!element) return;
    lastScroll.current = now;
    element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [currentId, followPlayback]);

  // Keep one stable handler so unchanged segments skip re-rendering.
  const latest = useRef({ onSelectSegment, selectedSegmentId });
  latest.current = { onSelectSegment, selectedSegmentId };
  const stableSelect = useCallback((segmentId: number, segment: Segment) => {
    const { onSelectSegment: handler, selectedSegmentId: selectedId } = latest.current;
    if (selectedId === segmentId) handler?.(null, null);
    else handler?.(segmentId, segment);
  }, []);
  const select = onSelectSegment ? stableSelect : undefined;

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="list"
      aria-label={strings.transcriptLabel}
      data-rk="transcript"
      data-playing={dataFlag(currentMs != null)}
      {...props}
    >
      {turns.map((turn) => {
        const first = turn.segments[0];
        const selected = turn.segments.find(({ id }) => id === selectedSegmentId);
        const matches = turn.segments.filter(({ match }) => match);
        return (
          <div
            key={turn.key}
            role="listitem"
            data-part="turn"
            data-speaker={turn.speaker ?? undefined}
            data-open={dataFlag(Boolean(selected))}
            data-current={dataFlag(turn.segments.some(({ id }) => id === currentId))}
            className={classNames?.turn}
          >
            <div data-part="meta" className={classNames?.meta}>
              {first &&
                (onPlayFrom ? (
                  <button
                    type="button"
                    data-part="timecode"
                    className={classNames?.timecode}
                    aria-label={strings.playFromTimestamp(formatTimestamp(first.segment.start_ms))}
                    onClick={() => onPlayFrom(first.segment, first.id)}
                  >
                    {formatTimestamp(first.segment.start_ms)}
                  </button>
                ) : (
                  <span data-part="timecode" className={classNames?.timecode}>
                    {formatTimestamp(first.segment.start_ms)}
                  </span>
                ))}
              {turn.speaker && (
                <span data-part="speaker" className={classNames?.speaker}>
                  {turn.speaker}
                </span>
              )}
            </div>
            <p data-part="text" className={classNames?.text}>
              {turn.segments.map(({ segment, id, match }) => (
                <TranscriptSegment
                  key={id}
                  segment={segment}
                  segmentId={id}
                  match={Boolean(match)}
                  className={classNames?.segment}
                  label={strings.openSegmentAt(turn.speaker, formatTimestamp(segment.start_ms))}
                  current={id === currentId}
                  played={currentId != null && id < currentId}
                  selected={id === selectedSegmentId}
                  saved={isSaved?.(segment, id) ?? false}
                  onSelect={select}
                />
              ))}
            </p>
            {matches.length > 0 && (
              <aside role="note" data-part="matches" className={classNames?.matches}>
                <strong data-part="matchesTitle" className={classNames?.matchesTitle}>
                  {strings.searchMatch}
                </strong>
                {matches.map(({ match, id }) => (
                  <HighlightedSnippet
                    key={id}
                    as="div"
                    snippet={match?.snippet ?? ''}
                    highlights={match?.highlights}
                  />
                ))}
              </aside>
            )}
            {selected &&
              (() => {
                const saved = isSaved?.(selected.segment, selected.id) ?? false;
                const close = () => onSelectSegment?.(null, null);
                return renderSegmentActions ? (
                  renderSegmentActions({
                    segment: selected.segment,
                    segmentId: selected.id,
                    saved,
                    close,
                  })
                ) : (
                  <SegmentActions
                    videoId={videoId}
                    title={title}
                    segment={selected.segment}
                    saved={saved}
                    data-part="actions"
                    className={classNames?.actions}
                    classNames={actionClassNames}
                    strings={overrides}
                    onPlay={
                      onPlayFrom ? () => onPlayFrom(selected.segment, selected.id) : undefined
                    }
                    onSave={onSave ? () => onSave(selected.segment, selected.id) : undefined}
                    onShare={onShare ? () => onShare(selected.segment, selected.id) : undefined}
                    onClose={close}
                  />
                );
              })()}
          </div>
        );
      })}
    </div>
  );
});
