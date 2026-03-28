<script lang="ts">
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { ensureAmplifyConfigured, isLiveMode } from '$lib/amplify';
import { auth } from '$lib/stores/auth';
import {
  signIn,
  signUp,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';

let email = $state('');
let password = $state('');
let confirmPassword = $state('');
let confirmationCode = $state('');
let loading = $state(false);
let error = $state('');
let isSignUp = $state(false);
let needsConfirmation = $state(false);
let liveMode = $state(false);

$effect(() => {
  if (!browser) return;
  liveMode = isLiveMode();

  if (!liveMode) return;

  // If already logged in, redirect to dashboard
  (async () => {
    try {
      await ensureAmplifyConfigured();
      const [user, session] = await Promise.all([getCurrentUser(), fetchAuthSession()]);
      if (user && session.tokens) goto('/dashboard', { replaceState: true });
    } catch {
      // Not logged in — stay here
    }
  })();
});

const inputMinimal =
  'rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none ' +
  'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground';

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();

  if (!liveMode) {
    // Local mock mode — skip auth, go straight to dashboard
    goto('/dashboard');
    return;
  }

  loading = true;
  error = '';

  try {
    await ensureAmplifyConfigured();

    if (needsConfirmation) {
      await confirmSignUp({ username: email, confirmationCode });
      try {
        const { isSignedIn } = await signIn({ username: email, password });
        if (isSignedIn) {
          const u = await getCurrentUser();
          auth.setUser({ id: u.userId, email }, true);
          goto('/dashboard', { replaceState: true });
          return;
        }
      } catch {
        // Auto sign-in failed — show login
      }
      needsConfirmation = false;
      isSignUp = false;
      error = 'Email verified — please sign in.';
    } else if (isSignUp) {
      if (password !== confirmPassword) { error = 'Passwords do not match'; return; }
      if (password.length < 8) { error = 'Password must be at least 8 characters'; return; }

      const { nextStep } = await signUp({
        username: email,
        password,
        options: { userAttributes: { email }, autoSignIn: { enabled: true } },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        needsConfirmation = true;
      } else {
        isSignUp = false;
        error = 'Account created — please sign in.';
      }
    } else {
      const { isSignedIn } = await signIn({ username: email, password });
      if (isSignedIn) {
        const u = await getCurrentUser();
        auth.setUser({ id: u.userId, email }, true);
        goto('/dashboard', { replaceState: true });
      }
    }
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e.name === 'NotAuthorizedException') error = 'Incorrect email or password';
    else if (e.name === 'UserNotFoundException') error = 'No account found for this email';
    else if (e.name === 'UsernameExistsException') { error = 'Account exists — sign in instead'; isSignUp = false; }
    else if (e.name === 'CodeMismatchException') error = 'Invalid verification code';
    else error = e.message ?? 'Authentication failed';
  } finally {
    loading = false;
  }
}
</script>

<svelte:head>
  <title>Sign in — Admin project factory</title>
</svelte:head>

<main class="flex min-h-dvh items-center justify-center px-6 py-16 md:px-10">
  <form class="flex w-full max-w-xs flex-col gap-5" onsubmit={handleSubmit}>
    {#if needsConfirmation}
      <h1 class="font-medium text-muted-foreground text-xs uppercase tracking-widest">Verify email</h1>

      <div class="flex flex-col gap-2">
        <Label for="code" class="text-muted-foreground text-xs font-normal">Verification code</Label>
        <Input
          id="code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="6-digit code"
          bind:value={confirmationCode}
          class={inputMinimal}
        />
      </div>

      {#if error}
        <p class="text-[0.75rem] text-destructive">{error}</p>
      {/if}

      <Button type="submit" disabled={loading} class="mt-1 w-full rounded-sm">
        {loading ? 'Verifying…' : 'Verify'}
      </Button>

      <button
        type="button"
        class="text-muted-foreground text-xs underline decoration-muted-foreground/60 underline-offset-4 hover:text-foreground text-center"
        onclick={() => { needsConfirmation = false; isSignUp = false; error = ''; }}
      >
        Back to sign in
      </button>
    {:else}
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
          autocomplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          bind:value={password}
          class={inputMinimal}
        />
      </div>

      {#if isSignUp}
        <div class="flex flex-col gap-2">
          <Label for="confirmPassword" class="text-muted-foreground text-xs font-normal">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
            bind:value={confirmPassword}
            class={inputMinimal}
          />
        </div>
      {/if}

      {#if error}
        <p class="text-[0.75rem] text-destructive">{error}</p>
      {/if}

      <Button type="submit" disabled={loading} class="mt-1 w-full rounded-sm">
        {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Continue'}
      </Button>

      <div class="flex flex-col items-center gap-3 text-center">
        {#if liveMode}
          <button
            type="button"
            class="text-muted-foreground text-xs underline decoration-muted-foreground/60 underline-offset-4 hover:text-foreground"
            onclick={() => { isSignUp = !isSignUp; error = ''; }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        {/if}
        {#if !liveMode}
          <span class="text-[0.7rem] text-neutral-600">Local preview — not connected to backend</span>
        {/if}
      </div>
    {/if}
  </form>
</main>
