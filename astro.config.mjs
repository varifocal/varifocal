// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    starlight({
      title: 'Varifocal',
      prerender: true,
      customCss: ['./src/styles/starlight.css'],
      head: [
        {
          tag: 'link',
          attrs: { rel: 'stylesheet', href: '/styles/wireframe.css' },
        },
        {
          tag: 'link',
          attrs: { rel: 'stylesheet', href: '/styles/hamburger.css' },
        },
      ],
      components: {
        Header: './src/components/starlight/Header.astro',
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
      },
      sidebar: [
        {
          label: 'Blog',
          items: [{ autogenerate: { directory: 'blog' } }],
        },
      ],
    }),
    react(),
  ],
  redirects: {
    '/': '/about',
  },
});
