import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { useSite } from '../site/site';
import { cx, Slot, type ClassNames } from './primitives';

type StateProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** Render your own element instead of the default `<div>`, keeping role and attributes. */
  asChild?: boolean;
  strings?: Partial<RekolektStrings>;
  children?: ReactNode;
};

/** Polite live region shown while data loads. Children replace the default text. */
export const LoadingState = forwardRef<HTMLDivElement, StateProps>(function LoadingState(
  { asChild, strings: overrides, children, className, ...props },
  ref
) {
  const strings = useStrings(overrides);
  const Component = asChild ? Slot : 'div';
  return (
    <Component
      ref={ref}
      role="status"
      aria-live="polite"
      data-rk="loading-state"
      data-loading=""
      className={className}
      {...props}
    >
      {children ?? strings.loading}
    </Component>
  );
});

/** Message for a list or result set with no items. */
export const EmptyState = forwardRef<HTMLDivElement, StateProps>(function EmptyState(
  { asChild, strings: overrides, children, className, ...props },
  ref
) {
  const strings = useStrings(overrides);
  const Component = asChild ? Slot : 'div';
  return (
    <Component ref={ref} data-rk="empty-state" className={className} {...props}>
      {children ?? strings.empty}
    </Component>
  );
});

export type ErrorStateProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** Shows a retry button when given. */
  onRetry?: () => void;
  title?: ReactNode;
  classNames?: ClassNames<'title' | 'message' | 'retry'>;
  strings?: Partial<RekolektStrings>;
  children?: ReactNode;
};

/** Alert with an optional retry action. */
export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(function ErrorState(
  { onRetry, title, classNames, strings: overrides, children, className, ...props },
  ref
) {
  const strings = useStrings(overrides);
  return (
    <div ref={ref} role="alert" data-rk="error-state" className={className} {...props}>
      <p data-part="title" className={classNames?.title}>
        {title ?? strings.errorTitle}
      </p>
      {children != null && (
        <div data-part="message" className={classNames?.message}>
          {children}
        </div>
      )}
      {onRetry && (
        <button type="button" data-part="retry" className={classNames?.retry} onClick={onRetry}>
          {strings.retry}
        </button>
      )}
    </div>
  );
});

export type NoticeProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode;
  /** Free-form notice kind exposed as `data-kind`, e.g. `correction` or `transcript`. */
  kind?: string;
  asChild?: boolean;
  classNames?: ClassNames<'title' | 'body'>;
  children?: ReactNode;
};

/** A note beside content, such as a correction, caveat or source notice. */
export const Notice = forwardRef<HTMLElement, NoticeProps>(function Notice(
  { title, kind, asChild, classNames, children, className, ...props },
  ref
) {
  const Component = asChild ? Slot : 'aside';
  return (
    <Component
      ref={ref as never}
      role="note"
      data-rk="notice"
      data-kind={kind}
      className={cx(className)}
      {...props}
    >
      {title != null && (
        <strong data-part="title" className={classNames?.title}>
          {title}
        </strong>
      )}{' '}
      <span data-part="body" className={classNames?.body}>
        {children}
      </span>
    </Component>
  );
});

/** Caveat about automated transcripts. Override the text with `strings` or children. */
export const TranscriptNotice = forwardRef<
  HTMLElement,
  Omit<NoticeProps, 'kind'> & { strings?: Partial<RekolektStrings> }
>(function TranscriptNotice({ strings: overrides, title, children, ...props }, ref) {
  const strings = useStrings(overrides);
  return (
    <Notice ref={ref} kind="transcript" title={title ?? strings.transcriptNoticeTitle} {...props}>
      {children ?? strings.transcriptNoticeBody}
    </Notice>
  );
});

/** The archive's `project_notice` from `/site`; renders nothing when empty. */
export const SiteNotice = forwardRef<HTMLElement, Omit<NoticeProps, 'kind'>>(function SiteNotice(
  { children, ...props },
  ref
) {
  const site = useSite();
  const text = children ?? site.project_notice;
  if (!text) return null;
  return (
    <Notice ref={ref} kind="site" {...props}>
      {text}
    </Notice>
  );
});
