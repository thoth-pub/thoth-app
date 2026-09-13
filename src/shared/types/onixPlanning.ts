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
  | 'EXISTING_WORK_UNAUTHORIZED'
  | 'ATTACH_TO_EXISTING_WORK_DEFERRED'
  | 'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED'
  | 'THOTH_PROFILE_CONTRADICTED';

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

/** What the target adapter made of one Work group's Products. */
export type OnixAdaptedGroup = {
  readonly groupKey: string;
  /** The candidate Work's id in the parsed plan. */
  readonly workId: WorkId;
  /** Work-level facts the grouped Products did not agree on. Empty when they agree. */
  readonly conflictingFields: readonly string[];
  /** Per Product, a Publication for every PublicationType its manifestation could still become. */
  readonly publications: Readonly<Record<string, Readonly<Partial<Record<PublicationType, OnixAdaptedPublication>>>>>;
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

/** The facts of an exactly resolved existing Work that planning compares against, and nothing more. */
export type OnixExistingWork = {
  readonly workId: WorkId;
  readonly type: WorkType;
  readonly imprintId: string;
  readonly edition: number | null;
  readonly doi: string;
  readonly title: string;
  readonly publications: readonly OnixExistingPublication[];
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
};
