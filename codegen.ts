import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://api.thoth.pub/graphql',
  documents: ['app/**/*.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    './gql/': {
      preset: 'client',
    },
  },
};

export default config;
