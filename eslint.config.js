// @ts-check
import js from '@eslint/js';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import compat from 'eslint-plugin-compat';
import globals from 'globals';

/**
 * ESLint flat config built on the Airbnb style guide.
 *
 * `eslint-config-airbnb` (v19) only supports ESLint 7/8 and plain JavaScript, so this
 * project uses `eslint-config-airbnb-extended`: the same Airbnb rule set ported to
 * ESLint 9 flat config with first-class TypeScript support. It bundles
 * eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y and
 * eslint-plugin-import-x (the maintained fork of eslint-plugin-import).
 */

const javascriptConfig = [
  { name: 'js/config', ...js.configs.recommended },
  plugins.stylistic,
  plugins.importX,
  ...configs.base.recommended,
];

const reactConfig = [
  plugins.react,
  plugins.reactHooks,
  plugins.reactA11y,
  ...configs.react.recommended,
];

const typescriptConfig = [
  plugins.typescriptEslint,
  ...configs.base.typescript,
  ...configs.react.typescript,
];

export default [
  {
    name: 'project/ignores',
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'cypress/videos/**',
      'cypress/screenshots/**',
    ],
  },
  ...javascriptConfig,
  ...reactConfig,
  ...typescriptConfig,
  {
    // Flags browser APIs missing from the brief's minimum browsers (package.json
    // "browserslist": Chrome/Edge 90, Firefox 88, Safari 14).
    ...compat.configs['flat/recommended'],
    name: 'project/browser-compat',
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
  },
  {
    name: 'project/browser-globals',
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    name: 'project/overrides',
    rules: {
      // React 17+ automatic JSX runtime: React does not need to be in scope.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // React Hook Form's `register()` returns props that are meant to be spread onto inputs.
      'react/jsx-props-no-spreading': 'off',
      // TypeScript optional props + default parameters replace defaultProps.
      'react/require-default-props': 'off',
      // Named exports keep utilities tree-shakeable and grep-friendly.
      'import-x/prefer-default-export': 'off',
      // Labels are associated through htmlFor/id; nesting is not required as well.
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 3 }],
      // PII must never reach the console; the logger utility is the only sanctioned sink.
      'no-console': 'error',
      // Same options as the original eslint-config-airbnb: long string literals (Tailwind
      // class lists, copy) are exempt, code is not.
      '@stylistic/max-len': [
        'error',
        {
          code: 100,
          ignoreUrls: true,
          ignoreComments: false,
          ignoreRegExpLiterals: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
    },
  },
  {
    name: 'project/node-tooling',
    files: [
      '*.config.{js,ts}',
      'cypress/**/*.{js,ts}',
      'scripts/**/*.{js,mjs,cjs}',
      'src/**/*.test.{ts,tsx}',
      'src/test/**/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
  {
    name: 'project/cypress',
    files: ['cypress/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
        cy: 'readonly',
        Cypress: 'readonly',
        expect: 'readonly',
      },
    },
  },
];
