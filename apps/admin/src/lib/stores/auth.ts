import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { signOut } from 'aws-amplify/auth';

export interface AdminUser {
  id: string;
  email: string;
}

const createAuthStore = () => {
  const { subscribe, set, update } = writable<{
    user: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  }>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  return {
    subscribe,
    setUser: (user: AdminUser | null, keepLoading = false) => {
      set({ user, isAuthenticated: !!user, isLoading: keepLoading });
    },
    setLoading: (isLoading: boolean) => {
      update((s) => ({ ...s, isLoading }));
    },
    logout: async () => {
      set({ user: null, isAuthenticated: false, isLoading: false });
      if (browser) {
        try {
          await signOut({ global: true });
        } catch {
          // Ignore errors during sign-out
        }
        goto('/');
      }
    },
  };
};

export const auth = createAuthStore();
export const user = derived(auth, ($a) => $a.user);
export const isAuthenticated = derived(auth, ($a) => $a.isAuthenticated);
export const isLoading = derived(auth, ($a) => $a.isLoading);
