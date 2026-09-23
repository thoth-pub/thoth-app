'use client';

import { FormControlLabel } from '@mui/material';
import { useId, useState } from 'react';

import type { PublicationType } from '@/src/entities/publication/model/publication.types';
import type { WorkType } from '@/src/entities/work/model/work.types';
import {
  accessibilityAdditionalEpubStandardOptions,
  accessibilityAdditionalPDFStandardOptions,
  accessibilityExceptionOptions,
  accessibilityStandardOptions,
  languageOptionsAlt,
} from '@/src/shared/constants';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import { isOfferedOnixComponentAnswer } from '@/src/shared/parsers/XMLParser/onixComponents';
import { normaliseEditionNumber } from '@/src/shared/parsers/XMLParser/onixPlanning';
import { ONIX_SUPPORTED_LICENCES } from '@/src/shared/parsers/XMLParser/onixRights';
import {
  isAcknowledgeableRightsFinding,
  ONIX_EXCLUDABLE_DISPOSITIONS,
  ONIX_FILE_WORK_TYPES,
  ONIX_WORK_OVERRIDE_TYPES,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import {
  ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  ONIX_COMPONENT_ACKNOWLEDGED,
  ONIX_COMPONENT_OMIT,
  ONIX_DESCRIPTIVE_ACKNOWLEDGED,
  ONIX_MANIFESTATION_OMIT,
  ONIX_PRICE_OMIT,
  ONIX_RIGHTS_ACKNOWLEDGED,
  type OnixAccessibilityField,
  type OnixAccessibilityFinding,
  type OnixCommercialFinding,
  type OnixComponentFact,
  type OnixComponentIntent,
  type OnixDescriptiveFinding,
  type OnixDescriptiveFindingCode,
  type OnixDescriptiveInput,
  type OnixImportPlanSidecar,
  type OnixManifestationChoice,
  type OnixPlanBlocker,
  type OnixPlanBlockerCode,
  type OnixPlanFinding,
  type OnixPlanInputs,
  type OnixPlannedProduct,
  type OnixPlannedRecord,
  type OnixPlannedWorkGroup,
  type OnixProductContactFact,
  type OnixProductFormFeatureFact,
  type OnixPublicationAccessibilityAction,
  type OnixRightsFinding,
  type OnixSalesRightsFinding,
  type OnixWorkLicenceAction,
} from '@/src/shared/types';
import { Button, Checkbox, TextField, Typography } from '@/src/shared/ui';

import { SeverityLabel } from './OnixValidationStatus';

type OnixPlanResolutionProps = {
  /** The plan as resolved for the publisher's current decisions, which it carries as `inputs`. */
  readonly sidecar: OnixImportPlanSidecar;
  /**
   * The non-binding WorkType suggestions for new Works, by Work group key (#179 WorkType Amendment 1, 5699313101).
   * Shown as evidence beside the WorkType decision only: nothing is selected or recorded from them.
   */
  readonly workTypeSuggestions?: Readonly<Record<string, WorkType>>;
  /** Hands on the publisher's next decisions; the caller resolves the plan again from them. */
  readonly onChange: (inputs: OnixPlanInputs) => void;
};

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

const NO_SUGGESTIONS: Readonly<Record<string, WorkType>> = {};

/** A record without one of its keys, so that taking a decision back leaves no trace of it. */
const without = <T,>(decisions: Readonly<Record<string, T>>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(decisions).filter(([decided]) => decided !== key));

/** Answer keys the descriptive reductions give a fixed meaning, which are named rather than shown as codes. */
const DESCRIPTIVE_OPTION_NAMES: ReadonlySet<string> = new Set([
  'OMIT',
  'FIRST_SOURCE_SUBJECT',
  'SERIES',
  'NOT_SERIES',
  'BOOK_SERIES',
  'JOURNAL',
  'PRINT',
  'DIGITAL',
  'PRINT_DIGITAL',
  'DIGITAL_PRINT',
  'FILE_ORDER',
  'SEQUENCE_ORDER',
]);

/**
 * The decisions that choose an existing Thoth institution, by what not choosing one leaves out. Their other options
 * are name-search suggestions only (5562159621 rules 116-117, 5542084141 rule 72): none is ever chosen for the publisher.
 */
const INSTITUTION_DECISIONS: Readonly<Partial<Record<OnixDescriptiveFindingCode, string>>> = {
  CONTRIBUTOR_AFFILIATION_UNIDENTIFIED: 'NO_AFFILIATION',
  CONTRIBUTOR_AFFILIATION_UNRESOLVED: 'NO_AFFILIATION',
  FUNDING_FUNDER_UNIDENTIFIED: 'NO_FUNDING',
  FUNDING_FUNDER_UNRESOLVED: 'NO_FUNDING',
};

/** The Product-rights findings (thoth-app#211) by what they are about, shown apart (5568901904 rules 125-129). */
type RightsSection = 'LICENCE' | 'TECHNICAL_PROTECTION' | 'USAGE_CONSTRAINTS' | 'OTHER';

const RIGHTS_SECTIONS: readonly RightsSection[] = ['LICENCE', 'TECHNICAL_PROTECTION', 'USAGE_CONSTRAINTS', 'OTHER'];

/** One entry of the rights sections: a finding, and the acknowledgement label it offers, if any. */
type RightsEntry = {
  readonly finding: Pick<
    OnixRightsFinding | OnixPlanFinding,
    'key' | 'blocking' | 'message' | 'productKey' | 'groupKey'
  >;
  readonly acknowledgement: string | null;
};

const rightsSectionOf = (code: OnixRightsFinding['code']): RightsSection => {
  if (code.startsWith('RIGHTS_LICENCE') || code.startsWith('RIGHTS_ADDITIONAL') || code.startsWith('RIGHTS_POLICY')) {
    return 'LICENCE';
  }
  if (code.startsWith('RIGHTS_TECHNICAL_PROTECTION')) return 'TECHNICAL_PROTECTION';
  if (code.startsWith('RIGHTS_USAGE_CONSTRAINT')) return 'USAGE_CONSTRAINTS';

  return 'OTHER';
};

/** List 198, exactly the roles the panel has words for; any other role is shown by its code. */
const PRODUCT_CONTACT_ROLES: ReadonlySet<string> = new Set([
  '00',
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '99',
]);

/** The blockers a control of this panel answers where the plan waits on them, rather than a problem to read about. */
const DECISION_BLOCKERS: ReadonlySet<OnixPlanBlockerCode> = new Set([
  'WORK_TYPE_INPUT_REQUIRED',
  'EDITION_INPUT_REQUIRED',
  'MANIFESTATION_INPUT_REQUIRED',
  'MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED',
  'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED',
  'RECORD_NOT_COMPLETE',
  'RECORD_SEQUENCE_AMBIGUITY',
]);

/** The findings a blocker waits on: its own, or those an unverified existing-Work family is waiting for. */
const findingKeysOf = ({ detail }: OnixPlanBlocker): string[] =>
  typeof detail.findingKey === 'string'
    ? [detail.findingKey]
    : Array.isArray(detail.findingKeys)
      ? [...(detail.findingKeys as readonly string[])]
      : [];

/** The plan-finding families the accessibility and product-form-feature sections show (thoth-app#221). */
const ACCESSIBILITY_FAMILIES: ReadonlySet<OnixPlanFinding['family']> = new Set([
  'ACCESSIBILITY',
  'ACCESSIBILITY_RECONCILIATION',
]);

/** Accessibility answers with a fixed meaning, named rather than shown as codes. */
const ACCESSIBILITY_OPTION_NAMES: ReadonlySet<string> = new Set(['OMIT', 'STANDARDS', 'EXCEPTION']);

const ACCESSIBILITY_FIELDS: readonly OnixAccessibilityField[] = [
  'accessibilityStandard',
  'accessibilityAdditionalStandard',
  'accessibilityException',
  'accessibilityReportUrl',
];

/** Every accessibility value named as the ordinary Publication form names it. */
const ACCESSIBILITY_VALUE_LABELS: ReadonlyMap<string, string> = new Map(
  [
    ...accessibilityStandardOptions,
    ...accessibilityAdditionalPDFStandardOptions,
    ...accessibilityAdditionalEpubStandardOptions,
    ...accessibilityExceptionOptions,
  ]
    .filter(({ value }) => value !== '')
    .map(({ value, label }) => [value, label]),
);

/**
 * The decisions an ONIX file leaves to the publisher, and why its plan waits (thoth-app#182, #183, #209).
 *
 * It reads as a review of what Thoth will do: each Work group with its target, WorkType and edition, and each
 * Product with the Publication it becomes, in plain words. A control appears only where the publisher has a
 * decision to make - a WorkType, a format the file leaves open, an omission the plan can take, a record to leave
 * out, a descriptive question - and nothing starts decided. What no control answers is listed as a problem, and
 * every blocker, identity evidence and source path stays inspectable in the details.
 */
export const OnixPlanResolution = ({
  sidecar,
  workTypeSuggestions = NO_SUGGESTIONS,
  onChange,
}: OnixPlanResolutionProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;
  const headingId = useId();

  const { inputs, records, products, workGroups, blockers, compatibility, executable } = sidecar;
  const decide = (change: Partial<OnixPlanInputs>) => onChange({ ...inputs, ...change });

  const recordByKey = new Map(records.map((record) => [record.recordKey, record]));
  const productByKey = new Map(products.map((product) => [product.productKey, product]));
  const recordLabel = (record: OnixPlannedRecord | undefined) =>
    record === undefined
      ? ''
      : (record.recordReference ?? translate('onixPlan.records.position', { index: record.index }));
  const productLabel = (productKey: string) =>
    (productByKey.get(productKey)?.recordKeys ?? [])
      .map((recordKey) => recordLabel(recordByKey.get(recordKey)))
      .join(', ');
  const groupLabel = (groupKey: string) =>
    translate('onixPlan.group.label', { position: workGroups.findIndex((group) => group.groupKey === groupKey) + 1 });

  const newWorks = workGroups.filter(({ target }) => target === 'NEW_WORK');
  const status = !executable
    ? translate('onixPlan.status.blocked', { count: blockers.length })
    : translate(newWorks.length > 0 ? 'onixPlan.status.ready' : 'onixPlan.status.nothingToCreate');

  const chooseManifestation = (productKey: string, choice: OnixManifestationChoice | undefined) =>
    decide({
      manifestationChoices:
        choice === undefined
          ? without(inputs.manifestationChoices, productKey)
          : { ...inputs.manifestationChoices, [productKey]: choice },
    });

  const scopeOf = ({ recordKey, productKey, groupKey }: OnixPlanBlocker) => {
    if (productKey !== null) return translate('onixPlan.scope.product', { product: productLabel(productKey) });
    if (groupKey !== null) return translate('onixPlan.scope.group', { work: groupLabel(groupKey) });
    if (recordKey !== null)
      return translate('onixPlan.scope.record', { record: recordLabel(recordByKey.get(recordKey)) });

    return null;
  };

  const notComplete = records.filter(({ disposition }) => disposition !== 'COMPLETE');

  // Every descriptive question a blocker waits on, and every one already answered so the answer can change, in
  // the order the reductions raised them. A finding nothing in the app can answer stays a blocker only.
  const blocking = new Set(blockers.flatMap(findingKeysOf));
  const asked = new Set([...blocking, ...Object.keys(inputs.descriptiveChoices)]);
  const questions = sidecar.descriptive.findings.filter(
    (finding, index, all) =>
      asked.has(finding.key) &&
      finding.resolution.kind !== 'NONE' &&
      all.findIndex(({ key }) => key === finding.key) === index,
  );
  const questionKeys = new Set(questions.map(({ key }) => key));
  const answerDescriptive = (findingKey: string, answer: string | undefined) =>
    decide({
      descriptiveChoices:
        answer === undefined
          ? without(inputs.descriptiveChoices, findingKey)
          : { ...inputs.descriptiveChoices, [findingKey]: answer },
    });

  // What the Product rights of every Work group say, whatever its target (thoth-app#211): nothing to answer here, only
  // what blocks and what Thoth does not record, each in the planner's own words.
  const rightsFindings = sidecar.rights?.findings ?? [];

  // What every Product's supply, prices and supplier websites say (thoth-app#215). A price decision the plan waits on,
  // or one already answered, is asked here: one of the prices the file states, or none, and nothing starts chosen. An
  // optional one - a default price with alternatives beside it (Specification Amendment 2B) - is asked wherever its
  // Publication may still be created, and waits on nothing. Any other finding holds the import back only where the plan
  // holds a Publication back for it - a Product left out or already in Thoth creates none - and everything Thoth does not
  // record stays listed, and counted, in its own details.
  const commercialChoices = inputs.commercialChoices ?? {};
  const commercialFindings = sidecar.commercial?.findings ?? [];
  const staleAnswers = new Set(
    blockers.flatMap(({ code, detail }) =>
      code === 'COMMERCIAL_CHOICE_STALE' && typeof detail.findingKey === 'string' ? [detail.findingKey] : [],
    ),
  );
  const createsPublication = (productKey: string) => {
    const action = productByKey.get(productKey)?.action;

    return action !== 'ALREADY_PRESENT' && action !== 'OMIT/EXCLUDED';
  };
  const priceQuestions = commercialFindings.filter(
    ({ key, resolution, productKey }) =>
      (resolution.kind === 'PRICE_CHOICE' && (blocking.has(key) || commercialChoices[key] !== undefined)) ||
      (resolution.kind === 'PRICE_OVERRIDE' &&
        (createsPublication(productKey) || commercialChoices[key] !== undefined)),
  );
  const priceQuestionKeys = new Set(priceQuestions.map(({ key }) => key));
  const commercialBlocking = commercialFindings.filter(({ key }) => blocking.has(key) && !priceQuestionKeys.has(key));
  const commercialDisclosed = commercialFindings.filter(({ key }) => !blocking.has(key) && !priceQuestionKeys.has(key));
  const answerPrice = (findingKey: string, answer: string | undefined) =>
    decide({
      commercialChoices:
        answer === undefined ? without(commercialChoices, findingKey) : { ...commercialChoices, [findingKey]: answer },
    });
  const commercialEntry = (finding: OnixCommercialFinding, holdsBack: boolean) => (
    <li key={finding.key} data-testid="onix-plan-commercial-finding" className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {holdsBack ? (
          <SeverityLabel severity="warning">{translate('onixPlan.commercial.blocking')}</SeverityLabel>
        ) : (
          <Typography component="span">{translate('onixPlan.commercial.notRecorded')}</Typography>
        )}
        <Typography component="span">
          {translate('onixPlan.scope.product', { product: productLabel(finding.productKey) })}
        </Typography>
      </div>
      <Typography variant="body2">{finding.message}</Typography>
    </li>
  );

  // Rights, sales rights and product contacts (thoth-app#217). A Product-rights finding whose approved target-loss
  // path is an acknowledgement, and every SalesRights or ProductContact finding that offers one, is asked here, in its
  // own section: the publisher ticks that the import continues while knowingly omitting that fact, and nothing starts
  // ticked. An answer the file does not offer is marked on its finding, or - where it names no finding - cleared by its
  // own control; no one control ever accepts every loss at once.
  const rightsChoices = inputs.rightsChoices ?? {};
  const salesRightsFindings = sidecar.salesRights?.findings ?? [];
  const staleRightsAnswers = new Set(
    blockers.flatMap(({ code, detail }) =>
      code === 'RIGHTS_CHOICE_STALE' && typeof detail.findingKey === 'string' ? [detail.findingKey] : [],
    ),
  );
  // The resolver's own existing-Work licence reconciliation, shown with the licence findings (#218 Correction 1).
  const reconciliationFindings = (sidecar.findings ?? []).filter(({ family }) => family === 'LICENCE_RECONCILIATION');
  const rightsQuestionKeys = new Set([
    ...rightsFindings.filter(isAcknowledgeableRightsFinding).map(({ key }) => key),
    ...reconciliationFindings.filter(({ resolution }) => resolution.kind === 'ACKNOWLEDGE').map(({ key }) => key),
    ...salesRightsFindings.filter(({ resolution }) => resolution.kind === 'ACKNOWLEDGE').map(({ key }) => key),
  ]);
  const orphanRightsAnswers = [...staleRightsAnswers].filter((key) => !rightsQuestionKeys.has(key));
  const answerRights = (findingKey: string, acknowledged: boolean) =>
    decide({
      rightsChoices: acknowledged
        ? { ...rightsChoices, [findingKey]: ONIX_RIGHTS_ACKNOWLEDGED }
        : without(rightsChoices, findingKey),
    });
  /** Whether acknowledging the finding also omits the Work's licence: it is one the licence decision waits on. */
  const licenceAffecting = (finding: OnixRightsFinding) => {
    const decision = sidecar.rights?.groups[finding.groupKey]?.licence;

    return decision?.kind === 'BLOCKED' && decision.findingKeys.includes(finding.key);
  };
  const licenceActionOf = (groupKey: string): OnixWorkLicenceAction['action'] | undefined => {
    const action = sidecar.licenceActions?.find((candidate) => candidate.groupKey === groupKey)?.action;

    if (action !== undefined) return action;

    // A sidecar resolved without licence actions: the rights reduction's decision says what a new Work gets.
    const decision = sidecar.rights?.groups[groupKey]?.licence;

    if (decision === undefined) return undefined;

    return decision.kind === 'SET_SUPPORTED_LICENSE'
      ? { kind: 'SET_SUPPORTED_LICENSE', identity: decision.identity, url: decision.url }
      : decision.kind === 'UNSET'
        ? { kind: 'UNSET' }
        : { kind: 'BLOCKED' };
  };
  const scopeOfFinding = (finding: { productKey: string | null; groupKey: string }) =>
    finding.productKey !== null
      ? translate('onixPlan.scope.product', { product: productLabel(finding.productKey) })
      : translate('onixPlan.scope.group', { work: groupLabel(finding.groupKey) });
  const isContactFinding = ({ code }: OnixSalesRightsFinding) => code.startsWith('PRODUCT_CONTACT_');
  const salesRightsHeld = salesRightsFindings.filter((finding) => !isContactFinding(finding) && finding.blocking);
  const salesRightsDisclosed = salesRightsFindings.filter((finding) => !isContactFinding(finding) && !finding.blocking);
  const productContactFindings = salesRightsFindings.filter(isContactFinding);
  const contactFactOf = (finding: OnixSalesRightsFinding): OnixProductContactFact | undefined =>
    sidecar.salesRights?.products[finding.productKey]?.productContacts.find(
      ({ path }) => path === finding.locations[0]?.path,
    );
  const salesRightsEntry = (finding: OnixSalesRightsFinding) => {
    const scope = scopeOfFinding(finding);

    return (
      <li key={finding.key} data-testid="onix-plan-sales-rights-finding" className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {finding.blocking ? (
            <SeverityLabel severity="warning">{translate('onixPlan.salesRights.blocking')}</SeverityLabel>
          ) : (
            <Typography component="span">{translate('onixPlan.salesRights.notRecorded')}</Typography>
          )}
          <Typography component="span">{scope}</Typography>
        </div>
        <Typography variant="body2">{finding.message}</Typography>
        {finding.resolution.kind === 'ACKNOWLEDGE' && (
          <RightsAcknowledgement
            label={translate('onixPlan.salesRights.acknowledge', { scope })}
            checked={rightsChoices[finding.key] !== undefined}
            stale={staleRightsAnswers.has(finding.key)}
            staleText={translate('onixPlan.rights.staleChoice')}
            onChange={(checked) => answerRights(finding.key, checked)}
          />
        )}
      </li>
    );
  };

  // Accessibility and product form features (thoth-app#221). What each Publication's accessibility becomes is said for
  // every Publication whose file states any, or that Thoth already holds with some; every choice and acknowledgement the
  // plan waits on, or that is already answered, is asked here, with nothing starting chosen; and every fact Thoth does
  // not record stays listed. An answer the file does not offer is marked on its question, or cleared by its own control.
  const accessibilityChoices = inputs.accessibilityChoices ?? {};
  const accessibilityPlan = sidecar.accessibility;
  const accessibilityFindingOf = new Map(
    (accessibilityPlan?.findings ?? []).map((finding): [string, OnixAccessibilityFinding] => [finding.key, finding]),
  );
  const planFindings = sidecar.findings ?? [];
  const staleAccessibilityAnswers = new Set(
    blockers.flatMap(({ code, detail }) =>
      code === 'ACCESSIBILITY_CHOICE_STALE' && typeof detail.findingKey === 'string' ? [detail.findingKey] : [],
    ),
  );
  const accessibilityAsked = (finding: OnixPlanFinding) =>
    finding.resolution.kind !== 'NONE' &&
    (blocking.has(finding.key) || accessibilityChoices[finding.key] !== undefined);
  const accessibilityFindings = planFindings.filter(({ family }) => ACCESSIBILITY_FAMILIES.has(family));
  const featureFindings = planFindings.filter(({ family }) => family === 'PRODUCT_FORM_FEATURE');
  const accessibilityQuestions = [...accessibilityFindings, ...featureFindings].filter(accessibilityAsked);
  const accessibilityQuestionKeys = new Set(accessibilityQuestions.map(({ key }) => key));
  const orphanAccessibilityAnswers = [...staleAccessibilityAnswers].filter(
    (key) => !accessibilityQuestionKeys.has(key),
  );
  const answerAccessibility = (findingKey: string, answer: string | undefined) =>
    decide({
      accessibilityChoices:
        answer === undefined
          ? without(accessibilityChoices, findingKey)
          : { ...accessibilityChoices, [findingKey]: answer },
    });
  const publicationScope = (productKey: string, type: PublicationType | null) =>
    type === null
      ? translate('onixPlan.scope.product', { product: productLabel(productKey) })
      : translate('onixPlan.accessibility.publication', {
          product: productLabel(productKey),
          type: translate(`onixPlan.publicationType.${type}`),
        });
  const accessibilityScopeOf = (finding: OnixPlanFinding) => {
    const detailType = typeof finding.detail.publicationType === 'string' ? finding.detail.publicationType : null;
    const type = accessibilityFindingOf.get(finding.key)?.publicationType ?? (detailType as PublicationType | null);

    return publicationScope(finding.productKey ?? '', type);
  };
  /** The facts a finding is about, as stated: shown so that a choice or an acknowledgement is informed. */
  const featuresOf = (finding: OnixPlanFinding): OnixProductFormFeatureFact[] => {
    const paths = new Set(finding.locations.map(({ path }) => path));

    return (accessibilityPlan?.products[finding.productKey ?? '']?.features ?? []).filter(({ path }) =>
      paths.has(path),
    );
  };
  const accessibilityEntry = (finding: OnixPlanFinding) => (
    <li key={finding.key} data-testid="onix-plan-accessibility-finding" className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {blocking.has(finding.key) ? (
          <SeverityLabel severity="warning">{translate('onixPlan.accessibility.blocking')}</SeverityLabel>
        ) : (
          <Typography component="span">{translate('onixPlan.accessibility.notRecorded')}</Typography>
        )}
        <Typography component="span">{accessibilityScopeOf(finding)}</Typography>
      </div>
      <Typography variant="body2">{finding.message}</Typography>
      <FeatureDescriptions features={featuresOf(finding)} />
    </li>
  );
  // Every Publication whose accessibility the file speaks to, or that Thoth already holds with some.
  const accessibilityPublications = (sidecar.accessibilityActions ?? []).filter(
    ({ productKey, action }) =>
      (accessibilityPlan?.products[productKey]?.features ?? []).some(({ type }) => type === '09') ||
      ('existing' in action && ACCESSIBILITY_FIELDS.some((field) => action.existing[field] !== null)),
  );
  const accessibilityHeld = accessibilityFindings.filter(
    (finding) => blocking.has(finding.key) && !accessibilityQuestionKeys.has(finding.key),
  );
  const accessibilityDisclosed = accessibilityFindings.filter(
    (finding) => !blocking.has(finding.key) && !accessibilityQuestionKeys.has(finding.key),
  );
  const featureHeld = featureFindings.filter(
    (finding) => blocking.has(finding.key) && !accessibilityQuestionKeys.has(finding.key),
  );
  const featureDisclosed = featureFindings.filter(
    (finding) => !blocking.has(finding.key) && !accessibilityQuestionKeys.has(finding.key),
  );

  // Components and contained Works (thoth-app#223). What each ContentItem of a new Work becomes is said for every one of
  // them; every decision the plan waits on, or that is already answered, is asked here with nothing starting chosen,
  // ticked or filled in; and every fact Thoth does not record stays listed. An answer the file does not offer is marked on
  // its question, or cleared by its own control; no control answers more than one finding.
  const componentChoices = inputs.componentChoices ?? {};
  const componentFacts = new Map(
    Object.values(sidecar.components?.products ?? {})
      .flatMap(({ components }) => components)
      .map((fact): [string, OnixComponentFact] => [fact.componentKey, fact]),
  );
  const componentIntents = sidecar.componentIntents ?? [];
  const componentFindings = planFindings.filter(({ family }) => family === 'COMPONENT');
  const staleComponentAnswers = new Set(
    blockers.flatMap(({ code, detail }) =>
      code === 'COMPONENT_CHOICE_STALE' && typeof detail.findingKey === 'string' ? [detail.findingKey] : [],
    ),
  );
  const componentQuestions = componentFindings.filter(
    (finding) =>
      finding.resolution.kind !== 'NONE' && (blocking.has(finding.key) || componentChoices[finding.key] !== undefined),
  );
  const componentQuestionKeys = new Set(componentQuestions.map(({ key }) => key));
  const orphanComponentAnswers = [...staleComponentAnswers].filter((key) => !componentQuestionKeys.has(key));
  const answerComponent = (findingKey: string, answer: string | undefined) =>
    decide({
      componentChoices:
        answer === undefined ? without(componentChoices, findingKey) : { ...componentChoices, [findingKey]: answer },
    });
  // A finding is about the one content item every location it names lies in, or about its Product as a whole.
  const componentScopeOf = (finding: OnixPlanFinding) => {
    const about = [...componentFacts.values()].filter(
      ({ productKey, path }) =>
        productKey === finding.productKey &&
        finding.locations.some(({ path: located }) => located === path || located.startsWith(`${path}/`)),
    );

    return about.length === 1
      ? translate('onixPlan.components.scope', {
          position: about[0].position,
          product: productLabel(about[0].productKey),
        })
      : translate('onixPlan.scope.product', { product: productLabel(finding.productKey ?? '') });
  };
  const componentHeld = componentFindings.filter(
    (finding) => blocking.has(finding.key) && !componentQuestionKeys.has(finding.key),
  );
  const componentDisclosed = componentFindings.filter(
    (finding) => !blocking.has(finding.key) && !componentQuestionKeys.has(finding.key),
  );
  const componentEntry = (finding: OnixPlanFinding) => (
    <li key={finding.key} data-testid="onix-plan-component-finding" className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {blocking.has(finding.key) ? (
          <SeverityLabel severity="warning">{translate('onixPlan.components.blocking')}</SeverityLabel>
        ) : (
          <Typography component="span">{translate('onixPlan.components.notRecorded')}</Typography>
        )}
        <Typography component="span">{componentScopeOf(finding)}</Typography>
      </div>
      <Typography variant="body2">{finding.message}</Typography>
      <ComponentLocations finding={finding} translate={translate} />
    </li>
  );

  // A blocker a control above answers is that control's question; the rest are problems to read about.
  const problems = blockers.filter(
    (blocker) =>
      !DECISION_BLOCKERS.has(blocker.code) &&
      !(
        typeof blocker.detail.findingKey === 'string' &&
        (questionKeys.has(blocker.detail.findingKey) ||
          priceQuestionKeys.has(blocker.detail.findingKey) ||
          rightsQuestionKeys.has(blocker.detail.findingKey) ||
          accessibilityQuestionKeys.has(blocker.detail.findingKey) ||
          componentQuestionKeys.has(blocker.detail.findingKey))
      ),
  );

  return (
    <section
      aria-labelledby={headingId}
      data-testid="onix-plan-resolution"
      className="flex w-full flex-col gap-4 rounded border border-(--color-border) p-4"
    >
      <Typography id={headingId} className="font-semibold">
        {translate('onixPlan.heading')}
      </Typography>
      <div data-testid="onix-plan-status" className="flex flex-wrap items-center gap-2">
        <SeverityLabel severity={executable ? 'ready' : 'warning'}>
          {translate(executable ? 'onixPlan.severity.ready' : 'onixPlan.severity.blocked')}
        </SeverityLabel>
        <Typography>{status}</Typography>
      </div>

      {compatibility.activation === 'VERIFIED' && (
        <Typography>{translate('onixPlan.compatibility.verified')}</Typography>
      )}
      {compatibility.activation === 'CONTRADICTED' && (
        <Typography color="error">{translate('onixPlan.compatibility.contradicted')}</Typography>
      )}
      {(compatibility.activation === 'AWAITING_CONFIRMATION' || compatibility.activation === 'CONFIRMED') && (
        <div className="flex flex-col gap-1">
          <Typography>{translate('onixPlan.compatibility.unverified')}</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={inputs.thothCompatibilityConfirmed}
                onChange={(event) => decide({ thothCompatibilityConfirmed: event.target.checked })}
              />
            }
            label={translate('onixPlan.compatibility.confirm')}
          />
        </div>
      )}

      {/* One explicit choice for all new Works, only where there are several: one Work is decided on its own. */}
      {newWorks.length > 1 && (
        <TextField
          select
          label={translate('onixPlan.workType.fileLabel', { count: newWorks.length })}
          value={inputs.fileWorkType ?? ''}
          onChange={(event) =>
            decide({ fileWorkType: event.target.value === '' ? null : (event.target.value as WorkType) })
          }
          slotProps={NATIVE_SELECT}
          size="small"
        >
          <option value="">{translate('onixPlan.workType.choose')}</option>
          {ONIX_FILE_WORK_TYPES.map((type) => (
            <option key={type} value={type}>
              {translate(`onixPlan.workType.${type}`)}
            </option>
          ))}
        </TextField>
      )}

      {notComplete.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-records">
          <Typography className="font-semibold">{translate('onixPlan.records.heading')}</Typography>
          {notComplete.map((record) => (
            <div key={record.recordKey} className="flex flex-col gap-1">
              <Typography>
                {recordLabel(record)}:{' '}
                {translate(`onixPlan.disposition.${record.disposition}`, { code: record.notificationType ?? '' })}
              </Typography>
              {record.deletionText.length > 0 && (
                <Typography variant="body2">
                  {translate('onixPlan.records.deletionText')}: {record.deletionText.join(' ')}
                </Typography>
              )}
              {ONIX_EXCLUDABLE_DISPOSITIONS.has(record.disposition) && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={inputs.excludedRecordKeys.includes(record.recordKey)}
                      onChange={(event) =>
                        decide({
                          excludedRecordKeys: event.target.checked
                            ? [...new Set([...inputs.excludedRecordKeys, record.recordKey])].sort()
                            : inputs.excludedRecordKeys.filter((recordKey) => recordKey !== record.recordKey),
                        })
                      }
                    />
                  }
                  label={translate('onixPlan.records.exclude', { record: recordLabel(record) })}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {workGroups.map((group) => (
        <WorkGroupDecisions
          key={group.groupKey}
          group={group}
          label={groupLabel(group.groupKey)}
          products={products.filter(({ groupKey }) => groupKey === group.groupKey)}
          productLabel={productLabel}
          inputs={inputs}
          workTypeAlone={newWorks.length === 1}
          licenceAction={licenceActionOf(group.groupKey)}
          suggestion={group.target === 'NEW_WORK' ? workTypeSuggestions[group.groupKey] : undefined}
          editionAsked={
            group.target === 'NEW_WORK' &&
            (blockers.some(({ code, groupKey }) => code === 'EDITION_INPUT_REQUIRED' && groupKey === group.groupKey) ||
              (group.edition.status === 'RESOLVED' && group.edition.basis === 'USER_INPUT'))
          }
          blockers={blockers}
          translate={translate}
          decide={decide}
          chooseManifestation={chooseManifestation}
        />
      ))}

      {questions.length > 0 && (
        <section className="flex flex-col gap-3" data-testid="onix-plan-descriptive">
          <Typography className="font-semibold">{translate('onixPlan.descriptive.heading')}</Typography>
          {questions.map((finding) => (
            <DescriptiveDecision
              key={finding.key}
              finding={finding}
              scope={
                finding.productKey !== null
                  ? translate('onixPlan.scope.product', { product: productLabel(finding.productKey) })
                  : translate('onixPlan.scope.group', { work: groupLabel(finding.groupKey) })
              }
              answer={inputs.descriptiveChoices[finding.key]}
              // An answer the plan still waits on is not a value it can use.
              rejected={inputs.descriptiveChoices[finding.key] !== undefined && blocking.has(finding.key)}
              translate={translate}
              onAnswer={(answer) => answerDescriptive(finding.key, answer)}
            />
          ))}
        </section>
      )}

      {(rightsFindings.length > 0 || reconciliationFindings.length > 0) && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-rights">
          <Typography className="font-semibold">{translate('onixPlan.rights.heading')}</Typography>
          {RIGHTS_SECTIONS.map((section) => {
            const entries: RightsEntry[] = [
              ...rightsFindings
                .filter(({ code }) => rightsSectionOf(code) === section)
                .map((finding) => ({
                  finding,
                  acknowledgement: isAcknowledgeableRightsFinding(finding)
                    ? licenceAffecting(finding)
                      ? 'onixPlan.rights.acknowledgeOmitLicence'
                      : 'onixPlan.rights.acknowledge'
                    : null,
                })),
              ...(section === 'LICENCE'
                ? reconciliationFindings.map((finding) => ({
                    finding,
                    acknowledgement:
                      finding.resolution.kind === 'ACKNOWLEDGE' ? 'onixPlan.rights.acknowledgeExistingLicence' : null,
                  }))
                : []),
            ];

            if (entries.length === 0) return null;

            return (
              <div key={section} className="flex flex-col gap-2" data-testid={`onix-plan-rights-${section}`}>
                <Typography variant="body2" className="font-medium">
                  {translate(`onixPlan.rights.section.${section}`)}
                </Typography>
                <ul className="flex list-disc flex-col gap-2 pl-6">
                  {entries.map(({ finding, acknowledgement }) => {
                    const scope = scopeOfFinding(finding);

                    return (
                      <li key={finding.key} data-testid="onix-plan-rights-finding" className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {finding.blocking ? (
                            <SeverityLabel severity="warning">{translate('onixPlan.rights.blocking')}</SeverityLabel>
                          ) : (
                            <Typography component="span">{translate('onixPlan.rights.notRecorded')}</Typography>
                          )}
                          <Typography component="span">{scope}</Typography>
                        </div>
                        <Typography variant="body2">{finding.message}</Typography>
                        {acknowledgement !== null && (
                          <RightsAcknowledgement
                            label={translate(acknowledgement, { scope })}
                            checked={rightsChoices[finding.key] !== undefined}
                            stale={staleRightsAnswers.has(finding.key)}
                            staleText={translate('onixPlan.rights.staleChoice')}
                            onChange={(checked) => answerRights(finding.key, checked)}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {orphanRightsAnswers.length > 0 && (
        <section className="flex flex-wrap gap-2" data-testid="onix-plan-rights-stale">
          {orphanRightsAnswers.map((key) => (
            <Button key={key} variant="text" onClick={() => answerRights(key, false)}>
              {translate('onixPlan.rights.clearStale', { answer: key })}
            </Button>
          ))}
        </section>
      )}

      {commercialFindings.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-commercial">
          <Typography className="font-semibold">{translate('onixPlan.commercial.heading')}</Typography>
          {priceQuestions.map((finding) => (
            <PriceDecision
              key={finding.key}
              finding={finding}
              scope={translate('onixPlan.scope.product', { product: productLabel(finding.productKey) })}
              answer={commercialChoices[finding.key]}
              stale={staleAnswers.has(finding.key)}
              translate={translate}
              onAnswer={(answer) => answerPrice(finding.key, answer)}
            />
          ))}
          {commercialBlocking.length > 0 && (
            <ul className="flex list-disc flex-col gap-2 pl-6">
              {commercialBlocking.map((finding) => commercialEntry(finding, true))}
            </ul>
          )}
          {commercialDisclosed.length > 0 && (
            <details data-testid="onix-plan-commercial-disclosures">
              <summary>
                <Typography component="span" variant="body2">
                  {translate('onixPlan.commercial.disclosures', { count: commercialDisclosed.length })}
                </Typography>
              </summary>
              <ul className="flex list-disc flex-col gap-2 pl-6">
                {commercialDisclosed.map((finding) => commercialEntry(finding, false))}
              </ul>
            </details>
          )}
        </section>
      )}

      {(salesRightsHeld.length > 0 || salesRightsDisclosed.length > 0) && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-sales-rights">
          <Typography className="font-semibold">{translate('onixPlan.salesRights.heading')}</Typography>
          {salesRightsHeld.length > 0 && (
            <ul className="flex list-disc flex-col gap-2 pl-6">{salesRightsHeld.map(salesRightsEntry)}</ul>
          )}
          {salesRightsDisclosed.length > 0 && (
            <details data-testid="onix-plan-sales-rights-disclosures">
              <summary>
                <Typography component="span" variant="body2">
                  {translate('onixPlan.salesRights.disclosures', { count: salesRightsDisclosed.length })}
                </Typography>
              </summary>
              <ul className="flex list-disc flex-col gap-2 pl-6">{salesRightsDisclosed.map(salesRightsEntry)}</ul>
            </details>
          )}
        </section>
      )}

      {productContactFindings.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-product-contacts">
          <Typography className="font-semibold">{translate('onixPlan.productContact.heading')}</Typography>
          {productContactFindings.some(({ blocking: holds }) => !holds) && (
            <Typography variant="body2">
              {translate('onixPlan.productContact.disclosures', {
                count: productContactFindings.filter(({ blocking: holds }) => !holds).length,
              })}
            </Typography>
          )}
          <ul className="flex list-disc flex-col gap-3 pl-6">
            {productContactFindings.map((finding) => {
              const scope = scopeOfFinding(finding);
              const contact = contactFactOf(finding);
              const role = String(finding.detail.role ?? '');
              const scopeKind = contact?.scope.kind ?? String(finding.detail.scope ?? '');

              return (
                <li key={finding.key} data-testid="onix-plan-product-contact" className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {finding.blocking ? (
                      <SeverityLabel severity="warning">{translate('onixPlan.productContact.blocking')}</SeverityLabel>
                    ) : (
                      <Typography component="span">{translate('onixPlan.productContact.notRecorded')}</Typography>
                    )}
                    <Typography component="span">{scope}</Typography>
                  </div>
                  <Typography variant="body2">
                    {PRODUCT_CONTACT_ROLES.has(role)
                      ? translate(`onixPlan.productContact.role.${role}`)
                      : `ProductContactRole ${role}`}
                    {scopeKind === 'PUBLISHING_DETAIL' || scopeKind === 'MARKET'
                      ? ` (${translate(`onixPlan.productContact.scope.${scopeKind}`)})`
                      : ''}
                  </Typography>
                  {finding.detail.compliance === 'true' && (
                    <Typography variant="body2">{translate('onixPlan.productContact.compliance')}</Typography>
                  )}
                  {contact !== undefined && <ProductContactDetails contact={contact} translate={translate} />}
                  {finding.detail.existingAccessibilityContact === 'MATCHES_EMAIL' && (
                    <Typography variant="body2">{translate('onixPlan.productContact.accessibilityMatch')}</Typography>
                  )}
                  <Typography variant="body2">{finding.message}</Typography>
                  {finding.resolution.kind === 'ACKNOWLEDGE' && (
                    <RightsAcknowledgement
                      label={translate('onixPlan.productContact.acknowledge', { scope })}
                      checked={rightsChoices[finding.key] !== undefined}
                      stale={staleRightsAnswers.has(finding.key)}
                      staleText={translate('onixPlan.rights.staleChoice')}
                      onChange={(checked) => answerRights(finding.key, checked)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(accessibilityPublications.length > 0 || accessibilityFindings.length > 0) && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-accessibility">
          <Typography className="font-semibold">{translate('onixPlan.accessibility.heading')}</Typography>
          {accessibilityPublications.length > 0 && (
            <ul className="flex list-disc flex-col gap-2 pl-6">
              {accessibilityPublications.map((action) => (
                <AccessibilityPublication
                  key={action.productKey}
                  action={action}
                  scope={publicationScope(action.productKey, action.publicationType)}
                  translate={translate}
                />
              ))}
            </ul>
          )}
          {accessibilityQuestions
            .filter(({ family }) => family !== 'PRODUCT_FORM_FEATURE')
            .map((finding) => (
              <AccessibilityDecision
                key={finding.key}
                finding={finding}
                scope={accessibilityScopeOf(finding)}
                features={featuresOf(finding)}
                answer={accessibilityChoices[finding.key]}
                stale={staleAccessibilityAnswers.has(finding.key)}
                translate={translate}
                onAnswer={(answer) => answerAccessibility(finding.key, answer)}
              />
            ))}
          {accessibilityHeld.length > 0 && (
            <ul className="flex list-disc flex-col gap-2 pl-6">{accessibilityHeld.map(accessibilityEntry)}</ul>
          )}
          {accessibilityDisclosed.length > 0 && (
            <details data-testid="onix-plan-accessibility-disclosures">
              <summary>
                <Typography component="span" variant="body2">
                  {translate('onixPlan.accessibility.disclosures', { count: accessibilityDisclosed.length })}
                </Typography>
              </summary>
              <ul className="flex list-disc flex-col gap-2 pl-6">{accessibilityDisclosed.map(accessibilityEntry)}</ul>
            </details>
          )}
        </section>
      )}

      {featureFindings.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-product-form-features">
          <Typography className="font-semibold">{translate('onixPlan.productFormFeature.heading')}</Typography>
          {accessibilityQuestions
            .filter(({ family }) => family === 'PRODUCT_FORM_FEATURE')
            .map((finding) => (
              <AccessibilityDecision
                key={finding.key}
                finding={finding}
                scope={accessibilityScopeOf(finding)}
                features={featuresOf(finding)}
                answer={accessibilityChoices[finding.key]}
                stale={staleAccessibilityAnswers.has(finding.key)}
                translate={translate}
                onAnswer={(answer) => answerAccessibility(finding.key, answer)}
              />
            ))}
          {featureHeld.length > 0 && (
            <ul className="flex list-disc flex-col gap-2 pl-6">{featureHeld.map(accessibilityEntry)}</ul>
          )}
          {featureDisclosed.length > 0 && (
            <details data-testid="onix-plan-product-form-feature-disclosures">
              <summary>
                <Typography component="span" variant="body2">
                  {translate('onixPlan.productFormFeature.disclosures', { count: featureDisclosed.length })}
                </Typography>
              </summary>
              <ul className="flex list-disc flex-col gap-2 pl-6">{featureDisclosed.map(accessibilityEntry)}</ul>
            </details>
          )}
        </section>
      )}

      {orphanAccessibilityAnswers.length > 0 && (
        <section className="flex flex-wrap gap-2" data-testid="onix-plan-accessibility-stale">
          {orphanAccessibilityAnswers.map((key) => (
            <Button key={key} variant="text" onClick={() => answerAccessibility(key, undefined)}>
              {translate('onixPlan.accessibility.clearStale', { answer: key })}
            </Button>
          ))}
        </section>
      )}

      {(componentIntents.length > 0 || componentFindings.length > 0) && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-components">
          <Typography className="font-semibold">{translate('onixPlan.components.heading')}</Typography>
          {componentIntents.length > 0 && (
            <ul className="flex list-disc flex-col gap-2 pl-6">
              {componentIntents.map((intent) => (
                <ComponentSummary
                  key={intent.componentKey}
                  intent={intent}
                  fact={componentFacts.get(intent.componentKey)}
                  scope={translate('onixPlan.components.scope', {
                    position: intent.position,
                    product: productLabel(intent.productKey),
                  })}
                  translate={translate}
                />
              ))}
            </ul>
          )}
          {componentQuestions.map((finding) => (
            <ComponentDecision
              key={finding.key}
              finding={finding}
              scope={componentScopeOf(finding)}
              answer={componentChoices[finding.key]}
              stale={staleComponentAnswers.has(finding.key)}
              translate={translate}
              onAnswer={(answer) => answerComponent(finding.key, answer)}
            />
          ))}
          {componentHeld.length > 0 && (
            <ul className="flex list-disc flex-col gap-2 pl-6">{componentHeld.map(componentEntry)}</ul>
          )}
          {componentDisclosed.length > 0 && (
            <details data-testid="onix-plan-component-disclosures">
              <summary>
                <Typography component="span" variant="body2">
                  {translate('onixPlan.components.disclosures', { count: componentDisclosed.length })}
                </Typography>
              </summary>
              <ul className="flex list-disc flex-col gap-2 pl-6">{componentDisclosed.map(componentEntry)}</ul>
            </details>
          )}
        </section>
      )}

      {orphanComponentAnswers.length > 0 && (
        <section className="flex flex-wrap gap-2" data-testid="onix-plan-components-stale">
          {orphanComponentAnswers.map((key) => (
            <Button key={key} variant="text" onClick={() => answerComponent(key, undefined)}>
              {translate('onixPlan.components.clearStale', { answer: key })}
            </Button>
          ))}
        </section>
      )}

      {problems.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="onix-plan-problems">
          <Typography className="font-semibold">{translate('onixPlan.blockers.heading')}</Typography>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            {problems.map((blocker, index) => {
              const scope = scopeOf(blocker);

              return (
                // eslint-disable-next-line @eslint-react/no-array-index-key -- rebuilt whole from the resolved plan; blockers carry no id of their own
                <li key={index}>
                  <Typography>
                    {scope && <>{scope}: </>}
                    {translate(`onixPlan.blocker.${blocker.code}`)}
                  </Typography>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {blockers.length > 0 && (
        <details data-testid="onix-plan-technical" className="flex flex-col gap-2">
          <summary>
            <Typography component="span">
              {translate('onixPlan.technical.heading', { count: blockers.length })}
            </Typography>
          </summary>
          <section className="flex flex-col gap-2" data-testid="onix-plan-blockers">
            <ul className="flex list-disc flex-col gap-2 pl-6">
              {blockers.map((blocker) => {
                const scope = scopeOf(blocker);
                const details = Object.entries(blocker.detail)
                  .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                  .join('; ');

                return (
                  // What a blocker is about, where, and why: no two blockers the resolver raises share all three.
                  <li
                    key={[
                      blocker.code,
                      blocker.recordKey,
                      blocker.productKey,
                      blocker.groupKey,
                      blocker.paths.join(','),
                      details,
                    ].join('|')}
                  >
                    <Typography>
                      {scope && <>{scope}: </>}
                      {translate(`onixPlan.blocker.${blocker.code}`)} (
                      {translate(`onixPlan.classification.${blocker.classification}`)})
                    </Typography>
                    {details.length > 0 && (
                      <Typography variant="body2">
                        {translate('onixPlan.blockers.details')}: {details}
                      </Typography>
                    )}
                    {blocker.paths.length > 0 && (
                      <Typography variant="body2" className="break-all">
                        {translate('onixPlan.blockers.paths')}: {blocker.paths.join(', ')}
                      </Typography>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </details>
      )}
    </section>
  );
};

type WorkGroupDecisionsProps = {
  readonly group: OnixPlannedWorkGroup;
  readonly label: string;
  readonly products: readonly OnixPlannedProduct[];
  readonly productLabel: (productKey: string) => string;
  readonly inputs: OnixPlanInputs;
  /** Whether this is the file's only new Work, whose WorkType is then decided here alone. */
  readonly workTypeAlone: boolean;
  /** What the rights reduction decided this Work's licence is, when a reduction was given (thoth-app#211). */
  readonly licenceAction: OnixWorkLicenceAction['action'] | undefined;
  /** The non-binding WorkType suggestion for this new Work, if any. */
  readonly suggestion: WorkType | undefined;
  /** Whether this new Work's edition is the publisher's to give: the file describes one without its number. */
  readonly editionAsked: boolean;
  readonly blockers: readonly OnixPlanBlocker[];
  readonly translate: TranslateFunction;
  readonly decide: (change: Partial<OnixPlanInputs>) => void;
  readonly chooseManifestation: (productKey: string, choice: OnixManifestationChoice | undefined) => void;
};

/** Classifications no publisher decision answers: a Product waiting on one is blocked, not waiting for input. */
const PROBLEM_CLASSIFICATIONS: ReadonlySet<OnixPlanBlocker['classification']> = new Set([
  'SOURCE_INVALID',
  'SOURCE_CONFLICT',
  'TARGET_UNREPRESENTABLE',
  'PREFLIGHT_GAP',
  'EXECUTION_DEFERRED',
]);

/** One Work group: what Thoth will do with it, its WorkType and edition, and each Product's Publication. */
const WorkGroupDecisions = ({
  group,
  label,
  products,
  productLabel,
  inputs,
  workTypeAlone,
  licenceAction,
  suggestion,
  editionAsked,
  blockers,
  translate,
  decide,
  chooseManifestation,
}: WorkGroupDecisionsProps) => {
  const { groupKey, target, workType, edition } = group;
  const override = inputs.workTypeOverrides[groupKey];
  const [exceptionOpen, setExceptionOpen] = useState(false);

  const setOverride = (value: string) =>
    decide({
      workTypeOverrides:
        value === ''
          ? without(inputs.workTypeOverrides, groupKey)
          : { ...inputs.workTypeOverrides, [groupKey]: value as WorkType },
    });

  // What the Product becomes, said plainly; a Product with no action waits on input, or on a problem below.
  const statusOf = ({ productKey, action }: OnixPlannedProduct) =>
    action ??
    (target === null ||
    blockers.some((blocker) => blocker.productKey === productKey && PROBLEM_CLASSIFICATIONS.has(blocker.classification))
      ? 'BLOCKED'
      : 'NEEDS_INPUT');

  return (
    <section aria-label={label} data-testid="onix-plan-group" className="flex flex-col gap-2">
      <Typography className="font-semibold">{label}</Typography>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt>{translate('onixPlan.group.target')}</dt>
        <dd>{translate(`onixPlan.workTarget.${target ?? 'UNRESOLVED'}`)}</dd>
        <dt>{translate('onixPlan.group.workType')}</dt>
        <dd className="flex flex-col gap-2">
          <span>
            {workType.status === 'RESOLVED'
              ? `${translate(`onixPlan.workType.${workType.type}`)} (${translate(`onixPlan.workTypeProvenance.${workType.provenance}`)})`
              : translate('onixPlan.group.undecided')}
          </span>
          {suggestion !== undefined && (
            // Evidence only (#179 5699313101): it selects nothing, and the choice below stays the publisher's.
            <Typography variant="body2" data-testid="onix-plan-worktype-suggestion">
              {translate('onixPlan.workType.suggestion', { type: translate(`onixPlan.workType.${suggestion}`) })}
            </Typography>
          )}
          {target === 'NEW_WORK' &&
            (workTypeAlone ? (
              <TextField
                select
                label={translate('onixPlan.workType.workLabel', { work: label })}
                value={override ?? ''}
                onChange={(event) => setOverride(event.target.value)}
                slotProps={NATIVE_SELECT}
                size="small"
              >
                <option value="">{translate('onixPlan.workType.choose')}</option>
                {ONIX_WORK_OVERRIDE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {translate(`onixPlan.workType.${type}`)}
                  </option>
                ))}
              </TextField>
            ) : override !== undefined || exceptionOpen ? (
              <TextField
                select
                label={translate('onixPlan.workType.overrideLabel', { work: label })}
                value={override ?? ''}
                onChange={(event) => setOverride(event.target.value)}
                slotProps={NATIVE_SELECT}
                size="small"
              >
                <option value="">{translate('onixPlan.workType.useFileDefault')}</option>
                {ONIX_WORK_OVERRIDE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {translate(`onixPlan.workType.${type}`)}
                  </option>
                ))}
              </TextField>
            ) : (
              <div>
                <Button variant="text" onClick={() => setExceptionOpen(true)}>
                  {translate('onixPlan.workType.exception', { work: label })}
                </Button>
              </div>
            ))}
        </dd>
        {licenceAction !== undefined &&
          (target === 'NEW_WORK' ||
            licenceAction.kind === 'ALREADY_PRESENT' ||
            licenceAction.kind === 'EXISTING_PRESERVED' ||
            licenceAction.kind === 'OMIT_WITH_ACKNOWLEDGED_LOSS') && (
            <>
              <dt>{translate('onixPlan.group.licence')}</dt>
              <dd data-testid="onix-plan-licence">{licenceText(licenceAction, translate)}</dd>
            </>
          )}
        <dt>{translate('onixPlan.group.edition')}</dt>
        <dd className="flex flex-col gap-2">
          <span>
            {edition.status === 'RESOLVED'
              ? `${edition.edition} (${translate(`onixPlan.edition.${edition.basis}`)})`
              : translate('onixPlan.group.undecided')}
          </span>
          {editionAsked && (
            <EditionInput
              label={translate('onixPlan.edition.inputLabel', { work: label })}
              invalidText={translate('onixPlan.edition.invalid')}
              value={inputs.editionInputs[groupKey]}
              onChange={(value) =>
                decide({
                  editionInputs:
                    value === undefined
                      ? without(inputs.editionInputs, groupKey)
                      : { ...inputs.editionInputs, [groupKey]: value },
                })
              }
            />
          )}
        </dd>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pr-4">{translate('onixPlan.product.record')}</th>
              <th className="pr-4">{translate('onixPlan.product.isbn')}</th>
              <th className="pr-4">{translate('onixPlan.product.publication')}</th>
              <th>{translate('onixPlan.product.action')}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productKey} className="align-top">
                <td className="pr-4">{productLabel(product.productKey)}</td>
                <td className="pr-4">{product.isbn ?? translate('onixPlan.product.none')}</td>
                <td className="pr-4">
                  <ManifestationDecision
                    product={product}
                    record={productLabel(product.productKey)}
                    choice={inputs.manifestationChoices[product.productKey]}
                    translate={translate}
                    onChoose={(choice) => chooseManifestation(product.productKey, choice)}
                  />
                </td>
                <td>{translate(`onixPlan.productStatus.${statusOf(product)}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details data-testid="onix-plan-evidence">
        <summary>
          <Typography component="span" variant="body2">
            {translate('onixPlan.evidence.heading')}
          </Typography>
        </summary>
        <ul className="flex list-disc flex-col gap-1 pl-6">
          <li>
            <Typography variant="body2">
              {label}:{' '}
              {group.evidence
                .map((evidence) => translate(`onixPlan.workEvidence.${evidence.kind}`, { ...evidence }))
                .join('; ') || translate('onixPlan.product.none')}
            </Typography>
          </li>
          {products.map(({ productKey, evidence }) => (
            <li key={productKey}>
              <Typography variant="body2">
                {productLabel(productKey)}:{' '}
                {evidence.map((item) => translate(`onixPlan.productEvidence.${item.kind}`, { ...item })).join('; ') ||
                  translate('onixPlan.product.none')}
              </Typography>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
};

type ManifestationDecisionProps = {
  readonly product: OnixPlannedProduct;
  readonly record: string;
  readonly choice: OnixManifestationChoice | undefined;
  readonly translate: TranslateFunction;
  readonly onChoose: (choice: OnixManifestationChoice | undefined) => void;
};

/**
 * What one Product's manifestation became, and the choice it leaves. A format the file does not establish is
 * chosen among the reducer's own candidates, or left out; a package Thoth cannot hold is left out only once that is
 * acknowledged. A Publication the file resolves is shown as it is: it can be left out only where the plan says so,
 * because Thoth cannot hold it beside its Work's other Publications or this import cannot add it to an existing Work.
 */
const ManifestationDecision = ({ product, record, choice, translate, onChoose }: ManifestationDecisionProps) => {
  const { manifestation } = product;
  const omitted = choice === ONIX_MANIFESTATION_OMIT;
  const omission = (
    <FormControlLabel
      control={
        <Checkbox
          checked={omitted}
          onChange={(event) => onChoose(event.target.checked ? ONIX_MANIFESTATION_OMIT : undefined)}
        />
      }
      label={translate('onixPlan.manifestation.acknowledge', { record })}
    />
  );

  switch (manifestation.kind) {
    case 'RESOLVED':
      return (
        <div className="flex flex-col gap-1">
          <span>{translate(`onixPlan.publicationType.${manifestation.type}`)}</span>
          {product.omittable === true && omission}
        </div>
      );
    case 'INPUT_REQUIRED':
      return (
        <div className="flex flex-col gap-2">
          <Typography variant="body2">{translate(`onixPlan.manifestation.reason.${manifestation.reason}`)}</Typography>
          <TextField
            select
            label={translate('onixPlan.manifestation.chooseLabel', { record })}
            value={choice ?? ''}
            onChange={(event) =>
              onChoose(
                event.target.value === ''
                  ? undefined
                  : (event.target.value as PublicationType | typeof ONIX_MANIFESTATION_OMIT),
              )
            }
            slotProps={NATIVE_SELECT}
            size="small"
          >
            <option value="">{translate('onixPlan.manifestation.choose')}</option>
            {manifestation.candidates.map((type) => (
              <option key={type} value={type}>
                {translate(`onixPlan.publicationType.${type}`)}
              </option>
            ))}
            <option value={ONIX_MANIFESTATION_OMIT}>{translate('onixPlan.manifestation.omit')}</option>
          </TextField>
        </div>
      );
    case 'UNREPRESENTABLE':
      return (
        <div className="flex flex-col gap-1">
          <Typography variant="body2">{translate(`onixPlan.manifestation.loss.${manifestation.reason}`)}</Typography>
          {manifestation.acknowledgementRequired ? (
            omission
          ) : (
            <span>{translate('onixPlan.manifestation.omitted')}</span>
          )}
        </div>
      );
  }
};

type DescriptiveDecisionProps = {
  readonly finding: OnixDescriptiveFinding;
  readonly scope: string;
  readonly answer: string | undefined;
  /** Whether the plan still waits on the finding although it has an answer: the answer is no valid value. */
  readonly rejected: boolean;
  readonly translate: TranslateFunction;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * One descriptive question: what the file says and the answer it leaves open - one of the options the source itself
 * supplies, an existing institution a name search suggests, consent to the omission the finding describes, or a
 * value the publisher supplies where the file gives none. The explanation is the planner's own, in the ONIX
 * vocabulary its other disclosures use; every source location it stands for stays in its details.
 */
const DescriptiveDecision = ({ finding, scope, answer, rejected, translate, onAnswer }: DescriptiveDecisionProps) => {
  const family = translate(`onixPlan.descriptive.family.${finding.family}`);
  const { resolution } = finding;
  const noInstitution = INSTITUTION_DECISIONS[finding.code];
  // Several questions of one family and scope share a label, so each control is described by its own question.
  const messageId = useId();
  const described = { 'aria-describedby': messageId };

  return (
    <div className="flex flex-col gap-1" data-testid="onix-plan-descriptive-question">
      <Typography>
        {scope}: {family}
      </Typography>
      <Typography variant="body2" id={messageId}>
        {finding.message}
      </Typography>
      {resolution.kind === 'INPUT' ? (
        <DescriptiveInput
          input={resolution.input}
          label={translate(`onixPlan.descriptive.${INPUT_LABELS[resolution.input]}`, { family, scope })}
          choose={translate('onixPlan.descriptive.choose')}
          invalidText={rejected ? translate('onixPlan.descriptive.invalid') : undefined}
          describedBy={messageId}
          answer={answer}
          onAnswer={onAnswer}
        />
      ) : resolution.kind === 'CHOICE' && noInstitution !== undefined ? (
        <InstitutionDecision
          options={resolution.options}
          label={translate('onixPlan.descriptive.institutionLabel', { family, scope })}
          noInstitution={translate(`onixPlan.descriptive.option.${noInstitution}`)}
          describedBy={messageId}
          answer={answer}
          translate={translate}
          onAnswer={onAnswer}
        />
      ) : resolution.kind === 'CHOICE' ? (
        <TextField
          select
          label={translate('onixPlan.descriptive.chooseLabel', { family, scope })}
          value={answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
          slotProps={{ ...NATIVE_SELECT, htmlInput: described }}
          size="small"
        >
          <option value="">{translate('onixPlan.descriptive.choose')}</option>
          {resolution.options.map(({ key, label }) => (
            <option key={key} value={key}>
              {DESCRIPTIVE_OPTION_NAMES.has(key) ? translate(`onixPlan.descriptive.option.${key}`, { label }) : label}
            </option>
          ))}
        </TextField>
      ) : (
        <FormControlLabel
          control={
            <Checkbox
              checked={answer === ONIX_DESCRIPTIVE_ACKNOWLEDGED}
              onChange={(event) => onAnswer(event.target.checked ? ONIX_DESCRIPTIVE_ACKNOWLEDGED : undefined)}
              slotProps={{ input: described }}
            />
          }
          label={translate('onixPlan.descriptive.acknowledge', { family, scope })}
        />
      )}
      {finding.locations.length > 0 && (
        <details data-testid="onix-plan-descriptive-locations">
          <summary>
            <Typography component="span" variant="body2">
              {translate('onixPlan.descriptive.locations', { count: finding.locations.length })}
            </Typography>
          </summary>
          <ul className="flex list-disc flex-col gap-1 pl-6">
            {finding.locations.map(({ path, sourcePath }) => (
              <li key={path}>
                <Typography variant="body2" className="break-all">
                  {sourcePath}
                </Typography>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

type PriceDecisionProps = {
  readonly finding: OnixCommercialFinding;
  readonly scope: string;
  readonly answer: string | undefined;
  /** Whether the answer is one the file does not offer, which holds the plan until it is corrected or cleared. */
  readonly stale: boolean;
  readonly translate: TranslateFunction;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * One price decision (thoth-app#215): the prices the file states that Thoth never takes by itself, or that contradict each
 * other, each named with what taking it would leave unrecorded, and the choice to create no Price from them. A required
 * decision starts unanswered and holds the plan; an optional one starts on its automatic default, which leaving it
 * unanswered keeps (Specification Amendment 2B). Nothing is chosen for the publisher, and the planner's own explanation
 * describes the control.
 */
const PriceDecision = ({ finding, scope, answer, stale, translate, onAnswer }: PriceDecisionProps) => {
  const messageId = useId();
  const { resolution } = finding;
  const optional = resolution.kind === 'PRICE_OVERRIDE';
  const candidates =
    resolution.kind === 'PRICE_CHOICE' || resolution.kind === 'PRICE_OVERRIDE' ? resolution.candidates : [];
  // A stale answer is shown as the answer given, never as the default that does not stand in for it, so choosing the
  // default clears it; it cannot be chosen again.
  const staleAnswer =
    stale && answer !== undefined && answer !== ONIX_PRICE_OMIT && !candidates.some(({ key }) => key === answer)
      ? answer
      : null;

  return (
    <div className="flex flex-col gap-1" data-testid="onix-plan-commercial-question">
      <Typography>{scope}</Typography>
      <Typography variant="body2" id={messageId}>
        {finding.message}
      </Typography>
      <TextField
        select
        label={translate(optional ? 'onixPlan.commercial.overrideLabel' : 'onixPlan.commercial.priceLabel', { scope })}
        value={answer ?? ''}
        onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
        error={stale}
        helperText={stale ? translate('onixPlan.commercial.staleChoice') : undefined}
        slotProps={{ ...NATIVE_SELECT, htmlInput: { 'aria-describedby': messageId } }}
        size="small"
      >
        {staleAnswer === null ? null : (
          <option value={staleAnswer} disabled>
            {translate('onixPlan.commercial.staleAnswer', { answer: staleAnswer })}
          </option>
        )}
        <option value="">
          {resolution.kind === 'PRICE_OVERRIDE'
            ? translate('onixPlan.commercial.keepDefault', {
                currency: resolution.currencyCode,
                amount: String(resolution.defaultUnitPrice),
              })
            : translate('onixPlan.commercial.choosePrice')}
        </option>
        {candidates.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
        <option value={ONIX_PRICE_OMIT}>{translate('onixPlan.commercial.omitPrice')}</option>
      </TextField>
    </div>
  );
};

type InstitutionDecisionProps = {
  readonly options: readonly { readonly key: string; readonly label: string }[];
  readonly label: string;
  /** How the option that imports no institution reads for this decision. */
  readonly noInstitution: string;
  /** The id of the question the control answers. */
  readonly describedBy: string;
  readonly answer: string | undefined;
  readonly translate: TranslateFunction;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * An existing Thoth institution for an affiliation or a funder the file does not identify. The suggestions are
 * what a search for the file's own words returned: evidence to choose from, never an identity, so nothing is chosen
 * until the publisher chooses - one of them, or to import nothing in its place.
 */
const InstitutionDecision = ({
  options,
  label,
  noInstitution,
  describedBy,
  answer,
  translate,
  onAnswer,
}: InstitutionDecisionProps) => {
  const suggestions = options.filter(({ key }) => key !== 'OMIT');

  return (
    <div className="flex flex-col gap-1">
      <Typography variant="body2">
        {suggestions.length > 0
          ? translate('onixPlan.descriptive.institutionSuggestions', { count: suggestions.length })
          : translate('onixPlan.descriptive.institutionNoSuggestions')}
      </Typography>
      <TextField
        select
        label={label}
        value={answer ?? ''}
        onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
        slotProps={{ ...NATIVE_SELECT, htmlInput: { 'aria-describedby': describedBy } }}
        size="small"
      >
        <option value="">{translate('onixPlan.descriptive.choose')}</option>
        {suggestions.length > 0 && (
          <optgroup label={translate('onixPlan.descriptive.institutionSuggestionGroup')}>
            {suggestions.map(({ key, label: name }) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </optgroup>
        )}
        {options.some(({ key }) => key === 'OMIT') && <option value="OMIT">{noInstitution}</option>}
      </TextField>
    </div>
  );
};

const INPUT_LABELS: Readonly<Record<OnixDescriptiveInput, string>> = {
  DATE: 'dateLabel',
  LOCALE: 'localeLabel',
  TEXT: 'textLabel',
};

type DescriptiveInputProps = {
  readonly input: OnixDescriptiveInput;
  readonly label: string;
  readonly choose: string;
  readonly invalidText: string | undefined;
  /** The id of the question the control answers. */
  readonly describedBy: string;
  readonly answer: string | undefined;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * A value the file does not give, supplied by the publisher: a calendar day, one of Thoth's locales, or text.
 * Nothing is preselected or defaulted, text stays on screen as typed, and emptying the control takes the answer
 * back. Whether an answer is a value the plan can use is the plan's decision, which the control only reports.
 */
const DescriptiveInput = ({
  input,
  label,
  choose,
  invalidText,
  describedBy,
  answer,
  onAnswer,
}: DescriptiveInputProps) => {
  const [draft, setDraft] = useState(answer ?? '');
  const id = `${describedBy}-input`;
  const shared = { id, label, size: 'small', error: invalidText !== undefined, helperText: invalidText } as const;
  // Described by its question, and by why an answer is refused while it is.
  const described = {
    'aria-describedby': invalidText === undefined ? describedBy : `${describedBy} ${id}-helper-text`,
  };

  switch (input) {
    case 'DATE':
      return (
        <TextField
          {...shared}
          type="date"
          value={answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: described }}
        />
      );
    case 'LOCALE':
      return (
        <TextField
          {...shared}
          select
          value={answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
          slotProps={{ ...NATIVE_SELECT, htmlInput: described }}
        >
          <option value="">{choose}</option>
          {languageOptionsAlt.map(({ label: name, value }) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </TextField>
      );
    case 'TEXT':
      return (
        <TextField
          {...shared}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onAnswer(event.target.value === '' ? undefined : event.target.value);
          }}
          slotProps={{ htmlInput: described }}
        />
      );
  }
};

type EditionInputProps = {
  readonly label: string;
  readonly invalidText: string;
  readonly value: number | undefined;
  readonly onChange: (edition: number | undefined) => void;
};

/**
 * The edition number the publisher gives a Work the file describes as a new or revised edition. What is typed
 * stays on screen as typed; only a whole number of 1 or more that Thoth can store becomes the decision.
 */
const EditionInput = ({ label, invalidText, value, onChange }: EditionInputProps) => {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const invalid = draft.trim().length > 0 && normaliseEditionNumber(draft).kind !== 'VALID';

  return (
    <TextField
      label={label}
      value={draft}
      error={invalid}
      helperText={invalid ? invalidText : undefined}
      onChange={(event) => {
        const typed = event.target.value;
        const edition = normaliseEditionNumber(typed);

        setDraft(typed);
        onChange(edition.kind === 'VALID' ? edition.value : undefined);
      }}
      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      size="small"
    />
  );
};

/** A supported licence, named as the app names it, with the URL Thoth stores. */
const supportedLicenceLabel = (identity: string, url: string) =>
  `${ONIX_SUPPORTED_LICENCES.find((licence) => licence.identity === identity)?.label ?? identity} (${url})`;

/**
 * What a Work group's licence becomes, said plainly (thoth-app#217): the supported licence a new Work is created with,
 * none, none because the publisher acknowledged the licence's omission, the one the existing Work already holds, the
 * existing one kept where the file is silent, or not decided while its findings block.
 */
const licenceText = (action: OnixWorkLicenceAction['action'], translate: TranslateFunction): string => {
  switch (action.kind) {
    case 'SET_SUPPORTED_LICENSE':
      return supportedLicenceLabel(action.identity, action.url);
    case 'ALREADY_PRESENT':
      return translate('onixPlan.licence.alreadyPresent', {
        licence: supportedLicenceLabel(action.identity, action.url),
      });
    case 'EXISTING_PRESERVED':
      return translate('onixPlan.licence.preserved');
    case 'OMIT_WITH_ACKNOWLEDGED_LOSS':
      return translate('onixPlan.licence.omitted');
    case 'UNSET':
      return translate('onixPlan.licence.none');
    case 'BLOCKED':
      return translate('onixPlan.licence.blocked');
  }
};

type RightsAcknowledgementProps = {
  readonly label: string;
  readonly checked: boolean;
  /** Whether the answer given is not the acknowledgement, which holds the plan until it is cleared or replaced. */
  readonly stale: boolean;
  readonly staleText: string;
  readonly onChange: (checked: boolean) => void;
};

/**
 * One source-bound acknowledgement (thoth-app#217): that the import continues while knowingly omitting the one fact its
 * finding describes. Nothing starts ticked, unticking it holds the plan again, and it creates no right, permission or
 * contact.
 */
const RightsAcknowledgement = ({ label, checked, stale, staleText, onChange }: RightsAcknowledgementProps) => (
  <div className="flex flex-col gap-1">
    <FormControlLabel
      control={<Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />}
      label={label}
    />
    {stale && (
      <Typography variant="body2" color="error">
        {staleText}
      </Typography>
    )}
  </div>
);

type ProductContactDetailsProps = {
  readonly contact: OnixProductContactFact;
  readonly translate: TranslateFunction;
};

/**
 * The details a ProductContact states, shown so that acknowledging its omission is informed (5543566392 rule 67):
 * every value the file gives, in the interactive preview only, and never joined into one text.
 */
const ProductContactDetails = ({ contact, translate }: ProductContactDetailsProps) => {
  const rows: [string, string[]][] = [
    ['organisation', contact.name === null ? [] : [contact.name]],
    ['contactName', contact.contactName === null ? [] : [contact.contactName]],
    [
      'identifiers',
      contact.identifiers.map(
        ({ type, typeName, value }) => `${type}${typeName === null ? '' : ` (${typeName})`}: ${value}`,
      ),
    ],
    ['emails', contact.emailAddresses.map(({ value }) => value)],
    ['telephones', contact.telephoneNumbers.map(({ value }) => value)],
    ['faxes', contact.faxNumbers.map(({ value }) => value)],
    [
      'address',
      contact.address === null
        ? []
        : [
            contact.address.streetAddress,
            contact.address.locationName,
            contact.address.postalCode,
            contact.address.regionCode,
            contact.address.countryCode,
          ].filter((line): line is string => line !== null),
    ],
  ];

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {rows
        .filter(([, values]) => values.length > 0)
        .map(([key, values]) => (
          <div key={key} className="contents">
            <dt>{translate(`onixPlan.productContact.${key}`)}</dt>
            <dd>{values.join(key === 'address' ? ', ' : '; ')}</dd>
          </div>
        ))}
    </dl>
  );
};

type AccessibilityPublicationProps = {
  readonly action: OnixPublicationAccessibilityAction;
  readonly scope: string;
  readonly translate: TranslateFunction;
};

/** An accessibility value as the ordinary Publication form names it; a report URL as it is. */
const accessibilityValueLabel = (value: string | null, translate: TranslateFunction) =>
  value === null ? translate('onixPlan.accessibility.none') : (ACCESSIBILITY_VALUE_LABELS.get(value) ?? value);

/**
 * What one Publication's accessibility becomes (thoth-app#221): the four fields a new Publication is created with, or how
 * the file compares with what a Publication already in Thoth holds, which is never changed - and every value the file
 * states that is not imported, with why, so that nothing it says disappears from view.
 */
const AccessibilityPublication = ({ action, scope, translate }: AccessibilityPublicationProps) => {
  const { resolved, omitted } = action;
  const existing = 'existing' in action.action ? action.action.existing : null;
  const shown = action.action.kind === 'CREATE' ? resolved : existing;

  return (
    <li data-testid="onix-plan-accessibility-publication" className="flex flex-col gap-1">
      <Typography>
        {scope}: {translate(`onixPlan.accessibility.action.${action.action.kind}`)}
      </Typography>
      {shown !== null && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {ACCESSIBILITY_FIELDS.map((field) => (
            <div key={field} className="contents">
              <dt>{translate(`onixPlan.accessibility.field.${field}`)}</dt>
              <dd className="break-all">{accessibilityValueLabel(shown[field], translate)}</dd>
            </div>
          ))}
        </dl>
      )}
      {omitted.length > 0 && (
        <details data-testid="onix-plan-accessibility-omitted">
          <summary>
            <Typography component="span" variant="body2">
              {translate('onixPlan.accessibility.omitted', { count: omitted.length })}
            </Typography>
          </summary>
          <ul className="flex list-disc flex-col gap-1 pl-6">
            {omitted.map(({ field, value, reason, codes }) => (
              <li key={`${field}|${value}|${reason}`}>
                <Typography variant="body2" className="break-all">
                  {translate(`onixPlan.accessibility.field.${field}`)}: {accessibilityValueLabel(value, translate)}{' '}
                  (List 196 {codes.join(' + ')}) - {translate(`onixPlan.accessibility.omission.${reason}`)}
                </Typography>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
};

type FeatureDescriptionsProps = {
  readonly features: readonly OnixProductFormFeatureFact[];
};

/**
 * The descriptions the ProductFormFeatures a finding is about state, as stated, with their language (thoth-app#221), so
 * that no limitation prose disappears from view (5571562316 rule 54). A contact's (List 196 98, 99) never are: they stay
 * in the plan's facts.
 */
const FeatureDescriptions = ({ features }: FeatureDescriptionsProps) => {
  const described = features
    .filter(({ type, value }) => !(type === '09' && (value === '98' || value === '99')))
    .flatMap(({ descriptions }) => descriptions);

  if (described.length === 0) return null;

  return (
    <ul className="flex list-none flex-col gap-1 pl-2">
      {described.map(({ path, text, language }) => (
        <li key={path}>
          <Typography variant="body2" className="break-all">
            {language === null ? text : `[${language}] ${text}`}
          </Typography>
        </li>
      ))}
    </ul>
  );
};

type AccessibilityDecisionProps = {
  readonly finding: OnixPlanFinding;
  readonly scope: string;
  readonly features: readonly OnixProductFormFeatureFact[];
  readonly answer: string | undefined;
  /** Whether the answer is one the file does not offer, which holds the plan until it is corrected or cleared. */
  readonly stale: boolean;
  readonly translate: TranslateFunction;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * One accessibility or product-form-feature question (thoth-app#221): a choice among the values the file itself asserts,
 * each named with the codes that assert it - never one taken by source order, version, level or strength - or the
 * knowing acknowledgement of a loss Thoth cannot avoid. Nothing starts chosen or ticked, and a stale answer is shown as
 * the answer given, never as a value it could stand for.
 */
const AccessibilityDecision = ({
  finding,
  scope,
  features,
  answer,
  stale,
  translate,
  onAnswer,
}: AccessibilityDecisionProps) => {
  const messageId = useId();
  const { resolution } = finding;
  const options = resolution.kind === 'CHOICE' ? resolution.options : [];
  const staleAnswer = stale && answer !== undefined && !options.some(({ key }) => key === answer) ? answer : null;

  return (
    <div className="flex flex-col gap-1" data-testid="onix-plan-accessibility-question">
      <Typography>{scope}</Typography>
      <Typography variant="body2" id={messageId}>
        {finding.message}
      </Typography>
      <FeatureDescriptions features={features} />
      {resolution.kind === 'CHOICE' ? (
        <TextField
          select
          label={translate(`onixPlan.accessibility.choice.${finding.code}`, { scope })}
          value={answer ?? ''}
          onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
          error={stale}
          helperText={stale ? translate('onixPlan.accessibility.staleChoice') : undefined}
          slotProps={{ ...NATIVE_SELECT, htmlInput: { 'aria-describedby': messageId } }}
          size="small"
        >
          {staleAnswer === null ? null : (
            <option value={staleAnswer} disabled>
              {translate('onixPlan.accessibility.staleAnswer', { answer: staleAnswer })}
            </option>
          )}
          <option value="">{translate('onixPlan.accessibility.choose')}</option>
          {options.map(({ key, label }) => (
            <option key={key} value={key}>
              {ACCESSIBILITY_OPTION_NAMES.has(key)
                ? translate(`onixPlan.accessibility.option.${key}`, { label })
                : label}
            </option>
          ))}
        </TextField>
      ) : (
        <RightsAcknowledgement
          label={translate(
            finding.family === 'PRODUCT_FORM_FEATURE'
              ? 'onixPlan.productFormFeature.acknowledge'
              : 'onixPlan.accessibility.acknowledge',
            { scope },
          )}
          checked={answer !== undefined}
          stale={stale}
          staleText={translate('onixPlan.accessibility.staleChoice')}
          onChange={(checked) => onAnswer(checked ? ONIX_ACCESSIBILITY_ACKNOWLEDGED : undefined)}
        />
      )}
    </div>
  );
};

type ComponentSummaryProps = {
  readonly intent: OnixComponentIntent;
  readonly fact: OnixComponentFact | undefined;
  readonly scope: string;
  readonly translate: TranslateFunction;
};

/**
 * What one component of a new Work becomes (thoth-app#223): a chapter at its position with its pages and DOI, a contained
 * Work with its WorkType, lifecycle, imprint and edition - planned, but not yet created - an audiovisual item left out, or
 * a component that cannot be planned; with every fact the file states for a later stage, kept rather than dropped.
 */
const ComponentSummary = ({ intent, fact, scope, translate }: ComponentSummaryProps) => {
  const undecided = translate('onixPlan.components.undecided');
  const none = translate('onixPlan.components.none');
  const rows: [string, string][] = [];

  if (intent.kind === 'BOOK_CHAPTER' || intent.kind === 'CONTAINED_WORK') {
    const { ordinal, hierarchy } = intent;

    rows.push([
      'ordinal',
      ordinal.status === 'RESOLVED'
        ? `${ordinal.ordinal} (${translate(`onixPlan.components.ordinalBasis.${ordinal.basis}`)})`
        : undecided,
    ]);

    if (hierarchy !== null) rows.push(['hierarchy', hierarchy.raw]);
  }

  if (intent.kind === 'BOOK_CHAPTER') {
    const { pages } = intent;

    rows.push(['matter', translate(`onixPlan.components.matter.${intent.matter}`)]);
    rows.push([
      'pages',
      pages.status === 'RESOLVED'
        ? [pages.firstPage, pages.lastPage].filter((page) => page.length > 0).join('–')
        : pages.status === 'OMITTED'
          ? translate('onixPlan.components.pagesOmitted')
          : pages.status === 'NONE'
            ? none
            : undecided,
    ]);
    rows.push(['pageCount', intent.pageCount === null ? none : String(intent.pageCount)]);
    rows.push(['doi', intent.doi ?? none]);
    rows.push(['inherited', translate('onixPlan.components.inherited')]);
  }

  if (intent.kind === 'CONTAINED_WORK') {
    const { workType, lifecycle, imprint } = intent;

    rows.push([
      'workType',
      workType.status === 'RESOLVED' ? translate(`onixPlan.workType.${workType.type}`) : undecided,
    ]);
    rows.push([
      'status',
      lifecycle.status === null ? undecided : translate(`onixPlan.components.status.${lifecycle.status}`),
    ]);

    if (lifecycle.publicationDate !== null) rows.push(['publicationDate', lifecycle.publicationDate]);
    if (lifecycle.withdrawnDate !== null) rows.push(['withdrawnDate', lifecycle.withdrawnDate]);

    rows.push([
      'imprint',
      imprint.status === 'RESOLVED' ? translate('onixPlan.components.imprintInherited') : undecided,
    ]);
    rows.push(['edition', translate('onixPlan.components.editionPlanned')]);
    rows.push(['pageCount', intent.pageCount === null ? none : String(intent.pageCount)]);
    rows.push(['doi', intent.doi ?? none]);
  }

  return (
    <li data-testid="onix-plan-component" className="flex flex-col gap-1">
      <Typography>
        {scope}: {translate(`onixPlan.components.kind.${intent.kind}`)} -{' '}
        {translate(`onixPlan.components.action.${intent.action}`)}
      </Typography>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {rows.map(([field, value]) => (
            <div key={field} className="contents">
              <dt>{translate(`onixPlan.components.field.${field}`)}</dt>
              <dd className="break-all">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {fact !== undefined && fact.retained.length > 0 && (
        <details data-testid="onix-plan-component-retained">
          <summary>
            <Typography component="span" variant="body2">
              {translate('onixPlan.components.retained', { count: fact.retained.length })}
            </Typography>
          </summary>
          <ul className="flex list-disc flex-col gap-1 pl-6">
            {fact.retained.map(({ path, element, owner, ownerIssue }) => (
              <li key={path}>
                <Typography variant="body2" className="break-all">
                  {translate('onixPlan.components.retainedFact', { element, owner, ownerIssue })}
                </Typography>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
};

type ComponentDecisionProps = {
  readonly finding: OnixPlanFinding;
  readonly scope: string;
  readonly answer: string | undefined;
  /** Whether the answer is one the file does not offer, which holds the plan until it is corrected or cleared. */
  readonly stale: boolean;
  readonly translate: TranslateFunction;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * One component or contained-Work question (thoth-app#223): a contained Work's own WorkType or status, a chapter's page range
 * among the ranges its file states, a position the file does not give, a date the chosen status needs, or the knowing
 * acknowledgement of a loss. Nothing starts chosen, ticked or filled in, and a stale answer is shown as the answer given,
 * never as a value it could stand for.
 */
const ComponentDecision = ({ finding, scope, answer, stale, translate, onAnswer }: ComponentDecisionProps) => {
  const messageId = useId();
  const { resolution, code } = finding;
  const described = { 'aria-describedby': messageId };
  const staleText = stale ? translate('onixPlan.components.staleChoice') : undefined;

  const control = () => {
    switch (resolution.kind) {
      case 'CHOICE': {
        const staleAnswer =
          stale && answer !== undefined && !resolution.options.some(({ key }) => key === answer) ? answer : null;
        const optionLabel = (key: string, label: string) =>
          code === 'CONTAINED_WORK_TYPE_REQUIRED'
            ? translate(`onixPlan.workType.${key}`)
            : code === 'CONTAINED_WORK_STATUS_REQUIRED'
              ? translate(`onixPlan.components.status.${key}`)
              : key === ONIX_COMPONENT_OMIT
                ? translate('onixPlan.components.option.OMIT')
                : label;

        return (
          <TextField
            select
            label={translate(`onixPlan.components.choice.${code}`, { scope })}
            value={answer ?? ''}
            onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
            error={stale}
            helperText={staleText}
            slotProps={{ ...NATIVE_SELECT, htmlInput: described }}
            size="small"
          >
            {staleAnswer === null ? null : (
              <option value={staleAnswer} disabled>
                {translate('onixPlan.components.staleAnswer', { answer: staleAnswer })}
              </option>
            )}
            <option value="">{translate('onixPlan.components.choose')}</option>
            {resolution.options.map(({ key, label }) => (
              <option key={key} value={key}>
                {optionLabel(key, label)}
              </option>
            ))}
          </TextField>
        );
      }
      case 'INPUT':
        return resolution.input === 'DATE' ? (
          <TextField
            type="date"
            label={translate(`onixPlan.components.dateLabel.${String(finding.detail.role)}`, { scope })}
            value={answer ?? ''}
            onChange={(event) => onAnswer(event.target.value === '' ? undefined : event.target.value)}
            error={stale}
            helperText={staleText}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: described }}
            size="small"
          />
        ) : (
          <OrdinalInput
            label={translate('onixPlan.components.ordinalLabel', { scope })}
            invalidText={translate('onixPlan.components.ordinalInvalid')}
            staleText={staleText}
            describedBy={messageId}
            finding={finding}
            answer={answer}
            onAnswer={onAnswer}
          />
        );
      case 'ACKNOWLEDGE':
        return (
          <RightsAcknowledgement
            label={translate(`onixPlan.components.acknowledge.${code}`, { scope })}
            checked={answer !== undefined}
            stale={stale}
            staleText={translate('onixPlan.components.staleChoice')}
            onChange={(checked) => onAnswer(checked ? ONIX_COMPONENT_ACKNOWLEDGED : undefined)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-1" data-testid="onix-plan-component-question">
      <Typography>{scope}</Typography>
      <Typography variant="body2" id={messageId}>
        {finding.message}
      </Typography>
      {control()}
      <ComponentLocations finding={finding} translate={translate} />
    </div>
  );
};

type ComponentLocationsProps = {
  readonly finding: Pick<OnixPlanFinding, 'locations'>;
  readonly translate: TranslateFunction;
};

/** Every place in the file a component finding is about, as the submitted file names it, so each stays traceable. */
const ComponentLocations = ({ finding, translate }: ComponentLocationsProps) =>
  finding.locations.length === 0 ? null : (
    <details data-testid="onix-plan-component-locations">
      <summary>
        <Typography component="span" variant="body2">
          {translate('onixPlan.components.locations', { count: finding.locations.length })}
        </Typography>
      </summary>
      <ul className="flex list-disc flex-col gap-1 pl-6">
        {finding.locations.map(({ path, sourcePath }) => (
          <li key={path}>
            <Typography variant="body2" className="break-all">
              {sourcePath}
            </Typography>
          </li>
        ))}
      </ul>
    </details>
  );

type OrdinalInputProps = {
  readonly label: string;
  readonly invalidText: string;
  readonly staleText: string | undefined;
  readonly describedBy: string;
  readonly finding: OnixPlanFinding;
  readonly answer: string | undefined;
  readonly onAnswer: (answer: string | undefined) => void;
};

/**
 * The position a component takes among its Work's components where the file gives none it can use. What is typed stays on
 * screen as typed; only a whole number of 1 or more that Thoth can store becomes the answer, and nothing is ever proposed.
 */
const OrdinalInput = ({ label, invalidText, staleText, describedBy, finding, answer, onAnswer }: OrdinalInputProps) => {
  const [draft, setDraft] = useState(answer ?? '');
  const invalid = draft.length > 0 && !isOfferedOnixComponentAnswer(finding, draft);

  return (
    <TextField
      label={label}
      value={draft}
      error={invalid || staleText !== undefined}
      helperText={invalid ? invalidText : staleText}
      onChange={(event) => {
        const typed = event.target.value;

        setDraft(typed);
        onAnswer(isOfferedOnixComponentAnswer(finding, typed) ? typed : undefined);
      }}
      slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-describedby': describedBy } }}
      size="small"
    />
  );
};
