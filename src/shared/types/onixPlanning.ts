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
  | 'RIGHTS_PREFLIGHT_GAP';

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
};

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
