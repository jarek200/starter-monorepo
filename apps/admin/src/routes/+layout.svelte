<script lang="ts">
import type { Snippet } from 'svelte';
import '../app.css';

interface Props {
  children?: Snippet;
}

let { children }: Props = $props();
</script>

<div class="relative min-h-dvh min-w-0 overflow-x-hidden text-foreground">
  <header
    class="pointer-events-none absolute top-8 left-6 z-10 md:top-10 md:left-10 lg:top-12 lg:left-14"
  >
    <div class="flex gap-3.5 border-foreground pl-5 [border-left-width:2px]">
      <p class="m-0 font-display">
        <span
          class="block text-foreground text-sm font-semibold tracking-[0.26em] lowercase md:text-base"
        >
          admin
        </span>
        <span
          class="mt-3 block max-w-[14rem] text-[11px] font-medium leading-snug tracking-[0.34em] text-muted-foreground lowercase md:mt-3.5 md:max-w-none md:text-sm"
        >
          project factory
        </span>
      </p>
    </div>
  </header>

  {@render children?.()}
</div>
