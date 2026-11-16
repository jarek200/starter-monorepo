import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { ensureAmplifyConfigured } from '$lib/amplify';
import { getMyProfile, resetGraphQLClient } from '$lib/services/graphql';

export interface User {
  id: string;
  username: string;
  email: string;
}

function usernameFrom(loginId: string, fallback: string): string {
  const local = loginId.includes('@') ? loginId.split('@')[0] : '';
  return local || fallback || 'user';
}

class Auth {
  user = $state<User | null>(null);
  isLoading = $state(true);

  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  setUser(user: User | null) {
    this.user = user;
    this.isLoading = false;
  }

  async logout() {
    try {
      await signOut({ global: true });
    } catch (error) {
      console.error('Logout error:', error);
    }

    this.user = null;
    this.isLoading = false;
    resetGraphQLClient();
    await goto('/login');
  }
}

export const auth = new Auth();

export async function establishSession(): Promise<User | null> {
  if (!browser) return null;

  try {
    await ensureAmplifyConfigured();
    const session = await fetchAuthSession();
    if (!session.tokens?.idToken) {
      auth.setUser(null);
      return null;
    }

    const current = await getCurrentUser();
    const loginId = current.signInDetails?.loginId ?? '';
    let username = usernameFrom(loginId, current.username || current.userId);

    try {
      const profile = await getMyProfile();
      if (profile?.username) username = profile.username;
    } catch {
      // Cognito identity is enough to enter the app when the profile read fails.
    }

    const user: User = {
      id: current.userId,
      username,
      email: loginId,
    };
    auth.setUser(user);
    return user;
  } catch (error) {
    console.error('Auth failed:', error);
    auth.setUser(null);
    return null;
  }
}
