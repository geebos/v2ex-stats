import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
  },
  outDir: 'output',
  webExt: {
    disabled: true,
  },
  vite: () => ({
    esbuild: {
      // 在生产环境只去除 console.log 和 console.debug，保留 warn/error 等
      pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug'] : [],
    },
  }),
});
