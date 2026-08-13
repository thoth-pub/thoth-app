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

import { currencyOptions, languageOptions, licenseOptions, SubjectTypes, WorkStatuses } from '../../constants';
import { SeriesType } from '../../constants/series';
import { collectWorkIdentifiers } from '../../utils/importPreflight/identifiers';
import { ExtendedONIXMessageRoot } from './interfaces';
import { toOnixArray } from './onix';
import XMLParser from './XMLParser';

/**
 * End-to-end cover for the whole bulk-import path: a real ONIX document parsed by the real
 * `@5stones/onix`, planned by the real `XMLParser`, then imported by the real `WorkService`
 * wired to real `SeriesService`, `TitleService` and friends.
 *
 * Only the GraphQL transport is stubbed, so the assertions are about the mutations the app
 * would actually send — not about a mocked service being called.
 */

const IMPRINT_ID = '11111111-1111-1111-1111-111111111111';
const IMPRINT_NAME = 'Arc Humanities Press';
const FOUNDATIONS_ID = '22222222-2222-2222-2222-222222222222';
const CREATED_SERIES_ID = '33333333-3333-3333-3333-333333333333';

/** Three products in a series Thoth does not have, one in a series it does. */
const product = (isbn: string, title: string, seriesName: string, collectionType = '10', contributorName?: string) => `
  <Product>
    <RecordReference>${isbn}</RecordReference>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>${collectionType}</CollectionType>
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
    </PublishingDetail>
  </Product>`;

const ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  ${product('9781641891783', 'A Companion to the Cavendishes', 'Arc Companions')}
  ${product('9781641893763', 'The Medieval Womb', 'Arc Companions')}
  ${product('9781802704488', 'Beowulf by All', 'Foundations')}
  ${product('9781802703306', 'Trans Histories of the Medieval Book', 'Arc Companions')}
</ONIXMessage>`;

/** A compact production-shaped Arc file: repeated contributor, no affiliation or ROR metadata. */
const ARC_CONTRIBUTOR_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  ${product('9781641891783', 'A Companion to the Cavendishes', 'Arc Companions', '10', 'Jane Doe')}
  ${product('9781641893763', 'The Medieval Womb', 'Arc Companions', '10', 'Jane Doe')}
</ONIXMessage>`;

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
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
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
        <BiographicalNote textformat="06">Lisa Hopkins is co-editor of &lt;I&gt;Shakespeare&lt;/I&gt;.</BiographicalNote>
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
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
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
        <BiographicalNote textformat="06">Lisa Hopkins is Professor Emerita of English and co-editor of &lt;I&gt;Shakespeare&lt;/I&gt;.</BiographicalNote>
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
    </PublishingDetail>
  </Product>
  <Product>
    <RecordReference>9781641893763</RecordReference>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641893763</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
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
        <BiographicalNote textformat="02">&lt;p&gt;Gregory Leighton earned his PhD in History.&lt;/p&gt;&lt;p&gt;&lt;br&gt;&lt;/p&gt;</BiographicalNote>
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
        <BiographicalNote textformat="06">Anna Bentkowska-Kafel is an art historian with a special interest in the use of 3D electronic imaging in documentation and scholarly interpretation of art.</BiographicalNote>
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
        <BiographicalNote textformat="06">Lindsay MacDonald, Research Associate in the Faculty of Engineering Science, University College London, is a colour scientist specializing in imaging applications</BiographicalNote>
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
 * One product in the shapes Thoth's own ONIX 3 exporter writes: the work's DOI as
 * ProductIdentifier 06 carrying the bare `10.…` its `Doi` Display produces, the canonical title
 * tagged with the language its locale converts to, a second title as TitleType 06, the issue
 * ordinal as CollectionSequenceType 03 behind a sequence of another type, a chapter whose DOI is
 * a TextItemIdentifier of type 06, publication and withdrawn dates as `dateformat="00"` YYYYMMDD,
 * the work's other ISBN as relation 06, and a citation as relation 34 — written here in the
 * `dx.doi.org` form a real sender might use, which is the same DOI as the bare one.
 */
const THOTH_SHAPED_ONIX = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/work</IDValue></ProductIdentifier>
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
        <TextItem>
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
        <WorkRelationCode>29</WorkRelationCode>
        <WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/original</IDValue></WorkIdentifier>
      </RelatedWork>
    </RelatedMaterial>
  </Product>
</ONIXMessage>`;

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

  const parseUpload = async (serieses: SeriesEntity[], onix = ONIX) => {
    // Step 1: what app/actions/validateXml.ts does.
    const xml = (await parse(onix)) as ExtendedONIXMessageRoot;

    // Step 2: what XMLParse.tsx does.
    const parser = new XMLParser(
      xml,
      [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
      licenseOptions,
      serieses,
      { getContributors: async () => [] } as never,
      { getInstitutions: async () => [] } as never,
      languageOptions,
      currencyOptions,
    );

    return parser.parse();
  };

  const mutationsNamed = (operation: string) => mutations.filter((call) => call.operation === operation);

  it('real ONIX parsing preserves Arc product semantics and coalesces affiliation-free contributors', async () => {
    const xml = (await parse(ARC_CONTRIBUTOR_ONIX)) as ExtendedONIXMessageRoot;
    const products = Array.isArray(xml.ONIXMessage.Product) ? xml.ONIXMessage.Product : [xml.ONIXMessage.Product];
    const getContributors = vi.fn().mockResolvedValue([]);
    const getInstitutions = vi.fn().mockResolvedValue([]);
    const parser = new XMLParser(
      xml,
      [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
      licenseOptions,
      [],
      { getContributors } as never,
      { getInstitutions } as never,
      languageOptions,
      currencyOptions,
    );

    // This assertion is deliberately before XMLParser: the library itself has produced two
    // products with contributors, rather than this test constructing its parsed object shape.
    expect(products).toHaveLength(2);
    expect(products.every((item) => item?.DescriptiveDetail?.Contributor !== undefined)).toBe(true);

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works.map((work) => work.titles[0].title)).toEqual([
      'A Companion to the Cavendishes',
      'The Medieval Womb',
    ]);
    expect(
      result.data.plan.works.map((work) => work.titles.map(({ title, canonical }) => ({ title, canonical }))),
    ).toEqual([
      [{ title: 'A Companion to the Cavendishes', canonical: true }],
      [{ title: 'The Medieval Womb', canonical: true }],
    ]);
    expect(result.data.plan.series).toEqual([
      {
        name: 'Arc Companions',
        target: {
          kind: 'proposed',
          series: { name: 'Arc Companions', type: SeriesType.enum.BookSeries, imprintId: IMPRINT_ID },
        },
        members: [
          { workId: result.data.plan.works[0].id, orderNumber: 1 },
          { workId: result.data.plan.works[1].id, orderNumber: 2 },
        ],
      },
    ]);
    expect(result.data.plan.works.map((work) => work.contributions[0].fullName)).toEqual(['Jane Doe', 'Jane Doe']);
    expect(getContributors).toHaveBeenCalledTimes(1);
    expect(getContributors).toHaveBeenCalledWith('Jane Doe');
    expect(getInstitutions).not.toHaveBeenCalled();
    expect(result.issues).not.toContainEqual(expect.objectContaining({ code: 'onix.processing_failed' }));
  });

  it('uploads, previews, confirms, and creates the missing series with its issues', async () => {
    const result = await parseUpload([foundations]);

    // --- upload + preview -------------------------------------------------
    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    // The plan the parser produced is the plan the import runs: nothing is reassembled here.
    const plan = result.data.plan;

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
      // Appended after the two issues Foundations already has.
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
    // The file is accepted: a warning is not a validation failure.
    expect(result.status).toBe('success');
    const plan = result.data.plan;

    expect(plan.works.map((work) => work.titles[0].title)).toEqual(['A Companion to the Cavendishes']);

    // Nothing to create and nothing to attach to: the association is simply absent.
    expect(plan.series).toEqual([]);
    expect(result.issues).toEqual([
      {
        severity: 'warning',
        code: 'onix.series.non_publisher_collection_skipped',
        message: expect.stringContaining('"Editorial Studies" does not exist in Thoth and will not be created'),
        source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
      },
    ]);

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

    // The plan the parser produced is the plan the import runs.
    const plan = result.data.plan;
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
      // The chapter's own title, created after the work's, in the language its TitleText claims.
      // `canonical: false` is what `parseChapters` has always produced; not this pass's subject.
      expect.objectContaining({ title: 'Premier chapitre', canonical: false, localeCode: LocaleCode.Fr }),
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

    // The plan the parser produced is the plan the import runs: nothing is reassembled here.
    const plan = result.data.plan;
    const [work] = plan.works;
    const [chapter] = plan.chapters;

    // --- what the preview shows --------------------------------------------
    expect(work.doi).toBe('https://doi.org/10.1234/work');
    expect(chapter.doi).toBe('https://doi.org/10.1234/work.ch1');
    expect([work.publicationDate, work.withdrawnDate]).toEqual(['2024-08-07', '2025-01-31']);
    expect(work.references.map(({ doi }) => doi)).toEqual(['https://doi.org/10.1234/cited']);

    // The corrected DOI is what the duplicate preflight compares, with no preflight change.
    expect(collectWorkIdentifiers(work)).toContainEqual({ basis: 'doi', value: 'https://doi.org/10.1234/work' });

    // --- confirmation: the plan is the payload ------------------------------
    await workService.bulkCreateWorks(plan);

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
    expect(result.issues.map(({ severity, code }) => [severity, code])).toEqual([
      ['warning', 'onix.date.incompatible_status'],
    ]);

    const plan = result.data.plan;

    expect([plan.works[0].publicationDate, plan.works[0].withdrawnDate]).toEqual(['2024-08-07', '']);

    await workService.bulkCreateWorks(plan);

    mutationsNamed('CreateWork').forEach((call) =>
      expect(call.variables.data).toMatchObject({ publicationDate: '2024-08-07', withdrawnDate: null }),
    );
  });

  it('round-trips the subject field policy emitted by Thoth ONIX', async () => {
    const result = await parseUpload([], THOTH_SUBJECT_ROUND_TRIP_ONIX);

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    expect(result.data.plan.works[0].subjects.map(({ type, code }) => ({ type, code }))).toEqual([
      { type: SubjectTypes.enum.Lcc, code: 'JA85' },
      { type: SubjectTypes.enum.Bisac, code: 'AAA000000' },
      { type: SubjectTypes.enum.Bic, code: 'AAB' },
      { type: SubjectTypes.enum.Keyword, code: 'keyword1' },
      { type: SubjectTypes.enum.Thema, code: 'ATXZ1' },
      { type: SubjectTypes.enum.Custom, code: 'custom1' },
    ]);
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
    const parser = new XMLParser(
      xml,
      [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
      licenseOptions,
      [],
      { getContributors } as never,
      { getInstitutions } as never,
      languageOptions,
      currencyOptions,
    );

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    expect(wrappedThema?.SubjectCode).toMatchObject({ '#text': 'DSBD', '@_textscript': 'Latn' });
    expect(wrappedThema?.SubjectHeadingText).toMatchObject({
      '#text': 'Literary studies: c 1600 to c 1800',
      '@_language': 'eng',
    });

    const plan = result.data.plan;

    // --- what the preview shows: works in source order, titles intact -------
    expect(plan.works.map((work) => work.titles[0].title)).toEqual([
      'A Companion to the Cavendishes',
      'The Medieval Womb',
    ]);
    expect(plan.series.map((group) => ({ name: group.name, kind: group.target.kind }))).toEqual([
      { name: 'Arc Companions', kind: 'proposed' },
    ]);
    expect(plan.works[0].subjects.map(({ type, code, ordinal }) => ({ type, code, ordinal }))).toEqual([
      { type: SubjectTypes.enum.Bisac, code: 'LIT004290', ordinal: 1 },
      { type: SubjectTypes.enum.Bisac, code: 'HIS037020', ordinal: 2 },
      { type: SubjectTypes.enum.Bic, code: 'DSBD', ordinal: 3 },
      { type: SubjectTypes.enum.Bic, code: 'HBLH', ordinal: 4 },
      {
        type: SubjectTypes.enum.Keyword,
        code: 'literary culture; aristocratic life; women’s writing; closet drama; iconography',
        ordinal: 5,
      },
      { type: SubjectTypes.enum.Thema, code: 'DSBD', ordinal: 6 },
      { type: SubjectTypes.enum.Thema, code: 'NHDL', ordinal: 7 },
    ]);

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

    expect(subjectCalls).toEqual([
      expect.objectContaining({ subjectType: SubjectTypes.enum.Bisac, subjectCode: 'LIT004290' }),
      expect.objectContaining({ subjectType: SubjectTypes.enum.Bisac, subjectCode: 'HIS037020' }),
      expect.objectContaining({ subjectType: SubjectTypes.enum.Bic, subjectCode: 'DSBD' }),
      expect.objectContaining({ subjectType: SubjectTypes.enum.Bic, subjectCode: 'HBLH' }),
      expect.objectContaining({
        subjectType: SubjectTypes.enum.Keyword,
        subjectCode: 'literary culture; aristocratic life; women’s writing; closet drama; iconography',
      }),
      expect.objectContaining({ subjectType: SubjectTypes.enum.Thema, subjectCode: 'DSBD' }),
      expect.objectContaining({ subjectType: SubjectTypes.enum.Thema, subjectCode: 'NHDL' }),
    ]);
    expect(subjectCalls.filter(({ subjectType }) => subjectType === SubjectTypes.enum.Thema)).toEqual([
      expect.objectContaining({ subjectCode: 'DSBD' }),
      expect.objectContaining({ subjectCode: 'NHDL' }),
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

    const plan = result.data.plan;
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

  it('blocks a meaningful-line-break abstract in preview, so no mutation ever runs', async () => {
    // The non-negotiable guarantee: a deterministic markup incompatibility is discovered before
    // bulkCreateWorks, not after several earlier works have already been created.
    const result = await parseUpload([], arcSpacerOnix('&lt;p&gt;Hello&lt;br&gt;world&lt;/p&gt;'));

    expect(result.status).toBe('failed');
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'onix.text.unrepresentable_structure',
        source: { kind: 'onix', productIndex: 1, recordReference: '9781802700596' },
      }),
    );
    expect(result.data.plan.works).toEqual([]);

    await workService.bulkCreateWorks(result.data.plan);

    // Zero side effects, not merely an eventual error message.
    expect(mutationsNamed('CreateWork')).toEqual([]);
    expect(mutationsNamed('CreateAbstract')).toEqual([]);
    expect(mutationsNamed('CreateContributor')).toEqual([]);
    expect(mutationsNamed('CreateContribution')).toEqual([]);
    expect(mutationsNamed('CreateBiography')).toEqual([]);
    expect(mutationsNamed('CreateSubject')).toEqual([]);
    expect(mutations).toEqual([]);
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

    // Both textformat="06" biographies are single-line plain text and pass the new guard untouched.
    const biographies = work.contributions.flatMap((contribution) => contribution.biographies);
    expect(biographies.map(({ sourceMarkupFormat }) => sourceMarkupFormat)).toEqual([
      MarkupFormat.PlainText,
      MarkupFormat.PlainText,
    ]);
  });

  it('sends product 9781942401353 to CREATE_ABSTRACT as the collapsed one-line plain text', async () => {
    // The mutation boundary itself: what the API would actually receive, not just the plan.
    const result = await parseUpload([], ARC_PRODUCT_8_ONIX);

    await workService.bulkCreateWorks(result.data.plan);

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

    await workService.bulkCreateWorks(result.data.plan);

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

    await workService.bulkCreateWorks(result.data.plan);

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
    const plan = result.data.plan;

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

    const parseArc = async (getContributors: (name: string) => Promise<unknown[]>) => {
      const xml = (await parse(ARC_MULTI_CONTRIBUTOR_ONIX)) as ExtendedONIXMessageRoot;
      const parser = new XMLParser(
        xml,
        [{ label: IMPRINT_NAME, value: IMPRINT_ID }],
        licenseOptions,
        [],
        { getContributors } as never,
        { getInstitutions: async () => [] } as never,
        languageOptions,
        currencyOptions,
      );

      return parser.parse();
    };

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

      const [work] = result.data.plan.works;

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
      expect(result.data.plan.series.map((group) => ({ name: group.name, kind: group.target.kind }))).toEqual([
        { name: 'Arc Companions', kind: 'proposed' },
      ]);
      expect(
        work.contributions[0].biographies.map(({ content, sourceMarkupFormat }) => [content, sourceMarkupFormat]),
      ).toEqual([['Lisa Hopkins is co-editor of <I>Shakespeare</I>.', MarkupFormat.Html]]);
      // No ROR anywhere, so no institution lookup was provoked.
      expect(getContributors).toHaveBeenCalledTimes(2);
    });

    it('sends CREATE_CONTRIBUTION ordinals 1 and 2, never 1 and 1', async () => {
      await parseArc(async () => []).then((result) => workService.bulkCreateWorks(result.data.plan));

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

      // Mirror ContributorsSelection.applySelections: swap Tom's planned contribution for the
      // existing-record option the parser already tagged with Tom's resolved ordinal.
      const [work] = result.data.plan.works;
      const tomItem = Object.values(result.data.contributorsForSelection[work.id]).find(
        (options) => options[0].fullName === 'Tom Rutter',
      );
      const chosenTom = tomItem?.find((option) => option.contributorId === 'existing-tom');
      // Both of Tom's options carry ordinal 2 — the ordinal is fixed before identity is chosen.
      expect(tomItem?.map(({ orderNumber }) => orderNumber)).toEqual([2, 2]);
      const { selected: _selected, lastContribution: _lastContribution, ...chosenTomContribution } = chosenTom!;
      const selectedPlan = {
        ...result.data.plan,
        works: [
          {
            ...work,
            contributions: work.contributions.map((contribution) =>
              contribution.fullName === 'Tom Rutter' ? chosenTomContribution : contribution,
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
});
