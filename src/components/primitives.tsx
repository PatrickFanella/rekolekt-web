import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type AnchorHTMLAttributes,
  type ComponentType,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from 'react';

/** Join class names, skipping empty values. */
export function cx(...values: Array<string | false | null | undefined>) {
  const joined = values.filter(Boolean).join(' ');
  return joined || undefined;
}

/** Per-part class names, e.g. `{ input: 'my-input', submit: 'my-button' }`. */
export type ClassNames<Part extends string> = Partial<Record<Part, string>>;

/** `true` becomes `""` so CSS can match `[data-saved]`; false and undefined omit the attribute. */
export function dataFlag(value: boolean | undefined | null) {
  return value ? '' : undefined;
}

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: ReactNode;
} & RefAttributes<HTMLAnchorElement>;

/**
 * Link component the kit renders for internal navigation. Adapt a router by
 * mapping `href` to its own prop, e.g. for React Router:
 * `forwardRef((props, ref) => <RouterLink ref={ref} to={props.href} {...props} />)`.
 */
export type LinkComponent = ComponentType<LinkProps>;

export const DefaultLink = forwardRef<HTMLAnchorElement, LinkProps>(function DefaultLink(
  { href, children, ...props },
  ref
) {
  return (
    <a ref={ref} href={href} {...props}>
      {children}
    </a>
  );
});

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(value);
      else if (ref) (ref as { current: T | null }).current = value;
    }
  };
}

type SlotProps = HTMLAttributes<HTMLElement> & { children?: ReactNode } & Record<string, unknown>;

/**
 * Render the single child element instead of the component's default element,
 * merging props, class names and refs (`asChild` composition).
 */
export const Slot = forwardRef<HTMLElement, SlotProps>(function Slot({ children, ...props }, ref) {
  const child = Children.only(children);
  if (!isValidElement(child)) return null;
  const element = child as ReactElement<Record<string, unknown> & { ref?: Ref<HTMLElement> }>;
  const childProps = element.props;
  return cloneElement(element, {
    ...props,
    ...childProps,
    className: cx(
      props.className as string | undefined,
      childProps.className as string | undefined
    ),
    ref: mergeRefs(ref, childProps.ref as Ref<HTMLElement> | undefined),
  });
});

/** Hides content visually while keeping it available to screen readers. */
export const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;
