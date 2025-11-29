<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  
  import type { Snippet } from 'svelte';
  
  interface Props {
    children?: Snippet;
  }
  
  let { children }: Props = $props();
  
  $effect(() => {
    if (browser) {
      import('$lib/amplify');
    }
  });
</script>

<main class="min-h-screen bg-gray-50">
  {@render children?.()}
</main>
