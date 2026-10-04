import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRekolekt } from '../provider/context';
import { useOptionalAuth } from '../auth/auth';
import type { FavoriteRecord } from '../client/client';
import type { TranscriptSource } from '../format/format';
import { localFavorites } from './localFavorites';

export type SavedMoment = {
  /** Server id for signed-in favorites; undefined for local ones. */
  id?: string;
  videoId: string;
  startMs: number;
  endMs: number;
  text: string;
  /** 1-based transcript segment number, kept for local favorites. */
  segIndex?: number;
  source?: TranscriptSource;
  storage: 'server' | 'local';
};

export type SaveMomentInput = {
  videoId: string;
  startMs: number;
  endMs: number;
  text: string;
  segIndex?: number;
  source?: TranscriptSource;
};

const EMPTY: FavoriteRecord[] = [];

/**
 * Saved moments for the current reader. Signed-in readers use the API's
 * favorites; signed-out readers use localStorage. Pass `videoId` to limit the
 * list to one episode.
 */
export function useFavorites(videoId?: string) {
  const { client, analytics } = useRekolekt();
  const auth = useOptionalAuth();
  const signedIn = Boolean(auth?.user);
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['rekolekt', client.baseUrl, 'favorites', auth?.user?.id ?? null, videoId ?? null],
    [auth?.user?.id, client.baseUrl, videoId]
  );
  const server = useQuery({
    queryKey,
    enabled: signedIn,
    queryFn: ({ signal }) => client.listFavorites(videoId, signal),
  });
  const local = useSyncExternalStore(
    localFavorites.subscribe,
    localFavorites.snapshot,
    localFavorites.snapshot
  );
  const serverItems = server.data?.items ?? EMPTY;

  const items: SavedMoment[] = useMemo(() => {
    if (signedIn) {
      return serverItems.map((item) => ({
        id: item.id,
        videoId: item.video_id,
        startMs: item.start_ms,
        endMs: item.end_ms,
        text: item.text ?? '',
        storage: 'server' as const,
      }));
    }
    return local
      .filter((item) => !videoId || item.videoId === videoId)
      .map((item) => ({ ...item, storage: 'local' as const }));
  }, [local, serverItems, signedIn, videoId]);

  const find = useCallback(
    (moment: { videoId: string; startMs: number; endMs: number; segIndex?: number }) =>
      items.find(
        (item) =>
          item.videoId === moment.videoId &&
          ((item.startMs === moment.startMs && item.endMs === moment.endMs) ||
            (moment.segIndex != null && item.segIndex === moment.segIndex))
      ),
    [items]
  );

  const remove = useCallback(
    async (item: SavedMoment) => {
      if (item.storage === 'server' && item.id) {
        await client.deleteFavorite(item.id);
        queryClient.setQueryData<{ items: FavoriteRecord[] }>(queryKey, (current) =>
          current ? { items: current.items.filter((entry) => entry.id !== item.id) } : current
        );
      } else {
        localFavorites.remove({
          videoId: item.videoId,
          segIndex: item.segIndex ?? 0,
          startMs: item.startMs,
          endMs: item.endMs,
          text: item.text,
        });
      }
      analytics?.track({
        type: 'favorite_remove',
        payload: { videoId: item.videoId, start_ms: item.startMs },
      });
    },
    [analytics, client, queryClient, queryKey]
  );

  /** Save the moment, or remove it if it is already saved. Resolves to the new state. */
  const toggle = useCallback(
    async (moment: SaveMomentInput): Promise<'saved' | 'removed'> => {
      const existing = find(moment);
      if (existing) {
        await remove(existing);
        return 'removed';
      }
      if (signedIn) {
        const created = await client.addFavorite({
          video_id: moment.videoId,
          start_ms: moment.startMs,
          end_ms: moment.endMs,
          text: moment.text,
        });
        queryClient.setQueryData<{ items: FavoriteRecord[] }>(queryKey, (current) => ({
          items: [
            {
              id: created.id,
              video_id: moment.videoId,
              start_ms: moment.startMs,
              end_ms: moment.endMs,
              text: moment.text,
            },
            ...(current?.items ?? []),
          ],
        }));
      } else {
        localFavorites.toggle({
          videoId: moment.videoId,
          segIndex: moment.segIndex ?? 0,
          startMs: moment.startMs,
          endMs: moment.endMs,
          text: moment.text,
          source: moment.source,
        });
      }
      analytics?.track({
        type: 'favorite_add',
        payload: { videoId: moment.videoId, start_ms: moment.startMs },
      });
      return 'saved';
    },
    [analytics, client, find, queryClient, queryKey, remove, signedIn]
  );

  return {
    items,
    storage: signedIn ? ('server' as const) : ('local' as const),
    loading: signedIn && server.isPending,
    error: server.isError ? server.error : null,
    isSaved: (moment: { videoId: string; startMs: number; endMs: number; segIndex?: number }) =>
      Boolean(find(moment)),
    toggle,
    remove,
  };
}
