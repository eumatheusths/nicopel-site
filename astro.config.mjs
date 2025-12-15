// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  integrations: [tailwind()],
  output: 'server', // <--- ISSO É OBRIGATÓRIO PARA A API EXISTIR
  adapter: vercel(),
});