import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // Pinned, immutable local v1.8.0 SDL snapshot (APP-IMPORT-ORCID-PERF-01). Codegen must consume
  // this repository-local contract, not the moving api.test endpoint, so that
  // generation is deterministic against the approved schema.
  schema: './graphql/schema.v1.8.0.graphql',
  documents: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    './gql/': {
      preset: 'client',
    },
  },
};

export default config;
