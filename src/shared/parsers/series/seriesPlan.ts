import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { SeriesType } from '../../constants/series';
import type { ImportIssueCode, ImportIssueSeverity, SeriesImportPlan, SeriesImportTarget } from '../../types';

/**
 * Format-neutral series planning, shared by the ONIX and CSV importers.
 *
 * Both formats answer the same three questions about a series — is this a series Thoth already
 * has, are several source records talking about the same series, and what issue ordinal does
 * each work get — and both have to answer them identically, because the answers decide what is
 * written to the database. Keeping the rules here means there is one implementation of them
 * rather than one per file format.
 *
 * What stays in the adapters is only what the source format genuinely supplies: how to find a
 * series name, which records are allowed to create a missing series and how bad it is when they
 * are not, what an explicit ordinal looks like, and how to phrase a diagnostic (ONIX messages
 * are English, CSV messages are translated).
 *
 * Everything here is pure. Planning never creates a series; it only decides what confirmation
 * would create.
 */

/**
 * Normalises a series name for identity comparison only — never for storage or display.
 *
 * Deliberately conservative: surrounding whitespace is trimmed, runs of internal whitespace
 * are collapsed, and case is folded. Punctuation is left alone, because stripping it would
 * merge genuinely distinct series (`Foundations` vs `Foundations II`, or two series whose
 * names differ only by a colon).
 */
export const normalizeSeriesName = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * The grouping key for a series within one import.
 *
 * Scoped by imprint: two imprints may each run a series of the same name, and they are not the
 * same series. Local to parsing — it never reaches the API or the plan.
 */
export const seriesIdentity = (imprintId: string, name: string): string => `${imprintId}::${normalizeSeriesName(name)}`;

/**
 * Whether a source record may create the series it names, when Thoth does not have it.
 *
 * CSV always may: a publisher typing a series name into their own upload is asking for that
 * series. ONIX may not always: a Collection that is not the publisher's own collection may
 * still name a real series, but is not a safe basis for creating one.
 *
 * A refusal is not automatically fatal. The adapter decides both how bad it is and how to say
 * it: whether the group simply cannot be represented (a warning, and the works import without
 * the series) or the import must stop (an error). The planner only decides that the group
 * produces no {@link SeriesImportGroup}, and only when *no* record in the group may create it —
 * see {@link buildSeriesPlan}.
 *
 * `reason` is given the whole group rather than one record, so a series several records share
 * yields one issue naming all of them instead of the same sentence once per record.
 */
export type SeriesCreationPolicy =
  | { allowed: true }
  | {
      allowed: false;
      severity: ImportIssueSeverity;
      code: ImportIssueCode;
      reason: (context: { name: string; sources: string }) => string;
    };

type SeriesCreationRefusal = Extract<SeriesCreationPolicy, { allowed: false }>;

/**
 * One source record's resolved series, before grouping. Holds everything the plan builder needs
 * to deduplicate, detect conflicts and report errors with source context, and deliberately no
 * series id of its own: `existingSeriesId` is set only when a real Thoth series was matched.
 */
export type SeriesCandidate = {
  /** Imprint-scoped grouping key. Local to parsing; never reaches the API or the plan. */
  identity: string;
  name: string;
  imprintId: string;
  existingSeriesId?: string;
  /** Set only when the source supplied a usable explicit ordinal. */
  ordinal?: number;
  /** ONIX product index or CSV row number, used to order errors deterministically. */
  sourceIndex: number;
  /** Human-readable handle for the record, e.g. `product 2 (9781641891783)` or `CSV row 4`. */
  sourceDescription: string;
  creation: SeriesCreationPolicy;
};

/**
 * A planning diagnostic, tagged with the source record it came from.
 *
 * Deliberately not an `ImportIssue`: the planner knows a source *index*, not whether that index
 * is a CSV row or an ONIX product, and it should not have to. The adapter that supplied the
 * index is the one that turns this into an `ImportIssue` with real source context.
 */
export type SeriesPlanIssue = {
  index: number;
  severity: ImportIssueSeverity;
  code: ImportIssueCode;
  message: string;
};

/**
 * The wording of every series-planning error, supplied by the adapter.
 *
 * The rules are shared but the phrasing is not: ONIX import errors are English strings built
 * from ONIX vocabulary, while CSV errors go through i18n and talk about rows.
 */
export type SeriesPlanMessages = {
  /**
   * The issue code the planner's own validation failures carry for this source format. Every
   * one of them blocks the import, so they need no severity of their own.
   */
  validationCode: ImportIssueCode;
  /** More than one existing Thoth series in the imprint answers to this name. */
  ambiguousMatch: (context: { name: string; count: number; source: string }) => string;
  /** Records grouped as one series matched different existing Thoth series. */
  conflictingMatches: (context: { name: string; sources: string }) => string;
  /** Two records in this import claim the same explicit ordinal. */
  duplicateOrdinal: (context: { name: string; ordinal: number; sources: string }) => string;
  /** An explicit ordinal is already taken by an issue the series has in Thoth. */
  ordinalAlreadyInThoth: (context: { name: string; ordinal: number; sources: string }) => string;
};

/** Names the records involved in a series-level conflict, capped so errors stay readable. */
export const describeSources = (candidates: { sourceDescription: string }[]): string => {
  const descriptions = [...new Set(candidates.map(({ sourceDescription }) => sourceDescription))];

  return descriptions.length > 3
    ? `${descriptions.slice(0, 3).join(', ')} and ${descriptions.length - 3} more`
    : descriptions.join(' and ');
};

export type ExistingSeriesMatch =
  | { status: 'found'; series: SeriesEntity }
  | { status: 'missing' }
  | { status: 'ambiguous'; count: number };

/**
 * Finds the Thoth series a source record refers to, within the work's own imprint.
 *
 * Matching is exact first, then on the normalised name, and it never leaves the imprint: a
 * series belonging to imprint A can never satisfy a record for imprint B, however identical the
 * names are.
 *
 * Thoth does not enforce uniqueness on series name or on (imprint, series name), so more than
 * one existing series really can match. That is reported rather than resolved by picking one,
 * which would make the outcome depend on the order the API returned them in.
 */
export const findExistingSeries = (
  serieses: SeriesEntity[],
  seriesName: string,
  imprintId: string,
): ExistingSeriesMatch => {
  const candidates = serieses.filter((series) => series.imprintId === imprintId);
  const exact = candidates.filter((series) => series.name === seriesName);

  if (exact.length === 1) return { status: 'found', series: exact[0] };
  if (exact.length > 1) return { status: 'ambiguous', count: exact.length };

  const normalizedName = normalizeSeriesName(seriesName);
  const normalized = candidates.filter((series) => normalizeSeriesName(series.name) === normalizedName);

  if (normalized.length === 1) return { status: 'found', series: normalized[0] };
  if (normalized.length > 1) return { status: 'ambiguous', count: normalized.length };

  return { status: 'missing' };
};

export type SeriesCandidateInput = {
  name: string;
  imprintId: string;
  ordinal?: number;
  sourceIndex: number;
  sourceDescription: string;
  creation: SeriesCreationPolicy;
};

/**
 * Turns one source record's series into a candidate, resolving it against the series Thoth
 * already has.
 *
 * Pure: it decides whether the record names an existing Thoth series or one the import would
 * have to create, but it writes nothing. Grouping, conflict detection and ordinal assignment
 * all happen later in {@link buildSeriesPlan}, once every record has been parsed, so none of it
 * depends on which record finished first.
 */
export const resolveSeriesCandidate = (
  input: SeriesCandidateInput,
  serieses: SeriesEntity[],
  messages: SeriesPlanMessages,
): { candidate: SeriesCandidate } | { issue: SeriesPlanIssue } => {
  const { name, imprintId, ordinal, sourceIndex, sourceDescription, creation } = input;
  const match = findExistingSeries(serieses, name, imprintId);

  if (match.status === 'ambiguous') {
    return {
      issue: {
        index: sourceIndex,
        severity: 'error',
        code: messages.validationCode,
        message: messages.ambiguousMatch({ name, count: match.count, source: sourceDescription }),
      },
    };
  }

  return {
    candidate: {
      identity: seriesIdentity(imprintId, name),
      name,
      imprintId,
      existingSeriesId: match.status === 'found' ? match.series.id : undefined,
      ordinal,
      sourceIndex,
      sourceDescription,
      creation,
    },
  };
};

export type SeriesPlanMember = { work: WorkEntity; candidate?: SeriesCandidate };

/**
 * Decides whether a group of candidates points at an existing series or proposes a new one,
 * reporting genuine ambiguity rather than picking whichever record happened to parse first.
 */
const resolveSeriesTarget = (
  candidates: SeriesCandidate[],
  messages: SeriesPlanMessages,
  issues: SeriesPlanIssue[],
): SeriesImportTarget | undefined => {
  const first = candidates[0];
  const matchedIds = [...new Set(candidates.map(({ existingSeriesId }) => existingSeriesId).filter((id) => !!id))];

  if (matchedIds.length > 1) {
    issues.push({
      index: first.sourceIndex,
      severity: 'error',
      code: messages.validationCode,
      message: messages.conflictingMatches({ name: first.name, sources: describeSources(candidates) }),
    });

    return undefined;
  }

  const [matchedId] = matchedIds;

  if (matchedId) return { kind: 'existing', seriesId: matchedId };

  // Authority to create belongs to the group, not to whichever record happens to come first.
  // A series is created once, so one record that may create this identity is enough for all of
  // them: the records that could not have authorised it are not creating a second series, they
  // are attaching to the one this import will create — exactly what they would have done had it
  // already existed, which is the case above.
  //
  // Only when no record in the group carries that authority is the group dropped, and then one
  // issue is raised for the whole group rather than one per record. It is tagged with the
  // earliest record involved, and the message names them all.
  const authorising = candidates.find(({ creation }) => creation.allowed);

  if (!authorising) {
    const [refusal] = candidates
      .map(({ creation }) => creation)
      .filter((creation): creation is SeriesCreationRefusal => !creation.allowed);

    issues.push({
      index: first.sourceIndex,
      severity: refusal.severity,
      code: refusal.code,
      message: refusal.reason({ name: first.name, sources: describeSources(candidates) }),
    });

    return undefined;
  }

  return {
    kind: 'proposed',
    // The series is created on the authorising record's say-so, so it is spelled the way that
    // record spells it. Identity is normalised, which means a group can hold several spellings
    // of one name; the one that gets stored should not be whichever record came first, since a
    // record that could not have authorised the creation has no business naming it. Where more
    // than one record could have, the earliest in source order wins, so the result does not
    // depend on parse completion order.
    //
    // Only the three fields an import genuinely supplies. Thoth's ISSNs, URLs and description
    // have no unambiguous equivalent in either source format, so they are left for the
    // publisher to fill in rather than fabricated here.
    series: { name: authorising.name, imprintId: authorising.imprintId, type: SeriesType.enum.BookSeries },
  };
};

/**
 * Reports publisher-supplied issue ordinals that Thoth could not store, without rewriting them:
 * `issue` has `UNIQUE (series_id, issue_ordinal)`, so a duplicate would only surface as a failed
 * CreateIssue partway through the import — after works, and possibly the series itself, had
 * already been created.
 *
 * Issues are tagged with the lowest source index involved, so a caller that sorts them by
 * source order gets deterministic output.
 */
const hasOrdinalCollision = (
  candidates: SeriesCandidate[],
  existingOrdinals: number[],
  messages: SeriesPlanMessages,
  issues: SeriesPlanIssue[],
): boolean => {
  const name = candidates[0].name;
  const byOrdinal = new Map<number, SeriesCandidate[]>();

  for (const candidate of candidates) {
    if (candidate.ordinal === undefined) continue;

    byOrdinal.set(candidate.ordinal, [...(byOrdinal.get(candidate.ordinal) ?? []), candidate]);
  }

  let collided = false;

  for (const ordinal of [...byOrdinal.keys()].sort((a, b) => a - b)) {
    const sources = byOrdinal.get(ordinal) ?? [];
    const lowestIndex = Math.min(...sources.map(({ sourceIndex }) => sourceIndex));

    if (sources.length > 1) {
      issues.push({
        index: lowestIndex,
        severity: 'error',
        code: messages.validationCode,
        message: messages.duplicateOrdinal({ name, ordinal, sources: describeSources(sources) }),
      });
      collided = true;
    }

    if (existingOrdinals.includes(ordinal)) {
      issues.push({
        index: lowestIndex,
        severity: 'error',
        code: messages.validationCode,
        message: messages.ordinalAlreadyInThoth({ name, ordinal, sources: describeSources(sources) }),
      });
      collided = true;
    }
  }

  return collided;
};

/**
 * Groups series candidates into the deduplicated plan the bulk import consumes, and assigns
 * every work its issue ordinal.
 *
 * Runs once, over members held in source order, so both the grouping and the ordinals are
 * independent of the order in which rows or products finished parsing.
 *
 * A group is one series, so it resolves once: to the existing Thoth series its records matched,
 * or — if any record in it may create the series — to a single proposal every record joins,
 * spelled the way the earliest record that could authorise it spells it. The group is dropped
 * only when nothing matched and no record could have created it.
 *
 * Ordinals behave identically for existing and newly proposed series; a proposed series simply
 * has no existing issues, so its numbering starts at 1.
 *
 * - An explicit ordinal supplied by the publisher is preserved verbatim, never silently
 *   rewritten; a collision is reported instead.
 * - Everything else is appended after the highest ordinal already known for the series, counting
 *   both its existing Thoth issues and every explicit ordinal in this import, so an ordinal
 *   appearing later in the file cannot collide with one already handed out. Unnumbered works are
 *   numbered upwards in source order.
 */
export const buildSeriesPlan = (
  members: SeriesPlanMember[],
  serieses: SeriesEntity[],
  messages: SeriesPlanMessages,
): { plan: SeriesImportPlan; issues: SeriesPlanIssue[] } => {
  const groups = new Map<string, { work: WorkEntity; candidate: SeriesCandidate }[]>();
  const issues: SeriesPlanIssue[] = [];

  for (const { work, candidate } of members) {
    if (!candidate) continue;

    const grouped = groups.get(candidate.identity) ?? [];

    grouped.push({ work, candidate });
    groups.set(candidate.identity, grouped);
  }

  const plan: SeriesImportPlan = [];

  for (const grouped of groups.values()) {
    const candidates = grouped.map(({ candidate }) => candidate);
    const target = resolveSeriesTarget(candidates, messages, issues);

    if (!target) continue;

    // A proposed series has no issues yet, so its numbering simply starts at 1.
    const existingOrdinals =
      target.kind === 'existing'
        ? (serieses.find((series) => series.id === target.seriesId)?.issues.map(({ ordinal }) => ordinal) ?? [])
        : [];

    if (hasOrdinalCollision(candidates, existingOrdinals, messages, issues)) continue;

    const explicitOrdinals = candidates.map(({ ordinal }) => ordinal).filter((ordinal) => ordinal !== undefined);

    let next = Math.max(0, ...existingOrdinals, ...explicitOrdinals) + 1;

    plan.push({
      // For a proposal, the name shown in the preview is the name the series will be created
      // with, so the user is never shown one spelling and given another. For an existing series
      // it stays the first spelling the source used, which is what the preview has always shown.
      name: target.kind === 'proposed' ? target.series.name : candidates[0].name,
      target,
      works: grouped.map(({ work, candidate }) => ({ ...work, orderNumber: candidate.ordinal ?? next++ })),
    });
  }

  return { plan, issues };
};
