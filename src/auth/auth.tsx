import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRekolektClient } from '../provider/context';
import type { OAuthProvider, UserRole } from '../types/api';

export type User = {
  id: string;
  email?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  plan?: string | null;
  role?: UserRole | null;
};

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export type AuthState = {
  user: User | null;
  loading: boolean;
  status: AuthStatus;
  error: string | null;
  role: UserRole | null;
  capabilities: string[];
  refresh: () => Promise<void>;
  invalidateLocalAuth: (options?: { preserveUser?: boolean }) => void;
  login: () => void;
  loginTwitch: () => void;
  loginWith: (provider: OAuthProvider) => void;
  linkProvider: (provider: OAuthProvider) => Promise<void>;
  mergeProvider: (provider: OAuthProvider) => Promise<void>;
  logout: () => Promise<void>;
  /** True when the session carries the named capability, e.g. `admin`. */
  can: (capability: string) => boolean;
};

const AuthCtx = createContext<AuthState | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication request failed';
}

/** Loads `/auth/me`, keeps the CSRF token on the client, and exposes sign-in and sign-out. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useRekolektClient();
  const setCsrfToken = client.setCsrfToken;
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const userRef = useRef<User | null>(null);
  const authGeneration = useRef(0);
  const refreshController = useRef<AbortController | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const invalidateLocalAuth = useCallback(
    (options?: { preserveUser?: boolean }) => {
      authGeneration.current += 1;
      refreshController.current?.abort();
      refreshController.current = null;
      if (!options?.preserveUser) setCsrfToken(null);
      setRole(null);
      setCapabilities([]);
      setError(null);
      if (options?.preserveUser) {
        setStatus(userRef.current ? 'authenticated' : 'anonymous');
        return;
      }
      setUser(null);
      setStatus('anonymous');
    },
    [setCsrfToken]
  );

  const refresh = useCallback(async () => {
    refreshController.current?.abort();
    const controller = new AbortController();
    refreshController.current = controller;
    const generation = ++authGeneration.current;
    const isCurrent = () => generation === authGeneration.current && !controller.signal.aborted;

    if (!userRef.current) setStatus('loading');
    try {
      const response = await client.getSession(controller.signal);
      if (!isCurrent()) return;

      if (response.user) {
        // Keep an existing token usable while the replacement is fetched.
        // Clearing it at refresh start creates a needless mutation failure window.
        const csrf = await client.getCsrf(controller.signal);
        if (!isCurrent()) return;
        setCsrfToken(csrf.csrf_token);
      } else {
        if (!isCurrent()) return;
        setCsrfToken(null);
      }
      if (!isCurrent()) return;
      setUser(response.user);
      setRole(response.role ?? null);
      setCapabilities(response.capabilities ?? []);
      setError(null);
      setStatus(response.user ? 'authenticated' : 'anonymous');
    } catch (requestError: unknown) {
      if (!isCurrent()) return;
      setCsrfToken(null);
      setUser(null);
      setRole(null);
      setCapabilities([]);
      setError(errorMessage(requestError));
      setStatus('error');
      throw requestError;
    }
  }, [client, setCsrfToken]);

  useEffect(() => {
    void refresh().catch(() => {
      // The provider has already recorded the error; avoid an unhandled rejection.
    });
    return () => {
      authGeneration.current += 1;
      refreshController.current?.abort();
    };
  }, [refresh]);
  return (
    <AuthCtx.Provider
      value={{
        user,
        loading: status === 'loading',
        status,
        error,
        role,
        capabilities,
        refresh,
        invalidateLocalAuth,
        can: (capability: string) => capabilities.includes(capability),
        login: () => {
          window.location.href = client.loginUrl('google');
        },
        loginTwitch: () => {
          window.location.href = client.loginUrl('twitch');
        },
        loginWith: (provider: OAuthProvider) => {
          window.location.href = client.loginUrl(provider);
        },
        linkProvider: async (provider: OAuthProvider) => {
          const response = await client.linkProvider(provider);
          window.location.href = response.authorization_url;
        },
        mergeProvider: async (provider: OAuthProvider) => {
          const response = await client.mergeProvider(provider);
          window.location.href = response.authorization_url;
        },
        logout: async () => {
          // Stop older refresh responses from restoring auth while logout is in flight.
          const generation = ++authGeneration.current;
          refreshController.current?.abort();
          refreshController.current = null;
          const isCurrent = () => generation === authGeneration.current;

          try {
            await client.logout();
            if (!isCurrent()) return;
            invalidateLocalAuth();
          } catch (requestError: unknown) {
            if (!isCurrent()) return;
            // A failed logout does not prove that the server session is gone.
            // Retain local auth and the CSRF token so the user can retry.
            setError(errorMessage(requestError));
            setStatus('error');
          }
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx)
    throw new Error('AuthProvider missing: render inside <RekolektProvider> with auth enabled.');
  return ctx;
}

/** Like `useAuth`, but returns null outside an AuthProvider (e.g. `auth={false}`). */
export function useOptionalAuth() {
  return useContext(AuthCtx);
}
