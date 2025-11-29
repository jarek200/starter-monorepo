<script lang="ts">
import type { Label as LabelPrimitive } from 'bits-ui';
// biome-ignore lint/correctness/noUnusedImports: Used in template (line 12)
import { cn } from '$lib/utils.js';

// biome-ignore lint/correctness/noUnusedVariables: Used in template
let { ref = $bindable(null), class: className, ...restProps }: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	data-slot="label"
	class={cn(
		"flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
		className
	)}
	{...restProps}
/>

