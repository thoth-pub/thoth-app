# ONIX contract regression harness

Test-only infrastructure for thoth-pub/thoth-app#236 (APP-IMPORT-ONIX-REG-01A), the framework slice of the ONIX
contract regression suite #188. Nothing in this directory is imported by application code.

A fixture is one ONIX source plus a typed statement of what the accepted importer contract does with it, stage by
stage:

```text
ONIX source (source.xml)
  -> canonical validation + source gate   (gate: verdict, every finding, every recovery)
  -> normalised Reference source           (normalized: exact values at XPath locations)
  -> planning, per publisher scenario      (records, Products, Work groups, blockers, findings, planned Works)
  -> classified outcomes                   (outcome counts in the programme vocabulary)
```

## Layout

```text
__regression__/
  README.md             these conventions
  types.ts              the fixture declaration and ledger types
  pipeline.ts           the uploader's pipeline, stage for stage
  ledger.ts             the semantic projection of a run
  assertions.ts         declaration rules, the fixture runner and exact assertions
  fixtureSources.ts     fixture discovery, loading and hashing
  regression.test.ts    runs every registered fixture
  harness.test.ts       self-tests of the harness
  fixtures/
    index.ts            the registry of fixtures
    <fixture-id>/
      source.xml        the ONIX bytes, exactly as uploaded
      expected.ts       `defineOnixRegressionFixture({...})`
```

A fixture directory holds exactly `source.xml` and `expected.ts`. Every directory must be registered in
`fixtures/index.ts`, and every registration must have a directory. `harness.test.ts` enforces both.

## The pipeline

`pipeline.ts` calls the exported contract functions in the order and with the arguments `XMLParse.tsx` uses:

1. `createOnixSourceValidator` with the pinned `public/onix-validation/` resources and the accelerated evaluators a
   Worker session runs by default, then `toWorkerResult`;
2. `permitsTargetPlanning`, then `bridgeOnixSource`;
3. `planOnixSource` and every reduction;
4. `resolveOnixTargets` / `resolveOnixRelatedMaterialTargets`, then `XMLParser`, then `resolveOnixImportPlan`.

Only what lies outside the file is stood in for: Thoth is an empty publisher (`EMPTY_PUBLISHER`) whose identifier,
contributor and institution lookups find nothing, and the planning clock is the fixture's `asOf`. Nothing is
executed and nothing is written. The harness owns no semantics. If `XMLParse.tsx` changes how it composes these
stages, `pipeline.ts` must change with it.

## What is asserted

Every comparison is exact and exhaustive: an entry the fixture does not state, or states and the run does not
produce, fails. Assertions bind to the contract's semantic fields: finding ids and classes, blocker and finding codes,
classifications, resolutions, answers, keys and planned values. **No assertion reads a message or other UI text**;
`harness.test.ts` checks that no ledger carries one.

The ledger never reclassifies anything. Each outcome carries the classification of the stage that emitted it:

| Outcome                  | Where the contract emits it                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `SOURCE_INVALID`         | Source gate verdict: a counting canonical finding of scope `VALIDITY`. Also planner blockers classified `SOURCE_INVALID`. |
| `SUPPORTED_LOSSLESS`     | A resolved manifestation decision                                                                                         |
| `SUPPORTED_NORMALIZED`   | A resolved manifestation decision, or a plan finding                                                                      |
| `SUPPORTED_WITH_WARNING` | A plan finding                                                                                                            |
| `TARGET_UNREPRESENTABLE` | A plan finding or blocker                                                                                                 |
| `TARGET_INPUT_REQUIRED`  | A plan finding or blocker; it disappears once the scenario's inputs answer it                                             |
| `UNKNOWN`                | A plan finding: fail-closed, for example a subject scheme version no pinned vocabulary covers                             |

The plan contracts also classify `SOURCE_CONFLICT`, `PREFLIGHT_GAP` and `EXECUTION_DEFERRED`. The ledger keeps them
too, and fixtures count them like any other outcome.

Source gate verdicts are derived only from the scopes of the findings that count: `PERMITTED`, `SOURCE_INVALID`,
`SOURCE_UNSUPPORTED`, `SOURCE_REFUSED_SECURITY`, or `NOT_PERMITTED`.

## Declaring a fixture

- **`id`**: a lowercase slug equal to the directory name.
- **`status`**: `CONTRACT` (the accepted contract is proven against this source) or `KNOWN_DEFECT` (the source
  exhibits a declared defect of another system).
- **`source`**:
  - `origin`: `SYNTHETIC`, `SANITIZED_PUBLISHER` or `THOTH_EXPORT`;
  - `provenance`: where the bytes came from and what was changed;
  - `sha256`: the hash of `source.xml`, so an edit to the source is always deliberate.
- **`gate`**: the verdict plus every finding and recovery.
- **`normalized`**: required when the gate permits planning.
- **`scenarios`**: at least one when the gate permits planning, none when it refuses. Each scenario holds:
  - the publisher's `inputs`, over `EMPTY_ONIX_PLAN_INPUTS`;
  - the complete planning expectation;
  - outcome counts for the whole run.
- **`refusedOutcomes`**: the outcome counts when the gate refuses.

### Adding a fixture

1. Keep the source small and focused on the semantic behaviour. A historical publisher file must be sanitised and
   minimised; the full unsanitised file is never committed (#188).
2. Write `expected.ts` from what the **accepted contract** says should happen. Review every entry against the owning
   contract. Never paste an observed ledger unreviewed: a fixture that encodes a defect as truth is worse than no
   fixture.
3. Register it in `fixtures/index.ts`, then run:
   `npx vitest run src/shared/parsers/XMLParser/__regression__`.

## Known defects

A defect of another system is never expected contract behaviour. The Thoth exporter defects thoth-pub/thoth#955
(`PageRun`/`NumberOfPages` outside `TextItem`) and thoth-pub/thoth#956 (`BiographicalNote` markup without
`textformat`) are examples. Declare such a source as `KNOWN_DEFECT`, list each defect in `defects` (`reference`,
`owner`, `summary`), and attribute every expected entry it causes with `defect: '<reference>'`.

`fixtureDeclarationViolations` enforces the following rules:

- A `CONTRACT` fixture declares no defect and attributes no entry.
- A `KNOWN_DEFECT` fixture:
  - declares at least one defect;
  - attributes every blocking entry;
  - uses every declared defect;
  - attributes entries only to declared defects.
- A `THOTH_EXPORT` source the gate refuses is never a `CONTRACT`. It must be a `KNOWN_DEFECT` with a `thoth`-owned
  defect, and it never counts as a passing round trip. When the exporter is fixed, add a fresh export as a new fixture
  rather than editing the old one.

An importer defect is never a fixture state. It is a failing test.

## Limits

- Only an empty target publisher is modelled. Existing-target NOOP/enrichment/conflict scenarios, preflight
  aggregation and execution accounting (#188 matrix) need their own stand-ins before fixtures can state them.
- The accessibility-contact comparison `XMLParse.tsx` makes against the active publisher's own contacts is not
  modelled: the empty publisher has none.
- Validation runs in Node, not in a browser Worker. The Worker's evaluators are required to produce the same findings
  in the same order.
