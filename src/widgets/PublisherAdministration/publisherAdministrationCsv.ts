import type { GetPublisherServiceConfigurationReportQuery } from '@/gql/graphql';

// One row of the superuser publisher administration report - exactly the shape
// the paginated report read already returns. The CSV is built only from these
// facts; nothing is fetched, inferred or synthesised here.
export type PublisherServicesReportRow =
  GetPublisherServiceConfigurationReportQuery['publisherServiceConfigurations'][number];

// APP-02C: the exact, non-localized, machine-readable column order. This single
// tuple is the source of both the header line and every record's field order, so
// the two can never drift. The order is fixed by the approved specification and
// must not be reordered or localized.
export const PUBLISHER_SERVICES_CSV_COLUMNS = [
  'publisher_id',
  'publisher_name',
  'subscription_package',
  'enabled_platforms',
  'configuration_updated_at',
  'last_configuration_change_at',
  'back_catalogue_job_recorded',
  'latest_back_catalogue_job_id',
  'latest_back_catalogue_job_status',
  'latest_back_catalogue_job_targets',
  'latest_back_catalogue_job_updated_at',
] as const;

// Multi-value platform/target cells are joined with this single documented
// separator. A semicolon is used rather than a comma so a multi-value cell can
// never be confused with the CSV field delimiter.
export const CSV_MULTI_VALUE_SEPARATOR = ';';

// RFC 4180 record terminator. Records are separated by CRLF; there is no
// trailing terminator, so a zero-row export is exactly the header line.
const CSV_RECORD_SEPARATOR = '\r\n';

// Leading characters a spreadsheet may interpret as the start of a formula. A
// value beginning with any of them is a formula-injection vector when a
// human-entered field (such as a publisher name) is opened in a spreadsheet.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

// Values that must force the field to be quoted under RFC 4180: the delimiter, a
// double quote, or a line break.
const CSV_QUOTE_REQUIRED = /[",\r\n]/;

// Deterministic multi-value serialization: the exact enum values are sorted
// ascending and joined, so a cell is identical regardless of the order the API
// returned the set in.
const serializeMultiValue = (values: readonly string[]): string =>
  [...values].sort().join(CSV_MULTI_VALUE_SEPARATOR);

// Spreadsheet formula neutralization. A value that begins with a formula trigger
// is prefixed with a single apostrophe so a spreadsheet shows it literally
// instead of evaluating it. Only the exported cell is affected; the value shown
// in the application UI is never altered. In practice this only ever fires for a
// human-entered field such as publisher_name - the machine columns hold UUIDs,
// enum values, booleans and timestamps that never begin with a trigger - but it
// is applied uniformly as defence in depth.
const neutralizeFormula = (value: string): string => (FORMULA_TRIGGER.test(value) ? `'${value}` : value);

// One CSV field: neutralized first, then quoted per RFC 4180 (a contained quote
// is escaped by doubling it). Neutralization runs before quoting so a value that
// both starts with a trigger and contains a delimiter is protected and escaped.
export const escapeCsvField = (raw: string): string => {
  const neutralized = neutralizeFormula(raw);

  if (CSV_QUOTE_REQUIRED.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }

  return neutralized;
};

// Maps one report row to its ordered field values, matching
// PUBLISHER_SERVICES_CSV_COLUMNS exactly. Every value comes straight from the
// report result:
// - a null lastChange leaves last_configuration_change_at empty;
// - a null latestBackCatalogueJob sets back_catalogue_job_recorded=false and
//   leaves every latest-job cell empty (no fabricated id/status/targets/time);
// - a real job sets back_catalogue_job_recorded=true and the exact API job
//   fields, with its status left as the exact durable enum (PENDING stays
//   PENDING, FAILED stays FAILED, SUCCEEDED is never relabelled as delivered);
// - enabled_platforms comes only from the configuration, job targets only from
//   the job.
const toRecordFields = (row: PublisherServicesReportRow): string[] => {
  const { publisher, subscriptionPackage, enabledDistributionPlatforms, updatedAt } = row.configuration;
  const job = row.latestBackCatalogueJob;

  return [
    String(publisher.publisherId),
    publisher.publisherName,
    String(subscriptionPackage),
    serializeMultiValue(enabledDistributionPlatforms.map((assignment) => String(assignment.platform))),
    String(updatedAt),
    row.lastChange ? String(row.lastChange.changedAt) : '',
    job ? 'true' : 'false',
    job ? String(job.distributionJobId) : '',
    job ? String(job.status) : '',
    job ? serializeMultiValue(job.targets.map((target) => String(target.platform))) : '',
    job ? String(job.updatedAt) : '',
  ];
};

// Serializes the whole filtered population to a CSV document. With no rows this
// is exactly the deterministic header line - a truthful header-only export, not
// a fabricated row.
export const serializePublisherServicesCsv = (rows: readonly PublisherServicesReportRow[]): string => {
  const header = PUBLISHER_SERVICES_CSV_COLUMNS.map(escapeCsvField).join(',');
  const records = rows.map((row) => toRecordFields(row).map(escapeCsvField).join(','));

  return [header, ...records].join(CSV_RECORD_SEPARATOR);
};

// Deterministic, filesystem-safe download filename. The UTC instant is rendered
// without the ':' characters that some filesystems reject and without
// milliseconds, e.g. thoth-publisher-services-2026-08-25T14-30-00Z.csv.
export const buildPublisherServicesCsvFilename = (now: Date): string => {
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');

  return `thoth-publisher-services-${stamp}.csv`;
};
