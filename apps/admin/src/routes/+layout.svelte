<script lang="ts">
import type { Snippet } from 'svelte';
import { page } from '$app/state';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import BrandMark from '$lib/components/brand-mark.svelte';
import { ensureAmplifyConfigured, isLiveMode } from '$lib/amplify';
import { auth } from '$lib/stores/auth';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
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
    <span class="sr-only md:hidden">Admin project factory</span>
    <div class="flex md:hidden">
      <BrandMark class="size-[2.25rem] shrink-0 text-foreground" />
    </div>
    <!-- md+: mark + typographic lockup -->
    <div
      class="hidden items-start gap-3 border-foreground pl-5 [border-left-width:2px] md:flex"
    >
      <BrandMark class="mt-0.5 size-[1.35rem] shrink-0 text-foreground" />
      <p class="m-0 font-display">
        <span
          class="block text-foreground text-sm font-semibold tracking-[0.26em] lowercase md:text-base"
        >
          admin
        </span>
        <span
          class="mt-3 block max-w-[14rem] text-[11px] font-medium leading-snug tracking-[0.34em] text-muted-foreground lowercase md:mt-3.5 md:max-w-none md:text-sm"
        >
          project factory
        </span>
      </p>
    </div>
  </header>

  {@render children?.()}
</div>
