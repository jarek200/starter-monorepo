<svelte:head>
  <title>Dashboard - SST Monorepo Starter</title>
  <meta name="description" content="Your dashboard - manage your profile and settings." />
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { auth, type User } from '$lib/stores/auth';
  import { signOut } from 'aws-amplify/auth';
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import { getMyProfile, updateUserProfile } from '$lib/services/graphql';
  import { goto } from '$app/navigation';
  
  // Access auth store reactively
  let authState = $state({ user: null as User | null, isAuthenticated: false });
  
  // Subscribe to auth store
  $effect(() => {
    const unsubscribe = auth.subscribe(state => {
      authState = { user: state.user, isAuthenticated: state.isAuthenticated };
    });
    return unsubscribe;
  });
  
  const user = $derived(authState.user);

  let profile = $state<any>(null);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state('');
  let success = $state('');
  
  let name = $state('');
  let bio = $state('');

  onMount(async () => {
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
    } catch (err: any) {
      error = err.message || 'Failed to load profile';
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
    } catch (err: any) {
      error = err.message || 'Failed to update profile';
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
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500 mb-4"></div>
          <p class="text-gray-600">Loading profile...</p>
        </div>
      </div>
    {:else if profile}
      <div class="max-w-2xl mx-auto">
        <Card class="p-6">
          <h2 class="text-2xl font-bold mb-6">Profile Settings</h2>
          
          {#if error}
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600">{error}</p>
            </div>
          {/if}
          
          {#if success}
            <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p class="text-sm text-green-600">{success}</p>
            </div>
          {/if}

          <div class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                class="bg-gray-50"
              />
              <p class="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={profile.username}
                disabled
                class="bg-gray-50"
              />
              <p class="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <Input
                id="name"
                type="text"
                bind:value={name}
                placeholder="Your display name"
              />
            </div>

            <div>
              <label for="bio" class="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <Textarea
                id="bio"
                bind:value={bio}
                placeholder="Tell us about yourself..."
                rows="4"
              />
            </div>

            <div class="flex gap-4 pt-4">
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
            </div>
          </div>
        </Card>

        <!-- Account Info Card -->
        <Card class="p-6 mt-6">
          <h3 class="text-xl font-bold mb-4">Account Information</h3>
          <div class="space-y-2 text-sm text-gray-600">
            <p><span class="font-medium">User ID:</span> {profile.userId}</p>
            <p><span class="font-medium">Created:</span> {new Date(profile.createdAt).toLocaleDateString()}</p>
            <p><span class="font-medium">Last Updated:</span> {new Date(profile.updatedAt).toLocaleDateString()}</p>
          </div>
        </Card>
      </div>
    {:else}
      <div class="text-center py-12">
        <p class="text-gray-600">No profile found</p>
      </div>
    {/if}
  </main>
</div>
