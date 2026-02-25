import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Enable globals like describe, it, expect without imports
    globals: true,

    // Use jsdom for DOM/React component testing
    environment: 'jsdom',

    // Setup files run before each test file
    setupFiles: ['./src/test/setup.ts'],

    // Include patterns for test files (co-located with source per AR19)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Exclude patterns
    exclude: ['node_modules', '.next', 'dist'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        '.next',
        'dist',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        'src/app/layout.tsx',
        'src/app/page.tsx',
      ],
    },

    // Type checking
    typecheck: {
      enabled: false, // TypeScript checks handled by tsc
    },
  },

  // Path alias resolution (matches tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
