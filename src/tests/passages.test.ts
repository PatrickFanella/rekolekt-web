import { describe, expect, it } from 'vitest';
import {
  buildPassageLink,
  buildPassageShareLink,
  formatPassageTime,
  parsePassageTime,
  passageRangeError,
  readPassageRange,
} from '../transcript/passages';

describe('passage URLs and times', () => {
  it('round trips a precise range without changing old timestamp conventions', () => {
    const range = { startMs: 1108670, endMs: 1120530 };
    const url = new URL(buildPassageLink('video-1', range), 'https://archive.test');
    expect(url.pathname).toBe('/v/video-1');
    expect(url.hash).toBe('#moment-1108670');
    expect(readPassageRange(url.searchParams)).toEqual(range);
    expect(readPassageRange(new URLSearchParams('t=12'))).toBeNull();
    expect(parsePassageTime(formatPassageTime(range.startMs))).toBe(range.startMs);
    expect(parsePassageTime('12.125')).toBe(12125);
    expect(parsePassageTime('01:02:03.004')).toBe(3723004);
  });

  it.each(['', '-2', 'Infinity', '1e3', '12:99', '1:2', '00:01:60', '0.0001'])(
    'rejects malformed input %s',
    (value) => {
      expect(parsePassageTime(value)).toBeNull();
    }
  );

  it('rejects malformed URLs, reversed ranges, and times outside the recording', () => {
    for (const query of [
      'end_ms=20',
      't=NaN&end_ms=30',
      't_ms=1.5&end_ms=30',
      't=1&end_ms=',
      't=1&end_ms=Infinity',
      't=1&end_ms=2',
    ]) {
      const range = readPassageRange(new URLSearchParams(query))!;
      expect(passageRangeError(range.startMs, range.endMs)).toBeTruthy();
    }
    expect(passageRangeError(0, 2000, 1000)).toBe('beyond-recording');
    expect(passageRangeError(1000, 1000)).toBe('order');
    expect(passageRangeError(null, 1000)).toBe('invalid');
    expect(passageRangeError(0, 1000, 1000)).toBeNull();
  });
});

describe('passage share links', () => {
  it('points at the API share route under the configured base', () => {
    expect(buildPassageShareLink('video 1', { startMs: 1000, endMs: 2500 })).toBe(
      '/api/share/videos/video%201?start_ms=1000&end_ms=2500'
    );
    expect(
      buildPassageShareLink('v', { startMs: 0, endMs: 1 }, 'https://archive.example/api/')
    ).toBe('https://archive.example/api/share/videos/v?start_ms=0&end_ms=1');
  });
});
