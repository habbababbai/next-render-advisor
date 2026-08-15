// Flat config (ESLint 9+ requirement). Ported 1:1 from the retired .eslintrc.json —
// see git history for that file if you need to diff behavior.
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  { ignores: ['**/dist', '**/coverage', '**/node_modules'] },
  js.configs.recommended,
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      globals: { ...globals.node, ...globals.es2022 },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // rules.ts must stay pure per CLAUDE.md — no I/O, no console, no framework imports.
    files: ['**/rules.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'fs', 'fs/*', 'path', 'http', 'https', 'net', 'child_process',
            'next', 'next/*', 'react', 'react-dom', 'react/*', 'react-dom/*',
          ],
        },
      ],
    },
  },
];
