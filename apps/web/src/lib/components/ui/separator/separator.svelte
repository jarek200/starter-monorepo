<script lang="ts">
import { cn } from '\$lib/utils.js';
// biome-ignore lint/style/useImportType: SeparatorPrimitive.Root is used as a component value, not just a type
import { Separator as SeparatorPrimitive } from 'bits-ui';

let {
  ref = $bindable(null),
  class: className,
  'data-slot': dataSlot = 'separator',
  ...restProps
}: SeparatorPrimitive.RootProps = $props();
</script>

<SeparatorPrimitive.Root
	bind:ref
	data-slot={dataSlot}
	class={cn(
		"bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
		className
	)}
	{...restProps}
/>

