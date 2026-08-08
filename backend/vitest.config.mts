import {defineConfig} from 'vitest/config'

export default defineConfig({
    test: {
        // Only the sources. Without this the default pattern also picks up the
        // compiled copies under dist once anything has been built, and those
        // are commonjs, which vitest refuses to load.
        include: ['src/**/*.test.ts'],
        environment: 'node',
        globals: true,
        setupFiles: './src/test/setup.ts',
    },
})
