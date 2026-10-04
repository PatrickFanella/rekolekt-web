import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useRekolekt } from '../provider/context';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { dataFlag, type ClassNames } from './primitives';

export type TopicListItem = {
  key: string;
  label: string;
  /** Mention or result count, shown after the label. */
  count?: number;
  /** Free-form kind exposed as `data-kind`, e.g. topic, tag, person, search. */
  kind?: string;
  /** Link target. Without it the item is a toggle button (when `onSelect` is set) or plain text. */
  href?: string;
};

export type TopicListProps = Omit<HTMLAttributes<HTMLUListElement>, 'children' | 'onSelect'> & {
  items: TopicListItem[];
  /** Key of the selected item, exposed as `data-selected` and `aria-pressed`. */
  selectedKey?: string | null;
  /** Makes items without `href` toggle buttons. Called with null when the selected item is pressed again. */
  onSelect?: (key: string | null, item: TopicListItem | null) => void;
  /** Accessible list name. */
  label?: string;
  renderItem?: (item: TopicListItem, selected: boolean) => ReactNode;
  classNames?: ClassNames<'item' | 'control' | 'label' | 'count'>;
  strings?: Partial<RekolektStrings>;
};

/**
 * Topics, tags, people or popular searches as links or toggle buttons. Use it
 * with `findEpisodeTopics`, `useArchiveIntelligence` or episode metadata.
 */
export const TopicList = forwardRef<HTMLUListElement, TopicListProps>(function TopicList(
  {
    items,
    selectedKey = null,
    onSelect,
    label,
    renderItem,
    classNames,
    strings: overrides,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  const { Link } = useRekolekt();
  return (
    <ul ref={ref} aria-label={label ?? strings.topicListLabel} data-rk="topic-list" {...props}>
      {items.map((item) => {
        const selected = item.key === selectedKey;
        const body = (
          <>
            <span data-part="label" className={classNames?.label}>
              {item.label}
            </span>
            {item.count != null && (
              <span
                data-part="count"
                className={classNames?.count}
                aria-label={strings.topicCount(item.count)}
              >
                {item.count.toLocaleString()}
              </span>
            )}
          </>
        );
        let control: ReactNode;
        if (renderItem) control = renderItem(item, selected);
        else if (item.href)
          control = (
            <Link
              href={item.href}
              data-part="control"
              className={classNames?.control}
              aria-current={selected ? 'true' : undefined}
            >
              {body}
            </Link>
          );
        else if (onSelect)
          control = (
            <button
              type="button"
              data-part="control"
              className={classNames?.control}
              aria-pressed={selected}
              onClick={() => (selected ? onSelect(null, null) : onSelect(item.key, item))}
            >
              {body}
            </button>
          );
        else control = body;
        return (
          <li
            key={item.key}
            data-part="item"
            data-kind={item.kind}
            data-selected={dataFlag(selected)}
            className={classNames?.item}
          >
            {control}
          </li>
        );
      })}
    </ul>
  );
});
