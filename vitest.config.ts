import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 指定测试文件目录
    include: [
      'service/**/*.test.{ts,js}',
      'entrypoints/**/*.test.{ts,js}',
      'tests/**/*.test.{ts,js}'
    ],
    // 排除目录
    exclude: [
      'node_modules/**',
      'output/**',
      '.wxt/**',
      'docs/**'
    ],
    // 测试环境
    environment: 'node',
    // 全局设置
    globals: true,
    // 代码覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'output/**',
        '.wxt/**',
        'docs/**',
        '**/*.test.{ts,js}',
        '**/*.config.{ts,js}'
      ]
    }
  }
}); 