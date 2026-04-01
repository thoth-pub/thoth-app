import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://api.test.thoth.pub/graphql',
  documents: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    './gql/': {
      preset: 'client',
    },
  },
};

export default config;
