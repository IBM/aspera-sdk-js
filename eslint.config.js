const { defineConfig, globalIgnores } = require('eslint/config');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([{
  languageOptions: {
    globals: {
      ...globals.browser,
    },

    parser: tsParser,
    'sourceType': 'module',

    parserOptions: {
      'project': 'tsconfig.json',
    },
  },

  plugins: {
    '@typescript-eslint': typescriptEslint,
  },
  'rules': {
    '@typescript-eslint/consistent-type-definitions': 'error',
    '@typescript-eslint/dot-notation': 'off',

    '@typescript-eslint/explicit-member-accessibility': ['off', {
      'accessibility': 'explicit',
    }],
    'indent': ['error', 2],
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-inferrable-types': ['error', {
      'ignoreParameters': true,
    }],
    '@typescript-eslint/no-shadow': ['error', {
      'hoist': 'all',
    }],
    '@typescript-eslint/no-unused-expressions': 'error',
    '@typescript-eslint/no-use-before-define': 'error',
    '@typescript-eslint/prefer-function-type': 'error',
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    '@typescript-eslint/unified-signatures': 'error',
    'brace-style': ['error', '1tbs'],
    'curly': 'error',
    'eol-last': 'error',
    'eqeqeq': ['error', 'smart'],
    'guard-for-in': 'error',
    'id-blacklist': 'off',
    'id-match': 'off',
    'no-bitwise': 'error',
    'no-caller': 'error',
    'no-console': ['error', {
      'allow': [
        'log',
        'warn',
        'dir',
        'timeLog',
        'assert',
        'clear',
        'count',
        'countReset',
        'group',
        'groupEnd',
        'table',
        'dirxml',
        'error',
        'groupCollapsed',
        'Console',
        'profile',
        'profileEnd',
        'timeStamp',
        'context',
      ],
    }],
    'no-debugger': 'error',
    'no-empty': 'off',
    'no-eval': 'error',
    'no-fallthrough': 'error',
    'no-new-wrappers': 'error',
    'no-restricted-imports': 'error',
    'no-throw-literal': 'error',
    'no-trailing-spaces': 'error',
    'no-underscore-dangle': 'off',
    'no-unused-labels': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'radix': 'error',
    'spaced-comment': ['error', 'always', {
      'markers': ['/'],
    }],
  },
}, globalIgnores(['**/example'])]);
