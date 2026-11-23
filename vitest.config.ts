import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Pin root to this package so a parent-dir config/node_modules can't hijack resolution.
  root: __dirname,
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
