import { useRef, useState } from 'react';
import {
  EpisodeList,
  PassageEditor,
  Player,
  RekolektProvider,
  SavedMomentsList,
  SearchForm,
  SearchResults,
  SignInOptions,
  SignOutButton,
  SiteNotice,
  TopicList,
  Transcript,
  TranscriptNotice,
  findEpisodeTopics,
  formatVideoTitle,
  useArchiveSearch,
  useAuth,
  useEpisode,
  useEpisodes,
  useFavorites,
  usePlaybackTime,
  useSite,
  useTranscript,
  type PlayerHandle,
  type Segment,
} from '@subcult/rekolekt-web';

// No router: links are plain `?episode=` URLs so the example stays one file.
const links = {
  episode: (videoId: string, options?: { startMs?: number }) =>
    `?episode=${encodeURIComponent(videoId)}${options?.startMs != null ? `&t=${Math.floor(options.startMs / 1000)}` : ''}`,
  search: (query: string) => `?q=${encodeURIComponent(query)}`,
};

export function App({ variant }: { variant: string }) {
  return (
    <RekolektProvider baseUrl="/api" links={links}>
      <Shell variant={variant} />
    </RekolektProvider>
  );
}

function Shell({ variant }: { variant: string }) {
  const site = useSite();
  const params = new URLSearchParams(window.location.search);
  const episodeId = params.get('episode');
  return (
    <div className="example">
      <header>
        <h1>{site.name}</h1>
        <p>
          {site.description} <small>(styled with the {variant})</small>
        </p>
        <Account />
      </header>
      {episodeId ? (
        <Episode videoId={episodeId} startSeconds={Number(params.get('t') ?? 0)} />
      ) : (
        <Home initialQuery={params.get('q') ?? ''} />
      )}
      <footer>
        <SiteNotice />
      </footer>
    </div>
  );
}

function Account() {
  const { user } = useAuth();
  return user ? <SignOutButton /> : <SignInOptions headingLevel={2} />;
}

function Home({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const search = useArchiveSearch({ q: query });
  const episodes = useEpisodes({ limit: 6 });
  const favorites = useFavorites();
  return (
    <main>
      <SearchForm defaultValue={initialQuery} onSearch={setQuery} />
      {search.enabled ? (
        <SearchResults
          query={query}
          results={search.results}
          loading={search.loading}
          loadingMore={search.loadingMore}
          canLoadMore={search.canLoadMore}
          onLoadMore={search.loadMore}
          error={search.error}
          onRetry={search.retry}
          isSaved={(videoId, moment) =>
            favorites.isSaved({ videoId, startMs: moment.start_ms, endMs: moment.end_ms })
          }
          onSave={(group, moment) =>
            void favorites.toggle({
              videoId: group.video.id,
              startMs: moment.start_ms,
              endMs: moment.end_ms,
              text: moment.snippet,
            })
          }
        />
      ) : (
        <>
          <h2>Recent episodes</h2>
          <EpisodeList {...episodes} onLoadMore={episodes.loadMore} onRetry={episodes.retry} />
        </>
      )}
      <h2>Saved moments</h2>
      <SavedMomentsList items={favorites.items} onRemove={(item) => void favorites.remove(item)} />
    </main>
  );
}

function Episode({ videoId, startSeconds }: { videoId: string; startSeconds: number }) {
  const episode = useEpisode(videoId);
  const transcript = useTranscript(videoId);
  const favorites = useFavorites(videoId);
  const player = useRef<PlayerHandle>(null);
  const currentMs = usePlaybackTime(player);
  const [selected, setSelected] = useState<number | null>(null);
  const [passage, setPassage] = useState<Segment | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const segments = transcript.data?.segments ?? [];
  const title = formatVideoTitle(episode.data?.title, episode.data?.uploaded_at);
  const topics = findEpisodeTopics(
    segments,
    (episode.data?.tags ?? []).map((tag) => ({
      key: tag.slug,
      label: tag.label,
      terms: [],
      kind: 'tag' as const,
    }))
  );
  return (
    <main>
      <p>
        <a href="?">Back</a>
      </p>
      <h2>{title}</h2>
      {episode.data && (
        <Player ref={player} youtubeId={episode.data.youtube_id} start={startSeconds} />
      )}
      <TopicList
        label="Tags in this episode"
        items={topics.map((item) => ({ key: item.key, label: item.label, count: item.count }))}
        selectedKey={topic}
        onSelect={setTopic}
      />
      {passage && (
        <PassageEditor
          videoId={videoId}
          title={title}
          initialRange={{ startMs: passage.start_ms, endMs: passage.end_ms }}
          durationMs={(episode.data?.duration_seconds ?? 0) * 1000 || undefined}
          segments={segments}
          player={player}
          onClose={() => setPassage(null)}
        />
      )}
      <TranscriptNotice />
      <Transcript
        videoId={videoId}
        title={title}
        segments={segments}
        currentMs={currentMs}
        followPlayback
        selectedSegmentId={selected}
        onSelectSegment={(id) => setSelected(id)}
        onPlayFrom={(segment) => player.current?.seekTo(segment.start_ms / 1000, { play: true })}
        isSaved={(segment) =>
          favorites.isSaved({ videoId, startMs: segment.start_ms, endMs: segment.end_ms })
        }
        onSave={(segment, id) =>
          void favorites.toggle({
            videoId,
            startMs: segment.start_ms,
            endMs: segment.end_ms,
            text: segment.text,
            segIndex: id,
          })
        }
        onShare={(segment) => setPassage(segment)}
      />
    </main>
  );
}
