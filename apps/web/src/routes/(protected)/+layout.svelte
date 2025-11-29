<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { auth } from '$lib/stores/auth';
  import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

  const { children } = $props<{ children: () => any }>();

  let checking = $state(true);
  let error = $state('');

  $effect(() => {
    if (!browser) {
      checking = false;
      return;
    }

    checkAuth();
  });

  async function checkAuth() {
    if (!browser) return;

    try {
      await import('$lib/amplify');
      const session = await fetchAuthSession();

      if (!session.tokens?.idToken) {
        goto('/login', { replaceState: true });
        return;
      }

      const user = await getCurrentUser();
      const loginId = user.signInDetails?.loginId ?? '';
      let username = loginId.includes('@') 
        ? loginId.split('@')[0] 
        : (user.username || user.userId);

      try {
        const { getMyProfile } = await import('$lib/services/graphql');
        const profile = await getMyProfile();
        if (profile?.username) {
          username = profile.username;
        }
      } catch (error) {
        // Use email prefix as fallback
      }

      auth.setUser({
        id: user.userId,
        username: username,
        email: loginId,
      });

      checking = false;
    } catch (err) {
      console.error('Auth failed:', err);
      goto('/login', { replaceState: true });
    }
  }
</script>

{#if checking}
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4"></div>
      <p class="text-white text-xl">Verifying authentication...</p>
    </div>
  </div>
{:else}
  {@render children()}
{/if}
