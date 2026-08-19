import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // Pinned, immutable local v1.7.0 SDL snapshot (APP-01A). Codegen must consume
  // this repository-local contract, not the moving api.test endpoint, so that
  // generation is deterministic against the approved schema.
  schema: './graphql/schema.v1.7.0.graphql',
  documents: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    './gql/': {
      preset: 'client',
    },
  },
};

export default config;
