<script lang="ts">
import type { Snippet } from 'svelte';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { auth, establishSession } from '$lib/auth.svelte';

let { children }: { children: Snippet } = $props();
let checking = $state(true);

onMount(() => {
  let cancelled = false;

  establishSession().then((user) => {
    if (cancelled) return;
    if (!user) {
      goto('/login', { replaceState: true });
      return;
    }
    checking = false;
  });

  return () => {
    cancelled = true;
  };
});
</script>

{#if checking || auth.isLoading}
  <div class="flex min-h-dvh items-center justify-center bg-background">
    <div class="text-center">
      <div
        class="mx-auto mb-4 size-8 animate-spin border-2 border-muted-foreground border-t-foreground"
        aria-hidden="true"
      ></div>
      <p class="text-muted-foreground text-sm">
        {auth.isLoading ? 'Loading…' : 'Verifying session…'}
      </p>
    </div>
  </div>
{:else}
  {@render children()}
{/if}
