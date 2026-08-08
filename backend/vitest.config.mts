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
        coverage: {
            provider: 'v8',
            reporter: ['text-summary', 'html', 'json-summary'],
            include: ['src/**/*.ts'],
            // The Prisma client is generated, server.ts is the listener that
            // the suite deliberately does not start, and the test folder
            // measuring itself says nothing about the source.
            exclude: ['src/generated/**', 'src/server.ts', 'src/test/**', 'src/**/*.d.ts'],
            // Set just under what the suite reaches today, so the build fails
            // on a real drop rather than on ordinary noise.
            thresholds: {statements: 95, branches: 90, functions: 94, lines: 95},
        },
    },
})
