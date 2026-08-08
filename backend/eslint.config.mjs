import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import {defineConfig, globalIgnores} from 'eslint/config'

export default defineConfig([
    // The Prisma client is generated code, dist is build output, and coverage
    // holds the generated html report, whose bundled scripts carry eslint
    // directives of their own and get reported as unused.
    globalIgnores(['dist', 'src/generated', 'coverage']),
    {
        files: ['**/*.ts'],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            globals: globals.node,
        },
    },
])
