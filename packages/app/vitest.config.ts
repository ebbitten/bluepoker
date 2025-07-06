import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'src/**/*.{test,spec}.{js,ts,tsx}',
      '../../tests/**/*.{test,spec}.{js,ts,tsx}'
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, '../shared/src'),
      '@bluepoker/shared': resolve(__dirname, '../shared/src'),
    },
  },
})