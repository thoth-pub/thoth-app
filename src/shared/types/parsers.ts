import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import type { SeriesId, SeriesType } from '@/src/entities/series/model/series.types';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';

import type { ImportIssue, ImportStatus } from './importIssues';
import type { ImportedMarkupFormat } from './markdown';
import type { OnixImportPlanSidecar, OnixParsePlanning, OnixWorkRelationType } from './onixPlanning';
import type { TitleEntity } from './titles';

export type ContributorSelection = {
  lastContribution: string;
  selected: boolean;
} & WorkContribution;

export type ContributorsForSelection = Record<WorkId, Record<string, ContributorSelection[]>>;

/**
 * A title row an import planned (thoth-app#183): its full title and markup format are decisions the plan took from
 * what the source declared, so they reach the mutation as planned - never recompiled from the title and subtitle,
 * never rediscovered from angle brackets. A title typed in the editor carries neither and keeps both behaviours.
 */
export type PlannedTitleEntity = TitleEntity & {
  readonly sourceMarkupFormat: ImportedMarkupFormat;
};

/**
 * A series an import wants to create, holding only what the source file genuinely supplies.
 *
 * It has no `SeriesId` because it does not exist yet, and deliberately no placeholder id
 * either: nothing here can be mistaken for, or accidentally submitted as, a real backend
 * identifier. Thoth's optional URLs and description are absent because no import source maps onto
 * them unambiguously, and the service leaves them empty. An ONIX Collection ISSN does not say which
 * form it belongs to, so it is present only once the publisher has assigned it.
 */
export type ProposedSeries = {
  name: string;
  imprintId: string;
  type: SeriesType;
  /** ONIX only: an ISSN the publisher assigned to the print or digital form (thoth-app#183). */
  issnPrint?: string;
  issnDigital?: string;
};

/**
 * Where a group of imported works should be attached. The discriminant is what keeps an
 * existing backend series and a not-yet-created one from being confused: only the `existing`
 * branch carries a `SeriesId`, so the type system prevents reading an id off a proposal.
 */
export type SeriesImportTarget =
  | { kind: 'existing'; seriesId: SeriesId }
  | { kind: 'proposed'; series: ProposedSeries };

/**
 * One work's membership of a planned series: which work, and which issue ordinal it takes.
 *
 * A reference rather than a copy. The work itself lives once, in {@link ImportPlan.works}, so
 * there is no second version of it to fall out of date — which is exactly what happened when
 * contributor resolution rewrote a work and the series plan kept the version it was given at
 * parse time.
 */
export type SeriesImportMember = {
  workId: WorkId;
  orderNumber: number;
  /** ONIX only: the issue number the source states for the Work in the Series, when it states one (thoth-app#183). */
  issueNumber?: number | null;
};

export type SeriesImportGroup = {
  /**
   * Series name as supplied by the import, for preview and error messages. For a proposed
   * series this is the name it will be created with, so the preview cannot show one spelling
   * of a name and create another.
   */
  name: string;
  target: SeriesImportTarget;
  members: SeriesImportMember[];
};

/**
 * The series side of a parsed bulk import, deduplicated and ordered by first appearance in
 * the source file. Groups are identified by position rather than by a synthetic key, so no
 * temporary identifier exists that could leak into an API call.
 */
export type SeriesImportPlan = SeriesImportGroup[];

/**
 * One end of a planned Work relation: a Work the plan creates, by its id in {@link ImportPlan.works}, or an exact existing
 * Thoth Work, by its Thoth id. A reference, never a copy: the Work itself lives once, in `works`, or in Thoth.
 */
export type ImportRelationEndpoint =
  | { readonly kind: 'PLANNED_WORK'; readonly workId: WorkId }
  | { readonly kind: 'EXISTING_WORK'; readonly workId: WorkId };

/**
 * One reconciled, non-chapter Work relation of a plan (thoth-app#224): one semantic edge, which the backend creates with its
 * inverse, never both directions. Chapter relations are not here: a chapter is its `relationId` in `chapters`.
 *
 * `SATISFIED` is an exact edge Thoth already holds, which creates nothing. A `PLANNED` edge is one the import would create;
 * the current executor creates no ordinary Work relation (that stage is thoth-app#187's), so a plan holding one is never
 * executable yet - the edge is kept here, whole, for the stage that will create it without reading the source again.
 */
export type ImportRelationEdge = {
  readonly key: string;
  readonly relator: ImportRelationEndpoint;
  readonly related: ImportRelationEndpoint;
  readonly relationType: OnixWorkRelationType;
  /**
   * Its ordinal among the relator's relations of its type: the existing one, or its source appearance within the type
   * (after those the relator already holds). Null only for a satisfied edge whose relator's own copy was not read back.
   */
  readonly relationOrdinal: number | null;
  readonly status: 'PLANNED' | 'SATISFIED';
};

/**
 * Everything a confirmed bulk import will create, and nothing else.
 *
 * One format-neutral value, produced by the CSV and ONIX adapters alike and carried from the
 * parser to the mutation as a single value rather than a set of parallel arrays that each stage
 * takes apart and puts back together.
 *
 * Exactly one stage refines it: `ContributorsSelection` applies the user's contributor choices
 * to `works` and `chapters`, preserving work ids, source order, which entries are works and
 * which are chapters, the series groups and their ordinals. From that resolved plan onwards —
 * `UploadModal` -> `PreviewStep` -> `useBulkCreateWorks` -> `WorkService.bulkCreateWorks` —
 * nothing alters it. That is the point: the works the user confirms in the preview are the
 * works that get created.
 *
 * It holds creation intent only. Diagnostics live beside it, not in it — an `ImportIssue`
 * describes the *source file*, and a plan that carried its own warnings would invite sending
 * them to the API or losing them on the way to the preview. Contributor alternatives are
 * likewise parse-time resolution data: they are how the user decides what the plan should say,
 * not part of what it says.
 *
 * `works` and `chapters` are in source-file order, and stay that way through every stage.
 */
export type ImportPlan = {
  works: WorkEntity[];
  chapters: WorkEntity[];
  series: SeriesImportPlan;
  /**
   * ONIX only: the identity, Work and manifestation planning state behind `works` (thoth-app#182).
   *
   * Optional, so a CSV plan is exactly what it always was. On an ONIX plan it is the whole truth `works`
   * is the executable subset of - every source record, Product and Work group, the action each resolved
   * to, including actions deliberately not executable yet, and the publisher decisions applied - and it
   * rides through contributor selection untouched, because that refinement spreads the plan.
   */
  onix?: OnixImportPlanSidecar;
  /**
   * The normalised non-chapter Work relation graph (thoth-app#224): every reconciled edge between Works of this plan and
   * exact existing Works, by stable id. Optional, so a CSV plan is exactly what it always was; like `series` it names Works
   * rather than copying them, so contributor selection - which spreads the plan - carries it through untouched.
   */
  relations?: readonly ImportRelationEdge[];
};

/**
 * What a parse produced: the import it would run, and the contributor choices the user still
 * has to make before running it.
 *
 * An ONIX parse also hands on its planning state. Its `plan` is then a candidate - one Work per
 * adaptable group, WorkType and manifestation decisions still open - and only the plan the ONIX
 * resolver derives from it with the publisher's decisions is ever offered for preview.
 */
export type ImportParseData = {
  plan: ImportPlan;
  contributorsForSelection: ContributorsForSelection;
  onix?: OnixParsePlanning;
};

/**
 * The single result type both importers return.
 *
 * `status` is derived from the issues rather than tracked alongside them: it is `failed` exactly
 * when some issue is an error. A file that produces only warnings parses successfully, and its
 * plan is the plan the import will run. A failed parse carries an empty plan — there is no
 * partially executable import.
 */
export type ImportParseResult = {
  status: ImportStatus;
  data: ImportParseData;
  issues: ImportIssue[];
};
