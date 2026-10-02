# ONIX contract regression harness

Test-only infrastructure for thoth-pub/thoth-app#236 (APP-IMPORT-ONIX-REG-01A), the framework slice of the ONIX
contract regression suite #188, extended to the source-validation boundary by thoth-app#248 (APP-IMPORT-ONIX-REG-01C)
and to the empty-target planning contract by thoth-app#249 (APP-IMPORT-ONIX-REG-01D). Nothing in this directory is
imported by application code.

A fixture is one ONIX source plus a typed statement of what the accepted importer contract does with it, stage by
stage:

```text
ONIX source (source.xml)
  -> canonical validation + source gate   (gate: verdict, stop, every finding, every recovery, provenance)
  -> normalised Reference source           (normalized: exact values at XPath locations)
  -> planning, per publisher scenario      (records, Products, Work groups, blockers, findings, planned Works,
                                            and the target ledger of every reduction and of the plan)
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
`SOURCE_UNSUPPORTED`, `SOURCE_REFUSED_SECURITY`, or `NOT_PERMITTED`. A SUPPORT or SECURITY stop is not a programme
outcome, so a fixture refused only for one states no outcome at all.

### The source gate ledger

Besides the verdict, the gate ledger projects what the Worker result already says about the source, and nothing else:

- **`stop`**: where the gate stopped before the later tiers (`stage` 1 or 2) and why, as the key of the validator's
  own `STOP_TEXT` entry (`unsupported`, `invalidDeclaration`, `dtd`, `bound`, `malformed`), never the text; `null`
  when every tier ran. A stop text with no `STOP_TEXT` entry fails the run.
- **findings**: every finding's semantic fields, plus `sourcePath` exactly when the finding names one (a Short
  source's own tags and positions), and `detail` exactly when a stage-1 or stage-2 finding (tier `RELEASE_FLAVOUR` or
  `PROLOG`) carries its structured evidence: the lexical root summary and reason of a release/flavour stop, or the
  DOCTYPE the prolog scan read. Later tiers' details carry parser and rule text and are never projected.
- **`provenance`**: the normalised source's provenance sidecar as the Worker posts it (`IDENTITY` or `REPOSITIONED`
  for Reference input, `RENAMED` with every name and exception for Short input), field by field; `null` when the gate
  stopped and so normalised nothing.

`normalized` XPaths read the serialised normalised source with `onix:` bound to the Reference namespace of the
source's release. A Short source is normalised into that namespace, so its fixture reads the same paths as a Reference
one, and a Short source that was not normalised would select nothing.

### Short-to-Reference equivalence

A Short fixture may be the Short-tag twin of a registered Reference fixture: the same bytes with every element named
by its Short tag under the tag map derived from the pinned ordinary schemas. Its `expected.ts` reuses the twin's
`normalized` and `scenarios` as they are, and `harness.test.ts` proves, for each registered twin pair, that both gates
hand on the same canonical message byte for byte and find and recover exactly the same, the Short twin adding only
the source path of each finding.

### The target ledger

`planning.target` projects what every reduction and the resolver decided for the target, from the resolver's sidecar,
the source plan, the descriptive reduction and the executable plan. It has twelve sections, always in this order:

| Section            | What it states                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `findings`         | every plan finding's family, code, deterministic key and source paths - the key is what an answer is bound to                |
| `identity`         | header compatibility, each Work group's grouping edges and target evidence, each Product's records and evidence              |
| `descriptive`      | per Work group: subjects and primary-subject choices, Series memberships, lifecycle, cover                                   |
| `commercial`       | per Product: supplies, prices and their decisions, Location carriers and planned Locations                                   |
| `priceResolutions` | each price decision as the plan resolved it                                                                                  |
| `rights`           | per Product: licence expressions, licence, protection, usage constraints; per Work: licence and its action                   |
| `accessibility`    | per Product: every ProductFormFeature and the candidates; ProductContacts by role; each Publication's action                 |
| `components`       | every ContentItem intent: chapter, contained Work, AV item or unsupported text item, and its action                          |
| `relatedMaterial`  | every RelatedWork/RelatedProduct declaration's outcome, the reconciled edges, References and their actions                   |
| `collateral`       | every TextContent and SupportingResource by role, AdditionalResource candidates, each target's action                        |
| `reviewsPrizes`    | CitedContent and Prize facts, review/endorsement/prize candidates with their ordering, each target's action                  |
| `plan`             | what the executable plan writes beyond `works` and `chapters`: Work fields, Publications, contained Works, Series, relations |

It carries semantic values only: codes, classifications, keys, paths, identifiers and planned values. It never carries
a message, an option label, a prose loss, or an id the run mints (planned Work and chapter ids); a Work the plan names
is referred to by its plan list and position. Where the plan writes an entity's empty value (`''`), the ledger keeps
it as written.

A scenario that states `target` is compared with it exactly and whole; one that does not, compares none. The fixtures
registered before thoth-app#249 do not state it; every other registered fixture states it in every scenario, and
`harness.test.ts` enforces both. Its self-tests also prove the comparison fails on a missing, an extra or an altered
entry of every section, and that every list the ledger projects carries data in some registered fixture, except:

- `plan.works[].additionalResources`, `bookReviews`, `endorsements` and `awards`: each is its own CREATE action of the
  Work's execution unit (#187), so a planned Work never carries one;
- `reviewsPrizes.candidates[].prizes[].sequenceNumbers`: the one P.17 Prize is unnumbered, to prove its source-order
  normalisation;
- `rights.products[].deferredRights`: no fixture states a rights element for a part of a Product.

The `target-*` fixtures are the empty-target matrix: product forms, forthcoming Products, supply and prices, subjects,
Series, components, RelatedMaterial, collateral, licences, accessibility and reviews. Each `expected.ts` is derived from
the approved contract it names. Only opaque identities - fingerprinted finding keys - are read from a run; every
semantic value is the contract's. Two families cannot reach an executable plan by contract (an in-file Series
collision and a RelatedMaterial inverse contradiction are never answerable), so a planned Series membership is proven
in `target-subject-matrix`, and a planned Work relation and Reference in `target-licence-usage-protection`.

## Declaring a fixture

- **`id`**: a lowercase slug equal to the directory name.
- **`status`**: `CONTRACT` (the accepted contract is proven against this source) or `KNOWN_DEFECT` (the source
  exhibits a declared defect of another system).
- **`source`**:
  - `origin`: `SYNTHETIC`, `SANITIZED_PUBLISHER` or `THOTH_EXPORT`;
  - `provenance`: where the bytes came from and what was changed;
  - `sha256`: the hash of `source.xml`, so an edit to the source is always deliberate.
- **`gate`**: the verdict plus every finding and recovery, and:
  - `stop`, wherever the gate stops; absent means every tier runs;
  - `provenance`, required for a Short source and `null` for a stopped gate. The fixtures registered before
    thoth-app#248 do not state it; `harness.test.ts` pins theirs, and every other registered fixture must state it.
- **`normalized`**: required when the gate permits planning.
- **`scenarios`**: at least one when the gate permits planning, none when it refuses. Each scenario holds:
  - the publisher's `inputs`, over `EMPTY_ONIX_PLAN_INPUTS`;
  - the complete planning expectation, including its `target` ledger for every fixture registered from thoth-app#249;
  - outcome counts for the whole run.
- **`refusedOutcomes`**: the outcome counts when the gate refuses.

### Adding a fixture

1. Keep the source small and focused on the semantic behaviour. A historical publisher file must be sanitised and
   minimised; the full unsanitised file is never committed (#188). What no committed source should carry - a prolog
   beyond the 1 MiB scan bound, a variant of a fixture in another release - is derived in memory by the self-test.
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

It also keeps the stop and provenance statements consistent with the findings they rest on:

- A gate stating a `PROCESSING_STOP` finding states its `stop`, and a permitting gate states none.
- A Short source states its `provenance`, and a gate that stops states no provenance other than `null`.

An importer defect is never a fixture state. It is a failing test.

## Limits

- Only an empty target publisher is modelled. Existing-target NOOP/enrichment/conflict scenarios, preflight
  aggregation and execution accounting (#188 matrix; thoth-app#250) need their own stand-ins before fixtures can state
  them. The target ledger does not project the plan's execution units.
- No fixture claims a Thoth -> ONIX -> Thoth subject round trip: the Thoth subject exporter defects (thoth#892) are
  open, and that round trip is thoth-app#251's.
- The accessibility-contact comparison `XMLParse.tsx` makes against the active publisher's own contacts is not
  modelled: the empty publisher has none.
- Validation runs in Node, not in a browser Worker. The Worker's evaluators are required to produce the same findings
  in the same order. Browser evidence over the production Worker (thoth-app#248) is gathered with disposable material
  outside the repository; nothing here drives a browser.
