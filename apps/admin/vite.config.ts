import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    /**
     * Listen on all local addresses. Default can bind to IPv6-only (::1), so
     * http://127.0.0.1:5174 fails with ERR_CONNECTION_REFUSED while localhost works.
     */
    host: true,
    port: 5174,
    strictPort: true,
  },
});
