import eslintJs from '@eslint/js';
import eslintReact from '@eslint-react/eslint-plugin';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import pluginQuery from '@tanstack/eslint-plugin-query';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = tseslint.config([
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    extends: [
      eslintJs.configs.recommended,
      tseslint.configs.recommended,
      eslintReact.configs['recommended-typescript'],
    ],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  nextVitals,
  eslintConfigPrettier,
  pluginQuery.configs['flat/recommended'],
]);

export default eslintConfig;
