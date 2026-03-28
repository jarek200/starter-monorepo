<script lang="ts">
import { confirmSignIn, fetchAuthSession, getCurrentUser, signIn } from 'aws-amplify/auth';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { ensureAmplifyConfigured, isLiveMode } from '$lib/amplify';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { auth } from '$lib/stores/auth';

let email = $state('');
let password = $state('');
let newPassword = $state('');
let confirmNewPassword = $state('');
let loading = $state(false);
let error = $state('');
let liveMode = $state(false);
/** Cognito admin-created user must set a permanent password after temporary password. */
let needsNewPassword = $state(false);

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

async function finishSession() {
  const u = await getCurrentUser();
  auth.setUser({ id: u.userId, email }, true);
  goto('/dashboard', { replaceState: true });
}

function resetNewPasswordFlow() {
  needsNewPassword = false;
  newPassword = '';
  confirmNewPassword = '';
  password = '';
  error = '';
}

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();

  if (!liveMode) {
    goto('/dashboard');
    return;
  }

  loading = true;
  error = '';

  try {
    await ensureAmplifyConfigured();

    if (needsNewPassword) {
      if (newPassword !== confirmNewPassword) {
        error = 'New passwords do not match';
        return;
      }
      if (newPassword.length < 8) {
        error = 'Password must be at least 8 characters';
        return;
      }

      const out = await confirmSignIn({ challengeResponse: newPassword });
      if (out.isSignedIn) {
        await finishSession();
        return;
      }
      const step = out.nextStep?.signInStep;
      error =
        step && step !== 'DONE'
          ? `Could not finish sign-in (step: ${step}). Try again or reset the user in Cognito.`
          : 'Could not finish sign-in. Try again.';
      return;
    }

    const out = await signIn({ username: email.trim(), password });

    if (out.isSignedIn) {
      await finishSession();
      return;
    }

    const step = out.nextStep?.signInStep;

    if (step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      needsNewPassword = true;
      return;
    }

    if (step === 'CONFIRM_SIGN_IN_WITH_SMS_CODE' || step === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE') {
      error =
        'This account requires a verification code (MFA). Complete setup in Cognito or disable MFA for this user to use email/password only.';
      return;
    }

    if (step === 'RESET_PASSWORD') {
      error =
        'Your account needs a password reset. Ask an administrator to reset your password in Cognito, then try again.';
      return;
    }

    error = step
      ? `Sign-in needs an extra step (${step}) that this screen does not handle yet. Check the user status in Cognito.`
      : 'Sign-in did not complete. Check that the email matches the Cognito username and the user is CONFIRMED.';
  } catch (err: unknown) {
    const ex = err as { name?: string; message?: string };
    if (ex.name === 'NotAuthorizedException') {
      error = needsNewPassword
        ? 'Could not set password — session expired. Go back and sign in with your temporary password again.'
        : 'Incorrect email or password';
    } else if (ex.name === 'UserNotFoundException') {
      error = 'No account found for this email';
    } else if (ex.name === 'UserNotConfirmedException') {
      error =
        'This user is not confirmed yet. In Cognito: confirm the user or set email_verified and user status to CONFIRMED.';
    } else if (ex.name === 'PasswordResetRequiredException') {
      error =
        'Password reset required. Set a new password in the Cognito console (or use admin APIs), then try again.';
    } else {
      error = ex.message ?? 'Authentication failed';
    }
  } finally {
    loading = false;
  }
}
</script>

<svelte:head>
  <title>Sign in — Project factory</title>
</svelte:head>

<main class="flex min-h-dvh items-center justify-center px-6 py-16 md:px-10">
  <form class="flex w-full max-w-xs flex-col gap-5" onsubmit={handleSubmit}>
    {#if needsNewPassword}
      <h1 class="font-medium text-muted-foreground text-xs uppercase tracking-widest">Set password</h1>
      <p class="text-muted-foreground text-[0.75rem] leading-relaxed">
        You signed in with a temporary password. Choose a new password to continue.
      </p>

      <div class="flex flex-col gap-2">
        <Label for="newPassword" class="text-muted-foreground text-xs font-normal">New password</Label>
        <Input
          id="newPassword"
          type="password"
          name="new-password"
          autocomplete="new-password"
          placeholder="••••••••"
          bind:value={newPassword}
          class={inputMinimal}
        />
      </div>

      <div class="flex flex-col gap-2">
        <Label for="confirmNewPassword" class="text-muted-foreground text-xs font-normal">
          Confirm new password
        </Label>
        <Input
          id="confirmNewPassword"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          bind:value={confirmNewPassword}
          class={inputMinimal}
        />
      </div>
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
          autocomplete="current-password"
          placeholder="••••••••"
          bind:value={password}
          class={inputMinimal}
        />
      </div>
    {/if}

    {#if error}
      <p class="text-[0.75rem] text-destructive">{error}</p>
    {/if}

    <Button type="submit" disabled={loading} class="mt-1 w-full rounded-sm">
      {#if needsNewPassword}
        {loading ? 'Please wait…' : 'Save password and continue'}
      {:else}
        {loading ? 'Please wait…' : 'Continue'}
      {/if}
    </Button>

    {#if needsNewPassword}
      <button
        type="button"
        class="text-muted-foreground text-xs underline decoration-muted-foreground/60 underline-offset-4 hover:text-foreground"
        onclick={resetNewPasswordFlow}
      >
        Back to sign in
      </button>
    {/if}

    {#if !liveMode}
      <span class="text-center text-[0.7rem] text-neutral-600">Local preview — not connected to backend</span>
    {/if}
  </form>
</main>
