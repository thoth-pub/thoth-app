/**
 * The diagnostic vocabulary the bulk importers share.
 *
 * A bulk import used to have two outcomes per finding: raise an error and block the upload, or
 * say nothing. That forced a choice between refusing a perfectly importable file and silently
 * dropping metadata. A severity turns that into three: an error still blocks, a warning lets the
 * import proceed while telling the user what will not be represented, and saying nothing stays
 * available for what genuinely does not matter.
 *
 * Everything here is format-neutral and free of UI types: parsers produce issues, the upload and
 * preview screens render them.
 */

/**
 * Errors block the import. Warnings do not: they mean the import can proceed safely, but some
 * source information will not make it into Thoth.
 *
 * Severity is carried, never inferred from the wording of a message.
 */
export type ImportIssueSeverity = 'error' | 'warning';

/**
 * Where in the uploaded file an issue came from, structured rather than only spelled out in the
 * message, so issues can be ordered by source position without parsing prose.
 *
 * `file` is for problems with the upload as a whole — an empty file, an unsupported type, a
 * document that does not parse — which belong to no single record.
 */
export type ImportIssueSource =
  | { kind: 'file' }
  | { kind: 'csv'; row: number }
  | {
      kind: 'onix';
      productIndex: number;
      recordReference?: string;
      /**
       * The exact element the finding is about, as an {@link OnixSourcePath}. A product index
       * says which record; this says which of its hundreds of elements, so a finding stays
       * addressable when a product repeats the same composite many times over.
       */
      sourcePath?: OnixSourcePath;
    };

/**
 * A stable, machine-readable name for what went wrong, namespaced by source format.
 *
 * Codes are for code — grouping, filtering and future per-issue handling — while `message` stays
 * the display text. They are deliberately coarse: one validation code per format, plus a
 * specific code where a specific behaviour hangs off it.
 */
export type ImportIssueCode =
  | 'file.validation'
  | 'csv.validation'
  | 'csv.parsing_failed'
  | 'onix.validation'
  | 'onix.processing_failed'
  | 'onix.no_products'
  | 'onix.series.non_publisher_collection_skipped'
  | 'onix.reference.unrepresentable_citation'
  | 'onix.reference.unusable_identifier'
  /**
   * A DOI given for the work itself or for one of its chapters that Thoth cannot represent —
   * either because the value is not a DOI or because two distinct ones were supplied. Distinct
   * from `onix.reference.unusable_identifier`, which is about a cited work's metadata.
   */
  | 'onix.identifier.unusable_doi'
  /** A publication or withdrawn date Thoth cannot store as a complete calendar date. */
  | 'onix.date.unrepresentable'
  /**
   * A complete calendar date the work's status leaves nowhere to put — a withdrawal date on a
   * work that is not out of print. The date is representable; the combination is not.
   */
  | 'onix.date.incompatible_status'
  /**
   * An abstract or biography whose markup Thoth cannot safely assign to any of the API's input
   * formats — the declared ONIX textformat and the tags actually present contradict each other
   * in a way no compatibility rule covers. Blocking, because a guessed format would be sent to
   * the API only to fail there partway through the import.
   */
  | 'onix.text.unrepresentable_format'
  /**
   * An abstract or biography whose format is representable but whose text structure remains unsafe
   * or unrepresentable after format resolution and normalisation. The imported text cannot be
   * transformed into the API's accepted model without inventing semantics or losing content.
   * Distinct from `unrepresentable_format`, which is about the format itself; here only the
   * structure defeats representation. Blocking, and detected in preview, so the field is never sent
   * to the API to fail there partway through a non-atomic bulk import.
   */
  | 'onix.text.unrepresentable_structure'
  /**
   * A product or content item whose contributors carried SequenceNumber data that could not be
   * used as a complete, unique ordering — some numbered and some not, duplicated, or malformed —
   * so contributor order followed the ONIX source order instead. Non-blocking: source order is a
   * perfectly importable ordering, and the contributors are still created with contiguous ordinals.
   */
  | 'onix.contributor.sequence_fallback'
  /**
   * A Supplier Location Thoth cannot store as this Publication's canonical Location. Completeness
   * depends on the Publication's own type: a physical one needs at least one URL, a digital one
   * needs both a landing page and a full text URL, and the record supplied only one of them.
   * Non-blocking — a Publication with no Location is an ordinary, supported state, so the work and
   * the publication are still imported — but the URL the file did supply would otherwise vanish
   * without a word.
   */
  | 'onix.location.unrepresentable_canonical'
  /**
   * The message declares an ONIX release bulk ingest does not support — 2.1, or anything
   * outside the pinned 3.0/3.1 boundary. Blocking: nothing downstream may assume it can read a
   * message whose grammar it has never been validated against.
   */
  | 'onix.source.unsupported_release'
  /** The message declares no release at all, so which ONIX grammar applies is not knowable. */
  | 'onix.source.undeclared_release'
  /** The declared release and the declared ONIX namespace contradict each other. */
  | 'onix.source.ambiguous_release'
  /**
   * A composite that violates the pinned ONIX contract — a mandatory child missing — which an
   * approved recovery rule allows to be omitted rather than to block. The diagnostic carries the
   * recovery that applies; the code alone never decides whether an import may proceed.
   */
  | 'onix.source.invalid_composite'
  /** A value outside the pinned EDItEUR codelist it declares itself to belong to. */
  | 'onix.source.invalid_codelist_value'
  /** An identifier that is malformed under the grammar of the scheme the source declared. */
  | 'onix.source.invalid_identifier'
  /**
   * An identifier written in an accepted non-canonical spelling and canonicalised. Informational:
   * the source needs no correction, but the spelling it used stays visible.
   */
  | 'onix.source.normalised_identifier';

/**
 * The exact element a source fact or finding came from, as a path through the ONIX message:
 * `ONIXMessage/Product[4]/DescriptiveDetail/Language[2]`.
 *
 * Repeatable elements are numbered from one in source order, so two occurrences of the same
 * composite in one product are individually addressable and stay so however the runtime happened
 * to shape them. Paths are compared and rendered as strings; nothing downstream parses them back.
 */
export type OnixSourcePath = string;

/**
 * What a source fact is, against the pinned ONIX contract and Thoth's target model.
 *
 * This is the audit's cross-section classification vocabulary. It says what a fact *is* — never
 * what should happen about it, which is {@link OnixSourceSeverity} and
 * {@link OnixSourceRecovery}. Keeping the three apart is what lets an approved recovery rule
 * call a construct `SOURCE_INVALID` and still let the import run.
 *
 * Source normalisation emits only the source-side members. The target-side members are declared
 * here so that later reducers classify against one shared vocabulary rather than inventing
 * private ones that cannot be compared.
 */
export type OnixSourceClassification =
  /** Violates the pinned ONIX 3.0/3.1 + Issue-74 contract. */
  | 'SOURCE_INVALID'
  /** Fits the target with no semantic change. */
  | 'SUPPORTED_LOSSLESS'
  /** Fits the target through an explicit approved canonicalisation. */
  | 'SUPPORTED_NORMALIZED'
  /** Projects safely, but some approved non-material detail cannot be persisted. */
  | 'SUPPORTED_WITH_WARNING'
  /** Valid ONIX with no safe representation in the current target. */
  | 'TARGET_UNREPRESENTABLE'
  /** Valid ONIX whose ambiguity the target cannot resolve without the publisher's choice. */
  | 'TARGET_INPUT_REQUIRED'
  /** A concrete value whose declared external vocabulary cannot be checked against the pins. */
  | 'UNKNOWN';

/**
 * How loudly a finding is said, which is not what it is and not what it costs.
 *
 * `info` records something that happened — an accepted spelling canonicalised — for provenance
 * and later reporting; it is not a problem, and it is not shown as one.
 */
export type OnixSourceSeverity = 'error' | 'warning' | 'info';

/**
 * What may be done about a finding, which is the only thing that decides whether an import runs.
 *
 * `OMIT_INVALID_COMPOSITE` is the approved recovery for a malformed composite that is
 * structurally isolated: the composite is dropped whole from downstream projection, nothing is
 * synthesised in its place, and neither the product nor the file is blocked. It is granted per
 * approved rule, never inferred from a finding being merely small.
 */
export type OnixSourceRecovery =
  /** The import cannot proceed until the source is corrected. */
  | 'BLOCKING'
  /** Omit exactly the malformed composite this finding names; carry on with everything else. */
  | 'OMIT_INVALID_COMPOSITE'
  /** Nothing to recover: the fact is usable as it stands. */
  | 'NONE';

/**
 * One deterministic finding about the source, produced without looking anything up in Thoth.
 *
 * Richer than {@link ImportIssue}, which is what the current upload and preview screens render:
 * an issue says what to tell the user, while a diagnostic also says what the fact is, exactly
 * where it came from, and what the contract allows to be done about it. Diagnostics project down
 * to issues; issues never project back up.
 */
export type OnixSourceDiagnostic = {
  classification: OnixSourceClassification;
  severity: OnixSourceSeverity;
  recovery: OnixSourceRecovery;
  code: ImportIssueCode;
  /** Display-ready English text, in ONIX's own vocabulary. */
  message: string;
  path: OnixSourcePath;
  /** The product this finding sits in, numbered from one. Absent for message-level findings. */
  productIndex?: number;
  recordReference?: string;
  /** The offending or canonicalised source value, exactly as the file wrote it. */
  sourceValue?: string;
  /** What the finding was judged against, when a pinned resource decided it. */
  evidence?: {
    /** The release the message declared. */
    release?: string;
    /** The declared ONIX namespace, when it is evidence about the release. */
    namespace?: string;
    /** The EDItEUR codelist number the value was checked against. */
    codelist?: number;
    /** The EDItEUR codelists issue those values are pinned at. */
    codelistIssue?: number;
  };
};

export type ImportIssue = {
  severity: ImportIssueSeverity;
  code: ImportIssueCode;
  /** Display-ready text. Translated for CSV; English ONIX vocabulary for ONIX. */
  message: string;
  source: ImportIssueSource;
};

/**
 * Whether a parse produced anything the import can run. Derived from the issues rather than
 * tracked alongside them — see `importStatus` — and carried by `ImportParseResult`.
 */
export type ImportStatus = 'success' | 'failed';
