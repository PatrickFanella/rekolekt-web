import { forwardRef, useId, useState, type FormEvent, type FormHTMLAttributes } from 'react';
import { useStrings, type RekolektStrings } from '../strings/strings';
import { cx, visuallyHidden, type ClassNames } from './primitives';

export type SearchFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  /** Controlled value. Omit to let the form keep its own state. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed query when the form is submitted. Blank queries are ignored. */
  onSearch: (query: string) => void;
  /** Terms offered through a native `<datalist>`. */
  suggestions?: string[];
  /** Show the label visually; it is always available to assistive technology. */
  showLabel?: boolean;
  /** Input `name`, default `q`, so the form also works without JavaScript. */
  name?: string;
  disabled?: boolean;
  classNames?: ClassNames<'label' | 'input' | 'submit'>;
  strings?: Partial<RekolektStrings>;
};

/** Search box with a labelled input and submit button (`role="search"`). */
export const SearchForm = forwardRef<HTMLFormElement, SearchFormProps>(function SearchForm(
  {
    value,
    defaultValue = '',
    onValueChange,
    onSearch,
    suggestions,
    showLabel = false,
    name = 'q',
    disabled,
    classNames,
    strings: overrides,
    className,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  const id = useId();
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = current.trim();
    if (query) onSearch(query);
  }
  return (
    <form
      ref={ref}
      role="search"
      data-rk="search-form"
      data-disabled={disabled ? '' : undefined}
      className={className}
      onSubmit={submit}
      {...props}
    >
      <label
        htmlFor={`${id}-input`}
        data-part="label"
        data-visually-hidden={showLabel ? undefined : ''}
        className={classNames?.label}
        style={showLabel ? undefined : visuallyHidden}
      >
        {strings.searchLabel}
      </label>
      <input
        id={`${id}-input`}
        type="search"
        name={name}
        data-part="input"
        className={cx(classNames?.input)}
        value={current}
        placeholder={strings.searchPlaceholder}
        disabled={disabled}
        autoComplete="off"
        list={suggestions?.length ? `${id}-suggestions` : undefined}
        onChange={(event) => {
          setInternal(event.target.value);
          onValueChange?.(event.target.value);
        }}
      />
      {suggestions?.length ? (
        <datalist id={`${id}-suggestions`} aria-label={strings.searchSuggestionsLabel}>
          {suggestions.map((term) => (
            <option key={term} value={term} />
          ))}
        </datalist>
      ) : null}
      <button type="submit" data-part="submit" className={classNames?.submit} disabled={disabled}>
        {strings.searchSubmit}
      </button>
    </form>
  );
});
