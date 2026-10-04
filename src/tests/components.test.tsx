import { createRef, forwardRef, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EmptyState,
  EpisodeCard,
  EpisodeList,
  ErrorState,
  LoadingState,
  MomentActions,
  Notice,
  PassageEditor,
  SavedMomentsList,
  SavedSearchesList,
  SearchForm,
  SearchMoments,
  SearchResults,
  SignInOptions,
  SignOutButton,
  SiteNotice,
  TopicList,
  Transcript,
  TranscriptNotice,
  type LinkProps,
} from '../components';
import { StringsProvider } from '../strings/strings';
import type { PlayerHandle } from '../player/useYouTubePlayer';
import type { GroupedSearchResponse, SearchMoment, VideoInfo } from '../types/api';
import { expectAccessible } from './axe';
import { renderWithKit, siteFixture } from './test-utils';

const episode: VideoInfo = {
  id: 'v1',
  youtube_id: 'yt1',
  title: 'First episode',
  duration_seconds: 3725,
  uploaded_at: '2026-06-15T12:00:00Z',
  channel_name: 'Channel',
  state: 'completed',
  people: [{ slug: 'p', display_name: 'Person', aliases: [] }],
  tags: [{ slug: 't', label: 'Tag', kind: 'topic' }],
};

const moment = (id: number, start: number): SearchMoment => ({
  id,
  video_id: 'v1',
  start_ms: start,
  end_ms: start + 2000,
  snippet: `about <mark>rent</mark> ${id}`,
});

const segments = [
  { start_ms: 0, end_ms: 1500, text: 'Hello there.', speaker_label: 'Host' },
  { start_ms: 2000, end_ms: 3500, text: 'Rent is high.', speaker_label: 'Host' },
  { start_ms: 4000, end_ms: 5500, text: 'Indeed it is.', speaker_label: 'Guest' },
];

beforeEach(() => {
  vi.mocked(navigator.clipboard.writeText).mockReset();
  vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
});

describe('async states and notices', () => {
  it('renders accessible defaults, overrides, classes and refs', async () => {
    const ref = createRef<HTMLDivElement>();
    const onRetry = vi.fn();
    const { container } = render(
      <StringsProvider strings={{ loading: 'Fetching…', retry: 'Try again' }}>
        <LoadingState ref={ref} className="my-loading" />
        <EmptyState>No episodes</EmptyState>
        <ErrorState onRetry={onRetry} classNames={{ retry: 'my-retry' }}>
          Details
        </ErrorState>
        <Notice kind="correction" title="Correction">
          Fixed a name.
        </Notice>
        <TranscriptNotice strings={{ transcriptNoticeTitle: 'Machine transcript' }} />
      </StringsProvider>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Fetching…');
    expect(ref.current).toHaveAttribute('data-loading');
    expect(ref.current).toHaveClass('my-loading');
    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(retry).toHaveClass('my-retry');
    await userEvent.click(retry);
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getAllByRole('note')[0]).toHaveAttribute('data-kind', 'correction');
    expect(screen.getByText('Machine transcript')).toBeInTheDocument();
    await expectAccessible(container);
  });

  it('supports asChild composition', () => {
    render(
      <EmptyState asChild className="outer">
        <p className="inner">Custom element</p>
      </EmptyState>
    );
    const element = screen.getByText('Custom element');
    expect(element.tagName).toBe('P');
    expect(element).toHaveAttribute('data-rk', 'empty-state');
    expect(element).toHaveClass('outer', 'inner');
  });

  it('shows the site project notice', async () => {
    renderWithKit(<SiteNotice />, {
      routes: { '/site': { ...siteFixture, project_notice: 'Recordings belong to their owners.' } },
    });
    expect(await screen.findByRole('note')).toHaveTextContent('Recordings belong to their owners.');
  });
});

describe('SearchForm', () => {
  it('submits trimmed queries, ignores blanks and offers suggestions', async () => {
    const onSearch = vi.fn();
    const ref = createRef<HTMLFormElement>();
    const { container } = render(
      <SearchForm
        ref={ref}
        onSearch={onSearch}
        suggestions={['rent', 'labor']}
        classNames={{ input: 'my-input' }}
        strings={{ searchSubmit: 'Find' }}
      />
    );
    // A search input with a datalist is exposed as a combobox.
    const input = screen.getByRole('combobox', { name: 'Search the archive' });
    expect(input).toHaveClass('my-input');
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(onSearch).not.toHaveBeenCalled();
    await userEvent.type(input, '  rent control {enter}');
    expect(onSearch).toHaveBeenCalledWith('rent control');
    expect(ref.current).toHaveAttribute('role', 'search');
    expect(container.querySelectorAll('datalist option')).toHaveLength(2);
    await expectAccessible(container);
  });

  it('works as a controlled input', async () => {
    function Controlled() {
      const [value, setValue] = useState('start');
      return (
        <>
          <SearchForm value={value} onValueChange={setValue} onSearch={() => {}} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.type(screen.getByRole('searchbox'), 'ed');
    expect(screen.getByRole('status')).toHaveTextContent('started');
  });
});

describe('MomentActions', () => {
  it('copies links and quotes, toggles save and announces results', async () => {
    const onSave = vi.fn();
    const { container, rerender, Wrapper } = renderWithKit(
      <MomentActions
        videoId="v1"
        title="First episode"
        startMs={61_000}
        endMs={65_000}
        text="Rent is high."
        query="rent"
        onSave={onSave}
      />
    );
    expect(screen.getByRole('link', { name: 'Play from here' })).toHaveAttribute(
      'href',
      '/v/v1?t=61&q=rent&play=matches#moment-61000'
    );
    expect(screen.getByRole('link', { name: 'Share passage' })).toHaveAttribute(
      'href',
      '/v/v1?t=61&end_ms=65000#moment-61000'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Copy quote' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '“Rent is high.”\n\n— First episode, 00:01:01\nhttp://localhost:3000/v/v1?t=61#moment-61000'
    );
    expect(await screen.findByText('Quote copied.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await screen.findByText('Link copied.')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save moment' });
    expect(save).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(save);
    expect(onSave).toHaveBeenCalled();
    rerender(
      <Wrapper>
        <MomentActions videoId="v1" title="t" startMs={0} text="x" saved onSave={onSave} />
      </Wrapper>
    );
    expect(screen.getByRole('button', { name: 'Remove saved moment' })).toHaveAttribute(
      'data-saved',
      ''
    );
    await expectAccessible(container);
  });

  it('reports copy failures and limits actions', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
    renderWithKit(
      <MomentActions
        videoId="v1"
        title="t"
        startMs={0}
        text="x"
        actions={['copyLink']}
        strings={{ copyFailed: 'No clipboard.' }}
      />
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('link')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await screen.findByText('No clipboard.')).toBeInTheDocument();
  });

  it('renders internal links through a custom link component', () => {
    const RouterLink = forwardRef<HTMLAnchorElement, LinkProps>(function RouterLink(
      { href, ...props },
      ref
    ) {
      return <a ref={ref} data-router="" href={`#${href}`} {...props} />;
    });
    renderWithKit(
      <MomentActions videoId="v1" title="t" startMs={0} text="x" actions={['episode']} />,
      {
        provider: { linkComponent: RouterLink, links: { episode: (id) => `/watch/${id}` } },
      }
    );
    const link = screen.getByRole('link', { name: 'Full episode' });
    expect(link).toHaveAttribute('data-router');
    expect(link).toHaveAttribute('href', '#/watch/v1');
  });
});

describe('search results', () => {
  const results: GroupedSearchResponse = {
    total_moments: 5,
    total_videos: 1,
    groups: [
      {
        video: episode,
        moments: [
          moment(1, 0),
          moment(2, 4000),
          moment(3, 60_000),
          moment(4, 120_000),
          moment(5, 180_000),
        ],
      },
    ],
  };

  it('clusters nearby moments and reveals more clusters', async () => {
    const { container } = renderWithKit(
      <SearchMoments
        videoId="v1"
        title="First"
        moments={results.groups[0].moments}
        query="rent"
        initialClusters={2}
      />
    );
    expect(screen.getByText('1 nearby match')).toBeInTheDocument();
    expect(container.querySelectorAll('mark')).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Show 2 more moment clusters' }));
    expect(screen.queryByRole('button', { name: /more moment clusters/ })).toBeNull();
    await expectAccessible(container);
  });

  it('renders groups, saved state, load more and the empty and error states', async () => {
    const onLoadMore = vi.fn();
    const onSave = vi.fn();
    const { rerender, Wrapper, container } = renderWithKit(
      <SearchResults
        query="rent"
        results={results}
        canLoadMore
        onLoadMore={onLoadMore}
        isSaved={(_videoId, item) => item.id === 1}
        onSave={onSave}
      />
    );
    expect(screen.getByText('5 moments in 1 episode')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'First episode' })).toBeInTheDocument();
    expect(container.querySelector('[data-part="moment"]')).toHaveAttribute('data-saved', '');
    await userEvent.click(screen.getByRole('button', { name: 'Load more results' }));
    expect(onLoadMore).toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole('button', { name: 'Save moment' })[0]);
    expect(onSave).toHaveBeenCalledWith(
      results.groups[0],
      expect.objectContaining({ video_id: 'v1' })
    );
    expect(screen.getByRole('button', { name: 'Remove saved moment' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expectAccessible(container);

    rerender(
      <Wrapper>
        <SearchResults
          query="nothing"
          results={{ ...results, groups: [], total_moments: 0, total_videos: 0 }}
        />
      </Wrapper>
    );
    expect(screen.getByText('No moments match “nothing”.')).toBeInTheDocument();
    rerender(
      <Wrapper>
        <SearchResults query="x" results={null} error={new Error('x')} onRetry={() => {}} />
      </Wrapper>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Search failed. Try again.');
    rerender(
      <Wrapper>
        <SearchResults query="x" results={null} loading />
      </Wrapper>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});

describe('episodes', () => {
  it('renders an episode card with metadata, status and thumbnail fallback', async () => {
    const ref = createRef<HTMLElement>();
    const { container } = renderWithKit(
      <EpisodeCard ref={ref} episode={episode} classNames={{ title: 'my-title' }} />
    );
    expect(ref.current).toHaveAttribute('data-status', 'ready');
    expect(screen.getByRole('heading', { level: 3 })).toHaveClass('my-title');
    expect(
      screen.getByRole('link', { name: 'Watch First episode with transcript' })
    ).toHaveAttribute('href', '/v/v1');
    expect(screen.getByText('1:02:05')).toBeInTheDocument();
    expect(screen.getByText('Person').closest('li')).toHaveAttribute('data-kind', 'person');
    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByText('Thumbnail unavailable')).toBeInTheDocument();
    await expectAccessible(container);
  });

  it('renders the list states and custom items', async () => {
    const { rerender, Wrapper } = renderWithKit(<EpisodeList episodes={[]} loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(
      <Wrapper>
        <EpisodeList episodes={[]} strings={{ empty: 'No episodes yet.' }} />
      </Wrapper>
    );
    expect(screen.getByText('No episodes yet.')).toBeInTheDocument();
    const onLoadMore = vi.fn();
    rerender(
      <Wrapper>
        <EpisodeList
          episodes={[episode]}
          canLoadMore
          onLoadMore={onLoadMore}
          renderEpisode={(item) => <span>custom {item.id}</span>}
        />
      </Wrapper>
    );
    expect(screen.getByText('custom v1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalled();
  });
});

describe('Transcript', () => {
  it('groups turns, marks playback state and opens segment actions', async () => {
    const onPlayFrom = vi.fn();
    const onSave = vi.fn();
    function Harness() {
      const [selected, setSelected] = useState<number | null>(null);
      return (
        <Transcript
          videoId="v1"
          title="First episode"
          segments={segments}
          hits={[{ ...moment(9, 2100), snippet: '<mark>Rent</mark> is high.' }]}
          currentMs={2500}
          selectedSegmentId={selected}
          onSelectSegment={(id) => setSelected(id)}
          onPlayFrom={onPlayFrom}
          isSaved={(_segment, id) => id === 3}
          onSave={onSave}
        />
      );
    }
    const { container } = renderWithKit(<Harness />);
    const turns = screen.getAllByRole('listitem');
    expect(turns).toHaveLength(2);
    expect(turns[0]).toHaveAttribute('data-speaker', 'Host');
    const first = screen.getByRole('button', { name: 'Open Host at 00:00:00' });
    const second = screen.getByRole('button', { name: 'Open Host at 00:00:02' });
    const third = screen.getByRole('button', { name: 'Open Guest at 00:00:04' });
    expect(first).toHaveAttribute('data-played');
    expect(second).toHaveAttribute('data-current');
    expect(second).toHaveAttribute('aria-current', 'time');
    expect(second).toHaveAttribute('data-match');
    expect(third).toHaveAttribute('data-saved');
    expect(screen.getByText('Search match')).toBeInTheDocument();

    await userEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    const actions = screen.getByRole('group', { name: 'Moment actions' });
    await userEvent.click(within(actions).getByRole('button', { name: 'Play from here' }));
    expect(onPlayFrom).toHaveBeenCalledWith(segments[1], 2);
    await userEvent.click(within(actions).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(segments[1], 2);
    await userEvent.click(within(actions).getByRole('button', { name: 'Copy quote' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '“Rent is high.”\n\n— First episode, 00:00:02\nhttp://localhost:3000/v/v1?t=2#moment-2000'
    );
    await expectAccessible(container);
    await userEvent.click(within(actions).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('group', { name: 'Moment actions' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Play from 00:00:04' }));
    expect(onPlayFrom).toHaveBeenCalledWith(segments[2], 3);
  });

  it('accepts replacement actions and strings', () => {
    renderWithKit(
      <Transcript
        videoId="v1"
        title="t"
        segments={segments}
        selectedSegmentId={1}
        onSelectSegment={() => {}}
        renderSegmentActions={({ segmentId }) => <p>custom actions {segmentId}</p>}
        strings={{ transcriptLabel: 'Full text' }}
      />
    );
    expect(screen.getByRole('list', { name: 'Full text' })).toBeInTheDocument();
    expect(screen.getByText('custom actions 1')).toBeInTheDocument();
  });

  it('scrolls the current segment into view when following playback', () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    renderWithKit(
      <Transcript videoId="v1" title="t" segments={segments} currentMs={4100} followPlayback />
    );
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
  });
});

describe('PassageEditor', () => {
  function player(): PlayerHandle {
    return {
      getCurrentTime: vi.fn(() => 2.25),
      pause: vi.fn(),
      play: vi.fn(),
      togglePlay: vi.fn(),
      seekTo: vi.fn(),
      previewRange: vi.fn(),
    };
  }

  it('edits, validates, previews and copies a passage', async () => {
    const controls = player();
    const onClose = vi.fn();
    const { container } = renderWithKit(
      <PassageEditor
        videoId="v1"
        title="First"
        initialRange={{ startMs: 2000, endMs: 3500 }}
        segments={segments}
        player={controls}
        durationMs={5500}
        onClose={onClose}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Share a passage' })).toHaveFocus()
    );
    expect(screen.getByText('Duration: 1.5 seconds')).toBeInTheDocument();
    expect(container.querySelector('[data-part="contextEntry"][data-selected]')).toHaveTextContent(
      'Rent is high.'
    );
    const end = screen.getByLabelText('End time');
    await userEvent.clear(end);
    await userEvent.type(end, '1');
    expect(screen.getByRole('alert')).toHaveTextContent('End time must be after start time.');
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('[data-rk="passage-editor"]')).toHaveAttribute(
      'data-invalid',
      ''
    );
    await userEvent.clear(end);
    await userEvent.type(end, '5');
    await userEvent.click(screen.getByRole('button', { name: 'Preview passage' }));
    expect(controls.previewRange).toHaveBeenCalledWith(2, 5);
    await userEvent.click(screen.getByRole('button', { name: 'Copy passage link' }));
    await waitFor(() => expect(screen.getByText('Passage link copied.')).toBeInTheDocument());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://archive.test/api/share/videos/v1?start_ms=2000&end_ms=5000'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Set start from playback' }));
    expect(screen.getByLabelText('Start time')).toHaveValue('00:00:02.250');
    await expectAccessible(container);
    await userEvent.click(screen.getByRole('button', { name: 'Close passage' }));
    expect(controls.pause).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('uses the site API base and string overrides', async () => {
    renderWithKit(
      <PassageEditor
        videoId="v1"
        title="First"
        initialRange={{ startMs: 0, endMs: 1500 }}
        segments={segments}
        autoFocus={false}
        strings={{ passageHeading: 'Clip this', passageCopyLink: 'Copy clip URL' }}
        renderExtraActions={(range) => (range ? <a href="/discuss">Discuss</a> : null)}
      />
    );
    expect(screen.getByRole('heading', { name: 'Clip this' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preview passage' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Discuss' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Passage link' })).toHaveValue(
      'http://archive.test/api/share/videos/v1?start_ms=0&end_ms=1500'
    );
  });
});

describe('TopicList', () => {
  it('toggles selection with pressed state and renders links', async () => {
    const onSelect = vi.fn();
    const { container, rerender, Wrapper } = renderWithKit(
      <TopicList
        items={[
          { key: 'a', label: 'Housing', count: 12, kind: 'topic' },
          { key: 'b', label: 'Labor', count: 1 },
        ]}
        selectedKey="a"
        onSelect={onSelect}
      />
    );
    const housing = screen.getByRole('button', { name: /Housing/ });
    expect(housing).toHaveAttribute('aria-pressed', 'true');
    expect(housing.closest('li')).toHaveAttribute('data-selected', '');
    await userEvent.click(housing);
    expect(onSelect).toHaveBeenCalledWith(null, null);
    await userEvent.click(screen.getByRole('button', { name: /Labor/ }));
    expect(onSelect).toHaveBeenCalledWith('b', expect.objectContaining({ key: 'b' }));
    await expectAccessible(container);
    rerender(
      <Wrapper>
        <TopicList
          items={[{ key: 'c', label: 'Rent', href: '/topics/rent' }]}
          label="Episode topics"
        />
      </Wrapper>
    );
    expect(screen.getByRole('list', { name: 'Episode topics' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rent' })).toHaveAttribute('href', '/topics/rent');
  });
});

describe('saved lists', () => {
  it('lists saved moments and searches with remove actions', async () => {
    const removeMoment = vi.fn();
    const removeSearch = vi.fn();
    const { container } = renderWithKit(
      <>
        <SavedMomentsList
          items={[
            {
              videoId: 'v1',
              startMs: 61_000,
              endMs: 62_000,
              text: 'Saved words',
              storage: 'local',
            },
          ]}
          onRemove={removeMoment}
        />
        <SavedSearchesList
          items={[
            {
              id: 's1',
              query: 'rent',
              filters: { date_from: '2026-01-01', source: 'best' },
              created_at: '2026-06-01T00:00:00Z',
            },
          ]}
          onRemove={removeSearch}
        />
      </>
    );
    expect(screen.getByRole('link', { name: 'Open moment' })).toHaveAttribute(
      'href',
      '/v/v1?t=61#moment-61000'
    );
    expect(screen.getByRole('link', { name: 'Reopen search' })).toHaveAttribute(
      'href',
      '/search?q=rent&date_from=2026-01-01'
    );
    const removes = screen.getAllByRole('button', { name: 'Remove' });
    await userEvent.click(removes[0]);
    await userEvent.click(removes[1]);
    expect(removeMoment).toHaveBeenCalled();
    expect(removeSearch).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(container.querySelector('[data-storage="local"]')).not.toBeNull();
    await expectAccessible(container);
  });

  it('shows empty states', () => {
    renderWithKit(
      <>
        <SavedMomentsList items={[]} />
        <SavedSearchesList items={[]} strings={{ savedSearchesEmpty: 'Nothing saved.' }} />
      </>
    );
    expect(screen.getByText('No saved moments yet.')).toBeInTheDocument();
    expect(screen.getByText('Nothing saved.')).toBeInTheDocument();
  });
});

describe('auth components', () => {
  it('starts provider sign-in', async () => {
    const { container } = renderWithKit(<SignInOptions providers={['twitch']} />);
    await waitFor(() =>
      expect(container.querySelector('[data-rk="sign-in"]')).toHaveAttribute(
        'data-status',
        'anonymous'
      )
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Twitch' }));
    expect(window.location.href).toBe('http://archive.test/api/auth/login/twitch');
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
    await expectAccessible(container);
  });

  it('signs out a signed-in reader', async () => {
    const { calls } = renderWithKit(<SignOutButton />, {
      routes: {
        '/auth/me': { user: { id: 'u1' } },
        '/auth/csrf': { csrf_token: 'c' },
        'POST /auth/logout': { ok: true },
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(calls.some((call) => call.path === '/auth/logout')).toBe(true));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull());
  });
});
