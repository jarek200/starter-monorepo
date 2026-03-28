<svelte:head>
  <title>Dashboard - SST Monorepo Starter</title>
  <meta name="description" content="Your dashboard - manage your profile and settings." />
</svelte:head>

<script lang="ts">
import type { User as GraphQLUser } from '@sst-monorepo/graphql';
import { signOut } from 'aws-amplify/auth';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '$lib/components/ui/card/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Skeleton } from '$lib/components/ui/skeleton/index.js';
import { Textarea } from '$lib/components/ui/textarea/index.js';
import { getMyProfile, updateUserProfile } from '$lib/services/graphql';
import { auth, type User } from '$lib/stores/auth';

// Access auth store reactively
let authState = $state({ user: null as User | null, isAuthenticated: false });

// Subscribe to auth store
$effect(() => {
  const unsubscribe = auth.subscribe((state) => {
    authState = { user: state.user, isAuthenticated: state.isAuthenticated };
  });
  return unsubscribe;
});

const user = $derived(authState.user);

let profile = $state<GraphQLUser | null>(null);
let loading = $state(true); // Start with loading true to prevent flash
let saving = $state(false);
let error = $state('');
let success = $state('');

let name = $state('');
let bio = $state('');

onMount(async () => {
  // Set auth loading to false once dashboard starts loading
  // This ensures smooth transition from login
  auth.setLoading(false);
  await loadProfile();
});

async function loadProfile() {
  loading = true;
  error = '';
  try {
    const data = await getMyProfile();
    profile = data;
    name = data?.name || '';
    bio = data?.bio || '';
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
    error = errorMessage;
  } finally {
    loading = false;
  }
}

async function saveProfile() {
  saving = true;
  error = '';
  success = '';

  try {
    const updated = await updateUserProfile({
      name: name.trim() || undefined,
      bio: bio.trim() || undefined,
    });

    profile = updated;
    success = 'Profile updated successfully!';

    // Update auth store
    if (user && updated) {
      auth.setUser({
        id: user.id,
        username: updated.username || user.username,
        email: user.email,
      });
    }

    setTimeout(() => {
      success = '';
    }, 3000);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
    error = errorMessage;
  } finally {
    saving = false;
  }
}

async function handleLogout() {
  try {
    await signOut({ global: true });
    auth.logout();
    goto('/login');
  } catch (err) {
    console.error('Logout error:', err);
  }
}
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div class="flex items-center gap-4">
          {#if user}
            <span class="text-gray-600">Welcome, {user.username}!</span>
          {/if}
          <Button variant="outline" onclick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="container mx-auto px-4 py-8">
    {#if loading}
      <div class="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <Skeleton class="h-8 w-48" />
            <Skeleton class="h-4 w-64" />
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Skeleton class="h-4 w-20" />
              <Skeleton class="h-10 w-full" />
            </div>
            <div class="space-y-2">
              <Skeleton class="h-4 w-24" />
              <Skeleton class="h-10 w-full" />
            </div>
            <div class="space-y-2">
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    {:else if profile}
      <div class="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          
          <CardContent class="space-y-4">
            {#if error}
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            {/if}
            
            {#if success}
              <Alert>
                <AlertDescription class="text-green-600">{success}</AlertDescription>
              </Alert>
            {/if}

            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                class="bg-gray-50"
              />
              <CardDescription class="text-xs">Email cannot be changed</CardDescription>
            </div>

            <div class="space-y-2">
              <Label for="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={profile.username}
                disabled
                class="bg-gray-50"
              />
              <CardDescription class="text-xs">Username cannot be changed</CardDescription>
            </div>

            <div class="space-y-2">
              <Label for="name">Display Name</Label>
              <Input
                id="name"
                type="text"
                bind:value={name}
                placeholder="Your display name"
              />
            </div>

            <div class="space-y-2">
              <Label for="bio">Bio</Label>
              <Textarea
                id="bio"
                bind:value={bio}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>
          </CardContent>

          <CardFooter class="flex gap-4">
            <Button
              onclick={saveProfile}
              disabled={saving}
              class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onclick={loadProfile}
              disabled={saving}
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>

        <!-- Account Info Card -->
        <Card class="mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2 text-sm">
              <p><span class="font-medium">User ID:</span> {profile.userId}</p>
              <p><span class="font-medium">Created:</span> {new Date(profile.createdAt).toLocaleDateString()}</p>
              <p><span class="font-medium">Last Updated:</span> {new Date(profile.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    {:else}
      <div class="text-center py-12">
        <p class="text-gray-600">No profile found</p>
      </div>
    {/if}
  </main>
</div>
