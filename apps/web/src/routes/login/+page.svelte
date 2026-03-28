<svelte:head>
  <title>Login - SST Monorepo Starter</title>
  <meta name="description" content="Sign in or create an account to get started. Secure authentication powered by AWS Cognito." />
</svelte:head>

<script lang="ts">
import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
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
let confirmPassword = $state('');
let confirmationCode = $state('');
let loading = $state(false);
let error = $state('');
let isLogin = $state(true);
let needsConfirmation = $state(false);

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
    if (needsConfirmation) {
      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode,
      });

      // After confirmation, try to sign in automatically
      try {
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

          // Set user but keep loading state active to prevent flash during navigation
          auth.setUser(
            {
              id: user.userId,
              username: username,
              email: email,
            },
            true
          ); // Keep loading state active

          await tick();
          const redirect = $pageStore.url.searchParams.get('redirect') || '/dashboard';
          goto(redirect, { replaceState: true });
          return;
        }
      } catch {
        // If auto sign-in fails, just show login form
        console.log('Auto sign-in after confirmation failed, showing login form');
      }

      needsConfirmation = false;
      isLogin = true;
      confirmationCode = '';
      error = 'Email verified! Please sign in.';
    } else if (isLogin) {
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

        // Set user but keep loading state active to prevent flash during navigation
        auth.setUser(
          {
            id: user.userId,
            username: username,
            email: email,
          },
          true
        ); // Keep loading state active

        await tick();
        const redirect = $pageStore.url.searchParams.get('redirect') || '/dashboard';
        goto(redirect, { replaceState: true });
      }
    } else {
      if (password !== confirmPassword) {
        error = 'Passwords do not match';
        loading = false;
        return;
      }

      if (password.length < 8) {
        error = 'Password must be at least 8 characters';
        loading = false;
        return;
      }

      const { nextStep } = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
          },
          autoSignIn: {
            enabled: true,
          },
        },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        needsConfirmation = true;
      } else if (nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
        // User was auto-confirmed and signed in
        try {
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

          // Set user but keep loading state active to prevent flash during navigation
          auth.setUser(
            {
              id: user.userId,
              username: username,
              email: email,
            },
            true
          ); // Keep loading state active

          await tick();
          const redirect = $pageStore.url.searchParams.get('redirect') || '/dashboard';
          goto(redirect, { replaceState: true });
        } catch {
          // If auto sign-in failed, show login form
          isLogin = true;
          error = 'Account created! Please sign in.';
        }
      } else {
        isLogin = true;
      }
    }
  } catch (err: unknown) {
    console.error('Auth error:', err);

    const authError = err as { name?: string; message?: string };

    if (authError.name === 'NotAuthorizedException') {
      if (authError.message?.includes('CONFIRMED')) {
        // User is already confirmed, try to sign them in instead
        error = 'Account already confirmed. Please sign in.';
        needsConfirmation = false;
        isLogin = true;
      } else {
        error = 'Incorrect email or password';
      }
    } else if (authError.name === 'UserNotFoundException') {
      error = 'User not found';
    } else if (authError.name === 'UsernameExistsException') {
      error = 'An account with this email already exists. Please sign in instead.';
      isLogin = true;
    } else if (authError.name === 'InvalidPasswordException') {
      error = 'Password does not meet requirements';
    } else if (authError.name === 'CodeMismatchException') {
      error = 'Invalid verification code';
    } else if (authError.name === 'AliasExistsException') {
      error = 'An account with this email already exists. Please sign in instead.';
      isLogin = true;
    } else {
      error = authError.message || (isLogin ? 'Login failed' : 'Signup failed');
    }
  } finally {
    loading = false;
  }
}

function toggleMode() {
  isLogin = !isLogin;
  error = '';
  needsConfirmation = false;
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
      <CardTitle class="text-white text-center">
        {needsConfirmation ? 'Verify Email' : isLogin ? 'Welcome Back' : 'Create Account'}
      </CardTitle>
      <CardDescription class="text-gray-300 text-center">
        {needsConfirmation 
          ? 'Enter the verification code sent to your email' 
          : isLogin 
            ? 'Sign in to continue' 
            : 'Sign up to get started'}
      </CardDescription>
    </CardHeader>

    <CardContent>
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        {#if needsConfirmation}
          <div class="space-y-2">
            <Label for="code" class="text-gray-200">
              Verification Code
            </Label>
            <Input
              id="code"
              type="text"
              bind:value={confirmationCode}
              placeholder="Enter 6-digit code"
              required
              class="bg-white/10 border-0 text-white placeholder:text-gray-400"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>
        {:else}
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

          {#if !isLogin}
            <div class="space-y-2">
              <Label for="confirmPassword" class="text-gray-200">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                bind:value={confirmPassword}
                placeholder="••••••••"
                required
                class="bg-white/10 border-0 text-white placeholder:text-gray-400"
              />
            </div>
          {/if}

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
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        {/if}

        <div class="text-center">
          <Button
            type="button"
            variant="ghost"
            onclick={toggleMode}
            class="text-sm text-gray-300 hover:text-white hover:bg-transparent transition-colors p-0 h-auto"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Button>
        </div>
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
