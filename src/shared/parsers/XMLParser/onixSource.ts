import { NameIdentifierType } from '@5stones/onix/dist/enums';

import type { OnixSourceDiagnostic, OnixSourcePath } from '../../types';
import type {
  ExtendedContributor,
  ExtendedDescriptiveDetail,
  ExtendedONIXMessageRoot,
  ExtendedProduct,
  OnixRepeatable,
  OnixText,
} from './interfaces';
import { getOnixText, normaliseOnixOrcid, type OnixOrcidSpelling } from './onix';
import {
  isOnixCodelistValue,
  ONIX_CODELIST_ISSUE,
  type OnixCodelistNumber,
  type OnixReleaseResolution,
  releaseDiagnostic,
  resolveOnixRelease,
} from './onixContract';
import { childPath, ONIX_MESSAGE_PATH } from './onixSourcePath';

export { childPath, ONIX_MESSAGE_PATH };

/** The TextContent composite this parser reads. Upstream declares neither child as attributable. */
type OnixTextContent = {
  TextType?: OnixText;
  ContentAudience?: OnixText;
  Text?: OnixText;
};

/**
 * The normalised-source layer: what an ONIX message says, read once, deterministically, before
 * anything asks what Thoth can do with it.
 *
 * `@5stones/onix` types describe a tidier document than `fast-xml-parser` produces. A repeatable
 * composite is an object when it occurs once and an array when it repeats; a missing one is
 * simply absent. Every reader that meets that ambiguity on its own writes its own
 * `Array.isArray(…) ? … : …`, and the ones that forget silently read the first occurrence of a
 * construct the standard says may repeat. This module normalises the ambiguity once, and keeps
 * the two things later reducers need in order not to have to re-read the file: source order, and
 * the exact path each fact came from.
 *
 * Nothing here looks anything up in Thoth, mutates anything, or fetches any URL a file happens
 * to contain. It is deterministic over the parsed document and nothing else.
 */

/** One occurrence of a repeatable element, with where it came from and where it sat. */
export type OnixOccurrence<T> = {
  value: T;
  /** Position in the source document, numbered from one. */
  ordinal: number;
  path: OnixSourcePath;
};

/**
 * Every occurrence of a repeatable element, in source order, each addressable on its own.
 *
 * Absent becomes an empty array, a singleton becomes one occurrence and an array becomes as many
 * as it holds, so a caller never has to know which shape the parser chose. Ordinals count
 * positions in the document rather than positions in the result: a hole — `<Language/>`, which
 * parses to an empty string rather than to a composite — is dropped without renumbering the
 * occurrences after it, because a path that pointed at the wrong element would be worse than no
 * path at all.
 */
export const normaliseOnixOccurrences = <T>(
  value: T | T[] | undefined | null,
  parent: OnixSourcePath,
  element: string,
): OnixOccurrence<NonNullable<T>>[] => {
  if (value === undefined || value === null) return [];

  const occurrences = Array.isArray(value) ? value : [value];

  return occurrences
    .map((occurrence, index) => ({ occurrence, ordinal: index + 1 }))
    .filter(({ occurrence }) => !!occurrence && typeof occurrence === 'object')
    .map(({ occurrence, ordinal }) => ({
      value: occurrence as NonNullable<T>,
      ordinal,
      path: childPath(parent, element, ordinal),
    }));
};

export type { OnixSourceDiagnostic };

/** One Language composite, exactly as the source declared it. */
export type OnixNormalisedLanguage = {
  /** ONIX List 22, as written. */
  role: string;
  /** ONIX List 74, as written. */
  code: string;
  /** Retained source semantics the target may have nowhere to put. */
  countryCode?: string;
  scriptCode?: string;
  ordinal: number;
  path: OnixSourcePath;
};

/** One TextContent composite that satisfies the pinned contract. */
export type OnixNormalisedTextContent = {
  /** ONIX List 153, as written. */
  textType: string;
  /** ONIX List 154, as written. */
  contentAudience: string;
  /** The text element itself, attributes and all, so language and textformat survive. */
  text: OnixText;
  ordinal: number;
  path: OnixSourcePath;
};

/** One declared NameIdentifier. `orcid` is present only when the scheme declared is ORCID. */
export type OnixNormalisedNameIdentifier = {
  /** ONIX List 44, as written. */
  type: string;
  /** IDValue exactly as the file wrote it. */
  value: string;
  orcid?: { canonical: string; spelling: OnixOrcidSpelling; source: string };
  ordinal: number;
  path: OnixSourcePath;
};

export type OnixNormalisedContributor = {
  nameIdentifiers: OnixNormalisedNameIdentifier[];
  ordinal: number;
  path: OnixSourcePath;
};

export type OnixNormalisedProduct = {
  /** The product's position in the message, numbered from one, as ONIX diagnostics count them. */
  index: number;
  recordReference?: string;
  path: OnixSourcePath;
  languages: OnixNormalisedLanguage[];
  contributors: OnixNormalisedContributor[];
  textContents: OnixNormalisedTextContent[];
};

export type OnixNormalisedMessage = {
  release: OnixReleaseResolution;
  products: OnixNormalisedProduct[];
  diagnostics: OnixSourceDiagnostic[];
};

/** Where a product-scoped diagnostic belongs, so every finding is addressable the same way. */
type ProductScope = { index: number; recordReference?: string };

const codelistDiagnostic = (
  scope: ProductScope,
  path: OnixSourcePath,
  codelist: OnixCodelistNumber,
  element: string,
  value: string,
): OnixSourceDiagnostic => ({
  classification: 'SOURCE_INVALID',
  severity: 'error',
  recovery: 'BLOCKING',
  code: 'onix.source.invalid_codelist_value',
  message:
    `${element} "${value}" is not a value in ONIX codelist ${codelist} (EDItEUR codelists Issue ` +
    `${ONIX_CODELIST_ISSUE}).`,
  path,
  productIndex: scope.index,
  ...(scope.recordReference ? { recordReference: scope.recordReference } : {}),
  sourceValue: value,
  evidence: { codelist, codelistIssue: ONIX_CODELIST_ISSUE },
});

/**
 * Checks one element's value against the codelist it declares itself to belong to.
 *
 * An absent element is not this function's business — whether a missing value is a defect depends
 * on the composite, and saying so here would report every optional element ONIX allows to be
 * omitted.
 */
const checkCodelist = (
  scope: ProductScope,
  parent: OnixSourcePath,
  element: string,
  value: string,
  codelist: OnixCodelistNumber,
): OnixSourceDiagnostic[] =>
  value.length === 0 || isOnixCodelistValue(codelist, value)
    ? []
    : [codelistDiagnostic(scope, childPath(parent, element), codelist, element, value)];

/**
 * Every Language composite of one product, in source order, none of them merged.
 *
 * Two occurrences that share a LanguageCode under different roles are two source facts and stay
 * two: a product declaring `01/ger` alongside `02/ger` is saying the text is German *and* that it
 * was translated from German, which is a target question — one Thoth row per language code — not
 * a source contradiction. Collapsing them here, or raising a duplicate-language error here, would
 * throw away exactly what a later reducer needs in order to tell corroboration from a collision.
 */
const normaliseLanguages = (
  detail: ExtendedDescriptiveDetail | undefined,
  detailPath: OnixSourcePath,
  scope: ProductScope,
): { languages: OnixNormalisedLanguage[]; diagnostics: OnixSourceDiagnostic[] } => {
  const occurrences = normaliseOnixOccurrences(detail?.Language, detailPath, 'Language');
  const languages = occurrences.map(({ value, ordinal, path }) => {
    const countryCode = getOnixText(value.CountryCode);
    const scriptCode = getOnixText(value.ScriptCode);

    return {
      role: getOnixText(value.LanguageRole),
      code: getOnixText(value.LanguageCode),
      ...(countryCode ? { countryCode } : {}),
      ...(scriptCode ? { scriptCode } : {}),
      ordinal,
      path,
    };
  });

  const diagnostics = languages.flatMap(({ role, code, path }) => [
    ...checkCodelist(scope, path, 'LanguageRole', role, 22),
    ...checkCodelist(scope, path, 'LanguageCode', code, 74),
  ]);

  return { languages, diagnostics };
};

/**
 * The TextContent composites of one product, minus any that ONIX says is not one.
 *
 * `Text` is mandatory inside TextContent, and a real publisher file was found to emit the
 * composite with a TextType and a ContentAudience and no Text at all. ONIX-AUDIT-PREFLIGHT-
 * RECOVERY-01 approved that exact defect as recoverable: the malformed composite is structurally
 * isolated, so dropping it whole changes the meaning of nothing around it. It is dropped whole —
 * no synthesised empty text, and no reading of its TextType or audience on their own, because
 * half of an invalid composite is not a fact. A `<Text></Text>` that is present and empty is a
 * different defect and is not covered by this recovery; it is left for whatever reads the text.
 *
 * The recovery is granted to this composite and to no other. A different mandatory child missing
 * elsewhere is still blocking.
 */
const normaliseTextContents = (
  collateral: { TextContent?: OnixRepeatable<OnixTextContent> } | undefined,
  collateralPath: OnixSourcePath,
  scope: ProductScope,
): { textContents: OnixNormalisedTextContent[]; diagnostics: OnixSourceDiagnostic[] } => {
  const occurrences = normaliseOnixOccurrences(collateral?.TextContent, collateralPath, 'TextContent');
  const textContents: OnixNormalisedTextContent[] = [];
  const diagnostics: OnixSourceDiagnostic[] = [];

  occurrences.forEach(({ value, ordinal, path }) => {
    const textType = getOnixText(value.TextType);

    if (value.Text === undefined || value.Text === null) {
      diagnostics.push({
        classification: 'SOURCE_INVALID',
        severity: 'warning',
        recovery: 'OMIT_INVALID_COMPOSITE',
        code: 'onix.source.invalid_composite',
        message:
          `A TextContent composite${textType ? ` of type ${textType}` : ''} has no Text, which ONIX requires. ` +
          'It cannot be imported and has been left out; nothing else in this record is affected.',
        path,
        productIndex: scope.index,
        ...(scope.recordReference ? { recordReference: scope.recordReference } : {}),
      });

      return;
    }

    const contentAudience = getOnixText(value.ContentAudience);

    diagnostics.push(
      ...checkCodelist(scope, path, 'TextType', textType, 153),
      ...checkCodelist(scope, path, 'ContentAudience', contentAudience, 154),
    );
    textContents.push({ textType, contentAudience, text: value.Text, ordinal, path });
  });

  return { textContents, diagnostics };
};

/**
 * The declared identifiers of one contributor, with any declared ORCID reduced to one identity.
 *
 * The scheme comes from NameIDType and from nowhere else: an ISNI is sixteen digits too, so a
 * value is an ORCID because the file said `21`, never because it looks like one. A value declared
 * as an ORCID that no approved spelling covers is a finding rather than a quiet fall back to
 * having no ORCID — that is how a contributor gets created twice.
 */
const normaliseNameIdentifiers = (
  contributor: ExtendedContributor,
  contributorPath: OnixSourcePath,
  scope: ProductScope,
): { nameIdentifiers: OnixNormalisedNameIdentifier[]; diagnostics: OnixSourceDiagnostic[] } => {
  const occurrences = normaliseOnixOccurrences(contributor.NameIdentifier, contributorPath, 'NameIdentifier');
  const nameIdentifiers: OnixNormalisedNameIdentifier[] = [];
  const diagnostics: OnixSourceDiagnostic[] = [];
  const productScope = {
    productIndex: scope.index,
    ...(scope.recordReference ? { recordReference: scope.recordReference } : {}),
  };

  occurrences.forEach(({ value, ordinal, path }) => {
    const type = getOnixText(value.NameIDType);
    const idValue = getOnixText(value.IDValue);

    diagnostics.push(...checkCodelist(scope, path, 'NameIDType', type, 44));

    if (type !== NameIdentifierType._21) {
      nameIdentifiers.push({ type, value: idValue, ordinal, path });

      return;
    }

    const normalised = normaliseOnixOrcid(idValue);

    if (normalised.kind === 'malformed') {
      diagnostics.push({
        classification: 'SOURCE_INVALID',
        severity: 'error',
        recovery: 'BLOCKING',
        code: 'onix.source.invalid_identifier',
        message:
          `"${idValue}" is declared as an ORCID (NameIDType 21) but is not written as one. Thoth reads ` +
          '0000-0001-2345-678X, 0000000123456789, https://orcid.org/… and orcid.org/… .',
        path: childPath(path, 'IDValue'),
        ...productScope,
        sourceValue: idValue,
      });
      nameIdentifiers.push({ type, value: idValue, ordinal, path });

      return;
    }

    if (normalised.spelling !== 'bare' && normalised.spelling !== 'hyphenated') {
      // Provenance, not a problem: the publisher wrote a spelling ONIX accepts and Thoth stores
      // the canonical one. Nothing is asked of anybody.
      diagnostics.push({
        classification: 'SUPPORTED_NORMALIZED',
        severity: 'info',
        recovery: 'NONE',
        code: 'onix.source.normalised_identifier',
        message: `ORCID "${idValue}" was read as ${normalised.orcid}.`,
        path: childPath(path, 'IDValue'),
        ...productScope,
        sourceValue: idValue,
      });
    }

    nameIdentifiers.push({
      type,
      value: idValue,
      orcid: { canonical: normalised.orcid, spelling: normalised.spelling, source: normalised.source },
      ordinal,
      path,
    });
  });

  return { nameIdentifiers, diagnostics };
};

const normaliseProduct = (product: ExtendedProduct, index: number, path: OnixSourcePath) => {
  const recordReference = getOnixText(product.RecordReference);
  const scope: ProductScope = { index, ...(recordReference ? { recordReference } : {}) };

  const detailPath = childPath(path, 'DescriptiveDetail');
  const { languages, diagnostics: languageDiagnostics } = normaliseLanguages(
    product.DescriptiveDetail,
    detailPath,
    scope,
  );
  const { textContents, diagnostics: textDiagnostics } = normaliseTextContents(
    product.CollateralDetail,
    childPath(path, 'CollateralDetail'),
    scope,
  );

  const contributorOccurrences = normaliseOnixOccurrences(
    product.DescriptiveDetail?.Contributor,
    detailPath,
    'Contributor',
  );
  const contributors = contributorOccurrences.map(({ value, ordinal, path: contributorPath }) => ({
    ...normaliseNameIdentifiers(value, contributorPath, scope),
    ordinal,
    path: contributorPath,
  }));

  return {
    product: {
      index,
      ...(recordReference ? { recordReference } : {}),
      path,
      languages,
      contributors: contributors.map(({ nameIdentifiers, ordinal, path: contributorPath }) => ({
        nameIdentifiers,
        ordinal,
        path: contributorPath,
      })),
      textContents,
    },
    diagnostics: [
      ...languageDiagnostics,
      ...contributors.flatMap(({ diagnostics }) => diagnostics),
      ...textDiagnostics,
    ],
  };
};

/**
 * One ONIX message read as source facts, with every deterministic finding it produced.
 *
 * Whole-message rather than product-by-product on purpose. A recoverable warning in the first
 * product does not stop the rest being validated, and findings from every product accumulate into
 * one result, so a publisher can be shown everything that is wrong with a file at once instead of
 * discovering the fourth problem after the first three books have been created.
 *
 * A message outside the supported release yields no products at all. Under a grammar this code
 * has never been validated against, the element names mean something else, and reading them would
 * be inventing facts rather than finding them.
 */
export const normaliseOnixMessage = (root: ExtendedONIXMessageRoot | undefined | null): OnixNormalisedMessage => {
  const release = resolveOnixRelease(root?.ONIXMessage);
  const unsupported = releaseDiagnostic(release);

  if (unsupported) return { release, products: [], diagnostics: [unsupported] };

  const normalised = normaliseOnixOccurrences(root?.ONIXMessage?.Product, ONIX_MESSAGE_PATH, 'Product').map(
    ({ value, ordinal, path }) => normaliseProduct(value, ordinal, path),
  );

  return {
    release,
    products: normalised.map(({ product }) => product),
    diagnostics: normalised.flatMap(({ diagnostics }) => diagnostics),
  };
};
