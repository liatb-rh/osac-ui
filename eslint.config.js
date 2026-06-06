import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'apps/app-frontend/src/mocks/**'],
  },

  // Base: JS + TypeScript rules for all source files
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'no-console': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Backend: Node.js globals, Fastify-friendly async rules
  {
    files: ['apps/app-backend/src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/require-await': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['apps/app-backend/src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
    },
  },

  // Frontend + UI components: React rules
  {
    files: ['apps/app-frontend/src/**/*.{ts,tsx}', 'libs/ui-components/src/**/*.{ts,tsx}'],
    extends: [reactPlugin.configs.flat.recommended, reactPlugin.configs.flat['jsx-runtime']],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/self-closing-comp': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/prop-types': 'off',
      // New react-hooks v7 rules – code intentionally uses these patterns
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@patternfly/react-icons',
              message:
                'Use a deep ESM import: @patternfly/react-icons/dist/esm/icons/<icon-name>',
            },
            {
              name: '@patternfly/react-tokens',
              message:
                'Use a deep ESM import: @patternfly/react-tokens/dist/esm/<token-name>',
            },
            {
              name: 'lodash-es',
              message: 'Import using full path `lodash-es/<function>` instead',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/app-frontend/src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
)
