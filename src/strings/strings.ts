import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react';

/**
 * Every user-visible string the default components render. Values are plain
 * and neutral; archives replace any of them through `<RekolektProvider strings>`
 * or a component's `strings` prop.
 */
export const defaultStrings = {
  // Async states
  loading: 'Loading…',
  empty: 'Nothing to show yet.',
  errorTitle: 'Something went wrong.',
  retry: 'Retry',

  // Search
  searchLabel: 'Search the archive',
  searchPlaceholder: 'Search transcripts',
  searchSubmit: 'Search',
  searchSuggestionsLabel: 'Suggested searches',
  searchNoResults: (query: string) => `No moments match “${query}”.`,
  searchError: 'Search failed. Try again.',
  searchResultsSummary: (moments: number, episodes: number) =>
    `${moments.toLocaleString()} ${moments === 1 ? 'moment' : 'moments'} in ${episodes.toLocaleString()} ${episodes === 1 ? 'episode' : 'episodes'}`,
  searchLoadMore: 'Load more results',
  loadMore: 'Load more',
  searchLoadingMore: 'Loading more results…',
  nearbyMatches: (count: number) => `${count} nearby ${count === 1 ? 'match' : 'matches'}`,
  showMoreClusters: (count: number) => `Show ${count} more moment clusters`,
  playMomentAt: (timestamp: string) => `Play moment at ${timestamp}`,

  // Moment and segment actions
  momentActionsLabel: 'Moment actions',
  openMoment: 'Open moment',
  playFromHere: 'Play from here',
  copyLink: 'Copy link',
  copyQuote: 'Copy quote',
  save: 'Save',
  saved: 'Saved',
  saveMoment: 'Save moment',
  removeSavedMoment: 'Remove saved moment',
  sharePassage: 'Share passage',
  fullEpisode: 'Full episode',
  closeActions: 'Close',
  linkCopied: 'Link copied.',
  quoteCopied: 'Quote copied.',
  copyFailed: 'Copy is unavailable in this browser.',
  momentSaved: 'Moment saved.',
  momentRemoved: 'Moment removed.',
  saveFailed: 'The moment could not be saved.',

  // Episodes
  episodeListLabel: 'Episodes',
  untitledEpisode: 'Untitled episode',
  unknownChannel: 'Unknown channel',
  thumbnailUnavailable: 'Thumbnail unavailable',
  watchEpisode: (title: string) => `Watch ${title} with transcript`,

  // Transcript
  transcriptLabel: 'Transcript',
  openSegmentAt: (speaker: string | null, timestamp: string) =>
    `Open ${speaker ?? 'paragraph'} at ${timestamp}`,
  playFromTimestamp: (timestamp: string) => `Play from ${timestamp}`,
  searchMatch: 'Search match',
  transcriptNoticeTitle: 'Automated transcript',
  transcriptNoticeBody:
    'Automated transcripts can contain errors in wording, speakers and timestamp alignment. Check quotations against the source recording.',

  // Player
  playerTitle: 'Source player',
  playerLoading: 'Loading player…',
  playerUnavailable: 'Source player unavailable',
  playerError: (code?: number) => `Player error${code ? ` (${code})` : ''}`,
  openOnSource: 'Open on YouTube',

  // Passage editor
  passageHeading: 'Share a passage',
  passageDescription: 'Choose a range, preview it and share it.',
  passageClose: 'Close passage',
  passageStart: 'Start time',
  passageEnd: 'End time',
  passageSetFromPlayback: (which: 'start' | 'end') => `Set ${which} from playback`,
  passageTimeHelp: 'Use hours:minutes:seconds, or seconds. Milliseconds are optional.',
  passageInvalidTime: 'Enter valid start and end times, such as 00:12:34.500.',
  passageEndBeforeStart: 'End time must be after start time.',
  passageBeyondRecording: 'The passage must end within this recording.',
  passageDuration: (seconds: number) =>
    `Duration: ${seconds.toLocaleString(undefined, { maximumFractionDigits: 3 })} seconds`,
  passageIncludePrevious: 'Include previous segment',
  passageIncludeNext: 'Include next segment',
  passagePreview: 'Preview passage',
  passageContinue: 'Continue after passage',
  passageCopyLink: 'Copy passage link',
  passageShare: 'Share passage',
  passageLinkLabel: 'Passage link',
  passageContextHeading: 'Passage in context',
  passageContextHelp:
    'Highlighted segments overlap your selection. Timing can be approximate; check the source before quoting.',
  passageContextEmpty: 'No transcript text is available for this range.',
  passageContextInvalid: 'Correct the range to show its context.',
  passageContextOmitted: (count: number) =>
    `${count.toLocaleString()} more segments are in the shared range but not shown here.`,
  passagePlaybackUnavailable: 'Playback time is unavailable. Enter a time manually.',
  passagePreviewRequested: 'Preview requested. Playback stops at the end of the passage.',
  passageContinuing: 'Continuing after the passage.',
  passageLinkCopied: 'Passage link copied.',
  passageCopyUnavailable: 'Copy is unavailable. Select and copy the passage link below.',
  passageShared: 'Link handed to your sharing app.',
  passageShareCancelled: 'Sharing cancelled.',
  passageShareUnavailable: 'Sharing is unavailable. Copy the passage link instead.',

  // Topics
  topicListLabel: 'Topics',
  topicCount: (count: number) =>
    `${count.toLocaleString()} ${count === 1 ? 'mention' : 'mentions'}`,

  // Saved items
  savedMomentsLabel: 'Saved moments',
  savedMomentsEmpty: 'No saved moments yet.',
  savedSearchesLabel: 'Saved searches',
  savedSearchesEmpty: 'No saved searches yet.',
  savedOn: (date: string) => `Saved ${date}`,
  reopenSearch: 'Reopen search',
  remove: 'Remove',

  // Auth
  signInHeading: 'Sign in',
  signInDescription: 'Sign in to keep saved moments and searches across devices.',
  signInWith: (provider: string) => `Continue with ${provider}`,
  signOut: 'Sign out',
  providerNames: { google: 'Google', twitch: 'Twitch' } as Record<string, string>,
};

export type RekolektStrings = typeof defaultStrings;

const StringsContext = createContext<RekolektStrings>(defaultStrings);

export function StringsProvider({
  strings,
  children,
}: {
  strings?: Partial<RekolektStrings>;
  children: ReactNode;
}) {
  const parent = useContext(StringsContext);
  const value = useMemo(() => (strings ? { ...parent, ...strings } : parent), [parent, strings]);
  return createElement(StringsContext.Provider, { value }, children);
}

/** Provider strings, with optional per-component overrides applied on top. */
export function useStrings(overrides?: Partial<RekolektStrings>): RekolektStrings {
  const strings = useContext(StringsContext);
  return useMemo(() => (overrides ? { ...strings, ...overrides } : strings), [strings, overrides]);
}
