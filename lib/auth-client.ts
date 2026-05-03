/**
 * BetterAuth → Clerk migration shim
 *
 * Re-exports Clerk hooks under the same names as the old BetterAuth client.
 * This file is the ONLY place that references Clerk directly — all other
 * files import from here, keeping the migration contained.
 */

export { useClerk, useAuth } from '@clerk/nextjs';

/**
 * useSession — drop-in replacement for BetterAuth's useSession.
 *
 * Returns { data: { user }, isPending } to match the old API shape so
 * existing consumers work without changes.
 *
 * Old: const { data: session, isPending } = useSession()
 *       session?.user?.id | session?.user?.email | session?.user?.name
 *
 * New shape keeps the same access pattern via the adapter below.
 */
import { useUser } from '@clerk/nextjs';

export function useSession() {
  const { user, isLoaded } = useUser();

  return {
    data: user
      ? {
          user: {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? '',
            name: user.fullName ?? user.username ?? '',
            image: user.imageUrl ?? null,
          },
        }
      : null,
    isPending: !isLoaded,
  };
}

/**
 * signIn — redirect to Clerk's hosted sign-in page.
 * Matches the old BetterAuth signIn.social() pattern.
 */
export const signIn = {
  social: ({ provider, callbackURL }: { provider: string; callbackURL?: string }) => {
    // Clerk handles OAuth via its own hosted UI — redirect there
    const params = new URLSearchParams({
      redirect_url: callbackURL || window.location.origin + '/auth/callback',
    });
    window.location.href = `/sign-in?${params}`;
  },
};

/**
 * signOut — sign out via Clerk.
 */
import { useClerk as _useClerk } from '@clerk/nextjs';
export function signOut() {
  // Can't call hooks outside components — use window redirect as fallback.
  // Components that need sign-out should use useClerk().signOut() directly.
  window.location.href = '/sign-out';
}

export { useUser };
