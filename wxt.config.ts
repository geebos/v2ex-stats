import { defineConfig } from 'wxt';
import dotenv from 'dotenv';
dotenv.config();

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
    action: {},
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAutX6DFhQWKNePMfj3ScxxYYp6QLSDrKgI8KbE5l3BuMwa/+w8mX46bubxRh6EQcOxZ/55oVd5NJmMKgpWzNLhF6dkSowllG2frYSjnFxpRrChV3wdPBZ+nEX099iG/XNqDWgqhvDDxTbFOSRzklSqkQFJDYDicqr6zxvnZOZ2kbzsBx3e3QplACmHQiT7SwlXYKsKV9USr+b7flMR0JJUxlhHkPjoUs2CUy756nl6QwMS191ZKgN2tsZXNf8Uik3XGXlYDL+YEqOB2qila2KOZoQlVNP29ErtHCmglohvLGMW6K65R9BubPIDRiAv57AZbJWEWt79QDAtXxpuTSjIQIDAQAB'
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
    plugins: [
    ],
    esbuild: {
      // 在生产环境只去除 console.log 和 console.debug，保留 warn/error 等
      pure: process.env.DEV_ENV ? [] : ['console.log', 'console.debug'],
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
