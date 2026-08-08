/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        coverage: {
            provider: 'v8',
            reporter: ['text-summary', 'html', 'json-summary'],
            include: ['src/**/*.{ts,tsx}'],
            // main.tsx only mounts the app, and the test folder measuring
            // itself says nothing about how well the source is covered.
            exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.d.ts'],
            // Set just under what the suite reaches today, so the build fails
            // on a real drop rather than on ordinary noise.
            thresholds: {statements: 75, branches: 75, functions: 69, lines: 75},
        },
    },
})