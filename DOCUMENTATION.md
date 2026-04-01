# Thoth App - Developer Guide

## Overview

Thoth App is a bibliographic metadata management system built with **Next.js 16** and **React 19**. It allows publishers to manage works, publications, contributors, series, and other metadata through a rich admin interface. The app communicates with the [Thoth](https://thoth.pub) GraphQL API and uses ZITADEL for authentication.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.9 |
| UI Library | MUI 7 + Tailwind CSS 4 |
| State Management | XState 5 (state machines) + React Context |
| Server State | TanStack React Query 5 |
| API | GraphQL (graphql-request) with codegen |
| Forms | React Hook Form 7 + Zod 4 |
| Auth | NextAuth 4 + ZITADEL (OIDC) |
| i18n | i18next + react-i18next (en, de, es, pt) |
| Animations | Motion 12 |
| Drag & Drop | dnd-kit |
| Testing | Vitest + Testing Library + jsdom |
| Linting | ESLint 9 + Prettier |

---

## Architecture

The project follows **Feature-Sliced Design (FSD)** - a scalable frontend architecture pattern. All business code lives in `src/` organized into four layers:

```
src/
  entities/      # Business domain units (work, contributor, publisher, etc.)
  features/      # User-facing features composed from entities
  widgets/       # Page-level composite components
  shared/        # Infrastructure, UI kit, utilities, configuration
```

### Layer Rules

- **shared** has no dependencies on other layers
- **entities** depend only on shared
- **features** depend on entities + shared
- **widgets** depend on features + entities + shared
- Pages (`app/`) compose widgets and features

### Entity Structure

Each entity (e.g., `src/entities/work/`) follows a consistent pattern:

```
entities/work/
  api/            # GraphQL service (work.service.ts)
  model/          # Types, schemas, mappers, queries/mutations
  store/          # XState state machine
  ui/             # React components
  hooks/          # Entity-specific hooks (optional)
  index.ts        # Public API (barrel export)
```

### All Entities

`abstract`, `affiliation`, `auth`, `book`, `contribution`, `contributor`, `funding`, `imprint`, `institution`, `language`, `locations`, `metadata`, `price`, `publication`, `publisher`, `reference`, `series`, `sets`, `subject`, `title`, `user`, `work`

---

## App Router Structure

```
app/
  layout.tsx                              # Root layout (providers, fonts)
  error.tsx                               # Error boundary
  not-found.tsx                           # 404 page
  api/
    auth/[...nextauth]/route.ts           # NextAuth handler
    auth/logout/route.ts                  # Logout endpoint
    auth/logout/callback/route.ts         # Post-logout callback
    metadata/formats/route.ts             # Metadata formats
    metadata/specifications/[spec]/work/[workId]/route.ts
  auth/
    login/page.tsx                        # Login page
    logout/error/page.tsx                 # Logout error
  admin/
    layout.tsx                            # Admin layout (sidebar nav)
    dashboard/page.tsx                    # Dashboard
    works/page.tsx                        # Works list
    works/new/page.tsx                    # Create work
    works/copy/page.tsx                   # Copy work
    works/[...id]/page.tsx                # Edit work (dynamic)
    series/page.tsx                       # Series management
    sets/page.tsx                         # Sets management
    profile/page.tsx                      # User profile
```

---

## Getting Started

### Prerequisites

- Node.js (LTS)
- npm

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run generate` | Generate GraphQL types from schema |
| `npm run generate:watch` | Watch mode for GraphQL codegen |
| `npm run test` | Run Vitest tests |

---

## Environment Variables

```env
PORT=3000
AUTH_SECRET=                        # Secret for token encryption
THOTH_AUTH_API_URL=                  # Authorization API URL
NEXT_PUBLIC_THOTH_API_URL=          # Thoth GraphQL API (public)
NEXT_PUBLIC_META_API_URL=           # Metadata export API (public)
NEXTAUTH_URL=                       # App URL for NextAuth
NEXTAUTH_URL_INTERNAL=              # Internal URL (e.g., 127.0.0.1)
SESSION_DURATION=3600               # Session duration in seconds
SESSION_SECRET=                     # Session encryption key
ZITADEL_DOMAIN=                     # ZITADEL instance URL
ZITADEL_CLIENT_ID=                  # OIDC client ID
ZITADEL_CLIENT_SECRET=              # OIDC client secret
ZITADEL_CALLBACK_URL=               # OAuth callback URL
ZITADEL_POST_LOGOUT_URL=            # Post-logout redirect URL
```

---

## Authentication

Authentication is handled via **NextAuth.js** with **ZITADEL** as the OpenID Connect provider.

### Key Files

- `src/shared/lib/auth/auth.ts` - NextAuth configuration, token refresh logic
- `src/shared/lib/auth/scopes.ts` - ZITADEL OAuth scopes
- `auth.ts` (root) - Server-side `getServerSession()` wrapper
- `proxy.ts` - Route protection middleware

### Flow

1. User visits `/auth/login` -> redirected to ZITADEL
2. ZITADEL authenticates and returns tokens (access, refresh, ID)
3. JWT callback manages token lifecycle with automatic refresh
4. Access token is passed to API calls via `getAuthorizationHeaders()`
5. Session strategy is **JWT** (stateless)

### Scopes

`openid`, `profile`, `email`, `offline_access`, plus ZITADEL-specific scopes for metadata, resource owner, and project roles.

---

## API Layer

### GraphQL

The app communicates with the Thoth API via GraphQL using `graphql-request`.

**Code generation** (`codegen.ts`) generates typed queries/mutations from the schema at `https://api.test.thoth.pub/graphql`. Generated output goes to the `gql/` directory.

### Service Architecture

Each entity has a service class in `entities/{entity}/api/{entity}.service.ts` that extends a base service pattern. Services are instantiated with an auth token and injected via React Context.

**Services Context** (`src/shared/context/servicesContext.tsx`):
- Creates all 22+ entity services with the current auth token
- Provides them through React Context
- Access via `useServices()` hook

```tsx
const { workService, contributorService } = useServices();
```

### GraphQL Fragments

Shared fragments live in `src/shared/api/fragments/` covering works, contributors, publications, languages, locations, pricing, fundings, references, subjects, etc.

### React Query

- Configured in `src/shared/providers/QueryProvider.tsx`
- Default `staleTime` and `cacheTime`: 1 day
- DevTools enabled in development

---

## State Management

### XState (State Machines)

Used for complex UI state, especially forms and entity editing workflows.

- **Form state machine** (`src/shared/store/forms/`): Tracks active form ID across the edit views with `init` and `editing` states
- **Entity machines** (`src/entities/*/store/`): Each entity (work, publisher, series, sets, contribution, funding, publication, reference, locations, subject) has its own XState machine

### Provider Composition

All store providers are composed in `app/store/index.tsx` using a `composeProviders` utility. Order matters - providers are nested in dependency order:

Publisher -> Forms -> Contribution -> Publications -> Funding -> Reference -> Series -> Work -> Set -> Subject -> Location -> UI -> Services

### React Context

Used for dependency injection (services) and UI state. Contexts are in `src/shared/context/` and `src/shared/store/ui/`.

---

## Internationalization (i18n)

### Configuration

- Config: `src/shared/i18n/config/i18nConfig.ts`
- Languages: English (en), German (de), Spanish (es), Portuguese (pt)
- Detection: Browser language via `i18next-browser-languagedetector`
- Fallback: English

### Translation Files

Located in `src/shared/i18n/locales/{locale}/`:

| Namespace | Content |
|---|---|
| `common.json` | General UI strings |
| `dashboard.json` | Dashboard section |
| `navigation.json` | Sidebar/nav items |
| `profile.json` | Profile section |
| `forms.json` | Form labels, placeholders, validation |
| `filters.json` | Filter/search options |
| `works.json` | Work-related strings |
| `series.json` | Series section |
| `sets.json` | Sets section |
| `warnings.json` | Warning/error messages |

### Usage

Use the `useTypedTranslation` hook from `src/shared/hooks/` for type-safe translations.

---

## Forms & Validation

- **React Hook Form** for form state management
- **Zod** schemas for validation (located in `entities/*/model/*.schema.ts`)
- **@hookform/resolvers** connects Zod schemas to React Hook Form

---

## UI Components

### Shared UI Kit

`src/shared/ui/core/` contains 40+ reusable base components built on top of MUI:
Button, Modal, Table, TextField, Select, Autocomplete, Chip, etc.

### Styling

- **MUI 7** as the primary component library
- **Tailwind CSS 4** for utility-first styling
- **Emotion** for MUI's CSS-in-JS runtime
- **Theme** configured in `src/shared/theme/`
- Fonts: Open Sans (body), Economica (headings)

---

## Testing

### Setup

- **Vitest** as the test runner (`vitest.config.ts`)
- **jsdom** environment for DOM simulation
- **Testing Library** for component testing
- **@faker-js/faker** for test data generation

### Mocks

`vitest.setup.ts` mocks the `servicesContext` to prevent service instantiation during tests, providing mock implementations for `useServices()` and `ServicesProvider`.

### Running Tests

```bash
npm run test          # Run all tests
```

---

## Path Aliases

Configured in `tsconfig.json`:

```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

Use `@/src/...` for imports from the `src` directory, `@/gql/...` for generated GraphQL types, etc.

---

## Key Patterns

### Adding a New Entity

1. Create directory: `src/entities/{entity}/`
2. Add subdirectories: `api/`, `model/`, `ui/`, `store/` (if needed)
3. Define types in `model/{entity}.types.ts`
4. Create Zod schema in `model/{entity}.schema.ts`
5. Create mapper in `model/{entity}.mapper.ts`
6. Create GraphQL service in `api/{entity}.service.ts`
7. Register service in `src/shared/context/servicesContext.tsx`
8. Export public API from `index.ts`

### Adding a New Feature

1. Create directory: `src/features/{feature}/`
2. Add UI components that compose entities
3. Export from `index.ts`

### Adding Translations

1. Add keys to each locale file in `src/shared/i18n/locales/{en,de,es,pt}/{namespace}.json`
2. Use via `useTypedTranslation` hook

### GraphQL Changes

1. Update queries/mutations in entity `model/` directories
2. Run `npm run generate` to regenerate types
3. Update service methods and mappers as needed

---

## Security

- **CSP headers** configured in `next.config.ts` (inline scripts allowed, Vercel + AWS whitelisted)
- **X-Frame-Options: DENY** prevents clickjacking
- **JWT session strategy** - no server-side session storage
- **Automatic token refresh** - tokens are refreshed before expiry
- **Route protection** via `proxy.ts` middleware
- **Server Actions** body size limit: 5MB
