/**
 * BetterAuth Client
 * 
 * Frontend authentication client for Google OAuth
 */

import { createAuthClient } from 'better-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_AUTH_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
});

export const { signIn, signOut, signUp, useSession } = authClient;
