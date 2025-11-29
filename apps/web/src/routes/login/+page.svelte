<svelte:head>
  <title>Login - SST Monorepo Starter</title>
  <meta name="description" content="Sign in or create an account to get started. Secure authentication powered by AWS Cognito." />
</svelte:head>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { tick } from 'svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import { auth } from '$lib/stores/auth';
  import { signIn, signUp, confirmSignUp, getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth';
  import { getMyProfile } from '$lib/services/graphql';

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
          const redirect = page.url.searchParams.get('redirect') || '/dashboard';
          goto(redirect, { replaceState: true });
        }
      } catch (error) {
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
        needsConfirmation = false;
        isLogin = true;
        confirmationCode = '';
      } else if (isLogin) {
        try {
          await signOut({ global: true });
        } catch (signOutError) {
          // Ignore
        }

        const { isSignedIn } = await signIn({
          username: email,
          password: password,
        });

        if (isSignedIn) {
          const user = await getCurrentUser();
          let username = email?.split("@")[0] || user.userId;
          
          try {
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
            email: email,
          });
          
          await tick();
          const redirect = page.url.searchParams.get('redirect') || '/dashboard';
          goto(redirect, { replaceState: true });
        }
      } else {
        if (password !== confirmPassword) {
          error = "Passwords do not match";
          loading = false;
          return;
        }

        if (password.length < 8) {
          error = "Password must be at least 8 characters";
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
            autoSignIn: true,
          },
        });

        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          needsConfirmation = true;
        } else {
          isLogin = true;
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      
      if (err.name === 'NotAuthorizedException') {
        error = 'Incorrect email or password';
      } else if (err.name === 'UserNotFoundException') {
        error = 'User not found';
      } else if (err.name === 'UsernameExistsException') {
        error = 'An account with this email already exists';
      } else if (err.name === 'InvalidPasswordException') {
        error = 'Password does not meet requirements';
      } else if (err.name === 'CodeMismatchException') {
        error = 'Invalid verification code';
      } else {
        error = err.message || (isLogin ? 'Login failed' : 'Signup failed');
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
</script>

<div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 relative overflow-hidden">
  <div class="absolute inset-0 overflow-hidden">
    <div class="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-500/30 rounded-full blur-3xl animate-blob"></div>
    <div class="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-500/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
  </div>

  <Card class="w-full max-w-md relative z-10 bg-white/10 backdrop-blur-xl border-white/20">
    <div class="p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">
          {needsConfirmation ? 'Verify Email' : isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p class="text-gray-300">
          {needsConfirmation 
            ? 'Enter the verification code sent to your email' 
            : isLogin 
              ? 'Sign in to continue' 
              : 'Sign up to get started'}
        </p>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        {#if needsConfirmation}
          <div>
            <label for="code" class="block text-sm font-medium text-gray-200 mb-2">
              Verification Code
            </label>
            <Input
              id="code"
              type="text"
              bind:value={confirmationCode}
              placeholder="Enter 6-digit code"
              required
              class="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
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
          <div>
            <label for="email" class="block text-sm font-medium text-gray-200 mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              bind:value={email}
              placeholder="you@example.com"
              required
              class="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-200 mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              bind:value={password}
              placeholder="••••••••"
              required
              class="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          {#if !isLogin}
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-200 mb-2">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                bind:value={confirmPassword}
                placeholder="••••••••"
                required
                class="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          {/if}

          {#if error}
            <div class="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p class="text-sm text-red-200">{error}</p>
            </div>
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
          <button
            type="button"
            onclick={toggleMode}
            class="text-sm text-gray-300 hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </form>
    </div>
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
