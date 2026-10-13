import vitest from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import unicorn from 'eslint-plugin-unicorn';

const AXIOS_RULE = {
  name: 'axios',
  message: 'Use `requester` from @/common/api/interceptor. Only src/common/api may import axios.',
};
const DATE_FNS_RULE = {
  group: ['date-fns', 'date-fns/*', '@date-fns/*'],
  message: 'Use the helpers in @/common/utils/date-utility.',
};
const RAW_UI_RULE = {
  group: ['@/common/components/ui', '@/common/components/ui/*'],
  message:
    'Import UI from @/common/components/components/<name>. Raw shadcn components are only wrapped there.',
};

/** Builds `no-restricted-imports` so each folder can lift only the restriction it owns. */
const restrictImports = ({ axios = true, dateFns = true, rawUi = true } = {}) => [
  'error',
  {
    paths: axios ? [AXIOS_RULE] : [],
    patterns: [...(dateFns ? [DATE_FNS_RULE] : []), ...(rawUi ? [RAW_UI_RULE] : [])],
  },
];

const NEW_DATE_SELECTOR = {
  selector: "NewExpression[callee.name='Date']",
  message: 'Use @/common/utils/date-utility instead of new Date().',
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { unicorn },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      'no-restricted-imports': restrictImports(),
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use the storage helpers in global-utility.ts.' },
        { name: 'sessionStorage', message: 'Use the storage helpers in global-utility.ts.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Use global-utility.ts.' },
        { object: 'window', property: 'sessionStorage', message: 'Use global-utility.ts.' },
      ],
      'no-restricted-syntax': ['error', NEW_DATE_SELECTOR],
      'no-console': 'error',
      'react/no-danger': 'error',
      'react/jsx-no-target-blank': 'error',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'prefer-const': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          pathGroups: [
            { pattern: '{react,react/**,next,next/**}', group: 'builtin', position: 'before' },
            { pattern: '@/common/**', group: 'internal', position: 'before' },
            { pattern: '@/modules/**', group: 'internal' },
            { pattern: '@/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  // The interceptor layer is the only place allowed to use axios.
  {
    files: ['src/common/api/**'],
    rules: { 'no-restricted-imports': restrictImports({ axios: false }) },
  },
  // date-utility.ts is the only file that imports date-fns and builds Date objects.
  {
    files: ['src/common/utils/date-utility.ts'],
    rules: {
      'no-restricted-imports': restrictImports({ dateFns: false }),
      'no-restricted-syntax': 'off',
    },
  },
  // Overrides wrap the raw shadcn components; raw components may import each other.
  {
    files: ['src/common/components/components/**', 'src/common/components/ui/**'],
    rules: { 'no-restricted-imports': restrictImports({ rawUi: false }) },
  },
  // Raw shadcn output keeps the CLI's import layout so re-adding a component gives a clean diff.
  {
    files: ['src/common/components/ui/**'],
    rules: { 'import/order': 'off' },
  },
  {
    files: ['src/common/utils/global-utility.ts'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },
  {
    files: ['src/common/utils/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  // Tests and mocks may build fixed dates.
  {
    files: ['**/*.test.{ts,tsx}', '**/mocks.ts', 'e2e/**', 'src/common/test/**'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'no-restricted-syntax': 'off',
    },
  },
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'public/mockServiceWorker.js',
    'docs/**',
  ]),
]);

export default eslintConfig;
