// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind'; // <--- Tem que ter essa linha

import vercel from '@astrojs/vercel';

export default defineConfig({
  // <--- E essa aqui
  integrations: [tailwind()],

  adapter: vercel()
});