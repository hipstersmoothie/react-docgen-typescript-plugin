import js from '@eslint/js';
import type { Linter } from 'eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import nPlugin from 'eslint-plugin-n';
import prettierPlugin from 'eslint-plugin-prettier';
import vitest from 'eslint-plugin-vitest';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const config: Linter.Config[] = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      jsdoc: jsdoc,
      n: nPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'n/prefer-node-protocol': 'error',
      complexity: 'off',
      'class-methods-use-this': 'off',
      'object-shorthand': ['error', 'always'],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
    plugins: {
      vitest: vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    ignores: [
      'test-output/**',
      'prettier.config.mjs',
      'eslint.config.ts',
      '**/__fixtures__/**',
      'dist/**',
      'node_modules/**',
    ],
  },
];

export default config;
