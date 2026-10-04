import type { EpisodeSearchGroup } from '../types/api';

export type DateBucket = { key: string; label: string; count: number };

const DEFAULT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Group loaded moments by broadcast year, or by month when they span one year.
 * Empty periods between the first and last are included so gaps read as gaps. */
export function bucketMomentsByDate(
  groups: EpisodeSearchGroup[],
  monthLabels: readonly string[] = DEFAULT_MONTHS
): DateBucket[] {
  const dated = groups
    .map((group) => ({
      date: group.video.uploaded_at ? new Date(group.video.uploaded_at) : null,
      count: group.moments.length,
    }))
    .filter((item): item is { date: Date; count: number } =>
      Boolean(item.date && !Number.isNaN(item.date.getTime()))
    );
  if (dated.length === 0) return [];
  const years = new Set(dated.map((item) => item.date.getUTCFullYear()));
  const byMonth = years.size === 1;
  const buckets = new Map<string, DateBucket>();
  for (const { date, count } of dated) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const key = byMonth ? `${year}-${String(month + 1).padStart(2, '0')}` : String(year);
    const label = byMonth ? monthLabels[month] : String(year);
    const bucket = buckets.get(key) ?? { key, label, count: 0 };
    bucket.count += count;
    buckets.set(key, bucket);
  }
  // Include empty periods between the first and last so gaps read as gaps.
  const keys = [...buckets.keys()].sort();
  const filled: DateBucket[] = [];
  if (byMonth) {
    const [year] = [...years];
    const first = Number(keys[0].slice(5)) - 1;
    const last = Number(keys[keys.length - 1].slice(5)) - 1;
    for (let month = first; month <= last; month += 1) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      filled.push(buckets.get(key) ?? { key, label: monthLabels[month], count: 0 });
    }
  } else {
    for (let year = Number(keys[0]); year <= Number(keys[keys.length - 1]); year += 1)
      filled.push(
        buckets.get(String(year)) ?? { key: String(year), label: String(year), count: 0 }
      );
  }
  return filled;
}
