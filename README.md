# Thoth App

Thoth App is the authenticated publisher and staff management application for
[Thoth Open Metadata](https://thoth.pub). Publishers use it to manage
structured bibliographic metadata, including works, publications, contributors,
series and related records.

For more on the wider Thoth project, see [thoth.pub](https://thoth.pub) and the
[thoth-pub GitHub organisation](https://github.com/thoth-pub).

## Relationship to Thoth

This application is a consumer of the Thoth GraphQL API. It does not define
Thoth's domain model, GraphQL API contract or export formats; those are owned
elsewhere in the Thoth project.

## Technology

- Next.js 16 (App Router) and React 19, written in TypeScript
- MUI and Tailwind CSS for UI
- TanStack Query for server state, XState for workflow state
- `graphql-request` with GraphQL Code Generator for GraphQL access
- NextAuth with ZITADEL for authentication
- Vitest and Testing Library for testing

## Local development

```bash
npm ci
cp env.example .env.local
npm run dev
```

The values in `.env.local` must be configured for the Thoth and ZITADEL
environment you are connecting to. See `env.example` for the required variable
names.

## Available commands

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - run the production build
- `npm run lint` - run ESLint
- `npm run generate` - run GraphQL Code Generator
- `npm run generate:watch` - run GraphQL Code Generator in watch mode
- `npm test -- --run` - run the test suite once
- `npm test -- --run --coverage` - run the test suite once, with coverage

## GraphQL code generation

GraphQL Code Generator is configured in `codegen.ts` to consume the
repository-pinned schema snapshot at `graphql/schema.v1.7.0.graphql`, and
writes generated client artefacts to `gql/`. Generated files under `gql/`
should not be edited by hand; run `npm run generate` to regenerate them.

## Repository structure

- `app/` - Next.js routes and layouts
- `src/` - application code, organised using Feature-Sliced Design
- `graphql/` - the pinned GraphQL schema snapshot this app is generated against
- `gql/` - generated GraphQL client artefacts

## Contributing

Development branches from `dev`, and pull requests normally target `dev`.

Bug reports and proposed changes are welcome via GitHub issues. For
substantial changes, please open an issue to discuss the approach before
starting implementation.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE)
for details.
