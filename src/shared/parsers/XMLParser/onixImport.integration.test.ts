/* eslint-disable simple-import-sort/imports */
import { parse } from '@5stones/onix';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleCode, MarkupFormat } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { AbstractService } from '@/src/entities/abstract/api/abstract.service';
import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { ContributionService } from '@/src/entities/contribution/api/contribution.service';
import { ContributorService } from '@/src/entities/contributor';
import { FundingService } from '@/src/entities/funding/api/funding.service';
import { LanguageService } from '@/src/entities/language/api/language.service';
import { LocationService } from '@/src/entities/locations/api/location.service';
import { PriceService } from '@/src/entities/price/api/price.service';
import { PublicationService } from '@/src/entities/publication/api/publication.service';
import { ReferenceService } from '@/src/entities/reference/api/reference.service';
import { SeriesService } from '@/src/entities/series';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { TitleService } from '@/src/entities/title/api/title.service';
import { WorkService } from '@/src/entities/work/api/work.service';

import {
  currencyOptions,
  languageOptions,
  licenseOptions,
  LocationPlatforms,
  PublicationType,
  SubjectTypes,
  WorkStatuses,
  WorkTypes,
} from '../../constants';
import { SeriesType } from '../../constants/series';
import { appConfig } from '../../config';
import type {
  ImportIssue,
  ImportParseResult,
  ImportPlan,
  OnixDescriptiveFinding,
  OnixCommercialPlan,
  OnixDescriptiveFindingCode,
  OnixImportPlanSidecar,
  OnixPlanInputs,
  OnixRightsPlan,
  OnixTargetEvidence,
} from '../../types';
import { ONIX_PRICE_OMIT, ONIX_RIGHTS_ACKNOWLEDGED, type OnixSalesRightsPlan } from '../../types/onixPlanning';
import { collectWorkIdentifiers } from '../../utils/importPreflight/identifiers';
import { ExtendedONIXMessageRoot } from './interfaces';
import { toOnixArray } from './onix';
import { reduceOnixCommercial } from './onixCommercial';
import {
  type OnixDescriptivePlan,
  reduceOnixDescriptive,
  resolveOnixDescriptiveWork,
  suggestOnixWorkType,
} from './onixDescriptive';
import { planOnixSource } from './onixPlanning';
import { reduceOnixRights } from './onixRights';
import { reduceOnixSalesRights } from './onixSalesRights';
import {
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from './onixTargetResolution';
import XMLParser from './XMLParser';

/**
 * End-to-end cover for the whole bulk-import path: a real ONIX document parsed by the real
 * `@5stones/onix`, planned from the file alone, adapted by the real `XMLParser`, resolved into the
 * plan the import runs by the ONIX resolver, then imported by the real `WorkService` wired to real
 * `SeriesService`, `TitleService` and friends.
 *
 * Only the GraphQL transport is stubbed, so the assertions are about the mutations the app
 * would actually send — not about a mocked service being called.
 */

const IMPRINT_ID = '11111111-1111-1111-1111-111111111111';
const IMPRINT_NAME = 'Arc Humanities Press';
const IMPRINTS = [{ label: IMPRINT_NAME, value: IMPRINT_ID }];
const PUBLISHER_ID = '44444444-4444-4444-4444-444444444444';
const FOUNDATIONS_ID = '22222222-2222-2222-2222-222222222222';
const CREATED_SERIES_ID = '33333333-3333-3333-3333-333333333333';

/** Three products in a series Thoth does not have, one in a series it does. */
const product = (
  isbn: string,
  title: string,
  seriesName: string,
  collectionType = '10',
  contributorName?: string,
  ordinal = '1',
) => `
  <Product>
    <RecordReference>${isbn}</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>${collectionType}</CollectionType>
        <CollectionSequence><CollectionSequenceType>03</CollectionSequenceType><CollectionSequenceNumber>${ordinal}</CollectionSequenceNumber></CollectionSequence>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>02</TitleElementLevel>
            <NoPrefix/>
            <TitleWithoutPrefix>${seriesName}</TitleWithoutPrefix>
          </TitleElement>
        </TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">${title}</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>05</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix>INTERNAL_${isbn}</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
      ${
        contributorName
          ? `<Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonName>${contributorName}</PersonName>
        <NamesBeforeKey>Jane</NamesBeforeKey>
        <KeyNames>Doe</KeyNames>
      </Contributor>`
          : ''
      }
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
  </Product>`;

const ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  ${product('9781641891783', 'A Companion to the Cavendishes', 'Arc Companions', '10', undefined, '1')}
  ${product('9781641893763', 'The Medieval Womb', 'Arc Companions', '10', undefined, '2')}
  ${product('9781802704488', 'Beowulf by All', 'Foundations', '10', undefined, '3')}
  ${product('9781802703306', 'Trans Histories of the Medieval Book', 'Arc Companions', '10', undefined, '3')}
</ONIXMessage>`;

/** A compact production-shaped Arc file: repeated contributor, no affiliation or ROR metadata. */
const ARC_CONTRIBUTOR_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  ${product('9781641891783', 'A Companion to the Cavendishes', 'Arc Companions', '10', 'Jane Doe', '1')}
  ${product('9781641893763', 'The Medieval Womb', 'Arc Companions', '10', 'Jane Doe', '2')}
</ONIXMessage>`;

/**
 * One product whose sole contributor declares an ORCID under NameIDType 21, written exactly as
 * the caller asks for it. The scheme code and the identifier are both parameters because the two
 * questions this fixture exists to answer are separate: what a declared ORCID becomes, and what
 * an identically shaped value under another scheme must *not* become.
 */
const orcidContributorOnix = (idValue: string, nameIdType = '21') => `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">A Companion to the Cavendishes</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonName>Jane Doe</PersonName>
        <NamesBeforeKey>Jane</NamesBeforeKey>
        <KeyNames>Doe</KeyNames>
        <NameIdentifier>
          <NameIDType>${nameIdType}</NameIDType>
          <IDValue>${idValue}</IDValue>
        </NameIdentifier>
      </Contributor>
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

/**
 * One Product whose titles, other descriptive facts and publishing detail a test states: the shape the #183
 * correction regressions (thoth-app#183, Correction Authorization 1) send from real XML to the mutation.
 */
const describedOnix = ({
  release = '3.0',
  titles,
  descriptive = '',
  languages = '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
  publishing = '<PublishingStatus>04</PublishingStatus><PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>',
}: {
  readonly release?: string;
  readonly titles: string;
  readonly descriptive?: string;
  readonly languages?: string;
  readonly publishing?: string;
}) => `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="${release}">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      ${titles}
      ${descriptive}
      ${languages}
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      ${publishing}
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

/** A TitleDetail of one TitleElement at the Product level, with an optional TitleStatement. */
const titleDetail = (type: string, text: string, { subtitle = '', language = 'eng', statement = '' } = {}) =>
  `<TitleDetail><TitleType>${type}</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel>` +
  `<TitleText language="${language}">${text}</TitleText>` +
  (subtitle ? `<Subtitle language="${language}">${subtitle}</Subtitle>` : '') +
  `</TitleElement>${statement}</TitleDetail>`;

/**
 * The Arc first product's real contributor shape: two authors on one work, numbered by
 * SequenceNumber, alongside the Arc regressions the file also exercises — a NoPrefix /
 * TitleWithoutPrefix title, a TitleType 05 internal title that must not be imported, controlled
 * subject codes read from SubjectCode, a CollectionType 10 publisher series, an affiliation- and
 * ROR-free contributor, and a biography declared textformat="06" that nevertheless carries `<I>`.
 *
 * This is the fixture the "A contribution with this ordinal number already exists" failure needs:
 * two contributions on the SAME newly-created work.
 */
const ARC_MULTI_CONTRIBUTOR_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
        <CollectionSequence><CollectionSequenceType>03</CollectionSequenceType><CollectionSequenceNumber>1</CollectionSequenceNumber></CollectionSequence>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>02</TitleElementLevel>
            <NoPrefix/>
            <TitleWithoutPrefix>Arc Companions</TitleWithoutPrefix>
          </TitleElement>
        </TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">A Companion to the Cavendishes</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>05</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix>INTERNAL_9781641891783</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
      <Subject>
        <SubjectSchemeIdentifier>10</SubjectSchemeIdentifier>
        <SubjectCode>LIT004290</SubjectCode>
        <SubjectHeadingText>LITERARY CRITICISM / Women Authors</SubjectHeadingText>
      </Subject>
      <Subject>
        <SubjectSchemeIdentifier>93</SubjectSchemeIdentifier>
        <SubjectCode>DSBD</SubjectCode>
        <SubjectHeadingText>Literary studies: c 1500 to c 1800</SubjectHeadingText>
      </Subject>
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>B01</ContributorRole>
        <PersonName>Lisa Hopkins</PersonName>
        <NamesBeforeKey>Lisa</NamesBeforeKey>
        <KeyNames>Hopkins</KeyNames>
        <BiographicalNote textformat="06" language="eng">Lisa Hopkins is co-editor of &lt;I&gt;Shakespeare&lt;/I&gt;.</BiographicalNote>
      </Contributor>
      <Contributor>
        <SequenceNumber>2</SequenceNumber>
        <ContributorRole>B01</ContributorRole>
        <PersonName>Tom Rutter</PersonName>
        <NamesBeforeKey>Tom</NamesBeforeKey>
        <KeyNames>Rutter</KeyNames>
      </Contributor>
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

/**
 * The Arc markup shapes, verbatim from the production failure: an abstract declared
 * `textformat="02"` (HTML) whose `<em>` used to be sent to the API as JATS XML and fail its
 * validator, and a biography declared `textformat="06"` (plain text) that nevertheless contains
 * `<I>` — internally contradictory publisher data the import has to route through HTML.
 *
 * Product 1 carries both, through the same NoPrefix/TitleWithoutPrefix title shape and
 * affiliation-free contributor the real file uses. Product 2 repeats the contributor and keeps
 * its text genuinely plain, one declared 06 and one bare.
 */
const ARC_MARKUP_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
        <CollectionSequence><CollectionSequenceType>03</CollectionSequenceType><CollectionSequenceNumber>1</CollectionSequenceNumber></CollectionSequence>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>02</TitleElementLevel>
            <NoPrefix/>
            <TitleWithoutPrefix>Arc Companions</TitleWithoutPrefix>
          </TitleElement>
        </TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitlePrefix>A</TitlePrefix>
          <TitleWithoutPrefix language="eng">Companion to the Cavendishes</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
      <Subject>
        <MainSubject/>
        <SubjectSchemeIdentifier>10</SubjectSchemeIdentifier>
        <SubjectSchemeVersion>2016</SubjectSchemeVersion>
        <SubjectCode>LIT004290</SubjectCode>
        <SubjectHeadingText>LITERARY CRITICISM / Women Authors</SubjectHeadingText>
      </Subject>
      <Subject>
        <MainSubject/>
        <SubjectSchemeIdentifier>12</SubjectSchemeIdentifier>
        <SubjectSchemeVersion>2.1</SubjectSchemeVersion>
        <SubjectCode>DSBD</SubjectCode>
        <SubjectHeadingText>Literary studies: c 1500 to c 1800</SubjectHeadingText>
      </Subject>
      <Subject>
        <MainSubject/>
        <SubjectSchemeIdentifier>93</SubjectSchemeIdentifier>
        <SubjectSchemeVersion>1.3</SubjectSchemeVersion>
        <SubjectCode textscript="Latn">DSBD</SubjectCode>
        <SubjectHeadingText language="eng">Literary studies: c 1600 to c 1800</SubjectHeadingText>
      </Subject>
      <Subject>
        <SubjectSchemeIdentifier>10</SubjectSchemeIdentifier>
        <SubjectCode>HIS037020</SubjectCode>
        <SubjectHeadingText>HISTORY / Europe / Renaissance</SubjectHeadingText>
      </Subject>
      <Subject>
        <SubjectSchemeIdentifier>12</SubjectSchemeIdentifier>
        <SubjectCode>HBLH</SubjectCode>
        <SubjectHeadingText>Early modern history: c 1450/1500 to c 1700</SubjectHeadingText>
      </Subject>
      <Subject>
        <SubjectSchemeIdentifier>93</SubjectSchemeIdentifier>
        <SubjectCode>NHDL</SubjectCode>
        <SubjectHeadingText>European history: Renaissance</SubjectHeadingText>
      </Subject>
      <Subject>
        <SubjectSchemeIdentifier>20</SubjectSchemeIdentifier>
        <SubjectHeadingText>literary culture; aristocratic life; women’s writing; closet drama; iconography</SubjectHeadingText>
      </Subject>
      <Subject><SubjectSchemeIdentifier>94</SubjectSchemeIdentifier><SubjectCode>1DDB</SubjectCode></Subject>
      <Subject><SubjectSchemeIdentifier>96</SubjectSchemeIdentifier><SubjectCode>3MPQS</SubjectCode></Subject>
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonName>Lisa Hopkins</PersonName>
        <NamesBeforeKey>Lisa</NamesBeforeKey>
        <KeyNames>Hopkins</KeyNames>
        <BiographicalNote textformat="06" language="eng">Lisa Hopkins is Professor Emerita of English and co-editor of &lt;I&gt;Shakespeare&lt;/I&gt;.</BiographicalNote>
      </Contributor>
    </DescriptiveDetail>
    <CollateralDetail>
      <TextContent>
        <TextType>03</TextType>
        <ContentAudience>00</ContentAudience>
        <Text textformat="02">&lt;p&gt;The &lt;em&gt;A Companion to the Cavendishes&lt;/em&gt; volume surveys the family.&lt;/p&gt;</Text>
      </TextContent>
    </CollateralDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
  </Product>
  <Product>
    <RecordReference>9781641893763</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641893763</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
        <CollectionSequence><CollectionSequenceType>03</CollectionSequenceType><CollectionSequenceNumber>2</CollectionSequenceNumber></CollectionSequence>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>02</TitleElementLevel>
            <NoPrefix/>
            <TitleWithoutPrefix>Arc Companions</TitleWithoutPrefix>
          </TitleElement>
        </TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">The Medieval Womb</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonName>Lisa Hopkins</PersonName>
        <NamesBeforeKey>Lisa</NamesBeforeKey>
        <KeyNames>Hopkins</KeyNames>
      </Contributor>
    </DescriptiveDetail>
    <CollateralDetail>
      <TextContent>
        <TextType>03</TextType>
        <ContentAudience>00</ContentAudience>
        <Text textformat="06">A study of medieval medicine and the maternal body.</Text>
      </TextContent>
      <TextContent>
        <TextType>02</TextType>
        <ContentAudience>00</ContentAudience>
        <Text>A study of medieval medicine.</Text>
      </TextContent>
    </CollateralDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

/**
 * Arc product 9781802700596 verbatim from the production failure this hotfix answers: a long
 * abstract declared `textformat="02"` (HTML) whose meaningful paragraph is followed by an empty
 * `<p style="text-align:justify;"><br></p>` layout paragraph, and an HTML biography padded with the
 * same empty spacer. The abstract body is spliced in so the meaningful-line-break variant can reuse
 * the whole product, contributor and biography around a different abstract.
 */
const ARC_SPACER_ABSTRACT =
  '&lt;p&gt;This book examines how the military orders gave rise to a new sacred landscape.&lt;/p&gt;&lt;p style="text-align:justify;"&gt;&lt;br&gt;&lt;/p&gt;';

const arcSpacerOnix = (abstractBody = ARC_SPACER_ABSTRACT) => `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781802700596</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700596</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">Ideology and Holy Landscape in the Baltic Crusades</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonName>Gregory Leighton</PersonName>
        <NamesBeforeKey>Gregory</NamesBeforeKey>
        <KeyNames>Leighton</KeyNames>
        <BiographicalNote textformat="02" language="eng">&lt;p&gt;Gregory Leighton earned his PhD in History.&lt;/p&gt;&lt;p&gt;&lt;br&gt;&lt;/p&gt;</BiographicalNote>
      </Contributor>
    </DescriptiveDetail>
    <CollateralDetail>
      <TextContent>
        <TextType>03</TextType>
        <ContentAudience>00</ContentAudience>
        <Text textformat="02">${abstractBody}</Text>
      </TextContent>
    </CollateralDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

/**
 * Arc product 9781942401353 (production product 8), reduced to the composites the importer reads
 * but with every kept element **verbatim from the production file** — including the physical
 * newlines that wrap the tagless `textformat="02"` long abstract, the NBSP inside the short
 * abstract, and both plain-text `textformat="06"` biographies. This is the product the 2026-08
 * import run failed on after the first seven: its long abstract declares HTML, contains no tags,
 * and used to reach the API as plain text with the source-line newlines intact, where each newline
 * became a `Break` the abstract validator rejects.
 *
 * Two byte classes are spelled as XML character references so the source file carries no trailing
 * or invisible whitespace: the production file's trailing space before each wrapped newline is
 * `&#32;`, and its raw NBSP is `&#xA0;` (hex deliberately — the parser mis-decodes the decimal
 * form `&#160;` to a plain space). Both decode to the production bytes; the exact-content
 * assertions below are what prove it.
 */
const ARC_PRODUCT_8_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781942401353</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>06</ProductIDType>
      <IDValue>10.17302/CDH-9781942401353</IDValue>
    </ProductIdentifier>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9781942401353</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>ED</ProductForm>
      <EpubLicense>
        <EpubLicenseName>CC-BY-NC-ND</EpubLicenseName>
        <EpubLicenseExpression>
          <EpubLicenseExpressionType>01</EpubLicenseExpressionType>
          <EpubLicenseExpressionLink>https://creativecommons.org/licenses/by-nc-nd/4.0/</EpubLicenseExpressionLink>
        </EpubLicenseExpression>
      </EpubLicense>
      <Collection>
        <CollectionType>10</CollectionType>
        <CollectionSequence><CollectionSequenceType>03</CollectionSequenceType><CollectionSequenceNumber>1</CollectionSequenceNumber></CollectionSequence>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>02</TitleElementLevel>
            <NoPrefix/>
            <TitleWithoutPrefix>Collection Development, Cultural Heritage, and Digital Humanities</TitleWithoutPrefix>
          </TitleElement>
        </TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">Digital Techniques for Documenting and Preserving Cultural Heritage</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>05</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">CDH_Bentkowska-Digital</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language>
        <LanguageRole>01</LanguageRole>
        <LanguageCode>eng</LanguageCode>
      </Language>
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>B01</ContributorRole>
        <PersonName>Anna Bentkowska-Kafel</PersonName>
        <PersonNameInverted>Bentkowska-Kafel, Anna</PersonNameInverted>
        <NamesBeforeKey>Anna</NamesBeforeKey>
        <KeyNames>Bentkowska-Kafel</KeyNames>
        <ContributorDate>
          <ContributorDateRole>50</ContributorDateRole>
          <Date dateformat="05">1954</Date>
        </ContributorDate>
        <ProfessionalAffiliation>
          <ProfessionalPosition>Independent (f. Department of Digital Humanities, King's College London)</ProfessionalPosition>
          <Affiliation>Independent, PhD 1998, Nottingham Trent University</Affiliation>
        </ProfessionalAffiliation>
        <BiographicalNote textformat="06" language="eng">Anna Bentkowska-Kafel is an art historian with a special interest in the use of 3D electronic imaging in documentation and scholarly interpretation of art.</BiographicalNote>
      </Contributor>
      <Contributor>
        <SequenceNumber>2</SequenceNumber>
        <ContributorRole>B01</ContributorRole>
        <PersonName>Lindsay MacDonald</PersonName>
        <PersonNameInverted>MacDonald, Lindsay</PersonNameInverted>
        <NamesBeforeKey>Lindsay</NamesBeforeKey>
        <KeyNames>MacDonald</KeyNames>
        <ProfessionalAffiliation>
          <ProfessionalPosition>Faculty of Engineering</ProfessionalPosition>
          <Affiliation>University College London</Affiliation>
        </ProfessionalAffiliation>
        <BiographicalNote textformat="06" language="eng">Lindsay MacDonald, Research Associate in the Faculty of Engineering Science, University College London, is a colour scientist specializing in imaging applications</BiographicalNote>
      </Contributor>
    </DescriptiveDetail>
    <CollateralDetail>
      <TextContent>
        <TextType>02</TextType>
        <ContentAudience>00</ContentAudience>
        <Text textformat="02" language="eng">&lt;p>This book is Open Access and available from OAPEN.&#xA0;This book presents interdisciplinary approaches to the examination and documentation of material cultural heritage, using non-invasive spatial and spectral optical technologies.&lt;/p></Text>
      </TextContent>
      <TextContent>
        <TextType>03</TextType>
        <ContentAudience>00</ContentAudience>
        <Text textformat="02" language="eng">In this unique collection the authors present a wide range of&#32;
  interdisciplinary methods to study, document, and conserve material&#32;
  cultural heritage. The methods used serve as exemplars of best practice&#32;
  with a wide variety of cultural heritage objects
  having been recorded, examined, and visualised. The objects range in&#32;
  date, scale, materials, and state of preservation and so
  pose different research questions and challenges for digitization,&#32;
  conservation, and ontological representation of knowledge. Heritage&#32;
  science and specialist digital technologies are presented in a way&#32;
  approachable to non-scientists, while a separate technical section provides details of methods and techniques, alongside examples of notable&#32;
  applications of spatial and spectral documentation of material cultural&#32;
  heritage, with selected literature and identification of future&#32;
  research. This book is an outcome of interdisciplinary research and debates conducted by the participants of the COST Action TD1201, Colour and Space in Cultural Heritage, 2012–16 and is an Open Access publication available under a CC BY-NC-ND licence.</Text>
      </TextContent>
    </CollateralDetail>
    <PublishingDetail>
      <Imprint>
        <ImprintName>Arc Humanities Press</ImprintName>
      </Imprint>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

/** Product 8's long abstract exactly as HTML renders it: source-line wrapping collapsed, nothing else changed. */
const ARC_PRODUCT_8_COLLAPSED_ABSTRACT =
  'In this unique collection the authors present a wide range of interdisciplinary methods to study, document, ' +
  'and conserve material cultural heritage. The methods used serve as exemplars of best practice with a wide variety ' +
  'of cultural heritage objects having been recorded, examined, and visualised. The objects range in date, scale, ' +
  'materials, and state of preservation and so pose different research questions and challenges for digitization, ' +
  'conservation, and ontological representation of knowledge. Heritage science and specialist digital technologies ' +
  'are presented in a way approachable to non-scientists, while a separate technical section provides details of ' +
  'methods and techniques, alongside examples of notable applications of spatial and spectral documentation of ' +
  'material cultural heritage, with selected literature and identification of future research. This book is an ' +
  'outcome of interdisciplinary research and debates conducted by the participants of the COST Action TD1201, ' +
  'Colour and Space in Cultural Heritage, 2012\u201316 and is an Open Access publication available under a ' +
  'CC BY-NC-ND licence.';

/** The subject blocks emitted by Thoth's ONIX 3.0/3.1 exporters, kept compact for round-trip cover. */
const THOTH_SUBJECT_ROUND_TRIP_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>subject-round-trip</RecordReference>
    <NotificationType>03</NotificationType>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Subject round trip</TitleText></TitleElement></TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
      <Subject><SubjectSchemeIdentifier>12</SubjectSchemeIdentifier><SubjectCode>AAB</SubjectCode></Subject>
      <Subject><SubjectSchemeIdentifier>10</SubjectSchemeIdentifier><SubjectCode>AAA000000</SubjectCode></Subject>
      <Subject><SubjectSchemeIdentifier>04</SubjectSchemeIdentifier><SubjectCode>JA85</SubjectCode></Subject>
      <Subject><SubjectSchemeIdentifier>93</SubjectSchemeIdentifier><SubjectCode>ATXZ1</SubjectCode></Subject>
      <Subject><SubjectSchemeIdentifier>20</SubjectSchemeIdentifier><SubjectHeadingText>keyword1</SubjectHeadingText></Subject>
      <Subject><SubjectSchemeIdentifier>B2</SubjectSchemeIdentifier><SubjectHeadingText>custom1</SubjectHeadingText></Subject>
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

/**
 * The one case a warning exists for: a collection éditoriale (CollectionType 11) naming a series
 * Thoth does not have. It cannot create the series, but the work is perfectly importable.
 */
const AMBIGUOUS_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  ${product('9781641891783', 'A Companion to the Cavendishes', 'Editorial Studies', '11')}
</ONIXMessage>`;

/**
 * One product in the shapes Thoth's own ONIX 3 exporter writes: the bare `10.…` DOI its `Doi`
 * Display produces, the canonical title tagged with the language its locale converts to, a second
 * title as TitleType 06, the issue ordinal as CollectionSequenceType 03 behind a sequence of another
 * type, a chapter whose DOI is a TextItemIdentifier of type 06, publication and withdrawn dates as
 * `dateformat="00"` YYYYMMDD, the work's other ISBN as relation 06, and a citation as relation 34 —
 * written here in the `dx.doi.org` form a real sender might use, which is the same DOI as the bare one.
 *
 * It is sent without Thoth's compatibility profile, so it reads as any sender's file: its
 * ProductIdentifier 06 is the Product's own DOI, which is never the Work's (thoth-app#182), and the
 * Work's DOI is the RelatedWork 01 WorkIdentifier a generic sender states it with.
 */
const THOTH_SHAPED_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/work.pb</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
        <CollectionSequence>
          <CollectionSequenceType>02</CollectionSequenceType>
          <CollectionSequenceNumber>1</CollectionSequenceNumber>
        </CollectionSequence>
        <CollectionSequence>
          <CollectionSequenceType>03</CollectionSequenceType>
          <CollectionSequenceNumber>7</CollectionSequenceNumber>
        </CollectionSequence>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>02</TitleElementLevel>
            <TitleText>Foundations</TitleText>
          </TitleElement>
        </TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText language="fre">L’Étranger</TitleText>
          <Subtitle language="fre">Un roman</Subtitle>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>06</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText language="eng">The Stranger</TitleText>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>05</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>INTERNAL_9781641891783</TitleText>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>
    </DescriptiveDetail>
    <CollateralDetail>
      <TextContent>
        <TextType>03</TextType>
        <ContentAudience>00</ContentAudience>
        <Text textformat="03">Une description longue.</Text>
      </TextContent>
    </CollateralDetail>
    <ContentDetail>
      <ContentItem>
        <LevelSequenceNumber>1</LevelSequenceNumber>
        <TextItem><TextItemType>03</TextItemType>
          <TextItemIdentifier>
            <TextItemIDType>06</TextItemIDType><IDValue>10.1234/work.ch1</IDValue>
          </TextItemIdentifier>
        </TextItem>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>04</TitleElementLevel>
            <TitleText language="fre">Premier chapitre</TitleText>
          </TitleElement>
        </TitleDetail>
        <PageRun><FirstPageNumber>1</FirstPageNumber><LastPageNumber>20</LastPageNumber></PageRun>
        <NumberOfPages>20</NumberOfPages>
      </ContentItem>
    </ContentDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <PublishingStatus>16</PublishingStatus>
      <PublishingDate>
        <PublishingDateRole>01</PublishingDateRole>
        <Date dateformat="00">20240807</Date>
      </PublishingDate>
      <PublishingDate>
        <PublishingDateRole>13</PublishingDateRole>
        <Date dateformat="00">20250131</Date>
      </PublishingDate>
    </PublishingDetail>
    <RelatedMaterial>
      <RelatedProduct>
        <ProductRelationCode>06</ProductRelationCode>
        <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
        <ProductIdentifier><ProductIDType>03</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
      </RelatedProduct>
      <RelatedProduct>
        <ProductRelationCode>34</ProductRelationCode>
        <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>http://dx.doi.org/10.1234/cited</IDValue></ProductIdentifier>
      </RelatedProduct>
      <RelatedWork>
        <WorkRelationCode>01</WorkRelationCode>
        <WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier>
      </RelatedWork>
      <RelatedWork>
        <WorkRelationCode>29</WorkRelationCode>
        <WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/original</IDValue></WorkIdentifier>
      </RelatedWork>
    </RelatedMaterial>
  </Product>
</ONIXMessage>`;

const FRONTLIST_PDF_ISBN = '9781802700001';
const HALF_SUPPLIED_PDF_ISBN = '9781802700002';
const PAPERBACK_ISBN = '9781802700003';

/** The supplier's own product page, offered as Supplier Website role 02 by two of the records. */
const SUPPLIER_LANDING_PAGE = 'https://supplier.example.com/book/a-half-supplied-title';

const supplierLandingPageWebsite = `
          <Website>
            <WebsiteRole>02</WebsiteRole>
            <WebsiteLink>${SUPPLIER_LANDING_PAGE}</WebsiteLink>
          </Website>`;

/**
 * Issue #173: sanitized, representative frontlist regressions. Every product carries the
 * publisher's own product page as Website role 02 under PublishingDetail/Publisher — Work
 * metadata — plus a SupplyDetail whose price is still to be announced, as a frontlist record's is, and whose
 * Supplier composite is the only source of Publication Location URLs. `supplierWebsites` says which of those the
 * record actually has, and none of these records has a full text URL yet.
 *
 * The fixture exercises the observed failure condition — a canonical Location the Supplier
 * composite cannot complete — but it is not asserted to reproduce the reporting publisher's file:
 * the ProductForm that actually failed, and that record's full ProductSupply/Supplier structure,
 * were never captured. Every ISBN, title and domain below is invented. A digital record names its
 * format with a ProductFormDetail, because a delivery form alone says nothing about what the file is
 * (thoth-app#182).
 *
 * Written out as ONIX so `@5stones/onix` decides the parsed shape, not this test.
 */
const locationProduct = ({
  isbn,
  title,
  productForm,
  productFormDetail,
  publisherPage,
  supplierWebsites = '',
}: {
  isbn: string;
  title: string;
  productForm: string;
  productFormDetail?: string;
  publisherPage: string;
  supplierWebsites?: string;
}) => `
  <Product>
    <RecordReference>${isbn}</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>${productForm}</ProductForm>${
        productFormDetail
          ? `
      <ProductFormDetail>${productFormDetail}</ProductFormDetail>`
          : ''
      }
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">${title}</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>${IMPRINT_NAME}</PublisherName>
        <Website>
          <WebsiteRole>02</WebsiteRole>
          <WebsiteLink>${publisherPage}</WebsiteLink>
        </Website>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20200101</Date></PublishingDate>
    </PublishingDetail>
    <ProductSupply>
      <Market><Territory><RegionsIncluded>WORLD</RegionsIncluded></Territory></Market>
      <SupplyDetail>
        <Supplier>
          <SupplierRole>09</SupplierRole>
          <SupplierName>${IMPRINT_NAME}</SupplierName>${supplierWebsites}
        </Supplier>
        <ProductAvailability>20</ProductAvailability>
        <UnpricedItemType>02</UnpricedItemType>
      </SupplyDetail>
    </ProductSupply>
  </Product>`;

/** The publisher-level role 02 page of each product, i.e. what `Work.landingPage` must keep. */
const PUBLISHER_PAGE_OF: Record<string, string> = {
  [FRONTLIST_PDF_ISBN]: 'https://uolpress.example.com/book/a-representative-frontlist-pdf/',
  [HALF_SUPPLIED_PDF_ISBN]: 'https://uolpress.example.com/book/a-half-supplied-title/',
  [PAPERBACK_ISBN]: 'https://uolpress.example.com/book/a-paperback-title/',
};

/**
 * A PDF with no Supplier Website at all, a PDF whose Supplier offers only a landing page, and a
 * paperback whose Supplier offers only a landing page — the digital-unrepresentable, the
 * digital-partial and the physical-representable arms of the matrix in one file.
 */
const FRONTLIST_LOCATION_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  ${locationProduct({
    isbn: FRONTLIST_PDF_ISBN,
    title: 'Representative Frontlist PDF',
    productForm: 'ED',
    productFormDetail: 'E107',
    publisherPage: PUBLISHER_PAGE_OF[FRONTLIST_PDF_ISBN],
  })}
  ${locationProduct({
    isbn: HALF_SUPPLIED_PDF_ISBN,
    title: 'A Half-Supplied Title',
    productForm: 'ED',
    productFormDetail: 'E107',
    publisherPage: PUBLISHER_PAGE_OF[HALF_SUPPLIED_PDF_ISBN],
    supplierWebsites: supplierLandingPageWebsite,
  })}
  ${locationProduct({
    isbn: PAPERBACK_ISBN,
    title: 'A Paperback Title',
    productForm: 'BC',
    publisherPage: PUBLISHER_PAGE_OF[PAPERBACK_ISBN],
    supplierWebsites: supplierLandingPageWebsite,
  })}
</ONIXMessage>`;

/**
 * thoth-app#219: one PDF record stating everything the task maps - a Work DOI under the approved Work-level identifier
 * beside a generic Product DOI, the publisher's Work landing page, an eligible front cover, and two suppliers with
 * reader-access URLs. THOTH states the Work landing page as its own landing page (the same URL, meaning something else)
 * and INTERNET_ARCHIVE a different one. Every ISBN, DOI and domain is invented.
 */
const RESOURCES_ISBN = '9781802700010';
const RESOURCES_WORK_DOI = '10.1234/resources';
const RESOURCES_PRODUCT_DOI = '10.1234/resources.pdf';
const RESOURCES_WORK_PAGE = 'https://press.example.org/book/resources';
const RESOURCES_COVER = 'https://press.example.org/covers/resources.jpg';
const THOTH_FULL_TEXT = 'https://press.example.org/book/resources.pdf';
const ARCHIVE_LANDING = 'https://archive.example.org/details/resources';
const ARCHIVE_FULL_TEXT = 'https://archive.example.org/download/resources/resources.pdf';

const resourcesWebsite = (role: string, link: string) =>
  `<Website><WebsiteRole>${role}</WebsiteRole><WebsiteLink>${link}</WebsiteLink></Website>`;

const resourcesSupplyDetail = (role: string, name: string, websites: string) => `
      <SupplyDetail>
        <Supplier>
          <SupplierRole>${role}</SupplierRole>
          <SupplierName>${name}</SupplierName>${websites}
        </Supplier>
        <ProductAvailability>20</ProductAvailability>
        <UnpricedItemType>01</UnpricedItemType>
      </SupplyDetail>`;

const resourcesOnix = (archiveWebsites: string) => `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>${RESOURCES_ISBN}</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${RESOURCES_ISBN}</IDValue></ProductIdentifier>
    <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>${RESOURCES_PRODUCT_DOI}</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>ED</ProductForm>
      <ProductFormDetail>E107</ProductFormDetail>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">Resources and Where to Find Them</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
    </DescriptiveDetail>
    <CollateralDetail>
      <SupportingResource>
        <ResourceContentType>01</ResourceContentType>
        <ContentAudience>00</ContentAudience>
        <ResourceMode>03</ResourceMode>
        <ResourceVersion>
          <ResourceForm>01</ResourceForm>
          <ResourceLink>${RESOURCES_COVER}</ResourceLink>
        </ResourceVersion>
      </SupportingResource>
    </CollateralDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>${IMPRINT_NAME}</PublisherName>
        ${resourcesWebsite('02', RESOURCES_WORK_PAGE)}
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20260101</Date></PublishingDate>
    </PublishingDetail>
    <RelatedMaterial>
      <RelatedWork>
        <WorkRelationCode>01</WorkRelationCode>
        <WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>${RESOURCES_WORK_DOI}</IDValue></WorkIdentifier>
      </RelatedWork>
    </RelatedMaterial>
    <ProductSupply>
      <Market><Territory><RegionsIncluded>WORLD</RegionsIncluded></Territory></Market>${resourcesSupplyDetail(
        '09',
        'THOTH',
        resourcesWebsite('02', RESOURCES_WORK_PAGE) + resourcesWebsite('29', THOTH_FULL_TEXT),
      )}${resourcesSupplyDetail('11', 'INTERNET_ARCHIVE', archiveWebsites)}
    </ProductSupply>
  </Product>
</ONIXMessage>`;

/** The fixture as #219 states it: both suppliers give a landing page and a full text URL. */
const RESOURCES_ONIX = resourcesOnix(
  resourcesWebsite('36', ARCHIVE_LANDING) + resourcesWebsite('29', ARCHIVE_FULL_TEXT),
);

const foundations: SeriesEntity = {
  id: FOUNDATIONS_ID,
  name: 'Foundations',
  type: SeriesType.enum.BookSeries,
  issnPrint: '',
  issnDigital: '',
  updatedAt: '',
  imprintId: IMPRINT_ID,
  imprintName: IMPRINT_NAME,
  url: '',
  cfpUrl: '',
  description: '',
  issues: [
    { id: 'issue-1', ordinal: 1, workId: 'w-1', title: 'Existing', seriesId: FOUNDATIONS_ID, coverUrl: '' },
    { id: 'issue-2', ordinal: 2, workId: 'w-2', title: 'Existing', seriesId: FOUNDATIONS_ID, coverUrl: '' },
  ],
};

type MutationCall = { operation: string; variables: Record<string, unknown> };

describe('ONIX bulk import, end to end', () => {
  let graphqlService: GraphqlService;
  let workService: WorkService;
  let seriesService: SeriesService;
  let mutations: MutationCall[];
  let createdWorkCount: number;

  const operationNameOf = (document: unknown) => {
    const [definition] = (document as { definitions: { name?: { value: string } }[] }).definitions;

    return definition.name?.value ?? 'unknown';
  };

  beforeEach(() => {
    mutations = [];
    createdWorkCount = 0;

    graphqlService = {
      query: vi.fn().mockResolvedValue({}),
      mutation: vi.fn(async (document: unknown, variables: Record<string, unknown>) => {
        const operation = operationNameOf(document);
        mutations.push({ operation, variables });

        switch (operation) {
          case 'CreateWork':
            createdWorkCount += 1;
            return { createWork: { workId: `work-${createdWorkCount}`, titles: [] } };
          case 'CreateSeries':
            return { createSeries: { seriesId: CREATED_SERIES_ID } };
          case 'CreateIssue':
            return { createIssue: { issueId: `issue-${mutations.length}` } };
          case 'CreateTitle':
            return { createTitle: { titleId: 'title-1', ...(variables.data as object) } };
          case 'CreateAbstract':
            return { createAbstract: { abstractId: 'abstract-1', ...(variables.data as object) } };
          case 'CreateSubject':
            return { createSubject: { subjectId: `subject-${mutations.length}`, ...(variables.data as object) } };
          case 'CreateContributor':
            return {
              createContributor: { contributorId: `contributor-${mutations.length}`, ...(variables.data as object) },
            };
          case 'CreateContribution':
            return { createContribution: { contributionId: `contribution-${mutations.length}` } };
          case 'CreateBiography':
            return { createBiography: { biographyId: `biography-${mutations.length}`, ...(variables.data as object) } };
          case 'CreateReference':
            return { createReference: { referenceId: 'reference-1', ...(variables.data as object) } };
          case 'CreateLanguage':
            return { createLanguage: { languageId: 'language-1', ...(variables.data as object) } };
          case 'CreatePublication':
            return {
              createPublication: {
                publicationId: 'publication-1',
                ...(variables.data as object),
                work: { titles: [], doi: '', imprint: { publisher: { publisherName: IMPRINT_NAME } } },
                prices: [],
                locations: [],
              },
            };
          case 'CreatePrice':
            return { createPrice: { priceId: `price-${mutations.length}`, ...(variables.data as object) } };
          case 'CreateLocation':
            return { createLocation: { locationId: `location-${mutations.length}`, ...(variables.data as object) } };
          case 'CreateAffiliation':
            return {
              createAffiliation: {
                affiliationId: `affiliation-${mutations.length}`,
                ...(variables.data as object),
                institution: { institutionName: '', ror: '' },
              },
            };
          case 'CreateFunding':
            return {
              createFunding: {
                fundingId: `funding-${mutations.length}`,
                ...(variables.data as object),
                institution: { institutionName: '', ror: '' },
              },
            };
          default:
            return {};
        }
      }),
    } as unknown as GraphqlService;

    seriesService = new SeriesService(graphqlService);

    const contributorService = new ContributorService(graphqlService);

    workService = new WorkService({
      graphqlService,
      fundingService: new FundingService(graphqlService),
      subjectService: new SubjectService(graphqlService),
      contributionService: new ContributionService({
        graphqlService,
        contributorService,
        affiliationService: new AffiliationService(graphqlService),
      }),
      publicationService: new PublicationService({
        graphqlService,
        locationService: new LocationService(graphqlService),
        priceService: new PriceService(graphqlService),
        fileStorage: { uploadWorkCover: vi.fn() } as never,
      }),
      languageService: new LanguageService(graphqlService),
      seriesService,
      referenceService: new ReferenceService(graphqlService),
      titleService: new TitleService(graphqlService),
      abstractService: new AbstractService(graphqlService),
    });
  });

  /** A Thoth holding none of these files' identifiers, so every Work group they describe is a new Work. */
  const noExistingWorks: OnixTargetLookup = {
    findWorks: async () => new Map(),
    getWork: async (workId) => {
      throw new Error(`no exact identifier matched, so no existing Work ${workId} is ever read`);
    },
  };

  /**
   * What XMLParse.tsx does with a message before adapting it: the deterministic source plan, its exact
   * existing targets, and the adapter options naming the Work groups those targets leave new.
   */
  const planUpload = async (xml: ExtendedONIXMessageRoot) => {
    const sourcePlan = planOnixSource(xml);
    const descriptive = reduceOnixDescriptive(xml, sourcePlan);
    const rights = reduceOnixRights(xml, sourcePlan);
    const commercial = reduceOnixCommercial(xml, sourcePlan);
    const salesRights = reduceOnixSalesRights(xml, sourcePlan, { commercial });
    const targets = await resolveOnixTargets(sourcePlan, noExistingWorks, PUBLISHER_ID);

    return {
      targets,
      descriptive,
      rights,
      commercial,
      salesRights,
      options: { sourcePlan, descriptive, adaptGroupKeys: adaptableGroupKeys(sourcePlan, targets, IMPRINTS) },
    };
  };

  type Upload = ImportParseResult & {
    readonly targets: OnixTargetEvidence;
    readonly descriptive: OnixDescriptivePlan;
    readonly rights: OnixRightsPlan;
    readonly commercial: OnixCommercialPlan;
    readonly salesRights: OnixSalesRightsPlan;
    readonly serieses: readonly SeriesEntity[];
  };

  const parseUpload = async (
    serieses: SeriesEntity[],
    onix = ONIX,
    contributorService: unknown = { getContributors: async () => [] },
    institutionService: unknown = { getInstitutions: async () => [] },
  ): Promise<Upload> => {
    // Step 1: what XMLParse.tsx does in the browser before constructing the semantic parser.
    const xml = (await parse(onix)) as ExtendedONIXMessageRoot;
    const { targets, descriptive, rights, commercial, salesRights, options } = await planUpload(xml);

    // Step 2: what XMLParse.tsx does.
    const parser = new XMLParser(
      xml,
      [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
      licenseOptions,
      serieses,
      contributorService as never,
      institutionService as never,
      languageOptions,
      currencyOptions,
      options,
    );

    return { ...(await parser.parse()), targets, descriptive, rights, commercial, salesRights, serieses };
  };

  /**
   * Step 3: the publisher's planning decisions, from which the ONIX resolver builds the only plan the preview
   * shows and the import runs. Every Work in these files is taken as a new Monograph; any other decision a
   * file leaves to the publisher is the test's to state.
   */
  const resolveUpload = (
    { data, targets, descriptive, rights, commercial, salesRights, serieses }: Upload,
    inputs: Partial<OnixPlanInputs> = {},
    /** The publisher's answer to each descriptive finding of a code, when the test gives one. */
    answers: Partial<Record<OnixDescriptiveFindingCode, string>> = {},
  ): { plan: ImportPlan; warnings: readonly ImportIssue[]; sidecar: OnixImportPlanSidecar } => {
    if (data.onix === undefined) throw new Error('the parse produced no ONIX planning state');

    const { sourcePlan, groups } = data.onix;
    const resolveWith = (descriptiveChoices: Record<string, string>) =>
      resolveOnixImportPlan({
        sourcePlan,
        targets,
        inputs: { ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: WorkTypes.enum.Monograph, ...inputs, descriptiveChoices },
        imprints: IMPRINTS,
        descriptive,
        rights,
        commercial,
        salesRights,
        serieses,
        candidatePlan: data.plan,
        adaptation: groups,
      });
    const unanswered = resolveWith(inputs.descriptiveChoices ?? {});
    const resolved = resolveWith({
      ...Object.fromEntries(
        unanswered.sidecar.descriptive.findings.flatMap(({ key, code }) =>
          answers[code] === undefined ? [] : [[key, answers[code] as string]],
        ),
      ),
      ...inputs.descriptiveChoices,
    });

    if (resolved.plan === null) {
      throw new Error(
        `the ONIX plan is blocked: ${resolved.sidecar.blockers.map(({ code, detail }) => `${code}${detail.finding ? `(${String(detail.finding)})` : ''}`).join(', ')}`,
      );
    }

    return { plan: resolved.plan, warnings: resolved.warnings, sidecar: resolved.sidecar };
  };

  const mutationsNamed = (operation: string) => mutations.filter((call) => call.operation === operation);

  it('real ONIX parsing preserves Arc product semantics and coalesces affiliation-free contributors', async () => {
    const xml = (await parse(ARC_CONTRIBUTOR_ONIX)) as ExtendedONIXMessageRoot;
    const products = Array.isArray(xml.ONIXMessage.Product) ? xml.ONIXMessage.Product : [xml.ONIXMessage.Product];
    const getContributors = vi.fn().mockResolvedValue([]);
    const getInstitutions = vi.fn().mockResolvedValue([]);

    // This assertion is deliberately before XMLParser: the library itself has produced two
    // products with contributors, rather than this test constructing its parsed object shape.
    expect(products).toHaveLength(2);
    expect(products.every((item) => item?.DescriptiveDetail?.Contributor !== undefined)).toBe(true);

    const result = await parseUpload([], ARC_CONTRIBUTOR_ONIX, { getContributors }, { getInstitutions });

    expect(result.status).toBe('success');
    expect(result.issues).not.toContainEqual(expect.objectContaining({ code: 'onix.processing_failed' }));

    // The Series Thoth does not hold is created only as the type the publisher chose; ONIX cannot say.
    const { plan } = resolveUpload(result, {}, { SERIES_TYPE_REQUIRED: SeriesType.enum.BookSeries });

    // The TitleType 05 internal title is never imported.
    expect(plan.works.map((work) => work.titles.map(({ title, canonical }) => ({ title, canonical })))).toEqual([
      [{ title: 'A Companion to the Cavendishes', canonical: true }],
      [{ title: 'The Medieval Womb', canonical: true }],
    ]);
    expect(plan.series).toEqual([
      {
        name: 'Arc Companions',
        target: {
          kind: 'proposed',
          series: {
            name: 'Arc Companions',
            type: SeriesType.enum.BookSeries,
            imprintId: IMPRINT_ID,
            issnPrint: '',
            issnDigital: '',
          },
        },
        members: [
          { workId: plan.works[0].id, orderNumber: 1, issueNumber: null },
          { workId: plan.works[1].id, orderNumber: 2, issueNumber: null },
        ],
      },
    ]);
    expect(plan.works.map((work) => work.contributions[0].fullName)).toEqual(['Jane Doe', 'Jane Doe']);
    expect(getContributors).toHaveBeenCalledTimes(1);
    expect(getContributors).toHaveBeenCalledWith('Jane Doe');
    expect(getInstitutions).not.toHaveBeenCalled();
  });

  /**
   * Issue #107 regression, end to end over the real `ContributorService`: the GraphQL transport
   * answers `GetContributors` with matched identities whose latest works carry zero titles or no
   * canonical title. The deprecated `work { title }` projection used to make the backend reject
   * that whole operation, which surfaced as `onix.processing_failed` for a valid file.
   */
  it('parses a valid file whose matched contributors lack usable historical-title metadata', async () => {
    const identity = {
      lastName: 'Hopkins',
      firstName: 'Lisa',
      orcid: null,
      website: null,
      updatedAt: '2024-01-01T00:00:00Z',
    };
    (graphqlService.query as ReturnType<typeof vi.fn>).mockImplementation(async (document: unknown, variables?: unknown) => {
      if (operationNameOf(document) !== 'GetContributors') return {};

      const { filter } = variables as { filter: string };

      if (filter !== 'Lisa Hopkins') return { contributors: [] };

      return {
        contributors: [
          { ...identity, contributorId: 'zero-titles', fullName: filter, contributions: [{ work: { titles: [] } }] },
          {
            ...identity,
            contributorId: 'no-canonical',
            fullName: filter,
            contributions: [{ work: { titles: [{ canonical: false, title: 'Uma Tradução' }] } }],
          },
          {
            ...identity,
            contributorId: 'with-canonical',
            fullName: filter,
            contributions: [
              {
                work: {
                  titles: [
                    { canonical: false, title: 'Not This One' },
                    { canonical: true, title: 'A Canonical Book' },
                  ],
                },
              },
            ],
          },
        ],
      };
    });
    const xml = (await parse(ARC_MULTI_CONTRIBUTOR_ONIX)) as ExtendedONIXMessageRoot;
    const parser = new XMLParser(
      xml,
      [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
      licenseOptions,
      [],
      new ContributorService(graphqlService),
      { getInstitutions: async () => [] } as never,
      languageOptions,
      currencyOptions,
    );

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.issues).not.toContainEqual(expect.objectContaining({ code: 'onix.processing_failed' }));

    const [work] = result.data.plan.works;
    const lisaOptions = Object.values(result.data.contributorsForSelection[work.id]).find(
      (options) => options[0].fullName === 'Lisa Hopkins',
    );
    const createNew = lisaOptions?.find(({ selected }) => selected);

    // The create-new default plus all three matched identities; the hint degrades per candidate
    // instead of the lookup failing for all of them.
    expect(lisaOptions?.map(({ contributorId, lastContribution }) => [contributorId, lastContribution])).toEqual([
      [createNew?.contributorId, ''],
      ['zero-titles', ''],
      ['no-canonical', ''],
      ['with-canonical', 'A Canonical Book'],
    ]);

    // Parsing and lookups stay read-only: nothing was created for this upload.
    expect(mutations).toEqual([]);
  });

  it('still fails the parse when the contributor identity lookup genuinely rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (graphqlService.query as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('502 Bad Gateway'));
    const xml = (await parse(ARC_MULTI_CONTRIBUTOR_ONIX)) as ExtendedONIXMessageRoot;
    const parser = new XMLParser(
      xml,
      [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
      licenseOptions,
      [],
      new ContributorService(graphqlService),
      { getInstitutions: async () => [] } as never,
      languageOptions,
      currencyOptions,
    );

    try {
      const result = await parser.parse();

      // A transport/server failure is not "no matches": the import must not continue into a
      // state where it would offer to create duplicates of contributors it could not see.
      expect(result.status).toBe('failed');
      expect(result.issues).toContainEqual(expect.objectContaining({ code: 'onix.processing_failed' }));
      expect(result.data.plan.works).toEqual([]);
      expect(mutations).toEqual([]);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('uploads, previews, confirms, and creates the missing series with its issues', async () => {
    const result = await parseUpload([foundations]);

    // --- upload + preview -------------------------------------------------
    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    // The plan the resolver builds is the plan the preview shows and the import runs. ONIX cannot say
    // whether the Series Thoth lacks is a book series or a journal, so the publisher says.
    const { plan } = resolveUpload(result, {}, { SERIES_TYPE_REQUIRED: SeriesType.enum.BookSeries });

    expect(plan.works).toHaveLength(4);
    expect(plan.works.map((work) => work.titles[0].title)).toEqual([
      'A Companion to the Cavendishes',
      'The Medieval Womb',
      'Beowulf by All',
      'Trans Histories of the Medieval Book',
    ]);

    // The preview shows one series to be created and one existing series reused.
    expect(
      plan.series.map((group) => ({
        name: group.name,
        willBeCreated: group.target.kind === 'proposed',
        ordinals: group.members.map((member) => member.orderNumber),
      })),
    ).toEqual([
      { name: 'Arc Companions', willBeCreated: true, ordinals: [1, 2, 3] },
      // The publication order the file states, after the two issues Foundations already has.
      { name: 'Foundations', willBeCreated: false, ordinals: [3] },
    ]);

    // Nothing has been written yet: parsing and previewing are side-effect free.
    expect(mutations).toEqual([]);

    // --- confirmation: exactly what PreviewStep hands to the mutation -----
    await workService.bulkCreateWorks(plan);

    // --- created series ---------------------------------------------------
    const createSeriesCalls = mutationsNamed('CreateSeries');

    expect(createSeriesCalls).toHaveLength(1);
    expect(createSeriesCalls[0].variables.data).toMatchObject({
      seriesName: 'Arc Companions',
      imprintId: IMPRINT_ID,
      seriesType: SeriesType.enum.BookSeries,
    });
    // Nothing was invented for fields ONIX does not supply.
    expect(createSeriesCalls[0].variables.data).toMatchObject({
      issnPrint: null,
      issnDigital: null,
      seriesUrl: null,
      seriesCfpUrl: null,
      seriesDescription: null,
    });

    // --- created issues ---------------------------------------------------
    expect(mutationsNamed('CreateWork')).toHaveLength(4);
    expect(mutationsNamed('CreateIssue').map((call) => call.variables.data)).toEqual([
      // The three new-series works all point at the id the API returned for the one series.
      { seriesId: CREATED_SERIES_ID, workId: 'work-1', issueOrdinal: 1 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-2', issueOrdinal: 2 },
      // The existing series keeps its own id and continues its ordinals.
      { seriesId: FOUNDATIONS_ID, workId: 'work-3', issueOrdinal: 3 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-4', issueOrdinal: 3 },
    ]);
  });

  it('imports the work but no series when an ambiguous collection names one Thoth lacks', async () => {
    const result = await parseUpload([foundations], AMBIGUOUS_ONIX);

    // --- upload + preview -------------------------------------------------
    // The file is accepted: a disclosure is not a validation failure.
    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    const { plan, warnings } = resolveUpload(result);

    expect(plan.works.map((work) => work.titles[0].title)).toEqual(['A Companion to the Cavendishes']);

    // An editorial collection is not the publisher's Series: nothing to create, nothing to attach to.
    expect(plan.series).toEqual([]);
    expect(warnings).toContainEqual({
      severity: 'warning',
      code: 'onix.descriptive.disclosure',
      message: expect.stringContaining('Collection type 11 of product 1 (9781641891783) is an editorial or ascribed grouping'),
      source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
    });

    // --- confirmation: the plan is the payload, and warnings are not in it ---
    await workService.bulkCreateWorks(plan);

    expect(mutationsNamed('CreateWork')).toHaveLength(1);
    expect(mutationsNamed('CreateSeries')).toHaveLength(0);
    expect(mutationsNamed('CreateIssue')).toHaveLength(0);
  });

  it('carries ONIX title, locale, sequence and citation fidelity through to the mutations', async () => {
    const result = await parseUpload([foundations], THOTH_SHAPED_ONIX);

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);

    // The plan the resolver builds is the plan the import runs. PublishingStatus 16 has no exact Thoth status.
    const { plan } = resolveUpload(result, {}, { LIFECYCLE_STATUS_REQUIRED: 'WITHDRAWN' });
    const [work] = plan.works;

    // --- what the preview shows --------------------------------------------
    expect(
      work.titles.map(({ title, subtitle, canonical, localeCode }) => [title, subtitle, canonical, localeCode]),
    ).toEqual([
      ['L’Étranger', 'Un roman', true, LocaleCode.Fr],
      ['The Stranger', '', false, LocaleCode.En],
    ]);
    // Thoth writes no `language` on abstract text, so the abstract follows the language of text.
    expect(work.abstracts.map(({ localeCode }) => localeCode)).toEqual([LocaleCode.Fr]);
    // The publication-order sequence, not the alphabetical one that came first.
    expect(plan.series[0].members.map(({ orderNumber }) => orderNumber)).toEqual([7]);
    // The other ISBN of the same book and the translated-from work are not citations.
    expect(work.references.map(({ doi }) => doi)).toEqual(['https://doi.org/10.1234/cited']);

    // --- confirmation -------------------------------------------------------
    await workService.bulkCreateWorks(plan);

    expect(mutationsNamed('CreateTitle').map((call) => call.variables.data)).toEqual([
      expect.objectContaining({
        title: 'L’Étranger',
        subtitle: 'Un roman',
        canonical: true,
        localeCode: LocaleCode.Fr,
      }),
      expect.objectContaining({ title: 'The Stranger', canonical: false, localeCode: LocaleCode.En }),
      // The chapter's own title, created after the work's, in the language its TitleText claims, and the
      // canonical title of its chapter Work.
      expect.objectContaining({ title: 'Premier chapitre', canonical: true, localeCode: LocaleCode.Fr }),
    ]);
    expect(mutationsNamed('CreateIssue').map((call) => call.variables.data)).toEqual([
      { seriesId: FOUNDATIONS_ID, workId: 'work-1', issueOrdinal: 7 },
    ]);
    expect(mutationsNamed('CreateReference').map((call) => call.variables.data)).toEqual([
      expect.objectContaining({ doi: 'https://doi.org/10.1234/cited', referenceOrdinal: 1 }),
    ]);
  });

  it('carries ONIX identifier and date fidelity through to the mutations', async () => {
    const result = await parseUpload([foundations], THOTH_SHAPED_ONIX);

    expect(result.status).toBe('success');
    // The reference DOI arrives in the `dx.doi.org` form and the work's in the bare one; they are
    // different identifiers, and neither spelling is a conflict with anything.
    expect(result.issues).toEqual([]);

    // The plan the resolver builds is the plan the import runs: nothing is reassembled after it.
    const { plan, warnings } = resolveUpload(result, {}, { LIFECYCLE_STATUS_REQUIRED: 'WITHDRAWN' });
    const [work] = plan.works;
    const [chapter] = plan.chapters;

    // --- what the preview shows --------------------------------------------
    // The Work's DOI is its Work identifier; the Product's own DOI is disclosed as not imported.
    expect(work.doi).toBe('https://doi.org/10.1234/work');
    expect(warnings).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'onix.identifier.unrepresentable',
        message: expect.stringContaining('Product DOI "10.1234/work.pb"'),
      }),
    );
    expect(chapter.doi).toBe('https://doi.org/10.1234/work.ch1');
    expect([work.publicationDate, work.withdrawnDate]).toEqual(['2024-08-07', '2025-01-31']);
    expect(work.references.map(({ doi }) => doi)).toEqual(['https://doi.org/10.1234/cited']);

    // The corrected DOI is what the duplicate preflight compares, with no preflight change.
    expect(collectWorkIdentifiers(work)).toContainEqual({ basis: 'doi', value: 'https://doi.org/10.1234/work' });

    // --- confirmation: the plan is the payload ------------------------------
    await workService.bulkCreateWorks(plan);

    expect(JSON.stringify(mutations)).not.toContain('10.1234/work.pb');

    const [createdWork, createdChapter] = mutationsNamed('CreateWork').map((call) => call.variables.data);

    // The mapper's `dayjs` round trip leaves a complete calendar date exactly as it found it —
    // which is the whole reason the parser converts to `YYYY-MM-DD` rather than passing `20240807`
    // on, since `dayjs('2024')` would have become 1 January.
    expect(createdWork).toMatchObject({
      doi: 'https://doi.org/10.1234/work',
      publicationDate: '2024-08-07',
      withdrawnDate: '2025-01-31',
      workStatus: WorkStatuses.enum.Withdrawn,
    });
    expect(createdChapter).toMatchObject({
      doi: 'https://doi.org/10.1234/work.ch1',
      publicationDate: '2024-08-07',
      withdrawnDate: '2025-01-31',
    });
  });

  it('never hands WorkService a withdrawn date the work status cannot hold', async () => {
    // The same record, published rather than withdrawn. `WorkProperties::validate` refuses a
    // withdrawn date on a work that is not out of print, so passing this one on would mean
    // sending a mutation the parser already knew would fail.
    const activeOnix = THOTH_SHAPED_ONIX.replace(
      '<PublishingStatus>16</PublishingStatus>',
      '<PublishingStatus>04</PublishingStatus>',
    );

    const result = await parseUpload([foundations], activeOnix);

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);

    const { plan, warnings } = resolveUpload(result);

    expect(warnings).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'onix.descriptive.disclosure',
        message: expect.stringContaining('Withdrawal date 2025-01-31 of product 1 (9781641891783) cannot be stored for a Work with status ACTIVE'),
      }),
    );
    expect([plan.works[0].publicationDate, plan.works[0].withdrawnDate]).toEqual(['2024-08-07', null]);

    await workService.bulkCreateWorks(plan);

    mutationsNamed('CreateWork').forEach((call) =>
      expect(call.variables.data).toMatchObject({ publicationDate: '2024-08-07', withdrawnDate: null }),
    );
  });

  /**
   * The approved List 27 policy (thoth-app#183) applied to the subject blocks Thoth's exporter writes today. It is
   * not a round-trip claim: 04 is not LCC and B2 is not a custom subject, so neither is imported, and aligning the
   * exporter's schemes is thoth#892's to decide.
   */
  it('applies the approved subject scheme policy to the subject blocks Thoth ONIX emits', async () => {
    const result = await parseUpload([], THOTH_SUBJECT_ROUND_TRIP_ONIX);

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);

    const { plan, warnings } = resolveUpload(result);

    expect(plan.works[0].subjects.map(({ type, code }) => ({ type, code }))).toEqual([
      { type: SubjectTypes.enum.Bic, code: 'AAB' },
      { type: SubjectTypes.enum.Bisac, code: 'AAA000000' },
      { type: SubjectTypes.enum.Thema, code: 'ATXZ1' },
      { type: SubjectTypes.enum.Keyword, code: 'keyword1' },
    ]);
    expect(warnings.map(({ message }) => message)).toEqual(
      expect.arrayContaining([expect.stringContaining('04'), expect.stringContaining('B2')]),
    );
  });

  it('imports Arc markup as the format it really is, all the way to the mutations', async () => {
    // The production failure this hotfix exists for. Parsed by the real @5stones/onix, so the
    // textformat attributes take the exact runtime shape the importer sees.
    const xml = (await parse(ARC_MARKUP_ONIX)) as ExtendedONIXMessageRoot;
    const firstProduct = toOnixArray(xml.ONIXMessage.Product)[0];
    const parsedSubjects = toOnixArray(firstProduct?.DescriptiveDetail?.Subject);
    const wrappedThema = parsedSubjects.find(
      (subject) => subject && subject.SubjectSchemeIdentifier === '93' && typeof subject.SubjectCode === 'object',
    );
    const getContributors = vi.fn().mockResolvedValue([]);
    const getInstitutions = vi.fn().mockResolvedValue([]);
    const { targets, descriptive, rights, commercial, salesRights, options } = await planUpload(xml);
    const parser = new XMLParser(
      xml,
      [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
      licenseOptions,
      [],
      { getContributors } as never,
      { getInstitutions } as never,
      languageOptions,
      currencyOptions,
      options,
    );

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    expect(wrappedThema?.SubjectCode).toMatchObject({ '#text': 'DSBD', '@_textscript': 'Latn' });
    expect(wrappedThema?.SubjectHeadingText).toMatchObject({
      '#text': 'Literary studies: c 1600 to c 1800',
      '@_language': 'eng',
    });

    // The main subject of each scheme declares a version no pinned vocabulary covers, so it is not imported, and
    // the publisher confirms that the first remaining subject of each scheme is primary.
    const { plan, warnings } = resolveUpload(
      { ...result, targets, descriptive, rights, commercial, salesRights, serieses: [] },
      {},
      { SERIES_TYPE_REQUIRED: SeriesType.enum.BookSeries, SUBJECT_PRIMARY_REQUIRED: 'FIRST_SOURCE_SUBJECT' },
    );

    // --- what the preview shows: works in source order, titles intact -------
    expect(plan.works.map((work) => work.titles[0].title)).toEqual([
      'A Companion to the Cavendishes',
      'The Medieval Womb',
    ]);
    expect(plan.series.map((group) => ({ name: group.name, kind: group.target.kind }))).toEqual([
      { name: 'Arc Companions', kind: 'proposed' },
    ]);
    // Ordinals are per subject type, and a keyword list is one keyword per item.
    expect(plan.works[0].subjects.map(({ type, code, ordinal }) => ({ type, code, ordinal }))).toEqual([
      { type: SubjectTypes.enum.Bisac, code: 'HIS037020', ordinal: 1 },
      { type: SubjectTypes.enum.Bic, code: 'HBLH', ordinal: 1 },
      { type: SubjectTypes.enum.Thema, code: 'NHDL', ordinal: 1 },
      { type: SubjectTypes.enum.Keyword, code: 'literary culture', ordinal: 1 },
      { type: SubjectTypes.enum.Keyword, code: 'aristocratic life', ordinal: 2 },
      { type: SubjectTypes.enum.Keyword, code: 'women’s writing', ordinal: 3 },
      { type: SubjectTypes.enum.Keyword, code: 'closet drama', ordinal: 4 },
      { type: SubjectTypes.enum.Keyword, code: 'iconography', ordinal: 5 },
    ]);
    expect(warnings.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('declare scheme version "2016"'),
        expect.stringContaining('declare scheme version "2.1"'),
        expect.stringContaining('declare scheme version "1.3"'),
      ]),
    );

    // --- creation intent: the resolved format is in the plan itself ---------
    expect(plan.works[0].abstracts.map(({ content, sourceMarkupFormat }) => [content, sourceMarkupFormat])).toEqual([
      ['<p>The <em>A Companion to the Cavendishes</em> volume surveys the family.</p>', MarkupFormat.Html],
    ]);
    expect(
      plan.works[0].contributions[0].biographies.map(({ content, sourceMarkupFormat }) => [
        content,
        sourceMarkupFormat,
      ]),
    ).toEqual([
      ['Lisa Hopkins is Professor Emerita of English and co-editor of <I>Shakespeare</I>.', MarkupFormat.Html],
    ]);
    expect(plan.works[1].abstracts.map(({ sourceMarkupFormat }) => sourceMarkupFormat)).toEqual([
      MarkupFormat.PlainText,
      MarkupFormat.PlainText,
    ]);

    // --- #73 regressions: lookups still coalesced, no institution lookup ----
    expect(getContributors).toHaveBeenCalledTimes(1);
    expect(getContributors).toHaveBeenCalledWith('Lisa Hopkins');
    expect(getInstitutions).not.toHaveBeenCalled();

    // --- confirmation: the formats the API is actually told -----------------
    await workService.bulkCreateWorks(plan);

    const abstractCalls = mutationsNamed('CreateAbstract').map((call) => ({
      content: (call.variables.data as { content: string }).content,
      markupFormat: call.variables.markupFormat,
    }));

    expect(abstractCalls).toEqual([
      {
        content: '<p>The <em>A Companion to the Cavendishes</em> volume surveys the family.</p>',
        markupFormat: MarkupFormat.Html,
      },
      { content: 'A study of medieval medicine and the maternal body.', markupFormat: MarkupFormat.PlainText },
      { content: 'A study of medieval medicine.', markupFormat: MarkupFormat.PlainText },
    ]);
    // The Arc abstract is never again declared JATS: that claim is exactly what failed with
    // "Unsupported JATS element: <em>".
    expect(abstractCalls.filter(({ markupFormat }) => markupFormat === MarkupFormat.JatsXml)).toEqual([]);

    const biographyCalls = mutationsNamed('CreateBiography').map((call) => ({
      content: (call.variables.data as { content: string }).content,
      markupFormat: call.variables.markupFormat,
    }));

    expect(biographyCalls).toEqual([
      {
        content: 'Lisa Hopkins is Professor Emerita of English and co-editor of <I>Shakespeare</I>.',
        markupFormat: MarkupFormat.Html,
      },
    ]);
    expect(biographyCalls.filter(({ markupFormat }) => markupFormat !== MarkupFormat.Html)).toEqual([]);

    const subjectCalls = mutationsNamed('CreateSubject').map((call) => call.variables.data as Record<string, unknown>);

    expect(subjectCalls.map(({ subjectType, subjectCode, subjectOrdinal }) => [subjectType, subjectCode, subjectOrdinal])).toEqual([
      [SubjectTypes.enum.Bisac, 'HIS037020', 1],
      [SubjectTypes.enum.Bic, 'HBLH', 1],
      [SubjectTypes.enum.Thema, 'NHDL', 1],
      [SubjectTypes.enum.Keyword, 'literary culture', 1],
      [SubjectTypes.enum.Keyword, 'aristocratic life', 2],
      [SubjectTypes.enum.Keyword, 'women’s writing', 3],
      [SubjectTypes.enum.Keyword, 'closet drama', 4],
      [SubjectTypes.enum.Keyword, 'iconography', 5],
    ]);
    expect(subjectCalls.map(({ subjectCode }) => subjectCode)).not.toEqual(
      expect.arrayContaining([
        'Literary studies: c 1600 to c 1800',
        'Literary studies: c 1500 to c 1800',
        'LITERARY CRITICISM / Women Authors',
        'European history: Renaissance',
      ]),
    );

    // Source order survived to the mutations: titles are created per work, in plan order.
    expect(mutationsNamed('CreateWork')).toHaveLength(2);
    expect(mutationsNamed('CreateTitle').map((call) => (call.variables.data as { title: string }).title)).toEqual([
      'A Companion to the Cavendishes',
      'The Medieval Womb',
    ]);
  });

  it('normalises the Arc spacer abstract and biography before the mutations, keeping both HTML', async () => {
    // Product 9781802700596, the production failure: the CREATE_ABSTRACT the API actually receives
    // must be the meaningful paragraph as HTML, with the empty spacer paragraph and its <br> gone.
    const result = await parseUpload([], arcSpacerOnix());

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);

    const { plan } = resolveUpload(result);
    expect(plan.works[0].abstracts.map(({ content, sourceMarkupFormat }) => [content, sourceMarkupFormat])).toEqual([
      ['<p>This book examines how the military orders gave rise to a new sacred landscape.</p>', MarkupFormat.Html],
    ]);

    await workService.bulkCreateWorks(plan);

    const abstractCalls = mutationsNamed('CreateAbstract').map((call) => ({
      content: (call.variables.data as { content: string }).content,
      markupFormat: call.variables.markupFormat,
    }));

    expect(abstractCalls).toEqual([
      {
        content: '<p>This book examines how the military orders gave rise to a new sacred landscape.</p>',
        markupFormat: MarkupFormat.Html,
      },
    ]);

    // Assert at the mutation boundary that the spacer, its line break and any empty paragraph are
    // all gone — an approximate UI check would not prove the API is safe.
    const [{ content }] = abstractCalls;
    expect(content).not.toContain('<br');
    expect(content).not.toContain('text-align:justify');
    expect(content).not.toContain('<p></p>');

    const biographyCalls = mutationsNamed('CreateBiography').map((call) => ({
      content: (call.variables.data as { content: string }).content,
      markupFormat: call.variables.markupFormat,
    }));

    expect(biographyCalls).toEqual([
      { content: '<p>Gregory Leighton earned his PhD in History.</p>', markupFormat: MarkupFormat.Html },
    ]);
  });

  it('normalises a meaningful-line-break abstract through real ONIX parsing and into the mutation', async () => {
    const result = await parseUpload([], arcSpacerOnix('&lt;p&gt;Hello&lt;br&gt;world&lt;/p&gt;'));

    expect(result.status).toBe('success');
    expect(result.issues).not.toContainEqual(
      expect.objectContaining({ code: 'onix.text.unrepresentable_structure' }),
    );
    expect(result.data.plan.works[0].abstracts.map(({ content }) => content)).toEqual([
      '<p>Hello</p><p>world</p>',
    ]);

    await workService.bulkCreateWorks(resolveUpload(result).plan);

    expect(mutationsNamed('CreateAbstract').map((call) => (call.variables.data as { content: string }).content)).toEqual([
      '<p>Hello</p><p>world</p>',
    ]);
  });

  it('imports the wrapped tagless Arc abstract of product 9781942401353 as collapsed plain text', async () => {
    // Production product 8, the run's next blocker after #100: an abstract declared HTML with no
    // tags, wrapped across physical source lines. The newlines are HTML formatting whitespace, not
    // line breaks, so they collapse to spaces — and nothing else about the prose changes.
    const result = await parseUpload([], ARC_PRODUCT_8_ONIX);

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);

    // Parsing and previewing mutate nothing, whatever the plan holds.
    expect(mutations).toEqual([]);

    const [work] = result.data.plan.works;
    const [longAbstract, shortAbstract] = work.abstracts;

    expect(longAbstract.sourceMarkupFormat).toBe(MarkupFormat.PlainText);
    expect(longAbstract.content).toBe(ARC_PRODUCT_8_COLLAPSED_ABSTRACT);
    // No physical source newline survives into the plan.
    expect(longAbstract.content).not.toMatch(/[\r\n]/);

    // The short abstract is real HTML and keeps its raw NBSP; the long abstract keeps its en dash.
    expect(shortAbstract.sourceMarkupFormat).toBe(MarkupFormat.Html);
    expect(shortAbstract.content).toContain('OAPEN.\u00A0This book');
    expect(longAbstract.content).toContain('2012\u201316');

    // Both textformat="06" biographies are single-line plain text and pass the new guard untouched. The
    // affiliations name no ROR and no Thoth institution's name matches them, so the publisher imports none.
    const [product8] = result.data.onix?.sourcePlan.products ?? [];
    const { plan } = resolveUpload(
      result,
      { manifestationChoices: { [product8.productKey]: PublicationType.enum.Pdf } },
      { CONTRIBUTOR_AFFILIATION_UNIDENTIFIED: 'OMIT', SERIES_TYPE_REQUIRED: SeriesType.enum.BookSeries },
    );
    const biographies = plan.works[0].contributions.flatMap((contribution) => contribution.biographies);
    expect(biographies.map(({ sourceMarkupFormat }) => sourceMarkupFormat)).toEqual([
      MarkupFormat.PlainText,
      MarkupFormat.PlainText,
    ]);
  });

  it('creates the Work of product 9781942401353 with the one licence its canonical rights reduction takes (#211)', async () => {
    // A single digital manifestation stating one supported licence, with no date or constraint, stands for its Work.
    const result = await parseUpload([], ARC_PRODUCT_8_ONIX);
    const [product8] = result.data.onix?.sourcePlan.products ?? [];

    expect(result.data.plan.works[0].license).toBe('');
    expect(result.rights.groups[product8.groupKey].licence).toMatchObject({
      kind: 'SET_SUPPORTED_LICENSE',
      url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    });

    await workService.bulkCreateWorks(
      resolveUpload(
        result,
        { manifestationChoices: { [product8.productKey]: PublicationType.enum.Pdf } },
        { CONTRIBUTOR_AFFILIATION_UNIDENTIFIED: 'OMIT', SERIES_TYPE_REQUIRED: SeriesType.enum.BookSeries },
      ).plan,
    );

    expect(
      mutationsNamed('CreateWork').map(({ variables }) => (variables.data as { license: unknown }).license),
    ).toEqual(['https://creativecommons.org/licenses/by-nc-nd/4.0/']);
  });

  it('sends product 9781942401353 to CREATE_ABSTRACT as the collapsed one-line plain text', async () => {
    // The mutation boundary itself: what the API would actually receive, not just the plan.
    const result = await parseUpload([], ARC_PRODUCT_8_ONIX);
    // The record's ProductForm ED is a delivery form that names no file format, so the publisher says
    // which Publication it is (thoth-app#182); the abstracts under test do not depend on the answer.
    const [product8] = result.data.onix?.sourcePlan.products ?? [];

    await workService.bulkCreateWorks(
      resolveUpload(
        result,
        { manifestationChoices: { [product8.productKey]: PublicationType.enum.Pdf } },
        { CONTRIBUTOR_AFFILIATION_UNIDENTIFIED: 'OMIT', SERIES_TYPE_REQUIRED: SeriesType.enum.BookSeries },
      ).plan,
    );

    const abstractCalls = mutationsNamed('CreateAbstract').map((call) => ({
      content: (call.variables.data as { content: string }).content,
      markupFormat: call.variables.markupFormat,
    }));

    expect(abstractCalls).toEqual([
      { content: ARC_PRODUCT_8_COLLAPSED_ABSTRACT, markupFormat: MarkupFormat.PlainText },
      {
        content:
          '<p>This book is Open Access and available from OAPEN.\u00A0This book presents interdisciplinary ' +
          'approaches to the examination and documentation of material cultural heritage, using non-invasive ' +
          'spatial and spectral optical technologies.</p>',
        markupFormat: MarkupFormat.Html,
      },
    ]);

    const biographyCalls = mutationsNamed('CreateBiography')
      .map((call) => ({
        content: (call.variables.data as { content: string }).content,
        markupFormat: call.variables.markupFormat,
      }))
      .sort((a, b) => a.content.localeCompare(b.content));

    expect(biographyCalls).toEqual([
      {
        content:
          'Anna Bentkowska-Kafel is an art historian with a special interest in the use of 3D electronic imaging ' +
          'in documentation and scholarly interpretation of art.',
        markupFormat: MarkupFormat.PlainText,
      },
      {
        content:
          'Lindsay MacDonald, Research Associate in the Faculty of Engineering Science, University College London, ' +
          'is a colour scientist specializing in imaging applications',
        markupFormat: MarkupFormat.PlainText,
      },
    ]);
  });

  it('blocks an unrepresentable plain-text line break in preview, so no mutation ever runs', async () => {
    // The plain-text twin of the meaningful-<br> guarantee: under a non-HTML declaration a single
    // newline is a deliberate line break Thoth cannot represent, and it must be discovered before
    // bulkCreateWorks — never as a failed CREATE_ABSTRACT after seven works already exist.
    const brokenOnix = ARC_PRODUCT_8_ONIX.replace(
      /<Text textformat="02" language="eng">In this unique collection[\s\S]*?<\/Text>/,
      '<Text textformat="06" language="eng">Line one\nLine two</Text>',
    );

    const result = await parseUpload([], brokenOnix);

    expect(result.status).toBe('failed');
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'onix.text.unrepresentable_structure',
        source: { kind: 'onix', productIndex: 1, recordReference: '9781942401353' },
      }),
    );
    expect(result.data.plan.works).toEqual([]);

    await workService.bulkCreateWorks(result.data.plan);

    // Zero side effects, not merely an eventual error message.
    expect(mutationsNamed('CreateWork')).toEqual([]);
    expect(mutationsNamed('CreateAbstract')).toEqual([]);
    expect(mutationsNamed('CreateContributor')).toEqual([]);
    expect(mutationsNamed('CreateBiography')).toEqual([]);
    expect(mutations).toEqual([]);
  });

  it('still reads Thoth’s own exported JATS back as JATS', async () => {
    // Thoth's ONIX exporter writes stored JATS under textformat="03". A structured abstract
    // that was accepted before this change must keep reaching the API as JATS_XML.
    const thothJatsOnix = THOTH_SHAPED_ONIX.replace(
      '<Text textformat="03">Une description longue.</Text>',
      '<Text textformat="03">&lt;p&gt;Une &lt;italic&gt;description&lt;/italic&gt; longue.&lt;/p&gt;</Text>',
    );

    const result = await parseUpload([foundations], thothJatsOnix);

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].abstracts[0].sourceMarkupFormat).toBe(MarkupFormat.JatsXml);

    await workService.bulkCreateWorks(resolveUpload(result, {}, { LIFECYCLE_STATUS_REQUIRED: 'WITHDRAWN' }).plan);

    expect(
      mutationsNamed('CreateAbstract').map((call) => ({
        content: (call.variables.data as { content: string }).content,
        markupFormat: call.variables.markupFormat,
      })),
    ).toEqual([{ content: '<p>Une <italic>description</italic> longue.</p>', markupFormat: MarkupFormat.JatsXml }]);
  });

  it('sends Thoth’s plain textformat-03 abstracts as plain text, exactly as before', async () => {
    // The unstructured variant of the round trip: markup-free content is the same text in
    // every input format, and the API's HTML path would refuse it, so it stays PLAIN_TEXT.
    const result = await parseUpload([foundations], THOTH_SHAPED_ONIX);

    await workService.bulkCreateWorks(resolveUpload(result, {}, { LIFECYCLE_STATUS_REQUIRED: 'WITHDRAWN' }).plan);

    expect(
      mutationsNamed('CreateAbstract').map((call) => ({
        content: (call.variables.data as { content: string }).content,
        markupFormat: call.variables.markupFormat,
      })),
    ).toEqual([{ content: 'Une description longue.', markupFormat: MarkupFormat.PlainText }]);
  });

  it('a fresh parse reuses a series created by an earlier run', async () => {
    // Scope: this covers SERIES resolution only. It does not show that a repeated import is
    // idempotent — bulkCreateWorks calls createWork unconditionally and Thoth does not
    // deduplicate works, so re-running this file would create every work again. Work identity
    // is deliberately out of scope here.
    //
    // The fresh parse sees the series list refreshed by useBulkCreateWorks' onSettled
    // invalidation, including the allUserSerieses key the importer actually reads.
    const arcCompanions: SeriesEntity = {
      ...foundations,
      id: CREATED_SERIES_ID,
      name: 'Arc Companions',
      issues: [],
    };

    const result = await parseUpload([foundations, arcCompanions]);
    const { plan } = resolveUpload(result);

    expect(plan.series.map((group) => group.target.kind)).toEqual(['existing', 'existing']);

    await workService.bulkCreateWorks(plan);

    expect(mutationsNamed('CreateSeries')).toHaveLength(0);
    // Works are still created unconditionally: series reuse is not work idempotence.
    expect(mutationsNamed('CreateWork')).toHaveLength(4);
    expect(mutationsNamed('CreateIssue').map((call) => call.variables.data)).toEqual([
      { seriesId: CREATED_SERIES_ID, workId: 'work-1', issueOrdinal: 1 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-2', issueOrdinal: 2 },
      { seriesId: FOUNDATIONS_ID, workId: 'work-3', issueOrdinal: 3 },
      { seriesId: CREATED_SERIES_ID, workId: 'work-4', issueOrdinal: 3 },
    ]);
  });

  describe('two contributors on one Arc work', () => {
    type ContributionVariables = { fullName: string; contributorId: string; contributionOrdinal: number };

    const parseArc = async (getContributors: (name: string) => Promise<unknown[]>): Promise<Upload> => {
      const xml = (await parse(ARC_MULTI_CONTRIBUTOR_ONIX)) as ExtendedONIXMessageRoot;
      const { targets, descriptive, rights, commercial, salesRights, options } = await planUpload(xml);
      const parser = new XMLParser(
        xml,
        [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
        licenseOptions,
        [],
        { getContributors } as never,
        { getInstitutions: async () => [] } as never,
        languageOptions,
        currencyOptions,
        options,
      );

      return { ...(await parser.parse()), targets, descriptive, rights, commercial, salesRights, serieses: [] };
    };

    /** The Arc series is not in Thoth: the publisher says it is a book series. */
    const resolveArc = (result: Upload) => resolveUpload(result, {}, { SERIES_TYPE_REQUIRED: SeriesType.enum.BookSeries });

    const contributionVariables = () =>
      mutationsNamed('CreateContribution').map((call) => call.variables.data as ContributionVariables);

    const ordinalByName = (variables: ContributionVariables[], fullName: string) =>
      variables.find((variable) => variable.fullName === fullName)?.contributionOrdinal;

    it('parses Lisa and Tom with distinct, contiguous ordinals and keeps the Arc regressions', async () => {
      const getContributors = vi.fn().mockResolvedValue([]);
      const result = await parseArc(getContributors);

      expect(result.status).toBe('success');
      // No sequence fallback: both authors carry usable, unique SequenceNumbers.
      expect(result.issues.filter((issue) => issue.code === 'onix.contributor.sequence_fallback')).toEqual([]);

      const { plan } = resolveArc(result);
      const [work] = plan.works;

      // The ordinal fix itself.
      expect(work.contributions.map(({ fullName, orderNumber }) => [fullName, orderNumber])).toEqual([
        ['Lisa Hopkins', 1],
        ['Tom Rutter', 2],
      ]);
      const ordinals = work.contributions.map(({ orderNumber }) => orderNumber);
      expect(new Set(ordinals).size).toBe(ordinals.length);
      expect(ordinals).not.toEqual([1, 1]);

      // Arc regressions in the same fixture: distinctive title without its prefix logic tripping,
      // the TitleType 05 internal title excluded, controlled subject codes from SubjectCode, the
      // publisher series proposed, and the contradictory textformat="06" biography routed as HTML.
      expect(work.titles.map(({ title, canonical }) => [title, canonical])).toEqual([
        ['A Companion to the Cavendishes', true],
      ]);
      expect(work.subjects.map(({ type, code }) => ({ type, code }))).toEqual([
        { type: SubjectTypes.enum.Bisac, code: 'LIT004290' },
        { type: SubjectTypes.enum.Thema, code: 'DSBD' },
      ]);
      expect(plan.series.map((group) => ({ name: group.name, kind: group.target.kind }))).toEqual([
        { name: 'Arc Companions', kind: 'proposed' },
      ]);
      expect(
        work.contributions[0].biographies.map(({ content, sourceMarkupFormat }) => [content, sourceMarkupFormat]),
      ).toEqual([['Lisa Hopkins is co-editor of <I>Shakespeare</I>.', MarkupFormat.Html]]);
      // No ROR anywhere, so no institution lookup was provoked.
      expect(getContributors).toHaveBeenCalledTimes(2);
    });

    it('sends CREATE_CONTRIBUTION ordinals 1 and 2, never 1 and 1', async () => {
      await parseArc(async () => []).then((result) => workService.bulkCreateWorks(resolveArc(result).plan));

      const variables = contributionVariables();

      expect(variables).toHaveLength(2);
      // Asserted by contributor identity, not by asynchronous call-completion order.
      expect(ordinalByName(variables, 'Lisa Hopkins')).toBe(1);
      expect(ordinalByName(variables, 'Tom Rutter')).toBe(2);

      const ordinals = variables.map(({ contributionOrdinal }) => contributionOrdinal);
      // The exact collision the API rejected with "A contribution with this ordinal number
      // already exists" is now impossible for this work.
      expect([...ordinals].sort((a, b) => a - b)).toEqual([1, 2]);
      expect(ordinals).not.toEqual([1, 1]);
      expect(ordinals.every((ordinal) => ordinal >= 1)).toBe(true);
      expect(new Set(ordinals).size).toBe(ordinals.length);
    });

    it('keeps the ordinals when the user picks an existing record for the second contributor', async () => {
      const existingTom = {
        id: 'existing-tom',
        name: 'Tom Rutter',
        fullName: 'Tom Rutter',
        firstName: 'Tom',
        lastName: 'Rutter',
        orcid: '',
        website: '',
        updatedAt: '',
        lastContributionTitle: 'An earlier book',
      };
      const result = await parseArc(async (name: string) => (name === 'Tom Rutter' ? [existingTom] : []));

      // Mirror ContributorsSelection for an ONIX plan: the chosen identity replaces who Tom's planned
      // contributions point at, and nothing else about them.
      const { plan } = resolveArc(result);
      const [work] = plan.works;
      const tomItem = Object.values(result.data.contributorsForSelection[work.id]).find(
        (options) => options[0].fullName === 'Tom Rutter',
      );
      const chosenTom = tomItem?.find((option) => option.contributorId === 'existing-tom');
      // Both of Tom's options carry ordinal 2 — the ordinal is fixed before identity is chosen.
      expect(tomItem?.map(({ orderNumber }) => orderNumber)).toEqual([2, 2]);
      const selectedPlan = {
        ...plan,
        works: [
          {
            ...work,
            contributions: work.contributions.map((contribution) =>
              contribution.fullName === 'Tom Rutter'
                ? { ...contribution, contributorId: chosenTom!.contributorId, fullName: chosenTom!.fullName }
                : contribution,
            ),
          },
        ],
      };

      await workService.bulkCreateWorks(selectedPlan);

      const variables = contributionVariables();

      expect(ordinalByName(variables, 'Lisa Hopkins')).toBe(1);
      expect(ordinalByName(variables, 'Tom Rutter')).toBe(2);
      // Tom reached the mutation as the chosen existing contributor, not a freshly created one.
      expect(variables.find((variable) => variable.fullName === 'Tom Rutter')?.contributorId).toBe('existing-tom');
      const ordinals = variables.map(({ contributionOrdinal }) => contributionOrdinal);
      expect([...ordinals].sort((a, b) => a - b)).toEqual([1, 2]);
    });
  });

  /**
   * The ORCID representation an uploaded ONIX file is allowed to use, carried the whole way to
   * the mutation.
   *
   * ONIX's normal encoding of an ORCID is the bare sixteen characters, while Thoth stores and its
   * API accepts the hyphenated form behind the resolver prefix. Every step between the two is
   * real here — `@5stones/onix` parses the XML, `XMLParser` plans it, `WorkService` executes the
   * plan — because the conversion is only worth anything if it survives all of them. The adapter
   * unit tests hand `selectOnixOrcid` a composite that was never parsed from anything, so they
   * cannot see what the parser does to sixteen leading-zero-bearing digits on the way in.
   */
  describe('ORCID representation from real XML to the mutation', () => {
    const ORCID = '0000-0001-6365-5189';
    const HYPHENLESS_ORCID = '0000000163655189';
    const STORED_ORCID = `https://orcid.org/${ORCID}`;

    const importOnix = async (onix: string) => {
      const result = await parseUpload([], onix);

      expect(result.status).toBe('success');

      const { plan } = resolveUpload(result);

      await workService.bulkCreateWorks(plan);

      return plan;
    };

    const createdContributorOrcids = () =>
      mutationsNamed('CreateContributor').map((call) => (call.variables.data as { orcid: string | null }).orcid);

    it('sends a hyphenless ONIX ORCID to CreateContributor in the form Thoth stores', async () => {
      const plan = await importOnix(orcidContributorOnix(HYPHENLESS_ORCID));

      // Planned bare and hyphenated, then prefixed by the existing mapper exactly as it always
      // has been. Neither step may leave the ONIX encoding, which the ORCID unique index and the
      // API's own parser would both read as a different identifier.
      expect(plan.works[0].contributions[0].orcidId).toBe(ORCID);
      expect(createdContributorOrcids()).toEqual([STORED_ORCID]);
    });

    it('sends an already-hyphenated ONIX ORCID unchanged', async () => {
      const plan = await importOnix(orcidContributorOnix(ORCID));

      expect(plan.works[0].contributions[0].orcidId).toBe(ORCID);
      expect(createdContributorOrcids()).toEqual([STORED_ORCID]);
    });

    it('creates no ORCID at all for an ORCID-shaped value declared under another scheme', async () => {
      // NameIDType 01 is a proprietary key: the file says this is not an ORCID, and that
      // declaration outranks the fact that it is shaped like one.
      const plan = await importOnix(orcidContributorOnix(HYPHENLESS_ORCID, '01'));

      expect(plan.works[0].contributions[0].orcidId).toBe('');
      expect(createdContributorOrcids()).toEqual([null]);
    });
  });

  /**
   * Issue #173, end to end. A frontlist file whose Publications have no full text URL yet used to
   * plan a canonical `('', '')` Location, which thoth-api rejects — and because bulk import is not
   * atomic, that rejection landed after other records had already been created. The plan must now
   * carry the Work landing page and the Publication while sending no Location mutation at all.
   */
  describe('frontlist Publications with no representable Supplier Location (issue #173)', () => {
    /** The resolver reports the Location warnings of the Publications it plans, with its other warnings. */
    const unrepresentableWarnings = (warnings: readonly ImportIssue[]) =>
      warnings.filter((issue) => issue.code === 'onix.location.unrepresentable_canonical');

    /** The same warnings, narrowed to one product. The parser numbers products from one. */
    const unrepresentableWarningsFor = (warnings: readonly ImportIssue[], productIndex: number) =>
      unrepresentableWarnings(warnings).filter(
        (issue) => issue.source.kind === 'onix' && issue.source.productIndex === productIndex,
      );

    it('plans the Work landing page and the Publication, but no Location, for a frontlist PDF', async () => {
      const result = await parseUpload([], FRONTLIST_LOCATION_ONIX);
      const { plan, warnings } = resolveUpload(result);
      const [frontlistPdf] = plan.works;

      expect(result.status).toBe('success');
      expect(result.issues.filter(({ severity }) => severity === 'error')).toEqual([]);

      // The publisher-level Website role 02 is Work metadata and survives untouched...
      expect(frontlistPdf.landingPage).toBe(PUBLISHER_PAGE_OF[FRONTLIST_PDF_ISBN]);
      // ...while the Publication itself is planned with no Location to fail on.
      expect(frontlistPdf.publications).toHaveLength(1);
      expect(frontlistPdf.publications[0].type).toBe(PublicationType.enum.Pdf);
      expect(frontlistPdf.publications[0].locations).toEqual([]);
      // Nothing was supplied, so nothing was lost and nothing is warned about for this product.
      expect(unrepresentableWarningsFor(warnings, 1)).toHaveLength(0);
    });

    it('warns once, without blocking, for the digital record that supplied only a landing page', async () => {
      const result = await parseUpload([], FRONTLIST_LOCATION_ONIX);
      const { plan, warnings } = resolveUpload(result);
      const halfSupplied = plan.works[1];

      expect(result.status).toBe('success');
      expect(halfSupplied.publications[0].locations).toEqual([]);
      expect(unrepresentableWarnings(warnings)).toEqual([
        {
          severity: 'warning',
          code: 'onix.location.unrepresentable_canonical',
          message: expect.stringContaining('no full text URL was supplied'),
          source: { kind: 'onix', productIndex: 2, recordReference: HALF_SUPPLIED_PDF_ISBN },
        },
      ]);
    });

    it('still plans the physical record’s one-URL canonical Location', async () => {
      const paperback = resolveUpload(await parseUpload([], FRONTLIST_LOCATION_ONIX)).plan.works[2];

      expect(paperback.publications[0].type).toBe(PublicationType.enum.Paperback);
      expect(paperback.publications[0].locations).toEqual([
        {
          id: appConfig.defaultId,
          canonical: true,
          landingPage: SUPPLIER_LANDING_PAGE,
          fullTextUrl: '',
          // The Supplier states it as the publisher's website for the work (WebsiteRole 02); the Market's WORLD is
          // geography, and never a platform (thoth-app#215).
          locationPlatform: LocationPlatforms.enum.PublisherWebsite,
        },
      ]);
    });

    it('sends CreateLocation only for the physical record, and CreateWork for all three', async () => {
      const result = await parseUpload([], FRONTLIST_LOCATION_ONIX);

      await workService.bulkCreateWorks(resolveUpload(result).plan);

      expect(mutationsNamed('CreateWork')).toHaveLength(3);
      expect(mutationsNamed('CreatePublication')).toHaveLength(3);
      // The whole point: no `('', '')` Location, and no half-supplied digital one, ever reaches
      // the API — so the import cannot fail partway through on Location completeness.
      expect(
        mutationsNamed('CreateLocation').map((call) => {
          const { landingPage, fullTextUrl, canonical } = call.variables.data as Record<string, unknown>;

          return { landingPage, fullTextUrl, canonical };
        }),
      ).toEqual([{ landingPage: SUPPLIER_LANDING_PAGE, fullTextUrl: null, canonical: true }]);
    });

    it('never copies a Work landing page into a Publication Location', async () => {
      const result = await parseUpload([], FRONTLIST_LOCATION_ONIX);

      await workService.bulkCreateWorks(resolveUpload(result).plan);

      const publisherPages = Object.values(PUBLISHER_PAGE_OF);
      const locationUrls = mutationsNamed('CreateLocation').flatMap((call) => {
        const { landingPage, fullTextUrl } = call.variables.data as Record<string, unknown>;

        return [landingPage, fullTextUrl];
      });

      // A publisher's product page and a supplier's platform are different things: pairing them
      // would manufacture a Location neither source claims.
      expect(locationUrls.some((url) => publisherPages.includes(url as string))).toBe(false);
      // The Work still keeps every one of them.
      expect(
        mutationsNamed('CreateWork').map((call) => (call.variables.data as Record<string, unknown>).landingPage),
      ).toEqual(publisherPages);
    });

    it('sends no zero-valued Price: a stated zero amount holds the plan back before any mutation (thoth-app#215)', async () => {
      const zeroPriced = FRONTLIST_LOCATION_ONIX.replace(
        '<UnpricedItemType>02</UnpricedItemType>',
        '<Price><PriceType>02</PriceType><PriceAmount>0.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>',
      );
      const result = await parseUpload([], zeroPriced);

      expect(() => resolveUpload(result)).toThrow('COMMERCIAL_PREFLIGHT_GAP(PRICE_AMOUNT_UNUSABLE)');
      expect(result.commercial.products[result.data.onix?.sourcePlan.products[0].productKey ?? ''].prices).toEqual([]);
      expect(mutations).toEqual([]);
    });
  });

  describe('identifiers, cover and reader-access Locations from real XML (thoth-app#219)', () => {
    const WORK_DOI = `https://doi.org/${RESOURCES_WORK_DOI}`;
    const productKeyOf = (upload: Upload) => upload.data.onix?.sourcePlan.products[0].productKey ?? '';
    const plannedOf = (upload: Upload) =>
      upload.commercial.products[productKeyOf(upload)].plannedLocations.map(
        ({ landingPage, fullTextUrl, platform, suppliers, carriers }) => ({
          suppliers: suppliers.map(({ name }) => name),
          landingPage,
          fullTextUrl,
          platform,
          role: carriers.DIGITAL?.role,
        }),
      );

    it('plans the Work DOI, landing page and cover, and keeps each supplier’s Location, choosing neither as canonical', async () => {
      const upload = await parseUpload([], RESOURCES_ONIX);
      const [group] = upload.data.onix?.sourcePlan.groups ?? [];
      const work = resolveOnixDescriptiveWork(upload.descriptive, group.groupKey, {
        choices: {},
        thothProfileActive: false,
      }).values;

      expect(upload.status).toBe('success');
      // Work: the DOI of the approved Work-level identifier, never the Product DOI beside it (Amendment 2).
      expect(group.workDoi).toEqual({ kind: 'DOI', doi: WORK_DOI, basis: 'WORK_IDENTIFIER' });
      expect(work.landingPage).toBe(RESOURCES_WORK_PAGE);
      expect(work.coverUrl).toBe(RESOURCES_COVER);
      // Planned Locations: one per supplier, each keeping both of its URLs (Amendment 1).
      expect(plannedOf(upload)).toEqual([
        {
          suppliers: ['THOTH'],
          landingPage: RESOURCES_WORK_PAGE,
          fullTextUrl: THOTH_FULL_TEXT,
          platform: LocationPlatforms.enum.PublisherWebsite,
          role: 'UNDECIDED',
        },
        {
          suppliers: ['INTERNET_ARCHIVE'],
          landingPage: ARCHIVE_LANDING,
          fullTextUrl: ARCHIVE_FULL_TEXT,
          platform: LocationPlatforms.enum.Other,
          role: 'UNDECIDED',
        },
      ]);
      // The file does not say which is canonical, and nothing chooses one for it: the plan waits, and nothing is sent.
      expect(() => resolveUpload(upload)).toThrow('COMMERCIAL_INPUT_REQUIRED(LOCATION_CANONICAL_AMBIGUOUS)');
      expect(mutations).toEqual([]);
    });

    it('imports the Work DOI, landing page and cover, and creates only the canonical supplier Location while the other stays planned', async () => {
      const upload = await parseUpload([], resourcesOnix(resourcesWebsite('36', ARCHIVE_LANDING)));
      const { plan, sidecar } = resolveUpload(upload);
      const [work] = plan.works;

      expect(sidecar.blockers).toEqual([]);
      expect({ doi: work.doi, landingPage: work.landingPage, coverUrl: work.coverUrl }).toEqual({
        doi: WORK_DOI,
        landingPage: RESOURCES_WORK_PAGE,
        coverUrl: RESOURCES_COVER,
      });
      expect(plannedOf(upload).map(({ suppliers, role }) => [suppliers, role])).toEqual([
        [['THOTH'], 'CANONICAL'],
        [['INTERNET_ARCHIVE'], 'NON_CANONICAL'],
      ]);
      expect(sidecar.commercial).toBe(upload.commercial);

      await workService.bulkCreateWorks(plan);

      const [created] = mutationsNamed('CreateWork').map((call) => call.variables.data as Record<string, unknown>);

      expect({ doi: created.doi, landingPage: created.landingPage, coverUrl: created.coverUrl }).toEqual({
        doi: WORK_DOI,
        landingPage: RESOURCES_WORK_PAGE,
        coverUrl: RESOURCES_COVER,
      });
      // The Work landing page and the canonical Location's may be the same URL: each keeps its own meaning.
      expect(
        mutationsNamed('CreateLocation').map((call) => {
          const { landingPage, fullTextUrl, canonical, locationPlatform } = call.variables.data as Record<
            string,
            unknown
          >;

          return { landingPage, fullTextUrl, canonical, locationPlatform };
        }),
      ).toEqual([
        {
          landingPage: RESOURCES_WORK_PAGE,
          fullTextUrl: THOTH_FULL_TEXT,
          canonical: true,
          locationPlatform: LocationPlatforms.enum.PublisherWebsite,
        },
      ]);
    });

    describe('the Arc Humanities Press cover shape: an external downloadable front cover (PR #220 review CR-1)', () => {
      const ARC_COVER = 'https://images.example.org/arc-humanities/9781802700010.jpg';
      const ARC_SHAPED_COVER = `<SupportingResource>
        <ResourceContentType>01</ResourceContentType>
        <ContentAudience>00</ContentAudience>
        <ResourceMode>03</ResourceMode>
        <ResourceVersion>
          <ResourceForm>02</ResourceForm>
          <ResourceVersionFeature><ResourceVersionFeatureType>01</ResourceVersionFeatureType><FeatureValue>D502</FeatureValue></ResourceVersionFeature>
          <ResourceVersionFeature><ResourceVersionFeatureType>02</ResourceVersionFeatureType><FeatureValue>1358</FeatureValue></ResourceVersionFeature>
          <ResourceVersionFeature><ResourceVersionFeatureType>03</ResourceVersionFeatureType><FeatureValue>903</FeatureValue></ResourceVersionFeature>
          <ResourceVersionFeature><ResourceVersionFeatureType>07</ResourceVersionFeatureType><FeatureValue>951386</FeatureValue></ResourceVersionFeature>
          <ResourceLink>${ARC_COVER}</ResourceLink>
          <ContentDate><ContentDateRole>17</ContentDateRole><Date dateformat="00">20200812</Date></ContentDate>
        </ResourceVersion>
      </SupportingResource>`;
      // The executable variant of the resources file, its linkable cover replaced by the Arc shape.
      const ARC_COVER_ONIX = resourcesOnix(resourcesWebsite('36', ARCHIVE_LANDING)).replace(
        /<SupportingResource>[\s\S]*<\/SupportingResource>/,
        ARC_SHAPED_COVER,
      );

      it('waits for the publisher, then creates the Work with the exact URL chosen, fetching and hosting nothing', async () => {
        const fetched = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no cover is ever fetched'));

        try {
          const upload = await parseUpload([], ARC_COVER_ONIX);

          expect(() => resolveUpload(upload)).toThrow('DESCRIPTIVE_CHOICE_REQUIRED(COVER_CHOICE_REQUIRED)');

          const { plan, warnings } = resolveUpload(upload, {}, { COVER_CHOICE_REQUIRED: ARC_COVER });

          expect(plan.works.map(({ coverUrl }) => coverUrl)).toEqual([ARC_COVER]);
          // The download-and-host expectation the link cannot keep stays said in the preview.
          expect(warnings).toContainEqual(
            expect.objectContaining({
              code: 'onix.descriptive.disclosure',
              message: expect.stringMatching(new RegExp(`${ARC_COVER.replace(/[.]/g, '\\.')}.*download and host`)),
            }),
          );

          await workService.bulkCreateWorks(plan);

          expect(
            mutationsNamed('CreateWork').map(({ variables }) => (variables.data as { coverUrl?: string }).coverUrl),
          ).toEqual([ARC_COVER]);
          expect(fetched).not.toHaveBeenCalled();
        } finally {
          fetched.mockRestore();
        }
      });

      it('creates the Work with no cover at all once the publisher omits it', async () => {
        const upload = await parseUpload([], ARC_COVER_ONIX);
        const { plan } = resolveUpload(upload, {}, { COVER_CHOICE_REQUIRED: 'OMIT' });

        expect(plan.works.map(({ coverUrl }) => coverUrl)).toEqual([undefined]);

        await workService.bulkCreateWorks(plan);

        // A Work with no cover is written with none, as the app writes any Work without one.
        expect((mutationsNamed('CreateWork')[0].variables.data as { coverUrl?: string | null }).coverUrl).toBeNull();
      });
    });
  });

  describe('titles from real XML to the mutation (thoth-app#183 Correction Authorization 1)', () => {
    const importOnix = async (onix: string, answers: Parameters<typeof resolveUpload>[2] = {}) => {
      const result = await parseUpload([], onix);

      expect(result.status).toBe('success');

      const { plan } = resolveUpload(result, {}, answers);

      await workService.bulkCreateWorks(plan);

      return plan;
    };

    const createdTitles = () =>
      mutationsNamed('CreateTitle').map(({ variables }) => ({
        markupFormat: variables.markupFormat,
        ...(variables.data as { title: string; subtitle: string | null; fullTitle: string; localeCode: string }),
      }));

    it('sends a title statement in Thoth JATS title markup as the full title, declared JATS for the whole row', async () => {
      await importOnix(
        describedOnix({
          titles: titleDetail('01', 'Cities', {
            subtitle: 'A History',
            statement:
              '<TitleStatement textformat="03" language="eng">&lt;italic&gt;Cities&lt;/italic&gt;: A History</TitleStatement>',
          }),
        }),
      );

      expect(createdTitles()).toEqual([
        expect.objectContaining({
          markupFormat: MarkupFormat.JatsXml,
          title: 'Cities',
          subtitle: 'A History',
          fullTitle: '<italic>Cities</italic>: A History',
          localeCode: LocaleCode.En,
        }),
      ]);
    });

    it('sends a plain title as plain text, never guessing markup from the characters it contains', async () => {
      await importOnix(describedOnix({ titles: titleDetail('01', 'When a &lt; b &gt; c', { subtitle: 'A Proof' }) }));

      expect(createdTitles()).toEqual([
        expect.objectContaining({
          markupFormat: MarkupFormat.PlainText,
          title: 'When a < b > c',
          subtitle: 'A Proof',
          fullTitle: 'When a < b > c: A Proof',
        }),
      ]);
    });

    it('fails the Work when one of its planned titles fails, removing the title it did create and the Work, once', async () => {
      const respond = (graphqlService.mutation as ReturnType<typeof vi.fn>).getMockImplementation() as (
        document: unknown,
        variables: Record<string, unknown>,
      ) => Promise<unknown>;

      (graphqlService.mutation as ReturnType<typeof vi.fn>).mockImplementation(
        async (document: unknown, variables: Record<string, unknown>) => {
          if (
            operationNameOf(document) === 'CreateTitle' &&
            (variables.data as { localeCode: string }).localeCode === 'FR'
          ) {
            mutations.push({ operation: 'CreateTitle', variables });
            throw new Error('A title with this locale already exists for this work.');
          }

          return respond(document, variables);
        },
      );

      const result = await parseUpload(
        [],
        describedOnix({ titles: titleDetail('01', 'Cities') + titleDetail('06', 'Villes', { language: 'fre' }) }),
      );
      const { plan } = resolveUpload(result);

      expect(plan.works[0].titles.map(({ localeCode }) => localeCode)).toEqual([LocaleCode.En, LocaleCode.Fr]);

      await expect(workService.bulkCreateWorks(plan)).rejects.toMatchObject({
        name: 'ImportExecutionError',
        message: 'A title with this locale already exists for this work.',
        context: expect.objectContaining({ stage: 'work', completed: 0 }),
      });

      const created = mutations.findIndex(({ operation }) => operation === 'CreateWork');

      // No partial title set ever counts as the Work's: the created title and the Work are removed exactly once,
      // and nothing else of the Work is created.
      expect(mutations.slice(created).map(({ operation }) => operation)).toEqual([
        'CreateWork',
        'CreateTitle',
        'CreateTitle',
        'DeleteTitle',
        'DeleteWork',
      ]);
    });
  });

  describe('ancillary counts from real XML to the mutation (thoth-app#183 Correction Authorization 1)', () => {
    const ancillaryContent = (type: string, number?: string) =>
      `<AncillaryContent><AncillaryContentType>${type}</AncillaryContentType>${number === undefined ? '' : `<Number>${number}</Number>`}</AncillaryContent>`;

    it('sends an explicit zero count as 0, and a count the source never states as unset', async () => {
      const result = await parseUpload(
        [],
        describedOnix({
          release: '3.1',
          titles: titleDetail('01', 'Cities'),
          descriptive: ancillaryContent('11', '0') + ancillaryContent('09', '7'),
        }),
      );
      const { plan } = resolveUpload(result);

      // The Work entity cannot tell 0 from unset; the plan's stated counts can.
      expect(plan.onix?.descriptive.statedCounts).toEqual([
        { workId: plan.works[0].id, counts: { tableCount: 0, imageCount: 7 } },
      ]);

      await workService.bulkCreateWorks(plan);

      expect(mutationsNamed('CreateWork').map(({ variables }) => variables.data)).toEqual([
        expect.objectContaining({ tableCount: 0, imageCount: 7, audioCount: null, videoCount: null }),
      ]);
    });
  });

  describe('publisher inputs from real XML to the mutation (thoth-app#183 Correction Authorization 1)', () => {
    const contributor = (name: string, sequence: string, keyNames = '') =>
      `<Contributor><SequenceNumber>${sequence}</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>${name}</PersonName>${keyNames ? `<KeyNames>${keyNames}</KeyNames>` : ''}</Contributor>`;

    it('plans nothing until the publisher supplies the date, title locale and surname the file lacks, then writes exactly those', async () => {
      const result = await parseUpload(
        [],
        describedOnix({
          titles:
            '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Villes</TitleText></TitleElement></TitleDetail>',
          descriptive: contributor('Ada Lovelace', '1'),
          languages: '',
          publishing: '<PublishingStatus>04</PublishingStatus>',
        }),
      );

      expect(() => resolveUpload(result)).toThrow(
        'the ONIX plan is blocked: DESCRIPTIVE_INPUT_REQUIRED(TITLE_LOCALE_UNRESOLVED), DESCRIPTIVE_INPUT_REQUIRED(LIFECYCLE_DATE_REQUIRED), DESCRIPTIVE_INPUT_REQUIRED(CONTRIBUTOR_NAME_REQUIRED)',
      );
      // Invalid values answer nothing either.
      expect(() =>
        resolveUpload(
          result,
          {},
          {
            TITLE_LOCALE_UNRESOLVED: 'fre',
            LIFECYCLE_DATE_REQUIRED: '2024-02-30',
            CONTRIBUTOR_NAME_REQUIRED: ' ',
          },
        ),
      ).toThrow('the ONIX plan is blocked');

      const { plan } = resolveUpload(
        result,
        {},
        {
          TITLE_LOCALE_UNRESOLVED: 'FR',
          LIFECYCLE_DATE_REQUIRED: '2024-03-15',
          CONTRIBUTOR_NAME_REQUIRED: 'Lovelace',
        },
      );

      await workService.bulkCreateWorks(plan);

      expect(mutationsNamed('CreateWork').map(({ variables }) => variables.data)).toEqual([
        expect.objectContaining({
          workStatus: WorkStatuses.enum.Active,
          publicationDate: '2024-03-15',
          withdrawnDate: null,
        }),
      ]);
      expect(mutationsNamed('CreateTitle').map(({ variables }) => variables.data)).toEqual([
        expect.objectContaining({ title: 'Villes', localeCode: LocaleCode.Fr }),
      ]);
      expect(mutationsNamed('CreateContribution').map(({ variables }) => variables.data)).toEqual([
        expect.objectContaining({ fullName: 'Ada Lovelace', lastName: 'Lovelace', contributionOrdinal: 1 }),
      ]);
    });

    it('numbers contributions in the order the publisher chose for ambiguous sequence numbers', async () => {
      const result = await parseUpload(
        [],
        describedOnix({
          titles: titleDetail('01', 'Cities'),
          descriptive:
            contributor('Ada Lovelace', '2', 'Lovelace') +
            contributor('Charles Babbage', '1', 'Babbage') +
            contributor('Mary Somerville', '1', 'Somerville'),
        }),
      );

      expect(() => resolveUpload(result)).toThrow('DESCRIPTIVE_CHOICE_REQUIRED(CONTRIBUTOR_ORDER_AMBIGUOUS)');

      await workService.bulkCreateWorks(
        resolveUpload(result, {}, { CONTRIBUTOR_ORDER_AMBIGUOUS: 'SEQUENCE_ORDER' }).plan,
      );

      expect(
        mutationsNamed('CreateContribution')
          .map(({ variables }) => variables.data as { fullName: string; contributionOrdinal: number })
          .sort((a, b) => a.contributionOrdinal - b.contributionOrdinal)
          .map(({ contributionOrdinal, fullName }) => [contributionOrdinal, fullName]),
      ).toEqual([
        [1, 'Charles Babbage'],
        [2, 'Mary Somerville'],
        [3, 'Ada Lovelace'],
      ]);
    });
  });

  /**
   * #209: the operationally important shape of the University of London Press file, synthetic and minimal - one
   * Work manifested as a hardback, a paperback, an EPUB and a PDF, each restating the Work's two editors, their
   * locale-less biographies and name-only affiliations, a publication funder named without a ROR or FundRef DOI,
   * English text, a Series Thoth does not hold, and the recovered publisher category and ISNI shapes (#205).
   */
  describe('the University of London Press shape, from real XML to the mutation (thoth-app#209)', () => {
    const INSTITUTE = 'Institute of Example Studies, University of Example (United Kingdom)';
    const FUNDER = 'Example Council of Learned Societies (ECLS)';
    const MANIFESTATIONS = [
      { isbn: '9781800000018', form: '<ProductForm>BB</ProductForm>', type: PublicationType.enum.Hardback },
      { isbn: '9781800000025', form: '<ProductForm>BC</ProductForm>', type: PublicationType.enum.Paperback },
      {
        isbn: '9781800000032',
        form: '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>',
        type: PublicationType.enum.Epub,
      },
      {
        isbn: '9781800000049',
        form: '<ProductForm>EA</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
        type: PublicationType.enum.Pdf,
      },
    ];
    const editor = (sequence: string, first: string, last: string, orcid: string, biography: string) => `
      <Contributor>
        <SequenceNumber>${sequence}</SequenceNumber>
        <ContributorRole>B01</ContributorRole>
        <NameIdentifier><NameIDType>01</NameIDType><IDTypeName>system-internal-identifier</IDTypeName><IDValue>${sequence}0001</IDValue></NameIdentifier>
        <NameIdentifier><NameIDType>21</NameIDType><IDValue>${orcid}</IDValue></NameIdentifier>
        <PersonName>${first} ${last}</PersonName>
        <PersonNameInverted>${last}, ${first}</PersonNameInverted>
        <NamesBeforeKey>${first}</NamesBeforeKey>
        <KeyNames>${last}</KeyNames>
        <ProfessionalAffiliation>
          <ProfessionalPosition>Professor of ${last} Studies</ProfessionalPosition>
          <Affiliation>${INSTITUTE}</Affiliation>
        </ProfessionalAffiliation>
        <BiographicalNote textformat="06">${biography}</BiographicalNote>
      </Contributor>`;
    const EDITORS =
      editor('1', 'Alex', 'Example', '0000000218250097', '&lt;p&gt;Alex Example writes on literature.&lt;/p&gt;') +
      editor('2', 'Sam', 'Sample', '000000021694233X', 'Sam Sample writes on translation.');
    const product = ({ isbn, form }: (typeof MANIFESTATIONS)[number], rights = '', supply = '') => `
  <Product>
    <RecordReference>${isbn}</RecordReference>
    <NotificationType>02</NotificationType>
    <ProductIdentifier><ProductIDType>03</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      ${form}
      ${rights}
      <Collection>
        <CollectionType>10</CollectionType>
        <TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>02</TitleElementLevel><TitleText>Studies in Example Cultures</TitleText></TitleElement></TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement><TitleElementLevel>01</TitleElementLevel><NoPrefix/><TitleWithoutPrefix>Literature Across Languages</TitleWithoutPrefix><Subtitle>A Synthetic Case</Subtitle></TitleElement>
      </TitleDetail>
      ${EDITORS}
      <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode><CountryCode>GB</CountryCode></Language>
      <Subject><SubjectSchemeIdentifier>23</SubjectSchemeIdentifier><SubjectCode>EX-LIT</SubjectCode></Subject>
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${IMPRINT_NAME}</ImprintName></Imprint>
      <Publisher><PublishingRole>01</PublishingRole><PublisherIdentifier><PublisherIDType>16</PublisherIDType><IDValue>000000009999999X</IDValue></PublisherIdentifier><PublisherName>Example University Press</PublisherName></Publisher>
      <Publisher><PublishingRole>14</PublishingRole><PublisherName>${FUNDER}</PublisherName></Publisher>
      <CityOfPublication>London</CityOfPublication>
      <PublishingStatus>02</PublishingStatus>
      <PublishingDate><PublishingDateRole>01</PublishingDateRole><Date dateformat="00">20260917</Date></PublishingDate>
    </PublishingDetail>
    <RelatedMaterial>
      ${MANIFESTATIONS.filter((other) => other.isbn !== isbn)
        .map(
          (other) =>
            `<RelatedProduct><ProductRelationCode>06</ProductRelationCode><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${other.isbn}</IDValue></ProductIdentifier></RelatedProduct>`,
        )
        .join('')}
    </RelatedMaterial>
    ${supply}
  </Product>`;
    type Manifestation = (typeof MANIFESTATIONS)[number];
    /**
     * The message, with the Product rights (thoth-app#211) and the ProductSupply (thoth-app#215) each manifestation
     * states: none unless given.
     */
    const uolpShapedOnix = (
      rightsOf: (manifestation: Manifestation) => string = () => '',
      supplyOf: (manifestation: Manifestation) => string = () => '',
    ) =>
      `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Header><Sender><SenderName>Example University Press</SenderName></Sender><SentDateTime>20260916</SentDateTime><DefaultLanguageOfText>eng</DefaultLanguageOfText></Header>
  ${MANIFESTATIONS.map((manifestation) => product(manifestation, rightsOf(manifestation), supplyOf(manifestation))).join('')}
</ONIXMessage>`;
    const UOLP_SHAPED_ONIX = uolpShapedOnix();

    /** Thoth's existing institutions, as its institution search returns them for each filter. */
    const INSTITUTIONS: Record<string, { id: string; name: string; ror: string; doi: string }[]> = {
      'Institute of Example Studies': [
        {
          id: 'institution-institute',
          name: 'Institute of Example Studies',
          ror: 'https://ror.org/00example1',
          doi: '',
        },
      ],
      'University of Example': [
        { id: 'institution-university', name: 'University of Example', ror: 'https://ror.org/00example2', doi: '' },
        {
          id: 'institution-institute',
          name: 'Institute of Example Studies',
          ror: 'https://ror.org/00example1',
          doi: '',
        },
      ],
      'Example Council of Learned Societies': [
        { id: 'institution-council', name: 'Example Council of Learned Societies', ror: '', doi: '' },
      ],
    };

    const upload = async (onix = UOLP_SHAPED_ONIX) => {
      const xml = (await parse(onix)) as ExtendedONIXMessageRoot;
      const sourcePlan = planOnixSource(xml);
      // The approved #205 recovery of the code-23 category, as the canonical validator would have recorded it.
      const recoveries = sourcePlan.products.map(({ representativeRecordKey }) => {
        const record = sourcePlan.records.find(({ recordKey }) => recordKey === representativeRecordKey);
        const path = `${record?.path}/DescriptiveDetail[1]/Subject[1]`;

        return {
          recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM' as const,
          rule: '_20171218_a_2' as const,
          path,
          scheme: { element: 'SubjectSchemeIdentifier' as const, code: '23' as const },
          valueSource: 'SubjectCode' as const,
          valuePath: `${path}/SubjectCode[1]`,
          value: 'EX-LIT',
        };
      });
      const descriptive = reduceOnixDescriptive(xml, sourcePlan, { recoveries });
      const rights = reduceOnixRights(xml, sourcePlan);
      const commercial = reduceOnixCommercial(xml, sourcePlan);
      const salesRights = reduceOnixSalesRights(xml, sourcePlan, { commercial });
      const targets = await resolveOnixTargets(sourcePlan, noExistingWorks, PUBLISHER_ID);
      const institutionService = {
        getInstitutions: vi.fn(async (_offset: number, _limit: number, filter: string) =>
          (INSTITUTIONS[filter] ?? []).map((institution) => ({ ...institution, countryCode: 'GB', updatedAt: '' })),
        ),
      };
      const contributorService = {
        getContributors: vi.fn(async () => []),
        getContributorsByOrcids: vi.fn(async () => []),
      };
      const parsed = await new XMLParser(
        xml,
        IMPRINTS,
        licenseOptions,
        [],
        contributorService as never,
        institutionService as never,
        languageOptions,
        currencyOptions,
        { sourcePlan, descriptive, adaptGroupKeys: adaptableGroupKeys(sourcePlan, targets, IMPRINTS) },
      ).parse();

      if (parsed.data.onix === undefined) throw new Error('the parse produced no ONIX planning state');

      const { groups } = parsed.data.onix;
      const resolveWith = (inputs: Partial<OnixPlanInputs> = {}) =>
        resolveOnixImportPlan({
          sourcePlan,
          targets,
          inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
          imprints: IMPRINTS,
          descriptive,
          rights,
          commercial,
          salesRights,
          serieses: [],
          candidatePlan: parsed.data.plan,
          adaptation: groups,
        });

      return { parsed, sourcePlan, descriptive, rights, commercial, salesRights, resolveWith, institutionService };
    };

    const decisionOf = (sidecar: OnixImportPlanSidecar, findingKey: unknown) =>
      sidecar.descriptive.findings.find(({ key }) => key === findingKey) as OnixDescriptiveFinding;

    it('asks the publisher a small Work-level decision set, not one per manifestation, and decides none of it', async () => {
      const { parsed, sourcePlan, descriptive, resolveWith } = await upload();
      const { sidecar, plan } = resolveWith();
      const [group] = sidecar.workGroups;

      expect(parsed.status).toBe('success');
      expect(sourcePlan.groups).toHaveLength(1);

      // Four resolved Publications, created as the file says, with no omission to decide.
      expect(
        sidecar.products.map(({ action, publicationType, omittable }) => [action, publicationType, omittable]),
      ).toEqual(MANIFESTATIONS.map(({ type }) => ['CREATE_PUBLICATION', type, false]));

      // One WorkType decision for the one Work; the suggestion stays evidence, never the WorkType.
      expect(group.workType).toEqual({ status: 'UNRESOLVED' });
      expect(suggestOnixWorkType(descriptive, group.groupKey)).toBe(WorkTypes.enum.EditedBook);

      // Every blocker is a decision the publisher answers inside the app, each asked once for the Work.
      const decisions = sidecar.blockers.map(({ code, detail }) => [code, detail.finding ?? null]);
      expect(decisions).toEqual([
        ['WORK_TYPE_INPUT_REQUIRED', null],
        // The Series names no publication order in any manifestation: its membership is acknowledged once.
        ['DESCRIPTIVE_ACKNOWLEDGEMENT_REQUIRED', 'SERIES_ORDINAL_REQUIRED'],
        ['DESCRIPTIVE_INPUT_REQUIRED', 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED'],
        ['DESCRIPTIVE_INPUT_REQUIRED', 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED'],
        ['DESCRIPTIVE_CHOICE_REQUIRED', 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED'],
        ['DESCRIPTIVE_CHOICE_REQUIRED', 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED'],
        ['DESCRIPTIVE_CHOICE_REQUIRED', 'FUNDING_FUNDER_UNIDENTIFIED'],
      ]);
      expect(plan).toBeNull();

      // Each decision keeps every manifestation's source location.
      const products = sourcePlan.records.map(({ path }) => path);
      sidecar.blockers
        .filter(({ detail }) => typeof detail.findingKey === 'string')
        .forEach(({ detail }) => {
          const located = decisionOf(sidecar, detail.findingKey).locations.map(({ path }) => path);

          expect(products.map((record) => located.some((path) => path.startsWith(`${record}/`)))).toEqual([
            true,
            true,
            true,
            true,
          ]);
        });

      // The biographies' locale is asked for, with the English text as evidence only.
      const [locale] = sidecar.descriptive.findings.filter(
        ({ code }) => code === 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED',
      );
      expect(locale).toMatchObject({
        resolution: { kind: 'INPUT', input: 'LOCALE' },
        detail: { textLocales: ['EN_GB'] },
      });

      // Institutions are suggested by name, never chosen: the answers stay the publisher's.
      const [affiliation] = sidecar.descriptive.findings.filter(
        ({ code }) => code === 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED',
      );
      const [funder] = sidecar.descriptive.findings.filter(({ code }) => code === 'FUNDING_FUNDER_UNIDENTIFIED');
      expect(affiliation.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: 'institution-institute', label: 'Institute of Example Studies · https://ror.org/00example1' },
          { key: 'institution-university', label: 'University of Example · https://ror.org/00example2' },
          { key: 'OMIT', label: INSTITUTE },
        ],
      });
      expect(funder.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: 'institution-council', label: 'Example Council of Learned Societies' },
          { key: 'OMIT', label: FUNDER },
        ],
      });
    });

    it('becomes executable once every decision is answered, and writes exactly the answers, with no source edit', async () => {
      const { sourcePlan, resolveWith } = await upload();
      const unanswered = resolveWith().sidecar;
      const keysOf = (finding: string) =>
        unanswered.blockers
          .filter(({ detail }) => detail.finding === finding)
          .map(({ detail }) => detail.findingKey as string);
      const [firstLocale, secondLocale] = keysOf('CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED');
      const answers = {
        [firstLocale]: 'EN_GB',
        [secondLocale]: 'EN',
        ...Object.fromEntries(
          keysOf('CONTRIBUTOR_AFFILIATION_UNIDENTIFIED').map((key) => [key, 'institution-institute']),
        ),
        [keysOf('FUNDING_FUNDER_UNIDENTIFIED')[0]]: 'institution-council',
        [keysOf('SERIES_ORDINAL_REQUIRED')[0]]: 'ACKNOWLEDGED',
      };
      const inputs = {
        workTypeOverrides: { [sourcePlan.groups[0].groupKey]: WorkTypes.enum.EditedBook },
        descriptiveChoices: answers,
      };

      // Clearing any one answer blocks again.
      expect(resolveWith({ ...inputs, descriptiveChoices: { ...answers, [secondLocale]: '' } }).plan).toBeNull();
      expect(resolveWith({ ...inputs, descriptiveChoices: { ...answers, [firstLocale]: 'eng' } }).plan).toBeNull();

      const { plan, sidecar } = resolveWith(inputs);

      expect(sidecar.blockers).toEqual([]);
      expect(plan).not.toBeNull();

      await workService.bulkCreateWorks(plan as ImportPlan);

      expect(mutationsNamed('CreateWork')).toHaveLength(1);
      expect(mutationsNamed('CreateWork')[0].variables.data).toEqual(
        expect.objectContaining({ workType: WorkTypes.enum.EditedBook }),
      );
      expect(
        mutationsNamed('CreatePublication').map(
          ({ variables }) => (variables.data as { publicationType: string }).publicationType,
        ),
      ).toEqual(MANIFESTATIONS.map(({ type }) => type));
      expect(
        mutationsNamed('CreateBiography')
          .map(({ variables }) => variables.data as { localeCode: string; canonical: boolean })
          .map(({ localeCode, canonical }) => [localeCode, canonical])
          .sort(),
      ).toEqual([
        ['EN', true],
        ['EN_GB', true],
      ]);
      expect(
        mutationsNamed('CreateAffiliation').map(
          ({ variables }) => variables.data as { institutionId: string; position: string },
        ),
      ).toEqual([
        expect.objectContaining({ institutionId: 'institution-institute', position: 'Professor of Example Studies' }),
        expect.objectContaining({ institutionId: 'institution-institute', position: 'Professor of Sample Studies' }),
      ]);
      expect(mutationsNamed('CreateFunding').map(({ variables }) => variables.data)).toEqual([
        expect.objectContaining({ institutionId: 'institution-council' }),
      ]);
      // Nothing is ever created in Thoth's institution register.
      expect(mutations.map(({ operation }) => operation)).not.toContain('CreateInstitution');
    });

    it('asks its credited, captioned, described external cover once for the Work, keeps the credit, and writes exactly the answer (PR #220 review CR-1, CR-2)', async () => {
      const UOLP_COVER = 'https://images.example.org/supportingresources/400/cover_original.jpg';
      const UOLP_CREDIT = 'Photo by A. Photographer on Example Images.';
      const UOLP_SHAPED_COVER = `
    <CollateralDetail>
      <SupportingResource>
        <ResourceContentType>01</ResourceContentType>
        <ContentAudience>00</ContentAudience>
        <ResourceMode>03</ResourceMode>
        <ResourceFeature><ResourceFeatureType>01</ResourceFeatureType><FeatureNote>${UOLP_CREDIT}</FeatureNote></ResourceFeature>
        <ResourceFeature><ResourceFeatureType>02</ResourceFeatureType><FeatureNote>A bookshop doorway</FeatureNote></ResourceFeature>
        <ResourceFeature><ResourceFeatureType>07</ResourceFeatureType><FeatureNote>A cover showing a bookshop doorway covered in graffiti</FeatureNote></ResourceFeature>
        <ResourceVersion>
          <ResourceForm>02</ResourceForm>
          <ResourceVersionFeature><!--File format jpg--><ResourceVersionFeatureType>01</ResourceVersionFeatureType><FeatureValue>D502</FeatureValue></ResourceVersionFeature>
          <ResourceVersionFeature><!--Height--><ResourceVersionFeatureType>02</ResourceVersionFeatureType><FeatureValue>2551</FeatureValue></ResourceVersionFeature>
          <ResourceVersionFeature><!--Width--><ResourceVersionFeatureType>03</ResourceVersionFeatureType><FeatureValue>1654</FeatureValue></ResourceVersionFeature>
          <ResourceLink>${UOLP_COVER}</ResourceLink>
        </ResourceVersion>
      </SupportingResource>
    </CollateralDetail>`;
      const { sourcePlan, resolveWith } = await upload(
        UOLP_SHAPED_ONIX.replaceAll('</DescriptiveDetail>', `</DescriptiveDetail>${UOLP_SHAPED_COVER}`),
      );
      const unanswered = resolveWith().sidecar;
      const keysOf = (finding: string) =>
        unanswered.blockers
          .filter(({ detail }) => detail.finding === finding)
          .map(({ detail }) => detail.findingKey as string);
      const [coverKey, ...others] = keysOf('COVER_CHOICE_REQUIRED');
      const decision = decisionOf(unanswered, coverKey);

      // One cover decision for the Work, however many manifestations state the cover, located in every one of them.
      expect(others).toEqual([]);
      expect(decision.locations.map(({ path }) => path)).toEqual(
        sourcePlan.records.map(
          ({ path }) => `${path}/CollateralDetail[1]/SupportingResource[1]/ResourceVersion[1]/ResourceLink[1]`,
        ),
      );
      expect(decision.resolution).toEqual({
        kind: 'CHOICE',
        options: [
          { key: UOLP_COVER, label: UOLP_COVER },
          { key: 'OMIT', label: 'OMIT' },
        ],
      });
      // The decision shows what the cover cannot keep: the exact credit, the caption, the alternative text, the hosting.
      expect(decision.message).toContain(`"${UOLP_CREDIT}"`);
      expect(decision.message).toMatch(/caption/);
      expect(decision.message).toMatch(/alternative text/);
      expect(decision.message).toMatch(/download and host/);
      // Every manifestation's credit stays evidence in the plan, with where the file states it.
      expect(
        unanswered.descriptive.findings
          .filter(({ code }) => code === 'COVER_DECISION_CANDIDATE')
          .map(({ detail, locations }) => [
            detail.credits,
            detail.reasons,
            locations.some(({ path }) => path.endsWith('/SupportingResource[1]/ResourceFeature[1]')),
          ]),
      ).toEqual(sourcePlan.records.map(() => [[UOLP_CREDIT], ['CREDIT_REQUIRED', 'DOWNLOADABLE_FILE'], true]));

      const answers = {
        [keysOf('CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED')[0]]: 'EN_GB',
        [keysOf('CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED')[1]]: 'EN',
        ...Object.fromEntries(
          keysOf('CONTRIBUTOR_AFFILIATION_UNIDENTIFIED').map((key) => [key, 'institution-institute']),
        ),
        [keysOf('FUNDING_FUNDER_UNIDENTIFIED')[0]]: 'institution-council',
        [keysOf('SERIES_ORDINAL_REQUIRED')[0]]: 'ACKNOWLEDGED',
      };
      const decided = (cover?: string) =>
        resolveWith({
          workTypeOverrides: { [sourcePlan.groups[0].groupKey]: WorkTypes.enum.EditedBook },
          descriptiveChoices: cover === undefined ? answers : { ...answers, [coverKey]: cover },
        });

      // Every other decision answered, the unanswered cover still holds the import back.
      expect(decided().plan).toBeNull();
      expect(decided().sidecar.blockers.map(({ detail }) => detail.findingKey)).toEqual([coverKey]);
      expect(decided('OMIT').plan?.works.map(({ coverUrl }) => coverUrl)).toEqual([undefined]);

      const { plan, sidecar } = decided(UOLP_COVER);

      expect(sidecar.blockers).toEqual([]);

      await workService.bulkCreateWorks(plan as ImportPlan);

      const [created] = mutationsNamed('CreateWork').map(({ variables }) => variables.data as Record<string, unknown>);

      expect(created.coverUrl).toBe(UOLP_COVER);
      // The credit has no Work field: it is never written as the copyright holder, or anywhere else.
      expect(JSON.stringify(created)).not.toContain(UOLP_CREDIT);
    });

    describe('with the Product rights the University of London Press file states (thoth-app#211)', () => {
      const DIGITAL_RIGHTS =
        '<EpubTechnicalProtection>00</EpubTechnicalProtection>' +
        '<EpubLicense><EpubLicenseName>Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License</EpubLicenseName>' +
        '<EpubLicenseExpression><EpubLicenseExpressionType>01</EpubLicenseExpressionType>' +
        '<EpubLicenseExpressionLink>https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>';
      const isDigital = ({ type }: (typeof MANIFESTATIONS)[number]) =>
        type === PublicationType.enum.Epub || type === PublicationType.enum.Pdf;

      /** The #209 answers, which the licence changes nothing about. */
      const answered = (
        sourcePlan: { readonly groups: readonly { readonly groupKey: string }[] },
        unanswered: OnixImportPlanSidecar,
      ) => {
        const keysOf = (finding: string) =>
          unanswered.blockers
            .filter(({ detail }) => detail.finding === finding)
            .map(({ detail }) => detail.findingKey as string);
        const [firstLocale, secondLocale] = keysOf('CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED');

        return {
          workTypeOverrides: { [sourcePlan.groups[0].groupKey]: WorkTypes.enum.EditedBook },
          descriptiveChoices: {
            [firstLocale]: 'EN_GB',
            [secondLocale]: 'EN',
            ...Object.fromEntries(
              keysOf('CONTRIBUTOR_AFFILIATION_UNIDENTIFIED').map((key) => [key, 'institution-institute']),
            ),
            [keysOf('FUNDING_FUNDER_UNIDENTIFIED')[0]]: 'institution-council',
            [keysOf('SERIES_ORDINAL_REQUIRED')[0]]: 'ACKNOWLEDGED',
          },
        };
      };

      describe('with the SalesRights and ProductContacts a publisher may state (thoth-app#217)', () => {
        const SALES_RIGHTS =
          '<SalesRights><SalesRightsType>01</SalesRightsType><Territory><RegionsIncluded>WORLD</RegionsIncluded><CountriesExcluded>US</CountriesExcluded></Territory></SalesRights>' +
          '<ROWSalesRightsType>03</ROWSalesRightsType>';
        const CONTACT =
          '<ProductContact><ProductContactRole>06</ProductContactRole><ProductContactName>Example University Press</ProductContactName><EmailAddress>permissions@example.org</EmailAddress></ProductContact>';
        const withPublishing = (xml: string) =>
          xml.replaceAll('</PublishingDetail>', `${SALES_RIGHTS}${CONTACT}</PublishingDetail>`);

        it('preserves every territorial right and contact as a Product fact, plans no mutation from them, and executes only once each loss is acknowledged', async () => {
          const { parsed, sourcePlan, salesRights, resolveWith } = await upload(
            withPublishing(uolpShapedOnix((manifestation) => (isDigital(manifestation) ? DIGITAL_RIGHTS : ''))),
          );
          const decisions = answered(sourcePlan, resolveWith().sidecar);
          const unanswered = resolveWith(decisions);
          const keys = salesRights.findings.filter(({ blocking }) => blocking).map(({ key }) => key);

          expect(parsed.status).toBe('success');
          // Each manifestation states the rights and the contact; each keeps them as its own facts, unmerged.
          expect(
            sourcePlan.products.map(({ productKey }) => {
              const { salesRights: rights, rowSalesRightsType, productContacts } = salesRights.products[productKey];

              return [
                rights.map(({ type }) => type),
                rowSalesRightsType?.type ?? null,
                productContacts.map(({ role }) => role),
              ];
            }),
          ).toEqual(MANIFESTATIONS.map(() => [['01'], '03', ['06']]));
          expect(unanswered.plan).toBeNull();
          expect(unanswered.sidecar.blockers.map(({ code, detail }) => [code, detail.finding])).toEqual(
            MANIFESTATIONS.flatMap(() => [
              ['SALES_RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'SALES_RIGHTS_TERRITORY_NOT_REPRESENTED'],
              ['SALES_RIGHTS_ACKNOWLEDGEMENT_REQUIRED', 'SALES_RIGHTS_ROW_NOT_REPRESENTED'],
              ['PRODUCT_CONTACT_ACKNOWLEDGEMENT_REQUIRED', 'PRODUCT_CONTACT_NOT_REPRESENTED'],
            ]),
          );

          const rightsChoices = Object.fromEntries(keys.map((key) => [key, ONIX_RIGHTS_ACKNOWLEDGED]));
          const { plan, sidecar } = resolveWith({ ...decisions, rightsChoices });

          expect(sidecar.blockers).toEqual([]);
          expect(sidecar.acknowledgedRightsFindingKeys).toEqual(keys);
          expect(sidecar.salesRights).toBe(salesRights);
          expect(sidecar.inputs.rightsChoices).toEqual(rightsChoices);
          // The Work's licence is still the rights reduction's, untouched by the sales rights beside it.
          expect(sidecar.licenceActions).toEqual([
            {
              groupKey: sourcePlan.groups[0].groupKey,
              action: {
                kind: 'SET_SUPPORTED_LICENSE',
                identity: 'CC_BY_NC_ND_4_0',
                url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
              },
            },
          ]);
          expect(plan?.works[0].license).toBe('https://creativecommons.org/licenses/by-nc-nd/4.0/');
          // Nothing of the rights or the contact reaches what executes: no territory, no restriction, no email.
          const executable = JSON.stringify(plan?.works);

          expect(executable).not.toContain('permissions@example.org');
          expect(executable).not.toMatch(/SalesRights|ROWSalesRightsType|ProductContact|WORLD/);
        });

        it('blocks a market the file supplies in territory it is not for sale in, before any lookup or mutation, and no acknowledgement lifts it', async () => {
          const supply =
            '<ProductSupply><Market><Territory><CountriesIncluded>US</CountriesIncluded></Territory></Market>' +
            '<SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>Example Distributor</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
            '<Price><PriceType>02</PriceType><PriceAmount>30.00</PriceAmount><CurrencyCode>USD</CurrencyCode></Price></SupplyDetail></ProductSupply>';
          const { sourcePlan, salesRights, resolveWith, institutionService } = await upload(
            withPublishing(
              uolpShapedOnix(
                () => '',
                (manifestation) => (isDigital(manifestation) ? '' : supply),
              ),
            ),
          );
          const decisions = answered(sourcePlan, resolveWith().sidecar);
          const contradictions = salesRights.findings.filter(
            ({ code }) => code === 'SALES_RIGHTS_MARKET_CONTRADICTION',
          );
          const everything = Object.fromEntries(salesRights.findings.map(({ key }) => [key, ONIX_RIGHTS_ACKNOWLEDGED]));
          const { plan, sidecar } = resolveWith({ ...decisions, rightsChoices: everything });

          expect(contradictions).toHaveLength(2);
          expect(plan).toBeNull();
          expect(sidecar.blockers.filter(({ code }) => code === 'SALES_RIGHTS_SOURCE_CONFLICT')).toHaveLength(2);
          // An answer to a conflict is stale, never consent.
          expect(sidecar.blockers.filter(({ code }) => code === 'RIGHTS_CHOICE_STALE')).toHaveLength(2);
          // The institution search is the only lookup planning makes; nothing was fetched or written for the rights.
          expect(institutionService.getInstitutions).toHaveBeenCalled();
        });
      });

      it('takes CC BY-NC-ND 4.0 for the Work from its e-book and PDF, asks nothing more, and writes it on CreateWork', async () => {
        const { parsed, sourcePlan, rights, resolveWith } = await upload(
          uolpShapedOnix((manifestation) => (isDigital(manifestation) ? DIGITAL_RIGHTS : '')),
        );
        const unanswered = resolveWith().sidecar;

        // No false grouped-Work licence conflict, and the decisions are exactly #209's: no rights question at all.
        expect(parsed.data.onix?.groups[0].conflictingFields).toEqual([]);
        expect(unanswered.blockers.map(({ code, detail }) => [code, detail.finding ?? null])).toEqual([
          ['WORK_TYPE_INPUT_REQUIRED', null],
          ['DESCRIPTIVE_ACKNOWLEDGEMENT_REQUIRED', 'SERIES_ORDINAL_REQUIRED'],
          ['DESCRIPTIVE_INPUT_REQUIRED', 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED'],
          ['DESCRIPTIVE_INPUT_REQUIRED', 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED'],
          ['DESCRIPTIVE_CHOICE_REQUIRED', 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED'],
          ['DESCRIPTIVE_CHOICE_REQUIRED', 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED'],
          ['DESCRIPTIVE_CHOICE_REQUIRED', 'FUNDING_FUNDER_UNIDENTIFIED'],
        ]);
        expect(rights.findings).toEqual([]);
        // Print states no rights and stays neutral; e-book and PDF agree, with no date, constraint or part's rights.
        expect(
          MANIFESTATIONS.map(({ isbn }) => {
            const { productKey } = sourcePlan.records.find(({ recordReference }) => recordReference === isbn) ?? {};
            const product = rights.products[productKey ?? ''];

            return [
              product.carrier,
              product.licence.kind,
              product.technicalProtectionState,
              product.usageConstraints.length,
              product.dated,
              product.deferredRights.length,
            ];
          }),
        ).toEqual([
          ['PHYSICAL', 'SILENT', 'UNKNOWN', 0, false, 0],
          ['PHYSICAL', 'SILENT', 'UNKNOWN', 0, false, 0],
          ['DIGITAL', 'SUPPORTED', 'NONE', 0, false, 0],
          ['DIGITAL', 'SUPPORTED', 'NONE', 0, false, 0],
        ]);
        expect(rights.groups[sourcePlan.groups[0].groupKey].licence).toMatchObject({
          kind: 'SET_SUPPORTED_LICENSE',
          identity: 'CC_BY_NC_ND_4_0',
          url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
        });

        const { plan, sidecar } = resolveWith(answered(sourcePlan, unanswered));

        expect(sidecar.blockers).toEqual([]);
        expect(sidecar.rights).toBe(rights);
        expect(plan?.works.map(({ license }) => license)).toEqual([
          'https://creativecommons.org/licenses/by-nc-nd/4.0/',
        ]);

        await workService.bulkCreateWorks(plan as ImportPlan);

        expect(mutationsNamed('CreateWork').map(({ variables }) => variables.data)).toEqual([
          expect.objectContaining({
            workType: WorkTypes.enum.EditedBook,
            license: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
          }),
        ]);
        expect(
          mutationsNamed('CreatePublication').map(
            ({ variables }) => (variables.data as { publicationType: string }).publicationType,
          ),
        ).toEqual(MANIFESTATIONS.map(({ type }) => type));
      });

      it('holds the same Work back, and sets no licence, when only its e-book states the licence', async () => {
        const { sourcePlan, rights, resolveWith } = await upload(
          uolpShapedOnix(({ type }) => (type === PublicationType.enum.Epub ? DIGITAL_RIGHTS : '')),
        );
        const unanswered = resolveWith().sidecar;
        const { plan, sidecar } = resolveWith(answered(sourcePlan, unanswered));

        expect(plan).toBeNull();
        expect(sidecar.blockers.map(({ code, detail }) => [code, detail.finding])).toEqual([
          ['RIGHTS_INPUT_REQUIRED', 'RIGHTS_LICENCE_GROUP_AMBIGUOUS'],
        ]);
        expect(rights.groups[sourcePlan.groups[0].groupKey].licence.kind).toBe('BLOCKED');
      });

      it('holds the same Work back, and sets no licence, when its hardback states technical protection but no licence', async () => {
        const [hardback] = MANIFESTATIONS;
        const { sourcePlan, rights, resolveWith } = await upload(
          uolpShapedOnix((manifestation) =>
            isDigital(manifestation)
              ? DIGITAL_RIGHTS
              : manifestation === hardback
                ? '<EpubTechnicalProtection>00</EpubTechnicalProtection>'
                : '',
          ),
        );
        const unanswered = resolveWith().sidecar;
        const { plan, sidecar } = resolveWith(answered(sourcePlan, unanswered));
        const hardbackKey = sourcePlan.records.find(
          ({ recordReference }) => recordReference === hardback.isbn,
        )?.productKey;

        // A print manifestation stating digital rights of its own is not neutral, and it states no licence (rule 84).
        expect(plan).toBeNull();
        expect(sidecar.blockers.map(({ code, detail }) => [code, detail.finding])).toEqual([
          ['RIGHTS_INPUT_REQUIRED', 'RIGHTS_LICENCE_GROUP_AMBIGUOUS'],
        ]);
        expect(rights.findings).toEqual([
          expect.objectContaining({
            code: 'RIGHTS_LICENCE_GROUP_AMBIGUOUS',
            detail: { identities: ['CC_BY_NC_ND_4_0'], silentProductKeys: [hardbackKey] },
          }),
        ]);
        expect(rights.groups[sourcePlan.groups[0].groupKey].licence.kind).toBe('BLOCKED');
      });

      /**
       * The production failure of specification amendment 5713644155, synthetically: the print manifestations state
       * genuine positive GBP prices, and the digital ones state UnpricedItemType 01 (Free of charge) with no
       * PriceAmount - and the print prices for comparison - which the released importer turned into zero-valued Prices
       * the backend rightly refused. The print prices here state no PriceQualifier: see the case below for the one the
       * real file's print records carry.
       */
      describe('and the prices it states (thoth-app#215, amendment 5713644155)', () => {
        const PRINT_PRICES: Record<string, string> = { '9781800000018': '75.00', '9781800000025': '24.99' };
        const supplyDetail = (price: string) =>
          '<ProductSupply><Market><Territory><CountriesIncluded>GB US</CountriesIncluded></Territory></Market>' +
          '<SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>Example Institute Press</SupplierName></Supplier>' +
          '<ProductAvailability>10</ProductAvailability><SupplyDate><SupplyDateRole>08</SupplyDateRole><Date dateformat="00">20260917</Date></SupplyDate>' +
          `${price}</SupplyDetail></ProductSupply>`;
        const printPrice = (amount: string, qualifier = '') =>
          `<Price><PriceType>02</PriceType>${qualifier}<PriceStatus>00</PriceStatus><PriceAmount>${amount}</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>`;
        const comparison = (isbn: string) =>
          `<ComparisonProductPrice><ProductIdentifier><ProductIDType>03</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
          `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
          `<PriceType>02</PriceType><PriceAmount>${PRINT_PRICES[isbn]}</PriceAmount><CurrencyCode>GBP</CurrencyCode></ComparisonProductPrice>`;
        const UNPRICED =
          '<Price><PriceType>02</PriceType><PriceQualifier>05</PriceQualifier><PriceStatus>00</PriceStatus>' +
          '<UnpricedItemType>01</UnpricedItemType><CurrencyCode>GBP</CurrencyCode>' +
          `${Object.keys(PRINT_PRICES).map(comparison).join('')}</Price>`;
        const supplyOf =
          (qualifier = '') =>
          (manifestation: Manifestation) =>
            supplyDetail(isDigital(manifestation) ? UNPRICED : printPrice(PRINT_PRICES[manifestation.isbn], qualifier));
        const priceOf = (plan: ImportPlan | null) =>
          (plan?.works ?? []).flatMap(({ publications }) =>
            publications.map(({ type, prices }) => [
              type,
              prices.map(({ currencyCode, unitPrice }) => [currencyCode, unitPrice]),
            ]),
          );

        it('plans all four Publications, prices only the two print ones, keeps the unpriced reason, and executes no zero-valued Price', async () => {
          const { sourcePlan, commercial, resolveWith } = await upload(
            uolpShapedOnix((manifestation) => (isDigital(manifestation) ? DIGITAL_RIGHTS : ''), supplyOf()),
          );
          const unanswered = resolveWith().sidecar;
          const { plan, sidecar } = resolveWith(answered(sourcePlan, unanswered));
          const keyOf = (isbn: string) =>
            sourcePlan.records.find(({ recordReference }) => recordReference === isbn)?.productKey as string;

          // Nothing about the prices is a decision: every blocker the unanswered plan had was #209's.
          expect(unanswered.blockers.filter(({ code }) => code.startsWith('COMMERCIAL_'))).toEqual([]);
          expect(sidecar.blockers).toEqual([]);
          expect(sidecar.commercial).toBe(commercial);
          expect(sidecar.products.map(({ action, publicationType }) => [action, publicationType])).toEqual(
            MANIFESTATIONS.map(({ type }) => ['CREATE_PUBLICATION', type]),
          );
          // Exactly the two genuine print prices become target Prices, each on its own Publication.
          expect(priceOf(plan)).toEqual([
            [PublicationType.enum.Hardback, [['GBP', 75]]],
            [PublicationType.enum.Paperback, [['GBP', 24.99]]],
            [PublicationType.enum.Epub, []],
            [PublicationType.enum.Pdf, []],
          ]);

          // The unpriced reason stays in the canonical evidence, exactly where each digital record states it...
          const digital = MANIFESTATIONS.filter(isDigital);
          const unpriced = commercial.findings.filter(({ code }) => code === 'PRICE_UNPRICED');
          expect(
            unpriced.map(({ productKey, blocking, detail, locations }) => [
              productKey,
              blocking,
              detail,
              locations.map(({ path }) => path),
            ]),
          ).toEqual(
            digital.map(({ isbn }) => {
              const record = sourcePlan.records.find(({ recordReference }) => recordReference === isbn);

              return [
                keyOf(isbn),
                false,
                { reason: '01', label: 'Free of charge', currency: 'GBP' },
                [`${record?.path}/ProductSupply[1]/SupplyDetail[1]/Price[1]/UnpricedItemType[1]`],
              ];
            }),
          );
          expect(
            digital.map(
              ({ isbn }) => commercial.products[keyOf(isbn)].supplies[0].supplyDetails[0].prices[0].unpricedItemType,
            ),
          ).toEqual(['01', '01']);
          // ...and the print prices they give for comparison are never theirs.
          expect(
            commercial.findings
              .filter(({ code }) => code === 'PRICE_COMPARISON_NOT_REPRESENTED')
              .map(({ productKey, detail }) => [productKey, detail]),
          ).toEqual(
            digital.map(({ isbn }) => [
              keyOf(isbn),
              { comparisons: ['GBP 75.00 (9781800000018)', 'GBP 24.99 (9781800000025)'] },
            ]),
          );
          // An unpriced reason decides no licence: the Work's is the rights reduction's alone.
          expect(plan?.works.map(({ license }) => license)).toEqual([
            'https://creativecommons.org/licenses/by-nc-nd/4.0/',
          ]);

          await workService.bulkCreateWorks(plan as ImportPlan);

          expect(mutationsNamed('CreatePublication')).toHaveLength(4);
          const created = mutationsNamed('CreatePrice').map(
            ({ variables }) => variables.data as { currencyCode: string; unitPrice: number },
          );
          expect(created.map(({ currencyCode, unitPrice }) => [currencyCode, unitPrice]).sort()).toEqual([
            ['GBP', 24.99],
            ['GBP', 75],
          ]);
          expect(created.every(({ unitPrice }) => unitPrice > 0)).toBe(true);
        });

        it('sets no licence from an unpriced reason where no manifestation states one', async () => {
          const { sourcePlan, rights, commercial, resolveWith } = await upload(uolpShapedOnix(() => '', supplyOf()));
          const { plan, sidecar } = resolveWith(answered(sourcePlan, resolveWith().sidecar));

          expect(sidecar.blockers).toEqual([]);
          expect(rights.findings).toEqual([]);
          expect(commercial.findings.filter(({ code }) => code === 'PRICE_UNPRICED')).toHaveLength(2);
          expect(plan?.works.map(({ license }) => license)).toEqual(['']);
        });

        it('asks the publisher about each print price stating PriceQualifier 05, as the real file does, and creates exactly the amount chosen - or none - never a zero', async () => {
          const { sourcePlan, commercial, resolveWith } = await upload(
            uolpShapedOnix(
              (manifestation) => (isDigital(manifestation) ? DIGITAL_RIGHTS : ''),
              supplyOf('<PriceQualifier>05</PriceQualifier>'),
            ),
          );
          const decisions = answered(sourcePlan, resolveWith().sidecar);
          const keyOf = (isbn: string) =>
            sourcePlan.records.find(({ recordReference }) => recordReference === isbn)?.productKey as string;
          const [hardback, paperback] = commercial.findings.filter(({ code }) => code === 'PRICE_NOT_AUTOMATIC');
          const candidatesOf = ({ resolution }: typeof hardback) =>
            resolution.kind === 'PRICE_CHOICE' ? resolution.candidates : [];

          // ONIX-AUDIT-PRODUCT-SUPPLY-01 rule 25: a qualified price is neither taken nor dropped by itself. Each print
          // price is a decision for the publisher; the unpriced digital Publications ask nothing.
          expect(
            [hardback, paperback].map((finding) => [
              finding.productKey,
              finding.classification,
              finding.blocking,
              candidatesOf(finding).map(({ amount, exclusions, lost }) => [amount, exclusions, lost]),
            ]),
          ).toEqual([
            [
              keyOf('9781800000018'),
              'TARGET_INPUT_REQUIRED',
              true,
              [['75.00', ['QUALIFIED'], ['PriceType', 'PriceQualifier', 'PriceStatus', 'Market']]],
            ],
            [
              keyOf('9781800000025'),
              'TARGET_INPUT_REQUIRED',
              true,
              [['24.99', ['QUALIFIED'], ['PriceType', 'PriceQualifier', 'PriceStatus', 'Market']]],
            ],
          ]);

          const unanswered = resolveWith(decisions);

          expect(unanswered.plan).toBeNull();
          expect(
            unanswered.sidecar.blockers.map(({ code, productKey, detail }) => [code, productKey, detail.finding]),
          ).toEqual([
            ['COMMERCIAL_CHOICE_REQUIRED', keyOf('9781800000018'), 'PRICE_NOT_AUTOMATIC'],
            ['COMMERCIAL_CHOICE_REQUIRED', keyOf('9781800000025'), 'PRICE_NOT_AUTOMATIC'],
          ]);

          // The publisher takes the hardback's 75.00, its qualifier not recorded, and declines the paperback's price.
          const commercialChoices = {
            [hardback.key]: candidatesOf(hardback)[0].key,
            [paperback.key]: ONIX_PRICE_OMIT,
          };
          const { plan, sidecar } = resolveWith({ ...decisions, commercialChoices });

          expect(sidecar.blockers).toEqual([]);
          expect(sidecar.inputs.commercialChoices).toEqual(commercialChoices);
          expect(priceOf(plan)).toEqual([
            [PublicationType.enum.Hardback, [['GBP', 75]]],
            [PublicationType.enum.Paperback, []],
            [PublicationType.enum.Epub, []],
            [PublicationType.enum.Pdf, []],
          ]);
          expect(
            sidecar.priceResolutions?.map(({ productKey, basis, unitPrice }) => [productKey, basis, unitPrice]),
          ).toEqual([
            [keyOf('9781800000018'), 'PUBLISHER_CHOICE', 75],
            [keyOf('9781800000025'), 'PUBLISHER_OMISSION', null],
          ]);

          await workService.bulkCreateWorks(plan as ImportPlan);

          // Execution sends exactly the chosen amount: no declined price, and no zero-valued one.
          expect(mutationsNamed('CreatePublication')).toHaveLength(4);
          expect(
            mutationsNamed('CreatePrice').map(({ variables }) => (variables.data as { unitPrice: number }).unitPrice),
          ).toEqual([75]);
        });
      });
    });
  });
});
