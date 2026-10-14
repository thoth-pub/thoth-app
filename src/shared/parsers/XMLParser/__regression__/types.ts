import type { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import type { InstitutionEntity } from '@/src/entities/institution/model/institution.types';
import type { PublicationType } from '@/src/entities/publication/model/publication.types';
import type { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import type { FormFieldOption } from '@/src/shared/interfaces';
import type { ExistingWorkMatch, ImportIdentifier } from '@/src/shared/types';
import type {
  OnixAccessibilityField,
  OnixAccessibilityOmissionReason,
  OnixAccessibilityScope,
  OnixAdditionalResourceTarget,
  OnixAwardTarget,
  OnixBookReviewTarget,
  OnixChapterIntent,
  OnixCollateralTargetAction,
  OnixComponentMatter,
  OnixContainedWorkIntent,
  OnixDescriptiveCompatibility,
  OnixEditionResolution,
  OnixEndorsementTarget,
  OnixExistingReference,
  OnixExistingWorkRelation,
  OnixGeneralAttributes,
  OnixImportPlanSidecar,
  OnixLicenceExpressionRole,
  OnixLicenceIdentity,
  OnixLocationCarrier,
  OnixManifestationDecision,
  OnixPlanBlockerClassification,
  OnixPlanFindingAnswer,
  OnixPlanFindingClassification,
  OnixPlanFindingFamily,
  OnixPlanFindingResolution,
  OnixPlanInputs,
  OnixPlannedLocationRole,
  OnixPriceDecision,
  OnixPriceExclusion,
  OnixProductActionEvidence,
  OnixProductLicence,
  OnixProductTargetAction,
  OnixPublicationAccessibilityAction,
  OnixPublicationAccessibilityState,
  OnixRecordDisposition,
  OnixReferenceCompatibility,
  OnixRelatedMaterialConstruct,
  OnixRelatedMaterialWorkMatch,
  OnixRelationEdge,
  OnixRelationOutcomeKind,
  OnixResolvedPrice,
  OnixResourceCandidateReason,
  OnixResourceRole,
  OnixReviewsPrizesOrderBasis,
  OnixReviewsPrizesOrdering,
  OnixReviewsPrizesTargetAction,
  OnixRightsCarrier,
  OnixTechnicalProtectionState,
  OnixTextContentRole,
  OnixWorkDoiDecision,
  OnixWorkLicenceAction,
  OnixWorkRelationType,
  OnixWorkTargetAction,
  OnixWorkTargetEvidence,
  OnixWorkTypeResolution,
} from '@/src/shared/types/onixPlanning';

import type {
  FindingClass,
  FindingProjection,
  FindingScope,
  FindingTier,
  OnixFlavour,
  OnixRelease,
  ProvenanceDto,
  Recoverability,
  RecoveryMarker,
} from '../validation';
import type { STOP_TEXT } from '../validation/sourceGate';

/**
 * The ONIX contract regression vocabulary (thoth-app#236, parent #188).
 *
 * A fixture states what the accepted importer contract does with one ONIX source, stage by stage, in the
 * contract's own semantic terms: canonical finding ids and classes, plan blocker and finding codes and their
 * classifications, the actions the resolver takes. Nothing here is UI text; no assertion reads a message.
 */

/** The programme's outcome vocabulary (#188 test matrix) that every regression assertion can bind to. */
export const ONIX_REGRESSION_OUTCOMES = [
  'SOURCE_INVALID',
  'SUPPORTED_LOSSLESS',
  'SUPPORTED_NORMALIZED',
  'SUPPORTED_WITH_WARNING',
  'TARGET_UNREPRESENTABLE',
  'TARGET_INPUT_REQUIRED',
  'UNKNOWN',
] as const;

export type OnixRegressionOutcome = (typeof ONIX_REGRESSION_OUTCOMES)[number];

/**
 * Every classification a stage of the contract emits. The programme outcomes are a subset: the plan contracts
 * also classify `SOURCE_CONFLICT`, `PREFLIGHT_GAP` and `EXECUTION_DEFERRED`, and the ledger drops none of them.
 */
export type OnixContractClassification =
  | OnixRegressionOutcome
  | OnixPlanFindingClassification
  | OnixPlanBlockerClassification;

/* ------------------------------------------------------------------------------------------------ */
/* Observed ledger: the semantic projection of one pipeline run                                     */
/* ------------------------------------------------------------------------------------------------ */

/**
 * What the canonical source gate decided, derived only from the scopes of the findings that count:
 * - `PERMITTED`: target planning may continue (`permitsTargetPlanning`);
 * - `SOURCE_INVALID`: at least one counting finding of scope VALIDITY;
 * - `SOURCE_UNSUPPORTED`: counting SUPPORT findings only (release/flavour outside the supported contract);
 * - `SOURCE_REFUSED_SECURITY`: counting SECURITY findings only (DTD/prolog boundary);
 * - `NOT_PERMITTED`: refused without any counting finding (a stopped or incomplete result).
 */
export type OnixSourceGateVerdict =
  | 'PERMITTED'
  | 'SOURCE_INVALID'
  | 'SOURCE_UNSUPPORTED'
  | 'SOURCE_REFUSED_SECURITY'
  | 'NOT_PERMITTED';

/** One canonical source finding, by its semantic fields only (never its message). */
export type OnixSourceFindingEntry = {
  readonly id: string;
  readonly tier: FindingTier;
  readonly scope: FindingScope;
  readonly class: FindingClass;
  readonly blocking: boolean;
  readonly projection: FindingProjection;
  readonly recoverability: Recoverability;
  readonly counts: boolean;
  readonly path: string | null;
  /** Where the uploaded source has the finding, in its own tags; present exactly when the finding names it (Short). */
  readonly sourcePath?: string;
  /**
   * The structured evidence a stage-1 or stage-2 finding (tier `RELEASE_FLAVOUR` or `PROLOG`) was decided on - the
   * lexical root summary and reason of a release/flavour stop, the DOCTYPE the prolog scan read - present exactly when
   * it has any. Later tiers' details carry parser and rule text and are never projected.
   */
  readonly detail?: Readonly<Record<string, unknown>>;
};

/** One approved recovery the source gate applied, and where. */
export type OnixRecoveryEntry = {
  readonly recovery: RecoveryMarker['recovery'];
  readonly path: string;
};

/** Why the gate stopped, by the contract's own name for the stop: the key of its `STOP_TEXT` entry, never the text. */
export type OnixSourceStopKind = keyof typeof STOP_TEXT;

/** Where the gate stopped before the later tiers, and why. */
export type OnixSourceStopEntry = {
  readonly stage: 1 | 2;
  readonly kind: OnixSourceStopKind;
};

/**
 * The source identity of the normalised source's elements, exactly as the Worker posts it beside the normalised XML:
 * `IDENTITY` or `REPOSITIONED` for Reference input, `RENAMED` (canonical name -> Short tag, plus every exception) for
 * Short input.
 */
export type OnixSourceProvenanceEntry = ProvenanceDto;

export type OnixSourceGateLedger = {
  readonly verdict: OnixSourceGateVerdict;
  readonly release: OnixRelease | null;
  readonly flavour: OnixFlavour | null;
  /** Where and why the gate stopped; null when every tier ran. */
  readonly stop: OnixSourceStopEntry | null;
  /** Every canonical finding, in ledger order. */
  readonly findings: readonly OnixSourceFindingEntry[];
  /** Every approved recovery, in marker order. */
  readonly recoveries: readonly OnixRecoveryEntry[];
  /** The provenance of the normalised source; null when the gate produced none (it stopped). */
  readonly provenance: OnixSourceProvenanceEntry | null;
};

export type OnixRecordEntry = {
  readonly index: number;
  readonly recordReference: string | null;
  readonly disposition: OnixRecordDisposition;
  readonly productKey: string | null;
  readonly action: 'PLANNED' | 'OMIT/EXCLUDED' | 'BLOCKED';
};

export type OnixProductEntry = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly isbn: string | null;
  /** The contract's own decision, whole: kind, classification or reason, candidates and notes. */
  readonly manifestation: OnixManifestationDecision;
  readonly publicationType: PublicationType | null;
  readonly action: OnixProductTargetAction | null;
  readonly executable: boolean;
};

export type OnixWorkGroupEntry = {
  readonly groupKey: string;
  readonly productKeys: readonly string[];
  readonly target: OnixWorkTargetAction | null;
  readonly workType: OnixWorkTypeResolution;
  readonly edition: OnixEditionResolution;
  readonly workDoi: OnixWorkDoiDecision;
  readonly executable: boolean;
};

export type OnixBlockerEntry = {
  readonly code: string;
  readonly classification: OnixPlanBlockerClassification;
  readonly recordKey: string | null;
  readonly productKey: string | null;
  readonly groupKey: string | null;
};

export type OnixPlanFindingEntry = {
  readonly family: OnixPlanFindingFamily;
  readonly code: string;
  readonly classification: OnixPlanFindingClassification;
  readonly blocking: boolean;
  readonly resolution: OnixPlanFindingResolution['kind'];
  readonly answer: OnixPlanFindingAnswer['state'];
  readonly productKey: string | null;
  readonly groupKey: string;
};

/** One Work the executable plan would create, by the semantic values the import writes. */
export type OnixPlannedWorkEntry = {
  readonly type: string;
  readonly status: string;
  readonly doi: string;
  readonly edition: number | null;
  readonly publicationDate: string | null;
  readonly pageCount: number;
  readonly titles: readonly {
    readonly canonical: boolean;
    readonly localeCode: string;
    readonly fullTitle: string;
    readonly title: string;
    readonly subtitle: string;
  }[];
  readonly publications: readonly { readonly type: string; readonly isbn: string }[];
  readonly contributions: readonly {
    readonly fullName: string;
    readonly type: string;
    readonly isMain: boolean;
    readonly orderNumber: number;
    /** The contributor's ORCID exactly as the plan writes it; empty when the plan gives it none. */
    readonly orcidId: string;
  }[];
  readonly languages: readonly { readonly code: string; readonly relation: string }[];
  readonly subjects: readonly { readonly type: string; readonly code: string; readonly ordinal: number }[];
};

/** One chapter Work the executable plan would create beside its parent. */
export type OnixPlannedChapterEntry = {
  readonly type: string;
  readonly fullTitle: string;
  readonly firstPage: string;
  readonly lastPage: string;
  readonly pageCount: number;
};

/* ------------------------------------------------------------------------------------------------ */
/* Target contract: the semantic projection of every reduction the plan was resolved with (#249)    */
/* ------------------------------------------------------------------------------------------------ */

/*
 * The target ledger (thoth-app#249) reads the decisions, intents and actions each canonical reduction and the resolver
 * already made, field by field, from the objects the pipeline hands on: the resolver's sidecar, the source plan's Work
 * groups, the descriptive reduction's Work decisions and the executable plan. It derives nothing. A source location
 * is projected as its canonical path; a finding key, as the key publisher answers are bound to. Messages, labels and
 * the adapter's generated Work ids are never projected: a Work the plan creates is named by its group key, or by its
 * position in the plan.
 */

/** One plan finding, by the key publisher answers are bound to and the canonical paths of the facts it is about. */
export type OnixTargetFindingEntry = {
  readonly family: OnixPlanFindingFamily;
  readonly code: string;
  readonly key: string;
  readonly paths: readonly string[];
};

/** Why the plan treats the file, its Work groups and its Products as it does: the identity evidence (#182). */
export type OnixTargetIdentityEntry = {
  readonly compatibility: {
    readonly headerMatches: boolean;
    readonly ignoredNativeRecordKeys: readonly string[];
    readonly activation: OnixImportPlanSidecar['compatibility']['activation'];
  };
  readonly groups: readonly {
    readonly groupKey: string;
    readonly compatibility: 'GENERIC' | 'THOTH_PROFILE';
    readonly thothVerification: 'NOT_APPLICABLE' | 'VERIFIED' | 'UNVERIFIED' | 'CONTRADICTED';
    /** The approved identity edges that joined the group's Products, each by its kind and keys. */
    readonly edges: readonly (
      | { readonly kind: 'WORK_IDENTITY'; readonly key: string; readonly productKeys: readonly string[] }
      | { readonly kind: 'ALTERNATIVE_FORMAT'; readonly from: string; readonly to: string; readonly path: string }
    )[];
    readonly evidence: readonly OnixWorkTargetEvidence[];
  }[];
  readonly products: readonly {
    readonly productKey: string;
    readonly recordKeys: readonly string[];
    readonly evidence: readonly OnixProductActionEvidence[];
    /** Whether the plan takes the publisher's omission of the Product's Publication; null where the sidecar is silent. */
    readonly omittable: boolean | null;
  }[];
};

/** A Work-level value decision of the descriptive reduction, with option keys and values as the reduction states them. */
export type OnixTargetValueDecision =
  | { readonly kind: 'ABSENT' }
  | { readonly kind: 'VALUE'; readonly value: string | number }
  | {
      readonly kind: 'CHOICE';
      readonly findingKey: string;
      readonly options: readonly { readonly key: string; readonly value: string | number | null }[];
    }
  | { readonly kind: 'BLOCKED'; readonly findingKeys: readonly string[] };

/** What the descriptive reduction decided for one Work group's subjects, Series, lifecycle and cover (#183, #219). */
export type OnixTargetDescriptiveEntry = {
  readonly groupKey: string;
  readonly subjects: readonly {
    readonly type: string;
    /** Null while the publisher has still to say which heading a category means. */
    readonly code: string | null;
    readonly main: boolean;
    readonly namespace: string | null;
    /** Every Subject stated for it, by List 27 scheme, version and where. */
    readonly sources: readonly {
      readonly path: string;
      readonly scheme: string;
      readonly schemeVersion: string | null;
      readonly valueSource: 'SubjectCode' | 'SubjectHeadingText';
      readonly main: boolean;
    }[];
  }[];
  /** The subject types whose primary subject the publisher chooses. */
  readonly primaryChoices: readonly string[];
  readonly series: readonly {
    readonly key: string;
    readonly name: string;
    readonly issns: readonly string[];
    readonly thothSeriesId: string | null;
    readonly ordinal: number | null;
    readonly issueNumber: number | null;
    readonly classificationFindingKey: string | null;
    readonly ordinalFindingKey: string | null;
    readonly paths: readonly string[];
  }[];
  readonly noCollection: boolean;
  readonly lifecycle: {
    readonly status:
      | { readonly kind: 'VALUE'; readonly status: string }
      | { readonly kind: 'CHOICE'; readonly findingKey: string }
      | { readonly kind: 'BLOCKED'; readonly findingKeys: readonly string[] };
    readonly publicationDate: string | null;
    readonly withdrawnDate: string | null;
  };
  /** The Work cover outside the Thoth profile, and under it. */
  readonly cover: OnixTargetValueDecision;
  readonly profileCover: OnixTargetValueDecision;
};

/** One source price a publisher may choose, by its key, its stated values and why it is never taken by itself. */
export type OnixTargetPriceCandidateEntry = {
  readonly key: string;
  readonly path: string;
  readonly currencyCode: string;
  readonly amount: string;
  readonly unitPrice: number;
  readonly priceType: string | null;
  readonly exclusions: readonly OnixPriceExclusion[];
  readonly lost: readonly string[];
};

/** What a Product's prices in one currency come to (#215), with each source location as its path. */
export type OnixTargetPriceDecisionEntry =
  | {
      readonly kind: 'SET';
      readonly currencyCode: string;
      readonly unitPrice: number;
      readonly paths: readonly string[];
      readonly findingKey: string;
    }
  | {
      readonly kind: 'DEFAULT_WITH_ALTERNATIVES';
      readonly currencyCode: string;
      readonly unitPrice: number;
      readonly paths: readonly string[];
      readonly alternatives: readonly OnixTargetPriceCandidateEntry[];
      readonly findingKey: string;
    }
  | {
      readonly kind: 'CHOICE_REQUIRED';
      readonly reason: Extract<OnixPriceDecision, { kind: 'CHOICE_REQUIRED' }>['reason'];
      readonly currencyCode: string | null;
      readonly candidates: readonly OnixTargetPriceCandidateEntry[];
      readonly paths: readonly string[];
      readonly findingKey: string;
    };

/** A Location by its URLs and platform. */
export type OnixTargetLocationEntry = {
  readonly landingPage: string;
  readonly fullTextUrl: string;
  readonly platform: string;
};

/** Every commercial fact the reduction kept for one Product, and what they come to for its Publication (#215, #219). */
export type OnixTargetCommercialEntry = {
  readonly productKey: string;
  /** Every ProductSupply, in source order: its markets' publishing status and dates, and every SupplyDetail. */
  readonly supplies: readonly {
    readonly path: string;
    readonly marketPublishingStatus: string | null;
    readonly marketDates: readonly { readonly role: string; readonly date: string }[];
    readonly supplyDetails: readonly {
      readonly path: string;
      readonly supplierRole: string | null;
      readonly supplierName: string | null;
      readonly availability: string | null;
      readonly supplyDates: readonly { readonly role: string; readonly date: string }[];
      readonly unpricedItemType: string | null;
      readonly prices: readonly {
        readonly path: string;
        readonly type: string | null;
        readonly amount: string | null;
        readonly currency: string | null;
      }[];
    }[];
  }[];
  /** One decision per currency. */
  readonly prices: readonly OnixTargetPriceDecisionEntry[];
  /** For every carrier the Product's Publication could have, the Location it is created with. */
  readonly carriers: Readonly<
    Partial<
      Record<
        OnixLocationCarrier,
        | { readonly kind: 'NONE' }
        | ({ readonly kind: 'CANONICAL' } & OnixTargetLocationEntry)
        | { readonly kind: 'INPUT_REQUIRED' }
      >
    >
  >;
  /** Every Location the Product's supplier websites state, in source order, and what it is to each carrier. */
  readonly plannedLocations: readonly (OnixTargetLocationEntry & {
    readonly suppliers: readonly (string | null)[];
    readonly carriers: Readonly<Partial<Record<OnixLocationCarrier, OnixPlannedLocationRole['role']>>>;
  })[];
};

/** How one Publication's Price in one currency was decided (#215). */
export type OnixTargetPriceResolutionEntry = Pick<
  OnixResolvedPrice,
  'productKey' | 'findingKey' | 'currencyCode' | 'basis' | 'unitPrice'
> & { readonly paths: readonly string[] };

/** Every Product-rights fact the reduction kept, the Work licence decisions, and what the plan does with them (#211, #217). */
export type OnixTargetRightsEntry = {
  readonly products: readonly {
    readonly productKey: string;
    readonly carrier: OnixRightsCarrier;
    readonly expressions: readonly {
      readonly path: string;
      readonly type: string;
      readonly role: OnixLicenceExpressionRole;
      readonly identity: OnixLicenceIdentity | null;
      readonly link: string;
    }[];
    readonly licence: OnixProductLicence;
    readonly dated: boolean;
    readonly technicalProtection: readonly string[];
    readonly technicalProtectionState: OnixTechnicalProtectionState;
    readonly usageConstraints: readonly {
      readonly path: string;
      readonly type: string;
      readonly status: string;
      readonly limits: readonly { readonly quantity: string; readonly unit: string }[];
    }[];
    readonly deferredRights: readonly { readonly path: string; readonly scope: string; readonly element: string }[];
  }[];
  readonly groups: readonly {
    readonly groupKey: string;
    readonly licence:
      | { readonly kind: 'UNSET' }
      | {
          readonly kind: 'SET_SUPPORTED_LICENSE';
          readonly identity: OnixLicenceIdentity;
          readonly url: string;
          readonly productKeys: readonly string[];
          readonly paths: readonly string[];
        }
      | { readonly kind: 'BLOCKED'; readonly findingKeys: readonly string[] };
  }[];
  readonly licenceActions: readonly OnixWorkLicenceAction[];
  readonly acknowledgedFindingKeys: readonly string[];
};

/** Every Product-level ProductFormFeature, the accessibility candidates, contacts and each Publication's outcome (#221). */
export type OnixTargetAccessibilityEntry = {
  readonly products: readonly {
    readonly productKey: string;
    readonly features: readonly {
      readonly path: string;
      readonly type: string;
      readonly value: string | null;
      readonly role: string;
      /** The general attributes stated on the composite, its type, its value and each description: provenance. */
      readonly attributes: OnixGeneralAttributes;
      readonly typeAttributes: OnixGeneralAttributes | null;
      readonly valueAttributes: OnixGeneralAttributes | null;
      readonly descriptions: readonly {
        readonly text: string;
        readonly language: string | null;
        readonly attributes: OnixGeneralAttributes;
      }[];
    }[];
    readonly primaryStandards: readonly string[];
    readonly additionalStandards: readonly string[];
    readonly exceptions: readonly string[];
    readonly reportUrls: readonly string[];
    readonly publications: readonly {
      readonly publicationType: PublicationType;
      readonly scope: OnixAccessibilityScope;
      readonly additionalStandards: readonly string[];
      readonly incompatibleAdditionalStandards: readonly string[];
    }[];
  }[];
  /** Every ProductContact the SalesRights reduction kept, by role and scope only: never a contact value. */
  readonly contacts: readonly {
    readonly productKey: string;
    readonly path: string;
    readonly role: string | null;
    readonly scope: 'PUBLISHING_DETAIL' | 'MARKET';
  }[];
  readonly actions: readonly {
    readonly productKey: string;
    readonly publicationType: PublicationType;
    readonly resolved: OnixPublicationAccessibilityState | null;
    readonly sources: readonly {
      readonly field: OnixAccessibilityField;
      readonly value: string;
      readonly basis: 'AUTOMATIC' | 'PUBLISHER_CHOICE';
      readonly codes: readonly string[];
    }[];
    readonly omitted: readonly {
      readonly field: OnixAccessibilityField;
      readonly value: string;
      readonly reason: OnixAccessibilityOmissionReason;
      readonly codes: readonly string[];
    }[];
    readonly action: OnixPublicationAccessibilityAction['action']['kind'];
  }[];
};

type OnixTargetComponentBase = {
  readonly path: string;
  readonly productKey: string;
  readonly groupKey: string;
  readonly position: number;
};

/** A component ordinal as the plan resolves it: the source's flat LevelSequenceNumber, the publisher's, or none. */
export type OnixTargetComponentOrdinal =
  | {
      readonly status: 'RESOLVED';
      readonly ordinal: number;
      readonly basis: 'LEVEL_SEQUENCE_NUMBER' | 'PUBLISHER_INPUT';
    }
  | { readonly status: 'UNRESOLVED' };

export type OnixTargetComponentHierarchy = {
  readonly raw: string;
  readonly levels: readonly string[];
  readonly acknowledged: boolean;
} | null;

/** What each component of a Work this import creates becomes (#223). */
export type OnixTargetComponentEntry =
  | (OnixTargetComponentBase & {
      readonly kind: 'BOOK_CHAPTER';
      readonly matter: OnixComponentMatter;
      readonly ordinal: OnixTargetComponentOrdinal;
      readonly hierarchy: OnixTargetComponentHierarchy;
      readonly doi: string | null;
      readonly pages:
        | { readonly status: 'NONE' }
        | {
            readonly status: 'RESOLVED';
            readonly firstPage: string;
            readonly lastPage: string;
            readonly basis: 'PAGE_RUN' | 'PUBLISHER_CHOICE';
          }
        | { readonly status: 'OMITTED' | 'UNRESOLVED' };
      readonly pageCount: number | null;
      readonly inherited: OnixChapterIntent['inherited']['fields'];
      readonly action: OnixChapterIntent['action'];
    })
  | (OnixTargetComponentBase & {
      readonly kind: 'CONTAINED_WORK';
      readonly workType: { readonly status: 'RESOLVED'; readonly type: string } | { readonly status: 'UNRESOLVED' };
      readonly imprint: { readonly status: 'RESOLVED'; readonly imprintId: string } | { readonly status: 'UNRESOLVED' };
      readonly edition: 1;
      readonly lifecycle: {
        readonly status: string | null;
        readonly publicationDate: string | null;
        readonly withdrawnDate: string | null;
        readonly replacement: 'NOT_REQUIRED' | 'UNRESOLVED';
      };
      readonly ordinal: OnixTargetComponentOrdinal;
      readonly hierarchy: OnixTargetComponentHierarchy;
      readonly doi: string | null;
      readonly pageCount: number | null;
      /**
       * The contained Work's own descriptive state: the descriptive findings about it still unanswered, which only the
       * descriptive answers resolve - never a component answer (thoth-app#253); null where the intent was resolved with
       * no descriptive reduction.
       */
      readonly descriptive: { readonly pendingFindingKeys: readonly string[] } | null;
      readonly action: OnixContainedWorkIntent['action'];
    })
  | (OnixTargetComponentBase & {
      readonly kind: 'AV_ITEM';
      readonly avItemType: string | null;
      readonly action: 'OMIT_WITH_ACKNOWLEDGED_LOSS' | 'BLOCKED';
    })
  | (OnixTargetComponentBase & {
      readonly kind: 'UNSUPPORTED';
      readonly textItemType: string | null;
      readonly action: 'BLOCKED';
    });

/** One end of a relation: a Work this import creates, by its group key, or an exact existing Work. */
export type OnixTargetRelationEndpoint =
  | { readonly kind: 'PLANNED_WORK'; readonly groupKey: string }
  | {
      readonly kind: 'EXISTING_WORK';
      readonly workId: string;
      readonly groupKey: string | null;
      readonly imprintId: string | null;
    };

/** One canonical Reference, exactly as its RelatedProduct/34 states it. */
export type OnixTargetReferenceEntry = {
  readonly referenceOrdinal: number;
  readonly doi: string | null;
  readonly unstructuredCitation: string | null;
  readonly isbn: string | null;
  readonly issn: string | null;
  readonly paths: readonly string[];
};

/** What every RelatedWork and RelatedProduct declaration came to, the reconciled edges and the References (#224). */
export type OnixTargetRelatedMaterialEntry = {
  readonly outcomes: readonly {
    readonly declarationKey: string;
    readonly path: string;
    readonly productKey: string;
    readonly construct: OnixRelatedMaterialConstruct;
    readonly code: string;
    readonly outcome: OnixRelationOutcomeKind;
    readonly endpoint: OnixTargetRelationEndpoint | null;
    readonly relationType: OnixWorkRelationType | null;
    readonly edgeKey: string | null;
  }[];
  readonly edges: readonly {
    readonly edgeKey: string;
    readonly relator: OnixTargetRelationEndpoint;
    readonly related: OnixTargetRelationEndpoint;
    readonly relationType: OnixWorkRelationType;
    readonly basis: OnixRelationEdge['basis'];
    readonly declarationKeys: readonly string[];
    readonly ordinal:
      | { readonly status: 'ASSIGNED'; readonly ordinal: number; readonly after: number }
      | { readonly status: 'EXISTING'; readonly ordinal: number }
      | { readonly status: 'UNASSIGNED' };
    readonly state: OnixRelationEdge['state'];
  }[];
  readonly productReferences: readonly {
    readonly productKey: string;
    readonly asserted: boolean;
    readonly references: readonly OnixTargetReferenceEntry[];
  }[];
  readonly referenceActions: readonly {
    readonly groupKey: string;
    readonly action:
      | { readonly kind: 'NONE' | 'EXISTING_WORK_NOT_UPDATED' | 'BLOCKED' }
      | { readonly kind: 'CREATE'; readonly productKey: string; readonly referenceOrdinals: readonly number[] };
  }[];
};

/** Every TextContent and SupportingResource by role, every AdditionalResource candidate, and each target's action (#225). */
export type OnixTargetCollateralEntry = {
  readonly textContents: readonly {
    readonly path: string;
    readonly productKey: string;
    readonly scope: 'PRODUCT' | 'COMPONENT' | 'PROMOTIONAL_EVENT';
    readonly textType: string;
    readonly role: OnixTextContentRole;
    readonly audiences: readonly string[];
    readonly redacted: boolean;
  }[];
  readonly resources: readonly {
    readonly path: string;
    readonly productKey: string;
    readonly scope: 'PRODUCT' | 'COMPONENT' | 'PROMOTIONAL_EVENT';
    readonly contentType: string;
    readonly role: OnixResourceRole;
    readonly audiences: readonly string[];
    readonly modes: readonly string[];
    /** Every ResourceVersion, by its form and the links it gives (withheld links are null). */
    readonly versions: readonly { readonly form: string; readonly links: readonly (string | null)[] }[];
    readonly redacted: boolean;
  }[];
  readonly candidates: readonly {
    readonly groupKey: string;
    readonly componentPath: string | null;
    readonly productKeys: readonly string[];
    readonly contentType: string;
    readonly modes: readonly string[];
    readonly form: string;
    readonly audiences: readonly string[];
    readonly target: OnixAdditionalResourceTarget;
    readonly reasons: readonly OnixResourceCandidateReason[];
    readonly decisionFindingKey: string | null;
  }[];
  readonly actions: readonly {
    readonly groupKey: string;
    readonly productKey: string | null;
    readonly componentPath: string | null;
    readonly target: OnixCollateralTargetAction['target'];
    readonly action: OnixCollateralTargetAction['action'];
    readonly abstracts: readonly {
      readonly type: string;
      readonly localeCode: string;
      readonly content: string;
      readonly markupFormat: string;
      readonly canonical: boolean;
      readonly canonicalBasis: 'SINGLE' | 'TITLE_LOCALE' | 'PUBLISHER_CHOICE' | null;
      readonly textTypes: readonly string[];
    }[];
    readonly tableOfContents: { readonly content: string; readonly textTypes: readonly string[] } | null;
    readonly generalNote: { readonly content: string; readonly textTypes: readonly string[] } | null;
    readonly resources: readonly {
      readonly target: OnixAdditionalResourceTarget;
      readonly resourceOrdinal: number;
      readonly basis: 'AUTOMATIC' | 'PUBLISHER_DECISION';
    }[];
  }[];
};

/** Every CitedContent and Prize the reduction kept, the candidates' ordering and each target's intents (#226). */
export type OnixTargetReviewsPrizesEntry = {
  readonly citedContents: readonly {
    readonly path: string;
    readonly productKey: string;
    readonly scope: 'PRODUCT' | 'COMPONENT';
    readonly citedContentType: string;
    readonly sourceType: string | null;
    readonly audiences: readonly string[];
  }[];
  readonly prizes: readonly {
    readonly path: string;
    readonly productKey: string;
    readonly scope: 'PRODUCT' | 'CONTRIBUTOR';
    readonly code: string | null;
  }[];
  /**
   * The candidates of each Work group (`WORK`, by group key) and of each contained-Work ContentItem (`COMPONENT`, by the
   * reduction's own `productKey|componentPath` key), and how each child type is ordered.
   */
  readonly candidates: readonly {
    readonly scope: 'WORK' | 'COMPONENT';
    readonly key: string;
    readonly reviews: readonly OnixTargetReviewCandidateEntry[];
    readonly endorsements: readonly OnixTargetReviewCandidateEntry[];
    readonly prizes: readonly {
      readonly productKeys: readonly string[];
      readonly names: readonly { readonly name: string; readonly language: string | null }[];
      readonly code: string | null;
      readonly role: string | null;
      readonly year: string | null;
      readonly country: string | null;
      readonly sequenceNumbers: readonly string[];
    }[];
    readonly ordering: Readonly<Record<'BOOK_REVIEW' | 'ENDORSEMENT' | 'AWARD', OnixTargetOrdering>>;
  }[];
  readonly actions: readonly {
    readonly groupKey: string;
    readonly productKey: string | null;
    readonly componentPath: string | null;
    readonly target: OnixReviewsPrizesTargetAction['target'];
    readonly action: OnixReviewsPrizesTargetAction['action'];
    readonly bookReviews: readonly {
      readonly source: 'REVIEW_QUOTE' | 'CITED_REVIEW' | 'PAIRED';
      readonly target: OnixBookReviewTarget;
      readonly orderNumber: number;
      readonly orderBasis: OnixReviewsPrizesOrderBasis;
    }[];
    readonly endorsements: readonly {
      readonly target: OnixEndorsementTarget;
      readonly orderNumber: number;
      readonly orderBasis: OnixReviewsPrizesOrderBasis;
    }[];
    readonly awards: readonly {
      readonly target: OnixAwardTarget;
      readonly orderNumber: number;
      readonly orderBasis: OnixReviewsPrizesOrderBasis;
    }[];
  }[];
};

/** One review quote, cited review or endorsement candidate, by what it states (#226). */
export type OnixTargetReviewCandidateEntry = {
  readonly kind: 'REVIEW_QUOTE' | 'CITED_REVIEW' | 'ENDORSEMENT';
  readonly productKeys: readonly string[];
  readonly sourceCode: string;
  readonly audience: 'UNRESTRICTED' | 'TARGETED';
  readonly texts: readonly { readonly content: string; readonly markupFormat: string }[];
  readonly attributions: readonly string[];
  readonly links: readonly string[];
  readonly reviewDate: string | null;
  readonly sequenceNumbers: readonly string[];
};

/** How one child type is ordered: by which basis where resolved, or why not. */
export type OnixTargetOrdering =
  | { readonly status: 'EMPTY' }
  | { readonly status: 'RESOLVED'; readonly basis: Extract<OnixReviewsPrizesOrdering, { status: 'RESOLVED' }>['basis'] }
  | {
      readonly status: 'UNRESOLVED';
      readonly reason: Extract<OnixReviewsPrizesOrdering, { status: 'UNRESOLVED' }>['reason'];
    };

/** A Work the executable plan names: a Work it creates, by plan list and position, or an exact existing Work. */
export type OnixTargetPlanWorkRef =
  | { readonly kind: 'PLANNED_WORK'; readonly list: 'works' | 'chapters' | 'containedWorks'; readonly index: number }
  | { readonly kind: 'EXISTING_WORK'; readonly workId: string };

/**
 * What the executable plan writes for one Work beyond the values `OnixPlannedWorkEntry` already states. An optional
 * Work field the plan leaves unset is null; an empty string is what the plan wrote.
 */
export type OnixTargetPlannedWorkEntry = {
  readonly license: string | null;
  readonly withdrawnDate: string | null;
  readonly landingPage: string | null;
  readonly place: string;
  readonly copyrightHolder: string | null;
  readonly coverUrl: string | null;
  readonly coverCaption: string | null;
  readonly toc: string | null;
  readonly generalNote: string;
  readonly bibliographyNote: string;
  readonly lccn: string;
  readonly oclc: string;
  readonly reference: string;
  readonly abstracts: readonly {
    readonly type: string;
    readonly localeCode: string;
    readonly canonical: boolean;
    readonly content: string;
  }[];
  readonly publications: readonly {
    readonly type: string;
    readonly isbn: string;
    readonly prices: readonly { readonly currencyCode: string; readonly unitPrice: number }[];
    readonly locations: readonly {
      readonly canonical: boolean;
      readonly landingPage: string;
      readonly fullTextUrl: string;
      readonly locationPlatform: string;
    }[];
    readonly accessibilityStandard: string | null;
    readonly accessibilityAdditionalStandard: string | null;
    readonly accessibilityException: string | null;
    readonly accessibilityReportUrl: string;
  }[];
  readonly references: readonly {
    readonly orderNumber: number;
    readonly doi: string;
    readonly unstructuredCitation: string;
    readonly isbn: string | null;
    readonly issn: string | null;
  }[];
  readonly additionalResources: readonly {
    readonly title: string;
    readonly description: string;
    readonly attribution: string;
    readonly resourceType: string;
    readonly url: string;
    readonly date: string | null;
    readonly orderNumber: number;
  }[];
  readonly bookReviews: readonly {
    readonly authorName: string;
    readonly url: string;
    readonly reviewDate: string;
    readonly text: string;
    readonly orderNumber: number;
  }[];
  readonly endorsements: readonly {
    readonly authorName: string;
    readonly url: string;
    readonly text: string;
    readonly orderNumber: number;
  }[];
  readonly awards: readonly {
    readonly title: string;
    readonly role: string | null;
    readonly year: string;
    readonly country: string | null;
    readonly jury: string;
    readonly statement: string;
    readonly category: string;
    readonly url: string;
    readonly orderNumber: number;
  }[];
};

/** Everything the executable plan writes that `works` and `chapters` do not already state; empty while anything blocks. */
export type OnixTargetPlanEntry = {
  /** One entry per planned Work, in `works` order. */
  readonly works: readonly OnixTargetPlannedWorkEntry[];
  /** The contained Works, in source order, each with its parent and `IS_PART_OF` ordinal. */
  readonly containedWorks: readonly {
    readonly type: string;
    readonly status: string;
    readonly fullTitle: string;
    readonly publicationDate: string | null;
    readonly withdrawnDate: string | null;
    readonly edition: number | null;
    readonly imprintId: string;
    readonly parent: OnixTargetPlanWorkRef | null;
    /** Its own subjects, as its component-scoped descriptive reductions resolved them (thoth-app#223 A1 §7, #253). */
    readonly subjects: readonly { readonly type: string; readonly code: string; readonly ordinal: number }[];
  }[];
  readonly series: readonly {
    readonly name: string;
    readonly target:
      | { readonly kind: 'existing'; readonly seriesId: string }
      | {
          readonly kind: 'proposed';
          readonly type: string;
          readonly imprintId: string;
          readonly issnPrint: string | null;
          readonly issnDigital: string | null;
        };
    readonly members: readonly {
      readonly work: OnixTargetPlanWorkRef;
      readonly orderNumber: number;
      readonly issueNumber: number | null;
    }[];
  }[];
  readonly relations: readonly {
    readonly relator: OnixTargetPlanWorkRef;
    readonly related: OnixTargetPlanWorkRef;
    readonly relationType: OnixWorkRelationType;
    readonly relationOrdinal: number | null;
    readonly status: 'PLANNED' | 'SATISFIED';
  }[];
};

/**
 * The target-contract ledger of one scenario (thoth-app#249): what every reduction and the resolver decided, intended and
 * planned, section by section. It is computed for every run and compared, exactly and whole, wherever a fixture states it.
 */
export type OnixTargetLedger = {
  readonly findings: readonly OnixTargetFindingEntry[];
  readonly identity: OnixTargetIdentityEntry;
  readonly descriptive: readonly OnixTargetDescriptiveEntry[];
  readonly commercial: readonly OnixTargetCommercialEntry[];
  readonly priceResolutions: readonly OnixTargetPriceResolutionEntry[];
  readonly rights: OnixTargetRightsEntry;
  readonly accessibility: OnixTargetAccessibilityEntry;
  readonly components: readonly OnixTargetComponentEntry[];
  readonly relatedMaterial: OnixTargetRelatedMaterialEntry;
  readonly collateral: OnixTargetCollateralEntry;
  readonly reviewsPrizes: OnixTargetReviewsPrizesEntry;
  readonly plan: OnixTargetPlanEntry;
};

/* ------------------------------------------------------------------------------------------------ */
/* Execution layer and existing-target reconciliation (thoth-app#250)                               */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The Publication a `CREATE_PUBLICATION` action creates: a new Work's, by its position among that Work's Publications,
 * or one attached to an exact existing Work, by the values the action itself holds.
 */
export type OnixExecutionPublicationEntry =
  | { readonly source: 'WORK'; readonly index: number }
  | ({ readonly source: 'ATTACHMENT' } & OnixTargetPlannedWorkEntry['publications'][number]);

/**
 * The contributions a Work-creating action writes, by ordinal: the Contributor each one names - an existing one an exact
 * lookup returned, or the placeholder of one the import creates - and the Institution of each affiliation.
 */
export type OnixExecutionContributionEntry = {
  readonly orderNumber: number;
  readonly contributorId: string;
  readonly institutionIds: readonly string[];
};

/**
 * One action of an execution unit (thoth-app#187), by its key and the plan-owned values it performs. A Work it names is
 * referred to by plan list and position, or as the exact existing Work it is.
 */
export type OnixExecutionActionEntry =
  | {
      readonly kind: 'CREATE_WORK';
      readonly actionKey: string;
      readonly work: OnixTargetPlanWorkRef;
      readonly contributions: readonly OnixExecutionContributionEntry[];
    }
  | {
      readonly kind: 'CREATE_PUBLICATION';
      readonly actionKey: string;
      readonly work: OnixTargetPlanWorkRef;
      readonly productKey: string;
      readonly publication: OnixExecutionPublicationEntry;
    }
  | {
      readonly kind: 'CREATE_CHAPTER' | 'CREATE_CONTAINED_WORK';
      readonly actionKey: string;
      readonly work: OnixTargetPlanWorkRef;
      readonly parent: OnixTargetPlanWorkRef;
      readonly ordinal: number;
      readonly contributions: readonly OnixExecutionContributionEntry[];
    }
  | {
      readonly kind: 'CREATE_ADDITIONAL_RESOURCE' | 'CREATE_BOOK_REVIEW' | 'CREATE_ENDORSEMENT' | 'CREATE_AWARD';
      readonly actionKey: string;
      readonly work: OnixTargetPlanWorkRef;
      readonly orderNumber: number;
      readonly markupFormat: string;
    }
  | {
      readonly kind: 'CREATE_SERIES_ISSUE';
      readonly actionKey: string;
      readonly work: OnixTargetPlanWorkRef;
      readonly membership: { readonly group: number; readonly member: number };
    }
  | { readonly kind: 'CREATE_WORK_RELATION'; readonly actionKey: string; readonly relationKey: string };

/**
 * One execution unit of the executable plan (thoth-app#187): its Work group, the Work it targets - one it creates, or an
 * exact existing Work - and every action it owns, in execution order. A unit with no action has nothing to do.
 */
export type OnixExecutionUnitEntry = {
  readonly unitKey: string;
  readonly sourceOrder: number;
  readonly groupKey: string;
  readonly target: OnixTargetPlanWorkRef;
  readonly display: { readonly title: string; readonly reference: string | null };
  readonly actions: readonly OnixExecutionActionEntry[];
};

/** The execution layer of the executable plan, unit by unit in source order; empty while anything blocks. */
export type OnixExecutionLedger = {
  readonly units: readonly OnixExecutionUnitEntry[];
};

/**
 * How the plan compared the file with each exact existing Work a Product would attach to (#183, #224): every
 * descriptive family, and the References, with the outcome and its reasons. Nothing an existing Work holds is written.
 */
export type OnixReconciliationLedger = {
  readonly descriptive: readonly Pick<
    OnixDescriptiveCompatibility,
    'productKey' | 'groupKey' | 'workId' | 'family' | 'outcome' | 'reasons'
  >[];
  readonly references: readonly OnixReferenceCompatibility[];
};

export type OnixPlanningLedger = {
  /** Whether the resolver offers a plan the current executor can run (`OnixResolvedImportPlan.plan !== null`). */
  readonly executable: boolean;
  readonly records: readonly OnixRecordEntry[];
  readonly products: readonly OnixProductEntry[];
  readonly workGroups: readonly OnixWorkGroupEntry[];
  readonly blockers: readonly OnixBlockerEntry[];
  readonly findings: readonly OnixPlanFindingEntry[];
  /** The Works the executable plan creates; empty while anything blocks. */
  readonly works: readonly OnixPlannedWorkEntry[];
  /** The chapter Works the executable plan creates; empty while anything blocks. */
  readonly chapters: readonly OnixPlannedChapterEntry[];
  /** What every reduction and the resolver decided for the target (thoth-app#249). */
  readonly target: OnixTargetLedger;
  /** The executable plan's execution units and their actions (thoth-app#250). */
  readonly execution: OnixExecutionLedger;
  /** How the plan reconciled the file with the exact existing Works it attaches to (thoth-app#250). */
  readonly reconciliation: OnixReconciliationLedger;
};

/** One classified outcome of a run, in the programme vocabulary, from whichever stage emitted it. */
export type OnixOutcomeEntry = {
  readonly stage: 'SOURCE_GATE' | 'MANIFESTATION' | 'PLAN_BLOCKER' | 'PLAN_FINDING';
  readonly outcome: OnixContractClassification;
  /** The verdict, manifestation type, blocker code or `FAMILY/CODE` of the finding. */
  readonly code: string;
  /** The product or group key the outcome is about, where it is about one. */
  readonly subject: string | null;
  readonly blocking: boolean;
};

/* ------------------------------------------------------------------------------------------------ */
/* Fixture declarations                                                                              */
/* ------------------------------------------------------------------------------------------------ */

/**
 * A known defect of a system outside the importer contract (the Thoth exporter, a publisher's feed) that a fixture's
 * source exhibits. A defect is never expected contract behaviour: it is declared here, and every expected entry it
 * causes carries its reference, so the suite reports it as the defect it is.
 */
export type OnixKnownDefect = {
  /** The issue that owns the correction, `owner/repo#number`. */
  readonly reference: string;
  /** Which system is wrong. `thoth-app` is not an option: an importer defect is a failing test, not a fixture state. */
  readonly owner: 'thoth' | 'publisher-source';
  readonly summary: string;
};

/** An expected entry, optionally attributed to one declared known defect. */
export type Attributed<T> = T & { readonly defect?: string };

/**
 * Exact string values at XPath locations of the normalised Reference source. `onix:` is the Reference namespace of the
 * source's release, which a normalised Short source is in too.
 */
export type OnixNormalizedExpectation = Readonly<Record<string, readonly string[]>>;

export type OnixPlanningExpectation = {
  readonly executable: boolean;
  readonly records: readonly OnixRecordEntry[];
  readonly products: readonly OnixProductEntry[];
  readonly workGroups: readonly OnixWorkGroupEntry[];
  readonly blockers: readonly Attributed<OnixBlockerEntry>[];
  readonly findings: readonly Attributed<OnixPlanFindingEntry>[];
  readonly works: readonly OnixPlannedWorkEntry[];
  readonly chapters: readonly OnixPlannedChapterEntry[];
  /**
   * The target-contract ledger, compared exactly and whole when stated. Fixtures registered before thoth-app#249 do not
   * state it; every other registered fixture states it in every scenario (`harness.test.ts`).
   */
  readonly target?: OnixTargetLedger;
  /**
   * The execution layer and the existing-target reconciliation, each compared exactly and whole when stated. Fixtures
   * registered before thoth-app#250 do not state them; every existing-target fixture states both in every scenario.
   */
  readonly execution?: OnixExecutionLedger;
  readonly reconciliation?: OnixReconciliationLedger;
};

/**
 * One read of Thoth an existing-target scenario answers (thoth-app#250), through the authoritative lookup interface the
 * uploader plans with: the exact request the planner sends, and the current-domain objects Thoth returns for it. A read
 * the scenario does not state is refused, and every read it states must be made, exactly once.
 *
 * - `findWorks` / `getWork`: `OnixTargetLookup`, scoped to the active publisher; `matches` are keyed by
 *   `importIdentifierKey`, and an identifier with none is answered by an empty list.
 * - `findWorksGlobally` / `getWorkRelations` / `getWorkReferences`: `OnixRelatedMaterialLookup`.
 * - `getContributorsByOrcids` / `getContributors`: `ContributorService`'s reads.
 * - `getInstitutions`: `InstitutionService`'s read, by offset, limit and filter.
 */
export type OnixTargetRead =
  | {
      readonly method: 'findWorks';
      readonly publisherId: string;
      readonly identifiers: readonly ImportIdentifier[];
      readonly matches: Readonly<Record<string, readonly ExistingWorkMatch[]>>;
    }
  | { readonly method: 'getWork'; readonly workId: WorkId; readonly work: WorkEntity }
  | {
      readonly method: 'findWorksGlobally';
      readonly identifiers: readonly ImportIdentifier[];
      readonly matches: Readonly<Record<string, readonly OnixRelatedMaterialWorkMatch[]>>;
    }
  | {
      readonly method: 'getWorkRelations';
      readonly workId: WorkId;
      readonly relations: readonly OnixExistingWorkRelation[];
    }
  | {
      readonly method: 'getWorkReferences';
      readonly workId: WorkId;
      readonly references: readonly OnixExistingReference[];
    }
  | {
      readonly method: 'getContributorsByOrcids';
      readonly orcids: readonly string[];
      readonly contributors: readonly ContributorEntity[];
    }
  | { readonly method: 'getContributors'; readonly filter: string; readonly contributors: readonly ContributorEntity[] }
  | {
      readonly method: 'getInstitutions';
      readonly offset: number;
      readonly limit: number;
      readonly filter: string;
      readonly institutions: readonly InstitutionEntity[];
    };

/** A Thoth that already holds what the scenario's reads return, for the active publisher and beyond it. */
export type OnixExistingTargetState = {
  readonly kind: 'EXISTING_TARGET';
  readonly reads: readonly OnixTargetRead[];
};

/** What Thoth already holds: nothing (`EMPTY_PUBLISHER`), or exactly what an existing-target state's reads return. */
export type OnixRegressionTargetState = 'EMPTY_PUBLISHER' | OnixExistingTargetState;

/** The publisher's decisions and target state one planning expectation is made under. */
export type OnixRegressionScenario = {
  readonly name: string;
  /** What Thoth already holds for the active publisher (thoth-app#250). */
  readonly target: OnixRegressionTargetState;
  /** The publisher's answers, over `EMPTY_ONIX_PLAN_INPUTS`; absent means "as uploaded, nothing decided yet". */
  readonly inputs?: Partial<OnixPlanInputs>;
  readonly planning: OnixPlanningExpectation;
  /** Count of every classified outcome of the whole run (gate and this scenario's planning). */
  readonly outcomes: Readonly<Partial<Record<OnixContractClassification, number>>>;
};

export type OnixSourceGateExpectation = {
  readonly verdict: OnixSourceGateVerdict;
  readonly release: OnixRelease | null;
  readonly flavour: OnixFlavour | null;
  /** Where and why the gate stops; absent means it stops nowhere: every tier runs. */
  readonly stop?: OnixSourceStopEntry;
  readonly findings: readonly Attributed<OnixSourceFindingEntry>[];
  readonly recoveries: readonly Attributed<OnixRecoveryEntry>[];
  /**
   * The provenance of the normalised source, `null` when the gate produces none; compared exactly when stated. A Short
   * source must state it. Fixtures registered before thoth-app#248 do not, and `harness.test.ts` pins theirs.
   */
  readonly provenance?: OnixSourceProvenanceEntry | null;
};

/**
 * - `CONTRACT`: the source is what the accepted contract is proven against; no entry may be attributed to a defect.
 * - `KNOWN_DEFECT`: the source exhibits one or more declared defects; every blocking entry must be attributed to one
 *   of them, each declared defect must explain at least one entry, and the fixture never counts as a passing
 *   contract or round-trip case.
 */
export type OnixFixtureStatus = 'CONTRACT' | 'KNOWN_DEFECT';

export type OnixRegressionFixture = {
  /** Equal to the fixture's directory name under `fixtures/`. */
  readonly id: string;
  readonly status: OnixFixtureStatus;
  /** The contract behaviour the fixture proves, in a sentence or two. */
  readonly purpose: string;
  readonly source: {
    readonly origin: 'SYNTHETIC' | 'SANITIZED_PUBLISHER' | 'THOTH_EXPORT';
    /** Where the bytes came from and what was changed; never the unsanitised publisher file itself. */
    readonly provenance: string;
    /** SHA-256 of `source.xml`, so an edit to the source is always a deliberate fixture change. */
    readonly sha256: string;
  };
  readonly defects: readonly OnixKnownDefect[];
  /** The clock the planner runs under: lifecycle and date decisions compare against it. */
  readonly asOf: string;
  readonly imprints: readonly FormFieldOption[];
  readonly gate: OnixSourceGateExpectation;
  /** Required when the gate permits planning; must be absent otherwise. */
  readonly normalized?: OnixNormalizedExpectation;
  /** Required when the gate permits planning (at least one); must be empty otherwise. */
  readonly scenarios: readonly OnixRegressionScenario[];
  /** Count of every classified outcome when the gate refuses (no scenario runs); omitted when it permits. */
  readonly refusedOutcomes?: Readonly<Partial<Record<OnixContractClassification, number>>>;
};
