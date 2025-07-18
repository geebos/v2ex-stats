import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
  },
  outDir: 'output',
  zip: {
    artifactTemplate: '{{name}}-{{browser}}-v{{version}}.zip',
    sourcesTemplate: '{{name}}-sources-v{{version}}.zip'
  },
  webExt: {
    disabled: true,
  },
  vite: () => ({
    esbuild: {
      // 在生产环境只去除 console.log 和 console.debug，保留 warn/error 等
      pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug'] : [],
      // 移除注释
      legalComments: 'none',
    },
    build: {
      // 进一步压缩代码
      minify: 'esbuild',
      // 禁用代码分割（对于扩展不需要）
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  }),
});
