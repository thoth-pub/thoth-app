import { GraphqlService } from '@/src/shared/api/graphqlService';
import type {
  ExistingWorkMatch,
  ExistingWorkMatchesByIdentifier,
  ImportIdentifier,
  OnixExistingReference,
  OnixExistingWorkRelation,
  OnixRelatedMaterialWorkMatch,
  TitleDto,
} from '@/src/shared/types';
import { importIdentifierKey, normaliseDoi, normaliseIsbn } from '@/src/shared/utils/importPreflight';
import { getDisplayTitle } from '@/src/shared/utils/work';

import { PublisherId } from '../../publisher/model/publisher.types';
import { TitleDtoMapper } from '../../title/model/title.mapper';
import {
  GET_PUBLICATIONS_BY_ISBN_FILTER,
  GET_PUBLICATIONS_BY_ISBN_GLOBALLY,
  GET_WORK_REFERENCES_FOR_PREFLIGHT,
  GET_WORK_RELATIONS_FOR_PREFLIGHT,
  GET_WORKS_BY_DOI_GLOBALLY,
  GET_WORKS_BY_IDENTIFIER_FILTER,
} from '../model/importPreflight.schema';
import type { WorkId } from '../model/work.types';

/** One page per request; the loop keeps asking until a short page says there are no more. */
const PAGE_SIZE = 100;

/**
 * How many identifiers are looked up at once.
 *
 * Enough to keep a fifty-work import from being fifty sequential round trips, small enough not to
 * open a connection per work. Results are collected by identifier, not by arrival, so this
 * changes only how long the preflight takes — never what it reports.
 */
const LOOKUP_CONCURRENCY = 4;

/** An existing Work as a global relation-endpoint lookup reads it (thoth-app#224). */
type GlobalWorkDto = {
  workId: string;
  doi?: string | null;
  imprintId: string;
  languages: { languageCode: string }[];
};

type ExistingWorkDto = {
  workId: string;
  doi?: string | null;
  imprintId: string;
  titles: TitleDto[];
  publications: { isbn?: string | null }[];
};

/**
 * Finds the works already in Thoth that carry a planned import's identifiers.
 *
 * Reads only. Nothing in here creates, updates or reserves anything, which is what makes running
 * it again after a failure safe.
 *
 * Its whole job is turning two inexact backend filters into exact answers. Neither
 * `works(filter:)` nor `publications(filter:)` is an equality lookup — both are substring
 * searches, and the works one also spans titles, abstracts, `reference` and `landing_page` — so
 * every returned record is compared field by field against the value that was asked for, using
 * the same normalisation the report uses. A record the backend volunteered but that does not
 * carry the exact identifier is dropped here and never becomes a finding.
 */
export class ImportPreflightService {
  private readonly graphqlService: GraphqlService;
  private readonly titleMapper: TitleDtoMapper;

  constructor(graphqlService: GraphqlService, titleMapper: TitleDtoMapper = new TitleDtoMapper()) {
    this.graphqlService = graphqlService;
    this.titleMapper = titleMapper;
  }

  /**
   * Existing works carrying each identifier, keyed by `importIdentifierKey`.
   *
   * Callers pass the distinct identifiers `collectImportIdentifiers` produced, so no value is
   * looked up twice however many works in the plan carry it. Blank values never reach here, and
   * an empty list makes no request at all.
   */
  async findExistingIdentifierMatches({
    publisherId,
    identifiers,
  }: {
    publisherId: PublisherId;
    identifiers: ImportIdentifier[];
  }): Promise<ExistingWorkMatchesByIdentifier> {
    const matches = new Map<string, ExistingWorkMatch[]>();

    if (identifiers.length === 0) return matches;

    for (let index = 0; index < identifiers.length; index += LOOKUP_CONCURRENCY) {
      const batch = identifiers.slice(index, index + LOOKUP_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (identifier) => ({
          identifier,
          works: await this.findWorksCarrying(publisherId, identifier),
        })),
      );

      results.forEach(({ identifier, works }) => matches.set(importIdentifierKey(identifier), works));
    }

    return matches;
  }

  private async findWorksCarrying(
    publisherId: PublisherId,
    identifier: ImportIdentifier,
  ): Promise<ExistingWorkMatch[]> {
    return identifier.basis === 'doi'
      ? this.findWorksByDoi(publisherId, identifier.value)
      : this.findWorksByIsbn(publisherId, identifier.value);
  }

  private async findWorksByDoi(publisherId: PublisherId, doi: string): Promise<ExistingWorkMatch[]> {
    const works = await this.paginate(async (limit, offset) => {
      const { works = [] } = await this.graphqlService.query(GET_WORKS_BY_IDENTIFIER_FILTER, {
        publishers: [publisherId],
        filter: doi,
        limit,
        offset,
      });

      return works as ExistingWorkDto[];
    });

    // The backend matched a substring, and across several fields at that. Only a work whose own
    // DOI normalises to the requested value is a signal.
    return works.filter((work) => normaliseDoi(work.doi ?? '') === doi).map((work) => this.toMatch(work));
  }

  private async findWorksByIsbn(publisherId: PublisherId, isbn: string): Promise<ExistingWorkMatch[]> {
    const publications = await this.paginate(async (limit, offset) => {
      const { publications = [] } = await this.graphqlService.query(GET_PUBLICATIONS_BY_ISBN_FILTER, {
        publishers: [publisherId],
        filter: isbn,
        limit,
        offset,
      });

      return publications as { isbn?: string | null; work: ExistingWorkDto }[];
    });

    return publications
      .filter((publication) => normaliseIsbn(publication.isbn ?? '') === isbn)
      .map((publication) => this.toMatch(publication.work));
  }

  /**
   * Existing Works in every publisher carrying each exact identifier, keyed by `importIdentifierKey` (thoth-app#224).
   *
   * Read-only discovery, never a write: an ONIX relation may name a Work of another publisher, and the import must tell that
   * apart from a Work that does not exist rather than read either as "nothing matched" (5541586341 rule 25). Each match
   * says which imprint it belongs to, so the plan decides the authorization boundary from Thoth's own answer; it never
   * becomes identity evidence for the Work groups of the plan, which stay scoped to the active publisher.
   */
  async findWorksGlobally(
    identifiers: readonly ImportIdentifier[],
  ): Promise<Map<string, OnixRelatedMaterialWorkMatch[]>> {
    const matches = new Map<string, OnixRelatedMaterialWorkMatch[]>();

    for (let index = 0; index < identifiers.length; index += LOOKUP_CONCURRENCY) {
      const batch = identifiers.slice(index, index + LOOKUP_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (identifier) => ({
          identifier,
          works:
            identifier.basis === 'doi'
              ? await this.findGlobalWorksByDoi(identifier.value)
              : await this.findGlobalWorksByIsbn(identifier.value),
        })),
      );

      results.forEach(({ identifier, works }) => matches.set(importIdentifierKey(identifier), works));
    }

    return matches;
  }

  /** Every relation one existing Work holds, chapter relations included, read whole (thoth-app#224). */
  async findWorkRelations(workId: WorkId): Promise<OnixExistingWorkRelation[]> {
    const relations = await this.paginate(async (limit, offset) => {
      const { work } = await this.graphqlService.query(GET_WORK_RELATIONS_FOR_PREFLIGHT, { workId, limit, offset });

      return work.relations;
    });

    return relations.map(({ relatedWorkId, relationType, relationOrdinal }) => ({
      relatedWorkId: relatedWorkId as string,
      relationType,
      relationOrdinal,
    }));
  }

  /** Every Reference one existing Work holds, read whole, with the fields an ONIX citation can map to (#224). */
  async findWorkReferences(workId: WorkId): Promise<OnixExistingReference[]> {
    const references = await this.paginate(async (limit, offset) => {
      const { work } = await this.graphqlService.query(GET_WORK_REFERENCES_FOR_PREFLIGHT, { workId, limit, offset });

      return work.references;
    });

    return references.map(({ referenceId, referenceOrdinal, doi, unstructuredCitation, isbn, issn }) => ({
      referenceId: referenceId as string,
      referenceOrdinal,
      doi: (doi as string | null | undefined) ?? null,
      unstructuredCitation: unstructuredCitation ?? null,
      isbn: (isbn as string | null | undefined) ?? null,
      issn: issn ?? null,
    }));
  }

  private async findGlobalWorksByDoi(doi: string): Promise<OnixRelatedMaterialWorkMatch[]> {
    const works = await this.paginate(async (limit, offset) => {
      const { works: page = [] } = await this.graphqlService.query(GET_WORKS_BY_DOI_GLOBALLY, {
        filter: doi,
        limit,
        offset,
      });

      return page as GlobalWorkDto[];
    });

    // A substring search across several fields: only a Work whose own DOI normalises to the value asked for matches.
    return works.filter((work) => normaliseDoi(work.doi ?? '') === doi).map((work) => this.toGlobalMatch(work));
  }

  private async findGlobalWorksByIsbn(isbn: string): Promise<OnixRelatedMaterialWorkMatch[]> {
    const publications = await this.paginate(async (limit, offset) => {
      const { publications: page = [] } = await this.graphqlService.query(GET_PUBLICATIONS_BY_ISBN_GLOBALLY, {
        filter: isbn,
        limit,
        offset,
      });

      return page as { isbn?: string | null; work: GlobalWorkDto }[];
    });
    const matches = new Map(
      publications
        .filter((publication) => normaliseIsbn(publication.isbn ?? '') === isbn)
        .map(({ work }) => [work.workId, this.toGlobalMatch(work)] as const),
    );

    return [...matches.values()];
  }

  private toGlobalMatch(work: GlobalWorkDto): OnixRelatedMaterialWorkMatch {
    return {
      workId: work.workId,
      imprintId: work.imprintId,
      languageCodes: [...new Set(work.languages.map(({ languageCode }) => languageCode))].sort(),
    };
  }

  /**
   * Reads pages until one comes back short.
   *
   * A filter is a substring search, so the number of records behind it is not knowable in
   * advance; stopping at the first page would silently drop matches that happened to sort later.
   */
  private async paginate<T>(fetchPage: (limit: number, offset: number) => Promise<T[]>): Promise<T[]> {
    const collected: T[] = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await fetchPage(PAGE_SIZE, offset);

      collected.push(...page);

      if (page.length < PAGE_SIZE) return collected;
    }
  }

  /**
   * A display summary, not a work.
   *
   * The ISBNs are the ones this existing work actually holds, shown so the user can see what the
   * two records have in common besides the one identifier that matched.
   */
  private toMatch(work: ExistingWorkDto): ExistingWorkMatch {
    const titles = work.titles.map((title) => this.titleMapper.toEntity(title));

    return {
      workId: work.workId,
      title: getDisplayTitle(titles).title,
      imprintId: work.imprintId,
      doi: work.doi ?? '',
      isbns: work.publications.map(({ isbn }) => isbn ?? '').filter((isbn) => isbn.length > 0),
    };
  }
}
