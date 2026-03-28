<svelte:head>
  <title>Login - SST Monorepo Starter</title>
  <meta name="description" content="Sign in to get started. Secure authentication powered by AWS Cognito." />
</svelte:head>

<script lang="ts">
import { fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth';
import { tick } from 'svelte';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page as pageStore } from '$app/stores';
import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '$lib/components/ui/card/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { getMyProfile } from '$lib/services/graphql';
import { auth } from '$lib/stores/auth';

let email = $state('');
let password = $state('');
let loading = $state(false);
let error = $state('');

$effect(() => {
  if (!browser) return;

  (async () => {
    try {
      await import('$lib/amplify');
      const user = await getCurrentUser();
      const session = await fetchAuthSession();

      if (user && session.tokens) {
        const redirect = $pageStore.url.searchParams.get('redirect') || '/dashboard';
        goto(redirect, { replaceState: true });
      }
    } catch {
      // Not logged in, stay on login page
    }
  })();
});

async function handleSubmit() {
  loading = true;
  error = '';

  try {
    try {
      await signOut({ global: true });
    } catch {
      // Ignore
    }

    const { isSignedIn } = await signIn({
      username: email,
      password: password,
    });

    if (isSignedIn) {
      const user = await getCurrentUser();
      let username = email?.split('@')[0] || user.userId;

      try {
        const profile = await getMyProfile();
        if (profile?.username) {
          username = profile.username;
        }
      } catch {
        // Use email prefix as fallback
      }

      auth.setUser(
        {
          id: user.userId,
          username: username,
          email: email,
        },
        true
      );

      await tick();
      const redirect = $pageStore.url.searchParams.get('redirect') || '/dashboard';
      goto(redirect, { replaceState: true });
    }
  } catch (err: unknown) {
    console.error('Auth error:', err);

    const authError = err as { name?: string; message?: string };

    if (authError.name === 'NotAuthorizedException') {
      if (authError.message?.includes('CONFIRMED')) {
        error = 'Account already confirmed. Please sign in.';
      } else {
        error = 'Incorrect email or password';
      }
    } else if (authError.name === 'UserNotFoundException') {
      error = 'User not found';
    } else if (authError.name === 'InvalidPasswordException') {
      error = 'Password does not meet requirements';
    } else {
      error = authError.message || 'Login failed';
    }
  } finally {
    loading = false;
  }
}

function handleReturnToLanding() {
  goto('/', { replaceState: false });
}
</script>

<div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 relative overflow-hidden">
  <div class="absolute inset-0 overflow-hidden">
    <div class="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-500/30 rounded-full blur-3xl animate-blob"></div>
    <div class="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-500/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
  </div>

  <Card class="w-full max-w-md relative z-10 bg-white/10 backdrop-blur-xl border-0">
    <CardHeader>
      <div class="mb-4">
        <Button
          type="button"
          variant="ghost"
          onclick={handleReturnToLanding}
          class="flex items-center text-sm text-gray-300 hover:text-white hover:bg-transparent transition-colors p-0 h-auto"
          aria-label="Return to landing page"
        >
          <svg
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Button>
      </div>
      <CardTitle class="text-white text-center">Welcome Back</CardTitle>
      <CardDescription class="text-gray-300 text-center">Sign in to continue</CardDescription>
    </CardHeader>

    <CardContent>
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        <div class="space-y-2">
          <Label for="email" class="text-gray-200">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            required
            class="bg-white/10 border-0 text-white placeholder:text-gray-400"
          />
        </div>

        <div class="space-y-2">
          <Label for="password" class="text-gray-200">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            bind:value={password}
            placeholder="••••••••"
            required
            class="bg-white/10 border-0 text-white placeholder:text-gray-400"
          />
        </div>

        {#if error}
          <Alert variant="destructive" class="bg-red-500/20 border-red-500/50">
            <AlertDescription class="text-red-200">{error}</AlertDescription>
          </Alert>
        {/if}

        <Button
          type="submit"
          disabled={loading}
          class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {loading ? 'Please wait...' : 'Sign In'}
        </Button>
      </form>
    </CardContent>
  </Card>
</div>

<style>
  @keyframes blob {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
  }

  .animate-blob {
    animation: blob 7s infinite;
  }

  .animation-delay-2000 {
    animation-delay: 2s;
  }
</style>
