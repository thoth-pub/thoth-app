import {
  LanguageRole,
  MeasureType,
  MeasureUnit,
  ProductIdentifierType,
  ProductRelation,
  TextItemIdentifierType,
  TextType,
} from '@5stones/onix/dist/enums';
import { v4 as uuidv4 } from 'uuid';

import { CurrencyCode, MarkupFormat } from '@/gql/graphql';
import { ContributorService } from '@/src/entities/contributor';
import type { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import { InstitutionService } from '@/src/entities/institution';
import type { InstitutionEntity } from '@/src/entities/institution/model/institution.types';
import { PriceEntity } from '@/src/entities/price/model/price.types';
import { PublicationType } from '@/src/entities/publication/model/publication.types';
import { ReferenceEntity } from '@/src/entities/reference/model/reference.types';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';

import { appConfig } from '../../config';
import { getDefaultContribution, LanguageTypeAlt, LocationPlatforms } from '../../constants';
import { AbstractTypes } from '../../constants/abstracts';
import { FormFieldOption } from '../../interfaces';
import type {
  AbstractEntity,
  ContributorsForSelection,
  ImportedMarkupFormat,
  ImportIssue,
  ImportIssueSource,
  ImportParseResult,
  LocaleCodeType,
  OnixAdaptedGroup,
  OnixAdaptedPublication,
  OnixDescriptiveLookups,
  OnixInstitutionMatch,
  OnixMatchedContributor,
  OnixProductNode,
  OnixSourcePlan,
  OnixWorkGroup,
} from '../../types';
import {
  getDefaultAbstract,
  getDefaultChapter,
  getDefaultPublication,
  getDefaultWork,
  isFullTextUrlAvailable,
  localeFromLanguageCode,
} from '../../utils';
import { createEmptyImportPlan } from '../../utils/importPlan';
import { ImportLookupCoordinator } from '../importLookupCoordinator';
import { importStatus, sortIssues } from '../issues/importIssues';
import { normaliseImportedAbstractHtml } from './importedAbstractHtml';
import { normaliseImportedPlainText } from './importedPlainText';
import {
  ExtendedCollection,
  ExtendedONIXMessageRoot,
  ExtendedProduct,
  OnixRelatedIdentifier,
  OnixRelatedProduct,
  OnixText,
} from './interfaces';
import {
  getOnixLanguage,
  getOnixText,
  getOnixTextFormat,
  type OnixDoiSelection,
  resolveOnixTextMarkup,
  selectCanonicalDoi,
  selectRelatedIdentifier,
  toOnixArray,
} from './onix';
import {
  descriptiveLookupRequests,
  type OnixDescriptiveLookupRequests,
  type OnixDescriptivePlan,
  reduceOnixDescriptive,
} from './onixDescriptive';
import { planOnixSource } from './onixPlanning';

export const ONIX_PROCESSING_FAILURE_MESSAGE =
  'Thoth could not finish processing this ONIX file because an unexpected error occurred. The file itself may still be valid, and nothing has been created from this upload. Please try again; if the problem continues, report it to Thoth.';

/**
 * The `IDTypeName` Thoth's ONIX exporter gives the proprietary identifier that holds a reference's
 * unstructured citation. Compared lower-cased, so a sender's capitalisation does not matter.
 */
const UNSTRUCTURED_CITATION_NAME = 'unstructured citation';

/** What {@link XMLParser.parseWork} produces for one ONIX product. */
type ParsedProduct = {
  /** The candidate Work, carrying only what no descriptive reduction decides. */
  work: WorkEntity;
  /** The chapter Works of the Product's chapter ContentItems, by ContentItem path. */
  chapters: { path: string; chapter: WorkEntity }[];
  /** A Publication for every PublicationType the Product's manifestation could still become. */
  publications: Partial<Record<PublicationType, OnixAdaptedPublication>>;
};

export type XMLParserOptions = {
  /** The deterministic ONIX source plan to adapt. Planned from the message itself when absent. */
  readonly sourcePlan?: OnixSourcePlan;
  /**
   * The canonical descriptive reductions of the same message (thoth-app#183). Reduced from the message itself
   * when absent: the adapter never reads a descriptive family any other way.
   */
  readonly descriptive?: OnixDescriptivePlan;
  /**
   * The Work groups to build candidate Works for. When absent, every group whose own source is not in
   * conflict; the ONIX resolver narrows it to the groups exact target evidence leaves new.
   */
  readonly adaptGroupKeys?: readonly string[];
};

/**
 * The grouped Work facts two manifestations of one Work must agree on before either can stand for the Work.
 *
 * Only what no approved reducer reconciles: the descriptive families (titles, contributors, languages, subjects,
 * Series, lifecycle, copyright, funding, landing page, place, extent and ancillary counts) are reduced for the
 * group as a whole by the canonical descriptive reducers, which decide what a disagreement becomes. Everything
 * else a candidate Work carries, except what is decided for the group (id, WorkType, edition and the Work
 * identifiers) or belongs to a single manifestation (its Publications), must still agree exactly.
 */
const GROUPED_WORK_FACTS = [
  'abstracts',
  'imprintId',
  'license',
  'generalNote',
  'references',
] as const satisfies readonly (keyof WorkEntity)[];

/** The parts of a reduction that name where a fact came from, rather than what it is. */
const SOURCE_HANDLES = new Set([
  'key',
  'findingKey',
  'path',
  'provenance',
  'locations',
  'findingKeys',
  'issueFindingKeys',
  'valueFindingKey',
  'choiceFindingKey',
  'canonicalFindingKey',
  'nameFindingKey',
  'biographyCanonicalFindingKey',
]);

const SOURCE_CONFLICT_CLASSIFICATIONS = new Set(['SOURCE_CONFLICT', 'SOURCE_INVALID']);

/**
 * Serialises with object keys sorted, so equal facts compare equal whatever order they were built in. Keys in
 * `omit` are left out at every depth.
 */
const canonicalJson = (value: unknown, omit: ReadonlySet<string> = new Set()): string => {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, omit)).join(',')}]`;

  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((key) => !omit.has(key))
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key], omit)}`)
      .join(',')}}`;
  }

  return value === undefined ? 'null' : JSON.stringify(value);
};

const toMatchedContributor = (contributor: ContributorEntity): OnixMatchedContributor => ({
  contributorId: contributor.id,
  fullName: contributor.fullName,
  lastName: contributor.lastName,
  firstName: contributor.firstName ?? '',
  orcid: contributor.orcid ?? '',
  website: contributor.website ?? '',
  lastContributionTitle: contributor.lastContributionTitle ?? '',
});

const toInstitutionMatch = (institution: InstitutionEntity | null): OnixInstitutionMatch =>
  institution === null
    ? { kind: 'NOT_FOUND' }
    : { kind: 'FOUND', institutionId: institution.id, name: institution.name, ror: institution.ror };

class XMLParser {
  private xml: ExtendedONIXMessageRoot;
  /**
   * Issues carry the product they came from because products are parsed concurrently: without
   * it the order shown in the UI would depend on which product happened to finish first.
   */
  private issues: ImportIssue[] = [];
  private parsedWorks: WorkEntity[] = [];
  private parsedChapters: WorkEntity[] = [];
  private contributorsForSelection: ContributorsForSelection = {};
  private imprints: FormFieldOption[] = [];
  private licenses: FormFieldOption[] = [];
  private currencyOptions: FormFieldOption[] = [];
  private defaultId: string = appConfig.defaultId;
  private readonly lookupCoordinator: ImportLookupCoordinator;
  private readonly options: XMLParserOptions;

  /**
   * `_serieses` and `_languages` are no longer read here: Series membership and languages are reduced by the
   * canonical descriptive reducers and matched against Thoth by the ONIX resolver (thoth-app#183). The
   * parameters stay so every existing caller constructs the adapter exactly as before.
   */
  constructor(
    xml: ExtendedONIXMessageRoot,
    imprints: FormFieldOption[],
    licenses: FormFieldOption[],
    _serieses: SeriesEntity[],
    contributorService: ContributorService,
    institutionService: InstitutionService,
    _languages: FormFieldOption[],
    currencyOptions: FormFieldOption[],
    options: XMLParserOptions = {},
  ) {
    this.xml = xml;
    this.imprints = imprints;
    this.licenses = licenses;
    this.currencyOptions = currencyOptions;
    this.options = options;
    this.lookupCoordinator = new ImportLookupCoordinator(contributorService, institutionService);
  }

  /**
   * Adapts the Products of an ONIX message into a candidate plan for the ONIX resolver.
   *
   * The deterministic identity plan decides which records are complete Product records, which Products
   * manifest one Work, what each manifestation and each Work's edition can be; the canonical descriptive
   * reductions decide every descriptive family. This builds, for every Work group it is asked to adapt, one
   * candidate Work from its Products - only when every grouped Product states the same remaining Work-level
   * facts - plus a Publication for each PublicationType each manifestation could still become, and asks Thoth
   * exactly what the descriptive reductions need to know: which contributors, institutions and funders their
   * declared identities name. It decides nothing about WorkType or description: a candidate's type is a
   * placeholder the resolver always replaces, its descriptive fields are the resolver's to fill, and a
   * candidate plan is never itself a plan to run.
   */
  async parse(): Promise<ImportParseResult> {
    try {
      const products = this.convertToArray(this.xml.ONIXMessage.Product).filter(
        (product) => !!product && typeof product === 'object',
      );

      if (products.length === 0) {
        return {
          status: 'failed',
          data: this.emptyData(),
          issues: [
            {
              severity: 'error',
              code: 'onix.no_products',
              message: 'No products found in XML file',
              source: { kind: 'file' },
            },
          ],
        };
      }

      const sourcePlan = this.options.sourcePlan ?? planOnixSource(this.xml);
      const descriptive = this.options.descriptive ?? reduceOnixDescriptive(this.xml, sourcePlan);
      const adaptable = new Set(this.options.adaptGroupKeys ?? this.groupsWithoutSourceConflict(sourcePlan));
      const recordIndexByKey = new Map(sourcePlan.records.map(({ recordKey, index }) => [recordKey, index]));
      const adaptedGroups = sourcePlan.groups.filter(({ groupKey }) => adaptable.has(groupKey));

      // Every Product of every adapted group, read from its representative record, in file order.
      const members = adaptedGroups
        .flatMap((group) =>
          sourcePlan.products
            .filter(({ groupKey }) => groupKey === group.groupKey)
            .map((node) => ({ group, node, index: recordIndexByKey.get(node.representativeRecordKey) as number })),
        )
        .sort((a, b) => a.index - b.index);

      const requests = new Map(
        adaptedGroups.map(({ groupKey }) => [groupKey, descriptiveLookupRequests(descriptive, groupKey)]),
      );

      await this.lookupCoordinator.prefetchContributorsByOrcids(
        [...requests.values()].flatMap(({ contributors }) => contributors.map(({ orcid }) => orcid)),
      );

      // Collected in member order, so works and chapters stay in ONIX product order.
      const parsedProducts = members.map(({ group, node, index }) =>
        this.parseWork(products[index - 1], index, node, group),
      );

      const adaptation: OnixAdaptedGroup[] = [];

      for (const group of adaptedGroups) {
        const grouped = members
          .map((member, position) => ({ ...member, parsed: parsedProducts[position] }))
          .filter((member) => member.group.groupKey === group.groupKey);

        if (grouped.length === 0) continue;

        const [representative] = grouped;
        const conflictingFields = this.conflictingWorkFacts(
          grouped.map(({ node, parsed }) => ({ parsed, productKey: node.productKey })),
          descriptive,
        );
        const groupRequests = requests.get(group.groupKey) as OnixDescriptiveLookupRequests;
        const chapterWorkIds = Object.fromEntries(
          representative.parsed.chapters.map(({ path, chapter }) => [path, chapter.id]),
        );
        const lookups = await this.lookupDescriptive(groupRequests, chapterWorkIds);

        adaptation.push({
          groupKey: group.groupKey,
          workId: representative.parsed.work.id,
          conflictingFields,
          publications: Object.fromEntries(grouped.map(({ node, parsed }) => [node.productKey, parsed.publications])),
          descriptive: lookups,
        });

        if (conflictingFields.length > 0) continue;

        const work: WorkEntity = {
          ...representative.parsed.work,
          publications: grouped.flatMap(({ node, parsed }) => {
            const resolved =
              node.manifestation.kind === 'RESOLVED' ? parsed.publications[node.manifestation.type] : undefined;

            return resolved === undefined ? [] : [resolved.publication];
          }),
        };

        this.parsedWorks.push(work);
        this.parsedChapters.push(...representative.parsed.chapters.map(({ chapter }) => chapter));
        this.offerContributorAlternatives(groupRequests, lookups, work.id, chapterWorkIds);
      }

      const sortedIssues = sortIssues(this.issues);

      if (importStatus(sortedIssues) === 'failed') {
        return { status: 'failed', data: this.emptyData(), issues: sortedIssues };
      }

      // Warnings do not withhold a plan: the works a warning describes are imported, minus
      // whatever the warning says will not be represented.
      return {
        status: 'success',
        data: {
          plan: { works: this.parsedWorks, chapters: this.parsedChapters, series: [] },
          contributorsForSelection: this.contributorsForSelection,
          onix: { sourcePlan, groups: adaptation },
        },
        issues: sortedIssues,
      };
    } catch (error) {
      console.error('Unexpected error while processing ONIX bulk import', error);

      return {
        status: 'failed',
        data: this.emptyData(),
        issues: [
          {
            severity: 'error',
            code: 'onix.processing_failed',
            message: ONIX_PROCESSING_FAILURE_MESSAGE,
            source: { kind: 'file' },
          },
        ],
      };
    }
  }

  /** A failed parse creates nothing, so it carries a plan that would create nothing. */
  private emptyData() {
    return { plan: createEmptyImportPlan(), contributorsForSelection: {} };
  }

  /** Groups whose own records, Products and Work identity are not in conflict: the default set to adapt. */
  private groupsWithoutSourceConflict(sourcePlan: OnixSourcePlan): string[] {
    return sourcePlan.groups
      .filter(({ groupKey, productKeys }) =>
        sourcePlan.blockers.every(
          (blocker) =>
            !SOURCE_CONFLICT_CLASSIFICATIONS.has(blocker.classification) ||
            (blocker.groupKey !== groupKey && !productKeys.includes(blocker.productKey ?? '')),
        ),
      )
      .map(({ groupKey }) => groupKey);
  }

  /**
   * The grouped Work facts on which Products of one group disagree.
   *
   * Compared after adaptation, as the Work would receive them, so two spellings the adapter already reads
   * the same way agree. Chapters are compared by what they are - their own facts without generated ids,
   * and their descriptive reductions without the source handles that only name which Product stated them -
   * because only the representative Product's chapters are planned.
   */
  private conflictingWorkFacts(
    grouped: { parsed: ParsedProduct; productKey: string }[],
    descriptive: OnixDescriptivePlan,
  ): string[] {
    if (grouped.length < 2) return [];

    const facts = grouped.map(({ parsed: { work, chapters }, productKey }) => ({
      ...Object.fromEntries(GROUPED_WORK_FACTS.map((field) => [field, canonicalJson(work[field])])),
      chapters: canonicalJson(chapters.map(({ chapter: { id: _id, relationId: _relationId, ...chapter } }) => chapter)),
      chapterDescriptions: canonicalJson(
        Object.values(descriptive.products[productKey]?.contentItems ?? {}),
        SOURCE_HANDLES,
      ),
    })) as Record<string, string>[];

    return Object.keys(facts[0]).filter((field) => new Set(facts.map((fact) => fact[field])).size > 1);
  }

  private convertToArray<T>(data: T | T[]): T[] {
    return toOnixArray(data);
  }

  /**
   * What Thoth holds for one Work group's descriptive intents, by exact identity only: the contributor an
   * ORCID names (and, for anyone else, the contributors sharing their name, offered only as alternatives),
   * the Institution a ROR names, and the Institution a funder's ROR or FundRef DOI names. A lookup never
   * decides a value; the resolver builds the Work from these answers.
   */
  private async lookupDescriptive(
    requests: OnixDescriptiveLookupRequests,
    chapterWorkIds: Record<string, WorkId>,
  ): Promise<OnixDescriptiveLookups> {
    const [contributors, institutions, funders] = await Promise.all([
      Promise.all(
        requests.contributors.map(async ({ key, orcid, fullName }) => {
          const orcidMatch = await this.lookupCoordinator.findContributorByOrcid(orcid);
          const alternatives =
            orcidMatch !== null || fullName.length === 0 ? [] : await this.lookupCoordinator.findContributors(fullName);

          return [
            key,
            {
              orcidMatch: orcidMatch === null ? null : toMatchedContributor(orcidMatch),
              alternatives: alternatives.map(toMatchedContributor),
            },
          ] as const;
        }),
      ),
      Promise.all(
        requests.rors.map(
          async (ror) => [ror, toInstitutionMatch(await this.lookupCoordinator.findInstitutionByRor(ror))] as const,
        ),
      ),
      Promise.all(
        requests.funders.map(async ({ key, ror, fundrefDoi }) => {
          const [byRor, byDoi] = await Promise.all([
            ror === null ? null : this.lookupCoordinator.findInstitutionByRor(ror),
            fundrefDoi === null ? null : this.lookupCoordinator.findInstitutionByDoi(fundrefDoi),
          ]);

          if (byRor !== null && byDoi !== null && byRor.id !== byDoi.id) {
            return [key, { kind: 'CONFLICT', institutionIds: [byRor.id, byDoi.id] } as OnixInstitutionMatch] as const;
          }

          return [key, toInstitutionMatch(byRor ?? byDoi)] as const;
        }),
      ),
    ]);

    return {
      contributors: Object.fromEntries(contributors),
      institutions: Object.fromEntries(institutions),
      funders: Object.fromEntries(funders),
      chapterWorkIds,
    };
  }

  /**
   * The existing contributors a publisher may choose instead of the identity the plan holds, for every source
   * contributor a name search found any for. One choice per source contributor, however many contributions
   * their roles make: the choice applies to all of them.
   */
  private offerContributorAlternatives(
    requests: OnixDescriptiveLookupRequests,
    lookups: OnixDescriptiveLookups,
    workId: WorkId,
    chapterWorkIds: Record<string, WorkId>,
  ) {
    requests.contributors.forEach(({ key, fullName, orcid, chapterPath, ordinals }) => {
      const lookup = lookups.contributors[key];
      const targetWorkId = chapterPath === null ? workId : chapterWorkIds[chapterPath];

      if (lookup === undefined || lookup.alternatives.length === 0 || targetWorkId === undefined) return;

      const identity = (contributor: OnixMatchedContributor | null) => ({
        ...getDefaultContribution({
          fullName: contributor?.fullName ?? fullName,
          lastName: contributor?.lastName ?? '',
          firstName: contributor?.firstName ?? '',
          contributorId: contributor?.contributorId ?? this.defaultId,
          orcidId: contributor?.orcid ?? orcid ?? '',
          website: contributor?.website ?? '',
          // Every option names the same position: who the contributor is never moves them.
          orderNumber: ordinals[0] ?? 1,
        }),
        selected: contributor === null,
        lastContribution: contributor?.lastContributionTitle ?? '',
      });

      this.contributorsForSelection[targetWorkId] = {
        ...this.contributorsForSelection[targetWorkId],
        [key]: [identity(null), ...lookup.alternatives.map(identity)],
      };
    });
  }

  /**
   * Where a product-level issue came from: its position in the message, plus the publisher's own
   * RecordReference when the record carries one.
   */
  private productSource(product: ExtendedProduct, index: number): ImportIssueSource {
    const recordReference = getOnixText(product.RecordReference);

    return {
      kind: 'onix',
      productIndex: index,
      ...(recordReference.length > 0 ? { recordReference } : {}),
    };
  }

  /**
   * A product-scoped validation error, which blocks the import.
   *
   * This is the blocking path only. Warnings — which let the import proceed while saying what
   * will not be represented — are pushed onto the same list from wherever the loss is noticed:
   * `parseReferences` for a citation Thoth cannot store, and the shared series planner, which has
   * the whole group in hand and phrases its own once.
   */
  private pushError(product: ExtendedProduct, index: number, message: string) {
    this.issues.push({
      severity: 'error',
      code: 'onix.validation',
      message,
      source: this.productSource(product, index),
    });
  }

  /**
   * ONIX composites that are repeatable are objects when they occur once, so `.find` is only
   * safe after normalising. A product with a single ProductIdentifier used to throw and fail
   * the whole import with an opaque parsing error.
   */
  private findProductIdentifier(product: ExtendedProduct, type: ProductIdentifierType): string {
    const identifiers = this.convertToArray(product.ProductIdentifier).filter((identifier) => !!identifier);

    return getOnixText(identifiers.find((identifier) => identifier.ProductIDType === type)?.IDValue);
  }

  /**
   * A short, human-readable handle for a product, used to make import errors actionable.
   * Prefers the publisher's own RecordReference and falls back to the ISBN-13.
   */
  private describeProduct(product: ExtendedProduct, index: number): string {
    const recordReference = getOnixText(product.RecordReference);
    const isbn = this.findProductIdentifier(product, ProductIdentifierType._15);
    const reference = recordReference.length > 0 ? recordReference : isbn;

    return reference.length > 0 ? `product ${index} (${reference})` : `product ${index}`;
  }

  private parseWork(
    product: ExtendedProduct,
    index: number,
    node: OnixProductNode,
    group: OnixWorkGroup,
  ): ParsedProduct {
    const workId = this.generateId();
    const imprintId = this.parseImprint(product, index);
    const textLocale = this.parseTextLocale(product);

    // The Work's identity and edition are the group's, decided from every grouped Product at once, and its
    // description is the canonical descriptive reductions', which the resolver applies. A Product DOI, LCCN or
    // OCLC number identifies the Product, never the Work, so none is read here, and the WorkType is left to the
    // resolver: nothing in a Product decides it.
    const work = getDefaultWork({
      id: workId,
      imprintId,
      doi: group.workDoi.kind === 'DOI' ? group.workDoi.doi : '',
      lccn: '',
      oclc: '',
      license: this.parseLicense(product, index),
      edition:
        group.edition.kind === 'EXPLICIT' || group.edition.kind === 'DEFAULT_FIRST_EDITION'
          ? group.edition.edition
          : null,
      generalNote: this.parseGeneralNote(product),
      abstracts: this.parseAbstracts(product, index, textLocale),
      publications: [],
      references: this.parseReferences(product, index),
    });

    return {
      work,
      chapters: this.parseChapters(product, index, work, node),
      publications: this.parsePublicationCandidates(product, index, node),
    };
  }

  private parseImprint(product: ExtendedProduct, index: number) {
    const xmlImprint = product.PublishingDetail?.Imprint?.ImprintName ?? '';
    const imprint = this.imprints.find((imprint) => imprint.label === xmlImprint);

    if (!imprint) {
      this.pushError(product, index, `Imprint ${xmlImprint} not found for product ${index}`);
      return '';
    }

    return imprint.value;
  }

  /** Says what a DOI a product supplied could not become, without failing the work over it. */
  private warnAboutDoi(product: ExtendedProduct, index: number, detail: string) {
    this.issues.push({
      severity: 'warning',
      code: 'onix.identifier.unusable_doi',
      message: detail,
      source: this.productSource(product, index),
    });
  }

  /**
   * Turns a DOI selection into the value to store, reporting whatever could not be used.
   *
   * A DOI is optional metadata everywhere Thoth stores one, so nothing here blocks an import:
   * the work or chapter is created without a DOI and the user is told which value was refused.
   * `subject` names what the DOI was for, so one routine serves both the product and its chapters.
   */
  private resolveDoi(
    selection: OnixDoiSelection,
    product: ExtendedProduct,
    index: number,
    subject: string,
    omission: string,
  ): string {
    selection.unusable.forEach((value) =>
      this.warnAboutDoi(
        product,
        index,
        `"${value}" is given as a DOI for ${subject}, which Thoth cannot represent as one, so it was not imported`,
      ),
    );

    if (selection.kind === 'conflict') {
      this.warnAboutDoi(
        product,
        index,
        `More than one distinct DOI (${selection.dois.join(', ')}) is given for ${subject}, so ${omission}`,
      );

      return '';
    }

    return selection.kind === 'doi' ? selection.doi : '';
  }

  /**
   * The locale of the product's own text, used wherever ONIX declines to tag an abstract with a
   * language of its own. Titles, biographies and every other descriptive family take their
   * locales from the canonical descriptive reductions (thoth-app#183), never from here.
   *
   * Only the language of text (LanguageRole 01) is considered, plus an untagged Language: ONIX
   * makes the role mandatory and files omit it anyway. A translated-from or rights language says
   * nothing about what language the abstract is written in. The answer has to be unambiguous — a
   * multilingual edition declaring two languages of text gives no basis for choosing one, so it
   * gives nothing.
   *
   * Ambiguity is decided from what the file declared, not from what could be mapped. A product
   * declaring `fre` and `nor` is a bilingual product whichever way Thoth models Norwegian, so it
   * must not resolve to French merely because `nor` has no Thoth locale to collide with.
   *
   * Declarations are keyed by their locale where they have one, so duplicates collapse on what
   * they mean rather than on how they are spelled — two spellings of one language count once, out
   * of the existing canonicalisation rather than a table of aliases. A declaration with no locale
   * keeps its own code as its key, which is what keeps it in the count.
   */
  private parseTextLocale(product: ExtendedProduct): LocaleCodeType | undefined {
    const xmlLanguages = this.convertToArray(product.DescriptiveDetail?.Language).filter((language) => !!language);
    const declarations = new Map<string, LocaleCodeType | undefined>();

    xmlLanguages
      .filter((language) => {
        const role = getOnixText(language.LanguageRole);

        return role.length === 0 || role === LanguageRole._01;
      })
      .map((language) => getOnixText(language.LanguageCode).trim().toLowerCase())
      .filter((code) => code.length > 0)
      .forEach((code) => {
        const locale = localeFromLanguageCode(code);

        declarations.set(locale ?? code, locale);
      });

    return declarations.size === 1 ? [...declarations.values()][0] : undefined;
  }

  /**
   * The Thoth locale for one piece of ONIX text.
   *
   * ONIX carries an ISO 639 language code, Thoth stores a BCP-47 locale, and the conversion back
   * is lossy in a way no importer can undo: `eng` may have been `en`, `en-GB` or `en-US` before
   * Thoth's exporter flattened it. `localeFromLanguageCode` therefore recovers the base locale
   * only, and this adds the two fallbacks in the order the evidence justifies: what the element
   * itself says, then what the product says its text is in, then English — which is what every
   * ONIX import used to get unconditionally.
   */
  private resolveLocale(language: string, textLocale: LocaleCodeType | undefined): LocaleCodeType {
    return localeFromLanguageCode(language) ?? textLocale ?? LanguageTypeAlt.enum.En;
  }

  /**
   * The markup input format one piece of ONIX text should be created with, resolved here — while
   * the `textformat` declaration is still in hand — because the services that build the mutation
   * only ever see the extracted string. The policy itself lives in {@link resolveOnixTextMarkup}.
   *
   * `undefined` means no format could safely be determined. That pushes a blocking issue — the
   * import will not run — and the caller must drop the text rather than hand it on, so nothing
   * lacking a resolved format can ever reach a mutation, however this plan is later used.
   */
  private resolveTextMarkup(
    declared: string,
    content: string,
    product: ExtendedProduct,
    index: number,
    subject: string,
  ): ImportedMarkupFormat | undefined {
    const resolution = resolveOnixTextMarkup(declared, content);

    if (resolution.kind === 'format') return resolution.format;

    const declaration = declared.length > 0 ? `declares ONIX textformat "${declared}"` : 'declares no ONIX textformat';
    const tags = resolution.tags.map((tag) => `<${tag}>`).join(', ');

    this.issues.push({
      severity: 'error',
      code: 'onix.text.unrepresentable_format',
      message: `The ${subject} of ${this.describeProduct(product, index)} ${declaration} but contains markup Thoth cannot safely read as HTML, JATS or plain text (${tags}), so it cannot be imported`,
      source: this.productSource(product, index),
    });

    return undefined;
  }

  /**
   * The final content and markup format one imported abstract-like field should be created with, or
   * `undefined` when it should not be created at all.
   *
   * Format is resolved first, by {@link resolveTextMarkup}, while the ONIX `textformat` declaration
   * is still in hand. The content is then normalised for Thoth's representable subset by the rules
   * of the format it resolved to:
   *
   * - HTML ({@link normaliseImportedAbstractHtml}): harmless empty spacer paragraphs are dropped, a
   *   field that was nothing but spacer markup is omitted so no empty entity is created, and each
   *   safely understood `<br>` becomes a paragraph boundary. Malformed or ambiguous structure that
   *   cannot be normalised without inventing semantics or losing content raises a blocking issue.
   * - Plain text ({@link normaliseImportedPlainText}), which still knows the declaration the
   *   markup-free content arrived under: HTML/XHTML whitespace collapses the way it would render,
   *   and under every other declaration a literal single line break — which the API's plain-text
   *   path would turn into a `Break` no abstract may hold — raises a blocking issue and drops the
   *   field.
   *
   * Either way the problem is caught in preview, never at a mutation partway through a non-atomic
   * import. JATS is carried through untouched; neither rule set ever sees it.
   */
  private resolveImportedText(
    text: OnixText | undefined,
    content: string,
    product: ExtendedProduct,
    index: number,
    subject: string,
  ): { content: string; sourceMarkupFormat: ImportedMarkupFormat } | undefined {
    const declared = getOnixTextFormat(text);
    const sourceMarkupFormat = this.resolveTextMarkup(declared, content, product, index, subject);

    if (sourceMarkupFormat === undefined) return undefined;

    if (sourceMarkupFormat === MarkupFormat.PlainText) {
      const normalised = normaliseImportedPlainText(declared, content);

      if (normalised.kind === 'unrepresentable') {
        this.issues.push({
          severity: 'error',
          code: 'onix.text.unrepresentable_structure',
          message: `The ${subject} of ${this.describeProduct(product, index)} contains a single line break Thoth cannot represent. Separate paragraphs with a blank line, or remove the line break, and upload the file again.`,
          source: this.productSource(product, index),
        });

        return undefined;
      }

      // Nothing but whitespace: omit the field rather than create an empty abstract or biography.
      if (normalised.kind === 'empty') return undefined;

      return { content: normalised.content, sourceMarkupFormat };
    }

    if (sourceMarkupFormat !== MarkupFormat.Html) return { content, sourceMarkupFormat };

    const normalised = normaliseImportedAbstractHtml(content);

    if (normalised.kind === 'unrepresentable') {
      this.issues.push({
        severity: 'error',
        code: 'onix.text.unrepresentable_structure',
        message: `The ${subject} of ${this.describeProduct(product, index)} contains HTML structure Thoth cannot safely normalise or represent without inventing semantics or losing content. Correct the HTML structure and upload the file again.`,
        source: this.productSource(product, index),
      });

      return undefined;
    }

    // Nothing but spacer markup: omit the field rather than create an empty abstract or biography.
    if (normalised.kind === 'empty') return undefined;

    return { content: normalised.content, sourceMarkupFormat };
  }

  /**
   * The work's abstracts, each in the language its own TextContent claims.
   *
   * The two abstracts are read from separate TextContent composites, so each resolves its locale
   * from its own Text element. Neither inherits the other's: a file that supplies an English
   * short description alongside a French description is describing two languages, not one.
   *
   * Each abstract also resolves its markup input format from its own Text element, for the same
   * reason: a plain short description beside an HTML long description is two formats, not one.
   */
  private parseAbstracts(
    product: ExtendedProduct,
    index: number,
    textLocale: LocaleCodeType | undefined,
  ): AbstractEntity[] {
    const collateralDetailTextContent = this.convertToArray(product.CollateralDetail?.TextContent);
    const longText = collateralDetailTextContent.find((text) => text?.TextType === TextType._03)?.Text;
    const shortText = collateralDetailTextContent.find((text) => text?.TextType === TextType._02)?.Text;
    const longAbstract = getOnixText(longText);
    const shortAbstract = getOnixText(shortText);
    const abstracts: AbstractEntity[] = [];

    if (longAbstract.length > 0) {
      const resolved = this.resolveImportedText(longText, longAbstract, product, index, 'long abstract');

      if (resolved !== undefined) {
        abstracts.push(
          getDefaultAbstract({
            content: resolved.content,
            type: AbstractTypes.enum.Long,
            canonical: true,
            localeCode: this.resolveLocale(getOnixLanguage(longText), textLocale),
            sourceMarkupFormat: resolved.sourceMarkupFormat,
          }),
        );
      }
    }

    if (shortAbstract.length > 0) {
      const resolved = this.resolveImportedText(shortText, shortAbstract, product, index, 'short abstract');

      if (resolved !== undefined) {
        abstracts.push(
          getDefaultAbstract({
            content: resolved.content,
            type: AbstractTypes.enum.Short,
            canonical: false,
            localeCode: this.resolveLocale(getOnixLanguage(shortText), textLocale),
            sourceMarkupFormat: resolved.sourceMarkupFormat,
          }),
        );
      }
    }

    return abstracts;
  }

  private parseLicense(product: ExtendedProduct, index: number) {
    const enteredLicense =
      product.DescriptiveDetail?.EpubLicense?.EpubLicenseExpression?.EpubLicenseExpressionLink ?? '';

    if (enteredLicense.trim() === '') {
      return '';
    }

    const exactLicense = this.licenses.find((option) => enteredLicense === option.value);

    if (exactLicense) {
      return exactLicense.value;
    }

    const creativeCommonsLicenseRoot = 'https://creativecommons.org/licenses/';
    const representationSuffix =
      /^(?:legalcode|deed)(?:\.[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*)?$/;
    const license = this.licenses.find(
      (option) =>
        option.value !== '' &&
        option.value.startsWith(creativeCommonsLicenseRoot) &&
        enteredLicense.startsWith(option.value) &&
        representationSuffix.test(enteredLicense.slice(option.value.length)),
    );

    if (!license) {
      this.pushError(product, index, `License ${enteredLicense} not found for product ${index}`);
      return '';
    }

    return license.value;
  }

  private parseGeneralNote(product: ExtendedProduct): string {
    const collateralDetailTextContent = this.convertToArray(product.CollateralDetail?.TextContent);
    const note = getOnixText(collateralDetailTextContent.find((text) => text?.TextType === TextType._13)?.Text);

    return note;
  }

  private parseNumber(value: string): number {
    const parsedValue = parseInt(value);

    if (isNaN(parsedValue)) {
      return 0;
    }

    return parsedValue;
  }

  private parseFloatNumber(value: string): number {
    const parsedValue = parseFloat(value);

    if (isNaN(parsedValue)) {
      return 0;
    }

    return parsedValue;
  }

  /**
   * A Publication for every PublicationType one Product's manifestation could still become.
   *
   * The type comes from the approved ProductForm/ProductFormDetail reduction, never from the broad form
   * alone: a resolved manifestation yields one candidate, one the publisher still has to name yields one
   * per possible type - Location completeness depends on the type - and an unrepresentable one yields
   * none. The Publication ISBN is the one the Product's identifiers establish. Prices are read once, so a
   * currency Thoth lacks is reported once however many candidates there are.
   */
  private parsePublicationCandidates(
    product: ExtendedProduct,
    index: number,
    node: OnixProductNode,
  ): Partial<Record<PublicationType, OnixAdaptedPublication>> {
    const { manifestation } = node;
    const types =
      manifestation.kind === 'RESOLVED'
        ? [manifestation.type]
        : manifestation.kind === 'INPUT_REQUIRED'
          ? manifestation.candidates
          : [];

    if (types.length === 0) return {};

    const isbn = node.isbn.kind === 'ACCEPTED' ? node.isbn.isbn : '';
    const prices = this.parsePrices(product, index);

    return Object.fromEntries(types.map((type) => [type, this.parsePublication(product, index, type, isbn, prices)]));
  }

  private parsePrices(product: ExtendedProduct, index: number): PriceEntity[] | null {
    const productSupply = product.ProductSupply;

    if (!productSupply || !productSupply.SupplyDetail || !productSupply.SupplyDetail.Price) return null;

    return this.convertToArray(productSupply.SupplyDetail.Price)
      .filter((price) => !!price)
      .flatMap((price) => {
        const currencyCode = this.currencyOptions.find(
          (option) => option.value.toLowerCase() === (price?.CurrencyCode?.toLowerCase() ?? ''),
        )?.value;

        if (!currencyCode) {
          this.pushError(
            product,
            index,
            `Currency code ${price?.CurrencyCode} not found for ${this.describeProduct(product, index)}`,
          );
          return [];
        }

        return [
          {
            id: this.defaultId,
            currencyCode: currencyCode as CurrencyCode,
            unitPrice: this.parseFloatNumber(price?.PriceAmount ?? '0'),
          },
        ];
      });
  }

  private parsePublication(
    product: ExtendedProduct,
    index: number,
    type: PublicationType,
    isbn: string,
    prices: PriceEntity[] | null,
  ): OnixAdaptedPublication {
    const descriptiveDetail = product.DescriptiveDetail;
    const issues: ImportIssue[] = [];
    const measures = this.convertToArray(descriptiveDetail?.Measure).filter((measure) => !!measure);

    const height =
      measures.find((measure) => measure.MeasureType === MeasureType._01 && measure.MeasureUnitCode === MeasureUnit.mm)
        ?.Measurement ?? 0;
    const heightIn =
      measures.find((measure) => measure.MeasureType === MeasureType._01 && measure.MeasureUnitCode === MeasureUnit.in)
        ?.Measurement ?? 0;
    const width =
      measures.find((measure) => measure.MeasureType === MeasureType._02 && measure.MeasureUnitCode === MeasureUnit.mm)
        ?.Measurement ?? 0;
    const widthIn =
      measures.find((measure) => measure.MeasureType === MeasureType._02 && measure.MeasureUnitCode === MeasureUnit.in)
        ?.Measurement ?? 0;
    const depth =
      measures.find((measure) => measure.MeasureType === MeasureType._03 && measure.MeasureUnitCode === MeasureUnit.mm)
        ?.Measurement ?? 0;
    const depthIn =
      measures.find((measure) => measure.MeasureType === MeasureType._03 && measure.MeasureUnitCode === MeasureUnit.in)
        ?.Measurement ?? 0;
    const weight =
      measures.find((measure) => measure.MeasureType === MeasureType._08 && measure.MeasureUnitCode === MeasureUnit.gr)
        ?.Measurement ?? 0;
    const weightOz =
      measures.find((measure) => measure.MeasureType === MeasureType._08 && measure.MeasureUnitCode === MeasureUnit.oz)
        ?.Measurement ?? 0;
    const publication = getDefaultPublication({
      isbn,
      type,
      width: this.parseFloatNumber(width.toString()),
      widthIn: this.parseFloatNumber(widthIn.toString()),
      height: this.parseFloatNumber(height.toString()),
      heightIn: this.parseFloatNumber(heightIn.toString()),
      depth: this.parseFloatNumber(depth.toString()),
      depthIn: this.parseFloatNumber(depthIn.toString()),
      weight: this.parseFloatNumber(weight.toString()),
      weightOz: this.parseFloatNumber(weightOz.toString()),
      prices: prices === null ? [] : prices.map((price) => ({ ...price })),
      locations: [],
    });

    const productSupply = product.ProductSupply;

    if (prices === null || !productSupply?.SupplyDetail?.Supplier) return { publication, issues };

    // Locations
    const supplierWebsites = this.convertToArray(productSupply.SupplyDetail.Supplier.Website).filter(
      (website) => !!website,
    );
    const landingPage = getOnixText(supplierWebsites.find((website) => website.WebsiteRole === '02')?.WebsiteLink);
    const fullTextUrl = getOnixText(supplierWebsites.find((website) => website.WebsiteRole === '29')?.WebsiteLink);
    const locationPlatform =
      LocationPlatforms.options.find(
        (option) => option.toLowerCase() === productSupply.Market?.Territory?.RegionsIncluded?.toLowerCase(),
      ) ?? LocationPlatforms.enum.Other;

    // thoth-api decides canonical completeness from the Publication's own type: a physical
    // Location needs at least one URL, a digital one needs both, and it rejects an incomplete
    // candidate before or at persistence — a digital Location missing either URL is refused by the
    // API's canonical-completeness policy, ahead of the write, while a physical one carrying
    // neither URL reaches the universal `location_url_check` database constraint. Bulk import is
    // not atomic, so a Location either would reject must never reach the plan — the failure would
    // land partway through, after other records were created.
    //
    // Nothing is manufactured to get past the rule. `Work.landingPage` is the publisher's own
    // product page rather than this supplier's, so pairing it with a supplier full text URL would
    // invent a Location neither source claims; and demoting the candidate to `canonical: false`
    // would be rejected too, because a Publication's first Location has to be the canonical one.
    const isDigital = isFullTextUrlAvailable(publication.type);
    const hasLandingPage = landingPage.length > 0;
    const hasFullTextUrl = fullTextUrl.length > 0;

    if (isDigital ? hasLandingPage && hasFullTextUrl : hasLandingPage || hasFullTextUrl) {
      publication.locations.push({
        id: this.defaultId,
        canonical: true,
        landingPage,
        fullTextUrl,
        locationPlatform,
      });
    } else if (isDigital && (hasLandingPage || hasFullTextUrl)) {
      // Half a digital pair. The Publication imports without it, but the URL the file did supply
      // is real metadata, so it is reported rather than dropped in silence. A Supplier that
      // supplied neither lost nothing and is left unremarked.
      issues.push(this.unrepresentableLocation(product, index, hasLandingPage ? 'fullTextUrl' : 'landingPage'));
    }

    return { publication, issues };
  }

  /**
   * Says which half of a digital canonical Location the file left out, without failing the work.
   *
   * Only the Location is left behind: a Publication with no Location is an ordinary, supported
   * state — `PublicationService.createPublication` sends no Location mutation for an empty list —
   * and the publisher's own workflow depends on it, because frontlist titles are catalogued before
   * their files exist. Uploading the file later through Thoth Hosting is what establishes the
   * canonical Location, and that path is the backend's to own.
   *
   * Returned with the Publication candidate it belongs to rather than recorded here: whether that
   * Publication is planned at all is the ONIX resolver's decision, and it reports what it plans.
   */
  private unrepresentableLocation(
    product: ExtendedProduct,
    index: number,
    missing: 'landingPage' | 'fullTextUrl',
  ): ImportIssue {
    const missingUrl = missing === 'fullTextUrl' ? 'no full text URL' : 'no landing page';

    return {
      severity: 'warning',
      code: 'onix.location.unrepresentable_canonical',
      message:
        `The supplier location for ${this.describeProduct(product, index)} was not imported because Thoth ` +
        'requires both a landing page and a full text URL for a canonical location on a digital publication, and ' +
        `${missingUrl} was supplied. The publication itself is imported without it.`,
      source: this.productSource(product, index),
    };
  }

  /**
   * The identifiers of one RelatedProduct, normalised.
   *
   * ProductIdentifier is repeatable, and Thoth's own exporter repeats it: an alternative-format
   * RelatedProduct carries the ISBN-13 and the GTIN-13 of the same book. Reading `.ProductIDType`
   * off the composite without normalising would see an array and match nothing.
   */
  private relatedIdentifiers(relatedProduct: OnixRelatedProduct) {
    return this.convertToArray(relatedProduct.ProductIdentifier).filter((identifier) => !!identifier);
  }

  /**
   * Whether a proprietary identifier is the one Thoth means as a citation.
   *
   * ProductIDType 01 is "proprietary", which is a container for whatever the sender wants: a
   * publisher's product code, an internal SKU, a distributor's key. Thoth's exporter narrows it
   * with `IDTypeName` "Unstructured citation", and that name is the only thing distinguishing a
   * citation from a stock number, so reading any proprietary identifier as citation text would
   * put a SKU in a bibliography. The comparison tolerates case and surrounding whitespace and
   * nothing else — an identifier with no name at all is not a citation.
   */
  private isUnstructuredCitation(identifier: OnixRelatedIdentifier): boolean {
    return (
      getOnixText(identifier.ProductIDType) === ProductIdentifierType._01 &&
      getOnixText(identifier.IDTypeName).trim().toLowerCase() === UNSTRUCTURED_CITATION_NAME
    );
  }

  /** Says what one cited product lost, without failing the work over it. */
  private warnAboutCitation(
    product: ExtendedProduct,
    index: number,
    kind: 'unrepresentable' | 'unusable_identifier',
    detail: string,
  ) {
    this.issues.push({
      severity: 'warning',
      code:
        kind === 'unrepresentable' ? 'onix.reference.unrepresentable_citation' : 'onix.reference.unusable_identifier',
      message: `A cited work in ${this.describeProduct(product, index)} ${detail}`,
      source: this.productSource(product, index),
    });
  }

  /**
   * The DOI of one cited product, in the form Thoth stores, or nothing.
   *
   * A malformed value is dropped rather than dressed up: prefixing a resolver onto whatever
   * arrived used to turn `not-a-doi` into `https://doi.org/not-a-doi`, which survives the import
   * and fails at the API, where the Doi scalar parses it. The work is still importable without
   * one cited work's DOI, so this warns and carries on.
   *
   * Selection goes through the same canonicalising helper as every other DOI here, so a cited
   * product that gives its DOI both bare and resolver-prefixed is understood to have given one
   * DOI twice rather than two that contradict each other.
   */
  private resolveReferenceDoi(identifiers: OnixRelatedIdentifier[], product: ExtendedProduct, index: number): string {
    const selection = selectCanonicalDoi(
      identifiers
        .filter((identifier) => getOnixText(identifier.ProductIDType) === ProductIdentifierType._06)
        .map((identifier) => getOnixText(identifier.IDValue)),
    );

    selection.unusable.forEach((value) =>
      this.warnAboutCitation(
        product,
        index,
        'unusable_identifier',
        `supplies "${value}" as a DOI, which Thoth cannot read as one, so the reference was imported without it`,
      ),
    );

    if (selection.kind === 'conflict') {
      this.warnAboutCitation(
        product,
        index,
        'unusable_identifier',
        `supplies more than one DOI (${selection.dois.join(', ')}), so the reference was imported without one`,
      );

      return '';
    }

    return selection.kind === 'doi' ? selection.doi : '';
  }

  /** The unstructured citation of one cited product, or nothing. */
  private resolveReferenceCitation(
    identifiers: OnixRelatedIdentifier[],
    product: ExtendedProduct,
    index: number,
  ): string {
    const selection = selectRelatedIdentifier(identifiers, (identifier) => this.isUnstructuredCitation(identifier));

    if (selection.kind === 'value') return selection.value;

    if (selection.kind === 'conflict') {
      this.warnAboutCitation(
        product,
        index,
        'unusable_identifier',
        'supplies more than one unstructured citation, so the reference was imported without one',
      );
    }

    return '';
  }

  /**
   * The works this work cites, as Thoth references.
   *
   * ONIX RelatedMaterial holds every kind of relationship a product can have, and only one of
   * them is a bibliographic citation: ProductRelationCode 34, "cites", which is what Thoth's own
   * exporter writes for a ReferenceEntity. Everything else there describes a different book or a
   * different edition of this one — an alternative format (06), a part (01/02), a replacement
   * (03/05), a translation — and turning those into references filled works with citations of
   * their own paperback. They are left alone until Thoth's work relations are imported properly.
   *
   * RelatedWork is skipped for the same reason: ONIX List 164 has no citation relation at all, so
   * a RelatedWork is never a reference.
   */
  private parseReferences(product: ExtendedProduct, index: number) {
    const references: ReferenceEntity[] = [];
    const citations = this.convertToArray(product.RelatedMaterial?.RelatedProduct)
      .filter((relatedProduct) => !!relatedProduct)
      .filter((relatedProduct) => getOnixText(relatedProduct.ProductRelationCode) === ProductRelation._34);

    citations.forEach((citation) => {
      const identifiers = this.relatedIdentifiers(citation);
      const doi = this.resolveReferenceDoi(identifiers, product, index);
      const unstructuredCitation = this.resolveReferenceCitation(identifiers, product, index);

      if (doi.length === 0 && unstructuredCitation.length === 0) {
        this.warnAboutCitation(
          product,
          index,
          'unrepresentable',
          'carries no citation metadata Thoth can represent, so the reference was skipped',
        );

        return;
      }

      references.push({
        id: this.defaultId,
        doi,
        journalTitle: '',
        articleTitle: '',
        seriesTitle: '',
        volumeTitle: '',
        url: '',
        orderNumber: references.length + 1,
        unstructuredCitation,
      });
    });

    return references;
  }

  /**
   * The DOI of one ContentItem, in the single form Thoth stores.
   *
   * TextItemIdentifier is repeatable and carries a TextItemIDType (ONIX List 43), of which only
   * `06` is a DOI — the code Thoth's own exporter writes for a chapter DOI. Reading `IDValue` off
   * the first identifier without looking at its type made a proprietary chapter key into a DOI,
   * and prefixing a resolver onto it made that key look like one.
   */
  private parseChapterDoi(chapter: ExtendedCollection, product: ExtendedProduct, index: number): string {
    const identifiers = this.convertToArray(chapter?.TextItem?.TextItemIdentifier).filter((identifier) => !!identifier);

    const selection = selectCanonicalDoi(
      identifiers
        .filter((identifier) => getOnixText(identifier.TextItemIDType) === TextItemIdentifierType._06)
        .map((identifier) => getOnixText(identifier.IDValue)),
    );

    return this.resolveDoi(
      selection,
      product,
      index,
      `a chapter of ${this.describeProduct(product, index)}`,
      'the chapter was imported without one',
    );
  }

  /**
   * The Product's structural chapters: ContentItems of TextItemType 02, 03 or 04, and nothing else.
   *
   * The approved ContentDetail rule makes only front, body and back matter BookChapters. A complete
   * embedded work, an audiovisual item or an unrecognised item is never one: the source plan blocks its
   * Product until the publisher or a later representation answers for it, so none of them is created here.
   *
   * A chapter carries only what no descriptive reduction decides - its DOI and its pages - and what it takes
   * from its Work's candidate. Its titles, contributors, languages and subjects are its own ContentItem's
   * canonical reductions, and its lifecycle is its Work's, which the resolver applies once they are decided.
   */
  private parseChapters(product: ExtendedProduct, index: number, relatedWork: WorkEntity, node: OnixProductNode) {
    const { id: workId, license, imprintId, edition } = relatedWork;
    const chapterPaths = new Set(node.contentItems.filter(({ kind }) => kind === 'CHAPTER').map(({ path }) => path));
    const chapterCollections = this.convertToArray(product.ContentDetail?.ContentItem)
      .map((collection, position) => ({
        collection,
        path: `/ONIXMessage[1]/Product[${index}]/ContentDetail[1]/ContentItem[${position + 1}]`,
      }))
      .filter(({ path }) => chapterPaths.has(path));

    return chapterCollections
      .flatMap(({ collection, path }) => (collection ? [{ chapter: collection, path }] : []))
      .sort(
        (chapterA, chapterB) =>
          this.parseNumber(getOnixText(chapterA.chapter.LevelSequenceNumber)) -
          this.parseNumber(getOnixText(chapterB.chapter.LevelSequenceNumber)),
      )
      .map(({ chapter, path }) => ({
        path,
        chapter: getDefaultChapter({
          id: this.generateId(),
          doi: this.parseChapterDoi(chapter, product, index),
          imprintId,
          license,
          edition,
          relationId: workId,
          pageCount: this.parseNumber(getOnixText(chapter?.NumberOfPages)),
          firstPage: getOnixText(chapter?.PageRun?.FirstPageNumber),
          lastPage: getOnixText(chapter?.PageRun?.LastPageNumber),
          contributions: [],
        }),
      }));
  }

  private generateId() {
    return uuidv4();
  }
}

export default XMLParser;
