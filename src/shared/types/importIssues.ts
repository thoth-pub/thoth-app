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
  | { kind: 'onix'; productIndex: number; recordReference?: string };

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
  | 'onix.parsing_failed'
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
  | 'onix.date.unrepresentable';

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
