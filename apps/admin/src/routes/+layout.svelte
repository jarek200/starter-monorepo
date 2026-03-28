<script lang="ts">
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import type { Snippet } from 'svelte';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { ensureAmplifyConfigured, isLiveMode } from '$lib/amplify';
import BrandMark from '$lib/components/brand-mark.svelte';
import { auth } from '$lib/stores/auth';
import '../app.css';

interface Props {
  children?: Snippet;
}

let { children }: Props = $props();

/** Brand mark hidden on dashboard (it has its own header area). */
let layoutHeaderClass = $derived(page.route.id === '/dashboard' ? 'hidden' : '');

// Auth guard: on protected routes (dashboard), check session
$effect(() => {
  if (!browser) return;
  const isProtected = page.route.id === '/dashboard';
  if (!isProtected) return;
  if (!isLiveMode()) return; // Local mock: no guard needed

  (async () => {
    try {
      await ensureAmplifyConfigured();
      const [u, session] = await Promise.all([getCurrentUser(), fetchAuthSession()]);
      if (u && session.tokens) {
        auth.setUser({ id: u.userId, email: u.signInDetails?.loginId ?? '' });
      } else {
        goto('/?redirect=/dashboard', { replaceState: true });
      }
    } catch {
      goto('/?redirect=/dashboard', { replaceState: true });
    } finally {
      auth.setLoading(false);
    }
  })();
});
</script>

<div class="relative min-h-dvh min-w-0 overflow-x-hidden text-foreground">
  <header
    class="pointer-events-none absolute top-8 left-6 z-10 md:top-10 md:left-10 lg:top-12 lg:left-14 {layoutHeaderClass}"
  >
    <span class="sr-only md:hidden">Project factory</span>
    <div class="flex md:hidden">
      <BrandMark class="size-[2.25rem] shrink-0 text-foreground" />
    </div>
    <!-- md+: mark + typographic lockup -->
    <div
      class="hidden items-center gap-3 border-foreground pl-5 [border-left-width:2px] md:flex"
    >
      <BrandMark class="size-[1.35rem] shrink-0 text-foreground" />
      <p
        class="m-0 max-w-[14rem] font-display text-[11px] font-medium leading-snug tracking-[0.34em] text-muted-foreground lowercase md:max-w-none md:text-sm"
      >
        project factory
      </p>
    </div>
  </header>

  {@render children?.()}
</div>
