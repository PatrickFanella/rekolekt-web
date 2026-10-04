import { forwardRef, useEffect, useId, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { useSite } from '../site/site';
import { useRekolekt } from '../provider/context';
import { normalizeTranscriptText } from '../transcript/transcript';
import { formatPassageTime, type PassageRange } from '../transcript/passages';
import { usePassageSelection, type PassageFeedback } from '../transcript/usePassageSelection';
import type { PlayerHandle } from '../player/useYouTubePlayer';
import type { Segment } from '../types/api';
import { dataFlag, type ClassNames } from './primitives';

type Part =
  | 'header'
  | 'heading'
  | 'description'
  | 'close'
  | 'fields'
  | 'field'
  | 'label'
  | 'input'
  | 'fromPlayback'
  | 'help'
  | 'error'
  | 'duration'
  | 'adjust'
  | 'actions'
  | 'action'
  | 'status'
  | 'link'
  | 'context'
  | 'contextHeading'
  | 'contextList'
  | 'contextEntry';

export type PassageEditorProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  videoId: string;
  title: string;
  initialRange: PassageRange;
  durationMs?: number;
  segments: Segment[];
  /** Player controls, e.g. the ref given to `<Player>`. */
  player?: PlayerHandle | null | { current: PlayerHandle | null };
  onClose?: () => void;
  /** Called before preview or continue, e.g. to reveal a hidden player. */
  onShowPlayer?: () => void;
  /** Move focus to the heading on mount. Default true. */
  autoFocus?: boolean;
  /** Extra actions, e.g. a link to discuss the passage. Receives the valid range or null. */
  renderExtraActions?: (range: PassageRange | null) => ReactNode;
  classNames?: ClassNames<Part>;
  strings?: Partial<RekolektStrings>;
};

function feedbackText(strings: RekolektStrings, feedback: PassageFeedback | null) {
  switch (feedback) {
    case 'playback-unavailable':
      return strings.passagePlaybackUnavailable;
    case 'preview-requested':
      return strings.passagePreviewRequested;
    case 'continuing':
      return strings.passageContinuing;
    case 'link-copied':
      return strings.passageLinkCopied;
    case 'copy-unavailable':
      return strings.passageCopyUnavailable;
    case 'shared':
      return strings.passageShared;
    case 'share-cancelled':
      return strings.passageShareCancelled;
    case 'share-unavailable':
      return strings.passageShareUnavailable;
    default:
      return '';
  }
}

/**
 * Choose a passage by start and end time, preview it in the player, then copy
 * or share its link. Shows the selected transcript text in context.
 */
export const PassageEditor = forwardRef<HTMLElement, PassageEditorProps>(function PassageEditor(
  {
    videoId,
    title,
    initialRange,
    durationMs,
    segments,
    player,
    onClose,
    onShowPlayer,
    autoFocus = true,
    renderExtraActions,
    classNames: c = {},
    strings: overrides,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  const site = useSite();
  const { client, links } = useRekolekt();
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const passage = usePassageSelection({
    videoId,
    title,
    initialRange,
    durationMs,
    segments,
    player,
    shareUrl: site.public_passages_enabled ? 'api' : 'episode',
    apiBase: client.baseUrl,
    episodeLink: (video, range) =>
      links.episode(video, { startMs: range.startMs, endMs: range.endMs }),
  });
  const errorText =
    passage.error === 'invalid'
      ? strings.passageInvalidTime
      : passage.error === 'order'
        ? strings.passageEndBeforeStart
        : passage.error === 'beyond-recording'
          ? strings.passageBeyondRecording
          : null;

  useEffect(() => {
    if (autoFocus) headingRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const describedBy = `${id}-help${errorText ? ` ${id}-error` : ''}`;

  return (
    <section
      ref={ref}
      aria-labelledby={`${id}-heading`}
      data-rk="passage-editor"
      data-invalid={dataFlag(Boolean(passage.error))}
      data-busy={dataFlag(passage.busy)}
      {...props}
    >
      <header data-part="header" className={c.header}>
        <h2
          id={`${id}-heading`}
          ref={headingRef}
          tabIndex={-1}
          data-part="heading"
          className={c.heading}
        >
          {strings.passageHeading}
        </h2>
        <p data-part="description" className={c.description}>
          {strings.passageDescription}
        </p>
        {onClose && (
          <button
            type="button"
            data-part="close"
            className={c.close}
            onClick={() => {
              passage.pause();
              onClose();
            }}
          >
            {strings.passageClose}
          </button>
        )}
      </header>
      <div data-part="fields" className={c.fields}>
        {(['start', 'end'] as const).map((which) => (
          <div key={which} data-part="field" data-field={which} className={c.field}>
            <label htmlFor={`${id}-${which}`} data-part="label" className={c.label}>
              {which === 'start' ? strings.passageStart : strings.passageEnd}
            </label>
            <input
              id={`${id}-${which}`}
              data-part="input"
              className={c.input}
              inputMode="decimal"
              value={which === 'start' ? passage.start : passage.end}
              onChange={(event) =>
                which === 'start'
                  ? passage.setStart(event.target.value)
                  : passage.setEnd(event.target.value)
              }
              aria-invalid={Boolean(passage.error)}
              aria-describedby={describedBy}
            />
            {player && (
              <button
                type="button"
                data-part="fromPlayback"
                className={c.fromPlayback}
                onClick={() => passage.setFromPlayback(which)}
              >
                {strings.passageSetFromPlayback(which)}
              </button>
            )}
          </div>
        ))}
      </div>
      <p id={`${id}-help`} data-part="help" className={c.help}>
        {strings.passageTimeHelp}
      </p>
      {errorText ? (
        <p id={`${id}-error`} role="alert" data-part="error" className={c.error}>
          {errorText}
        </p>
      ) : (
        <p data-part="duration" className={c.duration}>
          {strings.passageDuration(passage.durationSeconds ?? 0)}
        </p>
      )}
      <div data-part="adjust" className={c.adjust}>
        <button
          type="button"
          data-part="action"
          data-action="includePrevious"
          className={c.action}
          disabled={!passage.canIncludePrevious}
          onClick={passage.includePrevious}
        >
          {strings.passageIncludePrevious}
        </button>
        <button
          type="button"
          data-part="action"
          data-action="includeNext"
          className={c.action}
          disabled={!passage.canIncludeNext}
          onClick={passage.includeNext}
        >
          {strings.passageIncludeNext}
        </button>
      </div>
      <div data-part="actions" className={c.actions}>
        {player && (
          <>
            <button
              type="button"
              data-part="action"
              data-action="preview"
              className={c.action}
              disabled={!passage.range}
              onClick={() => {
                onShowPlayer?.();
                passage.preview();
              }}
            >
              {strings.passagePreview}
            </button>
            <button
              type="button"
              data-part="action"
              data-action="continue"
              className={c.action}
              disabled={!passage.range}
              onClick={() => {
                onShowPlayer?.();
                passage.continueAfter();
              }}
            >
              {strings.passageContinue}
            </button>
          </>
        )}
        <button
          type="button"
          data-part="action"
          data-action="copyLink"
          className={c.action}
          disabled={!passage.range}
          onClick={() => void passage.copyLink()}
        >
          {strings.passageCopyLink}
        </button>
        {passage.canShare && (
          <button
            type="button"
            data-part="action"
            data-action="share"
            className={c.action}
            disabled={!passage.range || passage.busy}
            onClick={() => void passage.share()}
          >
            {strings.passageShare}
          </button>
        )}
        {renderExtraActions?.(passage.range)}
      </div>
      <p
        role="status"
        aria-live="polite"
        data-part="status"
        data-feedback={passage.feedback ?? undefined}
        className={c.status}
      >
        {feedbackText(strings, passage.feedback)}
      </p>
      {passage.range && (
        <label data-part="link" className={c.link}>
          {strings.passageLinkLabel}
          <input readOnly value={passage.link} onFocus={(event) => event.currentTarget.select()} />
        </label>
      )}
      <div data-part="context" className={c.context}>
        <h3 data-part="contextHeading" className={c.contextHeading}>
          {strings.passageContextHeading}
        </h3>
        <p data-part="help" className={c.help}>
          {strings.passageContextHelp}
        </p>
        <div
          data-part="contextList"
          className={c.contextList}
          tabIndex={0}
          aria-label={strings.passageContextHeading}
        >
          {passage.context.omitted > 0 && (
            <p>{strings.passageContextOmitted(passage.context.omitted)}</p>
          )}
          {passage.context.entries.map(({ segment, selected }, index) => (
            <p
              key={`${segment.start_ms}:${index}`}
              data-part="contextEntry"
              data-selected={dataFlag(selected)}
              className={c.contextEntry}
            >
              <time>{formatPassageTime(segment.start_ms)}</time>{' '}
              {selected ? (
                <mark>{normalizeTranscriptText(segment.text)}</mark>
              ) : (
                normalizeTranscriptText(segment.text)
              )}
            </p>
          ))}
          {!passage.context.entries.length && (
            <p>{passage.error ? strings.passageContextInvalid : strings.passageContextEmpty}</p>
          )}
        </div>
      </div>
    </section>
  );
});
