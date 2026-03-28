<script lang="ts">
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';

let email = $state('');
let password = $state('');

const inputMinimal =
  'rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none ' +
  'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground';

function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  goto('/dashboard');
}
</script>

<svelte:head>
  <title>Sign in — Admin project factory</title>
</svelte:head>

<main class="flex min-h-dvh items-center justify-center px-6 py-16 md:px-10">
  <form class="flex w-full max-w-xs flex-col gap-5" onsubmit={handleSubmit}>
    <h1 class="font-medium text-muted-foreground text-xs uppercase tracking-widest">Sign in</h1>

    <div class="flex flex-col gap-2">
      <Label for="email" class="text-muted-foreground text-xs font-normal">Email</Label>
      <Input
        id="email"
        type="email"
        name="email"
        autocomplete="username"
        placeholder="you@company.com"
        bind:value={email}
        class={inputMinimal}
      />
    </div>

    <div class="flex flex-col gap-2">
      <Label for="password" class="text-muted-foreground text-xs font-normal">Password</Label>
      <Input
        id="password"
        type="password"
        name="password"
        autocomplete="current-password"
        placeholder="••••••••"
        bind:value={password}
        class={inputMinimal}
      />
    </div>

    <Button type="submit" class="mt-1 w-full rounded-sm">Continue</Button>

    <div class="flex flex-col items-center gap-3 text-center">
      <button
        type="button"
        class="text-muted-foreground text-xs underline decoration-muted-foreground/60 underline-offset-4 transition-colors hover:text-foreground"
      >
        Forgot password?
      </button>
      <span class="text-[0.7rem] text-neutral-600">Design preview — not connected</span>
    </div>
  </form>
</main>
