<script lang="ts">
  import { cn } from "$lib/utils.js";

  let className: string | undefined | null = undefined;
  export { className as class };
  export let value: string = "";
  export let rows: number = 3;
</script>

<textarea
  bind:value
  {rows}
  class={cn(
    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
    className
  )}
  {...$$restProps}
></textarea>
