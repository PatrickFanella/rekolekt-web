import { forwardRef, useImperativeHandle, type HTMLAttributes, type ReactNode } from 'react';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { useYouTubePlayer, type PlayerHandle, type PlayerStatus } from '../player/useYouTubePlayer';
import { dataFlag, type ClassNames } from './primitives';

export type PlayerProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** YouTube video id of the source recording. */
  youtubeId: string;
  /** Start position in seconds. Changing it seeks. */
  start?: number;
  /** Accessible title of the embedded player. */
  title?: string;
  /** Replace the loading or error overlay. */
  renderOverlay?: (state: {
    status: PlayerStatus;
    errorMessage: string | null;
    retry: () => void;
    sourceUrl: string;
  }) => ReactNode;
  classNames?: ClassNames<'frame' | 'overlay' | 'retry' | 'sourceLink'>;
  strings?: Partial<RekolektStrings>;
};

/**
 * Source-recording player. The ref receives `PlayerHandle` controls (seek, play,
 * pause, preview a range, read the time). `data-status` is loading, ready or
 * error; `data-playing` is set while it plays.
 */
export const Player = forwardRef<PlayerHandle, PlayerProps>(function Player(
  { youtubeId, start = 0, title, renderOverlay, classNames, strings: overrides, ...props },
  ref
) {
  const strings = useStrings(overrides);
  const { containerRef, status, error, playing, controls, retry, sourceUrl } = useYouTubePlayer({
    videoId: youtubeId,
    start,
  });
  useImperativeHandle(ref, () => controls, [controls]);
  const errorMessage =
    error?.kind === 'player' ? strings.playerError(error.code) : (error?.message ?? null);

  return (
    <div data-rk="player" data-status={status} data-playing={dataFlag(playing)} {...props}>
      <div
        ref={containerRef}
        title={title ?? strings.playerTitle}
        data-part="frame"
        className={classNames?.frame}
      />
      {renderOverlay
        ? status !== 'ready' && renderOverlay({ status, errorMessage, retry, sourceUrl })
        : null}
      {!renderOverlay && status === 'loading' && (
        <div
          role="status"
          data-part="overlay"
          data-status="loading"
          className={classNames?.overlay}
        >
          {strings.playerLoading}
        </div>
      )}
      {!renderOverlay && status === 'error' && (
        <div role="alert" data-part="overlay" data-status="error" className={classNames?.overlay}>
          <strong>{strings.playerUnavailable}</strong> {errorMessage && <span>{errorMessage}</span>}
          <button type="button" data-part="retry" className={classNames?.retry} onClick={retry}>
            {strings.retry}
          </button>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            data-part="sourceLink"
            className={classNames?.sourceLink}
          >
            {strings.openOnSource}
          </a>
        </div>
      )}
    </div>
  );
});
