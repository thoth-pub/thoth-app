import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import type { SeriesId, SeriesType } from '@/src/entities/series/model/series.types';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';

export type ContributorSelection = {
  lastContribution: string;
  selected: boolean;
} & WorkContribution;

export type ContributorsForSelection = Record<WorkId, Record<string, ContributorSelection[]>>;

export type SeriesForUpdateItem = WorkEntity & {
  orderNumber: number;
};

/**
 * A series an import wants to create, holding only what the source file genuinely supplies.
 *
 * It has no `SeriesId` because it does not exist yet, and deliberately no placeholder id
 * either: nothing here can be mistaken for, or accidentally submitted as, a real backend
 * identifier. Thoth's optional series fields (ISSNs, URLs, description) are absent because no
 * ONIX Collection element maps onto them unambiguously; the service leaves them empty.
 */
export type ProposedSeries = {
  name: string;
  imprintId: string;
  type: SeriesType;
};

/**
 * Where a group of imported works should be attached. The discriminant is what keeps an
 * existing backend series and a not-yet-created one from being confused: only the `existing`
 * branch carries a `SeriesId`, so the type system prevents reading an id off a proposal.
 */
export type SeriesImportTarget =
  | { kind: 'existing'; seriesId: SeriesId }
  | { kind: 'proposed'; series: ProposedSeries };

export type SeriesImportGroup = {
  /**
   * Series name as supplied by the import, for preview and error messages. For a proposed
   * series this is the name it will be created with, so the preview cannot show one spelling
   * of a name and create another.
   */
  name: string;
  target: SeriesImportTarget;
  works: SeriesForUpdateItem[];
};

/**
 * The series side of a parsed bulk import, deduplicated and ordered by first appearance in
 * the source file. Groups are identified by position rather than by a synthetic key, so no
 * temporary identifier exists that could leak into an API call.
 */
export type SeriesImportPlan = SeriesImportGroup[];
