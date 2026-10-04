/** Shape returned by the kit's single-request hooks. */
export type QueryState<T> = {
  data: T | null;
  /** True while the first request is in flight; false when the hook is idle (e.g. no id). */
  loading: boolean;
  error: unknown;
  retry: () => void;
};
