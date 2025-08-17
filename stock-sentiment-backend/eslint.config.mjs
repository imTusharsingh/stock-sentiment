import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Error handling
      'no-console': 'warn',
      'no-debugger': 'error',

      // Code quality
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'error',

      // Best practices
      eqeqeq: ['error', 'always'],
      curly: 'off', // Changed: allow single-line if without braces
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // Node.js specific
      'no-path-concat': 'error',
      'no-process-exit': 'error',

      // Async/Await
      'no-async-promise-executor': 'error',
      'require-await': 'error',

      // Security
      'no-new-func': 'error',
    },
  },
  {
    files: [
      'tests/**/*.{js,mjs,cjs}',
      '**/*.test.{js,mjs,cjs}',
      '**/*.spec.{js,mjs,cjs}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
]);
