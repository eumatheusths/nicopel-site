// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind'; // <--- Tem que ter essa linha

export default defineConfig({
  integrations: [tailwind()], // <--- E essa aqui
});