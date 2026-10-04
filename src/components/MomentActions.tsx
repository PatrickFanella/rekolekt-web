import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useRekolekt } from '../provider/context';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { useMomentActions } from '../transcript/useMomentActions';
import { dataFlag, type ClassNames } from './primitives';

export type MomentAction =
  'open' | 'play' | 'share' | 'copyLink' | 'copyQuote' | 'save' | 'episode';

export const defaultMomentActions: MomentAction[] = [
  'open',
  'share',
  'play',
  'copyLink',
  'copyQuote',
  'save',
  'episode',
];

export type MomentActionsProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  videoId: string;
  /** Episode title used in copied quotes. */
  title: string;
  startMs: number;
  endMs?: number;
  /** Plain text of the moment, used in copied quotes. */
  text: string;
  /** Adds "Play from here", which plays this query's matches in order. */
  query?: string;
  saved?: boolean;
  /** Shows the save button. Receives no arguments; save with `useFavorites().toggle`. */
  onSave?: () => void;
  /** Called when a link to the moment is followed, e.g. for analytics. */
  onOpen?: () => void;
  /** Which actions to show, in order. */
  actions?: MomentAction[];
  /** Extra actions appended after the defaults. */
  children?: ReactNode;
  classNames?: ClassNames<'action' | 'status'>;
  strings?: Partial<RekolektStrings>;
};

/**
 * Actions for one cited moment: open, share passage, play matches, copy link,
 * copy quote, save and open the full episode. Copy results are announced in a
 * polite live region.
 */
export const MomentActions = forwardRef<HTMLDivElement, MomentActionsProps>(function MomentActions(
  {
    videoId,
    title,
    startMs,
    endMs,
    text,
    query,
    saved = false,
    onSave,
    onOpen,
    actions = defaultMomentActions,
    children,
    classNames,
    strings: overrides,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  const { links, Link } = useRekolekt();
  const { copyLink, copyQuote, status, lastKey } = useMomentActions({ videoId, title });
  const hasRange = endMs != null && Number.isSafeInteger(endMs) && endMs > startMs;
  const action = classNames?.action;

  const rendered = actions.map((name) => {
    switch (name) {
      case 'open':
        return (
          <Link
            key={name}
            href={links.episode(videoId, { startMs })}
            data-part="action"
            data-action={name}
            className={action}
            onClick={onOpen}
          >
            {strings.openMoment}
          </Link>
        );
      case 'share':
        return hasRange ? (
          <Link
            key={name}
            href={links.episode(videoId, { startMs, endMs })}
            data-part="action"
            data-action={name}
            className={action}
          >
            {strings.sharePassage}
          </Link>
        ) : null;
      case 'play':
        return query ? (
          <Link
            key={name}
            href={links.episode(videoId, { startMs, query, playMatches: true })}
            data-part="action"
            data-action={name}
            className={action}
            onClick={onOpen}
          >
            {strings.playFromHere}
          </Link>
        ) : null;
      case 'copyLink':
        return (
          <button
            key={name}
            type="button"
            data-part="action"
            data-action={name}
            className={action}
            onClick={() => void copyLink(startMs)}
          >
            {strings.copyLink}
          </button>
        );
      case 'copyQuote':
        return (
          <button
            key={name}
            type="button"
            data-part="action"
            data-action={name}
            className={action}
            onClick={() => void copyQuote(text, startMs)}
          >
            {strings.copyQuote}
          </button>
        );
      case 'save':
        return onSave ? (
          <button
            key={name}
            type="button"
            data-part="action"
            data-action={name}
            data-saved={dataFlag(saved)}
            className={action}
            aria-pressed={saved}
            aria-label={saved ? strings.removeSavedMoment : strings.saveMoment}
            onClick={onSave}
          >
            {saved ? strings.saved : strings.save}
          </button>
        ) : null;
      case 'episode':
        return (
          <Link
            key={name}
            href={links.episode(videoId)}
            data-part="action"
            data-action={name}
            className={action}
          >
            {strings.fullEpisode}
          </Link>
        );
      default:
        return null;
    }
  });

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
      data-rk="moment-actions"
      data-saved={dataFlag(saved)}
      {...props}
    >
      {rendered}
      {children}
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
});
