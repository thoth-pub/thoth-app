import type { AbstractType, LocationPlatform, ResourceType } from '@/gql/graphql';
import type { LanguageEntity } from '@/src/entities/language/model/language.types';
import type { PublicationEntity, PublicationType } from '@/src/entities/publication/model/publication.types';
import type { SubjectEntity } from '@/src/entities/subject/model/subject.types';
import type { WorkId, WorkStatus, WorkType } from '@/src/entities/work/model/work.types';

import type { AccessibilityExceptionType, AccessibilityStandardType } from './accessibility';
import type { ImportIssue } from './importIssues';
import type { ImportedMarkupFormat } from './markdown';
import type { PlannedTitleEntity } from './parsers';

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

/**
 * One ContentItem, classified by the approved ContentDetail rule alone (5541336717 rules 1-4): TextItemType 02, 03 and 04
 * are structural chapters, 01 a complete embedded Work, an AVItem an audiovisual item, and anything else an unsupported
 * form. Classification decides nothing about the item: what each becomes is the canonical component reduction's
 * (thoth-app#223).
 */
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
  /**
   * A ContentItem no component reduction plans (`detail.kind` its classification): the plan was resolved without the
   * canonical component reduction (thoth-app#223), which alone decides a complete embedded Work, an AVItem or an
   * unsupported form - and without it a chapter too, unless the adapter's own reduction came with its candidate - or the
   * item belongs to a Work this import does not create. Never answered: the reduction, or the Work, has to be there.
   */
  | 'COMPONENT_UNSUPPORTED'
  /**
   * An unresolved blocking finding of the canonical component reduction (thoth-app#223), by how it can be answered; the
   * finding itself - its code, the component, its exact source locations and English explanation - is in the sidecar's
   * `components.findings` under `detail.findingKey`, or among the findings the publisher's answers raised.
   */
  | 'COMPONENT_CHOICE_REQUIRED'
  | 'COMPONENT_INPUT_REQUIRED'
  | 'COMPONENT_ACKNOWLEDGEMENT_REQUIRED'
  | 'COMPONENT_SOURCE_CONFLICT'
  | 'COMPONENT_UNREPRESENTABLE'
  | 'COMPONENT_PREFLIGHT_GAP'
  | 'COMPONENT_EXECUTION_DEFERRED'
  /**
   * A component answer the reduction does not offer (`detail.answer`): a choice it does not list, an input that is no
   * valid value, or an answer to a component fact this plan does not hold as it was answered. Never applied and never
   * replaced by a default, it holds the plan until it is corrected or cleared.
   */
  | 'COMPONENT_CHOICE_STALE'
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
  | 'PRODUCT_CONTACT_PREFLIGHT_GAP'
  /**
   * A Publication accessibility decision the publisher has not taken (thoth-app#221): which of several supported values
   * the source asserts the one target field takes, or whether its standards or its EAA exception are kept. The finding is
   * in the sidecar's `accessibility.findings` under `detail.findingKey`; nothing is chosen for the publisher.
   */
  | 'ACCESSIBILITY_CHOICE_REQUIRED'
  /** A material accessibility loss the publisher has not acknowledged (thoth-app#221), likewise in `accessibility.findings`. */
  | 'ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED'
  /**
   * An accessibility fact whose target meaning is not decided (thoth-app#221): a report URL stated for an audiobook, a
   * reading-system statement with no rights reduction to read it with, a shape canonical validation should have refused,
   * or an existing Publication that could not be read back.
   */
  | 'ACCESSIBILITY_PREFLIGHT_GAP'
  /**
   * An accessibility answer the reduction does not offer (`detail.answer`): never ignored and never applied, it holds the
   * plan until it is corrected or cleared.
   */
  | 'ACCESSIBILITY_CHOICE_STALE'
  /**
   * The source would fill accessibility fields an existing Publication leaves empty, and nothing it holds disagrees: a
   * bounded enrichment this import plans but cannot perform, because no existing Publication is updated (#187).
   */
  | 'ACCESSIBILITY_EXISTING_ENRICHMENT_DEFERRED'
  /** The source's accessibility differs from what an existing Publication holds, which this import never overwrites. */
  | 'ACCESSIBILITY_EXISTING_CONFLICT'
  /**
   * A legally, regulatorily or operationally material ProductFormFeature Thoth cannot record, whose omission the publisher
   * has not acknowledged (thoth-app#221); the finding is in `accessibility.findings`.
   */
  | 'PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED'
  /**
   * An unresolved blocking finding of the canonical RelatedMaterial relation reconciliation (thoth-app#224), by how it can
   * be answered: the finding itself - its code, the declarations it is about, their exact source locations and English
   * explanation - is in the sidecar's `relatedMaterial.findings` under `detail.findingKey`.
   */
  | 'RELATION_CHOICE_REQUIRED'
  | 'RELATION_ACKNOWLEDGEMENT_REQUIRED'
  | 'RELATION_SOURCE_CONFLICT'
  | 'RELATION_UNREPRESENTABLE'
  | 'RELATION_PREFLIGHT_GAP'
  /** A reconciled non-chapter Work relation this plan holds, whose creation is #187's: never silently left out. */
  | 'RELATION_EXECUTION_DEFERRED'
  /** An unresolved blocking finding of the canonical RelatedProduct/34 Reference reduction (thoth-app#224). */
  | 'REFERENCE_ACKNOWLEDGEMENT_REQUIRED'
  | 'REFERENCE_SOURCE_CONFLICT'
  | 'REFERENCE_PREFLIGHT_GAP'
  /**
   * A relation or Reference answer the reductions do not offer (`detail.answer`): never applied and never read as consent,
   * it holds the plan until it is corrected or cleared.
   */
  | 'RELATED_MATERIAL_CHOICE_STALE'
  /**
   * An attaching Product's canonical Reference sequence differs from the exact existing Work's References (#224 Amendment
   * 1): the existing Work is never updated, so the attachment cannot go ahead.
   */
  | 'EXISTING_WORK_REFERENCE_CONTRADICTION'
  /**
   * An unresolved blocking finding of the canonical collateral reduction (thoth-app#225), by how it can be answered: a choice
   * or an input waits on the publisher, a loss on its acknowledgement, a planned AdditionalResource on #187, which creates
   * it, and anything else on nothing the app can give. The finding itself - its code, the TextContent, SupportingResource
   * or promotional event it is about, their exact source locations and English explanation - is in the sidecar's
   * `collateral.findings` under `detail.findingKey`; a Work group whose collateral was never reduced says so in
   * `detail.reason` (`COLLATERAL_NOT_REDUCED`).
   */
  | 'COLLATERAL_CHOICE_REQUIRED'
  | 'COLLATERAL_INPUT_REQUIRED'
  | 'COLLATERAL_ACKNOWLEDGEMENT_REQUIRED'
  | 'COLLATERAL_EXECUTION_DEFERRED'
  | 'COLLATERAL_PREFLIGHT_GAP'
  /**
   * A collateral answer the reduction does not offer (`detail.answer`): never applied and never read as consent, it holds
   * the plan until it is corrected or cleared.
   */
  | 'COLLATERAL_CHOICE_STALE';

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
  /**
   * The canonical component reduction the adapter built this group's candidate chapter Works from (thoth-app#223): the
   * one it was given, or its own of the same message. Absent from an adaptation made before that reduction existed.
   */
  readonly components?: OnixComponentPlan;
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
  /**
   * The four accessibility fields the Publication holds, as the Work fragment already returns them (thoth-app#221):
   * only ever compared with the source's accessibility, never written. An empty report URL is read back as null.
   */
  readonly accessibility: OnixPublicationAccessibilityState;
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
  /**
   * Answers to Publication accessibility and ProductFormFeature findings (thoth-app#221), keyed by finding key: one of the
   * options a choice offers, or `ONIX_ACCESSIBILITY_ACKNOWLEDGED` for a loss the publisher consents to. An answer the
   * reduction does not offer is stale, and holds the plan. Absent where none was ever given.
   */
  readonly accessibilityChoices?: Readonly<Record<string, string>>;
  /**
   * Answers to component and contained-Work findings (thoth-app#223), keyed by finding key: one of the options a choice
   * offers (a contained Work's WorkType or status, a chapter's page range), a value an input asks for (a positive whole
   * relation ordinal, a complete calendar date), or `ONIX_COMPONENT_ACKNOWLEDGED` for a loss the publisher consents to.
   * Every key is bound to the exact component fact it answers, so an answer never carries over to a changed fact. An
   * answer the reduction does not offer is stale, and holds the plan. Absent where none was ever given.
   */
  readonly componentChoices?: Readonly<Record<string, string>>;
  /**
   * Answers to RelatedMaterial relation and Reference findings (thoth-app#224), keyed by finding key: one of the options a
   * choice offers (whether a Product-level relation is projected to its Works, which way an other-language version runs),
   * or `ONIX_RELATED_MATERIAL_ACKNOWLEDGED` for an omission the publisher consents to. Every key is bound to the exact
   * declarations and endpoints it answers, so an answer never carries over to a changed fact. An answer the reductions do
   * not offer is stale, and holds the plan. Absent where none was ever given.
   */
  readonly relatedMaterialChoices?: Readonly<Record<string, string>>;
  /**
   * Answers to collateral findings (thoth-app#225), keyed by finding key: one of the options a choice offers (which of
   * several texts a one-value target takes, which abstract locale is canonical, whether a SupportingResource becomes an
   * AdditionalResource), a Thoth locale an untagged or unmappable text is in, or `ONIX_COLLATERAL_ACKNOWLEDGED` for a loss
   * the publisher consents to. Every key is bound to the exact source facts it answers, so an answer never carries over to
   * a changed fact. An answer the reduction does not offer is stale, and holds the plan. Absent where none was ever given.
   */
  readonly collateralChoices?: Readonly<Record<string, string>>;
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
  /**
   * The canonical ProductFormFeature and accessibility reduction the plan was resolved with (thoth-app#221): every
   * Product-level ProductFormFeature, every accessibility candidate and every finding about them. Absent only where no
   * reduction was given, and then no Publication accessibility is planned.
   */
  readonly accessibility?: OnixAccessibilityPlan;
  /**
   * What each Publication this plan creates or finds already in Thoth has for accessibility (thoth-app#221): the four
   * fields a new Publication is created with, with the source facts behind each and every candidate left out, or how the
   * source compares with an existing Publication, which is never updated. Absent where no reduction was given.
   */
  readonly accessibilityActions?: readonly OnixPublicationAccessibilityAction[];
  /**
   * The canonical component reduction the plan was resolved with (thoth-app#223): every ContentItem of every Product,
   * exactly as its normalised source states it, and every finding about it. Absent only where no reduction was given,
   * and then no component is planned but a chapter the adapter's own reduction came with.
   */
  readonly components?: OnixComponentPlan;
  /**
   * What each component of each Work this import creates becomes, as the plan resolves it (thoth-app#223): a structural
   * BookChapter with its ordinal, pages and DOI; a contained Work with its WorkType, imprint, edition, lifecycle and
   * `IsPartOf` ordinal, whose creation waits on #187; an audiovisual item omitted with an acknowledged loss; or a
   * component that cannot be planned. Set by the resolver whenever a component reduction is available to it.
   */
  readonly componentIntents?: readonly OnixComponentIntent[];
  /**
   * The canonical RelatedMaterial reduction the plan was resolved with and what it comes to (thoth-app#224): every
   * RelatedWork and RelatedProduct declaration with its outcome, the reconciled non-chapter Work relation graph, and each
   * Work's ordered References with how an attaching Product's compare with an existing Work's. Absent only where no
   * reduction was given, and then no relation is planned and no Reference is created.
   */
  readonly relatedMaterial?: OnixRelatedMaterialSidecar;
  /**
   * The canonical collateral reduction the plan was resolved with and what it comes to (thoth-app#225): every TextContent,
   * SupportingResource and promotional event of every Product and ContentItem exactly as stated, the abstracts, table of
   * contents and general note each Work, chapter and contained Work takes, and every AdditionalResource intent with the
   * losses it carries. Absent only where no reduction was given, and then no collateral is planned.
   */
  readonly collateral?: OnixCollateralSidecar;
  /**
   * Every finding of every reduction and of the resolver's own existing-Work licence reconciliation, once each, in one
   * vocabulary (thoth-app#217, Correction 2 of the #218 review; for thoth-app#186): its family, code, classification,
   * whether it blocks, what answer it offers and how it stands against the inputs. Each `key` is the key blockers name
   * in `detail.findingKey`, and the key the family's own list holds. Set by the resolver whenever it runs.
   */
  readonly findings?: readonly OnixPlanFinding[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Canonical plan findings (thoth-app#217; consumed by thoth-app#186)                                */
/* ------------------------------------------------------------------------------------------------ */

/** The reduction, or the resolver's reconciliation, a plan finding comes from. */
export type OnixPlanFindingFamily =
  | 'DESCRIPTIVE'
  | 'RIGHTS'
  | 'COMMERCIAL'
  | 'SALES_RIGHTS'
  | 'PRODUCT_CONTACT'
  | 'LICENCE_RECONCILIATION'
  | 'ACCESSIBILITY'
  | 'PRODUCT_FORM_FEATURE'
  | 'ACCESSIBILITY_RECONCILIATION'
  | 'COMPONENT'
  | 'RELATION'
  | 'REFERENCE'
  | 'COLLATERAL';

/** The programme's classification vocabulary, the union of every family's. */
export type OnixPlanFindingClassification =
  | 'SUPPORTED_NORMALIZED'
  | 'SUPPORTED_WITH_WARNING'
  | 'TARGET_UNREPRESENTABLE'
  | 'TARGET_INPUT_REQUIRED'
  | 'UNKNOWN'
  | 'SOURCE_CONFLICT'
  | 'PREFLIGHT_GAP'
  | 'EXECUTION_DEFERRED';

export type OnixPlanFindingOption = { readonly key: string; readonly label: string };

/** How a publisher can answer a plan finding inside the app, if at all: the union of every family's resolutions. */
export type OnixPlanFindingResolution =
  | { readonly kind: 'NONE' }
  /** The publisher consents to the omission the finding describes; nothing is imported in its place. */
  | { readonly kind: 'ACKNOWLEDGE' }
  /** The publisher picks one option; a price decision offers its source prices and `ONIX_PRICE_OMIT`. */
  | { readonly kind: 'CHOICE'; readonly options: readonly OnixPlanFindingOption[] }
  | { readonly kind: 'INPUT'; readonly input: OnixDescriptiveInput | OnixComponentInput };

/** How a plan finding stands against the inputs: `REJECTED` is an answer given that the plan cannot use (stale or invalid). */
export type OnixPlanFindingAnswer =
  | { readonly state: 'NOT_APPLICABLE' }
  | { readonly state: 'UNANSWERED' }
  | { readonly state: 'ANSWERED'; readonly value: string }
  | { readonly state: 'REJECTED'; readonly value: string };

/** One plan finding in the canonical vocabulary; never a raw contact value (5543566392 rules 65-66). */
export type OnixPlanFinding = {
  readonly family: OnixPlanFindingFamily;
  readonly key: string;
  readonly code: string;
  readonly classification: OnixPlanFindingClassification;
  readonly blocking: boolean;
  readonly productKey: string | null;
  readonly groupKey: string;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  readonly resolution: OnixPlanFindingResolution;
  readonly answer: OnixPlanFindingAnswer;
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

/** What one Work group's `Work.license` becomes, as the plan executes it (thoth-app#217). */
export type OnixWorkLicenceAction = {
  readonly groupKey: string;
  readonly action: /** No Product gives an eligible licence, and no existing Work holds one: none is set (rule 89). */
  | { readonly kind: 'UNSET' }
    /** A new Work is created with the one supported licence its Products agree on. */
    | { readonly kind: 'SET_SUPPORTED_LICENSE'; readonly identity: OnixLicenceIdentity; readonly url: string }
    /**
     * The licence facts that kept a licence from being set are acknowledged as omitted, or the publisher decided that
     * a supported licence the source states is not written to an existing Work holding none: no licence is set (rule 34).
     */
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
 * copyright, funding, the Work landing page and the place of publication - and the Work's front cover
 * (thoth-app#219), the one SupportingResource role this stage maps, with the caption of the cover it selects
 * (thoth-app#225). `COVER` is no compatibility family: an existing Work's collateral stays the COLLATERAL family's,
 * which no approved existing-target comparison yet discharges.
 */
export type OnixDescriptiveFamily =
  | Exclude<OnixCompatibilityFamily, 'LICENCE' | 'COLLATERAL' | 'REFERENCES' | 'COMPONENTS'>
  | 'COVER';

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
  | 'ILLUSTRATIONS_NOTE_UNREPRESENTABLE'
  | 'COVER_CHOICE_REQUIRED'
  | 'COVER_DECISION_CANDIDATE'
  | 'COVER_UNREPRESENTABLE'
  | 'COVER_DETAIL_NOT_IMPORTED'
  /** Distinct captions for the one cover the plan selects: Work.coverCaption holds one, never several (rule 101). */
  | 'COVER_CAPTION_CHOICE_REQUIRED';

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

/**
 * One supplier stating a planned Location (thoth-app#219 Specification Amendment 1): the Supplier of one SupplyDetail,
 * as the file identifies it. Its contact points stay with the supply facts.
 */
export type OnixLocationSupplier = OnixSourceLocation & {
  /** The SupplyDetail whose Supplier it is. */
  readonly supplyDetail: OnixSourceLocation;
  readonly role: string | null;
  readonly name: string | null;
  readonly identifiers: readonly OnixStatedIdentifier[];
  /** Every WebsiteLink of this Supplier stating the Location, in source order. */
  readonly links: readonly OnixSourceLocation[];
};

/** What one planned Location is to a Publication of one carrier, and the findings that say so. */
export type OnixPlannedLocationRole = {
  readonly role: /** The Location the Publication is created with (rule 57). */
  | 'CANONICAL'
    /** A Location beside the canonical one (rules 56, 60): planned, and created only once Location execution is ordered (#187). */
    | 'NON_CANONICAL'
    /** Whether it is the canonical Location cannot be told from the file (rule 58, or an unpaired supply context): none is chosen. */
    | 'UNDECIDED'
    /** It cannot be canonical, and no canonical Location exists for it to follow (rule 59). */
    | 'NOT_CREATED';
  readonly findingKeys: readonly string[];
};

/**
 * One planned Location of a Product (thoth-app#219 Specification Amendment 1): one distinct target Location its supplier
 * websites state, with every supplier stating it. Identical target Locations of several suppliers are one planned
 * Location keeping each supplier; different URLs are always different planned Locations.
 */
export type OnixPlannedLocation = OnixLocationCandidate & {
  /** Every supplier stating it, in source order. */
  readonly suppliers: readonly OnixLocationSupplier[];
  /** For every carrier the Product's Publication could have, what this Location is to it. */
  readonly carriers: Readonly<Partial<Record<OnixLocationCarrier, OnixPlannedLocationRole>>>;
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
  /**
   * Every Location the Product's supplier websites state, in source order, whatever execution can create today
   * (thoth-app#219 Specification Amendment 1). Only a carrier's `CANONICAL` decision is executed; the rest wait on #187.
   */
  readonly plannedLocations: readonly OnixPlannedLocation[];
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
  /** The family the finding belongs to in the plan-wide vocabulary: a sales-rights fact, or a product contact. */
  readonly family: 'SALES_RIGHTS' | 'PRODUCT_CONTACT';
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

/* ------------------------------------------------------------------------------------------------ */
/* ProductFormFeature and Publication accessibility (thoth-app#221, the accessibility slice of #184) */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The ONIX general attributes one element states (`generalAttributes` of the pinned 3.0 and 3.1 schemas), each exactly as
 * stated and null where the element states none: when the data element was last changed or confirmed (`datestamp`), the
 * authority it comes from (`sourcename`) and the kind of authority that is (`sourcetype`, List 3). They are provenance,
 * kept with the element they are stated on; nothing is ever written from them.
 */
export type OnixGeneralAttributes = {
  readonly datestamp: string | null;
  readonly sourceName: string | null;
  readonly sourceType: string | null;
};

/**
 * A ProductFormFeatureType or ProductFormFeatureValue element exactly as stated, at its own path, with the general
 * attributes the element itself states: the only attributes the pinned schemas admit on it besides `refname` and
 * `shortname`, which the schemas fix to the element's own name and which therefore say nothing more.
 */
export type OnixProductFormFeatureElement = OnixSourceLocation & {
  readonly value: string;
  readonly attributes: OnixGeneralAttributes;
};

/**
 * One ProductFormFeatureDescription exactly as stated, at its own path, with its `language` and the general attributes it
 * states. These are all the pinned 3.0 and 3.1 schemas admit on it (`generalAttributes` and `languageAttribute`); it has
 * no `textscript` or `textformat`, so none is read or modelled.
 */
export type OnixProductFormFeatureDescriptionFact = OnixSourceLocation & {
  readonly text: string;
  readonly language: string | null;
  readonly attributes: OnixGeneralAttributes;
};

/**
 * What a ProductFormFeature is to this import, by its List 79 type alone (ONIX-AUDIT-ACCESSIBILITY-01 rules 11-18):
 * `ACCESSIBILITY` (09), the only type reduced towards Publication fields; `FORMAT_EVIDENCE` (10, 15, 16), consistency
 * evidence for the manifestation decision only, never a PublicationType; `MATERIAL`, a hazard, safety, dangerous-goods,
 * access-control or regulatory fact whose omission needs an acknowledgement (rule 17); and `OTHER`.
 */
export type OnixProductFormFeatureRole = 'ACCESSIBILITY' | 'FORMAT_EVIDENCE' | 'MATERIAL' | 'OTHER';

/**
 * One Product-level ProductFormFeature exactly as stated, every repeat kept in source order at its own path, with every
 * element it states and the general attributes stated on each: the composite's own, its type's, its value's and each
 * description's (rules 1-5; #221). `type` and `value` repeat the stated type and value as plain text for convenience.
 */
export type OnixProductFormFeatureFact = OnixSourceLocation & {
  /** The ProductFormFeatureType (List 79) as stated. */
  readonly type: string;
  /** The ProductFormFeatureValue as stated; null where the composite states none. */
  readonly value: string | null;
  /** The general attributes the ProductFormFeature composite itself states. */
  readonly attributes: OnixGeneralAttributes;
  /** The ProductFormFeatureType element; null only where the composite states none, which canonical validation refuses. */
  readonly typeElement: OnixProductFormFeatureElement | null;
  /** The ProductFormFeatureValue element; null where the composite states none. */
  readonly valueElement: OnixProductFormFeatureElement | null;
  readonly descriptions: readonly OnixProductFormFeatureDescriptionFact[];
  readonly role: OnixProductFormFeatureRole;
};

/** The Publication accessibility fields, as the database holds them (thoth#893 Architecture Amendment 3). */
export type OnixPublicationAccessibilityState = {
  readonly accessibilityStandard: AccessibilityStandardType | null;
  readonly accessibilityAdditionalStandard: AccessibilityStandardType | null;
  readonly accessibilityException: AccessibilityExceptionType | null;
  readonly accessibilityReportUrl: string | null;
};

export type OnixAccessibilityField = keyof OnixPublicationAccessibilityState;

/**
 * One value a Publication accessibility field could take from the source, with exactly the List 196 codes whose explicit
 * combination asserts it (rules 28-50, 63-65, 78). A standard is never inferred from a lone version, a lone level or a
 * feature code, and a value is the answer that chooses it.
 */
export type OnixAccessibilityCandidate = {
  readonly field: OnixAccessibilityField;
  readonly value: string;
  /** The value as the app names it, with the codes that assert it. */
  readonly label: string;
  /** The additional-standard family, which decides the Publications it can be held by; null for any other field. */
  readonly family: 'EPUB' | 'PDF' | null;
  /** The List 196 codes whose combination asserts it, in code order. */
  readonly codes: readonly string[];
  /** Every ProductFormFeature (or, for a report URL, every description) stating it, in source order. */
  readonly locations: readonly OnixSourceLocation[];
};

/**
 * Which Publications may hold accessibility fields at all, by the database contract (Amendment 3): none on Paperback or
 * Hardback, and no standard or exception on MP3 or WAV, whose report URL semantics are not decided (#221).
 */
export type OnixAccessibilityScope = 'PHYSICAL' | 'AUDIO' | 'DIGITAL';

/** What a Product's type-09 facts can become for its Publication as one PublicationType, and the findings that say so. */
export type OnixPublicationAccessibilityReduction = {
  readonly publicationType: PublicationType;
  readonly scope: OnixAccessibilityScope;
  /** The additional standards this type can hold: EPUB Accessibility on EPUB, PDF/UA on PDF, none on any other type. */
  readonly additionalStandards: readonly OnixAccessibilityCandidate[];
  /** The additional standards the source asserts that this type cannot hold (rule 48). */
  readonly incompatibleAdditionalStandards: readonly OnixAccessibilityCandidate[];
  /** The findings about this type alone, in the order they were raised. */
  readonly findingKeys: readonly string[];
};

/**
 * Every Product-level ProductFormFeature of one Product, and what its type-09 facts assert. Accessibility is reduced for
 * each Product alone (rules 21-22): nothing here is shared with, or unioned across, another Product of its Work.
 */
export type OnixProductAccessibility = {
  readonly productKey: string;
  readonly groupKey: string;
  /** Every Product-level ProductFormFeature, in source order, whatever its type. */
  readonly features: readonly OnixProductFormFeatureFact[];
  /** Every distinct WCAG value an explicit version and level assert together, in the app's standard order. */
  readonly primaryStandards: readonly OnixAccessibilityCandidate[];
  /** Every distinct EPUB Accessibility or PDF/UA value the source asserts exactly, whatever the Publication's type. */
  readonly additionalStandards: readonly OnixAccessibilityCandidate[];
  readonly exceptions: readonly OnixAccessibilityCandidate[];
  /** Every distinct web-page URL a code-96 description gives. */
  readonly reportUrls: readonly OnixAccessibilityCandidate[];
  /** By PublicationType, for every type the Product's manifestation could still become. */
  readonly publications: Readonly<Partial<Record<PublicationType, OnixPublicationAccessibilityReduction>>>;
  /** The findings about the Product whatever its Publication's type, in the order they were raised. */
  readonly findingKeys: readonly string[];
};

export type OnixAccessibilityFindingCode =
  /** A type-09 fact Thoth has no Publication field for (rules 51-53, 71-83), kept and shown. */
  | 'ACCESSIBILITY_FACT_NOT_REPRESENTED'
  /** A description beside a mapped code, which the target value does not keep (rules 27, 66). */
  | 'ACCESSIBILITY_DESCRIPTION_NOT_REPRESENTED'
  /** A code-96 description that is no web-page URL Thoth can hold. */
  | 'ACCESSIBILITY_REPORT_URL_UNUSABLE'
  /** Type-09 facts a Paperback, Hardback, MP3 or WAV Publication does not take (rule 20; #221 manifestation rules). */
  | 'ACCESSIBILITY_NOT_PROJECTED'
  /** A code-96 report URL stated for an MP3 or WAV Publication, whose semantics are not decided (#221). */
  | 'ACCESSIBILITY_AUDIO_REPORT_URL_UNRESOLVED'
  /** Code 10 with no rights reduction to show its usage-constraint exceptions beside it (rules 18, 58-62). */
  | 'ACCESSIBILITY_READING_OPTIONS_NOT_RECONCILED'
  /** A type-09 shape canonical validation should have refused: no value, or a value List 196 does not hold. */
  | 'ACCESSIBILITY_SHAPE_UNEXPECTED'
  /** Several distinct supported WCAG values for the one primary field (rule 37). */
  | 'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED'
  /** Several distinct additional standards the Publication's type could hold (rule 49). */
  | 'ACCESSIBILITY_ADDITIONAL_CHOICE_REQUIRED'
  /** Several distinct EAA exceptions for the one exception field (rule 68). */
  | 'ACCESSIBILITY_EXCEPTION_CHOICE_REQUIRED'
  /** Several distinct code-96 URLs for the one report URL field (rule 79). */
  | 'ACCESSIBILITY_REPORT_URL_CHOICE_REQUIRED'
  /** Standards and an EAA exception, which one Publication never holds together (Amendment 3). */
  | 'ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED'
  /** An additional standard with no primary WCAG standard to accompany it, which Thoth cannot hold (Amendment 3). */
  | 'ACCESSIBILITY_ADDITIONAL_WITHOUT_PRIMARY'
  /** An additional standard the Publication's type cannot hold (rule 48). */
  | 'ACCESSIBILITY_ADDITIONAL_INCOMPATIBLE'
  /** Unknown or limited accessibility (08, 09) beside a standard the Publication keeps (rules 55-56). */
  | 'ACCESSIBILITY_STATUS_NOT_REPRESENTED'
  /** A non-09 ProductFormFeature Thoth has no target for (rules 12-18). */
  | 'PRODUCT_FORM_FEATURE_NOT_REPRESENTED';

export type OnixAccessibilityClassification =
  | 'SUPPORTED_WITH_WARNING'
  | 'TARGET_UNREPRESENTABLE'
  | 'TARGET_INPUT_REQUIRED'
  | 'PREFLIGHT_GAP';

/** How a publisher can answer an accessibility or ProductFormFeature finding inside the app, if at all. */
export type OnixAccessibilityResolution =
  | { readonly kind: 'NONE' }
  /** The publisher continues while knowingly omitting the facts the finding names; nothing is imported in their place. */
  | { readonly kind: 'ACKNOWLEDGE' }
  /** The publisher picks one option; none starts chosen. */
  | { readonly kind: 'CHOICE'; readonly options: readonly OnixPlanFindingOption[] };

/** The answer that acknowledges an accessibility or ProductFormFeature loss (thoth-app#221). */
export const ONIX_ACCESSIBILITY_ACKNOWLEDGED = 'ACKNOWLEDGED';
/** The primary-standard answer that sets no primary standard, and so no additional one either (rule 37). */
export const ONIX_ACCESSIBILITY_OMIT = 'OMIT';
/** The standard-or-exception answers: keep the standards and omit every exception, or the reverse. */
export const ONIX_ACCESSIBILITY_KEEP_STANDARDS = 'STANDARDS';
export const ONIX_ACCESSIBILITY_KEEP_EXCEPTION = 'EXCEPTION';

/**
 * One accessibility or ProductFormFeature finding. Its key depends on the file alone - the Product, the PublicationType
 * where it is about one type, and the exact facts - so an answer stays bound to the facts it was given for.
 */
export type OnixAccessibilityFinding = {
  readonly family: 'ACCESSIBILITY' | 'PRODUCT_FORM_FEATURE';
  readonly key: string;
  readonly code: OnixAccessibilityFindingCode;
  readonly classification: OnixAccessibilityClassification;
  /** Whether the Publication may not be planned while the finding stands unanswered. */
  readonly blocking: boolean;
  readonly productKey: string;
  readonly groupKey: string;
  /** The PublicationType the finding is about alone; null where it holds whatever the Publication's type. */
  readonly publicationType: PublicationType | null;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  readonly resolution: OnixAccessibilityResolution;
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

/** The canonical ProductFormFeature and accessibility reduction of one ONIX message: pure, deterministic, serialisable. */
export type OnixAccessibilityPlan = {
  readonly products: Readonly<Record<string, OnixProductAccessibility>>;
  /** Every finding, in the order it was raised: Products in file order. */
  readonly findings: readonly OnixAccessibilityFinding[];
};

/** Where a planned accessibility value comes from: the source alone, or the publisher's answer to a choice. */
export type OnixAccessibilityFieldSource = {
  readonly field: OnixAccessibilityField;
  readonly value: string;
  readonly basis: 'AUTOMATIC' | 'PUBLISHER_CHOICE';
  /** The choice the publisher answered; null for an automatic value. */
  readonly findingKey: string | null;
  readonly codes: readonly string[];
  readonly locations: readonly OnixSourceLocation[];
};

/**
 * Why a candidate the source asserts is not what the Publication takes: its type holds none (`PHYSICAL_PUBLICATION`,
 * `AUDIO_PUBLICATION`) or not this family (`INCOMPATIBLE_ADDITIONAL`), no primary standard stands beside it
 * (`NO_PRIMARY_STANDARD`), or the publisher chose otherwise (`NOT_CHOSEN`, `PUBLISHER_OMISSION`, `EXCEPTION_CHOSEN`,
 * `STANDARDS_CHOSEN`).
 */
export type OnixAccessibilityOmissionReason =
  | 'PHYSICAL_PUBLICATION'
  | 'AUDIO_PUBLICATION'
  | 'INCOMPATIBLE_ADDITIONAL'
  | 'NO_PRIMARY_STANDARD'
  | 'NOT_CHOSEN'
  | 'PUBLISHER_OMISSION'
  | 'EXCEPTION_CHOSEN'
  | 'STANDARDS_CHOSEN';

/** One candidate the Publication does not take, with why, and the decision that says so where one did. */
export type OnixAccessibilityOmission = {
  readonly field: OnixAccessibilityField;
  readonly value: string;
  readonly reason: OnixAccessibilityOmissionReason;
  readonly findingKey: string | null;
  readonly codes: readonly string[];
  readonly locations: readonly OnixSourceLocation[];
};

/**
 * What one Publication has for accessibility as the plan executes it (thoth-app#221). A new Publication is created with
 * exactly `resolved`; an existing one is never updated, so its outcome is how the source compares with what it holds:
 * silent source (`EXISTING_PRESERVED`), the same values (`NOOP`), values for empty fields only (`ENRICHMENT_DEFERRED`,
 * which waits on #187), or different values (`CONFLICT`). `BLOCKED` waits on the decisions and gaps its blockers name.
 */
export type OnixPublicationAccessibilityAction = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly publicationType: PublicationType;
  /** The four fields the source comes to once every decision it needs is answered; null until then. */
  readonly resolved: OnixPublicationAccessibilityState | null;
  /** The source facts, and the answer where there was one, behind every value `resolved` holds. */
  readonly sources: readonly OnixAccessibilityFieldSource[];
  /** Every candidate the source asserts that `resolved` does not hold, and why. */
  readonly omitted: readonly OnixAccessibilityOmission[];
  readonly action:
    | { readonly kind: 'CREATE' }
    | {
        readonly kind: 'EXISTING_PRESERVED' | 'NOOP';
        readonly publicationId: string;
        readonly existing: OnixPublicationAccessibilityState;
      }
    | {
        readonly kind: 'ENRICHMENT_DEFERRED' | 'CONFLICT';
        readonly publicationId: string;
        readonly existing: OnixPublicationAccessibilityState;
        /** The fields the source would fill (`ENRICHMENT_DEFERRED`) or that disagree (`CONFLICT`). */
        readonly fields: readonly OnixAccessibilityField[];
      }
    | { readonly kind: 'BLOCKED' };
};

/* ------------------------------------------------------------------------------------------------ */
/* Components and contained Works (thoth-app#223, APP-IMPORT-ONIX-REL-01A of #185)                   */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The List 42 matter a structural BookChapter is stated as: front (02), body (03) or back (04). Thoth's BookChapter does not
 * record it, so mapping any of them is a normalisation with an explicit loss (5541336717 rule 2).
 */
export type OnixComponentMatter = 'FRONT' | 'BODY' | 'BACK';

/**
 * A LevelSequenceNumber exactly as stated, and what it is to a relation ordinal (5541336717 rules 5-8; #223 Specification
 * Amendment 1 section 5): a flat positive integer Thoth's relation ordinal can hold, a multi-level position Thoth cannot
 * represent, or nothing usable - zero, or a number no ordinal can hold. It is never read from source order or from a
 * ComponentNumber.
 */
export type OnixLevelSequence =
  | { readonly kind: 'ABSENT' }
  | (OnixSourceLocation & { readonly kind: 'FLAT'; readonly raw: string; readonly ordinal: number })
  | (OnixSourceLocation & { readonly kind: 'HIERARCHICAL'; readonly raw: string; readonly levels: readonly string[] })
  | (OnixSourceLocation & {
      readonly kind: 'UNUSABLE';
      readonly raw: string;
      readonly reason: 'ZERO' | 'OUT_OF_RANGE' | 'NOT_A_NUMBER';
    });

/** One PageRun exactly as stated: its first page, and its last page where it states one. */
export type OnixComponentPageRunFact = OnixSourceLocation & {
  readonly firstPage: string;
  readonly lastPage: string | null;
};

/** A ComponentTypeName, with the language its element declares: source metadata Thoth does not record (rule 9). */
export type OnixComponentTypeNameFact = OnixStatedValue & { readonly language: string | null };

/**
 * The one DOI a component's TextItemIdentifiers of TextItemIDType 06 state (5541336717 rule 11), read by the declared
 * scheme alone and canonicalised as every other import DOI is: none, one, or several distinct ones, none of which is
 * chosen. An identifier of any other type is never read as a DOI, whatever its value looks like.
 */
export type OnixComponentDoi =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'DOI'; readonly doi: string; readonly locations: readonly OnixSourceLocation[] }
  | { readonly kind: 'CONFLICT'; readonly dois: readonly string[]; readonly locations: readonly OnixSourceLocation[] };

/** The task whose canonical reducer owns a component fact this stage keeps without reducing it. */
export type OnixComponentFactOwner =
  | 'APP-IMPORT-ONIX-REL-01B'
  | 'APP-IMPORT-ONIX-REL-01C'
  | 'APP-IMPORT-ONIX-REL-01D'
  | 'APP-IMPORT-ONIX-PUB-01';

/**
 * A component-scoped fact kept whole, at its own path, for the reducer that owns it (#223): RelatedWork and RelatedProduct
 * (REL-01B, #224), TextContent and SupportingResource (REL-01C, #225), CitedContent (REL-01D, #226), and ONIX 3.1 licences
 * and usage constraints (#184, whose rights reduction already holds the plan for them). Nothing here maps them, and
 * nothing here moves them to the parent Work.
 */
export type OnixRetainedComponentFact = OnixSourceLocation & {
  readonly element: string;
  readonly owner: OnixComponentFactOwner;
  readonly ownerIssue: string;
};

/**
 * One ContentItem of one Product, exactly as the validated, normalised source states it (thoth-app#223). Every value is the
 * literal the file gives, at its own canonical path with its original path: nothing is re-typed, defaulted or inferred
 * from source order, from a ComponentNumber or from the parent Product.
 */
export type OnixComponentFact = OnixSourceLocation & {
  /** The component's stable identity in the file: its Product and its canonical ContentItem path. */
  readonly componentKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  /** Its 1-based position among the Product's ContentItems: which item it is, never where it is placed. */
  readonly position: number;
  readonly kind: OnixContentItemKind;
  /** The TextItemType (List 42) as stated; null for an AVItem, or where none is stated. */
  readonly textItemType: string | null;
  /** The AVItemType (List 240) as stated; null for a TextItem. */
  readonly avItemType: string | null;
  /** The matter a structural chapter is stated as; null for every other kind. */
  readonly matter: OnixComponentMatter | null;
  /** The general attributes the ContentItem composite states. */
  readonly attributes: OnixGeneralAttributes;
  readonly levelSequence: OnixLevelSequence;
  readonly componentTypeName: OnixComponentTypeNameFact | null;
  readonly componentNumber: OnixStatedValue | null;
  /** Every TextItemIdentifier or AVItemIdentifier, in source order, by its declared type. */
  readonly identifiers: readonly OnixStatedIdentifier[];
  readonly doi: OnixComponentDoi;
  /** Every PageRun, in source order: each one normalised, none first-wins (rule 12). */
  readonly pageRuns: readonly OnixComponentPageRunFact[];
  readonly numberOfPages: OnixStatedValue | null;
  /** NumberOfPages as Thoth's page count, exactly (rule 13); null where none is stated or Thoth cannot hold it. */
  readonly pageCount: number | null;
  /**
   * The ContentItem path the canonical descriptive reductions reduced its titles, contributors, languages and subjects
   * under (thoth-app#183): a structural chapter's and a contained Work's. Null for a component nothing is planned from.
   */
  readonly descriptivePath: string | null;
  /** Every fact the component states for a later reducer, in source order. */
  readonly retained: readonly OnixRetainedComponentFact[];
  /**
   * A fingerprint of everything the ContentItem states, its path and attributes included: what every answer about it is
   * bound to, so that no answer given for it is ever taken for a changed item at the same place.
   */
  readonly binding: string;
  /** The findings about the component alone, in the order they were raised. */
  readonly findingKeys: readonly string[];
};

/** Every component of one Product, in source order. */
export type OnixProductComponents = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly components: readonly OnixComponentFact[];
  /** Every finding about the Product's components, those about several of them included. */
  readonly findingKeys: readonly string[];
};

export type OnixComponentFindingCode =
  /** A structural chapter's front, body or back matter, which Thoth's BookChapter does not record (rule 2). */
  | 'COMPONENT_MATTER_NOT_REPRESENTED'
  /** A ComponentTypeName or ComponentNumber: source metadata Thoth does not record, and never an ordinal (rules 8-9). */
  | 'COMPONENT_LABEL_NOT_REPRESENTED'
  /** A TextItemIdentifier or AVItemIdentifier of a type Thoth has no field for (rule 11). */
  | 'COMPONENT_IDENTIFIER_NOT_REPRESENTED'
  /** A TextItemIDType 06 value that is no DOI Thoth can store. */
  | 'COMPONENT_DOI_UNUSABLE'
  /** Several distinct DOIs for one component: none is chosen, and none is imported. */
  | 'COMPONENT_DOI_CONFLICT'
  /** No flat positive LevelSequenceNumber: the relation ordinal is the publisher's to give (rule 6; Amendment 1 section 5). */
  | 'COMPONENT_ORDINAL_REQUIRED'
  /** Two components of one parent relation set state the same ordinal (Amendment 1 section 5). */
  | 'COMPONENT_ORDINAL_DUPLICATE'
  /** An ordinal the publisher gave that another component of the same relation set also takes. */
  | 'COMPONENT_ORDINAL_COLLISION'
  /** A multi-level LevelSequenceNumber: a hierarchy Thoth cannot represent, never flattened by itself (rule 7). */
  | 'COMPONENT_HIERARCHY_UNREPRESENTABLE'
  /** Several distinct PageRuns where a chapter holds one page range (rule 12). */
  | 'COMPONENT_PAGE_RUNS_CHOICE_REQUIRED'
  /** PageRuns of a contained Work, which Thoth holds only for a BookChapter. */
  | 'COMPONENT_PAGE_RANGE_UNREPRESENTABLE'
  /** A NumberOfPages Thoth's page count cannot hold. */
  | 'COMPONENT_PAGE_COUNT_UNREPRESENTABLE'
  /** An AVItem, which is never a written BookChapter (rule 4). */
  | 'COMPONENT_AV_ITEM_UNREPRESENTABLE'
  /** A ContentItem that is none of the approved forms: a shape canonical validation should have refused. */
  | 'COMPONENT_FORM_UNSUPPORTED'
  /** A shape canonical validation should have refused, reported rather than repaired: an unreadable NumberOfPages. */
  | 'COMPONENT_SHAPE_UNEXPECTED'
  /** An ONIX 3.1 component Publisher or CopyrightStatement, which no approved decision reduces at component scope. */
  | 'COMPONENT_FACT_UNREDUCED'
  /** A contained Work's own WorkType, which starts unset and is the publisher's to choose (Amendment 1 section 1). */
  | 'CONTAINED_WORK_TYPE_REQUIRED'
  /** A contained Work's own status, which starts unset and never takes its parent's (Amendment 1 section 4). */
  | 'CONTAINED_WORK_STATUS_REQUIRED'
  /** A complete date the chosen status needs and the source does not give (Amendment 1 section 4). */
  | 'CONTAINED_WORK_DATE_REQUIRED'
  /** A withdrawal date not after the publication date. */
  | 'CONTAINED_WORK_DATE_ORDER_INVALID'
  /** A Superseded contained Work with no exact replacement relation evidence (#224). */
  | 'CONTAINED_WORK_REPLACEMENT_UNRESOLVED'
  /** A contained Work's imprint: its parent Work's, as an explicit normalisation (Amendment 1 section 2). */
  | 'CONTAINED_WORK_IMPRINT_INHERITED'
  /** A contained Work's edition: first-edition normalisation, planned rather than defaulted (Amendment 1 section 3). */
  | 'CONTAINED_WORK_EDITION_NORMALISED'
  /** A contained Work, whose creation and IsPartOf relation the current executor cannot perform (#187). */
  | 'CONTAINED_WORK_EXECUTION_DEFERRED'
  /** Chapter ordinals the current executor, which numbers chapters 1 to N in plan order, cannot create exactly (#187). */
  | 'CHAPTER_ORDINAL_EXECUTION_DEFERRED'
  /** A planned chapter of an adapted Work the adapter built no candidate chapter Work for: never silently left out. */
  | 'CHAPTER_CANDIDATE_MISSING';

export type OnixComponentClassification =
  | 'SUPPORTED_NORMALIZED'
  | 'TARGET_UNREPRESENTABLE'
  | 'TARGET_INPUT_REQUIRED'
  | 'SOURCE_CONFLICT'
  | 'PREFLIGHT_GAP'
  | 'EXECUTION_DEFERRED';

/** A value a publisher supplies for a component: a positive whole relation ordinal, or a complete calendar date. */
export type OnixComponentInput = 'ORDINAL' | 'DATE';

/** How a publisher can answer a component finding inside the app, if at all. */
export type OnixComponentResolution =
  | { readonly kind: 'NONE' }
  /** The publisher continues while knowingly omitting what the finding describes; nothing is imported in its place. */
  | { readonly kind: 'ACKNOWLEDGE' }
  /** The publisher picks one option; none starts chosen. */
  | { readonly kind: 'CHOICE'; readonly options: readonly OnixPlanFindingOption[] }
  /** The publisher supplies the value: only a valid one answers, and none is ever defaulted or invented. */
  | { readonly kind: 'INPUT'; readonly input: OnixComponentInput };

/** The answer that acknowledges a component loss (thoth-app#223). */
export const ONIX_COMPONENT_ACKNOWLEDGED = 'ACKNOWLEDGED';
/** The page-range answer that imports no page range for the chapter. */
export const ONIX_COMPONENT_OMIT = 'OMIT';

/**
 * One component finding. Its key depends on the file alone - the Product, the component and a fingerprint of everything the
 * ContentItem states, or of every component a finding about several is about - so an answer stays bound to the exact fact
 * it was given for, and a changed fact at the same place is asked afresh.
 */
export type OnixComponentFinding = {
  readonly family: 'COMPONENT';
  readonly key: string;
  readonly code: OnixComponentFindingCode;
  readonly classification: OnixComponentClassification;
  /** Whether the plan may not run while the finding stands unanswered. */
  readonly blocking: boolean;
  readonly productKey: string;
  readonly groupKey: string;
  /** The component the finding is about; null for a finding about several components of the Product. */
  readonly componentKey: string | null;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  readonly resolution: OnixComponentResolution;
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

/** The canonical component reduction of one ONIX message: pure, deterministic and serialisable. */
export type OnixComponentPlan = {
  readonly products: Readonly<Record<string, OnixProductComponents>>;
  /** Every finding the source alone raises, in the order it was raised: Products in file order. */
  readonly findings: readonly OnixComponentFinding[];
};

/** The Work a component is planned under: the group's new Work, by its candidate id once the adapter built one. */
export type OnixComponentParent = {
  readonly groupKey: string;
  readonly plannedWorkId: WorkId | null;
};

/** A structural relation ordinal as the plan resolves it: the source's flat LevelSequenceNumber, or the publisher's. */
export type OnixComponentOrdinal =
  | {
      readonly status: 'RESOLVED';
      readonly ordinal: number;
      readonly basis: 'LEVEL_SEQUENCE_NUMBER' | 'PUBLISHER_INPUT';
      /** The input the publisher answered; null for the source's own ordinal. */
      readonly findingKey: string | null;
      readonly locations: readonly OnixSourceLocation[];
    }
  | { readonly status: 'UNRESOLVED' };

/**
 * A multi-level position Thoth cannot represent, kept as evidence for the relation stages (#224), which may never
 * overwrite it: the levels exactly as stated, and whether the publisher acknowledged placing the component flat.
 */
export type OnixComponentHierarchy = OnixSourceLocation & {
  readonly raw: string;
  readonly levels: readonly string[];
  readonly findingKey: string;
  readonly acknowledged: boolean;
};

/** A structural chapter's page range as the plan resolves it: none, the one the file states, or the publisher's. */
export type OnixComponentPageRange =
  | { readonly status: 'NONE' }
  | {
      readonly status: 'RESOLVED';
      readonly firstPage: string;
      /** Empty where the PageRun states no last page. */
      readonly lastPage: string;
      readonly basis: 'PAGE_RUN' | 'PUBLISHER_CHOICE';
      readonly findingKey: string | null;
      readonly locations: readonly OnixSourceLocation[];
    }
  | { readonly status: 'OMITTED'; readonly findingKey: string }
  | { readonly status: 'UNRESOLVED'; readonly findingKey: string };

type OnixComponentIntentBase = OnixSourceLocation & {
  readonly componentKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  readonly position: number;
  readonly parent: OnixComponentParent;
  /** Every component finding that applies to it, answered or not. */
  readonly findingKeys: readonly string[];
  /** The blocking findings about it still unanswered, or answered with a value the plan cannot use. */
  readonly pendingFindingKeys: readonly string[];
};

/**
 * A TextItemType 02, 03 or 04 component planned as a BookChapter of its parent Work (5541336717 rules 2, 5-13). Its
 * structural, page and DOI facts are this plan's, and its titles, contributors, languages and subjects are its own
 * ContentItem's descriptive reductions. Its imprint and lifecycle are its parent Work's, as an explicit normalisation
 * (rule 14); its edition is none, as Thoth holds for every BookChapter.
 */
export type OnixChapterIntent = OnixComponentIntentBase & {
  readonly kind: 'BOOK_CHAPTER';
  readonly workType: { readonly type: 'BOOK_CHAPTER'; readonly provenance: 'STRUCTURAL_RULE' };
  readonly relation: 'IS_CHILD_OF';
  readonly matter: OnixComponentMatter;
  /** The candidate chapter Work the adapter built for it; null where no candidate was adapted. */
  readonly chapterWorkId: WorkId | null;
  readonly ordinal: OnixComponentOrdinal;
  readonly hierarchy: OnixComponentHierarchy | null;
  readonly doi: string | null;
  readonly pages: OnixComponentPageRange;
  readonly pageCount: number | null;
  readonly inherited: {
    readonly basis: 'PARENT_WORK';
    readonly classification: 'SUPPORTED_NORMALIZED';
    readonly fields: readonly ('imprint' | 'status' | 'publicationDate' | 'withdrawnDate' | 'copyrightHolder')[];
  };
  readonly action: 'CREATE_CHAPTER' | 'BLOCKED';
};

/** A contained Work's WorkType: unset until the publisher chooses one of the five non-chapter types. */
export type OnixContainedWorkType =
  | {
      readonly status: 'RESOLVED';
      readonly type: WorkType;
      readonly provenance: 'USER_COMPONENT_CHOICE';
      readonly findingKey: string;
    }
  | { readonly status: 'UNRESOLVED'; readonly findingKey: string };

/**
 * A contained Work's lifecycle: the status the publisher chose - never its parent's - and the complete dates that status
 * needs, as the publisher gave them; nothing is inherited, defaulted or synthesised (Amendment 1 section 4).
 */
export type OnixContainedWorkLifecycle = {
  readonly status: WorkStatus | null;
  readonly statusFindingKey: string;
  readonly publicationDate: string | null;
  readonly withdrawnDate: string | null;
  /** The date inputs the chosen status raised, answered or not. */
  readonly dateFindingKeys: readonly string[];
  /** Whether the chosen status needs replacement relation evidence this stage does not have (Superseded). */
  readonly replacement: 'NOT_REQUIRED' | 'UNRESOLVED';
};

/** A contained Work's own descriptive reductions, with the publisher's answers (thoth-app#183 reducers). */
export type OnixContainedWorkDescriptive = {
  readonly componentPath: string;
  readonly titles: readonly PlannedTitleEntity[];
  readonly languages: readonly LanguageEntity[];
  readonly subjects: readonly SubjectEntity[];
  /** The canonical contributor intents of the component alone: never its parent's. */
  readonly contributorIntentKeys: readonly string[];
  /** Descriptive findings about the component still unanswered. */
  readonly pendingFindingKeys: readonly string[];
};

/**
 * A TextItemType 01 component planned as a separate contained Work with an `IsPartOf` relation to its parent (5541336717
 * rule 3; Amendment 1): complete and immutable, but never executed here - its creation and relation are #187's, so it
 * stays `EXECUTION_DEFERRED` however completely it is answered.
 */
export type OnixContainedWorkIntent = OnixComponentIntentBase & {
  readonly kind: 'CONTAINED_WORK';
  readonly relation: 'IS_PART_OF';
  readonly workType: OnixContainedWorkType;
  readonly imprint:
    | {
        readonly status: 'RESOLVED';
        readonly imprintId: string;
        readonly basis: 'INHERITED_FROM_PARENT';
        readonly classification: 'SUPPORTED_NORMALIZED';
        readonly findingKey: string;
      }
    | { readonly status: 'UNRESOLVED'; readonly findingKey: string };
  readonly edition: {
    readonly edition: 1;
    readonly basis: 'FIRST_EDITION_NORMALISED';
    readonly classification: 'SUPPORTED_NORMALIZED';
    readonly findingKey: string;
  };
  readonly lifecycle: OnixContainedWorkLifecycle;
  readonly ordinal: OnixComponentOrdinal;
  readonly hierarchy: OnixComponentHierarchy | null;
  readonly doi: string | null;
  readonly pageCount: number | null;
  /** The contained Work's own descriptive reductions; null where none was given to resolve them with. */
  readonly descriptive: OnixContainedWorkDescriptive | null;
  readonly action: 'EXECUTION_DEFERRED';
};

/** An AVItem: never a written chapter, and imported as nothing once its loss is acknowledged (rule 4). */
export type OnixAvItemIntent = OnixComponentIntentBase & {
  readonly kind: 'AV_ITEM';
  readonly avItemType: string | null;
  readonly findingKey: string;
  readonly action: 'OMIT_WITH_ACKNOWLEDGED_LOSS' | 'BLOCKED';
};

/** A component of no approved form: never reinterpreted as a chapter or a contained Work. */
export type OnixUnsupportedComponentIntent = OnixComponentIntentBase & {
  readonly kind: 'UNSUPPORTED';
  readonly textItemType: string | null;
  readonly action: 'BLOCKED';
};

export type OnixComponentIntent =
  | OnixChapterIntent
  | OnixContainedWorkIntent
  | OnixAvItemIntent
  | OnixUnsupportedComponentIntent;

/* ------------------------------------------------------------------------------------------------ */
/* RelatedMaterial: Work relations and References (thoth-app#224, APP-IMPORT-ONIX-REL-01B of #185)   */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The non-chapter Work relation types Thoth holds (5541586341 evidence 4), each of which the backend creates together with
 * its inverse, in one transaction (evidence 5). `HAS_CHILD` / `IS_CHILD_OF` are the chapter relations, whose order is the
 * ContentDetail contract's alone (rule 32), and are never a RelatedMaterial relation.
 */
export type OnixWorkRelationType =
  | 'HAS_TRANSLATION'
  | 'IS_TRANSLATION_OF'
  | 'HAS_PART'
  | 'IS_PART_OF'
  | 'REPLACES'
  | 'IS_REPLACED_BY';

/** The two RelatedMaterial constructs, never collapsed into one untyped relation list (rule 1). */
export type OnixRelatedMaterialConstruct = 'RELATED_WORK' | 'RELATED_PRODUCT';

/**
 * What one declaration is, by its construct and its List 164 or List 51 code alone (5541586341 rules 7-20). Nothing here
 * says what it becomes in Thoth: its endpoints, the Work grouping and the publisher's answers decide that.
 *
 * - `WORK_IDENTITY`: RelatedWork 01/06, which says which Work the Product manifests (#182); never a relation (rule 9).
 * - `TRANSLATION`: RelatedWork 29/49, the only automatic derivation mapping (rules 7-8, 11).
 * - `GROUPING_EVIDENCE`: RelatedProduct 06, same-content manifestation evidence (#182); never a relation (rule 13).
 * - `CITATION`: RelatedProduct 34, a Reference of the current Work; never a relation (rule 14).
 * - `CITED_BY`: RelatedProduct 35, which Thoth cannot hold in this direction (rule 15).
 * - `PRODUCT_RELATION`: RelatedProduct 01/02/03/05, projected to a Work relation only on the approved conditions (16-18).
 * - `OTHER_LANGUAGE_VERSION`: RelatedProduct 11, self-inverse, which states no translation direction (rule 19).
 * - `LRM_WORKAROUND`: RelatedWork 98/99, which never creates a Work relation (rule 12).
 * - `UNREPRESENTABLE`: every other code, which has no Thoth target and no fallback (rules 10-11, 20).
 */
export type OnixRelationSemantics =
  | { readonly kind: 'WORK_IDENTITY' }
  | { readonly kind: 'TRANSLATION'; readonly relationType: 'HAS_TRANSLATION' | 'IS_TRANSLATION_OF' }
  | { readonly kind: 'GROUPING_EVIDENCE' }
  | { readonly kind: 'CITATION' }
  | { readonly kind: 'CITED_BY' }
  | {
      readonly kind: 'PRODUCT_RELATION';
      readonly relationType: 'HAS_PART' | 'IS_PART_OF' | 'REPLACES' | 'IS_REPLACED_BY';
    }
  | { readonly kind: 'OTHER_LANGUAGE_VERSION' }
  | { readonly kind: 'LRM_WORKAROUND' }
  | { readonly kind: 'UNREPRESENTABLE' };

/**
 * One RelatedWork, or one ProductRelationCode of one RelatedProduct, of one Product, exactly as the validated normalised
 * source states it. A RelatedProduct stating several codes is one declaration per code, all naming the same identifiers.
 */
export type OnixRelatedMaterialDeclaration = OnixSourceLocation & {
  /** Its stable identity in the file: its Product, its composite's path and its code. */
  readonly declarationKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  readonly construct: OnixRelatedMaterialConstruct;
  /** The WorkRelationCode or ProductRelationCode, as stated. */
  readonly code: string;
  readonly codeLocation: OnixSourceLocation;
  /** The Product's 1-based position in the message. */
  readonly recordIndex: number;
  /** Its place among the Product's declarations: RelatedWorks first, then RelatedProducts, as ONIX orders them. */
  readonly order: number;
  /** Every WorkIdentifier or ProductIdentifier, in source order, by its declared type. */
  readonly identifiers: readonly OnixStatedIdentifier[];
  readonly semantics: OnixRelationSemantics;
  /** A fingerprint of everything the composite states: what every answer about the declaration is bound to. */
  readonly binding: string;
};

/** A RelatedWork or RelatedProduct stated inside a ContentItem: no approved decision reduces one at component scope. */
export type OnixComponentRelatedMaterialFact = OnixSourceLocation & {
  readonly factKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  /** The ContentItem it is stated in. */
  readonly componentPath: string;
  readonly construct: OnixRelatedMaterialConstruct;
  readonly codes: readonly string[];
  readonly binding: string;
};

/** What the identifiers of one declared type in one citation say: none, one value, or several none of which is chosen. */
export type OnixCitationIdentifierSelection =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'VALUE'; readonly value: string; readonly locations: readonly OnixSourceLocation[] }
  | {
      readonly kind: 'CONFLICT';
      readonly values: readonly string[];
      readonly locations: readonly OnixSourceLocation[];
    };

/** The Reference fields a RelatedProduct/34 identifier can map to, by its declared ProductIDType alone (rules 44-47). */
export type OnixCitationField = 'doi' | 'isbn' | 'issn' | 'unstructuredCitation';

/** An identifier declared as a type a Reference field holds, whose value is no valid identifier of that type (rule 44). */
export type OnixCitationInvalidIdentifier = OnixStatedIdentifier & { readonly field: 'doi' | 'isbn' | 'issn' };

/** An identifier mapped through an exact change of notation, and what that notation cannot say (ISBN-10, ISSN-13). */
export type OnixCitationNormalisedIdentifier = OnixStatedIdentifier & {
  readonly field: 'isbn' | 'issn';
  readonly normalised: string;
  /** What the source value states that the Reference field does not hold: an ISSN-13's variant and add-on digits. */
  readonly dropped: string | null;
};

/**
 * One RelatedProduct/34 citation of one Product, exactly as stated: its source position and every identifier, each read by
 * its declared ProductIDType alone. Whether the Thoth-origin unstructured-citation convention applies is the verified
 * compatibility profile's to decide (rule 46), at resolution: here it is only recognised.
 */
export type OnixCitationFact = OnixSourceLocation & {
  readonly citationKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  /** Its 1-based position among the Product's RelatedProduct/34 declarations: its `Reference.referenceOrdinal` (rule 43). */
  readonly ordinal: number;
  readonly identifiers: readonly OnixStatedIdentifier[];
  readonly doi: OnixCitationIdentifierSelection;
  readonly isbn: OnixCitationIdentifierSelection;
  readonly issn: OnixCitationIdentifierSelection;
  /** The ProductIDType 01 + IDTypeName "Unstructured citation" values: Thoth's own exporter's convention. */
  readonly thothCitation: OnixCitationIdentifierSelection;
  readonly thothCitationIdentifiers: readonly OnixStatedIdentifier[];
  readonly invalid: readonly OnixCitationInvalidIdentifier[];
  readonly normalised: readonly OnixCitationNormalisedIdentifier[];
  /** Identifiers of a type no Reference field holds: never a citation text in disguise (rule 47). */
  readonly unmapped: readonly OnixStatedIdentifier[];
  readonly binding: string;
};

/** The canonical RelatedMaterial reduction of one ONIX message: pure, deterministic, serialisable, network-free. */
export type OnixRelatedMaterialPlan = {
  /** Every declaration of every complete Product, Products in file order, each Product's in source order. */
  readonly declarations: readonly OnixRelatedMaterialDeclaration[];
  /** Every RelatedProduct/34 citation, by Product, in source order. */
  readonly citations: Readonly<Record<string, readonly OnixCitationFact[]>>;
  readonly componentFacts: readonly OnixComponentRelatedMaterialFact[];
};

/** One existing Work an exact global identifier lookup returned: read-only discovery across every publisher. */
export type OnixRelatedMaterialWorkMatch = {
  readonly workId: WorkId;
  /** Its imprint: whether it lies inside the active publisher's boundary is decided from this, never from a miss. */
  readonly imprintId: string;
  /** The language codes the Work holds: the evidence a translation direction may be backed by (rule 19). */
  readonly languageCodes: readonly string[];
};

export type OnixRelatedMaterialIdentifierResolution = {
  readonly basis: 'doi' | 'isbn';
  readonly value: string;
  readonly works: readonly OnixRelatedMaterialWorkMatch[];
};

/** One Work relation an existing Work holds, as read back: only ever compared, never written. */
export type OnixExistingWorkRelation = {
  readonly relatedWorkId: WorkId;
  /** Any of the eight Thoth relation types, chapter relations included: a pair holds one relation, whatever its type. */
  readonly relationType: string;
  readonly relationOrdinal: number;
};

/** One Reference an existing Work holds, as read back: only the fields a RelatedProduct/34 source can map to. */
export type OnixExistingReference = {
  readonly referenceId: string;
  readonly referenceOrdinal: number;
  readonly doi: string | null;
  readonly unstructuredCitation: string | null;
  readonly isbn: string | null;
  readonly issn: string | null;
};

/**
 * What Thoth holds for the RelatedMaterial of one plan, read only after every deterministic source decision: the existing
 * Works each exact endpoint identifier names in any publisher, and the relations and References of the existing Works the
 * plan could relate or attach to, read whole.
 */
export type OnixRelatedMaterialTargetEvidence = {
  readonly identifiers: readonly OnixRelatedMaterialIdentifierResolution[];
  readonly relations: Readonly<Record<WorkId, readonly OnixExistingWorkRelation[]>>;
  readonly references: Readonly<Record<WorkId, readonly OnixExistingReference[]>>;
};

export type OnixRelationFindingCode =
  /** RelatedWork 98/99: an LRM workaround Thoth holds no relation for (rule 12). */
  | 'RELATION_LRM_UNREPRESENTABLE'
  /** RelatedProduct 35: never reversed into a Reference of the current Work (rule 15). */
  | 'RELATION_CITED_BY_UNREPRESENTABLE'
  /** A relation code Thoth has no relation type for, never coerced into an adjacent one (rules 10-11, 20). */
  | 'RELATION_UNREPRESENTABLE'
  /** A RelatedProduct/06 the Product grouping could not read: its same-content evidence was not considered (#182). */
  | 'RELATION_GROUPING_EVIDENCE_UNREAD'
  /** No endpoint: no strong identifier, or one no exact lookup matched (rules 21-24). */
  | 'RELATION_TARGET_UNRESOLVED'
  /** Several exact endpoints: never chosen between (rule 24). */
  | 'RELATION_TARGET_AMBIGUOUS'
  /** An exact existing endpoint outside the active publisher (rule 25): never read as "not found". */
  | 'RELATION_TARGET_UNAUTHORIZED'
  /**
   * A relation, Work-level or Product-level, whose two ends are one Work after grouping (rules 5-6): a contradiction
   * between the grouping and the relation, which no answer clears (#224 Specification Amendment 2 A).
   */
  | 'RELATION_SELF_AFTER_GROUPING'
  /**
   * No longer emitted: a Product-level relation between two Products of one Work is a `RELATION_SELF_AFTER_GROUPING`
   * contradiction, never an acknowledged loss (#224 Specification Amendment 2 A).
   */
  | 'RELATION_SAME_WORK_UNREPRESENTABLE'
  /**
   * A generic Product-level part or replacement relation whose Works' identity the grouping has not settled, projected to
   * them only by the publisher (rule 18); between two exact, distinct, settled Works it is projected by itself (rules
   * 16-17; #224 Specification Amendment 2 B).
   */
  | 'RELATION_PROJECTION_CHOICE_REQUIRED'
  /** An other-language version whose direction only exact translation evidence or the publisher gives (rule 19). */
  | 'RELATION_DIRECTION_REQUIRED'
  /** An other-language version an exact translation relation between the same Works already states. */
  | 'RELATION_OTHER_LANGUAGE_REDUNDANT'
  /** Declarations of one Work pair that state opposite directions of one relation (rule 29). */
  | 'RELATION_INVERSE_CONTRADICTION'
  /** Declarations of one Work pair that state different relations: Thoth holds one per pair (rule 30). */
  | 'RELATION_PAIR_TYPE_CONFLICT'
  /** Several declarations - repeats, or a relation and its inverse - reconciled into one semantic edge (rules 27-28). */
  | 'RELATION_DECLARATIONS_RECONCILED'
  /** The ordinal an ordinary relation is given: its source appearance within its type, a target normalisation (rule 31). */
  | 'RELATION_ORDINAL_NORMALISED'
  /** The exact edge already exists: satisfied, nothing to create (rule 33). */
  | 'RELATION_EXISTING_SATISFIED'
  /** The Work pair already holds a different relation (rule 33). */
  | 'RELATION_EXISTING_CONFLICT'
  /** An existing Work's relations the plan needs were not read: nothing about them is assumed. */
  | 'RELATION_TARGETS_NOT_READ'
  /** A planned relation, whose creation is #187's (rules 37-41): the plan holds it, and cannot run it yet. */
  | 'RELATION_EXECUTION_DEFERRED'
  /** A RelatedWork or RelatedProduct inside a ContentItem, which no approved decision reduces. */
  | 'RELATION_COMPONENT_SCOPE_UNSUPPORTED';

export type OnixReferenceFindingCode =
  /** A value declared as a DOI, ISBN or ISSN that is none: never rewritten or guessed (rule 44). */
  | 'REFERENCE_IDENTIFIER_INVALID'
  /** An ISBN-10 or ISSN-13 held in the notation the Reference field takes, with what that notation drops. */
  | 'REFERENCE_IDENTIFIER_NORMALISED'
  /** An identifier no Reference field holds, or the Thoth citation convention outside the verified profile (46-47). */
  | 'REFERENCE_IDENTIFIER_UNREPRESENTABLE'
  /** Several distinct values of one field in one citation: none is chosen (rule 52). */
  | 'REFERENCE_IDENTIFIER_CONFLICT'
  /** A citation with neither a DOI nor an approved citation text, which Thoth cannot store as a Reference. */
  | 'REFERENCE_UNREPRESENTABLE'
  /** A citation repeating an earlier one exactly: imported once (rule 52). */
  | 'REFERENCE_DUPLICATE_NORMALISED'
  /** Citations of one identity whose other facts differ: surfaced, never first- or last-wins (rule 52). */
  | 'REFERENCE_DUPLICATE_CONFLICT'
  /** Products of one Work whose canonical Reference sequences differ. */
  | 'REFERENCE_GROUP_CONFLICT';

/** The answer that acknowledges a relation or Reference omission (thoth-app#224). */
export const ONIX_RELATED_MATERIAL_ACKNOWLEDGED = 'ACKNOWLEDGED';
/** The projection answer that creates the Work relation a Product-level relation states. */
export const ONIX_RELATION_PROJECT = 'PROJECT';
/** The projection or direction answer that creates no Work relation. */
export const ONIX_RELATION_OMIT = 'OMIT';

/** One relation or Reference finding, keyed by the exact declarations, endpoints or citation it is about. */
export type OnixRelatedMaterialFinding = {
  readonly family: 'RELATION' | 'REFERENCE';
  readonly key: string;
  readonly code: OnixRelationFindingCode | OnixReferenceFindingCode;
  readonly classification: OnixPlanFindingClassification;
  /** Whether it holds the plan while unanswered, wherever it applies. */
  readonly blocking: boolean;
  /** The Product it is about; null for a finding about several Products' declarations. */
  readonly productKey: string | null;
  readonly groupKey: string;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  readonly resolution:
    | { readonly kind: 'NONE' }
    | { readonly kind: 'ACKNOWLEDGE' }
    | { readonly kind: 'CHOICE'; readonly options: readonly OnixPlanFindingOption[] };
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

/**
 * One end of a relation: a Work this import creates, by its stable group key (and the candidate id its Work has in the
 * plan, once adapted), or an exact existing Work - never a copy of either.
 */
export type OnixRelationEndpoint =
  | { readonly kind: 'PLANNED_WORK'; readonly groupKey: string; readonly plannedWorkId: WorkId | null }
  | {
      readonly kind: 'EXISTING_WORK';
      readonly workId: WorkId;
      /** The Work group of this import that resolved to it, where one did. */
      readonly groupKey: string | null;
      readonly imprintId: string | null;
    };

/** A relation ordinal: assigned from source appearance within its type, the existing edge's, or none yet. */
export type OnixRelationOrdinal =
  | {
      readonly status: 'ASSIGNED';
      readonly ordinal: number;
      readonly basis: 'SOURCE_ORDER_WITHIN_TYPE';
      /** The highest ordinal of the type the relator already holds, which assigned ordinals follow. */
      readonly after: number;
    }
  | { readonly status: 'EXISTING'; readonly ordinal: number }
  | { readonly status: 'UNASSIGNED' };

/**
 * One reconciled semantic edge (rules 27-34): one Work relation, whatever number of declarations state it or its inverse,
 * between two stable Work identities. The backend creates its inverse itself, so an edge is never two mutations.
 */
export type OnixRelationEdge = {
  readonly edgeKey: string;
  /** The Work the relation is created on: the side of its first declaration in source order. */
  readonly relator: OnixRelationEndpoint;
  readonly related: OnixRelationEndpoint;
  readonly relationType: OnixWorkRelationType;
  /**
   * Why the edge is a Work relation: a RelatedWork translation; Thoth's own Product-level shape under its verified profile;
   * a generic RelatedProduct 01/02/03/05 between two exact, distinct Works whose identity grouping has settled, projected
   * by its one approved mapping (#224 Specification Amendment 2 B); or the publisher's projection or direction.
   */
  readonly basis:
    | 'RELATED_WORK_TRANSLATION'
    | 'THOTH_PROFILE_PRODUCT_RELATION'
    | 'GENERIC_PRODUCT_RELATION'
    | 'PUBLISHER_PROJECTION'
    | 'PUBLISHER_DIRECTION';
  /** Every declaration it reconciles, in source order. */
  readonly declarationKeys: readonly string[];
  readonly ordinal: OnixRelationOrdinal;
  /**
   * `PLANNED`: to be created, by #187. `SATISFIED`: already in Thoth. `OMITTED`: the publisher acknowledged leaving it
   * out. `BLOCKED`: held by a finding that no answer lifts.
   */
  readonly state: 'PLANNED' | 'SATISFIED' | 'OMITTED' | 'BLOCKED';
  readonly findingKeys: readonly string[];
};

/** What one declaration came to, so that none is ever silently left out (rules 26, 36). */
export type OnixRelationOutcomeKind =
  | 'PLANNED'
  | 'SATISFIED'
  | 'REDUNDANT'
  | 'AWAITING_CHOICE'
  | 'UNRESOLVED'
  | 'AMBIGUOUS'
  | 'UNAUTHORIZED'
  | 'OMITTED'
  | 'UNREPRESENTABLE'
  | 'CONFLICT'
  | 'SELF'
  | 'WORK_IDENTITY'
  | 'GROUPING_EVIDENCE'
  | 'CITATION'
  | 'NOT_REDUCED'
  | 'GAP';

export type OnixRelationOutcome = OnixSourceLocation & {
  /** The declaration, or the component-scoped fact, it is the outcome of. */
  readonly declarationKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  readonly construct: OnixRelatedMaterialConstruct;
  readonly code: string;
  readonly outcome: OnixRelationOutcomeKind;
  /** The other end, where it resolved to one. */
  readonly endpoint: OnixRelationEndpoint | null;
  /** The Work relation it states or was answered as, relative to its own Work. */
  readonly relationType: OnixWorkRelationType | null;
  readonly edgeKey: string | null;
  readonly findingKeys: readonly string[];
};

/** One canonical Reference, exactly as its RelatedProduct/34 states it: nothing is fabricated from other metadata (49). */
export type OnixPlannedReference = {
  readonly citationKey: string;
  readonly productKey: string;
  readonly referenceOrdinal: number;
  readonly doi: string | null;
  readonly unstructuredCitation: string | null;
  readonly isbn: string | null;
  readonly issn: string | null;
  readonly locations: readonly OnixSourceLocation[];
};

/** One Product's canonical Reference sequence, and whether anything about it is still unresolved. */
export type OnixProductReferences = {
  readonly productKey: string;
  readonly groupKey: string;
  /** Whether the Product states any RelatedProduct/34 at all: absence is absent evidence (#224 Amendment 1). */
  readonly asserted: boolean;
  readonly references: readonly OnixPlannedReference[];
  /** The blocking Reference findings about it still unanswered: while any stands, the sequence is not the source's. */
  readonly pendingFindingKeys: readonly string[];
};

/** What one Work group's References become as the plan executes it. */
export type OnixWorkReferenceAction = {
  readonly groupKey: string;
  readonly action:
    | { readonly kind: 'NONE' }
    | { readonly kind: 'CREATE'; readonly productKey: string; readonly references: readonly OnixPlannedReference[] }
    /** An existing Work's References are never written; an attaching Product's are compared with them instead. */
    | { readonly kind: 'EXISTING_WORK_NOT_UPDATED' }
    | { readonly kind: 'BLOCKED' };
};

/** How an attaching Product's canonical References compare with the exact existing Work's (#224 Amendment 1). */
export type OnixReferenceCompatibility = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly workId: WorkId;
  readonly outcome: 'COMPATIBLE' | 'CONTRADICTED' | 'UNVERIFIED';
  /** Why it is not compatible; empty when it is. */
  readonly reasons: readonly string[];
  readonly findingKeys: readonly string[];
};

/** The RelatedMaterial slice of the ONIX planning sidecar (thoth-app#224). */
export type OnixRelatedMaterialSidecar = {
  readonly plan: OnixRelatedMaterialPlan;
  readonly outcomes: readonly OnixRelationOutcome[];
  readonly edges: readonly OnixRelationEdge[];
  readonly productReferences: readonly OnixProductReferences[];
  readonly referenceActions: readonly OnixWorkReferenceAction[];
  readonly referenceCompatibility: readonly OnixReferenceCompatibility[];
  /** Every relation and Reference finding that applies to the plan, answered or not. */
  readonly findings: readonly OnixRelatedMaterialFinding[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Collateral: TextContent, SupportingResource, PromotionDetail (thoth-app#225, REL-01C of #185)     */
/* ------------------------------------------------------------------------------------------------ */

/**
 * Where a collateral fact is stated (ONIX-AUDIT-COLLATERAL-01, #179 5562227566 rules 153-162): the Product itself, one of its
 * ContentItems - whose collateral is never moved to the parent Work (rule 161) - or one of its promotional events, whose
 * resources never become Work collateral (5541009506 rule 5).
 */
export type OnixCollateralScope =
  | { readonly kind: 'PRODUCT' }
  | { readonly kind: 'COMPONENT'; readonly componentPath: string; readonly componentKind: OnixContentItemKind }
  | { readonly kind: 'PROMOTIONAL_EVENT'; readonly eventPath: string; readonly occurrencePath: string | null };

/** One ContentDate exactly as stated, and the one complete calendar day it names where it names exactly one (rule 30). */
export type OnixCollateralDateFact = OnixSourceLocation & {
  /** The List 155 role. */
  readonly role: string;
  /** The List 55 format, from the ONIX 3.0 DateFormat element or the `dateformat` attribute; null where none is stated. */
  readonly format: string | null;
  readonly value: string;
  /** `YYYY-MM-DD` where the value is exactly one complete calendar day; null otherwise. Never completed or guessed. */
  readonly day: string | null;
};

/**
 * One text-bearing element (Text, FeatureNote, TextAuthor, ResourceLink, ...) exactly as stated, with the attributes that
 * say what its text is. Its text is withheld - null - where the collateral is restricted or sensitive (rules 15, 139), or
 * where it holds XHTML child elements, whose order among its text the adapter does not keep.
 */
export type OnixCollateralStatedText = OnixSourceLocation & {
  readonly text: string | null;
  readonly language: string | null;
  readonly script: string | null;
  readonly textFormat: string | null;
  readonly holdsElements: boolean;
};

/** A List 160 or List 162 feature exactly as stated. */
export type OnixResourceFeatureFact = OnixSourceLocation & {
  readonly type: string;
  readonly value: string | null;
  readonly notes: readonly OnixCollateralStatedText[];
};

/**
 * What a TextContent is to this stage, by its List 153 TextType and scope alone (rules 32-69): an abstract of the target type
 * its type maps to, a table of contents, a general note, review and endorsement text kept for REL-01D (#226), or text Thoth has
 * no target for. Nothing is inferred from its wording.
 */
export type OnixTextContentRole =
  | 'SHORT_ABSTRACT'
  | 'LONG_ABSTRACT'
  | 'TABLE_OF_CONTENTS'
  | 'GENERAL_NOTE'
  | 'REVIEW'
  | 'UNREPRESENTED';

/** One TextContent of one Product, exactly as the validated normalised source states it (rules 1-7). */
export type OnixTextContentFact = OnixSourceLocation & {
  /** Its stable identity in the file: its Product and its canonical path. */
  readonly factKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  readonly scope: OnixCollateralScope;
  /** Its 1-based position among its parent's TextContents: which one it is, never its priority (rule 72). */
  readonly position: number;
  /** The ONIX 3.1 SequenceNumber, as stated. */
  readonly sequenceNumber: string | null;
  readonly textType: string;
  readonly role: OnixTextContentRole;
  /** Every List 154 ContentAudience, in source order: audience is part of what the text is (rule 20). */
  readonly audiences: readonly string[];
  /** The Territory it is stated for, part by part: a geography, never sales rights (5543566392 rule 41). */
  readonly territory: readonly string[];
  readonly texts: readonly OnixCollateralStatedText[];
  /** ReviewRating as stated: Rating, RatingLimit and every RatingUnits. */
  readonly reviewRating: readonly string[];
  readonly authors: readonly OnixCollateralStatedText[];
  readonly sourceCorporate: readonly OnixCollateralStatedText[];
  readonly sourceDescriptions: readonly OnixCollateralStatedText[];
  /** ONIX 3.1 TextSource composites, kept whole at their paths for REL-01D (#226), never read as Contributors (rule 149). */
  readonly textSources: readonly OnixSourceLocation[];
  readonly sourceTitles: readonly OnixCollateralStatedText[];
  readonly sourceLinks: readonly OnixCollateralStatedText[];
  /** ONIX 3.1 EpubUsageConstraint and EpubLicense of the text: resource-scoped rights, never a Work licence. */
  readonly usageTerms: readonly OnixSourceLocation[];
  readonly dates: readonly OnixCollateralDateFact[];
  /** Whether its content is withheld from the plan: restricted collateral is never repeated (rule 15). */
  readonly redacted: boolean;
  /** A fingerprint of everything it states, its content included and its place excluded. */
  readonly binding: string;
};

/**
 * What a SupportingResource is to this stage, by its List 158 ResourceContentType and scope alone (rules 90-140): the front
 * cover the descriptive cover reducer owns; a Work resource an AdditionalResource may be planned from; collateral of a
 * collection, publisher, imprint or brand; full content; a digital review copy; product safety contacts; a licence; or a
 * role with no approved projection. Never inferred from its link, filename or extension (rules 8-9, 113).
 */
export type OnixResourceRole =
  | 'FRONT_COVER'
  | 'WORK_RESOURCE'
  | 'NOT_WORK_SCOPED'
  | 'FULL_CONTENT'
  | 'REVIEW_COPY'
  | 'PRODUCT_SAFETY'
  | 'LICENCE'
  | 'NOT_PROJECTED';

/** One ResourceVersion exactly as stated: every one, never only the first (rule 73). */
export type OnixResourceVersionFact = OnixSourceLocation & {
  /** The List 161 ResourceForm: linkable, downloadable or embeddable, never substituted for a mode (rule 71). */
  readonly form: string;
  readonly features: readonly OnixResourceFeatureFact[];
  readonly links: readonly OnixCollateralStatedText[];
  readonly usageTerms: readonly OnixSourceLocation[];
  readonly dates: readonly OnixCollateralDateFact[];
};

/** One SupportingResource of one Product, ContentItem or promotional event, exactly as stated (rules 7, 70-80). */
export type OnixSupportingResourceFact = OnixSourceLocation & {
  readonly factKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  readonly scope: OnixCollateralScope;
  readonly position: number;
  readonly sequenceNumber: string | null;
  readonly contentType: string;
  readonly role: OnixResourceRole;
  readonly audiences: readonly string[];
  readonly territory: readonly string[];
  /** Every List 159 ResourceMode, in source order: a mode, never a form (rule 71). */
  readonly modes: readonly string[];
  readonly features: readonly OnixResourceFeatureFact[];
  readonly versions: readonly OnixResourceVersionFact[];
  /** Whether its links and feature texts are withheld: restricted, review-copy and product-safety collateral. */
  readonly redacted: boolean;
  readonly binding: string;
};

/** One EventOccurrence of a promotional event, kept structurally and never flattened (5541009506 rules 1-3, 15). */
export type OnixPromotionalEventOccurrenceFact = OnixSourceLocation & {
  readonly status: string | null;
  readonly dates: readonly OnixSourceLocation[];
  /** CountryCode, RegionCode, LocationName, VenueName, StreetAddress, PostalCode and VenueNote, where stated. */
  readonly venue: readonly OnixSourceLocation[];
  readonly descriptions: readonly OnixSourceLocation[];
  readonly sponsors: readonly OnixSourceLocation[];
  readonly websites: readonly OnixSourceLocation[];
  readonly resourceFactKeys: readonly string[];
};

/**
 * One PromotionalEvent, kept in the normalised model although nothing in Thoth can hold it (5541009506 rules 2, 15): its
 * names, participants, occurrences, sponsors and resources stay where they are stated, and none becomes a Work field, a Work
 * contributor or a Work resource (rules 3-5).
 */
export type OnixPromotionalEventFact = OnixSourceLocation & {
  readonly factKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  readonly eventTypes: readonly string[];
  readonly status: string | null;
  readonly audiences: readonly string[];
  readonly names: readonly OnixSourceLocation[];
  readonly identifiers: readonly OnixSourceLocation[];
  /** Contributor, ContributorReference, ContributorStatement and NoContributor: event participants, never Work contributors. */
  readonly participants: readonly OnixSourceLocation[];
  readonly descriptions: readonly OnixSourceLocation[];
  readonly occurrences: readonly OnixPromotionalEventOccurrenceFact[];
  readonly sponsors: readonly OnixSourceLocation[];
  readonly websites: readonly OnixSourceLocation[];
  readonly resourceFactKeys: readonly string[];
};

/**
 * A malformed TextContent canonical validation omitted under the approved narrow recovery (#179 5572802864 section 4, #185
 * 5572808295): the validator's own marker, recorded where the collateral plan would otherwise have had the composite. It
 * is never re-read, re-classified or repaired here, no text is synthesised for it and none is borrowed from a sibling.
 */
export type OnixCollateralRecoveredOmission = OnixSourceLocation & {
  readonly productKey: string;
  readonly groupKey: string;
  readonly recovery: 'OMIT_INVALID_COMPOSITE';
  /** The composite the omission taints, as the validator names it. */
  readonly taintSite: string;
};

/** The one-value targets a text can be planned into (rules 32-55): an abstract of one type and locale, the TOC or the note. */
export type OnixCollateralTextSlot = 'SHORT_ABSTRACT' | 'LONG_ABSTRACT' | 'TABLE_OF_CONTENTS' | 'GENERAL_NOTE';

/** Where a candidate text's locale comes from, or the finding the publisher answers it with (rule 39). */
export type OnixCollateralTextLocale =
  | {
      readonly status: 'RESOLVED';
      readonly localeCode: string;
      readonly basis: 'TEXT_LANGUAGE' | 'SCOPE_TEXT_LANGUAGE' | 'HEADER_DEFAULT_LANGUAGE';
    }
  | { readonly status: 'DECISION'; readonly findingKey: string }
  /** A table of contents or a general note: Thoth holds no locale for either. */
  | { readonly status: 'NOT_APPLICABLE' };

/**
 * One Text of one TextContent that a one-value target could take, normalised for that target before any target is chosen:
 * its content in the markup format the target holds, and its locale where the target has one. A Text the target cannot hold
 * is still a candidate, with the acknowledgement that omits it.
 */
export type OnixCollateralTextCandidate = OnixSourceLocation & {
  readonly candidateKey: string;
  readonly factKey: string;
  readonly productKey: string;
  readonly groupKey: string;
  /** The ContentItem it belongs to, or null for the Product itself. */
  readonly componentPath: string | null;
  readonly slot: OnixCollateralTextSlot;
  readonly textType: string;
  /** `UNRESTRICTED` where its TextContent states audience 00; `TARGETED` where it states only targeted audiences (rules 17-19). */
  readonly audience: 'UNRESTRICTED' | 'TARGETED';
  /** Every ContentAudience its TextContent states, as stated. */
  readonly audiences: readonly string[];
  /** The normalised content; null where the target cannot hold it. */
  readonly content: string | null;
  readonly markupFormat: ImportedMarkupFormat | null;
  readonly locale: OnixCollateralTextLocale;
  /** The acknowledgement that omits a text the target cannot hold; null where it can. */
  readonly unrepresentableFindingKey: string | null;
};

/** How one resource version link becomes, or cannot become, an AdditionalResource (rules 81-89, 109-126, 141-145). */
export type OnixResourceCandidateReason =
  | 'AUDIENCE_TARGETED'
  | 'DOWNLOADABLE_FILE'
  | 'EMBEDDABLE_APPLICATION'
  | 'TYPE_UNRESOLVED';

/** The AdditionalResource fields an intent sets, as the backend's `NewAdditionalResource` names them (rules 111-124). */
export type OnixAdditionalResourceTarget = {
  /** The pinned List 158 role label: a target normalisation, never source text (rule 111). */
  readonly title: string;
  readonly description: string | null;
  readonly attribution: string | null;
  /** Null where no explicit mode, role and form give one: `OTHER` only by the publisher's decision (rule 119). */
  readonly resourceType: ResourceType | null;
  readonly url: string;
  /** Only an exact publication (01) or broadcast (04) day, and only where nothing competes for it (rules 28-31). */
  readonly date: string | null;
};

/**
 * One ResourceLink of one ResourceVersion of a Work resource, collapsed with every statement of exactly the same semantic
 * fingerprint in its Work group (rules 75-76, 155, 158): what an AdditionalResource intent would be planned from.
 */
export type OnixAdditionalResourceCandidate = {
  readonly candidateKey: string;
  readonly groupKey: string;
  /** The ContentItem of a contained Work it belongs to, or null for the Work itself. */
  readonly componentPath: string | null;
  readonly productKeys: readonly string[];
  readonly factKeys: readonly string[];
  readonly contentType: string;
  readonly modes: readonly string[];
  readonly form: string;
  readonly audiences: readonly string[];
  readonly target: OnixAdditionalResourceTarget;
  /** Why it is an AdditionalResource only by the publisher's decision; empty where it is one by itself. */
  readonly reasons: readonly OnixResourceCandidateReason[];
  /** The decision that projects or omits it; null where none is needed. */
  readonly decisionFindingKey: string | null;
  /** What it states that the AdditionalResource cannot keep, named for the preview (rules 110, 124-126, 164). */
  readonly losses: readonly string[];
  /** Every link statement it was collapsed from, in source order. */
  readonly locations: readonly OnixSourceLocation[];
};

export type OnixCollateralFindingCode =
  /** A TextContent stated for a restricted audience (List 154 01): never projected, and its content never repeated (13-15). */
  | 'COLLATERAL_TEXT_RESTRICTED'
  /** A TextContent whose dates control when it may be used, which no Thoth field enforces (rules 22-25). */
  | 'COLLATERAL_TEXT_TEMPORAL_CONTROL'
  /** A TextContent with no target at its scope: its type has none, or its scope forbids it (rules 52, 56-67). */
  | 'COLLATERAL_TEXT_ROLE_UNREPRESENTED'
  /** A Text with no content: nothing is created for it, and nothing is synthesised. */
  | 'COLLATERAL_TEXT_EMPTY'
  /** A Text whose markup or structure its one target cannot hold: omitted only by the publisher's acknowledgement (40). */
  | 'COLLATERAL_TEXT_UNREPRESENTABLE'
  /** A Text whose language gives no Thoth locale, or states none where its scope's text language is not one (rule 39). */
  | 'COLLATERAL_TEXT_LOCALE_UNRESOLVED'
  /** A Text that takes its locale from the message Header's default language of text, with that provenance. */
  | 'COLLATERAL_TEXT_HEADER_DEFAULT_LANGUAGE'
  /** A Text whose script qualifier Thoth has no locale for: imported with the base language locale. */
  | 'COLLATERAL_TEXT_SCRIPT_NOT_REPRESENTED'
  /** What a projected TextContent states beside its text that its target cannot keep (rules 44, 51, 55, 151). */
  | 'COLLATERAL_TEXT_DETAIL_NOT_IMPORTED'
  /** Targeted variants of a text an unrestricted one already fills (rule 18): explicit loss, never deduplicated away. */
  | 'COLLATERAL_TEXT_TARGETED_NOT_IMPORTED'
  /** Statements of one text that agree - repeated, grouped or 03 and 30 - imported once (rules 35, 37, 50, 155). */
  | 'COLLATERAL_TEXT_COLLAPSED'
  /** A Description (03) imported as the Long abstract, which no Abstract (30) competes with (rule 34). */
  | 'COLLATERAL_TEXT_DESCRIPTION_NORMALISED'
  /** Distinct texts, or targeted-only ones, for one Abstract type and locale: the publisher's choice (rules 19, 36-37). */
  | 'COLLATERAL_ABSTRACT_CHOICE_REQUIRED'
  /** Abstracts of one type in several locales, none established as canonical: the publisher's choice (rule 43). */
  | 'COLLATERAL_ABSTRACT_CANONICAL_REQUIRED'
  /** Distinct tables of contents for the one Work.toc (rule 50). */
  | 'COLLATERAL_TOC_CHOICE_REQUIRED'
  /** Distinct publisher's notices for the one Work.generalNote: never concatenated (rules 53-54). */
  | 'COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED'
  /** A SupportingResource stated for a restricted audience: never projected, its links never repeated (rules 14-15). */
  | 'COLLATERAL_RESOURCE_RESTRICTED'
  /** A resource version no AdditionalResource can stand for: temporal controls, form, link or credit (rules 23, 89, 121). */
  | 'COLLATERAL_RESOURCE_EXCLUDED'
  /** A SupportingResource whose role or scope has no AdditionalResource projection (rules 134, 138-140, 162). */
  | 'COLLATERAL_RESOURCE_ROLE_UNREPRESENTED'
  /** Full content (158/28): never an AdditionalResource or a Location, only an acknowledged loss (rules 135-137). */
  | 'COLLATERAL_RESOURCE_FULL_CONTENT'
  /** A Work resource an AdditionalResource stands for only by the publisher's decision (rules 19, 84, 88, 119, 167). */
  | 'COLLATERAL_RESOURCE_DECISION_REQUIRED'
  /** What an AdditionalResource cannot keep of the resource it is planned from (rules 110, 124-126, 164). */
  | 'COLLATERAL_RESOURCE_DETAIL_NOT_IMPORTED'
  /** Statements of one resource that agree exactly, in one Product or across grouped ones, planned once (rules 75, 158). */
  | 'COLLATERAL_RESOURCE_COLLAPSED'
  /** A planned AdditionalResource, whose creation is #187's (rules 169-172): the plan holds it, and cannot run it yet. */
  | 'COLLATERAL_RESOURCE_EXECUTION_DEFERRED'
  /** The collateral of a ContentItem no Work is planned from: an AVItem or an unsupported form (rule 161). */
  | 'COLLATERAL_COMPONENT_NOT_PLANNED'
  /** Promotional events, which Thoth cannot represent and which are never flattened (5541009506 rules 2-5, 14). */
  | 'COLLATERAL_PROMOTIONAL_EVENT_UNREPRESENTABLE'
  /** A shape canonical validation should have refused, reported rather than repaired. */
  | 'COLLATERAL_SHAPE_UNEXPECTED';

/** The answer that acknowledges a collateral loss (thoth-app#225). */
export const ONIX_COLLATERAL_ACKNOWLEDGED = 'ACKNOWLEDGED';
/** The answer that projects a SupportingResource as the AdditionalResource the decision describes. */
export const ONIX_COLLATERAL_PROJECT = 'PROJECT';
/** The answer that imports nothing for a decision: no text, no canonical flag's text, no AdditionalResource. */
export const ONIX_COLLATERAL_OMIT = 'OMIT';

/**
 * One collateral finding. Its key depends on the file alone - the scope, the code and a fingerprint of every fact it is about,
 * with the locales the publisher answered where a one-value target depends on them - so an answer stays bound to the exact
 * facts it was given for, and a changed fact at the same place is asked afresh.
 */
export type OnixCollateralFinding = {
  readonly family: 'COLLATERAL';
  readonly key: string;
  readonly code: OnixCollateralFindingCode;
  readonly classification: OnixPlanFindingClassification;
  /** Whether it holds the plan while unanswered, wherever it applies. */
  readonly blocking: boolean;
  /** The Product it is about; null for a finding about a grouped Work's collateral as a whole. */
  readonly productKey: string | null;
  readonly groupKey: string;
  /** The ContentItem it is about; null for the Product or the Work. */
  readonly componentPath: string | null;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  readonly resolution:
    | { readonly kind: 'NONE' }
    | { readonly kind: 'ACKNOWLEDGE' }
    | { readonly kind: 'CHOICE'; readonly options: readonly OnixPlanFindingOption[] }
    | { readonly kind: 'INPUT'; readonly input: 'LOCALE' };
  /** Display-ready English, in the ONIX vocabulary the planner's other disclosures use. */
  readonly message: string;
};

/** Every collateral fact of one Product, in source order. */
export type OnixProductCollateral = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly textContents: readonly OnixTextContentFact[];
  readonly resources: readonly OnixSupportingResourceFact[];
  readonly events: readonly OnixPromotionalEventFact[];
  readonly omissions: readonly OnixCollateralRecoveredOmission[];
  /** Every Text a one-value target could take, normalised for it; restricted, time-controlled and unmapped ones never are. */
  readonly textCandidates: readonly OnixCollateralTextCandidate[];
  /** The candidates of the Product's contained-Work ContentItems (rule 161), by ContentItem path. */
  readonly componentResourceCandidates: Readonly<Record<string, readonly OnixAdditionalResourceCandidate[]>>;
  /** Every finding about the Product's collateral alone, in the order raised. */
  readonly findingKeys: readonly string[];
};

/** The canonical collateral reduction of one ONIX message: pure, deterministic, serialisable and network-free. */
export type OnixCollateralPlan = {
  readonly products: Readonly<Record<string, OnixProductCollateral>>;
  /** The Work resources of each Work group, collapsed across its Products (rules 155, 158), in source order. */
  readonly workResourceCandidates: Readonly<Record<string, readonly OnixAdditionalResourceCandidate[]>>;
  /** Every finding the source alone raises: Products in file order, then their grouped Works. */
  readonly findings: readonly OnixCollateralFinding[];
};

/** One Abstract a Work, chapter or contained Work is created with (rules 32-47). */
export type OnixPlannedAbstract = {
  readonly type: AbstractType;
  readonly localeCode: string;
  readonly content: string;
  readonly markupFormat: ImportedMarkupFormat;
  readonly canonical: boolean;
  /** How the canonical flag was decided: the one abstract of its type, the canonical title's locale, or the publisher. */
  readonly canonicalBasis: 'SINGLE' | 'TITLE_LOCALE' | 'PUBLISHER_CHOICE' | null;
  /** Every TextType it is taken from, and every Text stating it (rules 35, 44, 155). */
  readonly textTypes: readonly string[];
  readonly candidateKeys: readonly string[];
  readonly locations: readonly OnixSourceLocation[];
};

/** The one table of contents or general note a Work is created with (rules 48-55). */
export type OnixPlannedCollateralText = {
  readonly content: string;
  readonly textTypes: readonly string[];
  readonly candidateKeys: readonly string[];
  readonly locations: readonly OnixSourceLocation[];
};

/**
 * One AdditionalResource the plan holds for a Work or a contained Work (rules 109-133, 141-146): immutable, complete, and
 * never executed here - its creation is #187's, so it stays `EXECUTION_DEFERRED` however completely it is answered.
 */
export type OnixAdditionalResourceIntent = {
  readonly intentKey: string;
  readonly candidateKey: string;
  readonly groupKey: string;
  readonly componentPath: string | null;
  readonly target: OnixAdditionalResourceTarget & { readonly resourceType: ResourceType };
  /** Its place among the Work's planned AdditionalResources: its source order, a target display normalisation (rule 72). */
  readonly resourceOrdinal: number;
  readonly basis: 'AUTOMATIC' | 'PUBLISHER_DECISION';
  readonly losses: readonly string[];
  readonly locations: readonly OnixSourceLocation[];
  readonly findingKey: string;
  readonly action: 'EXECUTION_DEFERRED';
};

/** What the collateral of one Work, chapter or contained Work comes to as the plan resolves it. */
export type OnixCollateralTargetAction = {
  readonly groupKey: string;
  /** The Product whose ContentItem it is, or null for a Work. */
  readonly productKey: string | null;
  readonly componentPath: string | null;
  readonly target: 'WORK' | 'CHAPTER' | 'CONTAINED_WORK';
  /**
   * `PLANNED`: created with the Work as below, AdditionalResources once #187 creates them. `EXISTING_WORK_NOT_UPDATED`: an
   * existing Work is never written. `BLOCKED`: held by findings still unanswered.
   */
  readonly action: 'PLANNED' | 'EXISTING_WORK_NOT_UPDATED' | 'BLOCKED';
  readonly abstracts: readonly OnixPlannedAbstract[];
  readonly tableOfContents: OnixPlannedCollateralText | null;
  readonly generalNote: OnixPlannedCollateralText | null;
  readonly resources: readonly OnixAdditionalResourceIntent[];
  /** Every collateral finding that applies to it, answered or not. */
  readonly findingKeys: readonly string[];
  /** The blocking findings about it still unanswered, or answered with a value the plan cannot use. */
  readonly pendingFindingKeys: readonly string[];
};

/** The collateral slice of the ONIX planning sidecar (thoth-app#225). */
export type OnixCollateralSidecar = {
  readonly plan: OnixCollateralPlan;
  readonly actions: readonly OnixCollateralTargetAction[];
  /** Every collateral finding that applies to the plan - the reduction's and those only the answers raised - answered or not. */
  readonly findings: readonly OnixCollateralFinding[];
};
