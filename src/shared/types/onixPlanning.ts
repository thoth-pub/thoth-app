import type { LocationPlatform } from '@/gql/graphql';
import type { PublicationEntity, PublicationType } from '@/src/entities/publication/model/publication.types';
import type { WorkId, WorkType } from '@/src/entities/work/model/work.types';

import type { ImportIssue } from './importIssues';

/**
 * The ONIX identity, Work and manifestation planning contract (thoth-app#182).
 *
 * Canonical source validation (#190/#196/#197) decides whether an ONIX file is valid. This contract
 * decides something else: which source records are ordinary complete Product assertions, which of those
 * assert the same Product, which Products manifest the same Work, what each manifestation can become
 * in Thoth, what already exists in Thoth, and which of those decisions still need the publisher.
 *
 * Everything here is plain, serialisable data. Nodes refer to one another by stable keys, never by
 * holding copies of mutable entities, so a refinement of the plan (contributor selection, for example)
 * cannot change identity by editing a copy.
 *
 * Source facts keep the canonical Reference path they were read from and, for a Short source, the
 * original path, so every decision can be traced back to the element that caused it.
 */

/** Where a fact came from: its canonical Reference path and the path in the file as submitted. */
export type OnixSourceLocation = {
  readonly path: string;
  readonly sourcePath: string;
};

/**
 * ONIX List 1 reduced to what a create-mode bulk import may do with a record.
 *
 * - `COMPLETE` (01, 02, 03): an ordinary complete Product record, eligible for planning.
 * - `PARTIAL_UPDATE` (04): omitted blocks mean "unchanged", never "absent"; blocked until excluded.
 * - `DELETE` (05): an instruction about a previously issued record; never a mutation; blocked until excluded.
 * - `OWNERSHIP_TRANSFER` (08, 09): needs its own workflow; blocked until excluded.
 * - `TEST` (88, 89): never creates live data; omitted from execution and reported.
 * - `UNRECOGNISED`: no usable NotificationType. Never read as 03.
 */
export type OnixRecordDisposition =
  | 'COMPLETE'
  | 'PARTIAL_UPDATE'
  | 'DELETE'
  | 'OWNERSHIP_TRANSFER'
  | 'TEST'
  | 'UNRECOGNISED';

export type OnixQualifiedIdentifier = {
  /** The declared code-list type (List 5 for a Product, List 16 for a Work, List 44 for a sender). */
  readonly type: string;
  /** The proprietary scheme name, where the type is proprietary. */
  readonly typeName: string | null;
  readonly value: string;
};

export type OnixSourceHeader = {
  readonly senderName: string | null;
  readonly senderEmail: string | null;
  readonly senderIdentifiers: readonly OnixQualifiedIdentifier[];
  /**
   * Who the file's RecordReferences belong to. Built from strong sender identifiers when the Header has
   * them. It scopes duplicate detection inside this one file and is never used to reconcile records
   * across separate uploads.
   */
  readonly authority: string;
};

/** One ProductIdentifier occurrence, interpreted only by its declared type. */
export type OnixProductIdentifierFact = OnixSourceLocation &
  OnixQualifiedIdentifier & {
    /** The key under which another declaration of the same qualified identifier matches this one. */
    readonly matchKey: string | null;
    /**
     * The strong Product identity this identifier establishes, or null. Only manifestation-unique schemes
     * qualify (the ISBN/GTIN-13 family, and the Thoth publication id under the verified compatibility
     * profile): a Product DOI, LCCN, OCLC number or generic proprietary id can be shared by several
     * manifestations, as Thoth's own exporter shows by repeating Work-level values on every Product.
     */
    readonly identityKey: string | null;
  };

/** What the ProductIdentifiers of one record say the Publication ISBN is. */
export type OnixIsbnDecision =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'ACCEPTED'; readonly isbn: string; readonly declaredAs: '15' | '03'; readonly path: string }
  | { readonly kind: 'AMBIGUOUS'; readonly candidates: readonly string[] };

/** The Thoth-native identifiers a record carries, read structurally before any target evidence. */
export type OnixThothRecordIdentity =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'NATIVE'; readonly workId: string; readonly publicationId: string }
  | { readonly kind: 'INCONSISTENT'; readonly reasons: readonly OnixThothInconsistency[] };

export type OnixThothInconsistency =
  | 'NOTIFICATION_TYPE'
  | 'RECORD_SOURCE_TYPE'
  | 'RECORD_REFERENCE_NOT_UUID_URN'
  | 'PUBLICATION_ID_MISSING'
  | 'PUBLICATION_ID_REPEATED'
  | 'PUBLICATION_ID_NOT_UUID_URN'
  | 'WORK_ID_MISSING'
  | 'WORK_ID_REPEATED'
  | 'WORK_ID_NOT_UUID_URN'
  | 'RECORD_REFERENCE_MISMATCH';

export type OnixSourceRecord = OnixSourceLocation & {
  readonly recordKey: string;
  /** 1-based position among the message's Products, as every ONIX issue already numbers them. */
  readonly index: number;
  readonly recordReference: string | null;
  /** `(source authority, RecordReference)`: identifies the information record, never the Product. */
  readonly sourceRecordKey: string | null;
  readonly notificationType: string | null;
  readonly disposition: OnixRecordDisposition;
  readonly deletionText: readonly string[];
  readonly recordSourceType: string | null;
  readonly recordSourceIdentifiers: readonly OnixQualifiedIdentifier[];
  readonly recordSourceName: string | null;
  readonly identifiers: readonly OnixProductIdentifierFact[];
  readonly thoth: OnixThothRecordIdentity;
  /** The Product node a complete record asserts; null for every other disposition. */
  readonly productKey: string | null;
};

/** A Work identifier asserted by RelatedWork 01/06, or the Thoth work id under the compatibility profile. */
export type OnixWorkIdentityAlias = OnixSourceLocation &
  OnixQualifiedIdentifier & {
    readonly relation: '01' | '06' | 'THOTH_WORK_ID';
    readonly key: string;
    /** The composite that asserted it: aliases in one composite identify the same Work. */
    readonly compositePath: string;
  };

/** One RelatedProduct 06 (alternative format) and what its endpoint resolved to inside the file. */
export type OnixAlternativeFormat = OnixSourceLocation & {
  readonly identifiers: readonly OnixProductIdentifierFact[];
  readonly resolution:
    | { readonly kind: 'IN_FILE'; readonly productKey: string }
    | { readonly kind: 'SELF' }
    | { readonly kind: 'EXTERNAL'; readonly isbns: readonly string[] }
    | { readonly kind: 'AMBIGUOUS'; readonly productKeys: readonly string[] };
};

export type OnixManifestationFacts = {
  readonly composition: string | null;
  readonly form: string | null;
  readonly formDetails: readonly string[];
  readonly hasProductParts: boolean;
};

export type OnixManifestationNoteCode =
  | 'NOT_AVAILABLE_SEPARATELY'
  | 'DELIVERY_MODE_NOT_REPRESENTED'
  | 'PDF_A_NOT_REPRESENTED'
  | 'EPUB_A_NOT_REPRESENTED'
  | 'DETAIL_NOT_REPRESENTED'
  | 'DETAIL_NOT_FOR_THIS_FORM'
  | 'UNSUPPORTED_FORMAT_DETAIL';

export type OnixManifestationNote = { readonly code: OnixManifestationNoteCode; readonly detail: string | null };

export type OnixManifestationInputReason =
  | 'BINDING_UNSPECIFIED'
  | 'XHTML_HTML_OR_XML'
  | 'KINDLE_FAMILY'
  | 'OTHER_EPUBLICATION_FORMAT'
  | 'DIGITAL_FORMAT_UNSPECIFIED'
  | 'AUDIO_FORMAT_UNSPECIFIED'
  | 'MULTIPLE_FORMATS';

export type OnixManifestationLossReason =
  | 'PACKAGE'
  | 'FORM_UNREPRESENTABLE'
  | 'FORMAT_UNREPRESENTABLE'
  | 'FORM_UNDEFINED';

/**
 * What a Product's ProductComposition, ProductForm and ProductFormDetail establish about the one Thoth
 * PublicationType its manifestation could become.
 */
export type OnixManifestationDecision =
  | {
      readonly kind: 'RESOLVED';
      readonly type: PublicationType;
      readonly classification: 'SUPPORTED_LOSSLESS' | 'SUPPORTED_NORMALIZED';
      readonly notes: readonly OnixManifestationNote[];
    }
  | {
      readonly kind: 'INPUT_REQUIRED';
      readonly reason: OnixManifestationInputReason;
      readonly candidates: readonly PublicationType[];
      readonly notes: readonly OnixManifestationNote[];
    }
  | {
      readonly kind: 'UNREPRESENTABLE';
      readonly reason: OnixManifestationLossReason;
      /** A package omission needs an explicit, source-bound acknowledgement before anything runs. */
      readonly acknowledgementRequired: boolean;
      readonly notes: readonly OnixManifestationNote[];
    };

export type OnixEditionNumber =
  | { readonly kind: 'ABSENT' }
  | { readonly kind: 'VALID'; readonly value: number }
  | { readonly kind: 'SOURCE_INVALID'; readonly raw: string }
  | { readonly kind: 'TARGET_UNREPRESENTABLE'; readonly raw: string };

export type OnixEditionFacts = {
  readonly number: OnixEditionNumber;
  readonly types: readonly string[];
  readonly statements: readonly string[];
  readonly noEdition: boolean;
};

/** One ContentItem, classified only as far as the approved structural chapter rule reaches. */
export type OnixContentItemKind = 'CHAPTER' | 'EMBEDDED_WORK' | 'AV_ITEM' | 'UNSUPPORTED';

export type OnixContentItemFact = OnixSourceLocation & {
  readonly kind: OnixContentItemKind;
  readonly textItemType: string | null;
};

/**
 * A Work-level family a source record can assert, whose canonical reduction into Thoth is not this task's.
 *
 * Identity and description are separate stages: this task decides which Work a Product manifests, never what
 * that Work's title, contributors, extent or licence become. Each family below is the subject of an approved
 * decision owned by a later task, so until that task's reducer exists no source assertion in the family can be
 * compared with an existing Work - a legacy projection of it is not evidence.
 *
 * `PLACE` (PublishingDetail/CityOfPublication -> Work.place) is part of the descriptive slice (thoth-app#183)
 * and is asserted exactly like the other families that slice owns.
 */
export type OnixCompatibilityFamily =
  | 'TITLE'
  | 'CONTRIBUTORS'
  | 'LANGUAGES'
  | 'SUBJECTS'
  | 'SERIES'
  | 'EXTENT'
  | 'ANCILLARY_CONTENT'
  | 'ILLUSTRATIONS_NOTE'
  | 'LICENCE'
  | 'LIFECYCLE'
  | 'COPYRIGHT'
  | 'FUNDING'
  | 'LANDING_PAGE'
  | 'PLACE'
  | 'COLLATERAL'
  | 'REFERENCES'
  | 'COMPONENTS';

/** The task whose approved decision owns a family's canonical reducer. */
export type OnixCompatibilityOwner = 'APP-IMPORT-ONIX-DESC-01' | 'APP-IMPORT-ONIX-PUB-01' | 'APP-IMPORT-ONIX-REL-01';

/** One Work-level family a Product's source asserts, and exactly where it asserts it. Presence only: no value. */
export type OnixWorkCompatibilityAssertion = {
  readonly family: OnixCompatibilityFamily;
  readonly owner: OnixCompatibilityOwner;
  /** The owning task's issue, as the programme names it. */
  readonly ownerIssue: string;
  readonly locations: readonly OnixSourceLocation[];
};

export type OnixProductNode = {
  readonly productKey: string;
  /** Every complete record asserting this Product, in source order. */
  readonly recordKeys: readonly string[];
  /** The record the Product's facts are read from. Every other record of it is identical or conflicting. */
  readonly representativeRecordKey: string;
  readonly identityKeys: readonly string[];
  readonly matchKeys: readonly string[];
  readonly isbn: OnixIsbnDecision;
  readonly thoth: OnixThothRecordIdentity;
  readonly workIdentityAliases: readonly OnixWorkIdentityAlias[];
  readonly alternativeFormats: readonly OnixAlternativeFormat[];
  readonly manifestationFacts: OnixManifestationFacts;
  readonly manifestation: OnixManifestationDecision;
  readonly edition: OnixEditionFacts;
  readonly imprintName: string | null;
  readonly contentItems: readonly OnixContentItemFact[];
  /** The Work-level families this Product's source asserts that a later task must reduce before an attachment. */
  readonly compatibilityAssertions: readonly OnixWorkCompatibilityAssertion[];
  /**
   * Where the record states ProductSupply, presence only: what it says about supply, prices and Locations is the canonical
   * commercial reduction's alone (thoth-app#215).
   */
  readonly supplyLocations: readonly OnixSourceLocation[];
  readonly duplicate: 'SINGLE' | 'COLLAPSED' | 'CONFLICT';
  readonly groupKey: string;
};

/** Why two Products share a Work group: the explicit, approved identity edge that joined them. */
export type OnixGroupingEdge =
  | { readonly kind: 'WORK_IDENTITY'; readonly key: string; readonly productKeys: readonly string[] }
  | { readonly kind: 'ALTERNATIVE_FORMAT'; readonly from: string; readonly to: string; readonly path: string };

export type OnixWorkDoiDecision =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'DOI'; readonly doi: string; readonly basis: 'WORK_IDENTIFIER' | 'THOTH_PROFILE' }
  | { readonly kind: 'CONFLICT'; readonly dois: readonly string[] };

export type OnixGroupEditionDecision =
  | { readonly kind: 'EXPLICIT'; readonly edition: number }
  | { readonly kind: 'DEFAULT_FIRST_EDITION'; readonly edition: 1 }
  | { readonly kind: 'INPUT_REQUIRED'; readonly evidence: readonly string[] }
  | {
      readonly kind: 'BLOCKED';
      readonly reason: 'CONFLICTING_NUMBERS' | 'SOURCE_INVALID' | 'TARGET_UNREPRESENTABLE' | 'CONFLICTING_EVIDENCE';
      readonly values: readonly string[];
    };

/** Work-level fields the Thoth compatibility profile may recover, when every Product of the group agrees. */
export type OnixThothWorkFields = {
  readonly lccn: string;
  readonly oclc: string;
  readonly reference: string;
};

export type OnixWorkGroup = {
  readonly groupKey: string;
  /** Members, ordered by key. Membership never depends on source order. */
  readonly productKeys: readonly string[];
  /** The earliest source position of any member, used only to present groups in file order. */
  readonly firstIndex: number;
  readonly aliases: readonly OnixWorkIdentityAlias[];
  readonly edges: readonly OnixGroupingEdge[];
  readonly compatibility: 'GENERIC' | 'THOTH_PROFILE';
  readonly thothWorkId: string | null;
  readonly workDoi: OnixWorkDoiDecision;
  readonly thothWorkFields: OnixThothWorkFields | null;
  readonly edition: OnixGroupEditionDecision;
  readonly externalIsbns: readonly string[];
};

export type OnixPlanBlockerClassification =
  | 'SOURCE_INVALID'
  | 'SOURCE_CONFLICT'
  | 'TARGET_INPUT_REQUIRED'
  | 'TARGET_UNREPRESENTABLE'
  | 'PREFLIGHT_GAP'
  | 'EXECUTION_DEFERRED';

export type OnixPlanBlockerCode =
  | 'RECORD_NOT_COMPLETE'
  | 'RECORD_NOTIFICATION_UNRECOGNISED'
  | 'RECORD_SEQUENCE_AMBIGUITY'
  | 'PRODUCT_RECORD_CONFLICT'
  | 'ISBN_AMBIGUOUS'
  | 'MULTIPLE_WORK_IDENTITIES'
  | 'ALTERNATIVE_FORMAT_AMBIGUOUS'
  | 'WORK_DOI_CONFLICT'
  | 'THOTH_PROFILE_INCONSISTENT'
  | 'THOTH_WORK_ID_CONFLICT'
  | 'THOTH_WORK_FIELD_CONFLICT'
  | 'EDITION_CONFLICT'
  | 'EDITION_SOURCE_INVALID'
  | 'EDITION_UNREPRESENTABLE'
  | 'EDITION_EVIDENCE_CONFLICT'
  | 'EDITION_INPUT_REQUIRED'
  | 'MANIFESTATION_INPUT_REQUIRED'
  | 'MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED'
  | 'SAME_TYPE_COLLISION'
  | 'COMPONENT_UNSUPPORTED'
  | 'GROUPED_WORK_FACT_CONFLICT'
  | 'WORK_TYPE_INPUT_REQUIRED'
  | 'WORK_TYPE_PARENT_RELATION_REQUIRED'
  | 'WORK_TYPE_OVERRIDE_CONFLICT'
  | 'EXISTING_TARGET_AMBIGUOUS'
  | 'CONFLICTING_EXISTING_WORKS'
  | 'WRONG_WORK_ISBN'
  | 'EXISTING_TYPE_COLLISION'
  | 'EXISTING_PUBLICATION_TYPE_CONTRADICTION'
  | 'EXISTING_WORK_CONTRADICTION'
  | 'EXISTING_WORK_COMPATIBILITY_UNVERIFIED'
  | 'EXISTING_WORK_DESCRIPTIVE_CONTRADICTION'
  | 'EXISTING_WORK_UNAUTHORIZED'
  | 'ATTACH_TO_EXISTING_WORK_DEFERRED'
  | 'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED'
  | 'THOTH_PROFILE_CONTRADICTED'
  /**
   * An unresolved blocking finding of the descriptive reducers (thoth-app#183). The finding itself - its family,
   * code, source locations, English explanation and how a publisher can answer it - is in the sidecar's
   * `descriptive.findings` under `detail.findingKey`.
   */
  | 'DESCRIPTIVE_CHOICE_REQUIRED'
  | 'DESCRIPTIVE_ACKNOWLEDGEMENT_REQUIRED'
  | 'DESCRIPTIVE_INPUT_REQUIRED'
  | 'DESCRIPTIVE_UNREPRESENTABLE'
  | 'DESCRIPTIVE_SOURCE_CONFLICT'
  | 'DESCRIPTIVE_PREFLIGHT_GAP'
  | 'DESCRIPTIVE_EXECUTION_DEFERRED'
  /**
   * A blocking finding of the canonical Product-rights reduction (thoth-app#211), or a rights reduction that never ran
   * for a Work whose source states rights (`detail.reason` `RIGHTS_NOT_REDUCED`). The finding itself - its code,
   * source locations and English explanation - is in the sidecar's `rights.findings` under `detail.findingKey`.
   */
  | 'RIGHTS_SOURCE_CONFLICT'
  | 'RIGHTS_INPUT_REQUIRED'
  | 'RIGHTS_UNREPRESENTABLE'
  | 'RIGHTS_PREFLIGHT_GAP'
  /**
   * A blocking finding of the canonical commercial reduction (thoth-app#215) for a Publication this import would create,
   * or a commercial reduction that never ran for a Product whose source states ProductSupply (`detail.reason`
   * `COMMERCIAL_NOT_REDUCED`). The finding itself is in the sidecar's `commercial.findings` under `detail.findingKey`.
   */
  | 'COMMERCIAL_INPUT_REQUIRED'
  | 'COMMERCIAL_UNREPRESENTABLE'
  | 'COMMERCIAL_PREFLIGHT_GAP'
  /** A price decision the publisher has not answered: a price the file states, or no Price, for a Publication. */
  | 'COMMERCIAL_CHOICE_REQUIRED'
  /**
   * A price answer the reduction does not offer - a source price the decision does not name, or a decision the file
   * does not have (`detail.answer`): never ignored and never replaced by a default, it holds the plan until it is
   * corrected or cleared.
   */
  | 'COMMERCIAL_CHOICE_STALE'
  /**
   * A blocking Product-rights finding (thoth-app#211) whose approved target-loss path is an acknowledgement the
   * publisher has not given (thoth-app#217); the finding is in the sidecar's `rights.findings` under `detail.findingKey`.
   */
  | 'RIGHTS_ACKNOWLEDGEMENT_REQUIRED'
  /**
   * A rights or contact answer the reductions do not offer (`detail.answer`): never ignored and never read as consent,
   * it holds the plan until it is corrected or cleared.
   */
  | 'RIGHTS_CHOICE_STALE'
  /** The source states a supported licence that differs from the existing Work's, which this import never overwrites. */
  | 'RIGHTS_EXISTING_LICENCE_DIFFERS'
  /** The existing Work has a licence and the source states one Thoth cannot identify, so they cannot be compared. */
  | 'RIGHTS_EXISTING_LICENCE_UNVERIFIED'
  /**
   * A blocking SalesRights finding (thoth-app#217): an acknowledgement the publisher has not given, a source-semantic
   * conflict, or a relation the pinned vocabulary cannot establish. The finding is in the sidecar's
   * `salesRights.findings` under `detail.findingKey`.
   */
  | 'SALES_RIGHTS_ACKNOWLEDGEMENT_REQUIRED'
  | 'SALES_RIGHTS_SOURCE_CONFLICT'
  | 'SALES_RIGHTS_PREFLIGHT_GAP'
  /** A blocking ProductContact finding (thoth-app#217), likewise in `salesRights.findings`. */
  | 'PRODUCT_CONTACT_ACKNOWLEDGEMENT_REQUIRED'
  | 'PRODUCT_CONTACT_PREFLIGHT_GAP';

export type OnixPlanBlocker = {
  readonly code: OnixPlanBlockerCode;
  readonly classification: OnixPlanBlockerClassification;
  readonly recordKey: string | null;
  readonly productKey: string | null;
  readonly groupKey: string | null;
  readonly paths: readonly string[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
};

/** The Thoth ONIX compatibility profile, as far as the file's own structure establishes it. */
export type OnixCompatibilityStructure = {
  readonly version: 'thoth-onix-3-canonical-v1';
  /** Header SenderName `Thoth` and EmailAddress `distribution@thoth.pub`, exactly. */
  readonly headerMatches: boolean;
  /** Records carrying Thoth-native identifiers the profile did not decode because the Header does not match. */
  readonly ignoredNativeRecordKeys: readonly string[];
};

/** Everything the file alone establishes, before any target lookup. Deterministic and network-free. */
export type OnixSourcePlan = {
  readonly header: OnixSourceHeader;
  readonly compatibility: OnixCompatibilityStructure;
  readonly records: readonly OnixSourceRecord[];
  readonly products: readonly OnixProductNode[];
  readonly groups: readonly OnixWorkGroup[];
  /** Deterministic blockers the source alone establishes. */
  readonly blockers: readonly OnixPlanBlocker[];
  /** What the file says that will not be represented, or was normalised, whatever the publisher decides. */
  readonly warnings: readonly ImportIssue[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Target adaptation                                                                                 */
/* ------------------------------------------------------------------------------------------------ */

/** One Publication the adapter built for one Product as one PublicationType, with what building it raised. */
export type OnixAdaptedPublication = {
  readonly publication: PublicationEntity;
  readonly issues: readonly ImportIssue[];
};

/** What an exact Institution lookup established: by a declared ROR, or by a funder's ROR and FundRef DOI. */
export type OnixInstitutionMatch =
  | {
      readonly kind: 'FOUND';
      readonly institutionId: string;
      readonly name: string;
      readonly ror: string;
    }
  | { readonly kind: 'NOT_FOUND' }
  /** The funder's declared ROR and FundRef DOI named different Institutions. */
  | { readonly kind: 'CONFLICT'; readonly institutionIds: readonly string[] };

/**
 * An existing Thoth institution a name search returned for an affiliation or a funder the source does not identify
 * exactly: a suggestion the publisher may choose, never an identity (5562159621 rules 116-117, 5542084141 rule 72).
 */
export type OnixInstitutionCandidate = {
  readonly institutionId: string;
  readonly name: string;
  readonly ror: string;
  readonly doi: string;
};

/** An existing Thoth contributor an exact lookup returned. */
export type OnixMatchedContributor = {
  readonly contributorId: string;
  readonly fullName: string;
  readonly lastName: string;
  readonly firstName: string;
  readonly orcid: string;
  readonly website: string;
  readonly lastContributionTitle: string;
};

/** What Thoth holds for one canonical contributor intent. */
export type OnixContributorLookup = {
  /** The existing contributor the intent's exact ORCID names, which is then who the contributions point at. */
  readonly orcidMatch: OnixMatchedContributor | null;
  /** Contributors a name search returned: never an identity, only alternatives a publisher may pick. */
  readonly alternatives: readonly OnixMatchedContributor[];
};

/**
 * What the adapter's exact lookups established for the descriptive intents of one Work group (thoth-app#183).
 * Lookups decide nothing: the resolver builds every descriptive value from the canonical reductions, these
 * answers and the publisher's decisions.
 */
export type OnixDescriptiveLookups = {
  /** By contributor intent key, for the Work and for every chapter. */
  readonly contributors: Readonly<Record<string, OnixContributorLookup>>;
  /** By canonical ROR, for every affiliation an intent declares. */
  readonly institutions: Readonly<Record<string, OnixInstitutionMatch>>;
  /** By funder key. */
  readonly funders: Readonly<Record<string, OnixInstitutionMatch>>;
  /**
   * By the affiliation or funder text searched for: what Thoth's institution search suggested wherever no exact
   * identity resolved. Suggestions only - the publisher's choice among them is what the plan takes.
   */
  readonly institutionCandidates: Readonly<Record<string, readonly OnixInstitutionCandidate[]>>;
  /** The candidate chapter Work of each chapter ContentItem of the group's representative Product, by path. */
  readonly chapterWorkIds: Readonly<Record<string, WorkId>>;
};

/** What the target adapter made of one Work group's Products. */
export type OnixAdaptedGroup = {
  readonly groupKey: string;
  /** The candidate Work's id in the parsed plan. */
  readonly workId: WorkId;
  /**
   * Work-level facts outside the descriptive slice that the grouped Products did not agree on. Empty when they
   * agree. The descriptive families are reconciled by their canonical reducers instead.
   */
  readonly conflictingFields: readonly string[];
  /** Per Product, a Publication for every PublicationType its manifestation could still become. */
  readonly publications: Readonly<Record<string, Readonly<Partial<Record<PublicationType, OnixAdaptedPublication>>>>>;
  readonly descriptive: OnixDescriptiveLookups;
};

/** The ONIX planning state a parse hands on beside its candidate plan. */
export type OnixParsePlanning = {
  readonly sourcePlan: OnixSourcePlan;
  readonly groups: readonly OnixAdaptedGroup[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Target evidence                                                                                   */
/* ------------------------------------------------------------------------------------------------ */

/** A Publication that already exists in Thoth, as read back from its Work. */
export type OnixExistingPublication = {
  readonly publicationId: string;
  readonly type: PublicationType;
  readonly isbn: string | null;
};

/**
 * The descriptive facts an exactly resolved existing Work holds, read back only to compare the canonical #183
 * reductions of an attaching Product against them. An empty string, a `null` or a zero count means Thoth holds
 * nothing it can compare: the app reads an unset count or page count back as 0.
 */
export type OnixExistingWorkDescriptiveFacts = {
  readonly titles: readonly {
    readonly canonical: boolean;
    readonly title: string;
    readonly subtitle: string;
    readonly fullTitle: string;
    readonly localeCode: string;
  }[];
  readonly languages: readonly { readonly code: string; readonly relation: string }[];
  readonly subjects: readonly { readonly type: string; readonly code: string; readonly ordinal: number }[];
  readonly contributions: readonly {
    readonly type: string;
    readonly orderNumber: number;
    readonly fullName: string;
    readonly orcid: string;
  }[];
  readonly issues: readonly { readonly seriesId: string; readonly seriesName: string; readonly ordinal: number }[];
  readonly status: string;
  readonly publicationDate: string | null;
  readonly withdrawnDate: string | null;
  readonly place: string;
  readonly landingPage: string;
  readonly copyrightHolder: string;
  readonly pageCount: number;
  readonly imageCount: number;
  readonly tableCount: number;
  readonly audioCount: number;
  readonly videoCount: number;
  readonly bibliographyNote: string;
  readonly fundings: readonly {
    readonly institutionId: string;
    readonly institutionRor: string;
    readonly program: string;
    readonly projectName: string;
    readonly projectShortname: string;
    readonly grantNumber: string;
  }[];
};

/** The facts of an exactly resolved existing Work that planning compares against, and nothing more. */
export type OnixExistingWork = {
  readonly workId: WorkId;
  readonly type: WorkType;
  readonly imprintId: string;
  readonly edition: number | null;
  readonly doi: string;
  readonly title: string;
  /** The Work's licence URL as Thoth holds it, or an empty string where it holds none; compared, never written. */
  readonly license: string;
  readonly publications: readonly OnixExistingPublication[];
  readonly descriptive: OnixExistingWorkDescriptiveFacts;
};

/** How one identifier resolved against Thoth, after the exact post-filter. */
export type OnixIdentifierResolution = {
  readonly basis: 'doi' | 'isbn';
  readonly value: string;
  readonly workIds: readonly WorkId[];
};

export type OnixTargetEvidence = {
  readonly publisherId: string;
  readonly identifiers: readonly OnixIdentifierResolution[];
  readonly works: readonly OnixExistingWork[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Publisher decisions                                                                               */
/* ------------------------------------------------------------------------------------------------ */

export const ONIX_MANIFESTATION_OMIT = 'OMIT';

export type OnixManifestationChoice = PublicationType | typeof ONIX_MANIFESTATION_OMIT;

/**
 * The target-side decisions a publisher makes inside the app. Every decision is keyed by the stable
 * record, Product or Work group key it applies to, and applies to this import attempt only.
 */
export type OnixPlanInputs = {
  /** Starts unset: no WorkType is ever preselected. */
  readonly fileWorkType: WorkType | null;
  readonly workTypeOverrides: Readonly<Record<string, WorkType>>;
  readonly manifestationChoices: Readonly<Record<string, OnixManifestationChoice>>;
  readonly editionInputs: Readonly<Record<string, number>>;
  readonly excludedRecordKeys: readonly string[];
  readonly thothCompatibilityConfirmed: boolean;
  /**
   * Answers to descriptive findings (thoth-app#183), keyed by finding key: the chosen option of a choice, or
   * `ACKNOWLEDGED` for an omission the publisher consents to. An answer a finding does not offer is ignored.
   */
  readonly descriptiveChoices: Readonly<Record<string, string>>;
  /**
   * Answers to price decisions (thoth-app#215), keyed by finding key: the key of the source price whose amount the
   * Publication's Price takes, or `ONIX_PRICE_OMIT` for no Price from them. Clearing an optional decision's answer keeps
   * its default. An answer the reduction does not offer is stale, and holds the plan. Absent where none was ever given.
   */
  readonly commercialChoices?: Readonly<Record<string, string>>;
  /**
   * Acknowledgements of rights and contact findings (thoth-app#217), keyed by finding key: `ONIX_RIGHTS_ACKNOWLEDGED`
   * for a Product-rights finding (thoth-app#211) whose approved target-loss path is an acknowledgement, or for a
   * SalesRights or ProductContact finding that offers one. An acknowledgement means only that the import continues
   * while knowingly omitting that source fact; it never creates a target value. An answer the reductions do not offer
   * is stale, and holds the plan. Absent where none was ever given.
   */
  readonly rightsChoices?: Readonly<Record<string, string>>;
};

/** The answer a publisher gives to acknowledge the omission a rights or contact finding describes (thoth-app#217). */
export const ONIX_RIGHTS_ACKNOWLEDGED = 'ACKNOWLEDGED';

/* ------------------------------------------------------------------------------------------------ */
/* The resolved plan                                                                                 */
/* ------------------------------------------------------------------------------------------------ */

export type OnixWorkTypeProvenance = 'STRUCTURAL_RULE' | 'USER_FILE_DEFAULT' | 'USER_WORK_OVERRIDE' | 'EXISTING_TARGET';

export type OnixWorkTypeResolution =
  | { readonly status: 'RESOLVED'; readonly type: WorkType; readonly provenance: OnixWorkTypeProvenance }
  | { readonly status: 'UNRESOLVED' };

export type OnixEditionResolution =
  | {
      readonly status: 'RESOLVED';
      readonly edition: number;
      readonly basis: 'EXPLICIT' | 'DEFAULT_FIRST_EDITION' | 'USER_INPUT' | 'EXISTING_TARGET';
    }
  | { readonly status: 'UNRESOLVED' };

export type OnixWorkTargetAction = 'NEW_WORK' | 'EXISTING_WORK';

export type OnixProductTargetAction =
  | 'CREATE_PUBLICATION'
  | 'CREATE_PUBLICATION_ON_EXISTING_WORK'
  | 'ALREADY_PRESENT'
  | 'OMIT/EXCLUDED';

/** The identity evidence a Product's action rests on. */
export type OnixProductActionEvidence =
  | { readonly kind: 'NO_TARGET_MATCH' }
  | {
      readonly kind: 'ISBN_MATCH';
      readonly isbn: string;
      readonly workId: WorkId;
      readonly publicationId: string | null;
    }
  | { readonly kind: 'THOTH_PUBLICATION_ID'; readonly publicationId: string; readonly workId: WorkId }
  | { readonly kind: 'EXISTING_WORK_WITHOUT_THIS_PUBLICATION'; readonly workId: WorkId }
  | {
      readonly kind: 'MANIFESTATION_OMITTED';
      readonly reason: 'UNREPRESENTABLE' | 'ACKNOWLEDGED' | 'PUBLISHER_CHOICE';
    };

export type OnixWorkTargetEvidence =
  | { readonly kind: 'NO_TARGET_MATCH' }
  | { readonly kind: 'WORK_DOI'; readonly doi: string; readonly workId: WorkId }
  | { readonly kind: 'WORK_ISBN_PROXY'; readonly isbn: string; readonly workId: WorkId }
  | { readonly kind: 'ALTERNATIVE_FORMAT_ISBN'; readonly isbn: string; readonly workId: WorkId }
  | { readonly kind: 'THOTH_NATIVE_IDS'; readonly workId: WorkId };

export type OnixPlannedProduct = {
  readonly productKey: string;
  readonly recordKeys: readonly string[];
  readonly groupKey: string;
  readonly isbn: string | null;
  readonly manifestation: OnixManifestationDecision;
  /** The PublicationType this Product will be created as, when it will be created at all. */
  readonly publicationType: PublicationType | null;
  readonly action: OnixProductTargetAction | null;
  readonly evidence: readonly OnixProductActionEvidence[];
  /**
   * Whether the plan takes the publisher's omission of this Product's Publication. Only where the approved contracts
   * leave one: a format the file leaves open, a package Thoth cannot hold, a type another Product of the Work also
   * takes, or a Publication this import cannot add to an existing Work. Never for a Publication the file resolves.
   * The resolver always states it; a sidecar without it offers no omission.
   */
  readonly omittable?: boolean;
  readonly executable: boolean;
};

export type OnixPlannedWorkGroup = {
  readonly groupKey: string;
  readonly productKeys: readonly string[];
  readonly compatibility: 'GENERIC' | 'THOTH_PROFILE';
  readonly thothVerification: 'NOT_APPLICABLE' | 'VERIFIED' | 'UNVERIFIED' | 'CONTRADICTED';
  readonly target: OnixWorkTargetAction | null;
  readonly existingWorkId: WorkId | null;
  readonly evidence: readonly OnixWorkTargetEvidence[];
  /** The id the Work has in `ImportPlan.works` when this group is created by this import. */
  readonly plannedWorkId: WorkId | null;
  readonly workType: OnixWorkTypeResolution;
  readonly edition: OnixEditionResolution;
  readonly workDoi: OnixWorkDoiDecision;
  readonly executable: boolean;
};

export type OnixPlannedRecord = {
  readonly recordKey: string;
  readonly index: number;
  readonly recordReference: string | null;
  readonly notificationType: string | null;
  readonly disposition: OnixRecordDisposition;
  readonly deletionText: readonly string[];
  readonly productKey: string | null;
  readonly action: 'PLANNED' | 'OMIT/EXCLUDED' | 'BLOCKED';
};

/**
 * The ONIX planning sidecar an `ImportPlan` carries from the planning UI onwards.
 *
 * `works` in the plan holds only what the current executor can faithfully perform. This sidecar holds the
 * whole truth: every record, Product and Work group, the action each resolved to - including actions that
 * are deliberately not executable yet - the evidence each rests on and the publisher decisions applied.
 */
export type OnixImportPlanSidecar = {
  readonly kind: 'onix';
  readonly version: 1;
  readonly header: OnixSourceHeader;
  readonly compatibility: OnixCompatibilityStructure & {
    readonly activation: 'NOT_APPLICABLE' | 'VERIFIED' | 'CONFIRMED' | 'AWAITING_CONFIRMATION' | 'CONTRADICTED';
  };
  readonly records: readonly OnixPlannedRecord[];
  readonly products: readonly OnixPlannedProduct[];
  readonly workGroups: readonly OnixPlannedWorkGroup[];
  readonly inputs: OnixPlanInputs;
  readonly blockers: readonly OnixPlanBlocker[];
  readonly executable: boolean;
  readonly descriptive: OnixDescriptiveSidecar;
  /**
   * The canonical Product-rights reduction the plan was resolved with (thoth-app#211): every Product's rights facts,
   * every rights finding and each grouped Work's licence decision. Absent only where no reduction was given, and then
   * no licence is set.
   */
  readonly rights?: OnixRightsPlan;
  /**
   * The canonical ProductSupply reduction the plan was resolved with (thoth-app#215): every Product's supply, price and
   * supplier website facts, every commercial finding and what each Publication's Prices and Location are. Absent only
   * where no reduction was given, and then no Price or Location is planned.
   */
  readonly commercial?: OnixCommercialPlan;
  /**
   * How each Price of every Publication this plan creates was decided (thoth-app#215): automatically, by the approved
   * reduction, or by the publisher's answer, a declined decision included. Absent where no reduction was given.
   */
  readonly priceResolutions?: readonly OnixResolvedPrice[];
  /**
   * The canonical SalesRights and ProductContact reduction the plan was resolved with (thoth-app#217): every Product's
   * sales rights, ROW rule and contacts, and every finding about them. Absent only where no reduction was given.
   */
  readonly salesRights?: OnixSalesRightsPlan;
  /**
   * What each Work group's `Work.license` becomes as this plan executes it (thoth-app#217; 5568901904 rules 116-124),
   * decided from the rights reduction's licence, the existing Work's licence and the publisher's acknowledgements.
   * Execution sends a licence only for `SET_SUPPORTED_LICENSE`. Absent only where no rights reduction was given.
   */
  readonly licenceActions?: readonly OnixWorkLicenceAction[];
  /** The rights and contact finding keys whose acknowledgements the plan applied, in finding order. */
  readonly acknowledgedRightsFindingKeys?: readonly string[];
};

/** What one Work group's `Work.license` becomes, as the plan executes it (thoth-app#217). */
export type OnixWorkLicenceAction = {
  readonly groupKey: string;
  readonly action: /** No Product gives an eligible licence, and no existing Work holds one: none is set (rule 89). */
  | { readonly kind: 'UNSET' }
    /** A new Work is created with the one supported licence its Products agree on. */
    | { readonly kind: 'SET_SUPPORTED_LICENSE'; readonly identity: OnixLicenceIdentity; readonly url: string }
    /** The licence facts that kept a licence from being set are acknowledged as omitted: no licence is set (rule 34). */
    | { readonly kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS'; readonly findingKeys: readonly string[] }
    /** The existing Work already holds the licence the source states (rule 120): nothing is written. */
    | { readonly kind: 'ALREADY_PRESENT'; readonly identity: OnixLicenceIdentity; readonly url: string }
    /** The existing Work holds a licence and the source states none: it is kept (rule 122). */
    | { readonly kind: 'EXISTING_PRESERVED'; readonly url: string }
    /** No licence action can be decided, for the reasons the blockers give. */
    | { readonly kind: 'BLOCKED' };
};

/** How one Publication's Price in one currency was decided, as the plan executes it. */
export type OnixResolvedPrice = {
  readonly productKey: string;
  readonly findingKey: string;
  readonly currencyCode: string | null;
  /**
   * `AUTOMATIC`: the one ordinary retail amount (rules 27-28), an unanswered optional decision's default included.
   * `PUBLISHER_CHOICE`: the amount of the source price the publisher chose. `PUBLISHER_OMISSION`: the publisher declined
   * every price offered, and no Price is created.
   */
  readonly basis: 'AUTOMATIC' | 'PUBLISHER_CHOICE' | 'PUBLISHER_OMISSION';
  /** The amount the Price is created with; null where none is. */
  readonly unitPrice: number | null;
  /** The source prices the amount is taken from, or every one the publisher declined. */
  readonly locations: readonly OnixSourceLocation[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Descriptive reduction (thoth-app#183)                                                             */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The Work-level descriptive families the canonical reducers of thoth-app#183 own: titles, contributors,
 * languages, subjects, Series membership, extent, ancillary counts, the illustrations note, lifecycle,
 * copyright, funding, the Work landing page and the place of publication.
 */
export type OnixDescriptiveFamily = Exclude<
  OnixCompatibilityFamily,
  'LICENCE' | 'COLLATERAL' | 'REFERENCES' | 'COMPONENTS'
>;

/**
 * How a descriptive source fact stands against Thoth, in the programme's classification vocabulary. A reducer
 * never classifies source validity: that is the canonical validator's alone. `PREFLIGHT_GAP` marks a shape the
 * validator should already have refused, reported rather than repaired.
 */
export type OnixDescriptiveClassification =
  | 'SUPPORTED_NORMALIZED'
  | 'SUPPORTED_WITH_WARNING'
  | 'TARGET_UNREPRESENTABLE'
  | 'TARGET_INPUT_REQUIRED'
  | 'UNKNOWN'
  | 'SOURCE_CONFLICT'
  | 'PREFLIGHT_GAP'
  | 'EXECUTION_DEFERRED';

/** The answer a publisher gives to acknowledge an omission. */
export const ONIX_DESCRIPTIVE_ACKNOWLEDGED = 'ACKNOWLEDGED';

export type OnixDescriptiveOption = {
  readonly key: string;
  /** The source value the option stands for, as the file states it. */
  readonly label: string;
};

/**
 * A value a publisher supplies where the source gives none: a complete calendar date (`YYYY-MM-DD`), a Thoth locale
 * code, or plain text.
 */
export type OnixDescriptiveInput = 'DATE' | 'LOCALE' | 'TEXT';

/** How a publisher can answer a descriptive finding inside the app, if at all. */
export type OnixDescriptiveResolution =
  /** Nothing in the app answers it: the source has to change, or a later task's input does. */
  | { readonly kind: 'NONE' }
  /** The publisher consents to the omission the finding describes; nothing is imported in its place. */
  | { readonly kind: 'ACKNOWLEDGE' }
  /** The publisher picks one of the options the source itself supplies. */
  | { readonly kind: 'CHOICE'; readonly options: readonly OnixDescriptiveOption[] }
  /** The publisher supplies the value: only a valid one answers, and none is ever defaulted or invented. */
  | { readonly kind: 'INPUT'; readonly input: OnixDescriptiveInput };

export type OnixDescriptiveFindingCode =
  | 'TITLE_CANONICAL_MISSING'
  | 'TITLE_CANONICAL_CONFLICT'
  | 'TITLE_ROLE_NOT_REPRESENTED'
  | 'TITLE_TYPE_UNREPRESENTABLE'
  | 'TITLE_LOCALE_UNRESOLVED'
  | 'TITLE_LANGUAGE_CONFLICT'
  | 'TITLE_HEADER_DEFAULT_LANGUAGE'
  | 'TITLE_SCRIPT_NOT_REPRESENTED'
  | 'TITLE_LOCALE_COLLISION'
  | 'TITLE_ELEMENTS_UNREPRESENTABLE'
  | 'TITLE_STRUCTURE_LOSS'
  | 'TITLE_STATEMENT_UNREPRESENTABLE'
  | 'TITLE_MARKUP_UNREPRESENTABLE'
  | 'TITLE_STRUCTURE_UNUSABLE'
  | 'LANGUAGE_RELATION_COLLISION'
  | 'LANGUAGE_RELATION_REQUIRED'
  | 'LANGUAGE_CODE_UNREPRESENTABLE'
  | 'LANGUAGE_ROLE_SCOPED'
  | 'LANGUAGE_VARIANT_NOT_REPRESENTED'
  | 'LANGUAGE_HEADER_DEFAULT'
  | 'LANGUAGE_GROUP_CONFLICT'
  | 'LANGUAGE_SOURCE_CONTRADICTION'
  | 'LANGUAGE_STRUCTURE_UNUSABLE'
  | 'CONTRIBUTOR_ROLE_UNREPRESENTABLE'
  | 'CONTRIBUTOR_ROLE_FACET_LOST'
  | 'CONTRIBUTOR_AGENT_UNREPRESENTABLE'
  | 'CONTRIBUTOR_STATEMENT_UNREPRESENTABLE'
  | 'CONTRIBUTOR_METADATA_UNREPRESENTABLE'
  | 'CONTRIBUTOR_NAME_REQUIRED'
  | 'CONTRIBUTOR_ORCID_CONFLICT'
  | 'CONTRIBUTOR_ORCID_INVALID'
  | 'CONTRIBUTOR_ORCID_NAME_ENRICHED'
  | 'CONTRIBUTOR_LOOKUP_UNAVAILABLE'
  | 'CONTRIBUTOR_IDENTIFIER_UNREPRESENTABLE'
  | 'CONTRIBUTOR_DUPLICATE_IDENTITY'
  | 'CONTRIBUTOR_WEBSITE_CONFLICT'
  | 'CONTRIBUTOR_WEBSITE_UNREPRESENTABLE'
  | 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED'
  | 'CONTRIBUTOR_AFFILIATION_UNRESOLVED'
  | 'CONTRIBUTOR_AFFILIATION_ROR_INVALID'
  | 'CONTRIBUTOR_AFFILIATION_ROR_CONFLICT'
  | 'CONTRIBUTOR_AFFILIATION_IDENTIFIER_UNREPRESENTABLE'
  | 'CONTRIBUTOR_POSITION_CONFLICT'
  | 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED'
  | 'CONTRIBUTOR_BIOGRAPHY_LOCALE_COLLISION'
  | 'CONTRIBUTOR_BIOGRAPHY_CANONICAL_REQUIRED'
  | 'CONTRIBUTOR_BIOGRAPHY_UNREPRESENTABLE'
  | 'CONTRIBUTOR_ORDER_AMBIGUOUS'
  | 'CONTRIBUTOR_ORDER_INCOMPLETE'
  | 'CONTRIBUTOR_MAIN_NORMALISED'
  | 'CONTRIBUTOR_NO_CONTRIBUTOR_CONFLICT'
  | 'CONTRIBUTOR_GROUP_CONFLICT'
  | 'SUBJECT_SCHEME_UNREPRESENTABLE'
  | 'SUBJECT_NAME_AS_SUBJECT_UNREPRESENTABLE'
  | 'SUBJECT_CODE_MISSING'
  | 'SUBJECT_VERSION_UNKNOWN'
  | 'SUBJECT_THEMA_CODE_UNKNOWN'
  | 'SUBJECT_THEMA_DEFAULT_VERSION'
  | 'SUBJECT_BIC_DEPRECATED'
  | 'SUBJECT_PRIMARY_REQUIRED'
  | 'SUBJECT_PRIMARY_AMBIGUOUS'
  | 'SUBJECT_CUSTOM_NAMESPACE_NOT_REPRESENTED'
  | 'SUBJECT_CUSTOM_NAMESPACE_COLLISION'
  | 'SUBJECT_CUSTOM_VALUE_AMBIGUOUS'
  | 'SUBJECT_DUPLICATE_DIFFERS'
  | 'SUBJECT_RECOVERY_MISMATCH'
  | 'SERIES_COLLECTION_TYPE_REQUIRED'
  | 'SERIES_COLLECTION_UNREPRESENTABLE'
  | 'SERIES_TITLE_MISSING'
  | 'SERIES_HIERARCHY_UNREPRESENTABLE'
  | 'SERIES_IDENTIFIER_UNREPRESENTABLE'
  | 'SERIES_SEQUENCE_UNREPRESENTABLE'
  | 'SERIES_ORDINAL_REQUIRED'
  | 'SERIES_ORDINAL_CONFLICT'
  | 'SERIES_ORDINAL_OUT_OF_RANGE'
  | 'SERIES_PART_NUMBER_UNREPRESENTABLE'
  | 'SERIES_METADATA_UNREPRESENTABLE'
  | 'SERIES_TYPE_REQUIRED'
  | 'SERIES_ISSN_ASSIGNMENT_REQUIRED'
  | 'SERIES_MATCH_AMBIGUOUS'
  | 'SERIES_IDENTITY_CONFLICT'
  | 'SERIES_ORDINAL_COLLISION'
  | 'SERIES_GROUP_CONFLICT'
  | 'LIFECYCLE_STATUS_REQUIRED'
  | 'LIFECYCLE_STATUS_NORMALISED'
  | 'LIFECYCLE_STATUS_UNUSABLE'
  | 'LIFECYCLE_REPLACEMENT_UNRESOLVED'
  | 'LIFECYCLE_DATE_REQUIRED'
  | 'LIFECYCLE_DATE_CONFLICT'
  | 'LIFECYCLE_DATE_UNREPRESENTABLE'
  | 'LIFECYCLE_DATE_NOT_STORED'
  | 'LIFECYCLE_DATE_ORDER_INVALID'
  | 'LIFECYCLE_GROUP_CONFLICT'
  | 'COPYRIGHT_NORMALISED'
  | 'COPYRIGHT_UNREPRESENTABLE'
  | 'COPYRIGHT_GROUP_CONFLICT'
  | 'FUNDING_RESEARCH_ONLY_UNREPRESENTABLE'
  | 'FUNDING_ROLE_NORMALISED'
  | 'FUNDING_FUNDER_UNIDENTIFIED'
  | 'FUNDING_FUNDER_UNRESOLVED'
  | 'FUNDING_FUNDER_CONFLICT'
  | 'FUNDING_LOOKUP_UNAVAILABLE'
  | 'FUNDING_IDENTIFIER_UNREPRESENTABLE'
  | 'FUNDING_GROUP_CONFLICT'
  | 'LANDING_PAGE_CHOICE_REQUIRED'
  | 'LANDING_PAGE_UNREPRESENTABLE'
  | 'PLACE_CHOICE_REQUIRED'
  | 'PLACE_UNREPRESENTABLE'
  | 'EXTENT_NORMALISED'
  | 'EXTENT_MAIN_CONTENT_ONLY'
  | 'EXTENT_UNREPRESENTABLE'
  | 'EXTENT_VALUE_CONFLICT'
  | 'ANCILLARY_NORMALISED'
  | 'ANCILLARY_UNREPRESENTABLE'
  | 'ANCILLARY_COUNT_CONFLICT'
  | 'ILLUSTRATIONS_NOTE_UNREPRESENTABLE';

/**
 * One descriptive finding: what a source fact became, or could not become, in Thoth, and why. Every finding is
 * plain serialisable data with a key that depends on the file alone, so a publisher's answer stays bound to it
 * however often the plan is resolved again.
 */
export type OnixDescriptiveFinding = {
  readonly key: string;
  readonly family: OnixDescriptiveFamily;
  readonly code: OnixDescriptiveFindingCode;
  readonly classification: OnixDescriptiveClassification;
  /** Whether the plan may not run while the finding stands unanswered. */
  readonly blocking: boolean;
  /** The Product the fact belongs to, or null for a finding about the grouped Work as a whole. */
  readonly productKey: string | null;
  readonly groupKey: string;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  readonly resolution: OnixDescriptiveResolution;
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

export type OnixDescriptiveCompatibilityOutcome = 'COMPATIBLE' | 'CONTRADICTED' | 'UNVERIFIED';

/** How one descriptive family a would-be attachment asserts compares with the exact existing Work. */
export type OnixDescriptiveCompatibility = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly workId: WorkId;
  readonly family: OnixDescriptiveFamily;
  readonly outcome: OnixDescriptiveCompatibilityOutcome;
  /** Why the family is not simply compatible; empty when it is. */
  readonly reasons: readonly string[];
};

/**
 * The target Contributions one source contributor expands into on one planned Work, by contribution ordinal.
 * Execution creates one new Contributor for all of them rather than one per role, and a contributor chosen
 * instead applies to all of them at once.
 */
export type OnixContributorIntentGroup = {
  readonly workId: WorkId;
  /** The canonical contributor intent: the source Contributor composite it was reduced from. */
  readonly key: string;
  readonly ordinals: readonly number[];
};

/** The Work counts an ancillary-content statement can set. */
export type OnixStatedCountField = 'imageCount' | 'tableCount' | 'audioCount' | 'videoCount';

/** The counts a planned Work's source states, by field: zero included, and nothing for a count it does not state. */
export type OnixStatedCounts = Readonly<Partial<Record<OnixStatedCountField, number>>>;

/**
 * The counts the source states for one planned new Work. A Work entity holds an unset count as 0, so this is how an
 * explicit zero, which Thoth stores (5545670440 rule 102), reaches the mutation as 0 rather than as nothing.
 */
export type OnixStatedWorkCounts = {
  readonly workId: WorkId;
  readonly counts: OnixStatedCounts;
};

/** The descriptive slice of the ONIX planning sidecar. */
export type OnixDescriptiveSidecar = {
  /** Every descriptive finding for the planned Work groups, answered or not. */
  readonly findings: readonly OnixDescriptiveFinding[];
  readonly compatibility: readonly OnixDescriptiveCompatibility[];
  readonly contributorIntents: readonly OnixContributorIntentGroup[];
  readonly statedCounts: readonly OnixStatedWorkCounts[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Product rights (thoth-app#211, Stage A of #184)                                                   */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The target licences an ONIX import may set automatically (ONIX-AUDIT-LICENCE-USAGE-01 rule 16). Thoth's
 * `Work.license` is a single Open Access / public-rights identifier that downstream exporters read as an OA signal,
 * never general licence storage, so no other licence is ever projected to it, whatever URL a source gives.
 */
export type OnixLicenceIdentity =
  | 'CC_BY_4_0'
  | 'CC_BY_SA_4_0'
  | 'CC_BY_ND_4_0'
  | 'CC_BY_NC_4_0'
  | 'CC_BY_NC_SA_4_0'
  | 'CC_BY_NC_ND_4_0'
  | 'CC0_1_0'
  | 'PDM_1_0';

/** A List 218 licence expression type, by what it can be evidence of (rules 22-25). */
export type OnixLicenceExpressionRole =
  /** `01` human readable, `02` professional readable: the Product's own licence. */
  | 'INTRINSIC'
  /** `03`, `04` and `21`: a licence that may be obtained in addition, never the Product's own. */
  | 'ADDITIONAL'
  /** `10` ONIX-PL and `20` ODRL: a machine-readable policy, never a licence identifier. */
  | 'POLICY'
  /** A type List 218 does not hold, which canonical validation should not have admitted. */
  | 'UNRECOGNISED';

/** One EpubLicenseExpression: its declared type and link together, never the link alone (rule 7). */
export type OnixLicenceExpressionFact = OnixSourceLocation & {
  readonly type: string;
  readonly typeName: string | null;
  readonly link: string;
  readonly role: OnixLicenceExpressionRole;
  /** The supported licence an intrinsic link names through the explicit alias table; null for anything else. */
  readonly identity: OnixLicenceIdentity | null;
};

/**
 * One EpubLicenseName: a description of the licence, kept with its language, script and markup provenance (rule 6) and
 * never read as its identity (rule 29). Each is the element's own `language`, `textscript` or `textformat` attribute,
 * or null where it states none. The pinned 3.0 and 3.1 schemas admit only `language` here, so a permitted source
 * leaves the other two null.
 */
export type OnixLicenceNameFact = OnixSourceLocation & {
  readonly name: string;
  readonly language: string | null;
  readonly textScript: string | null;
  readonly textFormat: string | null;
};

/** One EpubLicenseDate (ONIX 3.1): when the licence starts or stops applying (List 260; rules 10, 37). */
export type OnixLicenceDateFact = OnixSourceLocation & {
  readonly role: string;
  readonly date: string;
  readonly dateFormat: string | null;
};

/** One EpubLicense composite, exactly as the source states it. */
export type OnixLicenceFact = OnixSourceLocation & {
  readonly names: readonly OnixLicenceNameFact[];
  readonly expressions: readonly OnixLicenceExpressionFact[];
  readonly dates: readonly OnixLicenceDateFact[];
};

/** One EpubTechnicalProtection code (List 144), kept independently of every other (rule 45). */
export type OnixTechnicalProtectionFact = OnixSourceLocation & { readonly code: string };

/** One EpubUsageLimit, exactly as stated: a quantity in a unit (List 147). */
export type OnixUsageLimitFact = OnixSourceLocation & {
  readonly quantity: string;
  readonly unit: string;
};

/** One EpubUsageConstraint: a usage type (List 145), its status (List 146) and every limit (rules 56-61). */
export type OnixUsageConstraintFact = OnixSourceLocation & {
  readonly type: string;
  readonly status: string;
  readonly limits: readonly OnixUsageLimitFact[];
};

/**
 * What a Product's technical protection facts say together (rules 46-50): `UNKNOWN` when it states none, which is
 * never "no protection"; `NONE` only for explicit code 00; `PROTECTED` for any other code; `CONTRADICTORY` for 00
 * stated beside another code.
 */
export type OnixTechnicalProtectionState = 'UNKNOWN' | 'NONE' | 'PROTECTED' | 'CONTRADICTORY';

/**
 * What a Product's ProductForm says about whether a licence it does not state can matter to its Work (rule 84):
 * `DIGITAL` (delivered electronically, on a digital carrier, a digital product licence, or downloadable or online
 * audio), `PHYSICAL`, or `UNDETERMINED` (an undefined form, or a package), which is never assumed to be physical.
 * A physical Product is neutral only while it states no rights of its own: one that states any takes part as a
 * digital one does.
 */
export type OnixRightsCarrier = 'DIGITAL' | 'PHYSICAL' | 'UNDETERMINED';

/**
 * The part of a Product whose own rights a deferred rights fact is (thoth-app#211; rules 4, 100-115), the innermost
 * that holds it: a ContentItem, a supporting text, a supporting resource version, or a price, whose rights are the
 * ProductSupply contract's. `OTHER` is a place no approved scope names.
 */
export type OnixDeferredRightsScope = 'CONTENT_ITEM' | 'TEXT_CONTENT' | 'RESOURCE_VERSION' | 'PRICE' | 'OTHER';

/** Where a deferred rights fact is stated: its scope, and the element holding it (for `OTHER`, its parent). */
type OnixDeferredRightsPlacement = {
  readonly scope: OnixDeferredRightsScope;
  readonly holder: OnixSourceLocation;
};

/**
 * One rights element a Product states for one of its parts rather than for itself, read into exactly the fact a
 * Product's own would be. Stage A reduces none of them: no licence is decided for the part or from it, nothing floats
 * to the Product or the Work, and each keeps the plan from running (`RIGHTS_SCOPE_DEFERRED`).
 */
export type OnixDeferredRightsFact =
  | (OnixDeferredRightsPlacement & { readonly element: 'EpubLicense' } & OnixLicenceFact)
  | (OnixDeferredRightsPlacement & { readonly element: 'EpubUsageConstraint' } & OnixUsageConstraintFact)
  | (OnixDeferredRightsPlacement & { readonly element: 'EpubTechnicalProtection' } & OnixTechnicalProtectionFact);

/** The intrinsic licence a Product's own EpubLicense expressions establish (rules 26-34). */
export type OnixProductLicence =
  /** No EpubLicense: no licence is expressed, which is not a statement of All Rights Reserved (rule 29). */
  | { readonly kind: 'SILENT' }
  | { readonly kind: 'SUPPORTED'; readonly identity: OnixLicenceIdentity; readonly url: string }
  /** A licence no supported identity names: an unaliased intrinsic link, or a licence with no intrinsic link at all. */
  | { readonly kind: 'UNSUPPORTED' }
  /** Intrinsic expressions naming different supported licences (rule 32). */
  | { readonly kind: 'CONFLICT'; readonly identities: readonly OnixLicenceIdentity[] };

/** Every Product-scoped rights fact of one Product, and the intrinsic licence they establish. */
export type OnixProductRights = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly carrier: OnixRightsCarrier;
  readonly licences: readonly OnixLicenceFact[];
  readonly licence: OnixProductLicence;
  /** Whether any licence states a validity date, which no automatic Work licence can keep (rules 39-41). */
  readonly dated: boolean;
  readonly technicalProtection: readonly OnixTechnicalProtectionFact[];
  readonly technicalProtectionState: OnixTechnicalProtectionState;
  readonly usageConstraints: readonly OnixUsageConstraintFact[];
  /** Every rights element stated for a part of the Product, in source order, kept at its own scope and not reduced. */
  readonly deferredRights: readonly OnixDeferredRightsFact[];
  readonly findingKeys: readonly string[];
};

export type OnixRightsFindingCode =
  | 'RIGHTS_LICENCE_UNSUPPORTED'
  | 'RIGHTS_LICENCE_UNIDENTIFIED'
  | 'RIGHTS_LICENCE_EXPRESSION_CONFLICT'
  | 'RIGHTS_LICENCE_EXPRESSION_UNRECOGNISED'
  | 'RIGHTS_LICENCE_DATED'
  | 'RIGHTS_ADDITIONAL_LICENCE_NOT_REPRESENTED'
  | 'RIGHTS_POLICY_NOT_REPRESENTED'
  | 'RIGHTS_TECHNICAL_PROTECTION_CONTRADICTION'
  | 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE'
  | 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE'
  | 'RIGHTS_USAGE_CONSTRAINT_NOT_REPRESENTED'
  | 'RIGHTS_USAGE_CONSTRAINT_CONFLICT'
  | 'RIGHTS_SCOPE_DEFERRED'
  | 'RIGHTS_LICENCE_GROUP_CONFLICT'
  | 'RIGHTS_LICENCE_GROUP_AMBIGUOUS';

/**
 * How a rights fact stands against Thoth. The reducer never classifies source validity, which is the canonical
 * validator's alone: a valid licence Thoth cannot hold is `TARGET_UNREPRESENTABLE`, never invalid.
 */
export type OnixRightsClassification =
  | 'TARGET_UNREPRESENTABLE'
  | 'TARGET_INPUT_REQUIRED'
  | 'SOURCE_CONFLICT'
  | 'PREFLIGHT_GAP';

/**
 * One rights finding: what a rights fact means for the plan, and why. Stage A offers no answer to any of them: a
 * blocking finding keeps the plan from running until a later #184 stage implements its acknowledgement or input.
 */
export type OnixRightsFinding = {
  readonly key: string;
  readonly code: OnixRightsFindingCode;
  readonly classification: OnixRightsClassification;
  readonly blocking: boolean;
  /** The Product the fact belongs to, or null for a finding about the grouped Work as a whole. */
  readonly productKey: string | null;
  readonly groupKey: string;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

/** What a grouped Work's `Work.license` becomes (rules 116-118). */
export type OnixWorkLicenceDecision =
  /** No Product gives an eligible licence: none is set, and nothing is inferred (rule 89). */
  | { readonly kind: 'UNSET' }
  /** The one supported licence the Work's Products agree on, with the Products and expressions that justify it. */
  | {
      readonly kind: 'SET_SUPPORTED_LICENSE';
      readonly identity: OnixLicenceIdentity;
      readonly url: string;
      readonly productKeys: readonly string[];
      readonly locations: readonly OnixSourceLocation[];
    }
  /** No licence can be set automatically, for the reasons the findings give. */
  | { readonly kind: 'BLOCKED'; readonly findingKeys: readonly string[] };

export type OnixRightsGroup = {
  readonly groupKey: string;
  readonly licence: OnixWorkLicenceDecision;
};

/** The canonical Product-rights reduction of one ONIX message: pure, deterministic and serialisable. */
export type OnixRightsPlan = {
  readonly products: Readonly<Record<string, OnixProductRights>>;
  readonly groups: Readonly<Record<string, OnixRightsGroup>>;
  /** Every finding, in the order it was raised: Products in file order, then their grouped Works. */
  readonly findings: readonly OnixRightsFinding[];
};

/* ------------------------------------------------------------------------------------------------ */
/* ProductSupply, prices and Publication Locations (thoth-app#215, Stage B of #184)                  */
/* ------------------------------------------------------------------------------------------------ */

/** Whether a Price states a value itself, inherits it from a valid Header default, or has none (rule 4). */
export type OnixCommercialValueOrigin = 'EXPLICIT' | 'HEADER_DEFAULT' | 'ABSENT';

/** A code a Price states or inherits, with where the effective value is stated. */
export type OnixEffectiveCode = {
  readonly value: string | null;
  readonly origin: OnixCommercialValueOrigin;
  readonly location: OnixSourceLocation | null;
};

/*
 * How the commercial source facts are kept. Every composite the pinned ONIX 3.0 and 3.1 schemas define in ProductSupply
 * is a typed fact at its own canonical path, with the path its source states it at. A value stated once in a composite
 * is a field of that composite, exactly as stated; a value its composite may state several times is a located fact of
 * its own. Nothing is re-typed, defaulted or interpreted: a code is its code-list value, and a quantity, a rate or an
 * amount the literal the file gives. Contact points are kept as stated too: they are source facts of the file the
 * publisher supplied, and stay in the plan beside it.
 */

/** A value stated in an element of its own, exactly as stated. */
export type OnixStatedValue = OnixSourceLocation & { readonly value: string };

/**
 * A name, description or note, with the language and text format its element declares. An XHTML text holding child
 * elements keeps only its bare text in the adapter value, and `markupNotKept` says so.
 */
export type OnixStatedText = OnixStatedValue & {
  readonly language: string | null;
  readonly textFormat: string | null;
  readonly markupNotKept: boolean;
};

/** An identifier composite: its type code, the proprietary name of that type where it has one, and its value. */
export type OnixStatedIdentifier = OnixSourceLocation & OnixQualifiedIdentifier;

/** The contact points a party or a contact states, every value where it is stated. */
export type OnixContactPointsFact = {
  readonly telephoneNumbers: readonly OnixStatedValue[];
  readonly faxNumbers: readonly OnixStatedValue[];
  readonly emailAddresses: readonly OnixStatedValue[];
};

/** A Territory, exactly as stated: never evaluated as geography here, and never a Location platform (rules 9-10). */
export type OnixTerritoryFact = OnixSourceLocation & {
  readonly countriesIncluded: string | null;
  readonly regionsIncluded: string | null;
  readonly countriesExcluded: string | null;
  readonly regionsExcluded: string | null;
};

/** A SalesOutlet a SalesRestriction names: its identifiers and name. */
export type OnixSalesOutletFact = OnixSourceLocation & {
  readonly identifiers: readonly OnixStatedIdentifier[];
  readonly name: string | null;
};

/**
 * One SalesRestriction exactly as stated: its type (List 71), outlets, notes and dates. It is a supply fact here and
 * nothing more: what it means for where the Product may be sold is the SalesRights stage's to decide (#184).
 */
export type OnixSalesRestrictionFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly outlets: readonly OnixSalesOutletFact[];
  readonly notes: readonly OnixStatedText[];
  readonly startDate: string | null;
  readonly startDateFormat: string | null;
  readonly endDate: string | null;
  readonly endDateFormat: string | null;
};

/** One Market: the geography and commercial scope of its ProductSupply. */
export type OnixMarketFact = OnixSourceLocation & {
  readonly territory: OnixTerritoryFact | null;
  readonly salesRestrictions: readonly OnixSalesRestrictionFact[];
};

/**
 * A dated fact: its role code (List 163, 166 or 173) and its date, with the format a `dateformat` attribute or an
 * ONIX 3.0 DateFormat element declares.
 */
export type OnixSupplyDateFact = OnixSourceLocation & {
  readonly role: string;
  readonly date: string;
  readonly dateFormat: string | null;
};

/** One Website: its role, if it states one, its descriptions and every link it gives, in source order (rules 38-42). */
export type OnixSupplierWebsiteFact = OnixSourceLocation & {
  readonly role: string | null;
  readonly descriptions: readonly OnixStatedText[];
  readonly links: readonly (OnixSourceLocation & { readonly link: string })[];
};

/** One PublisherRepresentative: the market's agent (List 69 role), exactly as stated. */
export type OnixPublisherRepresentativeFact = OnixSourceLocation &
  OnixContactPointsFact & {
    readonly role: string | null;
    readonly identifiers: readonly OnixStatedIdentifier[];
    readonly name: string | null;
    readonly websites: readonly OnixSupplierWebsiteFact[];
  };

/** The postal address an ONIX 3.1 contact states. */
export type OnixPostalAddressFact = {
  readonly streetAddress: string | null;
  readonly locationName: string | null;
  readonly postalCode: string | null;
  readonly regionCode: string | null;
  readonly countryCode: string | null;
};

/**
 * One contact a ProductSupply names, exactly as stated: a SupplyContact of a SupplyDetail (List 239 role) or a
 * ProductContact of a MarketPublishingDetail (List 198 role). A ProductContact is kept as a supply fact only: what it
 * means is the ProductContact stage's to decide (#184).
 */
export type OnixSupplyContactFact = OnixSourceLocation &
  OnixContactPointsFact & {
    readonly role: string | null;
    readonly identifiers: readonly OnixStatedIdentifier[];
    /** The SupplyContactName or ProductContactName. */
    readonly name: string | null;
    readonly contactName: string | null;
    readonly address: OnixPostalAddressFact | null;
  };

/**
 * One MarketPublishingDetail: the market's own publishing status and dates, which are never the Work's lifecycle
 * (rule 15), and everything else it states about the market, exactly as stated.
 */
export type OnixMarketPublishingFact = OnixSourceLocation & {
  readonly publisherRepresentatives: readonly OnixPublisherRepresentativeFact[];
  readonly productContacts: readonly OnixSupplyContactFact[];
  readonly status: string | null;
  readonly statusNotes: readonly OnixStatedText[];
  readonly dates: readonly OnixSupplyDateFact[];
  readonly promotionCampaigns: readonly OnixStatedText[];
  /** An ONIX 3.0 PromotionContact. */
  readonly promotionContact: OnixStatedText | null;
  readonly initialPrintRuns: readonly OnixStatedText[];
  readonly reprintDetails: readonly OnixStatedText[];
  readonly copiesSold: readonly OnixStatedText[];
  readonly bookClubAdoptions: readonly OnixStatedText[];
};

/** The party one SupplyDetail names: a supply-chain party, never a Thoth platform or the publisher (rules 45, 8). */
export type OnixSupplierFact = OnixSourceLocation &
  OnixContactPointsFact & {
    readonly role: string | null;
    readonly name: string | null;
    readonly identifiers: readonly OnixStatedIdentifier[];
    readonly websites: readonly OnixSupplierWebsiteFact[];
  };

/** A NewSupplier: the party that will supply the Product instead, exactly as stated, never a Location of it. */
export type OnixNewSupplierFact = OnixSourceLocation &
  OnixContactPointsFact & {
    readonly identifiers: readonly OnixStatedIdentifier[];
    readonly name: string | null;
    readonly websites: readonly OnixSupplierWebsiteFact[];
  };

/** One SupplierOwnCoding: a supplier's own code (List 165 type), exactly as stated. */
export type OnixSupplierOwnCodingFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly typeName: string | null;
  readonly value: string | null;
};

/** One ReturnsConditions composite: a returns code in the scheme its type names (List 53), with its notes. */
export type OnixReturnsConditionsFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly typeName: string | null;
  readonly code: string | null;
  readonly notes: readonly OnixStatedText[];
};

/** One StockQuantityCoded: a coded stock level (List 70 type). */
export type OnixStockQuantityCodedFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly typeName: string | null;
  readonly code: string | null;
};

/** One OnOrderDetail: a quantity on order and when it is expected. */
export type OnixStockOnOrderFact = OnixSourceLocation & {
  readonly onOrder: string | null;
  readonly proximity: string | null;
  readonly expectedDate: string | null;
  readonly expectedDateFormat: string | null;
};

/** One Velocity: a rate of sale in a metric (List 216). */
export type OnixStockVelocityFact = OnixSourceLocation & {
  readonly metric: string | null;
  readonly rate: string | null;
  readonly proximity: string | null;
};

/** One stock quantity a Stock states at its top level, with the Proximity (List 215) that qualifies it, if any. */
export type OnixStockQuantityFact = OnixSourceLocation & {
  readonly element: 'OnHand' | 'Reserved' | 'OnOrder' | 'CBO';
  readonly value: string;
  /** The Proximity the validated ordered source states straight after this quantity; null where it states none. */
  readonly proximity: OnixStatedValue | null;
};

/**
 * How a Stock's top-level Proximity elements stand against its quantities (Specification Amendment 2A):
 * `ORDERED_SOURCE`, associated from the order the validated canonical normalised source states them in;
 * `NOT_ESTABLISHED`, the ordered source was not given, so none is associated; `NO_PROXIMITY`, the Stock states none.
 */
export type OnixStockProximityAssociation = 'ORDERED_SOURCE' | 'NOT_ESTABLISHED' | 'NO_PROXIMITY';

/**
 * One Stock composite, exactly as stated. Which quantity a top-level Proximity qualifies is established only from the
 * validated canonical normalised source, whose order the adapter value does not keep; nothing is associated otherwise.
 */
export type OnixStockFact = OnixSourceLocation & {
  readonly locationIdentifiers: readonly OnixStatedIdentifier[];
  readonly locationNames: readonly OnixStatedText[];
  readonly quantitiesCoded: readonly OnixStockQuantityCodedFact[];
  /** Every top-level quantity, in source order. */
  readonly quantities: readonly OnixStockQuantityFact[];
  readonly proximityAssociation: OnixStockProximityAssociation;
  /** Every top-level Proximity no quantity is established to take, each where it is stated. */
  readonly unassociatedProximities: readonly OnixStatedValue[];
  readonly onOrderDetails: readonly OnixStockOnOrderFact[];
  readonly velocities: readonly OnixStockVelocityFact[];
};

/** One ComparisonProductPrice: another Product's price, kept as comparison metadata and never a target Price. */
export type OnixComparisonPriceFact = OnixSourceLocation & {
  readonly productIdentifiers: readonly OnixStatedIdentifier[];
  readonly type: string | null;
  readonly amount: string | null;
  readonly currency: string | null;
};

/** One PriceConditionQuantity: a quantity (List 168 type) in a unit (List 169). */
export type OnixPriceConditionQuantityFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly quantity: string | null;
  readonly unit: string | null;
};

/** One PriceCondition (List 167), with its quantities and the Products it relates to. */
export type OnixPriceConditionFact = OnixSourceLocation & {
  readonly type: string;
  readonly quantities: readonly OnixPriceConditionQuantityFact[];
  readonly productIdentifiers: readonly OnixStatedIdentifier[];
};

/** One PriceConstraintLimit: a quantity in a unit (List 147). */
export type OnixPriceConstraintLimitFact = OnixSourceLocation & {
  readonly quantity: string | null;
  readonly unit: string | null;
};

/** One PriceConstraint: a constraint type (List 230), its status (List 146) and every limit. */
export type OnixPriceConstraintFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly status: string | null;
  readonly limits: readonly OnixPriceConstraintLimitFact[];
};

/** One BatchBonus: the free copies a batch quantity earns. */
export type OnixBatchBonusFact = OnixSourceLocation & {
  readonly batchQuantity: string | null;
  readonly freeQuantity: string | null;
};

/** One DiscountCoded: a discount code in the scheme its type names (List 100). */
export type OnixDiscountCodedFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly typeName: string | null;
  readonly code: string | null;
};

/** One Discount: its type (List 170), quantity band, percentage and amount. */
export type OnixDiscountFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly quantity: string | null;
  readonly toQuantity: string | null;
  readonly percent: string | null;
  readonly amount: string | null;
};

/** A PriceCoded: a price code in the scheme its type names (List 179), stated instead of an amount. */
export type OnixPriceCodedFact = OnixSourceLocation & {
  readonly type: string | null;
  readonly typeName: string | null;
  readonly code: string | null;
};

/** One Tax composite: the tax type (List 171), rate code (List 62), rate, amounts and the price part it applies to. */
export type OnixTaxFact = OnixSourceLocation & {
  readonly productIdentifiers: readonly OnixStatedIdentifier[];
  readonly pricePartDescriptions: readonly OnixStatedText[];
  readonly type: string | null;
  readonly rateCode: string | null;
  readonly ratePercent: string | null;
  readonly taxableAmount: string | null;
  readonly taxAmount: string | null;
};

/**
 * A rights element a Price states, named where it is. What it states, and what that means, is the Product-rights
 * reduction's (thoth-app#211): it holds the element's facts at this same path, scoped to this Price.
 */
export type OnixPriceRightsTermFact = OnixSourceLocation & {
  readonly element: 'EpubTechnicalProtection' | 'EpubLicense';
};

/** One Price composite, with every value it states or inherits, before any currency is reconciled (rule 19). */
export type OnixPriceFact = OnixSourceLocation & {
  readonly identifiers: readonly OnixStatedIdentifier[];
  /** List 58, stated or inherited from the Header. */
  readonly type: OnixEffectiveCode;
  readonly typeDescriptions: readonly OnixStatedText[];
  /** List 59. */
  readonly qualifier: string | null;
  readonly rightsTerms: readonly OnixPriceRightsTermFact[];
  readonly constraints: readonly OnixPriceConstraintFact[];
  /** List 60. */
  readonly per: string | null;
  readonly conditions: readonly OnixPriceConditionFact[];
  readonly minimumOrderQuantity: string | null;
  readonly batchBonuses: readonly OnixBatchBonusFact[];
  readonly discountsCoded: readonly OnixDiscountCodedFact[];
  readonly discounts: readonly OnixDiscountFact[];
  /** List 61. */
  readonly status: string | null;
  /** The PriceAmount exactly as stated; null where the Price states none. */
  readonly amount: string | null;
  readonly coded: OnixPriceCodedFact | null;
  readonly taxes: readonly OnixTaxFact[];
  /** An ONIX 3.1 TaxExempt, which states its fact by being there. */
  readonly taxExempt: OnixSourceLocation | null;
  /** The unpriced reason (List 57) the Price states instead of an amount. */
  readonly unpricedItemType: string | null;
  /** List 96, stated or inherited from the Header. */
  readonly currency: OnixEffectiveCode;
  readonly territory: OnixTerritoryFact | null;
  /** An ONIX 3.0 CurrencyZone (List 172). */
  readonly currencyZone: string | null;
  readonly comparisons: readonly OnixComparisonPriceFact[];
  readonly dates: readonly OnixSupplyDateFact[];
  /** List 174. */
  readonly printedOnProduct: string | null;
  /** List 142. */
  readonly positionOnProduct: string | null;
};

/**
 * An ONIX 3.0 Reissue: the date and description of a reissue, and the prices that will apply from it, which are never
 * read as current prices (rule 30).
 */
export type OnixReissueFact = OnixSourceLocation & {
  readonly date: string | null;
  readonly dateFormat: string | null;
  readonly description: OnixStatedText | null;
  readonly prices: readonly OnixPriceFact[];
  /** Its SupportingResource composites, kept where they are: a resource is the collateral stage's to read (#185). */
  readonly supportingResources: readonly OnixSourceLocation[];
};

/** One SupplyDetail: one supplier's supply of the Product in its market, with everything it states. */
export type OnixSupplyDetailFact = OnixSourceLocation & {
  readonly supplier: OnixSupplierFact | null;
  readonly supplyContacts: readonly OnixSupplyContactFact[];
  readonly supplierOwnCodings: readonly OnixSupplierOwnCodingFact[];
  readonly returnsConditions: readonly OnixReturnsConditionsFact[];
  /** The supplier's ProductAvailability (List 65): supply evidence, never the Work's lifecycle (rules 11-13). */
  readonly availability: string | null;
  /** SupplyDate composites (List 166), never a Work publication or withdrawn date (rule 14). */
  readonly supplyDates: readonly OnixSupplyDateFact[];
  /** Days to fulfil an order, as stated. */
  readonly orderTime: string | null;
  readonly newSupplier: OnixNewSupplierFact | null;
  readonly stocks: readonly OnixStockFact[];
  readonly packQuantity: string | null;
  readonly palletQuantity: string | null;
  readonly orderQuantityMinimums: readonly OnixStatedValue[];
  readonly orderQuantityMultiple: string | null;
  /** The unpriced reason (List 57) the SupplyDetail states instead of any Price. */
  readonly unpricedItemType: string | null;
  readonly prices: readonly OnixPriceFact[];
  readonly reissue: OnixReissueFact | null;
};

/** One ProductSupply: one market's supply of the Product, kept whole (rules 1-3). */
export type OnixProductSupplyFact = OnixSourceLocation & {
  /** An ONIX 3.1 MarketReference. */
  readonly marketReference: string | null;
  readonly markets: readonly OnixMarketFact[];
  readonly marketPublishing: OnixMarketPublishingFact | null;
  readonly supplyDetails: readonly OnixSupplyDetailFact[];
};

/** The answer that declines a price decision: the Publication is created with no Price from the prices it offers. */
export const ONIX_PRICE_OMIT = 'OMIT';

/**
 * One source price a publisher may choose as a Publication's Price in its currency (rules 25, 29, 32), with what choosing
 * it leaves behind: Thoth's Price holds an amount and a currency and nothing else the file says about it.
 */
export type OnixPriceCandidate = OnixSourceLocation & {
  /** The answer that chooses it: its canonical path, which depends on the file alone. */
  readonly key: string;
  readonly currencyCode: string;
  /** The PriceAmount exactly as stated. */
  readonly amount: string;
  /** The positive amount it states. */
  readonly unitPrice: number;
  /** Its PriceType, stated or inherited. */
  readonly priceType: string | null;
  /** Why it is never taken automatically; empty for an ordinary retail price another amount contradicts. */
  readonly exclusions: readonly OnixPriceExclusion[];
  /** Every semantic choosing it would not record, in fixed order (rules 26, 30-32). */
  readonly lost: readonly string[];
  /** Each of those facts, with its values. */
  readonly lostFacts: readonly string[];
  /** Display-ready English: its amount, where it is stated and what the file says about it. */
  readonly label: string;
};

/**
 * What the prices a Product states in one currency come to for its Publication, which Thoth holds at most one Price for
 * (rules 20, 25, 27-29): the one ordinary retail amount they agree on, that amount as a default the publisher may replace
 * or decline, or a decision only the publisher takes.
 */
export type OnixPriceDecision =
  | {
      /** The one ordinary retail amount, with no other amount in the currency the publisher could take instead (rules 27-28). */
      readonly kind: 'SET';
      readonly currencyCode: string;
      readonly unitPrice: number;
      /** Every eligible source Price stating the amount, in source order. */
      readonly locations: readonly OnixSourceLocation[];
      readonly findingKey: string;
    }
  | {
      /**
       * The one ordinary retail amount is the Price by default (rule 27), and every price in the currency never taken
       * automatically stays an optional alternative (rule 25; Specification Amendment 2B): the publisher may take one of
       * them instead, or `ONIX_PRICE_OMIT` for no Price. No answer keeps the default; nothing waits on one.
       */
      readonly kind: 'DEFAULT_WITH_ALTERNATIVES';
      readonly currencyCode: string;
      /** The default amount. */
      readonly unitPrice: number;
      /** Every ordinary retail source price stating the default, in source order. */
      readonly locations: readonly OnixSourceLocation[];
      /** Every price in the currency never taken automatically, in source order. */
      readonly alternatives: readonly OnixPriceCandidate[];
      readonly findingKey: string;
    }
  | {
      /**
       * The publisher chooses one candidate's amount, or `ONIX_PRICE_OMIT`: nothing is chosen, or omitted, for them.
       * `AMOUNT_CONFLICT`: ordinary retail prices state different amounts no source order may choose between (rule 29).
       * `NOT_AUTOMATIC`: the only prices are ones never taken automatically (rules 23-25, 32).
       */
      readonly kind: 'CHOICE_REQUIRED';
      readonly reason: 'AMOUNT_CONFLICT' | 'NOT_AUTOMATIC';
      /** The currency the Price would be in; null for a coded price stating none. */
      readonly currencyCode: string | null;
      /** Every price the publisher may choose, in source order: none for a coded price, which only declining answers. */
      readonly candidates: readonly OnixPriceCandidate[];
      readonly locations: readonly OnixSourceLocation[];
      readonly findingKey: string;
    };

/**
 * What a Publication's type demands of its canonical Location (rules 54-55): a Paperback or Hardback needs at least one
 * URL, every other type both a landing page and a full text URL.
 */
export type OnixLocationCarrier = 'PHYSICAL' | 'DIGITAL';

/** One Location the Supplier websites of one supply context state, exact-equivalent candidates being one (rule 50). */
export type OnixLocationCandidate = {
  readonly landingPage: string;
  readonly fullTextUrl: string;
  readonly platform: LocationPlatform;
  /** Every WebsiteLink stating it, in source order. */
  readonly locations: readonly OnixSourceLocation[];
};

/** Which Location, if any, a Publication of one carrier is created with. */
export type OnixLocationDecision =
  /** No candidate can be canonical: the Publication is created with no Location (rules 53, 59). */
  | { readonly kind: 'NONE' }
  /** Exactly one candidate can be canonical, and is (rule 57). */
  | { readonly kind: 'CANONICAL'; readonly candidate: OnixLocationCandidate }
  /** Which Location is canonical cannot be told from the file (rule 58). */
  | { readonly kind: 'INPUT_REQUIRED'; readonly findingKeys: readonly string[] };

/** What a Publication of one carrier comes to, and the findings that apply to it alone. */
export type OnixCarrierCommercial = {
  readonly location: OnixLocationDecision;
  readonly findingKeys: readonly string[];
};

/** Every commercial fact of one Product, and what they come to for its Publication. */
export type OnixProductCommercial = {
  readonly productKey: string;
  readonly groupKey: string;
  /** Every ProductSupply the Product states, in source order. */
  readonly supplies: readonly OnixProductSupplyFact[];
  /** One decision per currency any eligible price states, by currency code. */
  readonly prices: readonly OnixPriceDecision[];
  /** By carrier, for every carrier the PublicationTypes the Product's manifestation could become have. */
  readonly carriers: Readonly<Partial<Record<OnixLocationCarrier, OnixCarrierCommercial>>>;
};

export type OnixCommercialFindingCode =
  | 'PRICE_REDUCED'
  | 'PRICE_AMOUNT_CONFLICT'
  | 'PRICE_UNPRICED'
  | 'PRICE_COMPARISON_NOT_REPRESENTED'
  | 'PRICE_AMOUNT_UNUSABLE'
  | 'PRICE_CURRENCY_ABSENT'
  | 'PRICE_CURRENCY_UNSUPPORTED'
  | 'PRICE_NOT_AUTOMATIC'
  | 'PRICE_CANDIDATE_NOT_TAKEN'
  | 'SUPPLY_NOT_REPRESENTED'
  | 'SUPPLY_SHAPE_UNEXPECTED'
  | 'LOCATION_INCOMPLETE'
  | 'LOCATION_CANONICAL_AMBIGUOUS'
  | 'LOCATION_NOT_CANONICAL'
  | 'LOCATION_PAIRING_AMBIGUOUS'
  | 'LOCATION_URL_UNREPRESENTABLE'
  | 'LOCATION_WEBSITE_NOT_USED';

/** Why a Price is never reduced to Thoth's generic unit price automatically (rules 23-25). */
export type OnixPriceExclusion =
  | 'TYPE_ABSENT'
  | 'TYPE_NOT_CONSUMER_RETAIL'
  | 'QUALIFIED'
  | 'PER_UNIT'
  | 'PROVISIONAL'
  | 'CONDITIONAL'
  | 'QUANTITY_CONDITION'
  | 'CONSTRAINED'
  | 'OWN_RIGHTS_TERMS'
  | 'CODED';

/**
 * How a commercial fact stands against Thoth, in the programme's classification vocabulary. The reducer never classifies
 * source validity, which is the canonical validator's alone.
 */
export type OnixCommercialClassification =
  | 'SUPPORTED_WITH_WARNING'
  | 'TARGET_UNREPRESENTABLE'
  | 'TARGET_INPUT_REQUIRED'
  | 'PREFLIGHT_GAP'
  | 'EXECUTION_DEFERRED';

/** How a publisher can answer a commercial finding inside the app, if at all. */
export type OnixCommercialResolution =
  /** Nothing in the app answers it. */
  | { readonly kind: 'NONE' }
  /** A price decision the plan waits on: one candidate's key, or `ONIX_PRICE_OMIT`, answers it. */
  | {
      readonly kind: 'PRICE_CHOICE';
      readonly currencyCode: string | null;
      readonly candidates: readonly OnixPriceCandidate[];
    }
  /**
   * An optional price decision (Specification Amendment 2B): the default stands unless one candidate's key, or
   * `ONIX_PRICE_OMIT`, answers it. Nothing waits on it.
   */
  | {
      readonly kind: 'PRICE_OVERRIDE';
      readonly currencyCode: string;
      readonly defaultUnitPrice: number;
      readonly defaultLocations: readonly OnixSourceLocation[];
      readonly candidates: readonly OnixPriceCandidate[];
    };

/** One commercial finding: what a supply, price or website fact means for the plan, and why. */
export type OnixCommercialFinding = {
  readonly key: string;
  readonly code: OnixCommercialFindingCode;
  readonly classification: OnixCommercialClassification;
  /** Whether the plan may not create the Product's Publication while the finding stands. */
  readonly blocking: boolean;
  readonly productKey: string;
  readonly groupKey: string;
  /** The carrier of Publication the finding applies to alone; null where it applies whatever the Publication's type. */
  readonly carrier: OnixLocationCarrier | null;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  readonly resolution: OnixCommercialResolution;
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

/** The canonical commercial reduction of one ONIX message: pure, deterministic and serialisable. */
export type OnixCommercialPlan = {
  readonly products: Readonly<Record<string, OnixProductCommercial>>;
  /** Every finding, in the order it was raised: Products in file order. */
  readonly findings: readonly OnixCommercialFinding[];
};

/* ------------------------------------------------------------------------------------------------ */
/* SalesRights, territories and ProductContacts (thoth-app#217, Stage C of #184)                      */
/* ------------------------------------------------------------------------------------------------ */

/**
 * What a List 46 code means (ONIX-AUDIT-SALES-RIGHTS-CONTACT-01 rules 15-17, 21): for sale on exclusive rights (01,
 * deprecated 07) or non-exclusive rights (02, deprecated 08), not for sale (03-06), unknown or unstated (00, valid only
 * as a ROWSalesRightsType), or a code the list does not hold.
 */
export type OnixSalesRightsSemantics =
  | 'FOR_SALE_EXCLUSIVE'
  | 'FOR_SALE_NON_EXCLUSIVE'
  | 'NOT_FOR_SALE'
  | 'UNKNOWN'
  | 'UNRECOGNISED';

/** One SalesRights composite exactly as stated (rule 12): its type, Territory, restrictions and equivalent product. */
export type OnixSalesRightsFact = OnixSourceLocation & {
  readonly type: string;
  readonly semantics: OnixSalesRightsSemantics;
  /** Whether the type is one of the deprecated List 46 codes 07 and 08, still valid source data (rule 17). */
  readonly deprecated: boolean;
  /** The Territory as stated; null where the composite states none, which the validator owns. */
  readonly territory: OnixTerritoryFact | null;
  readonly salesRestrictions: readonly OnixSalesRestrictionFact[];
  /** The equivalent product's identifiers for the territory, inside this rights scope only (rules 47-49). */
  readonly equivalentProducts: readonly OnixStatedIdentifier[];
  /** The equivalent product's PublisherName and PublisherNameInverted values, likewise scoped. */
  readonly equivalentPublisherNames: readonly OnixStatedValue[];
};

/** The ROWSalesRightsType: the rights in every territory no SalesRights names, kept apart from them (rule 13). */
export type OnixRowSalesRightsFact = OnixSourceLocation & {
  readonly type: string;
  readonly semantics: OnixSalesRightsSemantics;
};

/** Where a ProductContact is stated: for the whole Product, or for one ProductSupply's markets (rules 50, 57). */
export type OnixProductContactScope =
  | { readonly kind: 'PUBLISHING_DETAIL' }
  | {
      readonly kind: 'MARKET';
      readonly productSupply: OnixSourceLocation;
      /** The Territory of every Market of that ProductSupply, exactly as stated. */
      readonly marketTerritories: readonly OnixTerritoryFact[];
    };

/** One ProductContact exactly as stated, with its scope (rules 50-53, 63-64). */
export type OnixProductContactFact = OnixSupplyContactFact & { readonly scope: OnixProductContactScope };

/** The sales rights, ROW rule and contacts one Product states. */
export type OnixProductSalesRights = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly salesRights: readonly OnixSalesRightsFact[];
  readonly rowSalesRightsType: OnixRowSalesRightsFact | null;
  readonly productContacts: readonly OnixProductContactFact[];
  readonly findingKeys: readonly string[];
};

export type OnixSalesRightsFindingCode =
  /** A single simple positive WORLD statement: disclosed, not blocking (rule 27). */
  | 'SALES_RIGHTS_NOT_REPRESENTED'
  /** A territorial for-sale contract beyond that: partitions, exclusions, restrictions or deprecated codes (rule 28). */
  | 'SALES_RIGHTS_TERRITORY_NOT_REPRESENTED'
  | 'SALES_RIGHTS_NOT_FOR_SALE_NOT_REPRESENTED'
  | 'SALES_RIGHTS_ROW_NOT_REPRESENTED'
  | 'SALES_RIGHTS_ROW_UNKNOWN'
  | 'SALES_RIGHTS_TYPE_DEPRECATED'
  | 'SALES_RIGHTS_TYPE_UNEXPECTED'
  | 'SALES_RESTRICTION_NOT_REPRESENTED'
  | 'SALES_RIGHTS_EQUIVALENT_PRODUCT_NOT_REPRESENTED'
  | 'SALES_RIGHTS_CONFLICT'
  | 'SALES_RIGHTS_TERRITORY_NOT_ESTABLISHED'
  | 'SALES_RIGHTS_MARKET_CONTRADICTION'
  | 'SALES_RIGHTS_MARKET_UNKNOWN'
  | 'PRODUCT_CONTACT_NOT_REPRESENTED'
  | 'PRODUCT_CONTACT_ROLE_UNEXPECTED';

export type OnixSalesRightsClassification =
  | 'SUPPORTED_WITH_WARNING'
  | 'TARGET_UNREPRESENTABLE'
  | 'TARGET_INPUT_REQUIRED'
  | 'SOURCE_CONFLICT'
  | 'PREFLIGHT_GAP';

/** How a publisher can answer a SalesRights or ProductContact finding inside the app, if at all. */
export type OnixSalesRightsResolution =
  /** Nothing in the app answers it: a disclosure, a source conflict, or a gap. */
  | { readonly kind: 'NONE' }
  /** The publisher continues while knowingly omitting the source fact; nothing is imported in its place (rule 32). */
  | { readonly kind: 'ACKNOWLEDGE' };

/**
 * One SalesRights or ProductContact finding. Its detail and message carry codes, roles, scopes, counts and paths only:
 * never a raw email, telephone, fax or postal value (rules 65-66), which stay in the Product's facts for the preview.
 */
export type OnixSalesRightsFinding = {
  readonly key: string;
  readonly code: OnixSalesRightsFindingCode;
  readonly classification: OnixSalesRightsClassification;
  readonly blocking: boolean;
  readonly productKey: string;
  readonly groupKey: string;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  readonly resolution: OnixSalesRightsResolution;
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

/** The canonical SalesRights and ProductContact reduction of one ONIX message: pure, deterministic and serialisable. */
export type OnixSalesRightsPlan = {
  readonly products: Readonly<Record<string, OnixProductSalesRights>>;
  /** Every finding, in the order it was raised: Products in file order. */
  readonly findings: readonly OnixSalesRightsFinding[];
};
