<script lang="ts">
/** Minimal “factory line” mark: beam, three stations, ground. */
interface Props {
  class?: string;
}

let { class: className = '' }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 32 32"
  fill="none"
  class={className}
  aria-hidden="true"
>
  <g
    stroke="currentColor"
    stroke-width="1.3"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- Roof beam -->
    <path d="M5.5 12h21" />
    <!-- Stations (outer pair slightly lighter for depth) -->
    <path d="M10.5 12v14.5" class="text-muted-foreground" />
    <path d="M16 12v14.5" />
    <path d="M21.5 12v14.5" class="text-muted-foreground" />
    <!-- Floor / dock line -->
    <path d="M4.5 27h23" class="text-muted-foreground" />
  </g>
</svg>
