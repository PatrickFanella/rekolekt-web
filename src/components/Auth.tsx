import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { useAuth } from '../auth/auth';
import { useStrings, type RekolektStrings } from '../strings/strings';
import type { OAuthProvider } from '../types/api';
import { dataFlag, type ClassNames } from './primitives';

export type SignInOptionsProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** Providers to offer, in order. */
  providers?: OAuthProvider[];
  /** Heading level, default 2. Set `hideHeading` to omit it. */
  headingLevel?: 1 | 2 | 3 | 4;
  hideHeading?: boolean;
  classNames?: ClassNames<'heading' | 'description' | 'error' | 'providers' | 'provider'>;
  strings?: Partial<RekolektStrings>;
};

/**
 * Sign-in choices. Each button starts the API's OAuth flow for one provider.
 * Shows the session error from `useAuth` when the last request failed.
 */
export const SignInOptions = forwardRef<HTMLElement, SignInOptionsProps>(function SignInOptions(
  {
    providers = ['google', 'twitch'],
    headingLevel = 2,
    hideHeading = false,
    classNames: c = {},
    strings: overrides,
    ...props
  },
  ref
) {
  const strings = useStrings(overrides);
  const { loginWith, status, error } = useAuth();
  const Heading = `h${headingLevel}` as const;
  return (
    <section ref={ref} data-rk="sign-in" data-status={status} {...props}>
      {!hideHeading && (
        <Heading data-part="heading" className={c.heading}>
          {strings.signInHeading}
        </Heading>
      )}
      <p data-part="description" className={c.description}>
        {strings.signInDescription}
      </p>
      {status === 'error' && error && (
        <p role="alert" data-part="error" className={c.error}>
          {error}
        </p>
      )}
      <div data-part="providers" className={c.providers}>
        {providers.map((provider) => (
          <button
            key={provider}
            type="button"
            data-part="provider"
            data-provider={provider}
            className={c.provider}
            onClick={() => loginWith(provider)}
          >
            {strings.signInWith(strings.providerNames[provider] ?? provider)}
          </button>
        ))}
      </div>
    </section>
  );
});

export type SignOutButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  strings?: Partial<RekolektStrings>;
};

/** Ends the session. Disabled and `data-loading` while the request runs. */
export const SignOutButton = forwardRef<HTMLButtonElement, SignOutButtonProps>(
  function SignOutButton({ strings: overrides, children, onClick, ...props }, ref) {
    const strings = useStrings(overrides);
    const { logout, status, user } = useAuth();
    const loading = status === 'loading';
    if (!user) return null;
    return (
      <button
        ref={ref}
        type="button"
        data-rk="sign-out"
        data-loading={dataFlag(loading)}
        disabled={loading}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) void logout();
        }}
        {...props}
      >
        {children ?? strings.signOut}
      </button>
    );
  }
);
