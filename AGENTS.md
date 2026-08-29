# AGENTS.md

These instructions apply to the whole `thoth-pub/thoth-app` repository.

They are the repository-local specialization of Thoth's shared engineering
controls. They add repository-specific facts and constraints; they do not
replace the shared doctrine and do not restate it in full.

A more deeply nested `AGENTS.md`, if one is added later, narrows or adds to this
file for its directory. Read this file and every applicable nested file before
editing.

## 1. Repository responsibility

`thoth-pub/thoth-app` is the **authenticated publisher and staff management UI**
for Thoth metadata and administrative workflows.

Verified stack and structure:

- Next.js 16 (App Router) and React 19 on TypeScript 5.9;
- MUI 7 and Tailwind CSS 4;
- TanStack Query for server state, XState for workflow state;
- `graphql-request` with GraphQL Code Generator;
- NextAuth 4 with ZITADEL (OIDC);
- Vitest, Testing Library and jsdom;
- Feature-Sliced Design under `src/` (`shared`, `entities`, `features`,
  `widgets`), with routes composed in `app/`.

See `DOCUMENTATION.md` for the developer-facing description of the same.

This repository **does not own** Thoth's domain model, GraphQL API contract,
authorization policy or export formats. Those are owned by `thoth-pub/thoth`.
Do not assert or re-implement a Thoth domain/API rule here as if this
repository defined it.

## 2. Shared engineering doctrine

The canonical, repository-agnostic engineering controls live in
`thoth-pub/thoth`:

- `AGENTS.md` (root) — task identity, authority order, granular action
  authorization, cross-repository impact;
- `docs/engineering/AGENTS.md` — documentation-control rules;
- `docs/engineering/ai-delivery/operating-model.md` — roles, gates, source of
  truth, resumption from durable evidence;
- `docs/engineering/ai-delivery/implementation-handoff-template.md` — the
  handoff contract a coding agent is given;
- `docs/engineering/repository-map/contracts.md` — verified contract ownership
  and consumers;
- `docs/engineering/repository-map/repositories/thoth-app.md` — the canonical
  map entry for this repository.

Read the shared doctrine there. Do not copy it into this repository.

Non-negotiable points that govern work here:

- **GitHub is the live task ledger.** The owning issue, its pull request,
  review threads and CI hold current lifecycle state. Committed files in this
  repository record durable state, not transient task status. Do not commit
  wording that merging or reviewing would falsify.
- **The exact task authorization controls the implementation.** Where a task's
  approved specification/handoff and any other source disagree about what may
  be changed, the approved specification governs, and a genuine conflict is a
  STOP condition rather than something to resolve unilaterally.
- **Actions are deny-by-default.** Anything not explicitly authorized for the
  task is denied.
- **Authorization is granular and non-transitive.** Read does not imply edit;
  edit does not imply commit; commit does not imply push; push does not imply
  pull-request mutation; repository write does not imply issue/comment
  mutation; merge does not imply deployment; deployment does not imply
  production activation; provider read does not imply provider write.
- **An implementing agent may never approve its own work**, merge its own pull
  request, deploy, or activate production behaviour. Independent review by a
  different agent instance is required.
- When authoritative sources conflict, stop and escalate. Conversational memory
  never outranks repository evidence.

## 3. Branch topology

Verified current topology of this repository:

```text
development branch: dev
default/release branch: main
observed release flow: dev -> main
```

Normal work branches from `dev` and targets `dev`.

Do **not** describe `develop`/`master` as this repository's current topology.
The canonical repository map records `develop -> master` as a *target*, not as
observed state. Normalizing the topology is the separate task **BR-APP-01** and
requires its own authorization, coordinated provider configuration and rollback
evidence. Do not normalize branch names as a side effect of any other task.

Before branching, verify the actual head of the base branch rather than
assuming it. One bounded task per branch and pull request.

## 4. Mandatory task identity

Record all of the following before making substantive edits. If any item is
unknown, treat it as missing work rather than filling it in by assumption.

```text
Programme / stage:
Owning GitHub issue:
Repository: thoth-pub/thoth-app
Task ID:
Approved specification:
Risk: LOW | MEDIUM | HIGH | CRITICAL
Exact authorized base branch and base commit SHA:
PR target:
Task branch:
Dependencies:
Authorized write budget (existing files):
Authorized new-file paths:
Prohibited paths:
Granular action authorization (per action; deny-by-default):
Cross-repository impact:
Required tests / validation:
Automatic external side effects of authorized actions:
HOLD / STOP conditions:
Implementing agent/model:
Independent reviewer/model:
```

A GitHub issue is a sufficient specification only when it carries this
information, including an explicit write budget and an action-authorization
matrix.

## 5. GraphQL contracts, code generation and generated artefacts

This repository is a **consumer** of the Thoth GraphQL schema owned by
`thoth-pub/thoth` (recorded in that repository's
`docs/engineering/repository-map/contracts.md` section 2.1).

Verified codegen setup (`codegen.ts`):

- schema source: the pinned local SDL snapshot `graphql/schema.v1.8.0.graphql`
  (SHA-256 `091e11f293132fdec784de420e3addf251f5020ba7e387889b292a066be15d8e`),
  not a live endpoint;
- documents: `app/**/*.{ts,tsx}` and `src/**/*.{ts,tsx}`;
- output: `./gql/` using the GraphQL Code Generator `client` preset.

`gql/` is **generated output**, not hand-maintained source:

```text
gql/fragment-masking.ts
gql/gql.ts
gql/graphql.ts
gql/index.ts
```

Rules:

- run `npm run generate` when consumed GraphQL documents or consumed schema
  fields change; do not hand-edit `gql/`;
- do not regenerate types from an API/schema contract different from the one
  the implementation branch is approved against, or from anything other than an
  explicitly pinned preview contract; a locally convenient endpoint is not an
  approved contract;
- a task whose write budget does not include `gql/` must not run a command that
  rewrites generated artefacts unless it is first shown to be a no-op for that
  task;
- a breaking Thoth GraphQL change requires cross-repository impact analysis
  (section 10) before scope is approved here, and this repository must never
  guess an unmerged upstream contract — it waits for the upstream change to
  merge or consumes an explicitly pinned preview.

## 6. Authentication and security

Verified: authentication is NextAuth 4 with ZITADEL (OIDC). Server-side session
access is wrapped in root `auth.ts`; route gating for `/admin/*` and `/` lives
in root `proxy.ts`; provider and session configuration is supplied through
environment variables (`env.example` documents the expected names).

Constraints:

- no machine or service credentials in browser-reachable code; client bundles
  carry user session context only;
- no secrets, tokens or credentials in source, generated artefacts, fixtures,
  test output or logs; `env.example` documents variable **names**, never values;
- changes to authentication semantics, NextAuth configuration, identity-provider
  configuration, session handling, route gating in `proxy.ts`, or any
  authorization assumption require explicit task scope and their own risk
  classification — they are never incidental to another change;
- UI code must not silently invent backend authorization rules. Authorization is
  decided by the Thoth API; the UI reflects it. If the required rule is not
  available from the backend contract, that is a specification gap to escalate,
  not something to approximate client-side;
- do not encode linked-platform or policy rules here independently of the
  backend descriptors that define them.

Do not document product auth architecture beyond what this repository actually
contains.

## 7. Local validation

Repository commands:

```bash
npm ci
npm run generate
npm run lint
npm test -- --run --coverage
npm run build
```

Choose the checks the change actually needs; they are not all mandatory for
every task. As a guide:

- **any change**: `git diff --check`, plus confirmation that the diff matches
  the authorized write budget;
- **source or test changes**: `npm run lint` and `npm test -- --run --coverage`;
- **GraphQL document or consumed-schema changes**: `npm run generate`, then lint,
  tests and `npm run build`;
- **build-affecting changes** (routing, configuration, dependencies, rendering
  behaviour): `npm run build`;
- **documentation-only changes** (including this file): `git diff --check` and
  path/reference checks are sufficient. Do **not** run `npm run generate` for
  such a task — it can rewrite generated artefacts that are outside the write
  budget.

Report the exact commands run and their actual results. Do not report a check as
passing that was not run.

## 8. Current GitHub CI

Verified current state of `.github/workflows/test.yml`:

```yaml
on:
  push:
  pull_request:
```

The single `test` job runs on Node 22. After `npm ci` it attempts, in this
order:

1. **Lint - no-new-debt ratchet.** ESLint writes a JSON report to the runner
   temporary directory, then `scripts/ci/eslint-ratchet.mjs check` compares that
   report against `scripts/ci/eslint-baseline.json`. An ESLint exit code above
   `1` is treated as a configuration/execution failure, not as diagnostics.
2. **Tests and coverage** - `npm test -- --run --coverage`.
3. **Production build** - `npm run build`.
4. **GraphQL codegen consistency** - `npm run generate` against the pinned local
   SDL (section 5), failing if anything under `gql/` changes, including
   untracked generated files.

Lint runs before the tests because generated `coverage/` output is inside
current ESLint discovery and would otherwise contribute diagnostics that are not
repository debt.

Each gate after installation is attempted even when an earlier gate failed, so
one failure does not hide the remaining evidence. Nothing runs after a failed
`npm ci`.

The lint gate is a **regression** gate, not a cleanliness gate. This repository
carries historical ESLint debt, recorded with its provenance in
`scripts/ci/eslint-baseline.json`. CI fails when a diagnostic fingerprint -
repository-relative file, severity, rule id (or a stable synthetic identity when
ESLint reports none), message, and the number of occurrences - is new, or occurs
more often than the baseline records. Fewer occurrences, and removed
diagnostics, pass. A green run therefore evidences **no new lint debt**; it does
not evidence a green `npm run lint`.

Raising the committed baseline is not authorized by an ordinary product task:
fix the new diagnostics instead. The checker's `write` mode exists only for
separately authorized baseline maintenance, and CI runs `check` only.

## 9. Deployment and provider boundary

Deployment and provider configuration sit **outside** normal source-change
authorization. The canonical repository map records Vercel deployment context
for this repository.

- provider/runtime **read** and provider/runtime **write** are distinct actions,
  each requiring its own explicit authorization; neither is implied by source,
  commit, push or pull-request authorization;
- do not access, inspect or modify Vercel or other provider state unless the
  task explicitly authorizes it;
- do not assert what a pull request will do on the provider side unless provider
  state has actually been verified under the current authorization. In
  particular, do not state that opening a PR definitely creates a preview
  deployment when provider state has not been reverified;
- if an authorized action automatically produces a provider preview or another
  external effect, **report it as an automatic effect and do not interact with
  it**. Automatic creation is not provider-write authorization;
- changing branch topology requires coordinated provider configuration and
  rollback evidence (see section 3, BR-APP-01);
- a successful provider build is not test evidence.

## 10. Cross-repository impact

Before substantive scope is approved, inspect the upstream and downstream
contracts the change touches. Consider at least:

- the Thoth GraphQL schema and API behaviour (owned by `thoth-pub/thoth`);
- generated client and type artefacts in `gql/`;
- authentication and authorization semantics;
- configuration and environment contracts;
- UI assumptions that other Thoth surfaces rely on.

For each affected contract, identify the owning repository and known consumers
from `thoth-pub/thoth`'s `docs/engineering/repository-map/contracts.md`, and
record for each consumer either the downstream task assigned or the reason it
remains compatible. A task is not single-repository merely because it
originated here.

Each affected repository gets its own bounded task, branch and pull request,
independently reviewed. Never take unrestricted write access across repositories
for one task, and never let this repository guess an unmerged upstream contract.

## 11. Independent review

- Any source approval is bound to an **exact head SHA**. Record it.
- Any later commit on the branch invalidates that approval; a fresh review at
  the new exact head is required.
- Approval authorizes neither merge, nor deployment, nor production activation.
  Those are separate decisions with separate authorization.
- The reviewer must not be the agent instance that implemented the task.

## 12. HOLD / STOP

Return **HOLD** and stop rather than improvising when:

- the base branch has moved from the exact authorized base SHA before branch
  creation;
- a file the task expects to create already exists, or an expected file is
  missing;
- a path outside the authorized write budget appears to be required;
- source, runtime, workflow or CI changes become necessary in a task that does
  not authorize them;
- provider or runtime access becomes necessary;
- generated artefacts under `gql/` would need to be modified outside the write
  budget;
- an architecture decision is required;
- unrelated working-tree changes cannot be isolated;
- the owning issue, the approved specification and repository evidence
  materially conflict.

Do not silently rebase an authorization onto a moved base, and do not broaden a
write budget or action authorization without an approved specification change.
