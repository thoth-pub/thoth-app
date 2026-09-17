import isbn3 from 'isbn3';

import type { PublicationType as TPublicationType } from '@/src/entities/publication/model/publication.types';

import { PublicationType } from '../../constants/publications';
import type { ImportIssue, ImportIssueCode, ImportIssueSource } from '../../types/importIssues';
import type {
  OnixAlternativeFormat,
  OnixCompatibilityFamily,
  OnixCompatibilityOwner,
  OnixContentItemFact,
  OnixContentItemKind,
  OnixEditionFacts,
  OnixEditionNumber,
  OnixGroupEditionDecision,
  OnixGroupingEdge,
  OnixIsbnDecision,
  OnixManifestationDecision,
  OnixManifestationFacts,
  OnixManifestationInputReason,
  OnixManifestationNote,
  OnixManifestationNoteCode,
  OnixPlanBlocker,
  OnixProductIdentifierFact,
  OnixProductNode,
  OnixQualifiedIdentifier,
  OnixRecordDisposition,
  OnixSourceHeader,
  OnixSourceLocation,
  OnixSourcePlan,
  OnixSourceRecord,
  OnixThothInconsistency,
  OnixThothRecordIdentity,
  OnixThothWorkFields,
  OnixWorkCompatibilityAssertion,
  OnixWorkDoiDecision,
  OnixWorkGroup,
  OnixWorkIdentityAlias,
} from '../../types/onixPlanning';
import { canonicaliseDoi } from '../../utils/validations';
import type {
  ExtendedHeader,
  ExtendedONIXMessageRoot,
  ExtendedProduct,
  OnixPartyIdentifier,
  OnixRelatedIdentifier,
} from './interfaces';
import { getOnixText, toOnixArray } from './onix';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * Deterministic ONIX identity, Work and manifestation planning (thoth-app#182).
 *
 * This runs after canonical source validation has permitted target planning, over the adapter value
 * bridged from the validated, normalised Reference source. It never decides whether the source is valid
 * - the canonical validator already has - and it never reads Thoth. It decides, from the file alone:
 *
 * - which records are ordinary complete Product records (ONIX List 1), and which never may be planned;
 * - which complete records assert the same Product, and whether they agree;
 * - which Products manifest the same Work, through explicit approved identity edges only;
 * - what each manifestation, and each grouped Work's edition, can and cannot become in Thoth.
 *
 * Nothing here is inferred from titles, contributors, publishers, prefixes, dates, file order or any
 * other similarity. Everything is keyed so that shuffling the Products of a file changes nothing but the
 * order things are presented in.
 */

export type PlanOnixSourceOptions = {
  /** Maps canonical Reference paths back to the submitted source, for a Short-tag file. */
  readonly provenance?: ProvenanceResolver;
};

/** RecordReferences are scoped to the file itself unless the Header names its sender strongly. */
const THIS_FILE_AUTHORITY = 'this-file';

const MESSAGE_PATH = '/ONIXMessage[1]';

/* ------------------------------------------------------------------------------------------------ */
/* Small readers                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

const textOrNull = (value: Parameters<typeof getOnixText>[0]): string | null => {
  const text = getOnixText(value);

  return text.length > 0 ? text : null;
};

const texts = (value: Parameters<typeof toOnixArray<Parameters<typeof getOnixText>[0]>>[0]): string[] =>
  toOnixArray(value)
    .map((item) => getOnixText(item))
    .filter((item) => item.length > 0);

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const sortedUnique = (values: readonly string[]): string[] => unique(values).sort();

/** Serialises adapter data with object keys sorted, so two identical records compare equal whatever their key order. */
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

type Locate = (path: string) => OnixSourceLocation;

const partyIdentifier = (
  identifier: OnixPartyIdentifier,
  typeOf: 'SenderIDType' | 'RecordSourceIDType',
): OnixQualifiedIdentifier => ({
  type: getOnixText(identifier[typeOf]),
  typeName: textOrNull(identifier.IDTypeName),
  value: getOnixText(identifier.IDValue),
});

/* ------------------------------------------------------------------------------------------------ */
/* Header and record envelope                                                                       */
/* ------------------------------------------------------------------------------------------------ */

const normaliseHeader = (header: ExtendedHeader | undefined): OnixSourceHeader => {
  const sender = header?.Sender;
  const senderIdentifiers = toOnixArray(sender?.SenderIdentifier)
    .filter((identifier) => typeof identifier === 'object')
    .map((identifier) => partyIdentifier(identifier, 'SenderIDType'))
    .filter(({ type, value }) => type.length > 0 && value.length > 0);

  const strong = senderIdentifiers
    .map(({ type, typeName, value }) => `${type}:${typeName === null ? '' : `${typeName}:`}${value}`)
    .sort();

  return {
    senderName: textOrNull(sender?.SenderName),
    senderEmail: textOrNull(sender?.EmailAddress),
    senderIdentifiers,
    authority: strong.length > 0 ? `sender:${strong.join('|')}` : THIS_FILE_AUTHORITY,
  };
};

/**
 * ONIX List 1, as a create-mode import may use it. Anything missing or outside the list is
 * `UNRECOGNISED`: a record is never read as a live complete record because its type could not be read.
 */
const classifyNotificationType = (code: string | null): OnixRecordDisposition => {
  switch (code) {
    case '01':
    case '02':
    case '03':
      return 'COMPLETE';
    case '04':
      return 'PARTIAL_UPDATE';
    case '05':
      return 'DELETE';
    case '08':
    case '09':
      return 'OWNERSHIP_TRANSFER';
    case '88':
    case '89':
      return 'TEST';
    default:
      return 'UNRECOGNISED';
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* Product identifiers                                                                              */
/* ------------------------------------------------------------------------------------------------ */

const THIRTEEN_DIGITS = /^\d{13}$/;

/** A valid ISBN-13, checked by the same parser the app validates ISBNs with. */
const isValidIsbn13 = (value: string): boolean => {
  if (!THIRTEEN_DIGITS.test(value)) return false;

  const parsed = isbn3.parse(value);

  return !!parsed?.isValid && parsed.isIsbn13 === true;
};

/** The ISBN-13 of a valid ISBN-10, or null. */
const isbn10AsIsbn13 = (value: string): string | null => {
  const parsed = isbn3.parse(value);

  return parsed?.isValid && parsed.isIsbn10 && parsed.isbn13 ? parsed.isbn13 : null;
};

/**
 * The strong Product identity an identifier establishes.
 *
 * Only the ISBN/GTIN-13 family is manifestation-unique by definition: an ISBN-13 is a GTIN-13, and a
 * valid ISBN-10 is exactly one ISBN-13. A Product DOI, LCCN, OCLC number or proprietary id may be shared
 * by several manifestations - Thoth's own exporter repeats its Work DOI, LCCN and OCLC on every
 * Publication - so none of them can say two records describe one Product.
 */
const identityKeyOf = (type: string, value: string): string | null => {
  if ((type === '15' || type === '03') && THIRTEEN_DIGITS.test(value)) return `gtin13:${value}`;

  if (type === '02') {
    const isbn13 = isbn10AsIsbn13(value);

    return isbn13 === null ? null : `gtin13:${isbn13}`;
  }

  return null;
};

/** The key under which another declaration of the same qualified identifier matches this one. */
const matchKeyOf = (type: string, typeName: string | null, value: string): string | null => {
  if (value.length === 0) return null;

  const identity = identityKeyOf(type, value);

  if (identity !== null) return identity;

  if (type === '06') {
    const doi = canonicaliseDoi(value);

    if (doi.length > 0) return `doi:${doi.toLowerCase()}`;
  }

  return `pid:${type}:${typeName ?? ''}:${value}`;
};

const productIdentifierFact = (
  identifier: OnixRelatedIdentifier,
  path: string,
  locate: Locate,
): OnixProductIdentifierFact => {
  const type = getOnixText(identifier.ProductIDType);
  const typeName = textOrNull(identifier.IDTypeName);
  const value = getOnixText(identifier.IDValue);

  return {
    ...locate(path),
    type,
    typeName,
    value,
    matchKey: matchKeyOf(type, typeName, value),
    identityKey: identityKeyOf(type, value),
  };
};

/**
 * The one Publication ISBN a record's identifiers establish.
 *
 * A valid ISBN-13 (15) is preferred. A GTIN-13 (03) supplies it only when no ISBN-13 was declared at all
 * and the GTIN is itself a valid ISBN-13. An ISBN-10 (02) never stands alone and a co-publisher ISBN (24)
 * is never the Product's own. Two distinct candidates are not a choice to make here.
 */
const decideIsbn = (identifiers: readonly OnixProductIdentifierFact[]): OnixIsbnDecision => {
  const declared15 = identifiers.filter(({ type }) => type === '15');

  if (declared15.length > 0) {
    const valid = sortedUnique(declared15.map(({ value }) => value).filter(isValidIsbn13));

    if (valid.length > 1) return { kind: 'AMBIGUOUS', candidates: valid };
    if (valid.length === 0) return { kind: 'NONE' };

    const first = declared15.find(({ value }) => value === valid[0]) as OnixProductIdentifierFact;

    return { kind: 'ACCEPTED', isbn: valid[0], declaredAs: '15', path: first.path };
  }

  const gtins = identifiers.filter(({ type, value }) => type === '03' && isValidIsbn13(value));
  const valid = sortedUnique(gtins.map(({ value }) => value));

  if (valid.length > 1) return { kind: 'AMBIGUOUS', candidates: valid };
  if (valid.length === 0) return { kind: 'NONE' };

  const first = gtins.find(({ value }) => value === valid[0]) as OnixProductIdentifierFact;

  return { kind: 'ACCEPTED', isbn: valid[0], declaredAs: '03', path: first.path };
};

/* ------------------------------------------------------------------------------------------------ */
/* Records                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

/* ------------------------------------------------------------------------------------------------ */
/* Thoth ONIX compatibility profile: structure                                                      */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The canonical Thoth ONIX 3.0/3.1 export signature (`ONIX-AUDIT-PRODUCT-IDENTITY-01` rules 84-101).
 *
 * The profile is a decoding convention, never a trust or authorisation mechanism, and a sender name alone
 * never activates it. Here it is only read from the file: whether the Header is Thoth's, and whether each
 * record carries one consistent pair of native identifiers. Whether those identifiers are true of this
 * Thoth instance is a target question answered later, or confirmed by the publisher.
 */
const THOTH_PROFILE_SENDER_NAME = 'Thoth';
const THOTH_PROFILE_SENDER_EMAIL = 'distribution@thoth.pub';
const THOTH_WORK_ID_NAME = 'thoth-work-id';
const THOTH_PUBLICATION_ID_NAME = 'thoth-publication-id';
const THOTH_INTERNAL_REFERENCE_NAME = 'internal-reference';

const UUID_URN = /^urn:uuid:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const uuidOfUrn = (value: string): string | null => UUID_URN.exec(value)?.[1].toLowerCase() ?? null;

const isNativeIdentifier = ({ type, typeName }: Pick<OnixProductIdentifierFact, 'type' | 'typeName'>) =>
  type === '01' && (typeName === THOTH_WORK_ID_NAME || typeName === THOTH_PUBLICATION_ID_NAME);

/** Identifiers the profile decodes rather than reports as losses. */
const isProfileDecodedIdentifier = ({ type, typeName }: OnixProductIdentifierFact) =>
  ['06', '13', '23'].includes(type) ||
  (type === '01' &&
    [THOTH_WORK_ID_NAME, THOTH_PUBLICATION_ID_NAME, THOTH_INTERNAL_REFERENCE_NAME].includes(typeName ?? ''));

const readThothIdentity = (
  record: Pick<OnixSourceRecord, 'identifiers' | 'notificationType' | 'recordSourceType' | 'recordReference'>,
  headerMatches: boolean,
): OnixThothRecordIdentity => {
  if (!headerMatches || !record.identifiers.some(isNativeIdentifier)) return { kind: 'NONE' };

  const valuesNamed = (name: string) =>
    record.identifiers.filter(({ type, typeName, value }) => type === '01' && typeName === name && value.length > 0);
  const works = valuesNamed(THOTH_WORK_ID_NAME);
  const publications = valuesNamed(THOTH_PUBLICATION_ID_NAME);
  const reasons: OnixThothInconsistency[] = [];

  if (record.notificationType !== '03') reasons.push('NOTIFICATION_TYPE');
  if (record.recordSourceType !== '01') reasons.push('RECORD_SOURCE_TYPE');
  if (record.recordReference === null || uuidOfUrn(record.recordReference) === null)
    reasons.push('RECORD_REFERENCE_NOT_UUID_URN');

  if (publications.length === 0) reasons.push('PUBLICATION_ID_MISSING');
  else if (publications.length > 1) reasons.push('PUBLICATION_ID_REPEATED');
  else if (uuidOfUrn(publications[0].value) === null) reasons.push('PUBLICATION_ID_NOT_UUID_URN');

  if (works.length === 0) reasons.push('WORK_ID_MISSING');
  else if (works.length > 1) reasons.push('WORK_ID_REPEATED');
  else if (uuidOfUrn(works[0].value) === null) reasons.push('WORK_ID_NOT_UUID_URN');

  // Equality is only ever established between two valid UUID URNs.
  if (publications.length === 1 && record.recordReference !== null) {
    const recordId = uuidOfUrn(record.recordReference);
    const publicationId = uuidOfUrn(publications[0].value);

    if (recordId === null || publicationId === null || recordId !== publicationId)
      reasons.push('RECORD_REFERENCE_MISMATCH');
  }

  if (reasons.length > 0) return { kind: 'INCONSISTENT', reasons };

  return {
    kind: 'NATIVE',
    workId: uuidOfUrn(works[0].value) as string,
    publicationId: uuidOfUrn(publications[0].value) as string,
  };
};

type RecordDraft = {
  readonly record: Omit<OnixSourceRecord, 'productKey'>;
  readonly product: ExtendedProduct;
};

const normaliseRecord = (
  product: ExtendedProduct,
  index: number,
  header: OnixSourceHeader,
  headerMatchesThoth: boolean,
  locate: Locate,
): RecordDraft => {
  const path = `${MESSAGE_PATH}/Product[${index}]`;
  const recordReference = textOrNull(product.RecordReference);
  const notificationType = textOrNull(product.NotificationType);
  const recordSourceType = textOrNull(product.RecordSourceType);

  const identifiers = toOnixArray(product.ProductIdentifier)
    .filter((identifier) => typeof identifier === 'object')
    .map((identifier, position) =>
      productIdentifierFact(identifier, `${path}/ProductIdentifier[${position + 1}]`, locate),
    );

  return {
    product,
    record: {
      ...locate(path),
      recordKey: `record:${index}`,
      index,
      recordReference,
      sourceRecordKey: recordReference === null ? null : `${header.authority}|${recordReference}`,
      notificationType,
      disposition: classifyNotificationType(notificationType),
      deletionText: texts(product.DeletionText),
      recordSourceType,
      recordSourceIdentifiers: toOnixArray(product.RecordSourceIdentifier)
        .filter((identifier) => typeof identifier === 'object')
        .map((identifier) => partyIdentifier(identifier, 'RecordSourceIDType')),
      recordSourceName: textOrNull(product.RecordSourceName),
      identifiers,
      thoth: readThothIdentity(
        { identifiers, notificationType, recordSourceType, recordReference },
        headerMatchesThoth,
      ),
    },
  };
};

const describeRecord = (record: Pick<OnixSourceRecord, 'index' | 'recordReference'>): string =>
  record.recordReference === null ? `product ${record.index}` : `product ${record.index} (${record.recordReference})`;

const recordSource = (record: Pick<OnixSourceRecord, 'index' | 'recordReference'>): ImportIssueSource => ({
  kind: 'onix',
  productIndex: record.index,
  ...(record.recordReference === null ? {} : { recordReference: record.recordReference }),
});

const warning = (
  record: Pick<OnixSourceRecord, 'index' | 'recordReference'>,
  code: ImportIssueCode,
  message: string,
): ImportIssue => ({ severity: 'warning', code, message, source: recordSource(record) });

const blocker = (
  code: OnixPlanBlocker['code'],
  classification: OnixPlanBlocker['classification'],
  scope: { recordKey?: string | null; productKey?: string | null; groupKey?: string | null },
  paths: readonly string[],
  detail: OnixPlanBlocker['detail'] = {},
): OnixPlanBlocker => ({
  code,
  classification,
  recordKey: scope.recordKey ?? null,
  productKey: scope.productKey ?? null,
  groupKey: scope.groupKey ?? null,
  paths,
  detail,
});

/** What an identifier the target cannot hold becomes: a visible loss, never a Work field. */
const identifierLoss = (fact: OnixProductIdentifierFact, isbn: OnixIsbnDecision, describe: string): string | null => {
  switch (fact.type) {
    case '15':
      if (isbn.kind === 'ACCEPTED' && isbn.isbn === fact.value) return null;
      if (isbn.kind === 'AMBIGUOUS') return null;

      return `ISBN-13 "${fact.value}" of ${describe} is not a valid ISBN-13, so it was not imported`;
    case '03':
      if (isbn.kind === 'ACCEPTED' && isbn.isbn === fact.value) return null;
      if (isbn.kind === 'AMBIGUOUS' && isbn.candidates.includes(fact.value)) return null;

      return `GTIN-13 "${fact.value}" of ${describe} is not the Product's ISBN and Thoth has nowhere else to store it, so it was not imported`;
    case '02':
      return `ISBN-10 "${fact.value}" of ${describe} is a legacy identifier that never stands in for the ISBN-13, so it was not imported`;
    case '24':
      return `Co-publisher ISBN-13 "${fact.value}" of ${describe} is not the Product's own ISBN, so it was not imported`;
    case '06':
      return `Product DOI "${fact.value}" of ${describe} identifies the Product, not the Work, and Thoth stores no Product DOI, so it was not imported`;
    case '13':
      return `LCCN "${fact.value}" of ${describe} is a Product identifier, not the Work's LCCN, so it was not imported`;
    case '23':
      return `OCLC number "${fact.value}" of ${describe} is a Product identifier, not the Work's OCLC number, so it was not imported`;
    default:
      return `Product identifier "${fact.value}" (${fact.typeName ?? `ProductIDType ${fact.type}`}) of ${describe} has no Thoth field, so it was not imported`;
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* Union-find                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

/** Connected components over string keys. The representative of a set never depends on insertion order. */
class DisjointSets {
  private readonly parent = new Map<string, string>();

  add(key: string) {
    if (!this.parent.has(key)) this.parent.set(key, key);
  }

  find(key: string): string {
    this.add(key);
    let root = key;

    while (this.parent.get(root) !== root) root = this.parent.get(root) as string;

    // Path compression keeps repeated finds cheap on large files.
    let node = key;

    while (node !== root) {
      const next = this.parent.get(node) as string;

      this.parent.set(node, root);
      node = next;
    }

    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA === rootB) return;

    // The smaller key is always the root, so the partition and its labels are order-independent.
    if (rootA < rootB) this.parent.set(rootB, rootA);
    else this.parent.set(rootA, rootB);
  }
}

/* ------------------------------------------------------------------------------------------------ */
/* Manifestation and edition (reduced per Product)                                                  */
/* ------------------------------------------------------------------------------------------------ */

const manifestationFactsOf = (product: ExtendedProduct): OnixManifestationFacts => {
  const detail = product.DescriptiveDetail;

  return {
    composition: textOrNull(detail?.ProductComposition),
    form: textOrNull(detail?.ProductForm),
    formDetails: texts(detail?.ProductFormDetail),
    hasProductParts: toOnixArray(detail?.ProductPart).length > 0,
  };
};

const { Azw3, Docx, Epub, FictionBook, Hardback, Html, Mobi, Mp3, Paperback, Pdf, Wav, Xml } = PublicationType.enum;

/** Every digital text PublicationType, in one fixed order, for a format the source leaves open. */
const DIGITAL_TEXT_TYPES: readonly TPublicationType[] = [Pdf, Epub, Html, Xml, Mobi, Azw3, Docx, FictionBook];

const AUDIO_TYPES: readonly TPublicationType[] = [Mp3, Wav];

/** Compositions that describe a package the target cannot hold as one Publication (List 2). */
const PACKAGE_COMPOSITIONS = new Set(['10', '11', '20', '30', '31']);

/** Format-defining e-publication details (List 175 E1xx) and the target types each can be. */
const EPUBLICATION_FORMATS: Readonly<Record<string, readonly TPublicationType[]>> = {
  E101: [Epub],
  E104: [Docx],
  E105: [Html],
  E107: [Pdf],
  E108: [Pdf],
  E127: [Mobi],
  E150: [Epub],
  // XHTML files may be .xhtml, .xht, .xml, .html or .htm: the target distinguishes HTML from XML, ONIX does not.
  E113: [Html, Xml],
  // Amazon Kindle covers .azw, .mobi, .prc and KF8.
  E116: [Azw3, Mobi],
  // "No code allocated for this e-publication format yet": nothing identifies the format.
  E100: DIGITAL_TEXT_TYPES,
};

const AUDIO_FORMATS: Readonly<Record<string, readonly TPublicationType[]>> = {
  A103: [Mp3],
  A104: [Wav],
};

/** Conformance a target type cannot say: the Product maps, and says what did not survive. */
const CONFORMANCE_NOTES: Readonly<Record<string, OnixManifestationNoteCode>> = {
  E108: 'PDF_A_NOT_REPRESENTED',
  E150: 'EPUB_A_NOT_REPRESENTED',
};

const SINGLE_DETAIL_INPUT_REASONS: Readonly<Record<string, OnixManifestationInputReason>> = {
  E113: 'XHTML_HTML_OR_XML',
  E116: 'KINDLE_FAMILY',
  E100: 'OTHER_EPUBLICATION_FORMAT',
};

const DIGITAL_DELIVERY_FORMS = new Set(['EA', 'EB', 'EC', 'ED']);
const DIGITAL_AUDIO_FORMS = new Set(['AJ', 'AN', 'AO']);
const BINDINGS: Readonly<Record<string, TPublicationType>> = { BB: Hardback, BC: Paperback };

const FORMAT_DETAIL = /^[AE]1\d\d$/;

const note = (code: OnixManifestationNoteCode, detail: string | null = null): OnixManifestationNote => ({
  code,
  detail,
});

const ordered = (types: Iterable<TPublicationType>, order: readonly TPublicationType[]) => {
  const present = new Set(types);

  return order.filter((type) => present.has(type));
};

const resolved = (type: TPublicationType, notes: OnixManifestationNote[]): OnixManifestationDecision => ({
  kind: 'RESOLVED',
  type,
  classification: notes.length === 0 ? 'SUPPORTED_LOSSLESS' : 'SUPPORTED_NORMALIZED',
  notes,
});

/**
 * The format a digital Product's details establish, among the target types of its own form family.
 *
 * Only a format-defining detail of the form's own family (E1xx for e-publications, A1xx for audio) says
 * what the file is. A characteristic detail is kept as a loss, a detail meant for another family is kept
 * as a loss and not used, and the delivery form itself is never a format.
 */
const reduceDigital = (
  form: string,
  details: readonly string[],
  family: 'E' | 'A',
  formats: Readonly<Record<string, readonly TPublicationType[]>>,
  allTypes: readonly TPublicationType[],
  unspecified: OnixManifestationInputReason,
): OnixManifestationDecision => {
  const notes = [note('DELIVERY_MODE_NOT_REPRESENTED', form)];
  const candidates = new Set<TPublicationType>();
  const formatDetails: string[] = [];
  let unsupported = false;

  details.forEach((detail) => {
    if (FORMAT_DETAIL.test(detail) && detail.startsWith(family)) {
      formatDetails.push(detail);

      const types = formats[detail];

      if (types === undefined) {
        unsupported = true;
        notes.push(note('UNSUPPORTED_FORMAT_DETAIL', detail));
      } else {
        types.forEach((type) => candidates.add(type));

        const conformance = CONFORMANCE_NOTES[detail];

        if (conformance) notes.push(note(conformance, detail));
      }
    } else if (FORMAT_DETAIL.test(detail)) {
      notes.push(note('DETAIL_NOT_FOR_THIS_FORM', detail));
    } else {
      notes.push(note('DETAIL_NOT_REPRESENTED', detail));
    }
  });

  if (formatDetails.length === 0) {
    return { kind: 'INPUT_REQUIRED', reason: unspecified, candidates: allTypes, notes };
  }

  if (candidates.size === 0) {
    return { kind: 'UNREPRESENTABLE', reason: 'FORMAT_UNREPRESENTABLE', acknowledgementRequired: false, notes };
  }

  const options = ordered(candidates, allTypes);

  if (options.length === 1 && !unsupported) return resolved(options[0], notes);

  const onlyDetail = unique(formatDetails);
  const reason =
    onlyDetail.length === 1 && !unsupported
      ? (SINGLE_DETAIL_INPUT_REASONS[onlyDetail[0]] ?? 'MULTIPLE_FORMATS')
      : 'MULTIPLE_FORMATS';

  return { kind: 'INPUT_REQUIRED', reason, candidates: options, notes };
};

/**
 * What a Product's ProductComposition, ProductForm and ProductFormDetail establish about the one Thoth
 * PublicationType its manifestation could become.
 *
 * ProductForm is the carrier or delivery; ProductFormDetail carries the format. A package is never
 * flattened into one Publication. A broad form is never a file format: `ED` is a download, not a PDF, and
 * `AJ` a downloadable audio file, not an MP3. Where more than one target type remains possible the
 * publisher chooses; where none does the manifestation is an explicit loss.
 */
export const reduceManifestation = (facts: OnixManifestationFacts): OnixManifestationDecision => {
  const { composition, form, formDetails, hasProductParts } = facts;

  if ((composition !== null && PACKAGE_COMPOSITIONS.has(composition)) || hasProductParts || form?.startsWith('S')) {
    return { kind: 'UNREPRESENTABLE', reason: 'PACKAGE', acknowledgementRequired: true, notes: [] };
  }

  if (form === null || form === '00') {
    return { kind: 'UNREPRESENTABLE', reason: 'FORM_UNDEFINED', acknowledgementRequired: false, notes: [] };
  }

  const separately = composition === '01' ? [note('NOT_AVAILABLE_SEPARATELY', '01')] : [];

  if (BINDINGS[form] !== undefined) {
    const detailNotes = formDetails.map((detail) =>
      FORMAT_DETAIL.test(detail) ? note('DETAIL_NOT_FOR_THIS_FORM', detail) : note('DETAIL_NOT_REPRESENTED', detail),
    );

    return resolved(BINDINGS[form], [...separately, ...detailNotes]);
  }

  if (form === 'BA') {
    return {
      kind: 'INPUT_REQUIRED',
      reason: 'BINDING_UNSPECIFIED',
      candidates: [Paperback, Hardback],
      notes: separately,
    };
  }

  const withSeparately = (decision: OnixManifestationDecision): OnixManifestationDecision =>
    separately.length === 0
      ? decision
      : decision.kind === 'RESOLVED'
        ? resolved(decision.type, [...separately, ...decision.notes])
        : { ...decision, notes: [...separately, ...decision.notes] };

  if (DIGITAL_DELIVERY_FORMS.has(form)) {
    return withSeparately(
      reduceDigital(form, formDetails, 'E', EPUBLICATION_FORMATS, DIGITAL_TEXT_TYPES, 'DIGITAL_FORMAT_UNSPECIFIED'),
    );
  }

  if (DIGITAL_AUDIO_FORMS.has(form)) {
    return withSeparately(
      reduceDigital(form, formDetails, 'A', AUDIO_FORMATS, AUDIO_TYPES, 'AUDIO_FORMAT_UNSPECIFIED'),
    );
  }

  return { kind: 'UNREPRESENTABLE', reason: 'FORM_UNREPRESENTABLE', acknowledgementRequired: false, notes: separately };
};

/** Thoth stores an edition in a PostgreSQL `integer`. */
const MAX_TARGET_EDITION = 2_147_483_647;

const POSITIVE_INTEGER_LEXICAL = /^\+?\d+$/;

/**
 * An EditionNumber, read only when its whole value is a positive base-10 integer.
 *
 * `parseInt` used to read `2nd` as 2, `2.5` as 2 and nothing at all as 1. A value ONIX's positive-integer
 * datatype rejects is `SOURCE_INVALID` here too (canonical validation will already have said so for a
 * submitted file), and a valid value too large for Thoth's column is `TARGET_UNREPRESENTABLE`. Neither is
 * ever turned into a number.
 */
export const normaliseEditionNumber = (raw: string | undefined | null): OnixEditionNumber => {
  if (raw === undefined || raw === null) return { kind: 'ABSENT' };

  const lexical = raw.trim();

  if (!POSITIVE_INTEGER_LEXICAL.test(lexical)) return { kind: 'SOURCE_INVALID', raw };

  const digits = lexical.replace(/^\+/, '').replace(/^0+(?=\d)/, '');

  if (digits === '0') return { kind: 'SOURCE_INVALID', raw };

  // Compared as digits before converting, so a huge value cannot be rounded into range by a float.
  if (digits.length > String(MAX_TARGET_EDITION).length || Number(digits) > MAX_TARGET_EDITION) {
    return { kind: 'TARGET_UNREPRESENTABLE', raw };
  }

  return { kind: 'VALID', value: Number(digits) };
};

const editionFactsOf = (product: ExtendedProduct): OnixEditionFacts => {
  const detail = product.DescriptiveDetail;

  return {
    number: normaliseEditionNumber(detail?.EditionNumber === undefined ? undefined : getOnixText(detail.EditionNumber)),
    types: sortedUnique(texts(detail?.EditionType)),
    statements: texts(detail?.EditionStatement),
    noEdition: detail?.NoEdition !== undefined,
  };
};

/** List 21 codes that say the edition follows an earlier one, so an omitted number may not be read as 1. */
const LATER_EDITION_TYPES = new Set(['NED', 'REV', 'ENL']);

type EditionMember = { readonly facts: OnixEditionFacts; readonly recordPath: string };

/**
 * One grouped Work's edition, reconciled across every manifestation before any default applies.
 *
 * An omission never contradicts an explicit value on another manifestation; two explicit values that
 * differ always do. Explicit edition types or statements that differ between manifestations are surfaced
 * as a conflict rather than erased because a number agrees. Only a group with no number and no evidence
 * of a later edition is normalised to 1 - an EditionStatement is never read for a number, so while one
 * stands the publisher decides.
 */
const reconcileEdition = (members: readonly EditionMember[]): OnixGroupEditionDecision => {
  const numbers = members.map(({ facts }) => facts.number);
  const invalid = numbers.flatMap((number) => (number.kind === 'SOURCE_INVALID' ? [number.raw] : []));
  const unrepresentable = numbers.flatMap((number) => (number.kind === 'TARGET_UNREPRESENTABLE' ? [number.raw] : []));

  if (invalid.length > 0) return { kind: 'BLOCKED', reason: 'SOURCE_INVALID', values: sortedUnique(invalid) };
  if (unrepresentable.length > 0)
    return { kind: 'BLOCKED', reason: 'TARGET_UNREPRESENTABLE', values: sortedUnique(unrepresentable) };

  const valid = unique(numbers.flatMap((number) => (number.kind === 'VALID' ? [number.value] : []))).sort(
    (a, b) => a - b,
  );

  if (valid.length > 1) return { kind: 'BLOCKED', reason: 'CONFLICTING_NUMBERS', values: valid.map(String) };

  const typeSets = unique(
    members.filter(({ facts }) => facts.types.length > 0).map(({ facts }) => facts.types.join('|')),
  );
  const statementSets = unique(
    members
      .filter(({ facts }) => facts.statements.length > 0)
      .map(({ facts }) => sortedUnique(facts.statements).join('|')),
  );

  if (typeSets.length > 1) {
    return {
      kind: 'BLOCKED',
      reason: 'CONFLICTING_EVIDENCE',
      values: sortedUnique(members.flatMap(({ facts }) => facts.types)),
    };
  }

  if (statementSets.length > 1) {
    return {
      kind: 'BLOCKED',
      reason: 'CONFLICTING_EVIDENCE',
      values: sortedUnique(members.flatMap(({ facts }) => facts.statements)),
    };
  }

  if (valid.length === 1) return { kind: 'EXPLICIT', edition: valid[0] };

  const evidence = [
    ...sortedUnique(members.flatMap(({ facts }) => facts.types.filter((type) => LATER_EDITION_TYPES.has(type)))).map(
      (type) => `EditionType ${type}`,
    ),
    ...sortedUnique(members.flatMap(({ facts }) => facts.statements)).map(
      (statement) => `EditionStatement "${statement}"`,
    ),
  ];

  if (evidence.length > 0) return { kind: 'INPUT_REQUIRED', evidence };

  return { kind: 'DEFAULT_FIRST_EDITION', edition: 1 };
};

const EDITION_BLOCKERS: Record<
  Extract<OnixGroupEditionDecision, { kind: 'BLOCKED' }>['reason'],
  [OnixPlanBlocker['code'], OnixPlanBlocker['classification']]
> = {
  SOURCE_INVALID: ['EDITION_SOURCE_INVALID', 'SOURCE_INVALID'],
  TARGET_UNREPRESENTABLE: ['EDITION_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE'],
  CONFLICTING_NUMBERS: ['EDITION_CONFLICT', 'SOURCE_CONFLICT'],
  CONFLICTING_EVIDENCE: ['EDITION_EVIDENCE_CONFLICT', 'SOURCE_CONFLICT'],
};

/* ------------------------------------------------------------------------------------------------ */
/* Work identity and alternative formats                                                            */
/* ------------------------------------------------------------------------------------------------ */

/** RelatedWork 01 and 06 are the two List 164 relations that say which Work a Product manifests. */
const MANIFESTATION_RELATIONS = new Set(['01', '06']);

/** RelatedProduct 06, alternative format: the one List 51 relation approved as a same-content edge. */
const ALTERNATIVE_FORMAT = '06';

/**
 * The key under which one WorkIdentifier is compared, or null when the value cannot be one.
 *
 * A DOI is canonicalised as Thoth reads DOIs, so two spellings of one DOI are one alias. A proprietary
 * identifier stays inside its own scheme name: the same value under two scheme names is two identifiers.
 */
const workAliasKeyOf = (type: string, typeName: string | null, value: string): string | null => {
  if (value.length === 0) return null;

  if (type === '06') {
    const doi = canonicaliseDoi(value);

    return doi.length > 0 ? `workdoi:${doi.toLowerCase()}` : null;
  }

  if (type === '15' && THIRTEEN_DIGITS.test(value)) return `workisbn:${value}`;

  return `work:${type}:${typeName ?? ''}:${value}`;
};

type WorkIdentity = {
  readonly aliases: OnixWorkIdentityAlias[];
  /** Alias keys per asserting composite. */
  readonly composites: string[][];
  readonly unusableDois: string[];
};

const workIdentityOf = (draft: RecordDraft, locate: Locate): WorkIdentity => {
  const { product, record } = draft;
  const recordPath = record.path;
  const aliases: OnixWorkIdentityAlias[] = [];
  const composites: string[][] = [];
  const unusableDois: string[] = [];

  // Under the profile, the misplaced thoth-work-id stands for the Work the Product manifests. It joins Products
  // like any other Work identity, but it is not a RelatedWork composite, so it never counts as a second Work.
  if (record.thoth.kind === 'NATIVE') {
    const occurrence = record.identifiers.find(
      ({ type, typeName }) => type === '01' && typeName === THOTH_WORK_ID_NAME,
    );

    if (occurrence) {
      aliases.push({
        path: occurrence.path,
        sourcePath: occurrence.sourcePath,
        type: occurrence.type,
        typeName: occurrence.typeName,
        value: occurrence.value,
        relation: 'THOTH_WORK_ID',
        key: `thothwork:${record.thoth.workId}`,
        compositePath: occurrence.path,
      });
    }
  }

  toOnixArray(product.RelatedMaterial?.RelatedWork)
    .map((relatedWork, position) => ({ relatedWork, position }))
    .filter(({ relatedWork }) => typeof relatedWork === 'object')
    .forEach(({ relatedWork, position }) => {
      const relation = getOnixText(relatedWork.WorkRelationCode);

      if (!MANIFESTATION_RELATIONS.has(relation)) return;

      const compositePath = `${recordPath}/RelatedMaterial[1]/RelatedWork[${position + 1}]`;
      const keys: string[] = [];

      toOnixArray(relatedWork.WorkIdentifier)
        .map((identifier, index) => ({ identifier, index }))
        .filter(({ identifier }) => typeof identifier === 'object')
        .forEach(({ identifier, index }) => {
          const type = getOnixText(identifier.WorkIDType);
          const typeName = textOrNull(identifier.IDTypeName);
          const value = getOnixText(identifier.IDValue);
          const key = workAliasKeyOf(type, typeName, value);

          if (key === null) {
            if (type === '06' && value.length > 0) unusableDois.push(value);
            return;
          }

          keys.push(key);
          aliases.push({
            ...locate(`${compositePath}/WorkIdentifier[${index + 1}]`),
            type,
            typeName,
            value,
            relation: relation as '01' | '06',
            key,
            compositePath,
          });
        });

      if (keys.length > 0) composites.push(keys);
    });

  return { aliases, composites, unusableDois };
};

/** Whether every composite a Product asserts shares an alias, through the others, with every other one. */
const compositesDescribeOneWork = (composites: readonly string[][]): boolean => {
  if (composites.length < 2) return true;

  const sets = new DisjointSets();

  composites.forEach((keys, index) => keys.forEach((key) => sets.union(`composite:${index}`, key)));

  return new Set(composites.map((_keys, index) => sets.find(`composite:${index}`))).size === 1;
};

/** The ISBN-13 an identifier can be looked up by in Thoth, where it is one. */
const lookupIsbnOf = ({ type, value }: OnixProductIdentifierFact): string | null => {
  if ((type === '15' || type === '03') && isValidIsbn13(value)) return value;

  return type === '02' ? isbn10AsIsbn13(value) : null;
};

/* ------------------------------------------------------------------------------------------------ */
/* Content items                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

/** List 42 front, body and back matter: the only ContentItems the approved chapter rule makes BookChapters. */
const CHAPTER_TEXT_ITEM_TYPES = new Set(['02', '03', '04']);

/**
 * Each ContentItem, classified only as far as the approved ContentDetail rule reaches in this slice.
 *
 * TextItemType 02/03/04 are structural chapters. A complete embedded work (01) needs its own WorkType and
 * an IsPartOf relation, an AVItem is never a written chapter, and anything else is unrecognised: none of
 * those is ever made a BookChapter here.
 */
const contentItemsOf = (draft: RecordDraft, locate: Locate): OnixContentItemFact[] =>
  toOnixArray(draft.product.ContentDetail?.ContentItem)
    .map((item, position) => ({ item, position }))
    .filter(({ item }) => !!item && typeof item === 'object')
    .map(({ item, position }) => {
      const textItemType = textOrNull(item.TextItem?.TextItemType);
      const kind: OnixContentItemKind =
        item.AVItem !== undefined
          ? 'AV_ITEM'
          : textItemType !== null && CHAPTER_TEXT_ITEM_TYPES.has(textItemType)
            ? 'CHAPTER'
            : textItemType === '01'
              ? 'EMBEDDED_WORK'
              : 'UNSUPPORTED';

      return { ...locate(`${draft.record.path}/ContentDetail[1]/ContentItem[${position + 1}]`), kind, textItemType };
    });

const COMPONENT_CLASSIFICATIONS: Readonly<
  Record<Exclude<OnixContentItemKind, 'CHAPTER'>, OnixPlanBlocker['classification']>
> = {
  EMBEDDED_WORK: 'TARGET_INPUT_REQUIRED',
  AV_ITEM: 'TARGET_UNREPRESENTABLE',
  UNSUPPORTED: 'TARGET_UNREPRESENTABLE',
};

/* ------------------------------------------------------------------------------------------------ */
/* Work-level compatibility families                                                                */
/* ------------------------------------------------------------------------------------------------ */

/**
 * Which Work-level families a record asserts, and where it asserts them.
 *
 * This is structural presence and nothing else. It never reads a value, never normalises one and never
 * decides what a family would become in Thoth: those are the canonical reducers owned by #183, #184 and
 * #185 (specification amendments `5665475597` and `5667182357`). Reading presence from the normalised
 * Reference source, rather than from the `WorkEntity` the legacy parser projects, is what keeps a mapping
 * the approved decisions already classify as an importer defect out of a compatibility decision.
 *
 * The families are exactly the Work-level facts an ONIX record can state that this task does not decide.
 * What it does decide - Product and Work identity, grouping, edition, publisher and imprint, WorkType,
 * ProductForm, composition and Publication identity - is absent here and keeps blocking on its own terms.
 */
type CompatibilityProbe = {
  readonly family: OnixCompatibilityFamily;
  /** Whether the element hangs off a Product or off the message Header, which speaks for every Product. */
  readonly from: 'PRODUCT' | 'HEADER';
  /** The element names from there down to the asserting element. */
  readonly steps: readonly string[];
  /** When present, only the occurrences it accepts assert the family. */
  readonly asserts?: (element: unknown) => boolean;
};

const COMPATIBILITY_OWNERS = {
  TITLE: 'APP-IMPORT-ONIX-DESC-01',
  CONTRIBUTORS: 'APP-IMPORT-ONIX-DESC-01',
  LANGUAGES: 'APP-IMPORT-ONIX-DESC-01',
  SUBJECTS: 'APP-IMPORT-ONIX-DESC-01',
  SERIES: 'APP-IMPORT-ONIX-DESC-01',
  EXTENT: 'APP-IMPORT-ONIX-DESC-01',
  ANCILLARY_CONTENT: 'APP-IMPORT-ONIX-DESC-01',
  ILLUSTRATIONS_NOTE: 'APP-IMPORT-ONIX-DESC-01',
  LICENCE: 'APP-IMPORT-ONIX-PUB-01',
  LIFECYCLE: 'APP-IMPORT-ONIX-DESC-01',
  COPYRIGHT: 'APP-IMPORT-ONIX-DESC-01',
  FUNDING: 'APP-IMPORT-ONIX-DESC-01',
  LANDING_PAGE: 'APP-IMPORT-ONIX-DESC-01',
  PLACE: 'APP-IMPORT-ONIX-DESC-01',
  COLLATERAL: 'APP-IMPORT-ONIX-REL-01',
  REFERENCES: 'APP-IMPORT-ONIX-REL-01',
  COMPONENTS: 'APP-IMPORT-ONIX-REL-01',
} as const satisfies Readonly<Record<OnixCompatibilityFamily, OnixCompatibilityOwner>>;

const COMPATIBILITY_OWNER_ISSUES = {
  'APP-IMPORT-ONIX-DESC-01': '#183',
  'APP-IMPORT-ONIX-PUB-01': '#184',
  'APP-IMPORT-ONIX-REL-01': '#185',
} as const satisfies Readonly<Record<OnixCompatibilityOwner, string>>;

/** ONIX List 45: the publisher roles the approved funding rules govern, and only those. */
const FUNDING_PUBLISHING_ROLES = new Set(['14', '15', '16']);
/** ONIX List 73: the website role that may speak for a Work's own landing page. */
const WORK_LANDING_PAGE_ROLE = '02';
/** ONIX List 51: a work this Product cites. */
const BIBLIOGRAPHIC_REFERENCE_RELATION = '34';

const isElement = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const codeIs = (element: unknown, name: string, codes: ReadonlySet<string>): boolean =>
  isElement(element) && codes.has(getOnixText(element[name] as Parameters<typeof getOnixText>[0]));

const COMPATIBILITY_PROBES: readonly CompatibilityProbe[] = [
  { family: 'TITLE', from: 'PRODUCT', steps: ['DescriptiveDetail', 'TitleDetail'] },
  { family: 'CONTRIBUTORS', from: 'PRODUCT', steps: ['DescriptiveDetail', 'Contributor'] },
  { family: 'CONTRIBUTORS', from: 'PRODUCT', steps: ['DescriptiveDetail', 'ContributorStatement'] },
  { family: 'CONTRIBUTORS', from: 'PRODUCT', steps: ['DescriptiveDetail', 'NoContributor'] },
  { family: 'LANGUAGES', from: 'PRODUCT', steps: ['DescriptiveDetail', 'Language'] },
  { family: 'LANGUAGES', from: 'HEADER', steps: ['DefaultLanguageOfText'] },
  { family: 'SUBJECTS', from: 'PRODUCT', steps: ['DescriptiveDetail', 'Subject'] },
  { family: 'SUBJECTS', from: 'PRODUCT', steps: ['DescriptiveDetail', 'NameAsSubject'] },
  { family: 'SERIES', from: 'PRODUCT', steps: ['DescriptiveDetail', 'Collection'] },
  { family: 'SERIES', from: 'PRODUCT', steps: ['DescriptiveDetail', 'NoCollection'] },
  { family: 'EXTENT', from: 'PRODUCT', steps: ['DescriptiveDetail', 'Extent'] },
  { family: 'ANCILLARY_CONTENT', from: 'PRODUCT', steps: ['DescriptiveDetail', 'AncillaryContent'] },
  { family: 'ILLUSTRATIONS_NOTE', from: 'PRODUCT', steps: ['DescriptiveDetail', 'IllustrationsNote'] },
  // Product rights are asserted by any of their structures, not only a licence (thoth-app#211): presence only here,
  // what they say is the canonical rights reducer's to decide.
  { family: 'LICENCE', from: 'PRODUCT', steps: ['DescriptiveDetail', 'EpubTechnicalProtection'] },
  { family: 'LICENCE', from: 'PRODUCT', steps: ['DescriptiveDetail', 'EpubUsageConstraint'] },
  { family: 'LICENCE', from: 'PRODUCT', steps: ['DescriptiveDetail', 'EpubLicense'] },
  { family: 'LIFECYCLE', from: 'PRODUCT', steps: ['PublishingDetail', 'PublishingStatus'] },
  { family: 'LIFECYCLE', from: 'PRODUCT', steps: ['PublishingDetail', 'PublishingStatusNote'] },
  { family: 'LIFECYCLE', from: 'PRODUCT', steps: ['PublishingDetail', 'PublishingDate'] },
  { family: 'COPYRIGHT', from: 'PRODUCT', steps: ['PublishingDetail', 'CopyrightStatement'] },
  {
    family: 'FUNDING',
    from: 'PRODUCT',
    steps: ['PublishingDetail', 'Publisher'],
    asserts: (publisher) => codeIs(publisher, 'PublishingRole', FUNDING_PUBLISHING_ROLES),
  },
  { family: 'FUNDING', from: 'PRODUCT', steps: ['PublishingDetail', 'Publisher', 'Funding'] },
  {
    family: 'LANDING_PAGE',
    from: 'PRODUCT',
    steps: ['PublishingDetail', 'Publisher', 'Website'],
    asserts: (website) => codeIs(website, 'WebsiteRole', new Set([WORK_LANDING_PAGE_ROLE])),
  },
  { family: 'PLACE', from: 'PRODUCT', steps: ['PublishingDetail', 'CityOfPublication'] },
  { family: 'COLLATERAL', from: 'PRODUCT', steps: ['CollateralDetail', 'TextContent'] },
  { family: 'COLLATERAL', from: 'PRODUCT', steps: ['CollateralDetail', 'SupportingResource'] },
  {
    family: 'REFERENCES',
    from: 'PRODUCT',
    steps: ['RelatedMaterial', 'RelatedProduct'],
    asserts: (related) => codeIs(related, 'ProductRelationCode', new Set([BIBLIOGRAPHIC_REFERENCE_RELATION])),
  },
  { family: 'COMPONENTS', from: 'PRODUCT', steps: ['ContentDetail', 'ContentItem'] },
];

/**
 * Every occurrence of a named child, with its canonical path.
 *
 * A present element is an assertion whatever it holds, so an empty marker (`<NoContributor/>`, which the
 * parser emits as an empty string) counts exactly like a filled composite. Only a key the source never
 * wrote is absent.
 */
const childOccurrences = (value: unknown, element: string, path: string): { value: unknown; path: string }[] => {
  if (!isElement(value) || !(element in value)) return [];

  const child = value[element];

  return (Array.isArray(child) ? child : [child])
    .map((occurrence, index) => ({ value: occurrence as unknown, path: `${path}/${element}[${index + 1}]` }))
    .filter(({ value: occurrence }) => occurrence !== undefined && occurrence !== null);
};

const occurrencesOf = (value: unknown, steps: readonly string[], path: string): { value: unknown; path: string }[] =>
  steps.length === 0
    ? [{ value, path }]
    : childOccurrences(value, steps[0], path).flatMap((child) =>
        occurrencesOf(child.value, steps.slice(1), child.path),
      );

const workCompatibilityOf = (
  product: ExtendedProduct,
  productPath: string,
  header: ExtendedHeader | undefined,
  locate: Locate,
): OnixWorkCompatibilityAssertion[] => {
  const byFamily = new Map<OnixCompatibilityFamily, OnixSourceLocation[]>();

  COMPATIBILITY_PROBES.forEach(({ family, from, steps, asserts }) => {
    const root =
      from === 'HEADER'
        ? { value: header as unknown, path: `${MESSAGE_PATH}/Header[1]` }
        : { value: product as unknown, path: productPath };
    const found = occurrencesOf(root.value, steps, root.path).filter(({ value }) => asserts?.(value) ?? true);

    if (found.length === 0) return;

    byFamily.set(family, [...(byFamily.get(family) ?? []), ...found.map(({ path }) => locate(path))]);
  });

  return [...byFamily].map(([family, locations]) => ({
    family,
    owner: COMPATIBILITY_OWNERS[family],
    ownerIssue: COMPATIBILITY_OWNER_ISSUES[COMPATIBILITY_OWNERS[family]],
    locations,
  }));
};

/* ------------------------------------------------------------------------------------------------ */
/* Manifestation disclosures                                                                        */
/* ------------------------------------------------------------------------------------------------ */

const manifestationNoteMessage = ({ code, detail }: OnixManifestationNote, describe: string): string => {
  switch (code) {
    case 'NOT_AVAILABLE_SEPARATELY':
      return `${describe} is a single component that is not available separately (ProductComposition 01), which Thoth cannot record`;
    case 'DELIVERY_MODE_NOT_REPRESENTED':
      return `${describe} is delivered as ProductForm ${detail}; Thoth's PublicationType records the file format, not whether it is downloaded or streamed`;
    case 'PDF_A_NOT_REPRESENTED':
      return `${describe} is PDF/A (${detail}) and is imported as PDF, which does not record PDF/A conformance`;
    case 'EPUB_A_NOT_REPRESENTED':
      return `${describe} is EPUB/A (${detail}) and is imported as EPUB, which does not record EPUB/A conformance`;
    case 'DETAIL_NOT_REPRESENTED':
      return `ProductFormDetail ${detail} of ${describe} has no Thoth field, so it was not imported`;
    case 'DETAIL_NOT_FOR_THIS_FORM':
      return `ProductFormDetail ${detail} of ${describe} does not describe its ProductForm, so it was neither used nor imported`;
    case 'UNSUPPORTED_FORMAT_DETAIL':
      return `ProductFormDetail ${detail} of ${describe} is a file format Thoth has no PublicationType for, so it was not imported`;
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* The plan                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

type ProductDraft = {
  readonly productKey: string;
  readonly members: readonly RecordDraft[];
  readonly representative: RecordDraft;
  readonly identityKeys: readonly string[];
  readonly matchKeys: readonly string[];
  readonly duplicate: OnixProductNode['duplicate'];
  readonly isbn: OnixIsbnDecision;
  readonly identity: WorkIdentity;
  readonly edition: OnixEditionFacts;
  readonly contentItems: readonly OnixContentItemFact[];
  /** Whether this Product's Work identity may join it to others: false once it asserts two Works. */
  readonly groupable: boolean;
};

/** A record's strong Product identities: its ISBN/GTIN-13 family, plus its Thoth publication id under the profile. */
const identityKeysOf = (record: Pick<OnixSourceRecord, 'identifiers' | 'thoth'>): string[] => [
  ...record.identifiers.flatMap(({ identityKey }) => (identityKey === null ? [] : [identityKey])),
  ...(record.thoth.kind === 'NATIVE' ? [`thothpub:${record.thoth.publicationId}`] : []),
];

export const planOnixSource = (root: ExtendedONIXMessageRoot, options: PlanOnixSourceOptions = {}): OnixSourcePlan => {
  const locate: Locate = (path) => ({ path, sourcePath: options.provenance?.sourcePathOf(path) ?? path });
  const header = normaliseHeader(root.ONIXMessage?.Header);
  const headerMatchesThoth =
    header.senderName === THOTH_PROFILE_SENDER_NAME && header.senderEmail === THOTH_PROFILE_SENDER_EMAIL;

  const drafts = toOnixArray(root.ONIXMessage?.Product)
    .filter((product) => !!product && typeof product === 'object')
    .map((product, position) => normaliseRecord(product, position + 1, header, headerMatchesThoth, locate));

  const warnings: ImportIssue[] = [];
  const recordBlockers: OnixPlanBlocker[] = [];
  const productBlockers: OnixPlanBlocker[] = [];
  const groupBlockers: OnixPlanBlocker[] = [];

  // Native-looking identifiers under any other Header are ordinary proprietary identifiers, and say so once.
  const ignoredNativeRecordKeys = headerMatchesThoth
    ? []
    : drafts.filter(({ record }) => record.identifiers.some(isNativeIdentifier)).map(({ record }) => record.recordKey);

  if (ignoredNativeRecordKeys.length > 0) {
    warnings.push({
      severity: 'warning',
      code: 'onix.compatibility.not_applied',
      message: `This file carries Thoth-native identifiers (${THOTH_WORK_ID_NAME}, ${THOTH_PUBLICATION_ID_NAME}), but its Header is not the sender of Thoth's own ONIX export, so they were read as ordinary proprietary identifiers`,
      source: { kind: 'file' },
    });
  }

  drafts.forEach(({ record }) => {
    if (record.disposition === 'TEST') {
      warnings.push(
        warning(
          record,
          'onix.record.omitted',
          `${describeRecord(record)} is an ONIX test record (NotificationType ${record.notificationType}), so nothing is imported from it`,
        ),
      );
    } else if (record.disposition === 'UNRECOGNISED') {
      recordBlockers.push(
        blocker('RECORD_NOTIFICATION_UNRECOGNISED', 'SOURCE_INVALID', { recordKey: record.recordKey }, [record.path], {
          notificationType: record.notificationType ?? '',
        }),
      );
    } else if (record.disposition !== 'COMPLETE') {
      recordBlockers.push(
        blocker('RECORD_NOT_COMPLETE', 'TARGET_INPUT_REQUIRED', { recordKey: record.recordKey }, [record.path], {
          notificationType: record.notificationType ?? '',
        }),
      );
    }
  });

  /* Product nodes: complete records joined by their source-record key or a strong Product identity. */
  const complete = drafts.filter(({ record }) => record.disposition === 'COMPLETE');
  const recordSets = new DisjointSets();

  const envelopeKeys = (record: Pick<OnixSourceRecord, 'sourceRecordKey' | 'identifiers' | 'thoth'>) => [
    ...(record.sourceRecordKey === null ? [] : [`src:${record.sourceRecordKey}`]),
    ...identityKeysOf(record).map((key) => `id:${key}`),
  ];

  complete.forEach(({ record }) => {
    recordSets.add(record.recordKey);
    envelopeKeys(record).forEach((key) => recordSets.union(record.recordKey, key));
  });

  const componentRecords = new Map<string, RecordDraft[]>();

  complete.forEach((draft) => {
    const component = recordSets.find(draft.record.recordKey);

    componentRecords.set(component, [...(componentRecords.get(component) ?? []), draft]);
  });

  const comparable = (draft: RecordDraft) => {
    const { RecordReference: _reference, ...content } = draft.product;

    return canonicalJson(content);
  };

  const productDrafts: ProductDraft[] = [...componentRecords.values()]
    .map((members) => [...members].sort((a, b) => a.record.index - b.record.index))
    .sort((a, b) => a[0].record.index - b[0].record.index)
    .map((members) => {
      const [representative] = members;
      const identityKeys = sortedUnique(members.flatMap(({ record }) => identityKeysOf(record)));
      const references = sortedUnique(
        members.flatMap(({ record }) => (record.recordReference === null ? [] : [record.recordReference])),
      );
      const productKey =
        identityKeys.length > 0
          ? `product:${identityKeys[0]}`
          : references.length > 0
            ? `product:record:${references[0]}`
            : `product:index:${representative.record.index}`;
      const duplicate: OnixProductNode['duplicate'] =
        members.length === 1
          ? 'SINGLE'
          : members.every((member) => comparable(member) === comparable(representative))
            ? 'COLLAPSED'
            : 'CONFLICT';
      const identity = workIdentityOf(representative, locate);

      return {
        productKey,
        members,
        representative,
        identityKeys,
        matchKeys: sortedUnique(
          members.flatMap(({ record }) =>
            record.identifiers.flatMap(({ matchKey }) => (matchKey === null ? [] : [matchKey])),
          ),
        ),
        duplicate,
        isbn: decideIsbn(representative.record.identifiers),
        identity,
        edition: editionFactsOf(representative.product),
        contentItems: contentItemsOf(representative, locate),
        groupable: compositesDescribeOneWork(identity.composites),
      };
    });

  const productKeyByRecord = new Map(
    productDrafts.flatMap(({ productKey, members }) =>
      members.map(({ record }) => [record.recordKey, productKey] as const),
    ),
  );

  /* Alternative formats resolve against every planned Product's qualified identifiers. */
  const alternativeFormatsOf = (draft: ProductDraft): OnixAlternativeFormat[] =>
    toOnixArray(draft.representative.product.RelatedMaterial?.RelatedProduct)
      .map((relatedProduct, position) => ({ relatedProduct, position }))
      .filter(
        ({ relatedProduct }) =>
          typeof relatedProduct === 'object' && getOnixText(relatedProduct.ProductRelationCode) === ALTERNATIVE_FORMAT,
      )
      .map(({ relatedProduct, position }) => {
        const path = `${draft.representative.record.path}/RelatedMaterial[1]/RelatedProduct[${position + 1}]`;
        const identifiers = toOnixArray(relatedProduct.ProductIdentifier)
          .filter((identifier) => typeof identifier === 'object')
          .map((identifier, index) =>
            productIdentifierFact(identifier, `${path}/ProductIdentifier[${index + 1}]`, locate),
          );
        const keys = new Set(identifiers.flatMap(({ matchKey }) => (matchKey === null ? [] : [matchKey])));
        const matches = (candidate: ProductDraft) => candidate.matchKeys.some((key) => keys.has(key));
        const others = productDrafts
          .filter((candidate) => candidate !== draft && matches(candidate))
          .map(({ productKey }) => productKey);

        const resolution: OnixAlternativeFormat['resolution'] =
          others.length === 1
            ? { kind: 'IN_FILE', productKey: others[0] }
            : others.length > 1
              ? { kind: 'AMBIGUOUS', productKeys: [...others].sort() }
              : matches(draft)
                ? { kind: 'SELF' }
                : { kind: 'EXTERNAL', isbns: sortedUnique(identifiers.flatMap((fact) => lookupIsbnOf(fact) ?? [])) };

        return { ...locate(path), identifiers, resolution };
      });

  const alternativeFormats = new Map(productDrafts.map((draft) => [draft.productKey, alternativeFormatsOf(draft)]));

  /* Work groups: connected components of approved explicit identity edges, and nothing else. */
  const groupSets = new DisjointSets();

  productDrafts.forEach((draft) => {
    groupSets.add(draft.productKey);

    if (draft.groupable) {
      draft.identity.aliases.forEach(({ key }) => groupSets.union(draft.productKey, `alias:${key}`));
      draft.identity.composites.forEach((keys) =>
        keys.forEach((key) => groupSets.union(`alias:${keys[0]}`, `alias:${key}`)),
      );
    }

    alternativeFormats.get(draft.productKey)?.forEach(({ resolution }) => {
      if (resolution.kind === 'IN_FILE') groupSets.union(draft.productKey, resolution.productKey);
    });
  });

  const membersByComponent = new Map<string, ProductDraft[]>();

  productDrafts.forEach((draft) => {
    const component = groupSets.find(draft.productKey);

    membersByComponent.set(component, [...(membersByComponent.get(component) ?? []), draft]);
  });

  const groupKeyByProduct = new Map<string, string>();
  const groups: OnixWorkGroup[] = [...membersByComponent.values()]
    .map((members) => {
      const productKeys = members.map(({ productKey }) => productKey).sort();
      const groupKey = `work:${productKeys[0]}`;
      const ordered = [...members].sort((a, b) => a.representative.record.index - b.representative.record.index);
      const aliases = ordered.filter(({ groupable }) => groupable).flatMap(({ identity }) => identity.aliases);

      productKeys.forEach((productKey) => groupKeyByProduct.set(productKey, groupKey));

      const aliasProducts = new Map<string, Set<string>>();

      ordered
        .filter(({ groupable }) => groupable)
        .forEach(({ productKey, identity }) =>
          identity.aliases.forEach(({ key }) =>
            aliasProducts.set(key, (aliasProducts.get(key) ?? new Set()).add(productKey)),
          ),
        );

      const edges: OnixGroupingEdge[] = [
        ...[...aliasProducts.entries()]
          .filter(([, keys]) => keys.size > 1)
          .map(([key, keys]) => ({ kind: 'WORK_IDENTITY' as const, key, productKeys: [...keys].sort() })),
        ...ordered.flatMap(({ productKey }) =>
          (alternativeFormats.get(productKey) ?? []).flatMap(({ resolution, path }) =>
            resolution.kind === 'IN_FILE'
              ? [{ kind: 'ALTERNATIVE_FORMAT' as const, from: productKey, to: resolution.productKey, path }]
              : [],
          ),
        ),
      ];

      /* The Thoth compatibility profile, where any member carries consistent native identifiers. */
      const native = ordered.flatMap(({ representative }) =>
        representative.record.thoth.kind === 'NATIVE' ? [representative] : [],
      );
      const compatibility: OnixWorkGroup['compatibility'] = native.length > 0 ? 'THOTH_PROFILE' : 'GENERIC';
      const nativeWorkIds = sortedUnique(
        native.flatMap(({ record }) => (record.thoth.kind === 'NATIVE' ? [record.thoth.workId] : [])),
      );

      if (nativeWorkIds.length > 1) {
        groupBlockers.push(
          blocker(
            'THOTH_WORK_ID_CONFLICT',
            'SOURCE_CONFLICT',
            { groupKey },
            native.map(({ record }) => record.path),
            { workIds: nativeWorkIds },
          ),
        );
      }

      /**
       * Under the profile, Work fields the exporter repeats on every Product are recovered only when every
       * Product of the group states the same value; a single dissenting or silent Product blocks the field.
       */
      const agreedProfileField = (
        field: string,
        read: (record: RecordDraft['record']) => string[],
      ): string | null | undefined => {
        const statements = ordered.map(({ representative }) => sortedUnique(read(representative.record)));
        const distinct = unique(statements.map((values) => values.join('|')));

        if (distinct.length === 1 && statements[0].length <= 1) return statements[0][0] ?? null;

        groupBlockers.push(
          blocker(
            'THOTH_WORK_FIELD_CONFLICT',
            'SOURCE_CONFLICT',
            { groupKey },
            ordered.map(({ representative }) => representative.record.path),
            { field, values: sortedUnique(statements.flat()) },
          ),
        );

        return undefined;
      };
      const valuesOf =
        (type: string, typeName: string | null = null) =>
        (record: RecordDraft['record']) =>
          record.identifiers
            .filter((fact) => fact.type === type && (typeName === null || fact.typeName === typeName))
            .map(({ value }) => (type === '06' ? canonicaliseDoi(value) || value : value));

      const profileDoi = compatibility === 'THOTH_PROFILE' ? agreedProfileField('doi', valuesOf('06')) : null;
      const profileFields =
        compatibility === 'THOTH_PROFILE'
          ? {
              lccn: agreedProfileField('lccn', valuesOf('13')),
              oclc: agreedProfileField('oclc', valuesOf('23')),
              reference: agreedProfileField('reference', valuesOf('01', THOTH_INTERNAL_REFERENCE_NAME)),
            }
          : null;
      const thothWorkFields: OnixThothWorkFields | null =
        profileFields !== null && Object.values(profileFields).every((value) => value !== undefined)
          ? { lccn: profileFields.lccn ?? '', oclc: profileFields.oclc ?? '', reference: profileFields.reference ?? '' }
          : null;

      // DOIs compare case-insensitively, as Thoth compares them; the value kept is a source spelling, chosen
      // by sorting rather than by position so the file's order cannot pick it.
      const spellings = new Map<string, string[]>();

      aliases
        .filter(({ type }) => type === '06')
        .forEach(({ key, value }) => spellings.set(key, [...(spellings.get(key) ?? []), canonicaliseDoi(value)]));

      if (typeof profileDoi === 'string') {
        const key = `workdoi:${profileDoi.toLowerCase()}`;

        spellings.set(key, [...(spellings.get(key) ?? []), profileDoi]);
      }

      const dois = [...spellings.keys()].sort().map((key) => sortedUnique(spellings.get(key) as string[])[0]);
      const workDoi: OnixWorkDoiDecision =
        profileDoi === undefined
          ? {
              kind: 'CONFLICT',
              dois: sortedUnique(ordered.flatMap(({ representative }) => valuesOf('06')(representative.record))),
            }
          : dois.length === 0
            ? { kind: 'NONE' }
            : dois.length === 1
              ? {
                  kind: 'DOI',
                  doi: dois[0],
                  basis: aliases.some(({ type }) => type === '06') ? 'WORK_IDENTIFIER' : 'THOTH_PROFILE',
                }
              : { kind: 'CONFLICT', dois };

      if (workDoi.kind === 'CONFLICT' && profileDoi !== undefined) {
        groupBlockers.push(
          blocker(
            'WORK_DOI_CONFLICT',
            'TARGET_INPUT_REQUIRED',
            { groupKey },
            aliases.filter(({ type }) => type === '06').map(({ path }) => path),
            { dois: workDoi.dois },
          ),
        );
      }

      const edition = reconcileEdition(
        ordered.map(({ edition: facts, representative }) => ({ facts, recordPath: representative.record.path })),
      );
      const editionPaths = ordered.map(({ representative }) => `${representative.record.path}/DescriptiveDetail[1]`);
      const first = ordered[0].representative.record;

      if (edition.kind === 'BLOCKED') {
        const [code, classification] = EDITION_BLOCKERS[edition.reason];

        groupBlockers.push(blocker(code, classification, { groupKey }, editionPaths, { values: edition.values }));
      } else if (edition.kind === 'INPUT_REQUIRED') {
        groupBlockers.push(
          blocker('EDITION_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', { groupKey }, editionPaths, {
            evidence: edition.evidence,
          }),
        );
      } else if (edition.kind === 'DEFAULT_FIRST_EDITION') {
        warnings.push(
          warning(
            first,
            'onix.edition.normalised',
            `No EditionNumber is given for the Work of ${describeRecord(first)}, and nothing in its edition data says it follows an earlier edition, so it is imported as edition 1`,
          ),
        );
      }

      return {
        groupKey,
        productKeys,
        firstIndex: first.index,
        aliases,
        edges,
        compatibility,
        thothWorkId: nativeWorkIds.length === 1 ? nativeWorkIds[0] : null,
        workDoi,
        thothWorkFields,
        edition,
        externalIsbns: sortedUnique(
          ordered.flatMap(({ productKey }) =>
            (alternativeFormats.get(productKey) ?? []).flatMap(({ resolution }) =>
              resolution.kind === 'EXTERNAL' ? resolution.isbns : [],
            ),
          ),
        ),
      };
    })
    .sort((a, b) => a.firstIndex - b.firstIndex);

  /* Product nodes, their disclosures and their blockers. */
  const products: OnixProductNode[] = productDrafts.map((draft) => {
    const { productKey, members, representative, duplicate, isbn, identity } = draft;
    const describe = describeRecord(representative.record);

    if (duplicate === 'COLLAPSED') {
      warnings.push(
        warning(
          representative.record,
          'onix.record.duplicate_collapsed',
          `${members.map(({ record }) => describeRecord(record)).join(', ')} repeat the same Product record, so it is imported once`,
        ),
      );
    }

    if (duplicate === 'CONFLICT') {
      productBlockers.push(
        blocker(
          'PRODUCT_RECORD_CONFLICT',
          'SOURCE_CONFLICT',
          { productKey },
          members.map(({ record }) => record.path),
          { recordKeys: members.map(({ record }) => record.recordKey) },
        ),
      );
    }

    if (isbn.kind === 'AMBIGUOUS') {
      productBlockers.push(
        blocker(
          'ISBN_AMBIGUOUS',
          'TARGET_INPUT_REQUIRED',
          { productKey },
          representative.record.identifiers
            .filter(({ type }) => type === '15' || type === '03')
            .map(({ path }) => path),
          { candidates: isbn.candidates },
        ),
      );
    }

    if (!draft.groupable) {
      productBlockers.push(
        blocker(
          'MULTIPLE_WORK_IDENTITIES',
          'SOURCE_CONFLICT',
          { productKey },
          sortedUnique(identity.aliases.map(({ compositePath }) => compositePath)),
          { aliases: identity.aliases.map(({ key }) => key) },
        ),
      );
    }

    (alternativeFormats.get(productKey) ?? []).forEach(({ resolution, path }) => {
      if (resolution.kind === 'AMBIGUOUS') {
        productBlockers.push(
          blocker('ALTERNATIVE_FORMAT_AMBIGUOUS', 'SOURCE_CONFLICT', { productKey }, [path], {
            productKeys: resolution.productKeys,
          }),
        );
      }
    });

    const { thoth } = representative.record;

    if (thoth.kind === 'INCONSISTENT') {
      productBlockers.push(
        blocker('THOTH_PROFILE_INCONSISTENT', 'SOURCE_CONFLICT', { productKey }, [representative.record.path], {
          reasons: thoth.reasons,
        }),
      );
    }

    if (duplicate !== 'CONFLICT') {
      representative.record.identifiers
        .filter((fact) => thoth.kind !== 'NATIVE' || !isProfileDecodedIdentifier(fact))
        .forEach((fact) => {
          const loss = identifierLoss(fact, isbn, describe);

          if (loss !== null) warnings.push(warning(representative.record, 'onix.identifier.unrepresentable', loss));
        });
    }

    draft.contentItems.forEach(({ kind, path }) => {
      if (kind === 'CHAPTER') return;

      productBlockers.push(
        blocker('COMPONENT_UNSUPPORTED', COMPONENT_CLASSIFICATIONS[kind], { productKey }, [path], { kind }),
      );
    });

    const manifestationFacts = manifestationFactsOf(representative.product);
    const manifestation = reduceManifestation(manifestationFacts);

    if (duplicate !== 'CONFLICT') {
      if (manifestation.kind === 'UNREPRESENTABLE' && !manifestation.acknowledgementRequired) {
        const details =
          manifestationFacts.formDetails.length > 0 ? ` ${manifestationFacts.formDetails.join(', ')}` : '';

        warnings.push(
          warning(
            representative.record,
            'onix.manifestation.omitted',
            `${describe} (ProductForm ${manifestationFacts.form ?? 'not given'}${details}) has no Thoth PublicationType, so no Publication is created for it; the rest of its record is still planned`,
          ),
        );
      } else if (manifestation.kind !== 'UNREPRESENTABLE') {
        manifestation.notes.forEach((manifestationNote) =>
          warnings.push(
            warning(
              representative.record,
              'onix.manifestation.normalised',
              manifestationNoteMessage(manifestationNote, describe),
            ),
          ),
        );
      }

      if (manifestation.kind === 'INPUT_REQUIRED') {
        productBlockers.push(
          blocker(
            'MANIFESTATION_INPUT_REQUIRED',
            'TARGET_INPUT_REQUIRED',
            { productKey },
            [`${representative.record.path}/DescriptiveDetail[1]`],
            { reason: manifestation.reason, candidates: manifestation.candidates },
          ),
        );
      } else if (manifestation.kind === 'UNREPRESENTABLE' && manifestation.acknowledgementRequired) {
        productBlockers.push(
          blocker(
            'MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED',
            'TARGET_UNREPRESENTABLE',
            { productKey },
            [`${representative.record.path}/DescriptiveDetail[1]`],
            { reason: manifestation.reason },
          ),
        );
      }
    }

    if (duplicate !== 'CONFLICT' && draft.edition.types.length > 0) {
      warnings.push(
        warning(
          representative.record,
          'onix.edition.unrepresentable',
          `Edition type ${draft.edition.types.join(', ')} of ${describe} has no Thoth field, so it was not imported`,
        ),
      );
    }

    if (duplicate !== 'CONFLICT') {
      draft.edition.statements.forEach((statement) =>
        warnings.push(
          warning(
            representative.record,
            'onix.edition.unrepresentable',
            `EditionStatement "${statement}" of ${describe} has no Thoth field, so it was not imported`,
          ),
        ),
      );
    }

    identity.unusableDois.forEach((value) =>
      warnings.push(
        warning(
          representative.record,
          'onix.identifier.unusable_doi',
          `"${value}" is given as the Work DOI of ${describe}, which Thoth cannot read as a DOI, so it was not imported`,
        ),
      ),
    );

    return {
      productKey,
      recordKeys: members.map(({ record }) => record.recordKey),
      representativeRecordKey: representative.record.recordKey,
      identityKeys: draft.identityKeys,
      matchKeys: draft.matchKeys,
      isbn,
      thoth,
      workIdentityAliases: identity.aliases,
      alternativeFormats: alternativeFormats.get(productKey) ?? [],
      manifestationFacts,
      manifestation,
      edition: draft.edition,
      imprintName: textOrNull(representative.product.PublishingDetail?.Imprint?.ImprintName),
      contentItems: draft.contentItems,
      compatibilityAssertions: workCompatibilityOf(
        representative.product,
        representative.record.path,
        root.ONIXMessage?.Header,
        locate,
      ),
      supplyLocations: childOccurrences(representative.product, 'ProductSupply', representative.record.path).map(
        ({ path }) => locate(path),
      ),
      duplicate,
      groupKey: groupKeyByProduct.get(productKey) as string,
    };
  });

  /* A non-complete record addressing a planned Product leaves nothing safe to decide about that Product. */
  drafts
    .filter(({ record }) => record.disposition !== 'COMPLETE' && record.disposition !== 'TEST')
    .forEach(({ record }) => {
      const keys = new Set(envelopeKeys(record));

      productDrafts.forEach(({ productKey, members }) => {
        const addressed = members.some(({ record: completeRecord }) =>
          envelopeKeys(completeRecord).some((key) => keys.has(key)),
        );

        if (!addressed) return;

        const existingIndex = productBlockers.findIndex(
          (candidate) => candidate.code === 'RECORD_SEQUENCE_AMBIGUITY' && candidate.productKey === productKey,
        );

        if (existingIndex >= 0) {
          const existing = productBlockers[existingIndex];

          productBlockers[existingIndex] = {
            ...existing,
            paths: [...existing.paths, record.path],
            detail: { recordKeys: [...(existing.detail.recordKeys as readonly string[]), record.recordKey] },
          };
        } else {
          productBlockers.push(
            blocker('RECORD_SEQUENCE_AMBIGUITY', 'SOURCE_CONFLICT', { productKey }, [record.path], {
              recordKeys: [record.recordKey],
            }),
          );
        }
      });
    });

  const records: OnixSourceRecord[] = drafts.map(({ record }) => ({
    ...record,
    productKey: productKeyByRecord.get(record.recordKey) ?? null,
  }));

  return {
    header,
    compatibility: { version: 'thoth-onix-3-canonical-v1', headerMatches: headerMatchesThoth, ignoredNativeRecordKeys },
    records,
    products,
    groups,
    blockers: [...recordBlockers, ...productBlockers, ...groupBlockers],
    warnings,
  };
};
