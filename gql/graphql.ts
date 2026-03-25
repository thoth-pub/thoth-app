/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * Date in the proleptic Gregorian calendar (without time zone).
   *
   * Represents a description of the date (as used for birthdays, for example).
   * It cannot represent an instant on the time-line.
   *
   * [`Date` scalar][1] compliant.
   *
   * See also [`chrono::NaiveDate`][2] for details.
   *
   * [1]: https://graphql-scalars.dev/docs/scalars/date
   * [2]: https://docs.rs/chrono/latest/chrono/naive/struct.NaiveDate.html
   */
  Date: { input: any; output: any; }
  /** Digital Object Identifier. Expressed as `^https:\/\/doi\.org\/10\.\d{4,9}\/[-._;()\/:a-zA-Z0-9<>+\[\]]+$` */
  Doi: { input: any; output: any; }
  /** 13-digit International Standard Book Number, with its parts separated by hyphens */
  Isbn: { input: any; output: any; }
  /** ORCID (Open Researcher and Contributor ID) identifier. Expressed as `^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$` */
  Orcid: { input: any; output: any; }
  /** ROR (Research Organization Registry) identifier. Expressed as `^https:\/\/ror\.org\/0[a-hjkmnp-z0-9]{6}\d{2}$` */
  Ror: { input: any; output: any; }
  /** RFC 3339 combined date and time in UTC time zone (e.g. "1999-12-31T23:59:00Z") */
  Timestamp: { input: any; output: any; }
  Uuid: { input: any; output: any; }
};

/** An abstract associated with a work. */
export type Abstract = {
  __typename?: 'Abstract';
  /** Thoth ID of the abstract */
  abstractId: Scalars['Uuid']['output'];
  /** Type of the abstract */
  abstractType: AbstractType;
  /** Whether this is the canonical abstract for the work */
  canonical: Scalars['Boolean']['output'];
  /** Content of the abstract */
  content: Scalars['String']['output'];
  /** Locale code of the abstract */
  localeCode: LocaleCode;
  /** Get the work to which the abstract is linked */
  work: Work;
  /** Thoth ID of the work to which the abstract is linked */
  workId: Scalars['Uuid']['output'];
};

/** Field to use when sorting abstract list */
export enum AbstractField {
  AbstractId = 'ABSTRACT_ID',
  AbstractType = 'ABSTRACT_TYPE',
  Canonical = 'CANONICAL',
  Content = 'CONTENT',
  LocaleCode = 'LOCALE_CODE',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting titles list */
export type AbstractOrderBy = {
  direction: Direction;
  field: AbstractField;
};

/** BCP-47 code representing locale */
export enum AbstractType {
  /** Long */
  Long = 'LONG',
  /** Short */
  Short = 'SHORT'
}

/** Reason for publication not being required to comply with accessibility standards */
export enum AccessibilityException {
  /** Making the publication accessible would financially overburden the publisher */
  DisproportionateBurden = 'DISPROPORTIONATE_BURDEN',
  /** Making the publication accessible would fundamentally modify the nature of it */
  FundamentalAlteration = 'FUNDAMENTAL_ALTERATION',
  /** Publisher is a micro-enterprise */
  MicroEnterprises = 'MICRO_ENTERPRISES'
}

/** Standardised specification for accessibility to which a publication may conform */
export enum AccessibilityStandard {
  /** EPUB Accessibility Specification 1.0 AA */
  EpubA11Y10Aa = 'EPUB_A11Y10AA',
  /** EPUB Accessibility Specification 1.0 AAA */
  EpubA11Y10Aaa = 'EPUB_A11Y10AAA',
  /** EPUB Accessibility Specification 1.1 AA */
  EpubA11Y11Aa = 'EPUB_A11Y11AA',
  /** EPUB Accessibility Specification 1.1 AAA */
  EpubA11Y11Aaa = 'EPUB_A11Y11AAA',
  /** PDF/UA-1 */
  PdfUa1 = 'PDF_UA1',
  /** PDF/UA-2 */
  PdfUa2 = 'PDF_UA2',
  /** WCAG 2.1 AA */
  Wcag21Aa = 'WCAG21AA',
  /** WCAG 2.1 AAA */
  Wcag21Aaa = 'WCAG21AAA',
  /** WCAG 2.2 AA */
  Wcag22Aa = 'WCAG22AA',
  /** WCAG 2.2 AAA */
  Wcag22Aaa = 'WCAG22AAA'
}

/** Field to use when sorting additional resources list */
export enum AdditionalResourceField {
  AdditionalResourceId = 'ADDITIONAL_RESOURCE_ID',
  Attribution = 'ATTRIBUTION',
  CreatedAt = 'CREATED_AT',
  Date = 'DATE',
  Doi = 'DOI',
  Handle = 'HANDLE',
  ResourceOrdinal = 'RESOURCE_ORDINAL',
  ResourceType = 'RESOURCE_TYPE',
  Title = 'TITLE',
  UpdatedAt = 'UPDATED_AT',
  Url = 'URL',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting additional resources list */
export type AdditionalResourceOrderBy = {
  direction: Direction;
  field: AdditionalResourceField;
};

/** An association between a person and an institution for a specific contribution. */
export type Affiliation = {
  __typename?: 'Affiliation';
  /** Thoth ID of the affiliation */
  affiliationId: Scalars['Uuid']['output'];
  /** Number representing this affiliation's position in an ordered list of affiliations within the contribution */
  affiliationOrdinal: Scalars['Int']['output'];
  /** Get the contribution linked to this affiliation */
  contribution: Contribution;
  /** Thoth ID of the contribution linked to this affiliation */
  contributionId: Scalars['Uuid']['output'];
  /** Date and time at which the affiliation record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Get the institution linked to this affiliation */
  institution: Institution;
  /** Thoth ID of the institution linked to this affiliation */
  institutionId: Scalars['Uuid']['output'];
  /** Position of the contributor at the institution at the time of contribution */
  position?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the affiliation record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
};

/** Field to use when sorting affiliations list */
export enum AffiliationField {
  AffiliationId = 'AFFILIATION_ID',
  AffiliationOrdinal = 'AFFILIATION_ORDINAL',
  ContributionId = 'CONTRIBUTION_ID',
  CreatedAt = 'CREATED_AT',
  InstitutionId = 'INSTITUTION_ID',
  Position = 'POSITION',
  UpdatedAt = 'UPDATED_AT'
}

/** Field and order to use when sorting affiliations list */
export type AffiliationOrderBy = {
  direction: Direction;
  field: AffiliationField;
};

/** An award linked to a work. */
export type Award = {
  __typename?: 'Award';
  /** Thoth ID of the award */
  awardId: Scalars['Uuid']['output'];
  /** Number representing this award's position in an ordered list of awards within the work */
  awardOrdinal: Scalars['Int']['output'];
  /** Category of the award */
  category?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the award record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Prize statement for this award */
  prizeStatement?: Maybe<Scalars['String']['output']>;
  /** Role of the work in this award */
  role?: Maybe<AwardRole>;
  /** Title of the award */
  title: Scalars['String']['output'];
  /** Date and time at which the award record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** URL of the award page */
  url?: Maybe<Scalars['String']['output']>;
  /** Get the work linked to this award */
  work: Work;
  /** Thoth ID of the work to which this award belongs */
  workId: Scalars['Uuid']['output'];
};


/** An award linked to a work. */
export type AwardPrizeStatementArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
};


/** An award linked to a work. */
export type AwardTitleArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
};

/** Field to use when sorting awards list */
export enum AwardField {
  AwardId = 'AWARD_ID',
  AwardOrdinal = 'AWARD_ORDINAL',
  Category = 'CATEGORY',
  CreatedAt = 'CREATED_AT',
  Role = 'ROLE',
  Title = 'TITLE',
  UpdatedAt = 'UPDATED_AT',
  Url = 'URL',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting awards list */
export type AwardOrderBy = {
  direction: Direction;
  field: AwardField;
};

/** Role of the work in an award */
export enum AwardRole {
  Commended = 'COMMENDED',
  JointWinner = 'JOINT_WINNER',
  LongListed = 'LONG_LISTED',
  Nominated = 'NOMINATED',
  RunnerUp = 'RUNNER_UP',
  ShortListed = 'SHORT_LISTED',
  Winner = 'WINNER'
}

/** A biography associated with a work and contribution. */
export type Biography = {
  __typename?: 'Biography';
  /** Thoth ID of the biography */
  biographyId: Scalars['Uuid']['output'];
  /** Whether this is the canonical biography for the contribution/work */
  canonical: Scalars['Boolean']['output'];
  /** Content of the biography */
  content: Scalars['String']['output'];
  /** Get the contribution to which the biography is linked */
  contribution: Contribution;
  /** Thoth ID of the contribution to which the biography is linked */
  contributionId: Scalars['Uuid']['output'];
  /** Locale code of the biography */
  localeCode: LocaleCode;
  /** Get the work to which the biography is linked via contribution */
  work: Work;
};

/** Field to use when sorting biography list */
export enum BiographyField {
  BiographyId = 'BIOGRAPHY_ID',
  Canonical = 'CANONICAL',
  Content = 'CONTENT',
  ContributionId = 'CONTRIBUTION_ID',
  LocaleCode = 'LOCALE_CODE'
}

/** Field and order to use when sorting biography list */
export type BiographyOrderBy = {
  direction: Direction;
  field: BiographyField;
};

/** A review of a work. */
export type BookReview = {
  __typename?: 'BookReview';
  /** Name of the review author */
  authorName?: Maybe<Scalars['String']['output']>;
  /** Thoth ID of the book review */
  bookReviewId: Scalars['Uuid']['output'];
  /** Date and time at which the review record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** DOI of the review as full URL, using the HTTPS scheme and the doi.org domain */
  doi?: Maybe<Scalars['Doi']['output']>;
  /** ISSN of the journal where the review was published */
  journalIssn?: Maybe<Scalars['String']['output']>;
  /** Name of the journal where the review was published */
  journalName?: Maybe<Scalars['String']['output']>;
  /** Number of the journal where the review was published */
  journalNumber?: Maybe<Scalars['String']['output']>;
  /** Volume of the journal where the review was published */
  journalVolume?: Maybe<Scalars['String']['output']>;
  /** Page range of the review */
  pageRange?: Maybe<Scalars['String']['output']>;
  /** Publication date of the review */
  reviewDate?: Maybe<Scalars['Date']['output']>;
  /** Number representing this review's position in an ordered list of reviews within the work */
  reviewOrdinal: Scalars['Int']['output'];
  /** Get the reviewer's institution */
  reviewerInstitution?: Maybe<Institution>;
  /** Thoth ID of the reviewer's institution */
  reviewerInstitutionId?: Maybe<Scalars['Uuid']['output']>;
  /** ORCID (Open Researcher and Contributor ID) of the reviewer as full URL, using the HTTPS scheme and the orcid.org domain */
  reviewerOrcid?: Maybe<Scalars['Orcid']['output']>;
  /** Text of the review */
  text?: Maybe<Scalars['String']['output']>;
  /** Title of the review */
  title?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the review record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** URL of the review publication */
  url?: Maybe<Scalars['String']['output']>;
  /** Get the work linked to this review */
  work: Work;
  /** Thoth ID of the work to which this review belongs */
  workId: Scalars['Uuid']['output'];
};


/** A review of a work. */
export type BookReviewTextArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
};


/** A review of a work. */
export type BookReviewTitleArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
};

/** Field to use when sorting book reviews list */
export enum BookReviewField {
  AuthorName = 'AUTHOR_NAME',
  BookReviewId = 'BOOK_REVIEW_ID',
  CreatedAt = 'CREATED_AT',
  JournalName = 'JOURNAL_NAME',
  ReviewDate = 'REVIEW_DATE',
  ReviewOrdinal = 'REVIEW_ORDINAL',
  Title = 'TITLE',
  UpdatedAt = 'UPDATED_AT',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting book reviews list */
export type BookReviewOrderBy = {
  direction: Direction;
  field: BookReviewField;
};

/** Input for completing a file upload and promoting it to its final DOI-based location. */
export type CompleteFileUpload = {
  /** ID of the upload session to complete. */
  fileUploadId: Scalars['Uuid']['input'];
};

/** A way to get in touch with a publisher. */
export type Contact = {
  __typename?: 'Contact';
  /** Thoth ID of the contact */
  contactId: Scalars['Uuid']['output'];
  /** Type of the contact */
  contactType: ContactType;
  /** Date and time at which the contact record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Email address of the contact */
  email: Scalars['String']['output'];
  /** Get the publisher to which this contact belongs */
  publisher: Publisher;
  /** Thoth ID of the publisher to which this contact belongs */
  publisherId: Scalars['Uuid']['output'];
  /** Date and time at which the contact record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
};

/** Field to use when sorting contacts list */
export enum ContactField {
  ContactId = 'CONTACT_ID',
  ContactType = 'CONTACT_TYPE',
  CreatedAt = 'CREATED_AT',
  Email = 'EMAIL',
  PublisherId = 'PUBLISHER_ID',
  UpdatedAt = 'UPDATED_AT'
}

/** Field and order to use when sorting contacts list */
export type ContactOrderBy = {
  direction: Direction;
  field: ContactField;
};

/** Type of a contact */
export enum ContactType {
  /** Contact for accessibility queries */
  Accessibility = 'ACCESSIBILITY'
}

/** A person's involvement in the production of a written text. */
export type Contribution = {
  __typename?: 'Contribution';
  /** Get affiliations linked to this contribution */
  affiliations: Array<Affiliation>;
  /** Query the full list of biographies */
  biographies: Array<Biography>;
  /**
   * Biography of the contributor at the time of contribution
   * @deprecated Please use Contribution `biographies` field instead to get the correct biography in a multilingual manner
   */
  biography?: Maybe<Scalars['String']['output']>;
  /** Thoth ID of the contribution */
  contributionId: Scalars['Uuid']['output'];
  /** Number representing this contribution's position in an ordered list of contributions within the work */
  contributionOrdinal: Scalars['Int']['output'];
  /** Nature of the contribution */
  contributionType: ContributionType;
  /** Get the contributor who created the contribution */
  contributor: Contributor;
  /** Thoth ID of the contributor who created the contribution */
  contributorId: Scalars['Uuid']['output'];
  /** Date and time at which the contribution record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Given or first name(s) of the contributor, as credited in this contribution */
  firstName?: Maybe<Scalars['String']['output']>;
  /** Full, serialized name of the contributor, as credited in this contribution */
  fullName: Scalars['String']['output'];
  /** Family or surname of the contributor, as credited in this contribution */
  lastName: Scalars['String']['output'];
  /** Whether this is a main contribution to the work (e.g. contributor credited on title page) */
  mainContribution: Scalars['Boolean']['output'];
  /** Date and time at which the contribution record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Get the work in which the contribution appears */
  work: Work;
  /** Thoth ID of the work in which the contribution appears */
  workId: Scalars['Uuid']['output'];
};


/** A person's involvement in the production of a written text. */
export type ContributionAffiliationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<AffiliationOrderBy>;
};


/** A person's involvement in the production of a written text. */
export type ContributionBiographiesArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  localeCodes?: InputMaybe<Array<LocaleCode>>;
  markupFormat?: InputMaybe<MarkupFormat>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<BiographyOrderBy>;
};

/** Field to use when sorting contributions list */
export enum ContributionField {
  Biography = 'BIOGRAPHY',
  ContributionId = 'CONTRIBUTION_ID',
  ContributionOrdinal = 'CONTRIBUTION_ORDINAL',
  ContributionType = 'CONTRIBUTION_TYPE',
  ContributorId = 'CONTRIBUTOR_ID',
  CreatedAt = 'CREATED_AT',
  FirstName = 'FIRST_NAME',
  FullName = 'FULL_NAME',
  LastName = 'LAST_NAME',
  MainContribution = 'MAIN_CONTRIBUTION',
  UpdatedAt = 'UPDATED_AT',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting contributions list */
export type ContributionOrderBy = {
  direction: Direction;
  field: ContributionField;
};

/** Role describing the type of contribution to the work */
export enum ContributionType {
  /** Author of afterword */
  AfterwordBy = 'AFTERWORD_BY',
  /** Author of the work */
  Author = 'AUTHOR',
  /** Author of additional contributions to the work */
  ContributionsBy = 'CONTRIBUTIONS_BY',
  /** Editor of the work */
  Editor = 'EDITOR',
  /** Author of foreword */
  ForewordBy = 'FOREWORD_BY',
  /** Artist when named as the creator of artwork which illustrates a work */
  Illustrator = 'ILLUSTRATOR',
  /** Compiler of index */
  Indexer = 'INDEXER',
  /** Author of introduction */
  IntroductionBy = 'INTRODUCTION_BY',
  /** Person responsible for editing any piece of music referenced in the work */
  MusicEditor = 'MUSIC_EDITOR',
  /** Photographer when named as the primary creator of, eg, a book of photographs */
  Photographer = 'PHOTOGRAPHER',
  /** Author of preface */
  PrefaceBy = 'PREFACE_BY',
  /** Person responsible for performing research on which the work is based */
  ResearchBy = 'RESEARCH_BY',
  /** Writer of computer programs ancillary to the work */
  SoftwareBy = 'SOFTWARE_BY',
  /** Translator of the work */
  Translator = 'TRANSLATOR'
}

/** A person who has been involved in the production of a written text. */
export type Contributor = {
  __typename?: 'Contributor';
  /** Get contributions linked to this contributor */
  contributions: Array<Contribution>;
  /** Thoth ID of the contributor */
  contributorId: Scalars['Uuid']['output'];
  /** Date and time at which the contributor record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Given or first name(s) of the contributor */
  firstName?: Maybe<Scalars['String']['output']>;
  /** Full, serialized name of the contributor. Serialization is often culturally determined. */
  fullName: Scalars['String']['output'];
  /** Family or surname of the contributor */
  lastName: Scalars['String']['output'];
  /** ORCID (Open Researcher and Contributor ID) of the contributor as full URL, using the HTTPS scheme and the orcid.org domain (e.g. https://orcid.org/0000-0002-1825-0097) */
  orcid?: Maybe<Scalars['Orcid']['output']>;
  /** Date and time at which the contributor record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** URL of the contributor's website */
  website?: Maybe<Scalars['String']['output']>;
};


/** A person who has been involved in the production of a written text. */
export type ContributorContributionsArgs = {
  contributionTypes?: InputMaybe<Array<ContributionType>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ContributionOrderBy>;
};

/** Field to use when sorting contributors list */
export enum ContributorField {
  ContributorId = 'CONTRIBUTOR_ID',
  CreatedAt = 'CREATED_AT',
  FirstName = 'FIRST_NAME',
  FullName = 'FULL_NAME',
  LastName = 'LAST_NAME',
  Orcid = 'ORCID',
  UpdatedAt = 'UPDATED_AT',
  Website = 'WEBSITE'
}

/** Field and order to use when sorting contributors list */
export type ContributorOrderBy = {
  direction: Direction;
  field: ContributorField;
};

/** Three-letter ISO 3166-1 code representing a country */
export enum CountryCode {
  /** Aruba */
  Abw = 'ABW',
  /** Afghanistan */
  Afg = 'AFG',
  /** Angola */
  Ago = 'AGO',
  /** Anguilla */
  Aia = 'AIA',
  /** Åland Islands */
  Ala = 'ALA',
  /** Albania */
  Alb = 'ALB',
  /** Andorra */
  And = 'AND',
  /** United Arab Emirates */
  Are = 'ARE',
  /** Argentina */
  Arg = 'ARG',
  /** Armenia */
  Arm = 'ARM',
  /** American Samoa */
  Asm = 'ASM',
  /** Antarctica */
  Ata = 'ATA',
  /** French Southern Territories */
  Atf = 'ATF',
  /** Antigua and Barbuda */
  Atg = 'ATG',
  /** Australia */
  Aus = 'AUS',
  /** Austria */
  Aut = 'AUT',
  /** Azerbaijan */
  Aze = 'AZE',
  /** Burundi */
  Bdi = 'BDI',
  /** Belgium */
  Bel = 'BEL',
  /** Benin */
  Ben = 'BEN',
  /** Bonaire, Sint Eustatius and Saba */
  Bes = 'BES',
  /** Burkina Faso */
  Bfa = 'BFA',
  /** Bangladesh */
  Bgd = 'BGD',
  /** Bulgaria */
  Bgr = 'BGR',
  /** Bahrain */
  Bhr = 'BHR',
  /** Bahamas */
  Bhs = 'BHS',
  /** Bosnia and Herzegovina */
  Bih = 'BIH',
  /** Saint Barthélemy */
  Blm = 'BLM',
  /** Belarus */
  Blr = 'BLR',
  /** Belize */
  Blz = 'BLZ',
  /** Bermuda */
  Bmu = 'BMU',
  /** Bolivia */
  Bol = 'BOL',
  /** Brazil */
  Bra = 'BRA',
  /** Barbados */
  Brb = 'BRB',
  /** Brunei */
  Brn = 'BRN',
  /** Bhutan */
  Btn = 'BTN',
  /** Bouvet Island */
  Bvt = 'BVT',
  /** Botswana */
  Bwa = 'BWA',
  /** Central African Republic */
  Caf = 'CAF',
  /** Canada */
  Can = 'CAN',
  /** Cocos (Keeling) Islands */
  Cck = 'CCK',
  /** Switzerland */
  Che = 'CHE',
  /** Chile */
  Chl = 'CHL',
  /** China */
  Chn = 'CHN',
  /** Côte d'Ivoire */
  Civ = 'CIV',
  /** Cameroon */
  Cmr = 'CMR',
  /** Democratic Republic of the Congo */
  Cod = 'COD',
  /** Republic of the Congo */
  Cog = 'COG',
  /** Cook Islands */
  Cok = 'COK',
  /** Colombia */
  Col = 'COL',
  /** Comoros */
  Com = 'COM',
  /** Cabo Verde */
  Cpv = 'CPV',
  /** Costa Rica */
  Cri = 'CRI',
  /** Cuba */
  Cub = 'CUB',
  /** Curaçao */
  Cuw = 'CUW',
  /** Christmas Island */
  Cxr = 'CXR',
  /** Cayman Islands */
  Cym = 'CYM',
  /** Cyprus */
  Cyp = 'CYP',
  /** Czechia */
  Cze = 'CZE',
  /** Germany */
  Deu = 'DEU',
  /** Djibouti */
  Dji = 'DJI',
  /** Dominica */
  Dma = 'DMA',
  /** Denmark */
  Dnk = 'DNK',
  /** Dominican Republic */
  Dom = 'DOM',
  /** Algeria */
  Dza = 'DZA',
  /** Ecuador */
  Ecu = 'ECU',
  /** Egypt */
  Egy = 'EGY',
  /** Eritrea */
  Eri = 'ERI',
  /** Western Sahara */
  Esh = 'ESH',
  /** Spain */
  Esp = 'ESP',
  /** Estonia */
  Est = 'EST',
  /** Ethiopia */
  Eth = 'ETH',
  /** Finland */
  Fin = 'FIN',
  /** Fiji */
  Fji = 'FJI',
  /** Falkland Islands */
  Flk = 'FLK',
  /** France */
  Fra = 'FRA',
  /** Faroe Islands */
  Fro = 'FRO',
  /** Micronesia */
  Fsm = 'FSM',
  /** Gabon */
  Gab = 'GAB',
  /** United Kingdom */
  Gbr = 'GBR',
  /** Georgia */
  Geo = 'GEO',
  /** Guernsey */
  Ggy = 'GGY',
  /** Ghana */
  Gha = 'GHA',
  /** Gibraltar */
  Gib = 'GIB',
  /** Guinea */
  Gin = 'GIN',
  /** Guadeloupe */
  Glp = 'GLP',
  /** Gambia */
  Gmb = 'GMB',
  /** Guinea-Bissau */
  Gnb = 'GNB',
  /** Equatorial Guinea */
  Gnq = 'GNQ',
  /** Greece */
  Grc = 'GRC',
  /** Grenada */
  Grd = 'GRD',
  /** Greenland */
  Grl = 'GRL',
  /** Guatemala */
  Gtm = 'GTM',
  /** French Guiana */
  Guf = 'GUF',
  /** Guam */
  Gum = 'GUM',
  /** Guyana */
  Guy = 'GUY',
  /** Hong Kong */
  Hkg = 'HKG',
  /** Heard Island and McDonald Islands */
  Hmd = 'HMD',
  /** Honduras */
  Hnd = 'HND',
  /** Croatia */
  Hrv = 'HRV',
  /** Haiti */
  Hti = 'HTI',
  /** Hungary */
  Hun = 'HUN',
  /** Indonesia */
  Idn = 'IDN',
  /** Isle of Man */
  Imn = 'IMN',
  /** India */
  Ind = 'IND',
  /** British Indian Ocean Territory */
  Iot = 'IOT',
  /** Ireland */
  Irl = 'IRL',
  /** Iran */
  Irn = 'IRN',
  /** Iraq */
  Irq = 'IRQ',
  /** Iceland */
  Isl = 'ISL',
  /** Israel */
  Isr = 'ISR',
  /** Italy */
  Ita = 'ITA',
  /** Jamaica */
  Jam = 'JAM',
  /** Jersey */
  Jey = 'JEY',
  /** Jordan */
  Jor = 'JOR',
  /** Japan */
  Jpn = 'JPN',
  /** Kazakhstan */
  Kaz = 'KAZ',
  /** Kenya */
  Ken = 'KEN',
  /** Kyrgyzstan */
  Kgz = 'KGZ',
  /** Cambodia */
  Khm = 'KHM',
  /** Kiribati */
  Kir = 'KIR',
  /** Saint Kitts and Nevis */
  Kna = 'KNA',
  /** South Korea */
  Kor = 'KOR',
  /** Kuwait */
  Kwt = 'KWT',
  /** Laos */
  Lao = 'LAO',
  /** Lebanon */
  Lbn = 'LBN',
  /** Liberia */
  Lbr = 'LBR',
  /** Libya */
  Lby = 'LBY',
  /** Saint Lucia */
  Lca = 'LCA',
  /** Liechtenstein */
  Lie = 'LIE',
  /** Sri Lanka */
  Lka = 'LKA',
  /** Lesotho */
  Lso = 'LSO',
  /** Lithuania */
  Ltu = 'LTU',
  /** Luxembourg */
  Lux = 'LUX',
  /** Latvia */
  Lva = 'LVA',
  /** Macao */
  Mac = 'MAC',
  /** Saint Martin */
  Maf = 'MAF',
  /** Morocco */
  Mar = 'MAR',
  /** Monaco */
  Mco = 'MCO',
  /** Moldova */
  Mda = 'MDA',
  /** Madagascar */
  Mdg = 'MDG',
  /** Maldives */
  Mdv = 'MDV',
  /** Mexico */
  Mex = 'MEX',
  /** Marshall Islands */
  Mhl = 'MHL',
  /** North Macedonia */
  Mkd = 'MKD',
  /** Mali */
  Mli = 'MLI',
  /** Malta */
  Mlt = 'MLT',
  /** Myanmar */
  Mmr = 'MMR',
  /** Montenegro */
  Mne = 'MNE',
  /** Mongolia */
  Mng = 'MNG',
  /** Northern Mariana Islands */
  Mnp = 'MNP',
  /** Mozambique */
  Moz = 'MOZ',
  /** Mauritania */
  Mrt = 'MRT',
  /** Montserrat */
  Msr = 'MSR',
  /** Martinique */
  Mtq = 'MTQ',
  /** Mauritius */
  Mus = 'MUS',
  /** Malawi */
  Mwi = 'MWI',
  /** Malaysia */
  Mys = 'MYS',
  /** Mayotte */
  Myt = 'MYT',
  /** Namibia */
  Nam = 'NAM',
  /** New Caledonia */
  Ncl = 'NCL',
  /** Niger */
  Ner = 'NER',
  /** Norfolk Island */
  Nfk = 'NFK',
  /** Nigeria */
  Nga = 'NGA',
  /** Nicaragua */
  Nic = 'NIC',
  /** Niue */
  Niu = 'NIU',
  /** Netherlands */
  Nld = 'NLD',
  /** Norway */
  Nor = 'NOR',
  /** Nepal */
  Npl = 'NPL',
  /** Nauru */
  Nru = 'NRU',
  /** New Zealand */
  Nzl = 'NZL',
  /** Oman */
  Omn = 'OMN',
  /** Pakistan */
  Pak = 'PAK',
  /** Panama */
  Pan = 'PAN',
  /** Pitcairn */
  Pcn = 'PCN',
  /** Peru */
  Per = 'PER',
  /** Philippines */
  Phl = 'PHL',
  /** Palau */
  Plw = 'PLW',
  /** Papua New Guinea */
  Png = 'PNG',
  /** Poland */
  Pol = 'POL',
  /** Puerto Rico */
  Pri = 'PRI',
  /** North Korea */
  Prk = 'PRK',
  /** Portugal */
  Prt = 'PRT',
  /** Paraguay */
  Pry = 'PRY',
  /** Palestine */
  Pse = 'PSE',
  /** French Polynesia */
  Pyf = 'PYF',
  /** Qatar */
  Qat = 'QAT',
  /** Réunion */
  Reu = 'REU',
  /** Romania */
  Rou = 'ROU',
  /** Russia */
  Rus = 'RUS',
  /** Rwanda */
  Rwa = 'RWA',
  /** Saudi Arabia */
  Sau = 'SAU',
  /** Sudan */
  Sdn = 'SDN',
  /** Senegal */
  Sen = 'SEN',
  /** Singapore */
  Sgp = 'SGP',
  /** South Georgia and the South Sandwich Islands */
  Sgs = 'SGS',
  /** Saint Helena, Ascension and Tristan da Cunha */
  Shn = 'SHN',
  /** Svalbard and Jan Mayen */
  Sjm = 'SJM',
  /** Solomon Islands */
  Slb = 'SLB',
  /** Sierra Leone */
  Sle = 'SLE',
  /** El Salvador */
  Slv = 'SLV',
  /** San Marino */
  Smr = 'SMR',
  /** Somalia */
  Som = 'SOM',
  /** Saint Pierre and Miquelon */
  Spm = 'SPM',
  /** Serbia */
  Srb = 'SRB',
  /** South Sudan */
  Ssd = 'SSD',
  /** Sao Tome and Principe */
  Stp = 'STP',
  /** Suriname */
  Sur = 'SUR',
  /** Slovakia */
  Svk = 'SVK',
  /** Slovenia */
  Svn = 'SVN',
  /** Sweden */
  Swe = 'SWE',
  /** Eswatini */
  Swz = 'SWZ',
  /** Sint Maarten */
  Sxm = 'SXM',
  /** Seychelles */
  Syc = 'SYC',
  /** Syria */
  Syr = 'SYR',
  /** Turks and Caicos Islands */
  Tca = 'TCA',
  /** Chad */
  Tcd = 'TCD',
  /** Togo */
  Tgo = 'TGO',
  /** Thailand */
  Tha = 'THA',
  /** Tajikistan */
  Tjk = 'TJK',
  /** Tokelau */
  Tkl = 'TKL',
  /** Turkmenistan */
  Tkm = 'TKM',
  /** Timor-Leste */
  Tls = 'TLS',
  /** Tonga */
  Ton = 'TON',
  /** Trinidad and Tobago */
  Tto = 'TTO',
  /** Tunisia */
  Tun = 'TUN',
  /** Turkey */
  Tur = 'TUR',
  /** Tuvalu */
  Tuv = 'TUV',
  /** Taiwan */
  Twn = 'TWN',
  /** Tanzania */
  Tza = 'TZA',
  /** Uganda */
  Uga = 'UGA',
  /** Ukraine */
  Ukr = 'UKR',
  /** United States Minor Outlying Islands */
  Umi = 'UMI',
  /** Uruguay */
  Ury = 'URY',
  /** United States of America */
  Usa = 'USA',
  /** Uzbekistan */
  Uzb = 'UZB',
  /** Vatican City */
  Vat = 'VAT',
  /** Saint Vincent and the Grenadines */
  Vct = 'VCT',
  /** Venezuela */
  Ven = 'VEN',
  /** Virgin Islands (British) */
  Vgb = 'VGB',
  /** Virgin Islands (U.S.) */
  Vir = 'VIR',
  /** Viet Nam */
  Vnm = 'VNM',
  /** Vanuatu */
  Vut = 'VUT',
  /** Wallis and Futuna */
  Wlf = 'WLF',
  /** Samoa */
  Wsm = 'WSM',
  /** Yemen */
  Yem = 'YEM',
  /** South Africa */
  Zaf = 'ZAF',
  /** Zambia */
  Zmb = 'ZMB',
  /** Zimbabwe */
  Zwe = 'ZWE'
}

/** Three-letter ISO 4217 code representing a currency */
export enum CurrencyCode {
  /** Andorran peseta */
  Adp = 'ADP',
  /** United Arab Emirates dirham */
  Aed = 'AED',
  /** Afghan afghani (first) */
  Afa = 'AFA',
  /** Afghan afghani */
  Afn = 'AFN',
  /** Old Albanian lek */
  Alk = 'ALK',
  /** Albanian lek */
  All = 'ALL',
  /** Armenian dram */
  Amd = 'AMD',
  /** Netherlands Antillean guilder */
  Ang = 'ANG',
  /** Angolan kwanza */
  Aoa = 'AOA',
  /** Angolan kwanza (first) */
  Aok = 'AOK',
  /** Angolan novo kwanza */
  Aon = 'AON',
  /** Angolan kwanza reajustado */
  Aor = 'AOR',
  /** Argentine austral */
  Ara = 'ARA',
  /** Argentine peso argentino */
  Arp = 'ARP',
  /** Argentine peso */
  Ars = 'ARS',
  /** Argentine peso ley */
  Ary = 'ARY',
  /** Austrian schilling */
  Ats = 'ATS',
  /** Australian dollar */
  Aud = 'AUD',
  /** Aruban florin */
  Awg = 'AWG',
  /** Azerbaijani manat (first) */
  Aym = 'AYM',
  /** Azerbaijani manat (second) */
  Azm = 'AZM',
  /** Azerbaijani manat */
  Azn = 'AZN',
  /** Bosnia and Herzegovina dinar */
  Bad = 'BAD',
  /** Bosnia and Herzegovina convertible mark */
  Bam = 'BAM',
  /** Barbados dollar */
  Bbd = 'BBD',
  /** Bangladeshi taka */
  Bdt = 'BDT',
  /** Belgian convertible franc */
  Bec = 'BEC',
  /** Belgian franc */
  Bef = 'BEF',
  /** Belgian financial franc */
  Bel = 'BEL',
  /** Bulgarian lev (first) */
  Bgj = 'BGJ',
  /** Bulgarian lev (second) */
  Bgk = 'BGK',
  /** Bulgarian lev (third) */
  Bgl = 'BGL',
  /** Bulgarian lev */
  Bgn = 'BGN',
  /** Bahraini dinar */
  Bhd = 'BHD',
  /** Burundian franc */
  Bif = 'BIF',
  /** Bermudian dollar */
  Bmd = 'BMD',
  /** Brunei dollar */
  Bnd = 'BND',
  /** Boliviano */
  Bob = 'BOB',
  /** Bolivian peso */
  Bop = 'BOP',
  /** Bolivian Mvdol */
  Bov = 'BOV',
  /** Brazilian cruzeiro (1967-1986) */
  Brb = 'BRB',
  /** Brazilian cruzado */
  Brc = 'BRC',
  /** Brazilian cruzeiro (1990–1993) */
  Bre = 'BRE',
  /** Brazilian real */
  Brl = 'BRL',
  /** Brazilian cruzado novo */
  Brn = 'BRN',
  /** Brazilian cruzeiro real */
  Brr = 'BRR',
  /** Bahamian dollar */
  Bsd = 'BSD',
  /** Bhutanese ngultrum */
  Btn = 'BTN',
  /** Burmese kyat */
  Buk = 'BUK',
  /** Botswana pula */
  Bwp = 'BWP',
  /** Belarusian ruble (first) */
  Byb = 'BYB',
  /** Belarusian ruble */
  Byn = 'BYN',
  /** Belarusian ruble (second) */
  Byr = 'BYR',
  /** Belize dollar */
  Bzd = 'BZD',
  /** Canadian dollar */
  Cad = 'CAD',
  /** Congolese franc */
  Cdf = 'CDF',
  /** WIR franc (for electronic currency) */
  Chc = 'CHC',
  /** WIR euro */
  Che = 'CHE',
  /** Swiss franc */
  Chf = 'CHF',
  /** WIR franc */
  Chw = 'CHW',
  /** Unidad de Fomento */
  Clf = 'CLF',
  /** Chilean peso */
  Clp = 'CLP',
  /** Renminbi */
  Cny = 'CNY',
  /** Colombian peso */
  Cop = 'COP',
  /** Unidad de Valor Real (UVR) */
  Cou = 'COU',
  /** Costa Rican colon */
  Crc = 'CRC',
  /** Serbian dinar */
  Csd = 'CSD',
  /** Czechoslovak koruna (second) */
  Csj = 'CSJ',
  /** Czechoslovak koruna */
  Csk = 'CSK',
  /** Cuban convertible peso */
  Cuc = 'CUC',
  /** Cuban peso */
  Cup = 'CUP',
  /** Cape Verdean escudo */
  Cve = 'CVE',
  /** Cypriot pound */
  Cyp = 'CYP',
  /** Czech koruna */
  Czk = 'CZK',
  /** East German mark */
  Ddm = 'DDM',
  /** German mark */
  Dem = 'DEM',
  /** Djiboutian franc */
  Djf = 'DJF',
  /** Danish krone */
  Dkk = 'DKK',
  /** Dominican peso */
  Dop = 'DOP',
  /** Algerian dinar */
  Dzd = 'DZD',
  /** Ecuadorian sucre */
  Ecs = 'ECS',
  /** Ecuador Unidad de Valor Constante */
  Ecv = 'ECV',
  /** Estonian kroon */
  Eek = 'EEK',
  /** Egyptian pound */
  Egp = 'EGP',
  /** Eritrean nakfa */
  Ern = 'ERN',
  /** Spanish peseta (account A) */
  Esa = 'ESA',
  /** Spanish peseta (account B) */
  Esb = 'ESB',
  /** Spanish peseta */
  Esp = 'ESP',
  /** Ethiopian birr */
  Etb = 'ETB',
  /** Euro */
  Eur = 'EUR',
  /** Finnish markka */
  Fim = 'FIM',
  /** Fiji dollar */
  Fjd = 'FJD',
  /** Falkland Islands pound */
  Fkp = 'FKP',
  /** French franc */
  Frf = 'FRF',
  /** Pound sterling */
  Gbp = 'GBP',
  /** Georgian kuponi */
  Gek = 'GEK',
  /** Georgian lari */
  Gel = 'GEL',
  /** Ghanaian cedi (second) */
  Ghc = 'GHC',
  /** Ghanaian cedi (first) */
  Ghp = 'GHP',
  /** Ghanaian cedi */
  Ghs = 'GHS',
  /** Gibraltar pound */
  Gip = 'GIP',
  /** Gambian dalasi */
  Gmd = 'GMD',
  /** Guinean syli (first) */
  Gne = 'GNE',
  /** Guinean franc */
  Gnf = 'GNF',
  /** Guinean syli (second) */
  Gns = 'GNS',
  /** Equatorial Guinean ekwele */
  Gqe = 'GQE',
  /** Greek drachma */
  Grd = 'GRD',
  /** Guatemalan quetzal */
  Gtq = 'GTQ',
  /** Guinean escudo */
  Gwe = 'GWE',
  /** Guinea-Bissau peso */
  Gwp = 'GWP',
  /** Guyanese dollar */
  Gyd = 'GYD',
  /** Hong Kong dollar */
  Hkd = 'HKD',
  /** Honduran lempira */
  Hnl = 'HNL',
  /** Croatian dinar */
  Hrd = 'HRD',
  /** Croatian kuna */
  Hrk = 'HRK',
  /** Haitian gourde */
  Htg = 'HTG',
  /** Hungarian forint */
  Huf = 'HUF',
  /** Indonesian rupiah */
  Idr = 'IDR',
  /** Irish pound */
  Iep = 'IEP',
  /** Israeli pound */
  Ilp = 'ILP',
  /** Israeli shekel */
  Ilr = 'ILR',
  /** Israeli new shekel */
  Ils = 'ILS',
  /** Indian rupee */
  Inr = 'INR',
  /** Iraqi dinar */
  Iqd = 'IQD',
  /** Iranian rial */
  Irr = 'IRR',
  /** Icelandic króna (first) */
  Isj = 'ISJ',
  /** Icelandic króna */
  Isk = 'ISK',
  /** Italian lira */
  Itl = 'ITL',
  /** Jamaican dollar */
  Jmd = 'JMD',
  /** Jordanian dinar */
  Jod = 'JOD',
  /** Japanese yen */
  Jpy = 'JPY',
  /** Kenyan shilling */
  Kes = 'KES',
  /** Kyrgyzstani som */
  Kgs = 'KGS',
  /** Cambodian riel */
  Khr = 'KHR',
  /** Comoro franc */
  Kmf = 'KMF',
  /** North Korean won */
  Kpw = 'KPW',
  /** South Korean won */
  Krw = 'KRW',
  /** Kuwaiti dinar */
  Kwd = 'KWD',
  /** Cayman Islands dollar */
  Kyd = 'KYD',
  /** Kazakhstani tenge */
  Kzt = 'KZT',
  /** Pathet Lao kip */
  Laj = 'LAJ',
  /** Lao kip */
  Lak = 'LAK',
  /** Lebanese pound */
  Lbp = 'LBP',
  /** Sri Lankan rupee */
  Lkr = 'LKR',
  /** Liberian dollar */
  Lrd = 'LRD',
  /** Lesotho loti */
  Lsl = 'LSL',
  /** Lesotho loti (historic code) */
  Lsm = 'LSM',
  /** Lithuanian litas */
  Ltl = 'LTL',
  /** Lithuanian talonas */
  Ltt = 'LTT',
  /** Luxembourg convertible franc */
  Luc = 'LUC',
  /** Luxembourg franc */
  Luf = 'LUF',
  /** Luxembourg financial franc */
  Lul = 'LUL',
  /** Latvian lats */
  Lvl = 'LVL',
  /** Latvian rublis */
  Lvr = 'LVR',
  /** Libyan dinar */
  Lyd = 'LYD',
  /** Moroccan dirham */
  Mad = 'MAD',
  /** Moldovan leu */
  Mdl = 'MDL',
  /** Malagasy ariary */
  Mga = 'MGA',
  /** Malagasy franc */
  Mgf = 'MGF',
  /** Macedonian denar */
  Mkd = 'MKD',
  /** Malian franc */
  Mlf = 'MLF',
  /** Myanmar kyat */
  Mmk = 'MMK',
  /** Mongolian tögrög */
  Mnt = 'MNT',
  /** Macanese pataca */
  Mop = 'MOP',
  /** Mauritanian ouguiya (first) */
  Mro = 'MRO',
  /** Mauritanian ouguiya */
  Mru = 'MRU',
  /** Maltese lira */
  Mtl = 'MTL',
  /** Maltese pound */
  Mtp = 'MTP',
  /** Mauritian rupee */
  Mur = 'MUR',
  /** Maldivian rupee */
  Mvq = 'MVQ',
  /** Maldivian rufiyaa */
  Mvr = 'MVR',
  /** Malawian kwacha */
  Mwk = 'MWK',
  /** Mexican peso */
  Mxn = 'MXN',
  /** Mexican peso (first) */
  Mxp = 'MXP',
  /** Mexican Unidad de Inversion (UDI) */
  Mxv = 'MXV',
  /** Malaysian ringgit */
  Myr = 'MYR',
  /** Mozambican escudo */
  Mze = 'MZE',
  /** Mozambican metical (first) */
  Mzm = 'MZM',
  /** Mozambican metical */
  Mzn = 'MZN',
  /** Namibian dollar */
  Nad = 'NAD',
  /** Nigerian naira */
  Ngn = 'NGN',
  /** Nicaraguan córdoba (second) */
  Nic = 'NIC',
  /** Nicaraguan córdoba */
  Nio = 'NIO',
  /** Dutch guilder */
  Nlg = 'NLG',
  /** Norwegian krone */
  Nok = 'NOK',
  /** Nepalese rupee */
  Npr = 'NPR',
  /** New Zealand dollar */
  Nzd = 'NZD',
  /** Omani rial */
  Omr = 'OMR',
  /** Panamanian balboa */
  Pab = 'PAB',
  /** Peruvian old sol */
  Peh = 'PEH',
  /** Peruvian inti */
  Pei = 'PEI',
  /** Peruvian sol */
  Pen = 'PEN',
  /** Peruvian sol (historic code) */
  Pes = 'PES',
  /** Papua New Guinean kina */
  Pgk = 'PGK',
  /** Philippine peso */
  Php = 'PHP',
  /** Pakistani rupee */
  Pkr = 'PKR',
  /** Polish złoty */
  Pln = 'PLN',
  /** Polish złoty (third) */
  Plz = 'PLZ',
  /** Portuguese escudo */
  Pte = 'PTE',
  /** Paraguayan guaraní */
  Pyg = 'PYG',
  /** Qatari riyal */
  Qar = 'QAR',
  /** Rhodesian dollar (historic code) */
  Rhd = 'RHD',
  /** Romanian leu (second) */
  Rok = 'ROK',
  /** Romanian leu (third) */
  Rol = 'ROL',
  /** Romanian leu */
  Ron = 'RON',
  /** Serbian dinar */
  Rsd = 'RSD',
  /** Russian ruble */
  Rub = 'RUB',
  /** Russian ruble (old) */
  Rur = 'RUR',
  /** Rwandan franc */
  Rwf = 'RWF',
  /** Saudi riyal */
  Sar = 'SAR',
  /** Solomon Islands dollar */
  Sbd = 'SBD',
  /** Seychelles rupee */
  Scr = 'SCR',
  /** Sudanese dinar */
  Sdd = 'SDD',
  /** Sudanese pound */
  Sdg = 'SDG',
  /** Sudanese old pound */
  Sdp = 'SDP',
  /** Swedish krona */
  Sek = 'SEK',
  /** Singapore dollar */
  Sgd = 'SGD',
  /** Saint Helena pound */
  Shp = 'SHP',
  /** Slovenian tolar */
  Sit = 'SIT',
  /** Slovak koruna */
  Skk = 'SKK',
  /** Sierra Leonean leone (old leone) */
  Sll = 'SLL',
  /** Somalian shilling */
  Sos = 'SOS',
  /** Surinamese dollar */
  Srd = 'SRD',
  /** Surinamese guilder */
  Srg = 'SRG',
  /** South Sudanese pound */
  Ssp = 'SSP',
  /** São Tomé and Príncipe dobra (first) */
  Std = 'STD',
  /** São Tomé and Príncipe dobra */
  Stn = 'STN',
  /** Soviet Union ruble */
  Sur = 'SUR',
  /** Salvadoran colón */
  Svc = 'SVC',
  /** Syrian pound */
  Syp = 'SYP',
  /** Swazi lilangeni */
  Szl = 'SZL',
  /** Thai baht */
  Thb = 'THB',
  /** Tajikistani ruble */
  Tjr = 'TJR',
  /** Tajikistani somoni */
  Tjs = 'TJS',
  /** Turkmenistani manat (first) */
  Tmm = 'TMM',
  /** Turkmenistani manat */
  Tmt = 'TMT',
  /** Tunisian dinar */
  Tnd = 'TND',
  /** Tongan paʻanga */
  Top = 'TOP',
  /** Portuguese Timorese escudo */
  Tpe = 'TPE',
  /** Turkish lira (first) */
  Trl = 'TRL',
  /** Turkish lira */
  Try = 'TRY',
  /** Trinidad and Tobago dollar */
  Ttd = 'TTD',
  /** New Taiwan dollar */
  Twd = 'TWD',
  /** Tanzanian shilling */
  Tzs = 'TZS',
  /** Ukrainian hryvnia */
  Uah = 'UAH',
  /** Ukrainian karbovanets */
  Uak = 'UAK',
  /** Ugandan shilling */
  Ugs = 'UGS',
  /** Old Shilling */
  Ugw = 'UGW',
  /** Ugandan shilling */
  Ugx = 'UGX',
  /** United States dollar */
  Usd = 'USD',
  /** United States dollar (next day) */
  Usn = 'USN',
  /** United States dollar (same day) */
  Uss = 'USS',
  /** Uruguay Peso en Unidades Indexadas (URUIURUI) */
  Uyi = 'UYI',
  /** Uruguayan peso (gold standard) */
  Uyn = 'UYN',
  /** Uruguayan nuevo peso */
  Uyp = 'UYP',
  /** Uruguayan peso */
  Uyu = 'UYU',
  /** Unidad previsional */
  Uyw = 'UYW',
  /** Uzbekistani sum */
  Uzs = 'UZS',
  /** Venezuelan bolívar */
  Veb = 'VEB',
  /** Venezuelan bolívar fuerte */
  Vef = 'VEF',
  /** Venezuelan sovereign bolívar */
  Ves = 'VES',
  /** Old Vietnamese dong */
  Vnc = 'VNC',
  /** Vietnamese đồng */
  Vnd = 'VND',
  /** Vanuatu vatu */
  Vuv = 'VUV',
  /** Samoan tala */
  Wst = 'WST',
  /** CFA franc BEAC */
  Xaf = 'XAF',
  /** Silver */
  Xag = 'XAG',
  /** Gold */
  Xau = 'XAU',
  /** European Composite Unit */
  Xba = 'XBA',
  /** European Monetary Unit */
  Xbb = 'XBB',
  /** European Unit of Account 9 */
  Xbc = 'XBC',
  /** European Unit of Account 17 */
  Xbd = 'XBD',
  /** East Caribbean dollar */
  Xcd = 'XCD',
  /** Special drawing rights */
  Xdr = 'XDR',
  /** European Currency Unit */
  Xeu = 'XEU',
  /** Gold franc */
  Xfo = 'XFO',
  /** UIC franc */
  Xfu = 'XFU',
  /** CFA franc BCEAO */
  Xof = 'XOF',
  /** Palladium */
  Xpd = 'XPD',
  /** CFP franc (franc Pacifique) */
  Xpf = 'XPF',
  /** Platinum */
  Xpt = 'XPT',
  /** RINET funds code */
  Xre = 'XRE',
  /** SUCRE */
  Xsu = 'XSU',
  /** Code reserved for testing */
  Xts = 'XTS',
  /** ADB Unit of Account */
  Xua = 'XUA',
  /** No currency */
  Xxx = 'XXX',
  /** South Yemeni dinar */
  Ydd = 'YDD',
  /** Yemeni rial */
  Yer = 'YER',
  /** Yugoslav dinar (hard) */
  Yud = 'YUD',
  /** Yugoslav dinar (Novi) */
  Yum = 'YUM',
  /** Yugoslav dinar (convertible) */
  Yun = 'YUN',
  /** South African financial rand */
  Zal = 'ZAL',
  /** South African rand */
  Zar = 'ZAR',
  /** Zambian kwacha */
  Zmk = 'ZMK',
  /** Zambian new kwacha */
  Zmw = 'ZMW',
  /** Zairean new zaire */
  Zrn = 'ZRN',
  /** Zairean zaire */
  Zrz = 'ZRZ',
  /** Rhodesian dollar */
  Zwc = 'ZWC',
  /** Zimbabwean dollar (first) */
  Zwd = 'ZWD',
  /** Zimbabwean dollar */
  Zwl = 'ZWL',
  /** Zimbabwean dollar (second) */
  Zwn = 'ZWN',
  /** Zimbabwean dollar (third) */
  Zwr = 'ZWR'
}

/** Order in which to sort query results */
export enum Direction {
  /** Ascending order */
  Asc = 'ASC',
  /** Descending order */
  Desc = 'DESC'
}

/** An endorsement linked to a work. */
export type Endorsement = {
  __typename?: 'Endorsement';
  /** Get the endorsement author's institution */
  authorInstitution?: Maybe<Institution>;
  /** Thoth ID of the endorsement author's institution */
  authorInstitutionId?: Maybe<Scalars['Uuid']['output']>;
  /** Name of the endorsement author */
  authorName?: Maybe<Scalars['String']['output']>;
  /** ORCID (Open Researcher and Contributor ID) of the endorsement author as full URL, using the HTTPS scheme and the orcid.org domain */
  authorOrcid?: Maybe<Scalars['Orcid']['output']>;
  /** Role of the endorsement author */
  authorRole?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the endorsement record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Thoth ID of the endorsement */
  endorsementId: Scalars['Uuid']['output'];
  /** Number representing this endorsement's position in an ordered list of endorsements within the work */
  endorsementOrdinal: Scalars['Int']['output'];
  /** Text of the endorsement */
  text?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the endorsement record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** URL associated with this endorsement */
  url?: Maybe<Scalars['String']['output']>;
  /** Get the work linked to this endorsement */
  work: Work;
  /** Thoth ID of the work to which this endorsement belongs */
  workId: Scalars['Uuid']['output'];
};


/** An endorsement linked to a work. */
export type EndorsementTextArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
};

/** Field to use when sorting endorsements list */
export enum EndorsementField {
  AuthorName = 'AUTHOR_NAME',
  AuthorRole = 'AUTHOR_ROLE',
  CreatedAt = 'CREATED_AT',
  EndorsementId = 'ENDORSEMENT_ID',
  EndorsementOrdinal = 'ENDORSEMENT_ORDINAL',
  UpdatedAt = 'UPDATED_AT',
  Url = 'URL',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting endorsements list */
export type EndorsementOrderBy = {
  direction: Direction;
  field: EndorsementField;
};

/** Expression to use when filtering by numeric value */
export enum Expression {
  /** Return only results with values which are greater than the value supplied */
  GreaterThan = 'GREATER_THAN',
  /** Return only results with values which are less than the value supplied */
  LessThan = 'LESS_THAN'
}

/** A file stored in the system (publication file, front cover, additional resource, or featured video). */
export type File = {
  __typename?: 'File';
  /** Thoth ID of the additional resource (for additional resource files) */
  additionalResourceId?: Maybe<Scalars['Uuid']['output']>;
  /** Size of the file in bytes */
  bytes: Scalars['Int']['output'];
  /** Public CDN URL */
  cdnUrl: Scalars['String']['output'];
  /** Date and time at which the file record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Thoth ID of the file */
  fileId: Scalars['Uuid']['output'];
  /** Type of file (publication, frontcover, additional_resource, or work_featured_video) */
  fileType: FileType;
  /** MIME type used when serving the file */
  mimeType: Scalars['String']['output'];
  /** S3 object key (canonical DOI-based path) */
  objectKey: Scalars['String']['output'];
  /** Thoth ID of the publication (for publication files) */
  publicationId?: Maybe<Scalars['Uuid']['output']>;
  /** SHA-256 checksum of the stored file */
  sha256: Scalars['String']['output'];
  /** Date and time at which the file record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Thoth ID of the featured video (for featured video files) */
  workFeaturedVideoId?: Maybe<Scalars['Uuid']['output']>;
  /** Thoth ID of the work (for frontcovers) */
  workId?: Maybe<Scalars['Uuid']['output']>;
};

/** Type of file being uploaded */
export enum FileType {
  /** Additional resource file (audio, video, image, spreadsheet, etc.) */
  AdditionalResource = 'ADDITIONAL_RESOURCE',
  /** Front cover image */
  Frontcover = 'FRONTCOVER',
  /** Publication file (PDF, EPUB, XML, etc.) */
  Publication = 'PUBLICATION',
  /** Featured video file hosted on CDN */
  WorkFeaturedVideo = 'WORK_FEATURED_VIDEO'
}

/** Response from initiating a file upload, containing the upload URL and expiration time. */
export type FileUploadResponse = {
  __typename?: 'FileUploadResponse';
  /** Time when the upload URL expires. */
  expiresAt: Scalars['Timestamp']['output'];
  /** ID of the upload session. */
  fileUploadId: Scalars['Uuid']['output'];
  /** Headers that must be sent with the HTTP PUT request to uploadUrl. */
  uploadHeaders: Array<UploadRequestHeader>;
  /** Presigned S3 PUT URL for uploading the file. */
  uploadUrl: Scalars['String']['output'];
};

/** A grant awarded for the publication of a work by an institution. */
export type Funding = {
  __typename?: 'Funding';
  /** Date and time at which the funding record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Thoth ID of the funding */
  fundingId: Scalars['Uuid']['output'];
  /** Grant number of the award */
  grantNumber?: Maybe<Scalars['String']['output']>;
  /** Get the funding institution */
  institution: Institution;
  /** Thoth ID of the funding institution */
  institutionId: Scalars['Uuid']['output'];
  /** Name of the funding program */
  program?: Maybe<Scalars['String']['output']>;
  /** Name of the funding project */
  projectName?: Maybe<Scalars['String']['output']>;
  /** Short name of the funding project */
  projectShortname?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the funding record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Get the funded work */
  work: Work;
  /** Thoth ID of the funded work */
  workId: Scalars['Uuid']['output'];
};

/** Field to use when sorting fundings list */
export enum FundingField {
  CreatedAt = 'CREATED_AT',
  FundingId = 'FUNDING_ID',
  GrantNumber = 'GRANT_NUMBER',
  InstitutionId = 'INSTITUTION_ID',
  Program = 'PROGRAM',
  ProjectName = 'PROJECT_NAME',
  ProjectShortname = 'PROJECT_SHORTNAME',
  UpdatedAt = 'UPDATED_AT',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting fundings list */
export type FundingOrderBy = {
  direction: Direction;
  field: FundingField;
};

/** The brand under which a publisher issues works. */
export type Imprint = {
  __typename?: 'Imprint';
  /** CDN domain used for files belonging to this imprint */
  cdnDomain?: Maybe<Scalars['String']['output']>;
  /** CloudFront distribution ID used for files belonging to this imprint */
  cloudfrontDistId?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the imprint record was created */
  createdAt: Scalars['Timestamp']['output'];
  /**
   * DOI of the imprint's Crossmark policy page, if publisher participates. Crossmark 'gives readers quick and easy access to the
   *     current status of an item of content, including any corrections, retractions, or updates'. More: https://www.crossref.org/services/crossmark/
   */
  crossmarkDoi?: Maybe<Scalars['Doi']['output']>;
  /** Default currency code for works under this imprint */
  defaultCurrency?: Maybe<CurrencyCode>;
  /** Default locale code for works under this imprint */
  defaultLocale?: Maybe<LocaleCode>;
  /** Default publication place for works under this imprint */
  defaultPlace?: Maybe<Scalars['String']['output']>;
  /** Thoth ID of the imprint */
  imprintId: Scalars['Uuid']['output'];
  /** Name of the imprint */
  imprintName: Scalars['String']['output'];
  /** URL of the imprint's landing page */
  imprintUrl?: Maybe<Scalars['String']['output']>;
  /** Get the publisher to which this imprint belongs */
  publisher: Publisher;
  /** Thoth ID of the publisher to which this imprint belongs */
  publisherId: Scalars['Uuid']['output'];
  /** S3 bucket used for files belonging to this imprint */
  s3Bucket?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the imprint record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Get works linked to this imprint */
  works: Array<Work>;
};


/** The brand under which a publisher issues works. */
export type ImprintWorksArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<WorkOrderBy>;
  publicationDate?: InputMaybe<TimeExpression>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
  workTypes?: InputMaybe<Array<WorkType>>;
};

/** Field to use when sorting imprints list */
export enum ImprintField {
  CreatedAt = 'CREATED_AT',
  CrossmarkDoi = 'CROSSMARK_DOI',
  DefaultCurrency = 'DEFAULT_CURRENCY',
  DefaultLocale = 'DEFAULT_LOCALE',
  DefaultPlace = 'DEFAULT_PLACE',
  ImprintId = 'IMPRINT_ID',
  ImprintName = 'IMPRINT_NAME',
  ImprintUrl = 'IMPRINT_URL',
  UpdatedAt = 'UPDATED_AT'
}

/** Field and order to use when sorting imprints list */
export type ImprintOrderBy = {
  direction: Direction;
  field: ImprintField;
};

/** An organisation with which contributors may be affiliated or by which works may be funded. */
export type Institution = {
  __typename?: 'Institution';
  /** Get affiliations linked to this institution */
  affiliations: Array<Affiliation>;
  /** Three-letter ISO 3166-1 code representing the country where this institution is based */
  countryCode?: Maybe<CountryCode>;
  /** Date and time at which the institution record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Get fundings linked to this institution */
  fundings: Array<Funding>;
  /** Digital Object Identifier of the organisation as full URL, using the HTTPS scheme and the doi.org domain (e.g. https://doi.org/10.13039/100014013) */
  institutionDoi?: Maybe<Scalars['Doi']['output']>;
  /** Thoth ID of the institution */
  institutionId: Scalars['Uuid']['output'];
  /** Name of the institution */
  institutionName: Scalars['String']['output'];
  /** Research Organisation Registry identifier of the organisation as full URL, using the HTTPS scheme and the ror.org domain (e.g. https://ror.org/051z6e826) */
  ror?: Maybe<Scalars['Ror']['output']>;
  /** Date and time at which the institution record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
};


/** An organisation with which contributors may be affiliated or by which works may be funded. */
export type InstitutionAffiliationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<AffiliationOrderBy>;
};


/** An organisation with which contributors may be affiliated or by which works may be funded. */
export type InstitutionFundingsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<FundingOrderBy>;
};

/** Field to use when sorting institutions list */
export enum InstitutionField {
  CountryCode = 'COUNTRY_CODE',
  CreatedAt = 'CREATED_AT',
  InstitutionDoi = 'INSTITUTION_DOI',
  InstitutionId = 'INSTITUTION_ID',
  InstitutionName = 'INSTITUTION_NAME',
  Ror = 'ROR',
  UpdatedAt = 'UPDATED_AT'
}

/** Field and order to use when sorting institutions list */
export type InstitutionOrderBy = {
  direction: Direction;
  field: InstitutionField;
};

/** A work published as a number in a periodical. */
export type Issue = {
  __typename?: 'Issue';
  /** Date and time at which the issue record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Thoth ID of the issue */
  issueId: Scalars['Uuid']['output'];
  /** Published issue number given to this issue within the series, if any */
  issueNumber?: Maybe<Scalars['Int']['output']>;
  /** Number representing this issue's position in an ordered list of issues within the series (does not have to correspond to published issue number) */
  issueOrdinal: Scalars['Int']['output'];
  /** Get the series to which the issue belongs */
  series: Series;
  /** Thoth ID of the series to which the issue belongs */
  seriesId: Scalars['Uuid']['output'];
  /** Date and time at which the issue record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Get the work represented by the issue */
  work: Work;
  /** Thoth ID of the work represented by the issue */
  workId: Scalars['Uuid']['output'];
};

/** Field to use when sorting issues list */
export enum IssueField {
  CreatedAt = 'CREATED_AT',
  IssueId = 'ISSUE_ID',
  IssueNumber = 'ISSUE_NUMBER',
  IssueOrdinal = 'ISSUE_ORDINAL',
  SeriesId = 'SERIES_ID',
  UpdatedAt = 'UPDATED_AT',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting issues list */
export type IssueOrderBy = {
  direction: Direction;
  field: IssueField;
};

/** Description of a work's language. */
export type Language = {
  __typename?: 'Language';
  /** Date and time at which the language record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Three-letter ISO 639 code representing the language */
  languageCode: LanguageCode;
  /** Thoth ID of the language */
  languageId: Scalars['Uuid']['output'];
  /** Relation between this language and the original language of the text */
  languageRelation: LanguageRelation;
  /** Date and time at which the language record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Get the work which has this language */
  work: Work;
  /** Thoth ID of the work which has this language */
  workId: Scalars['Uuid']['output'];
};

/** Three-letter ISO 639 code representing a language */
export enum LanguageCode {
  /** Afar */
  Aar = 'AAR',
  /** Abkhazian */
  Abk = 'ABK',
  /** Achinese */
  Ace = 'ACE',
  /** Acoli */
  Ach = 'ACH',
  /** Adangme */
  Ada = 'ADA',
  /** Adyghe */
  Ady = 'ADY',
  /** Afro-Asiatic languages */
  Afa = 'AFA',
  /** Afrihili */
  Afh = 'AFH',
  /** Afrikaans */
  Afr = 'AFR',
  /** Ainu (Japan) */
  Ain = 'AIN',
  /** Akan */
  Aka = 'AKA',
  /** Akkadian */
  Akk = 'AKK',
  /** Albanian */
  Alb = 'ALB',
  /** Aleut */
  Ale = 'ALE',
  /** Algonquian languages */
  Alg = 'ALG',
  /** Southern Altai */
  Alt = 'ALT',
  /** Amharic */
  Amh = 'AMH',
  /** Old English (ca. 450-1100) */
  Ang = 'ANG',
  /** Angika */
  Anp = 'ANP',
  /** Apache languages */
  Apa = 'APA',
  /** Arabic */
  Ara = 'ARA',
  /** Official Aramaic (700-300 BCE) */
  Arc = 'ARC',
  /** Aragonese */
  Arg = 'ARG',
  /** Armenian */
  Arm = 'ARM',
  /** Mapudungun */
  Arn = 'ARN',
  /** Arapaho */
  Arp = 'ARP',
  /** Artificial languages */
  Art = 'ART',
  /** Arawak */
  Arw = 'ARW',
  /** Assamese */
  Asm = 'ASM',
  /** Asturian */
  Ast = 'AST',
  /** Athapascan languages */
  Ath = 'ATH',
  /** Australian languages */
  Aus = 'AUS',
  /** Avaric */
  Ava = 'AVA',
  /** Avestan */
  Ave = 'AVE',
  /** Awadhi */
  Awa = 'AWA',
  /** Aymara */
  Aym = 'AYM',
  /** Azerbaijani */
  Aze = 'AZE',
  /** Banda languages */
  Bad = 'BAD',
  /** Bamileke languages */
  Bai = 'BAI',
  /** Bashkir */
  Bak = 'BAK',
  /** Baluchi */
  Bal = 'BAL',
  /** Bambara */
  Bam = 'BAM',
  /** Balinese */
  Ban = 'BAN',
  /** Basque */
  Baq = 'BAQ',
  /** Basa (Cameroon) */
  Bas = 'BAS',
  /** Baltic languages */
  Bat = 'BAT',
  /** Beja */
  Bej = 'BEJ',
  /** Belarusian */
  Bel = 'BEL',
  /** Bemba (Zambia) */
  Bem = 'BEM',
  /** Bengali */
  Ben = 'BEN',
  /** Berber languages */
  Ber = 'BER',
  /** Bhojpuri */
  Bho = 'BHO',
  /** Bihari languages */
  Bih = 'BIH',
  /** Bikol */
  Bik = 'BIK',
  /** Bini */
  Bin = 'BIN',
  /** Bislama */
  Bis = 'BIS',
  /** Siksika */
  Bla = 'BLA',
  /** Bantu languages */
  Bnt = 'BNT',
  /** Bosnian */
  Bos = 'BOS',
  /** Braj */
  Bra = 'BRA',
  /** Breton */
  Bre = 'BRE',
  /** Batak languages */
  Btk = 'BTK',
  /** Buriat */
  Bua = 'BUA',
  /** Buginese */
  Bug = 'BUG',
  /** Bulgarian */
  Bul = 'BUL',
  /** Burmese */
  Bur = 'BUR',
  /** Bilin */
  Byn = 'BYN',
  /** Caddo */
  Cad = 'CAD',
  /** Central American Indian languages */
  Cai = 'CAI',
  /** Galibi Carib */
  Car = 'CAR',
  /** Catalan */
  Cat = 'CAT',
  /** Caucasian languages */
  Cau = 'CAU',
  /** Cebuano */
  Ceb = 'CEB',
  /** Celtic languages */
  Cel = 'CEL',
  /** Chamorro */
  Cha = 'CHA',
  /** Chibcha */
  Chb = 'CHB',
  /** Chechen */
  Che = 'CHE',
  /** Chagatai */
  Chg = 'CHG',
  /** Chinese */
  Chi = 'CHI',
  /** Chuukese */
  Chk = 'CHK',
  /** Mari (Russia) */
  Chm = 'CHM',
  /** Chinook jargon */
  Chn = 'CHN',
  /** Choctaw */
  Cho = 'CHO',
  /** Chipewyan */
  Chp = 'CHP',
  /** Cherokee */
  Chr = 'CHR',
  /** Church Slavic */
  Chu = 'CHU',
  /** Chuvash */
  Chv = 'CHV',
  /** Cheyenne */
  Chy = 'CHY',
  /** Chamic languages */
  Cmc = 'CMC',
  /** Montenegrin */
  Cnr = 'CNR',
  /** Coptic */
  Cop = 'COP',
  /** Cornish */
  Cor = 'COR',
  /** Corsican */
  Cos = 'COS',
  /** Creoles and pidgins, English‑based */
  Cpe = 'CPE',
  /** Creoles and pidgins, French‑based */
  Cpf = 'CPF',
  /** Creoles and pidgins, Portuguese-based */
  Cpp = 'CPP',
  /** Cree */
  Cre = 'CRE',
  /** Crimean Tatar */
  Crh = 'CRH',
  /** Creoles and pidgins */
  Crp = 'CRP',
  /** Kashubian */
  Csb = 'CSB',
  /** Cushitic languages */
  Cus = 'CUS',
  /** Czech */
  Cze = 'CZE',
  /** Dakota */
  Dak = 'DAK',
  /** Danish */
  Dan = 'DAN',
  /** Dargwa */
  Dar = 'DAR',
  /** Land Dayak languages */
  Day = 'DAY',
  /** Delaware */
  Del = 'DEL',
  /** Slave (Athapascan) */
  Den = 'DEN',
  /** Tlicho */
  Dgr = 'DGR',
  /** Dinka */
  Din = 'DIN',
  /** Dhivehi */
  Div = 'DIV',
  /** Dogri (macrolanguage) */
  Doi = 'DOI',
  /** Dravidian languages */
  Dra = 'DRA',
  /** Lower Sorbian */
  Dsb = 'DSB',
  /** Duala */
  Dua = 'DUA',
  /** Middle Dutch (ca. 1050-1350) */
  Dum = 'DUM',
  /** Dutch */
  Dut = 'DUT',
  /** Dyula */
  Dyu = 'DYU',
  /** Dzongkha */
  Dzo = 'DZO',
  /** Efik */
  Efi = 'EFI',
  /** Egyptian (Ancient) */
  Egy = 'EGY',
  /** Ekajuk */
  Eka = 'EKA',
  /** Elamite */
  Elx = 'ELX',
  /** English */
  Eng = 'ENG',
  /** Middle English (1100-1500) */
  Enm = 'ENM',
  /** Esperanto */
  Epo = 'EPO',
  /** Estonian */
  Est = 'EST',
  /** Ewe */
  Ewe = 'EWE',
  /** Ewondo */
  Ewo = 'EWO',
  /** Fang (Equatorial Guinea) */
  Fan = 'FAN',
  /** Faroese */
  Fao = 'FAO',
  /** Fanti */
  Fat = 'FAT',
  /** Fijian */
  Fij = 'FIJ',
  /** Filipino */
  Fil = 'FIL',
  /** Finnish */
  Fin = 'FIN',
  /** Finno-Ugrian languages */
  Fiu = 'FIU',
  /** Fon */
  Fon = 'FON',
  /** French */
  Fre = 'FRE',
  /** Middle French (ca. 1400-1600) */
  Frm = 'FRM',
  /** Old French (842-ca. 1400) */
  Fro = 'FRO',
  /** Northern Frisian */
  Frr = 'FRR',
  /** Eastern Frisian */
  Frs = 'FRS',
  /** Western Frisian */
  Fry = 'FRY',
  /** Fulah */
  Ful = 'FUL',
  /** Friulian */
  Fur = 'FUR',
  /** Ga */
  Gaa = 'GAA',
  /** Gayo */
  Gay = 'GAY',
  /** Gbaya (Central African Republic) */
  Gba = 'GBA',
  /** Germanic languages */
  Gem = 'GEM',
  /** Georgian */
  Geo = 'GEO',
  /** German */
  Ger = 'GER',
  /** Geez */
  Gez = 'GEZ',
  /** Gilbertese */
  Gil = 'GIL',
  /** Scottish Gaelic */
  Gla = 'GLA',
  /** Irish */
  Gle = 'GLE',
  /** Galician */
  Glg = 'GLG',
  /** Manx */
  Glv = 'GLV',
  /** Middle High German (ca. 1050-1500) */
  Gmh = 'GMH',
  /** Old High German (ca. 750-1050) */
  Goh = 'GOH',
  /** Gondi */
  Gon = 'GON',
  /** Gorontalo */
  Gor = 'GOR',
  /** Gothic */
  Got = 'GOT',
  /** Grebo */
  Grb = 'GRB',
  /** Ancient Greek (to 1453) */
  Grc = 'GRC',
  /** Modern Greek (1453-) */
  Gre = 'GRE',
  /** Guarani */
  Grn = 'GRN',
  /** Swiss German */
  Gsw = 'GSW',
  /** Gujarati */
  Guj = 'GUJ',
  /** Gwichʼin */
  Gwi = 'GWI',
  /** Haida */
  Hai = 'HAI',
  /** Haitian */
  Hat = 'HAT',
  /** Hausa */
  Hau = 'HAU',
  /** Hawaiian */
  Haw = 'HAW',
  /** Hebrew */
  Heb = 'HEB',
  /** Herero */
  Her = 'HER',
  /** Hiligaynon */
  Hil = 'HIL',
  /** Himachali languages */
  Him = 'HIM',
  /** Hindi */
  Hin = 'HIN',
  /** Hittite */
  Hit = 'HIT',
  /** Hmong */
  Hmn = 'HMN',
  /** Hiri Motu */
  Hmo = 'HMO',
  /** Croatian */
  Hrv = 'HRV',
  /** Upper Sorbian */
  Hsb = 'HSB',
  /** Hungarian */
  Hun = 'HUN',
  /** Hupa */
  Hup = 'HUP',
  /** Iban */
  Iba = 'IBA',
  /** Igbo */
  Ibo = 'IBO',
  /** Icelandic */
  Ice = 'ICE',
  /** Ido */
  Ido = 'IDO',
  /** Sichuan Yi */
  Iii = 'III',
  /** Ijo languages */
  Ijo = 'IJO',
  /** Inuktitut */
  Iku = 'IKU',
  /** Interlingue */
  Ile = 'ILE',
  /** Iloko */
  Ilo = 'ILO',
  /** Interlingua (International Auxiliary Language Association) */
  Ina = 'INA',
  /** Indic languages */
  Inc = 'INC',
  /** Indonesian */
  Ind = 'IND',
  /** Indo-European languages */
  Ine = 'INE',
  /** Ingush */
  Inh = 'INH',
  /** Inupiaq */
  Ipk = 'IPK',
  /** Iranian languages */
  Ira = 'IRA',
  /** Iroquoian languages */
  Iro = 'IRO',
  /** Italian */
  Ita = 'ITA',
  /** Javanese */
  Jav = 'JAV',
  /** Lojban */
  Jbo = 'JBO',
  /** Japanese */
  Jpn = 'JPN',
  /** Judeo-Persian */
  Jpr = 'JPR',
  /** Judeo-Arabic */
  Jrb = 'JRB',
  /** Kara-Kalpak */
  Kaa = 'KAA',
  /** Kabyle */
  Kab = 'KAB',
  /** Kachin */
  Kac = 'KAC',
  /** Kalaallisut */
  Kal = 'KAL',
  /** Kamba (Kenya) */
  Kam = 'KAM',
  /** Kannada */
  Kan = 'KAN',
  /** Karen languages */
  Kar = 'KAR',
  /** Kashmiri */
  Kas = 'KAS',
  /** Kanuri */
  Kau = 'KAU',
  /** Kawi */
  Kaw = 'KAW',
  /** Kazakh */
  Kaz = 'KAZ',
  /** Kabardian */
  Kbd = 'KBD',
  /** Khasi */
  Kha = 'KHA',
  /** Khoisan languages */
  Khi = 'KHI',
  /** Khmer */
  Khm = 'KHM',
  /** Khotanese */
  Kho = 'KHO',
  /** Kikuyu */
  Kik = 'KIK',
  /** Kinyarwanda */
  Kin = 'KIN',
  /** Kirghiz */
  Kir = 'KIR',
  /** Kimbundu */
  Kmb = 'KMB',
  /** Konkani (macrolanguage) */
  Kok = 'KOK',
  /** Komi */
  Kom = 'KOM',
  /** Kongo */
  Kon = 'KON',
  /** Korean */
  Kor = 'KOR',
  /** Kosraean */
  Kos = 'KOS',
  /** Kpelle */
  Kpe = 'KPE',
  /** Karachay-Balkar */
  Krc = 'KRC',
  /** Karelian */
  Krl = 'KRL',
  /** Kru languages */
  Kro = 'KRO',
  /** Kurukh */
  Kru = 'KRU',
  /** Kuanyama */
  Kua = 'KUA',
  /** Kumyk */
  Kum = 'KUM',
  /** Kurdish */
  Kur = 'KUR',
  /** Kutenai */
  Kut = 'KUT',
  /** Ladino */
  Lad = 'LAD',
  /** Lahnda */
  Lah = 'LAH',
  /** Lamba */
  Lam = 'LAM',
  /** Lao */
  Lao = 'LAO',
  /** Latin */
  Lat = 'LAT',
  /** Latvian */
  Lav = 'LAV',
  /** Lezghian */
  Lez = 'LEZ',
  /** Limburgan */
  Lim = 'LIM',
  /** Lingala */
  Lin = 'LIN',
  /** Lithuanian */
  Lit = 'LIT',
  /** Mongo */
  Lol = 'LOL',
  /** Lozi */
  Loz = 'LOZ',
  /** Luxembourgish */
  Ltz = 'LTZ',
  /** Luba-Lulua */
  Lua = 'LUA',
  /** Luba-Katanga */
  Lub = 'LUB',
  /** Ganda */
  Lug = 'LUG',
  /** Luiseno */
  Lui = 'LUI',
  /** Lunda */
  Lun = 'LUN',
  /** Luo (Kenya and Tanzania) */
  Luo = 'LUO',
  /** Lushai */
  Lus = 'LUS',
  /** Macedonian */
  Mac = 'MAC',
  /** Madurese */
  Mad = 'MAD',
  /** Magahi */
  Mag = 'MAG',
  /** Marshallese */
  Mah = 'MAH',
  /** Maithili */
  Mai = 'MAI',
  /** Makasar */
  Mak = 'MAK',
  /** Malayalam */
  Mal = 'MAL',
  /** Mandingo */
  Man = 'MAN',
  /** Maori */
  Mao = 'MAO',
  /** Austronesian languages */
  Map = 'MAP',
  /** Marathi */
  Mar = 'MAR',
  /** Masai */
  Mas = 'MAS',
  /** Malay (macrolanguage) */
  May = 'MAY',
  /** Moksha */
  Mdf = 'MDF',
  /** Mandar */
  Mdr = 'MDR',
  /** Mende (Sierra Leone) */
  Men = 'MEN',
  /** Middle Irish (900-1200) */
  Mga = 'MGA',
  /** Mi'kmaq */
  Mic = 'MIC',
  /** Minangkabau */
  Min = 'MIN',
  /** Uncoded languages */
  Mis = 'MIS',
  /** Mon-Khmer languages */
  Mkh = 'MKH',
  /** Malagasy */
  Mlg = 'MLG',
  /** Maltese */
  Mlt = 'MLT',
  /** Manchu */
  Mnc = 'MNC',
  /** Manipuri */
  Mni = 'MNI',
  /** Manobo languages */
  Mno = 'MNO',
  /** Mohawk */
  Moh = 'MOH',
  /** Mongolian */
  Mon = 'MON',
  /** Mossi */
  Mos = 'MOS',
  /** Multiple languages */
  Mul = 'MUL',
  /** Munda languages */
  Mun = 'MUN',
  /** Creek */
  Mus = 'MUS',
  /** Mirandese */
  Mwl = 'MWL',
  /** Marwari */
  Mwr = 'MWR',
  /** Mayan languages */
  Myn = 'MYN',
  /** Erzya */
  Myv = 'MYV',
  /** Nahuatl languages */
  Nah = 'NAH',
  /** North American Indian languages */
  Nai = 'NAI',
  /** Neapolitan */
  Nap = 'NAP',
  /** Nauru */
  Nau = 'NAU',
  /** Navajo */
  Nav = 'NAV',
  /** South Ndebele */
  Nbl = 'NBL',
  /** North Ndebele */
  Nde = 'NDE',
  /** Ndonga */
  Ndo = 'NDO',
  /** Low German */
  Nds = 'NDS',
  /** Nepali (macrolanguage) */
  Nep = 'NEP',
  /** Newari */
  New = 'NEW',
  /** Nias */
  Nia = 'NIA',
  /** Niger-Kordofanian languages */
  Nic = 'NIC',
  /** Niuean */
  Niu = 'NIU',
  /** Norwegian Nynorsk */
  Nno = 'NNO',
  /** Norwegian Bokmål */
  Nob = 'NOB',
  /** Nogai */
  Nog = 'NOG',
  /** Old Norse */
  Non = 'NON',
  /** Norwegian */
  Nor = 'NOR',
  /** N'Ko */
  Nqo = 'NQO',
  /** Pedi */
  Nso = 'NSO',
  /** Nubian languages */
  Nub = 'NUB',
  /** Classical Newari */
  Nwc = 'NWC',
  /** Nyanja */
  Nya = 'NYA',
  /** Nyamwezi */
  Nym = 'NYM',
  /** Nyankole */
  Nyn = 'NYN',
  /** Nyoro */
  Nyo = 'NYO',
  /** Nzima */
  Nzi = 'NZI',
  /** Occitan (post 1500) */
  Oci = 'OCI',
  /** Ojibwa */
  Oji = 'OJI',
  /** Oriya (macrolanguage) */
  Ori = 'ORI',
  /** Oromo */
  Orm = 'ORM',
  /** Osage */
  Osa = 'OSA',
  /** Ossetian */
  Oss = 'OSS',
  /** Ottoman Turkish (1500-1928) */
  Ota = 'OTA',
  /** Otomian languages */
  Oto = 'OTO',
  /** Papuan languages */
  Paa = 'PAA',
  /** Pangasinan */
  Pag = 'PAG',
  /** Pahlavi */
  Pal = 'PAL',
  /** Pampanga */
  Pam = 'PAM',
  /** Panjabi */
  Pan = 'PAN',
  /** Papiamento */
  Pap = 'PAP',
  /** Palauan */
  Pau = 'PAU',
  /** Old Persian (ca. 600-400 B.C.) */
  Peo = 'PEO',
  /** Persian */
  Per = 'PER',
  /** Philippine languages */
  Phi = 'PHI',
  /** Phoenician */
  Phn = 'PHN',
  /** Pali */
  Pli = 'PLI',
  /** Polish */
  Pol = 'POL',
  /** Pohnpeian */
  Pon = 'PON',
  /** Portuguese */
  Por = 'POR',
  /** Prakrit languages */
  Pra = 'PRA',
  /** Old Provençal (to 1500) */
  Pro = 'PRO',
  /** Pushto */
  Pus = 'PUS',
  /** Reserved for local use */
  Qaa = 'QAA',
  /** Quechua */
  Que = 'QUE',
  /** Rajasthani */
  Raj = 'RAJ',
  /** Rapanui */
  Rap = 'RAP',
  /** Rarotongan */
  Rar = 'RAR',
  /** Romance languages */
  Roa = 'ROA',
  /** Romansh */
  Roh = 'ROH',
  /** Romany */
  Rom = 'ROM',
  /** Romanian */
  Rum = 'RUM',
  /** Rundi */
  Run = 'RUN',
  /** Macedo-Romanian */
  Rup = 'RUP',
  /** Russian */
  Rus = 'RUS',
  /** Sandawe */
  Sad = 'SAD',
  /** Sango */
  Sag = 'SAG',
  /** Yakut */
  Sah = 'SAH',
  /** South American Indian languages */
  Sai = 'SAI',
  /** Salishan languages */
  Sal = 'SAL',
  /** Samaritan Aramaic */
  Sam = 'SAM',
  /** Sanskrit */
  San = 'SAN',
  /** Sasak */
  Sas = 'SAS',
  /** Santali */
  Sat = 'SAT',
  /** Sicilian */
  Scn = 'SCN',
  /** Scots */
  Sco = 'SCO',
  /** Selkup */
  Sel = 'SEL',
  /** Semitic languages */
  Sem = 'SEM',
  /** Old Irish (to 900) */
  Sga = 'SGA',
  /** sign languages */
  Sgn = 'SGN',
  /** Shan */
  Shn = 'SHN',
  /** Sidamo */
  Sid = 'SID',
  /** Sinhala */
  Sin = 'SIN',
  /** Siouan languages */
  Sio = 'SIO',
  /** Sino-Tibetan languages */
  Sit = 'SIT',
  /** Slavic languages */
  Sla = 'SLA',
  /** Slovak */
  Slo = 'SLO',
  /** Slovenian */
  Slv = 'SLV',
  /** Southern Sami */
  Sma = 'SMA',
  /** Northern Sami */
  Sme = 'SME',
  /** Sami languages */
  Smi = 'SMI',
  /** Lule Sami */
  Smj = 'SMJ',
  /** Inari Sami */
  Smn = 'SMN',
  /** Samoan */
  Smo = 'SMO',
  /** Skolt Sami */
  Sms = 'SMS',
  /** Shona */
  Sna = 'SNA',
  /** Sindhi */
  Snd = 'SND',
  /** Soninke */
  Snk = 'SNK',
  /** Sogdian */
  Sog = 'SOG',
  /** Somali */
  Som = 'SOM',
  /** Songhai languages */
  Son = 'SON',
  /** Southern Sotho */
  Sot = 'SOT',
  /** Spanish */
  Spa = 'SPA',
  /** Sardinian */
  Srd = 'SRD',
  /** Sranan Tongo */
  Srn = 'SRN',
  /** Serbian */
  Srp = 'SRP',
  /** Serer */
  Srr = 'SRR',
  /** Nilo-Saharan languages */
  Ssa = 'SSA',
  /** Swati */
  Ssw = 'SSW',
  /** Sukuma */
  Suk = 'SUK',
  /** Sundanese */
  Sun = 'SUN',
  /** Susu */
  Sus = 'SUS',
  /** Sumerian */
  Sux = 'SUX',
  /** Swahili (macrolanguage) */
  Swa = 'SWA',
  /** Swedish */
  Swe = 'SWE',
  /** Classical Syriac */
  Syc = 'SYC',
  /** Syriac */
  Syr = 'SYR',
  /** Tahitian */
  Tah = 'TAH',
  /** Tai languages */
  Tai = 'TAI',
  /** Tamil */
  Tam = 'TAM',
  /** Tatar */
  Tat = 'TAT',
  /** Telugu */
  Tel = 'TEL',
  /** Timne */
  Tem = 'TEM',
  /** Tereno */
  Ter = 'TER',
  /** Tetum */
  Tet = 'TET',
  /** Tajik */
  Tgk = 'TGK',
  /** Tagalog */
  Tgl = 'TGL',
  /** Thai */
  Tha = 'THA',
  /** Tibetan */
  Tib = 'TIB',
  /** Tigre */
  Tig = 'TIG',
  /** Tigrinya */
  Tir = 'TIR',
  /** Tiv */
  Tiv = 'TIV',
  /** Tokelau */
  Tkl = 'TKL',
  /** Klingon */
  Tlh = 'TLH',
  /** Tlingit */
  Tli = 'TLI',
  /** Tamashek */
  Tmh = 'TMH',
  /** Tonga (Nyasa) */
  Tog = 'TOG',
  /** Tonga (Tonga Islands) */
  Ton = 'TON',
  /** Tok Pisin */
  Tpi = 'TPI',
  /** Tsimshian */
  Tsi = 'TSI',
  /** Tswana */
  Tsn = 'TSN',
  /** Tsonga */
  Tso = 'TSO',
  /** Turkmen */
  Tuk = 'TUK',
  /** Tumbuka */
  Tum = 'TUM',
  /** Tupi languages */
  Tup = 'TUP',
  /** Turkish */
  Tur = 'TUR',
  /** Altaic languages */
  Tut = 'TUT',
  /** Tuvalu */
  Tvl = 'TVL',
  /** Twi */
  Twi = 'TWI',
  /** Tuvinian */
  Tyv = 'TYV',
  /** Udmurt */
  Udm = 'UDM',
  /** Ugaritic */
  Uga = 'UGA',
  /** Uighur */
  Uig = 'UIG',
  /** Ukrainian */
  Ukr = 'UKR',
  /** Umbundu */
  Umb = 'UMB',
  /** Undetermined */
  Und = 'UND',
  /** Urdu */
  Urd = 'URD',
  /** Uzbek */
  Uzb = 'UZB',
  /** Vai */
  Vai = 'VAI',
  /** Venda */
  Ven = 'VEN',
  /** Vietnamese */
  Vie = 'VIE',
  /** Volapük */
  Vol = 'VOL',
  /** Votic */
  Vot = 'VOT',
  /** Wakashan languages */
  Wak = 'WAK',
  /** Wolaytta */
  Wal = 'WAL',
  /** Waray (Philippines) */
  War = 'WAR',
  /** Washo */
  Was = 'WAS',
  /** Welsh */
  Wel = 'WEL',
  /** Sorbian languages */
  Wen = 'WEN',
  /** Walloon */
  Wln = 'WLN',
  /** Wolof */
  Wol = 'WOL',
  /** Kalmyk */
  Xal = 'XAL',
  /** Xhosa */
  Xho = 'XHO',
  /** Yao */
  Yao = 'YAO',
  /** Yapese */
  Yap = 'YAP',
  /** Yiddish */
  Yid = 'YID',
  /** Yoruba */
  Yor = 'YOR',
  /** Yupik languages */
  Ypk = 'YPK',
  /** Zapotec */
  Zap = 'ZAP',
  /** Blissymbols */
  Zbl = 'ZBL',
  /** Zenaga */
  Zen = 'ZEN',
  /** Standard Moroccan Tamazight */
  Zgh = 'ZGH',
  /** Zhuang */
  Zha = 'ZHA',
  /** Zande languages */
  Znd = 'ZND',
  /** Zulu */
  Zul = 'ZUL',
  /** Zuni */
  Zun = 'ZUN',
  /** No linguistic content */
  Zxx = 'ZXX',
  /** Zaza */
  Zza = 'ZZA'
}

/** Field to use when sorting languages list */
export enum LanguageField {
  CreatedAt = 'CREATED_AT',
  LanguageCode = 'LANGUAGE_CODE',
  LanguageId = 'LANGUAGE_ID',
  LanguageRelation = 'LANGUAGE_RELATION',
  UpdatedAt = 'UPDATED_AT',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting languages list */
export type LanguageOrderBy = {
  direction: Direction;
  field: LanguageField;
};

/** Relation between a language listed for a work and the original language of the work's text */
export enum LanguageRelation {
  /** Original language of the text */
  Original = 'ORIGINAL',
  /** Language from which the text was translated */
  TranslatedFrom = 'TRANSLATED_FROM',
  /** Language into which the text has been translated */
  TranslatedInto = 'TRANSLATED_INTO'
}

/** Unit of measurement for physical Work dimensions (mm, cm or in) */
export enum LengthUnit {
  /** Centimetres */
  Cm = 'CM',
  /** Inches */
  In = 'IN',
  /** Millimetres */
  Mm = 'MM'
}

/** BCP-47 code representing locale */
export enum LocaleCode {
  /** Afrikaans (af) */
  Af = 'AF',
  /** Afrikaans (Namibia) (af-NA) */
  AfNa = 'AF_NA',
  /** Afrikaans (South Africa) (af-ZA) */
  AfZa = 'AF_ZA',
  /** Aghem (agq) */
  Agq = 'AGQ',
  /** Aghem (Cameroon) (agq-CM) */
  AgqCm = 'AGQ_CM',
  /** Antigua and Barbuda Creole English */
  Aig = 'AIG',
  /** Akan (ak) */
  Ak = 'AK',
  /** Akan (Ghana) (ak-GH) */
  AkGh = 'AK_GH',
  /** Amharic (am) */
  Am = 'AM',
  /** Amharic (Ethiopia) (am-ET) */
  AmEt = 'AM_ET',
  /** Arabic (ar) */
  Ar = 'AR',
  /** Arabic (World) (ar-001) */
  Ar001 = 'AR001',
  /** Arabic (United Arab Emirates) (ar-AE) */
  ArAe = 'AR_AE',
  /** Arabic (Bahrain) (ar-BH) */
  ArBh = 'AR_BH',
  /** Arabic (Algeria) (ar-DZ) */
  ArDz = 'AR_DZ',
  /** Arabic (Egypt) (ar-EG) */
  ArEg = 'AR_EG',
  /** Arabic (Iraq) (ar-IQ) */
  ArIq = 'AR_IQ',
  /** Arabic (Jordan) (ar-JO) */
  ArJo = 'AR_JO',
  /** Arabic (Kuwait) (ar-KW) */
  ArKw = 'AR_KW',
  /** Arabic (Lebanon) (ar-LB) */
  ArLb = 'AR_LB',
  /** Arabic (Libya) (ar-LY) */
  ArLy = 'AR_LY',
  /** Arabic (Morocco) (ar-MA) */
  ArMa = 'AR_MA',
  /** Arabic (Oman) (ar-OM) */
  ArOm = 'AR_OM',
  /** Arabic (Qatar) (ar-QA) */
  ArQa = 'AR_QA',
  /** Arabic (Saudi Arabia) (ar-SA) */
  ArSa = 'AR_SA',
  /** Arabic (Sudan) (ar-SD) */
  ArSd = 'AR_SD',
  /** Arabic (Syria) (ar-SY) */
  ArSy = 'AR_SY',
  /** Arabic (Tunisia) (ar-TN) */
  ArTn = 'AR_TN',
  /** Arabic (Yemen) (ar-YE) */
  ArYe = 'AR_YE',
  /** Assamese (as) */
  As = 'AS',
  /** Asu (asa) */
  Asa = 'ASA',
  /** Asu (Tanzania) (asa-TZ) */
  AsaTz = 'ASA_TZ',
  /** Asturian (ast) */
  Ast = 'AST',
  /** Asturian (Spain) (ast-ES) */
  AstEs = 'AST_ES',
  /** Assamese (India) (as-IN) */
  AsIn = 'AS_IN',
  /** Azerbaijani (az) */
  Az = 'AZ',
  /** Azerbaijani (Cyrillic) (az-Cyrl) */
  AzCyrl = 'AZ_CYRL',
  /** Azerbaijani (Cyrillic, Azerbaijan) (az-Cyrl-AZ) */
  AzCyrlAz = 'AZ_CYRL_AZ',
  /** Azerbaijani (Latin) (az-Latn) */
  AzLatn = 'AZ_LATN',
  /** Azerbaijani (Latin, Azerbaijan) (az-Latn-AZ) */
  AzLatnAz = 'AZ_LATN_AZ',
  /** Bahamas Creole English */
  Bah = 'BAH',
  /** Basaa (bas) */
  Bas = 'BAS',
  /** Basaa (Cameroon) (bas-CM) */
  BasCm = 'BAS_CM',
  /** Belarusian (be) */
  Be = 'BE',
  /** Bemba (bem) */
  Bem = 'BEM',
  /** Bemba (Zambia) (bem-ZM) */
  BemZm = 'BEM_ZM',
  /** Bena (bez) */
  Bez = 'BEZ',
  /** Bena (Tanzania) (bez-TZ) */
  BezTz = 'BEZ_TZ',
  /** Belarusian (Belarus) (be-BY) */
  BeBy = 'BE_BY',
  /** Bulgarian (bg) */
  Bg = 'BG',
  /** Bulgarian (Bulgaria) (bg-BG) */
  BgBg = 'BG_BG',
  /** Bambara (bm) */
  Bm = 'BM',
  /** Bambara (Mali) (bm-ML) */
  BmMl = 'BM_ML',
  /** Bengali (bn) */
  Bn = 'BN',
  /** Bengali (Bangladesh) (bn-BD) */
  BnBd = 'BN_BD',
  /** Bengali (India) (bn-IN) */
  BnIn = 'BN_IN',
  /** Tibetan (bo) */
  Bo = 'BO',
  /** Tibetan (China) (bo-CN) */
  BoCn = 'BO_CN',
  /** Tibetan (India) (bo-IN) */
  BoIn = 'BO_IN',
  /** Breton (br) */
  Br = 'BR',
  /** Bodo (brx) */
  Brx = 'BRX',
  /** Bodo (India) (brx-IN) */
  BrxIn = 'BRX_IN',
  /** Breton (France) (br-FR) */
  BrFr = 'BR_FR',
  /** Bosnian (bs) */
  Bs = 'BS',
  /** Bosnian (Bosnia and Herzegovina) (bs-BA) */
  BsBa = 'BS_BA',
  /** Catalan (ca) */
  Ca = 'CA',
  /** Catalan (Spain) (ca-ES) */
  CaEs = 'CA_ES',
  /** Valencian (Spain Catalan) (ca-ES-valencia) */
  CaEsValencia = 'CA_ES_VALENCIA',
  /** Chiga (cgg) */
  Cgg = 'CGG',
  /** Chiga (Uganda) (cgg-UG) */
  CggUg = 'CGG_UG',
  /** Cherokee (chr) */
  Chr = 'CHR',
  /** Cherokee (United States) (chr-US) */
  ChrUs = 'CHR_US',
  /** Central Kurdish (ckb) */
  Ckb = 'CKB',
  /** Czech (cs) */
  Cs = 'CS',
  /** Czech (Czech Republic) (cs-CZ) */
  CsCz = 'CS_CZ',
  /** Welsh (cy) */
  Cy = 'CY',
  /** Welsh (United Kingdom) (cy-GB) */
  CyGb = 'CY_GB',
  /** Danish (da) */
  Da = 'DA',
  /** Taita (dav) */
  Dav = 'DAV',
  /** Taita (Kenya) (dav-KE) */
  DavKe = 'DAV_KE',
  /** Danish (Denmark) (da-DK) */
  DaDk = 'DA_DK',
  /** German (de) */
  De = 'DE',
  /** German (Austria) (de-AT) */
  DeAt = 'DE_AT',
  /** German (Belgium) (de-BE) */
  DeBe = 'DE_BE',
  /** German (Switzerland) (de-CH) */
  DeCh = 'DE_CH',
  /** German (Germany) (de-DE) */
  DeDe = 'DE_DE',
  /** German (Liechtenstein) (de-LI) */
  DeLi = 'DE_LI',
  /** German (Luxembourg) (de-LU) */
  DeLu = 'DE_LU',
  /** Zarma (dje) */
  Dje = 'DJE',
  /** Zarma (Niger) (dje-NE) */
  DjeNe = 'DJE_NE',
  /** Duala (dua) */
  Dua = 'DUA',
  /** Duala (Cameroon) (dua-CM) */
  DuaCm = 'DUA_CM',
  /** Dhivehi (Maldives) */
  Dv = 'DV',
  /** Jola-Fonyi (dyo) */
  Dyo = 'DYO',
  /** Jola-Fonyi (Senegal) (dyo-SN) */
  DyoSn = 'DYO_SN',
  /** Embu (ebu) */
  Ebu = 'EBU',
  /** Embu (Kenya) (ebu-KE) */
  EbuKe = 'EBU_KE',
  /** Ewe (ee) */
  Ee = 'EE',
  /** Ewe (Ghana) (ee-GH) */
  EeGh = 'EE_GH',
  /** Ewe (Togo) (ee-TG) */
  EeTg = 'EE_TG',
  /** Greek (el) */
  El = 'EL',
  /** Greek (Cyprus) (el-CY) */
  ElCy = 'EL_CY',
  /** Greek (Greece) (el-GR) */
  ElGr = 'EL_GR',
  /** English */
  En = 'EN',
  /** English (U.A.E.) (en-AE) */
  EnAe = 'EN_AE',
  /** English (Anguilla) (en-AI) */
  EnAi = 'EN_AI',
  /** English (American Samoa) (en-AS) */
  EnAs = 'EN_AS',
  /** English (Austria) (en-AT) */
  EnAt = 'EN_AT',
  /** English (Australia) (en-AU) */
  EnAu = 'EN_AU',
  /** English (Barbados) (en-BB) */
  EnBb = 'EN_BB',
  /** English (Belgium) (en-BE) */
  EnBe = 'EN_BE',
  /** English (Burundi) (en-BI) */
  EnBi = 'EN_BI',
  /** English (Bermuda) (en-BM) */
  EnBm = 'EN_BM',
  /** English (Botswana) (en-BW) */
  EnBw = 'EN_BW',
  /** English (Belize) (en-BZ) */
  EnBz = 'EN_BZ',
  /** English (Canada) (en-CA) */
  EnCa = 'EN_CA',
  /** English (Cocos [Keeling] Islands) (en-CC) */
  EnCc = 'EN_CC',
  /** English (Switzerland) (en-CH) */
  EnCh = 'EN_CH',
  /** English (Cook Islands) (en-CK) */
  EnCk = 'EN_CK',
  /** English (Cameroon) (en-CM) */
  EnCm = 'EN_CM',
  /** English (Christmas Island) (en-CX) */
  EnCx = 'EN_CX',
  /** English (Cyprus) (en-CY) */
  EnCy = 'EN_CY',
  /** English (Germany) (en-DE) */
  EnDe = 'EN_DE',
  /** English (Diego Garcia) (en-DG) */
  EnDg = 'EN_DG',
  /** English (Denmark) (en-DK) */
  EnDk = 'EN_DK',
  /** English (Dominica) (en-DM) */
  EnDm = 'EN_DM',
  /** English (Egypt) (en-EG) */
  EnEg = 'EN_EG',
  /** English (Eritrea) (en-ER) */
  EnEr = 'EN_ER',
  /** English (Europe) (en-EU) */
  EnEu = 'EN_EU',
  /** English (Finland) (en-FI) */
  EnFi = 'EN_FI',
  /** English (Fiji) (en-FJ) */
  EnFj = 'EN_FJ',
  /** English (Falkland Islands) (en-FK) */
  EnFk = 'EN_FK',
  /** English (Micronesia) (en-FM) */
  EnFm = 'EN_FM',
  /** English (United Kingdom) (en-GB) */
  EnGb = 'EN_GB',
  /** English (Grenada) (en-GD) */
  EnGd = 'EN_GD',
  /** English (Guernsey) (en-GG) */
  EnGg = 'EN_GG',
  /** English (Ghana) (en-GH) */
  EnGh = 'EN_GH',
  /** English (Gibraltar) (en-GI) */
  EnGi = 'EN_GI',
  /** English (Gambia) (en-GM) */
  EnGm = 'EN_GM',
  /** English (Guam) (en-GU) */
  EnGu = 'EN_GU',
  /** English (Guyana) (en-GY) */
  EnGy = 'EN_GY',
  /** English (Hong Kong SAR China) (en-HK) */
  EnHk = 'EN_HK',
  /** English (Ireland) (en-IE) */
  EnIe = 'EN_IE',
  /** English (Israel) (en-IL) */
  EnIl = 'EN_IL',
  /** English (Isle of Man) (en-IM) */
  EnIm = 'EN_IM',
  /** English (India) (en-IN) */
  EnIn = 'EN_IN',
  /** English (British Indian Ocean Territory) (en-IO) */
  EnIo = 'EN_IO',
  /** English (Jersey) (en-JE) */
  EnJe = 'EN_JE',
  /** English (Jamaica) (en-JM) */
  EnJm = 'EN_JM',
  /** English (Kenya) (en-KE) */
  EnKe = 'EN_KE',
  /** English (Kiribati) (en-KI) */
  EnKi = 'EN_KI',
  /** English (St Kitts & Nevis) (en-KN) */
  EnKn = 'EN_KN',
  /** English (Kuwait) (en-KW) */
  EnKw = 'EN_KW',
  /** English (Cayman Islands) (en-KY) */
  EnKy = 'EN_KY',
  /** English (St Lucia) (en-LC) */
  EnLc = 'EN_LC',
  /** English (Lesotho) (en-LS) */
  EnLs = 'EN_LS',
  /** English (Madagascar) (en-MG) */
  EnMg = 'EN_MG',
  /** English (Marshall Islands) (en-MH) */
  EnMh = 'EN_MH',
  /** English (Macao SAR China) (en-MO) */
  EnMo = 'EN_MO',
  /** English (Northern Mariana Islands) (en-MP) */
  EnMp = 'EN_MP',
  /** English (Montserrat) (en-MS) */
  EnMs = 'EN_MS',
  /** English (Malta) (en-MT) */
  EnMt = 'EN_MT',
  /** English (Mauritius) (en-MU) */
  EnMu = 'EN_MU',
  /** English (Malawi) (en-MW) */
  EnMw = 'EN_MW',
  /** English (Malaysia) (en-MY) */
  EnMy = 'EN_MY',
  /** English (Namibia) (en-NA) */
  EnNa = 'EN_NA',
  /** English (Norfolk Island) (en-NF) */
  EnNf = 'EN_NF',
  /** English (Nigeria) (en-NG) */
  EnNg = 'EN_NG',
  /** English (Netherlands) (en-NL) */
  EnNl = 'EN_NL',
  /** English (Norway) (en-NO) */
  EnNo = 'EN_NO',
  /** English (Nauru) (en-NR) */
  EnNr = 'EN_NR',
  /** English (Niue) (en-NU) */
  EnNu = 'EN_NU',
  /** English (New Zealand) (en-NZ) */
  EnNz = 'EN_NZ',
  /** English (Panama) (en-PA) */
  EnPa = 'EN_PA',
  /** English (Papua New Guinea) (en-PG) */
  EnPg = 'EN_PG',
  /** English (Philippines) (en-PH) */
  EnPh = 'EN_PH',
  /** English (Pakistan) (en-PK) */
  EnPk = 'EN_PK',
  /** English (Pitcairn Islands) (en-PN) */
  EnPn = 'EN_PN',
  /** English (Puerto Rico) (en-PR) */
  EnPr = 'EN_PR',
  /** English (Palau) (en-PW) */
  EnPw = 'EN_PW',
  /** English (Rwanda) (en-RW) */
  EnRw = 'EN_RW',
  /** English (Saudi Arabia) (en-SA) */
  EnSa = 'EN_SA',
  /** English (Solomon Islands) (en-SB) */
  EnSb = 'EN_SB',
  /** English (Seychelles) (en-SC) */
  EnSc = 'EN_SC',
  /** English (Sudan) (en-SD) */
  EnSd = 'EN_SD',
  /** English (Sweden) (en-SE) */
  EnSe = 'EN_SE',
  /** English (Singapore) (en-SG) */
  EnSg = 'EN_SG',
  /** English (St Helena) (en-SH) */
  EnSh = 'EN_SH',
  /** English (Slovenia) (en-SI) */
  EnSi = 'EN_SI',
  /** English (Sierra Leone) (en-SL) */
  EnSl = 'EN_SL',
  /** English (South Sudan) (en-SS) */
  EnSs = 'EN_SS',
  /** English (Sint Maarten) (en-SX) */
  EnSx = 'EN_SX',
  /** English (Swaziland) (en-SZ) */
  EnSz = 'EN_SZ',
  /** English (Tokelau) (en-TK) */
  EnTk = 'EN_TK',
  /** English (Tonga) (en-TO) */
  EnTo = 'EN_TO',
  /** English (Trinidad and Tobago) (en-TT) */
  EnTt = 'EN_TT',
  /** English (Tuvalu) (en-TV) */
  EnTv = 'EN_TV',
  /** English (Tanzania) (en-TZ) */
  EnTz = 'EN_TZ',
  /** English (Uganda) (en-UG) */
  EnUg = 'EN_UG',
  /** English (U.S. Minor Outlying Islands) (en-UM) */
  EnUm = 'EN_UM',
  /** English (United States) (en-US) */
  EnUs = 'EN_US',
  /** English (U.S., Computer) (en-US-POSIX) */
  EnUsPosix = 'EN_US_POSIX',
  /** English (U.S. Virgin Islands) (en-VI) */
  EnVi = 'EN_VI',
  /** English (Vanuatu) (en-VU) */
  EnVu = 'EN_VU',
  /** English (Samoa) (en-WS) */
  EnWs = 'EN_WS',
  /** English (South Africa) (en-ZA) */
  EnZa = 'EN_ZA',
  /** English (Zambia) (en-ZM) */
  EnZm = 'EN_ZM',
  /** English (Zimbabwe) (en-ZW) */
  EnZw = 'EN_ZW',
  /** Esperanto (eo) */
  Eo = 'EO',
  /** Spanish (es) */
  Es = 'ES',
  /** Spanish (Latin America) (es-419) */
  Es419 = 'ES419',
  /** Spanish (Argentina) (es-AR) */
  EsAr = 'ES_AR',
  /** Spanish (Bolivia) (es-BO) */
  EsBo = 'ES_BO',
  /** Spanish (Chile) (es-CL) */
  EsCl = 'ES_CL',
  /** Spanish (Colombia) (es-CO) */
  EsCo = 'ES_CO',
  /** Spanish (Costa Rica) (es-CR) */
  EsCr = 'ES_CR',
  /** Spanish (Dominican Republic) (es-DO) */
  EsDo = 'ES_DO',
  /** Spanish (Ecuador) (es-EC) */
  EsEc = 'ES_EC',
  /** Spanish (Spain) (es-ES) */
  EsEs = 'ES_ES',
  /** Spanish (Equatorial Guinea) (es-GQ) */
  EsGq = 'ES_GQ',
  /** Spanish (Guatemala) (es-GT) */
  EsGt = 'ES_GT',
  /** Spanish (Honduras) (es-HN) */
  EsHn = 'ES_HN',
  /** Spanish (Mexico) (es-MX) */
  EsMx = 'ES_MX',
  /** Spanish (Nicaragua) (es-NI) */
  EsNi = 'ES_NI',
  /** Spanish (Panama) (es-PA) */
  EsPa = 'ES_PA',
  /** Spanish (Peru) (es-PE) */
  EsPe = 'ES_PE',
  /** Spanish (Puerto Rico) (es-PR) */
  EsPr = 'ES_PR',
  /** Spanish (Paraguay) (es-PY) */
  EsPy = 'ES_PY',
  /** Spanish (El Salvador) (es-SV) */
  EsSv = 'ES_SV',
  /** Spanish (United States) (es-US) */
  EsUs = 'ES_US',
  /** Spanish (Uruguay) (es-UY) */
  EsUy = 'ES_UY',
  /** Spanish (Venezuela) (es-VE) */
  EsVe = 'ES_VE',
  /** Estonian (et) */
  Et = 'ET',
  /** Estonian (Estonia) (et-EE) */
  EtEe = 'ET_EE',
  /** Basque (eu) */
  Eu = 'EU',
  /** Basque (Spain) (eu-ES) */
  EuEs = 'EU_ES',
  /** Ewondo (ewo) */
  Ewo = 'EWO',
  /** Ewondo (Cameroon) (ewo-CM) */
  EwoCm = 'EWO_CM',
  /** Persian (fa) */
  Fa = 'FA',
  /** Persian (Afghanistan) (fa-AF) */
  FaAf = 'FA_AF',
  /** Persian (Iran) (fa-IR) */
  FaIr = 'FA_IR',
  /** Fulah (ff) */
  Ff = 'FF',
  /** Fulah (Senegal) (ff-SN) */
  FfSn = 'FF_SN',
  /** Finnish (fi) */
  Fi = 'FI',
  /** Filipino (fil) */
  Fil = 'FIL',
  /** Filipino (Philippines) (fil-PH) */
  FilPh = 'FIL_PH',
  /** Finnish (Finland) (fi-FI) */
  FiFi = 'FI_FI',
  /** Faroese (fo) */
  Fo = 'FO',
  /** Faroese (Faroe Islands) (fo-FO) */
  FoFo = 'FO_FO',
  /** French (fr) */
  Fr = 'FR',
  /** French (Belgium) (fr-BE) */
  FrBe = 'FR_BE',
  /** French (Burkina Faso) (fr-BF) */
  FrBf = 'FR_BF',
  /** French (Burundi) (fr-BI) */
  FrBi = 'FR_BI',
  /** French (Benin) (fr-BJ) */
  FrBj = 'FR_BJ',
  /** French (Saint Barthélemy) (fr-BL) */
  FrBl = 'FR_BL',
  /** French (Canada) (fr-CA) */
  FrCa = 'FR_CA',
  /** French (Congo - Kinshasa) (fr-CD) */
  FrCd = 'FR_CD',
  /** French (Central African Republic) (fr-CF) */
  FrCf = 'FR_CF',
  /** French (Congo - Brazzaville) (fr-CG) */
  FrCg = 'FR_CG',
  /** French (Switzerland) (fr-CH) */
  FrCh = 'FR_CH',
  /** French (Côte d'Ivoire) (fr-CI) */
  FrCi = 'FR_CI',
  /** French (Cameroon) (fr-CM) */
  FrCm = 'FR_CM',
  /** French (Djibouti) (fr-DJ) */
  FrDj = 'FR_DJ',
  /** French (France) (fr-FR) */
  FrFr = 'FR_FR',
  /** French (Gabon) (fr-GA) */
  FrGa = 'FR_GA',
  /** French (French Guiana) (fr-GF) */
  FrGf = 'FR_GF',
  /** French (Guinea) (fr-GN) */
  FrGn = 'FR_GN',
  /** French (Guadeloupe) (fr-GP) */
  FrGp = 'FR_GP',
  /** French (Equatorial Guinea) (fr-GQ) */
  FrGq = 'FR_GQ',
  /** French (Comoros) (fr-KM) */
  FrKm = 'FR_KM',
  /** French (Luxembourg) (fr-LU) */
  FrLu = 'FR_LU',
  /** French (Monaco) (fr-MC) */
  FrMc = 'FR_MC',
  /** French (Saint Martin) (fr-MF) */
  FrMf = 'FR_MF',
  /** French (Madagascar) (fr-MG) */
  FrMg = 'FR_MG',
  /** French (Mali) (fr-ML) */
  FrMl = 'FR_ML',
  /** French (Martinique) (fr-MQ) */
  FrMq = 'FR_MQ',
  /** French (Mauritius) (fr-MU) */
  FrMu = 'FR_MU',
  /** French (Niger) (fr-NE) */
  FrNe = 'FR_NE',
  /** French (Réunion) (fr-RE) */
  FrRe = 'FR_RE',
  /** French (Rwanda) (fr-RW) */
  FrRw = 'FR_RW',
  /** French (Senegal) (fr-SN) */
  FrSn = 'FR_SN',
  /** French (Chad) (fr-TD) */
  FrTd = 'FR_TD',
  /** French (Togo) (fr-TG) */
  FrTg = 'FR_TG',
  /** French (Mayotte) (fr-YT) */
  FrYt = 'FR_YT',
  /** Irish (ga) */
  Ga = 'GA',
  /** Irish (Ireland) (ga-IE) */
  GaIe = 'GA_IE',
  /** Scottish Gaelic (gd) */
  Gd = 'GD',
  /** Scottish Gaelic (United Kingdom) */
  GdGb = 'GD_GB',
  /** Galician (gl) */
  Gl = 'GL',
  /** Galician (Spain) (gl-ES) */
  GlEs = 'GL_ES',
  /** Swiss German (gsw) */
  Gsw = 'GSW',
  /** Swiss German (Switzerland) (gsw-CH) */
  GswCh = 'GSW_CH',
  /** Gujarati (gu) */
  Gu = 'GU',
  /** Gusii (guz) */
  Guz = 'GUZ',
  /** Gusii (Kenya) (guz-KE) */
  GuzKe = 'GUZ_KE',
  /** Gujarati (India) (gu-IN) */
  GuIn = 'GU_IN',
  /** Manx (gv) */
  Gv = 'GV',
  /** Manx (United Kingdom) (gv-GB) */
  GvGb = 'GV_GB',
  /** Hausa (ha) */
  Ha = 'HA',
  /** Hawaiian (haw) */
  Haw = 'HAW',
  /** Hawaiian (United States) (haw-US) */
  HawUs = 'HAW_US',
  /** Hausa (Latin) (ha-Latn) */
  HaLatn = 'HA_LATN',
  /** Hausa (Latin, Ghana) (ha-Latn-GH) */
  HaLatnGh = 'HA_LATN_GH',
  /** Hausa (Latin, Niger) (ha-Latn-NE) */
  HaLatnNe = 'HA_LATN_NE',
  /** Hausa (Latin, Nigeria) (ha-Latn-NG) */
  HaLatnNg = 'HA_LATN_NG',
  /** Hebrew (he) */
  He = 'HE',
  /** Hebrew (Israel) (he-IL) */
  HeIl = 'HE_IL',
  /** Hindi (hi) */
  Hi = 'HI',
  /** Hindi (India) (hi-IN) */
  HiIn = 'HI_IN',
  /** Croatian (hr) */
  Hr = 'HR',
  /** Croatian (Croatia) (hr-HR) */
  HrHr = 'HR_HR',
  /** Hungarian (hu) */
  Hu = 'HU',
  /** Hungarian (Hungary) (hu-HU) */
  HuHu = 'HU_HU',
  /** Armenian (hy) */
  Hy = 'HY',
  /** Armenian (Armenia) (hy-AM) */
  HyAm = 'HY_AM',
  /** Indonesian (id) */
  Id = 'ID',
  /** Indonesian (Indonesia) (id-ID) */
  IdId = 'ID_ID',
  /** Igbo (ig) */
  Ig = 'IG',
  /** Igbo (Nigeria) (ig-NG) */
  IgNg = 'IG_NG',
  /** Sichuan Yi (ii) */
  Ii = 'II',
  /** Sichuan Yi (China) (ii-CN) */
  IiCn = 'II_CN',
  /** Icelandic (is) */
  Is = 'IS',
  /** Icelandic (Iceland) (is-IS) */
  IsIs = 'IS_IS',
  /** Italian (it) */
  It = 'IT',
  /** Italian (Switzerland) (it-CH) */
  ItCh = 'IT_CH',
  /** Italian (Italy) (it-IT) */
  ItIt = 'IT_IT',
  /** Japanese (ja) */
  Ja = 'JA',
  /** Japanese (Japan) (ja-JP) */
  JaJp = 'JA_JP',
  /** Machame (jmc) */
  Jmc = 'JMC',
  /** Machame (Tanzania) (jmc-TZ) */
  JmcTz = 'JMC_TZ',
  /** Georgian (ka) */
  Ka = 'KA',
  /** Kara-Kalpak (kaa) */
  Kaa = 'KAA',
  /** Kabyle (kab) */
  Kab = 'KAB',
  /** Kabyle (Algeria) (kab-DZ) */
  KabDz = 'KAB_DZ',
  /** Kamba (kam) */
  Kam = 'KAM',
  /** Kamba (Kenya) (kam-KE) */
  KamKe = 'KAM_KE',
  /** Georgian (Georgia) (ka-GE) */
  KaGe = 'KA_GE',
  /** Makonde (kde) */
  Kde = 'KDE',
  /** Makonde (Tanzania) (kde-TZ) */
  KdeTz = 'KDE_TZ',
  /** Kabuverdianu (kea) */
  Kea = 'KEA',
  /** Kabuverdianu (Cape Verde) (kea-CV) */
  KeaCv = 'KEA_CV',
  /** Koyra Chiini (khq) */
  Khq = 'KHQ',
  /** Koyra Chiini (Mali) (khq-ML) */
  KhqMl = 'KHQ_ML',
  /** Kikuyu (ki) */
  Ki = 'KI',
  /** Kikuyu (Kenya) (ki-KE) */
  KiKe = 'KI_KE',
  /** Kazakh (kk) */
  Kk = 'KK',
  /** Kazakh (Cyrillic) (kk-Cyrl) */
  KkCyrl = 'KK_CYRL',
  /** Kazakh (Cyrillic, Kazakhstan) (kk-Cyrl-KZ) */
  KkCyrlKz = 'KK_CYRL_KZ',
  /** Kalaallisut (kl) */
  Kl = 'KL',
  /** Kalenjin (kln) */
  Kln = 'KLN',
  /** Kalenjin (Kenya) (kln-KE) */
  KlnKe = 'KLN_KE',
  /** Kalaallisut (Greenland) (kl-GL) */
  KlGl = 'KL_GL',
  /** Khmer (km) */
  Km = 'KM',
  /** Northern Kurdish (kmr) */
  Kmr = 'KMR',
  /** Khmer (Cambodia) (km-KH) */
  KmKh = 'KM_KH',
  /** Kannada (kn) */
  Kn = 'KN',
  /** Kannada (India) (kn-IN) */
  KnIn = 'KN_IN',
  /** Korean (ko) */
  Ko = 'KO',
  /** Konkani (kok) */
  Kok = 'KOK',
  /** Konkani (India) (kok-IN) */
  KokIn = 'KOK_IN',
  /** Korean (South Korea) (ko-KR) */
  KoKr = 'KO_KR',
  /** Shambala (ksb) */
  Ksb = 'KSB',
  /** Shambala (Tanzania) (ksb-TZ) */
  KsbTz = 'KSB_TZ',
  /** Bafia (ksf) */
  Ksf = 'KSF',
  /** Bafia (Cameroon) (ksf-CM) */
  KsfCm = 'KSF_CM',
  /** Cornish (kw) */
  Kw = 'KW',
  /** Cornish (United Kingdom) (kw-GB) */
  KwGb = 'KW_GB',
  /** Kyrgyz (ky) */
  Ky = 'KY',
  /** Langi (lag) */
  Lag = 'LAG',
  /** Langi (Tanzania) (lag-TZ) */
  LagTz = 'LAG_TZ',
  /** Laotian (Laos) (lao) */
  Lao = 'LAO',
  /** Ganda (lg) */
  Lg = 'LG',
  /** Ganda (Uganda) (lg-UG) */
  LgUg = 'LG_UG',
  /** Liberian English */
  Lir = 'LIR',
  /** Lingala (ln) */
  Ln = 'LN',
  /** Lingala (Congo - Kinshasa) (ln-CD) */
  LnCd = 'LN_CD',
  /** Lingala (Congo - Brazzaville) (ln-CG) */
  LnCg = 'LN_CG',
  /** Lithuanian (lt) */
  Lt = 'LT',
  /** Lithuanian (Lithuania) (lt-LT) */
  LtLt = 'LT_LT',
  /** Luba-Katanga (lu) */
  Lu = 'LU',
  /** Luo (luo) */
  Luo = 'LUO',
  /** Luo (Kenya) (luo-KE) */
  LuoKe = 'LUO_KE',
  /** Luyia (luy) */
  Luy = 'LUY',
  /** Luyia (Kenya) (luy-KE) */
  LuyKe = 'LUY_KE',
  /** Luba-Katanga (Congo - Kinshasa) (lu-CD) */
  LuCd = 'LU_CD',
  /** Latvian (lv) */
  Lv = 'LV',
  /** Latvian (Latvia) (lv-LV) */
  LvLv = 'LV_LV',
  /** Masai (mas) */
  Mas = 'MAS',
  /** Masai (Kenya) (mas-KE) */
  MasKe = 'MAS_KE',
  /** Masai (Tanzania) (mas-TZ) */
  MasTz = 'MAS_TZ',
  /** Meru (mer) */
  Mer = 'MER',
  /** Meru (Kenya) (mer-KE) */
  MerKe = 'MER_KE',
  /** Morisyen (mfe) */
  Mfe = 'MFE',
  /** Morisyen (Mauritius) (mfe-MU) */
  MfeMu = 'MFE_MU',
  /** Malagasy (mg) */
  Mg = 'MG',
  /** Makhuwa-Meetto (mgh) */
  Mgh = 'MGH',
  /** Makhuwa-Meetto (Mozambique) (mgh-MZ) */
  MghMz = 'MGH_MZ',
  /** Malagasy (Madagascar) (mg-MG) */
  MgMg = 'MG_MG',
  /** Te Reo Māori (mi) */
  Mi = 'MI',
  /** Macedonian (mk) */
  Mk = 'MK',
  /** Macedonian (Macedonia) (mk-MK) */
  MkMk = 'MK_MK',
  /** Malayalam (ml) */
  Ml = 'ML',
  /** Malayalam (India) (ml-IN) */
  MlIn = 'ML_IN',
  /** Mongolian (mn) */
  Mn = 'MN',
  /** Marathi (mr) */
  Mr = 'MR',
  /** Marathi (India) (mr-IN) */
  MrIn = 'MR_IN',
  /** Malay (ms) */
  Ms = 'MS',
  /** Malay (Brunei) (ms-BN) */
  MsBn = 'MS_BN',
  /** Malay (Malaysia) (ms-MY) */
  MsMy = 'MS_MY',
  /** Maltese (mt) */
  Mt = 'MT',
  /** Maltese (Malta) (mt-MT) */
  MtMt = 'MT_MT',
  /** Mundang (mua) */
  Mua = 'MUA',
  /** Mundang (Cameroon) (mua-CM) */
  MuaCm = 'MUA_CM',
  /** Burmese (my) */
  My = 'MY',
  /** Burmese (Myanmar [Burma]) (my-MM) */
  MyMm = 'MY_MM',
  /** Nama (naq) */
  Naq = 'NAQ',
  /** Nama (Namibia) (naq-NA) */
  NaqNa = 'NAQ_NA',
  /** Norwegian Bokmål (nb) */
  Nb = 'NB',
  /** Norwegian Bokmål (Norway) (nb-NO) */
  NbNo = 'NB_NO',
  /** North Ndebele (nd) */
  Nd = 'ND',
  /** North Ndebele (Zimbabwe) (nd-ZW) */
  NdZw = 'ND_ZW',
  /** Nepali (ne) */
  Ne = 'NE',
  /** Nepali (India) (ne-IN) */
  NeIn = 'NE_IN',
  /** Nepali (Nepal) (ne-NP) */
  NeNp = 'NE_NP',
  /** Dutch (nl) */
  Nl = 'NL',
  /** Dutch (Aruba) (nl-AW) */
  NlAw = 'NL_AW',
  /** Dutch (Belgium) (nl-BE) */
  NlBe = 'NL_BE',
  /** Dutch (Curaçao) (nl-CW) */
  NlCw = 'NL_CW',
  /** Dutch (Netherlands) (nl-NL) */
  NlNl = 'NL_NL',
  /** Dutch (Sint Maarten) (nl-SX) */
  NlSx = 'NL_SX',
  /** Kwasio (nmg) */
  Nmg = 'NMG',
  /** Kwasio (Cameroon) (nmg-CM) */
  NmgCm = 'NMG_CM',
  /** Norwegian Nynorsk (nn) */
  Nn = 'NN',
  /** Norwegian Nynorsk (Norway) (nn-NO) */
  NnNo = 'NN_NO',
  /** Nuer (nus) */
  Nus = 'NUS',
  /** Nuer (Sudan) (nus-SD) */
  NusSd = 'NUS_SD',
  /** Nyankole (nyn) */
  Nyn = 'NYN',
  /** Nyankole (Uganda) (nyn-UG) */
  NynUg = 'NYN_UG',
  /** Oromo (om) */
  Om = 'OM',
  /** Oromo (Ethiopia) (om-ET) */
  OmEt = 'OM_ET',
  /** Oromo (Kenya) (om-KE) */
  OmKe = 'OM_KE',
  /** Oriya (or) */
  Or = 'OR',
  /** Oriya (India) (or-IN) */
  OrIn = 'OR_IN',
  /** Punjabi (pa) */
  Pa = 'PA',
  /** Punjabi (Arabic) (pa-Arab) */
  PaArab = 'PA_ARAB',
  /** Punjabi (Arabic, Pakistan) (pa-Arab-PK) */
  PaArabPk = 'PA_ARAB_PK',
  /** Punjabi (Gurmukhi) (pa-Guru) */
  PaGuru = 'PA_GURU',
  /** Punjabi (Gurmukhi, India) (pa-Guru-IN) */
  PaGuruIn = 'PA_GURU_IN',
  /** Polish (pl) */
  Pl = 'PL',
  /** Polish (Poland) (pl-PL) */
  PlPl = 'PL_PL',
  /** Pashto (ps) */
  Ps = 'PS',
  /** Pashto (Afghanistan) (ps-AF) */
  PsAf = 'PS_AF',
  /** Portuguese (pt) */
  Pt = 'PT',
  /** Portuguese (Angola) (pt-AO) */
  PtAo = 'PT_AO',
  /** Portuguese (Brazil) (pt-BR) */
  PtBr = 'PT_BR',
  /** Portuguese (Guinea-Bissau) (pt-GW) */
  PtGw = 'PT_GW',
  /** Portuguese (Mozambique) (pt-MZ) */
  PtMz = 'PT_MZ',
  /** Portuguese (Portugal) (pt-PT) */
  PtPt = 'PT_PT',
  /** Portuguese (São Tomé and Príncipe) (pt-ST) */
  PtSt = 'PT_ST',
  /** Romansh (rm) */
  Rm = 'RM',
  /** Romansh (Switzerland) (rm-CH) */
  RmCh = 'RM_CH',
  /** Rundi (rn) */
  Rn = 'RN',
  /** Rundi (Burundi) (rn-BI) */
  RnBi = 'RN_BI',
  /** Romanian (ro) */
  Ro = 'RO',
  /** Rombo (rof) */
  Rof = 'ROF',
  /** Rombo (Tanzania) (rof-TZ) */
  RofTz = 'ROF_TZ',
  /** Romanian (Moldova) (ro-MD) */
  RoMd = 'RO_MD',
  /** Romanian (Romania) (ro-RO) */
  RoRo = 'RO_RO',
  /** Russian (ru) */
  Ru = 'RU',
  /** Russian (Moldova) (ru-MD) */
  RuMd = 'RU_MD',
  /** Russian (Russia) (ru-RU) */
  RuRu = 'RU_RU',
  /** Russian (Ukraine) (ru-UA) */
  RuUa = 'RU_UA',
  /** Kinyarwanda (rw) */
  Rw = 'RW',
  /** Rwa (rwk) */
  Rwk = 'RWK',
  /** Rwa (Tanzania) (rwk-TZ) */
  RwkTz = 'RWK_TZ',
  /** Kinyarwanda (Rwanda) (rw-RW) */
  RwRw = 'RW_RW',
  /** Sanskrit (sa) */
  Sa = 'SA',
  /** Samburu (saq) */
  Saq = 'SAQ',
  /** Samburu (Kenya) (saq-KE) */
  SaqKe = 'SAQ_KE',
  /** Sangu (sbp) */
  Sbp = 'SBP',
  /** Sangu (Tanzania) (sbp-TZ) */
  SbpTz = 'SBP_TZ',
  /** Southern Kurdish (sdh) */
  Sdh = 'SDH',
  /** Northern Sami */
  Se = 'SE',
  /** Sena (seh) */
  Seh = 'SEH',
  /** Sena (Mozambique) (seh-MZ) */
  SehMz = 'SEH_MZ',
  /** Koyraboro Senni (ses) */
  Ses = 'SES',
  /** Koyraboro Senni (Mali) (ses-ML) */
  SesMl = 'SES_ML',
  /** Northern Sami (Finland) */
  SeFi = 'SE_FI',
  /** Northern Sami (Norway) */
  SeNo = 'SE_NO',
  /** Northern Sami (Sweden) */
  SeSe = 'SE_SE',
  /** Sango (sg) */
  Sg = 'SG',
  /** Sango (Central African Republic) (sg-CF) */
  SgCf = 'SG_CF',
  /** Tachelhit (shi) */
  Shi = 'SHI',
  /** Tachelhit (Latin) (shi-Latn) */
  ShiLatn = 'SHI_LATN',
  /** Tachelhit (Latin, Morocco) (shi-Latn-MA) */
  ShiLatnMa = 'SHI_LATN_MA',
  /** Tachelhit (Tifinagh) (shi-Tfng) */
  ShiTfng = 'SHI_TFNG',
  /** Tachelhit (Tifinagh, Morocco) (shi-Tfng-MA) */
  ShiTfngMa = 'SHI_TFNG_MA',
  /** Sinhala (si) */
  Si = 'SI',
  /** Sinhala (Sri Lanka) (si-LK) */
  SiLk = 'SI_LK',
  /** Slovak (sk) */
  Sk = 'SK',
  /** Slovak (Slovakia) (sk-SK) */
  SkSk = 'SK_SK',
  /** Slovenian (sl) */
  Sl = 'SL',
  /** Slovenian (Slovenia) (sl-SI) */
  SlSi = 'SL_SI',
  /** Inari Sami */
  Smn = 'SMN',
  /** Inari Sami (Finland) */
  SmnFi = 'SMN_FI',
  /** Shona (sn) */
  Sn = 'SN',
  /** Shona (Zimbabwe) (sn-ZW) */
  SnZw = 'SN_ZW',
  /** Somali (so) */
  So = 'SO',
  /** Somali (Djibouti) (so-DJ) */
  SoDj = 'SO_DJ',
  /** Somali (Ethiopia) (so-ET) */
  SoEt = 'SO_ET',
  /** Somali (Kenya) (so-KE) */
  SoKe = 'SO_KE',
  /** Somali (Somalia) (so-SO) */
  SoSo = 'SO_SO',
  /** Albanian (sq) */
  Sq = 'SQ',
  /** Albanian (Albania) (sq-AL) */
  SqAl = 'SQ_AL',
  /** Serbian (sr) */
  Sr = 'SR',
  /** Serbian (Cyrillic) (sr-Cyrl) */
  SrCyrl = 'SR_CYRL',
  /** Serbian (Cyrillic, Bosnia and Herzegovina)(sr-Cyrl-BA)  */
  SrCyrlBa = 'SR_CYRL_BA',
  /** Serbian (Cyrillic, Montenegro) (sr-Cyrl-ME) */
  SrCyrlMe = 'SR_CYRL_ME',
  /** Serbian (Cyrillic, Serbia) (sr-Cyrl-RS) */
  SrCyrlRs = 'SR_CYRL_RS',
  /** Serbian (Latin) (sr-Latn) */
  SrLatn = 'SR_LATN',
  /** Serbian (Latin, Bosnia and Herzegovina) (sr-Latn-BA)  */
  SrLatnBa = 'SR_LATN_BA',
  /** Serbian (Latin, Montenegro) (sr-Latn-ME) */
  SrLatnMe = 'SR_LATN_ME',
  /** Serbian (Latin, Serbia) (sr-Latn-RS) */
  SrLatnRs = 'SR_LATN_RS',
  /** Swedish (sv) */
  Sv = 'SV',
  /** Vincentian Creole English */
  Svc = 'SVC',
  /** Swedish (Finland) (sv-FI) */
  SvFi = 'SV_FI',
  /** Swedish (Sweden) (sv-SE) */
  SvSe = 'SV_SE',
  /** Swahili (sw) */
  Sw = 'SW',
  /** Congo Swahili (swc) */
  Swc = 'SWC',
  /** Congo Swahili (Congo - Kinshasa) (swc-CD) */
  SwcCd = 'SWC_CD',
  /** Swahili (Kenya) (sw-KE) */
  SwKe = 'SW_KE',
  /** Swahili (Tanzania) (sw-TZ) */
  SwTz = 'SW_TZ',
  /** Tamil (ta) */
  Ta = 'TA',
  /** Tamil (India) (ta-IN) */
  TaIn = 'TA_IN',
  /** Tamil (Sri Lanka) (ta-LK) */
  TaLk = 'TA_LK',
  /** Turks And Caicos Creole English */
  Tch = 'TCH',
  /** Telugu (te) */
  Te = 'TE',
  /** Teso (teo) */
  Teo = 'TEO',
  /** Teso (Kenya) (teo-KE) */
  TeoKe = 'TEO_KE',
  /** Teso (Uganda) (teo-UG) */
  TeoUg = 'TEO_UG',
  /** Telugu (India) (te-IN) */
  TeIn = 'TE_IN',
  /** Tajik (tg) */
  Tg = 'TG',
  /** Thai (th) */
  Th = 'TH',
  /** Thai (Thailand) (th-TH) */
  ThTh = 'TH_TH',
  /** Tigrinya (ti) */
  Ti = 'TI',
  /** Tigrinya (Eritrea) (ti-ER) */
  TiEr = 'TI_ER',
  /** Tigrinya (Ethiopia) (ti-ET) */
  TiEt = 'TI_ET',
  /** Turkmen (tk) */
  Tk = 'TK',
  /** Tongan (to) */
  To = 'TO',
  /** Tongan (Tonga) (to-TO) */
  ToTo = 'TO_TO',
  /** Turkish (tr) */
  Tr = 'TR',
  /** Turkish (Turkey) (tr-TR) */
  TrTr = 'TR_TR',
  /** Tasawaq (twq) */
  Twq = 'TWQ',
  /** Tasawaq (Niger) (twq-NE) */
  TwqNe = 'TWQ_NE',
  /** Central Morocco Tamazight (tzm) */
  Tzm = 'TZM',
  /** Central Morocco Tamazight (Latin) (tzm-Latn) */
  TzmLatn = 'TZM_LATN',
  /** Central Morocco Tamazight (Latin, Morocco) (tzm-Latn-MA)  */
  TzmLatnMa = 'TZM_LATN_MA',
  /** Uyghur */
  Ug = 'UG',
  /** Uyghur (China) */
  UgCn = 'UG_CN',
  /** Ukrainian (uk) */
  Uk = 'UK',
  /** Ukrainian (Ukraine) (uk-UA) */
  UkUa = 'UK_UA',
  /** Urdu (ur) */
  Ur = 'UR',
  /** Urdu (India) (ur-IN) */
  UrIn = 'UR_IN',
  /** Urdu (Pakistan) (ur-PK) */
  UrPk = 'UR_PK',
  /** Uzbek (uz) */
  Uz = 'UZ',
  /** Uzbek (Arabic) (uz-Arab) */
  UzArab = 'UZ_ARAB',
  /** Uzbek (Arabic, Afghanistan) (uz-Arab-AF) */
  UzArabAf = 'UZ_ARAB_AF',
  /** Uzbek (Cyrillic) (uz-Cyrl) */
  UzCyrl = 'UZ_CYRL',
  /** Uzbek (Cyrillic, Uzbekistan) (uz-Cyrl-UZ) */
  UzCyrlUz = 'UZ_CYRL_UZ',
  /** Uzbek (Latin) (uz-Latn) */
  UzLatn = 'UZ_LATN',
  /** Uzbek (Latin, Uzbekistan) (uz-Latn-UZ) */
  UzLatnUz = 'UZ_LATN_UZ',
  /** Vai (vai) */
  Vai = 'VAI',
  /** Vai (Latin) (vai-Latn) */
  VaiLatn = 'VAI_LATN',
  /** Vai (Latin, Liberia) (vai-Latn-LR) */
  VaiLatnLr = 'VAI_LATN_LR',
  /** Vai (Vai) (vai-Vaii) */
  VaiVaii = 'VAI_VAII',
  /** Vai (Vai, Liberia) (vai-Vaii-LR) */
  VaiVaiiLr = 'VAI_VAII_LR',
  /** Valencian (val) */
  Val = 'VAL',
  /** Valencian (Spain) (val-ES) */
  ValEs = 'VAL_ES',
  /** Vietnamese (vi) */
  Vi = 'VI',
  /** Virgin Islands Creole English */
  Vic = 'VIC',
  /** Vietnamese (Vietnam) (vi-VN) */
  ViVn = 'VI_VN',
  /** Vunjo (vun) */
  Vun = 'VUN',
  /** Vunjo (Tanzania) (vun-TZ) */
  VunTz = 'VUN_TZ',
  /** Wolof (wo) */
  Wo = 'WO',
  /** Xhosa (xh) */
  Xh = 'XH',
  /** Soga (xog) */
  Xog = 'XOG',
  /** Soga (Uganda) (xog-UG) */
  XogUg = 'XOG_UG',
  /** Yangben (yav) */
  Yav = 'YAV',
  /** Yangben (Cameroon) (yav-CM) */
  YavCm = 'YAV_CM',
  /** Yoruba (yo) */
  Yo = 'YO',
  /** Yoruba (Nigeria) (yo-NG) */
  YoNg = 'YO_NG',
  /** Chinese (zh) */
  Zh = 'ZH',
  /** Chinese (Simplified, China) (zh-CN) */
  ZhCn = 'ZH_CN',
  /** Chinese (Simplified) (zh-Hans) */
  ZhHans = 'ZH_HANS',
  /** Chinese (Simplified, China) (zh-Hans-CN) */
  ZhHansCn = 'ZH_HANS_CN',
  /** Chinese (Simplified, Hong Kong SAR China) (zh-Hans-HK) */
  ZhHansHk = 'ZH_HANS_HK',
  /** Chinese (Simplified, Macau SAR China) (zh-Hans-MO)  */
  ZhHansMo = 'ZH_HANS_MO',
  /** Chinese (Simplified, Singapore) (zh-Hans-SG) */
  ZhHansSg = 'ZH_HANS_SG',
  /** Chinese (Traditional) (zh-Hant) */
  ZhHant = 'ZH_HANT',
  /** Chinese (Traditional, Hong Kong SAR China) (zh-Hant-HK)  */
  ZhHantHk = 'ZH_HANT_HK',
  /** Chinese (Traditional, Macau SAR China) (zh-Hant-MO)  */
  ZhHantMo = 'ZH_HANT_MO',
  /** Chinese (Traditional, Taiwan) (zh-Hant-TW) */
  ZhHantTw = 'ZH_HANT_TW',
  /** Zulu (zu) */
  Zu = 'ZU',
  /** Zulu (South Africa) (zu-ZA) */
  ZuZa = 'ZU_ZA'
}

/** A location, such as a web shop or distribution platform, where a publication can be acquired or viewed. */
export type Location = {
  __typename?: 'Location';
  /** Whether this is the canonical location for this specific publication (e.g. the main platform on which the print version is sold, or the official version of record hosted on the publisher's own web server) */
  canonical: Scalars['Boolean']['output'];
  /** Date and time at which the location record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Direct link to the full text file */
  fullTextUrl?: Maybe<Scalars['String']['output']>;
  /** Public-facing URL via which the publication can be accessed */
  landingPage?: Maybe<Scalars['String']['output']>;
  /** Thoth ID of the location */
  locationId: Scalars['Uuid']['output'];
  /** Platform where the publication is hosted or can be acquired */
  locationPlatform: LocationPlatform;
  /** Get the publication linked to this location */
  publication: Publication;
  /** Thoth ID of the publication linked to this location */
  publicationId: Scalars['Uuid']['output'];
  /** Date and time at which the location record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
};

/** Field to use when sorting locations list */
export enum LocationField {
  Canonical = 'CANONICAL',
  CreatedAt = 'CREATED_AT',
  FullTextUrl = 'FULL_TEXT_URL',
  LandingPage = 'LANDING_PAGE',
  LocationId = 'LOCATION_ID',
  LocationPlatform = 'LOCATION_PLATFORM',
  PublicationId = 'PUBLICATION_ID',
  UpdatedAt = 'UPDATED_AT'
}

/** Field and order to use when sorting locations list */
export type LocationOrderBy = {
  direction: Direction;
  field: LocationField;
};

/** Platform where a publication is hosted or can be acquired */
export enum LocationPlatform {
  /** DOAB (Directory of Open Access Books): https://doabooks.org */
  Doab = 'DOAB',
  /** EBSCO Host */
  EbscoHost = 'EBSCO_HOST',
  /** EBSCO Knowledge Base */
  EbscoKb = 'EBSCO_KB',
  /** Google Books: https://books.google.com */
  GoogleBooks = 'GOOGLE_BOOKS',
  /** Internet Archive: https://archive.org */
  InternetArchive = 'INTERNET_ARCHIVE',
  /** JISC Knowledge Base */
  JiscKb = 'JISC_KB',
  /** JSTOR: https://jstor.org */
  Jstor = 'JSTOR',
  /** OAPEN (Open Access Publishing in European Networks): https://oapen.org */
  Oapen = 'OAPEN',
  /** OCLC Knowledge Base */
  OclcKb = 'OCLC_KB',
  /** Another platform not listed above */
  Other = 'OTHER',
  /** Project MUSE: https://muse.jhu.edu */
  ProjectMuse = 'PROJECT_MUSE',
  /** ProQuest ExLibris */
  ProquestExlibris = 'PROQUEST_EXLIBRIS',
  /** ProQuest Knowledge Base */
  ProquestKb = 'PROQUEST_KB',
  /** Publisher's own website */
  PublisherWebsite = 'PUBLISHER_WEBSITE',
  /** SciELO (Scientific Electronic Library Online) Books: https://books.scielo.org */
  ScieloBooks = 'SCIELO_BOOKS',
  /** ScienceOpen: https://scienceopen.com */
  ScienceOpen = 'SCIENCE_OPEN',
  /** Publisher CDN hosted by Thoth */
  Thoth = 'THOTH',
  /** Zenodo: https://zenodo.org */
  Zenodo = 'ZENODO'
}

/** Allowed markup formats for text fields that support structured content */
export enum MarkupFormat {
  /** HTML format */
  Html = 'HTML',
  /** JATS XML format */
  JatsXml = 'JATS_XML',
  /** Markdown format */
  Markdown = 'MARKDOWN',
  /** Plain text format */
  PlainText = 'PLAIN_TEXT'
}

export type Me = {
  __typename?: 'Me';
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  isSuperuser: Scalars['Boolean']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  publisherContexts: Array<PublisherContext>;
  userId: Scalars['String']['output'];
};

export type MutationRoot = {
  __typename?: 'MutationRoot';
  /** Complete a file upload, validate it, and promote it to its final DOI-based location. */
  completeFileUpload: File;
  /** Create a new abstract with the specified values */
  createAbstract: Abstract;
  /** Create a new additional resource with the specified values */
  createAdditionalResource: WorkResource;
  /** Create a new affiliation with the specified values */
  createAffiliation: Affiliation;
  /** Create a new award with the specified values */
  createAward: Award;
  /** Create a new biography with the specified values */
  createBiography: Biography;
  /** Create a new book review with the specified values */
  createBookReview: BookReview;
  /** Create a new contact with the specified values */
  createContact: Contact;
  /** Create a new contribution with the specified values */
  createContribution: Contribution;
  /** Create a new contributor with the specified values */
  createContributor: Contributor;
  /** Create a new endorsement with the specified values */
  createEndorsement: Endorsement;
  /** Create a new funding with the specified values */
  createFunding: Funding;
  /** Create a new imprint with the specified values */
  createImprint: Imprint;
  /** Create a new institution with the specified values */
  createInstitution: Institution;
  /** Create a new issue with the specified values */
  createIssue: Issue;
  /** Create a new language with the specified values */
  createLanguage: Language;
  /** Create a new location with the specified values */
  createLocation: Location;
  /** Create a new price with the specified values */
  createPrice: Price;
  /** Create a new publication with the specified values */
  createPublication: Publication;
  /** Create a new publisher with the specified values */
  createPublisher: Publisher;
  /** Create a new reference with the specified values */
  createReference: Reference;
  /** Create a new series with the specified values */
  createSeries: Series;
  /** Create a new subject with the specified values */
  createSubject: Subject;
  /** Create a new title with the specified values */
  createTitle: Title;
  /** Create a new work with the specified values */
  createWork: Work;
  /** Create a new featured video with the specified values */
  createWorkFeaturedVideo: WorkFeaturedVideo;
  /** Create a new work relation with the specified values */
  createWorkRelation: WorkRelation;
  /** Delete a single abstract using its ID */
  deleteAbstract: Abstract;
  /** Delete a single additional resource using its ID */
  deleteAdditionalResource: WorkResource;
  /** Delete a single affiliation using its ID */
  deleteAffiliation: Affiliation;
  /** Delete a single award using its ID */
  deleteAward: Award;
  /** Delete a single biography using its ID */
  deleteBiography: Biography;
  /** Delete a single book review using its ID */
  deleteBookReview: BookReview;
  /** Delete a single contact using its ID */
  deleteContact: Contact;
  /** Delete a single contribution using its ID */
  deleteContribution: Contribution;
  /** Delete a single contributor using its ID */
  deleteContributor: Contributor;
  /** Delete a single endorsement using its ID */
  deleteEndorsement: Endorsement;
  /** Delete a single funding using its ID */
  deleteFunding: Funding;
  /** Delete a single imprint using its ID */
  deleteImprint: Imprint;
  /** Delete a single institution using its ID */
  deleteInstitution: Institution;
  /** Delete a single issue using its ID */
  deleteIssue: Issue;
  /** Delete a single language using its ID */
  deleteLanguage: Language;
  /** Delete a single location using its ID */
  deleteLocation: Location;
  /** Delete a single price using its ID */
  deletePrice: Price;
  /** Delete a single publication using its ID */
  deletePublication: Publication;
  /** Delete a single publisher using its ID */
  deletePublisher: Publisher;
  /** Delete a single reference using its ID */
  deleteReference: Reference;
  /** Delete a single series using its ID */
  deleteSeries: Series;
  /** Delete a single subject using its ID */
  deleteSubject: Subject;
  /** Delete a single title using its ID */
  deleteTitle: Title;
  /** Delete a single work using its ID */
  deleteWork: Work;
  /** Delete a single featured video using its ID */
  deleteWorkFeaturedVideo: WorkFeaturedVideo;
  /** Delete a single work relation using its ID */
  deleteWorkRelation: WorkRelation;
  /** Start uploading a file for an additional resource. Supported resource types include AUDIO, VIDEO, IMAGE, DOCUMENT, DATASET, and SPREADSHEET. */
  initAdditionalResourceFileUpload: FileUploadResponse;
  /** Start uploading a front cover image for a given work. Returns an upload session ID, a presigned S3 PUT URL, and required PUT headers. */
  initFrontcoverFileUpload: FileUploadResponse;
  /** Start uploading a publication file (e.g. PDF, EPUB, XML) for a given publication. Returns an upload session ID, a presigned S3 PUT URL, and required PUT headers. */
  initPublicationFileUpload: FileUploadResponse;
  /** Start uploading a hosted featured video for a work. The uploaded file is promoted to a DOI-scoped resource path. */
  initWorkFeaturedVideoFileUpload: FileUploadResponse;
  /** Change the ordering of an additional resource within a work */
  moveAdditionalResource: WorkResource;
  /** Change the ordering of an affiliation within a contribution */
  moveAffiliation: Affiliation;
  /** Change the ordering of an award within a work */
  moveAward: Award;
  /** Change the ordering of a book review within a work */
  moveBookReview: BookReview;
  /** Change the ordering of a contribution within a work */
  moveContribution: Contribution;
  /** Change the ordering of an endorsement within a work */
  moveEndorsement: Endorsement;
  /** Change the ordering of an issue within a series */
  moveIssue: Issue;
  /** Change the ordering of a reference within a work */
  moveReference: Reference;
  /** Change the ordering of a subject within a work */
  moveSubject: Subject;
  /** Change the ordering of a work relation within a work */
  moveWorkRelation: WorkRelation;
  /** Update an existing abstract with the specified values */
  updateAbstract: Abstract;
  /** Update an existing additional resource with the specified values */
  updateAdditionalResource: WorkResource;
  /** Update an existing affiliation with the specified values */
  updateAffiliation: Affiliation;
  /** Update an existing award with the specified values */
  updateAward: Award;
  /** Update an existing biography with the specified values */
  updateBiography: Biography;
  /** Update an existing book review with the specified values */
  updateBookReview: BookReview;
  /** Update an existing contact with the specified values */
  updateContact: Contact;
  /** Update an existing contribution with the specified values */
  updateContribution: Contribution;
  /** Update an existing contributor with the specified values */
  updateContributor: Contributor;
  /** Update an existing endorsement with the specified values */
  updateEndorsement: Endorsement;
  /** Update an existing funding with the specified values */
  updateFunding: Funding;
  /** Update an existing imprint with the specified values */
  updateImprint: Imprint;
  /** Update an existing institution with the specified values */
  updateInstitution: Institution;
  /** Update an existing issue with the specified values */
  updateIssue: Issue;
  /** Update an existing language with the specified values */
  updateLanguage: Language;
  /** Update an existing location with the specified values */
  updateLocation: Location;
  /** Update an existing price with the specified values */
  updatePrice: Price;
  /** Update an existing publication with the specified values */
  updatePublication: Publication;
  /** Update an existing publisher with the specified values */
  updatePublisher: Publisher;
  /** Update an existing reference with the specified values */
  updateReference: Reference;
  /** Update an existing series with the specified values */
  updateSeries: Series;
  /** Update an existing subject with the specified values */
  updateSubject: Subject;
  /** Update an existing title with the specified values */
  updateTitle: Title;
  /** Update an existing work with the specified values */
  updateWork: Work;
  /** Update an existing featured video with the specified values */
  updateWorkFeaturedVideo: WorkFeaturedVideo;
  /** Update an existing work relation with the specified values */
  updateWorkRelation: WorkRelation;
};


export type MutationRootCompleteFileUploadArgs = {
  data: CompleteFileUpload;
};


export type MutationRootCreateAbstractArgs = {
  data: NewAbstract;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootCreateAdditionalResourceArgs = {
  data: NewAdditionalResource;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootCreateAffiliationArgs = {
  data: NewAffiliation;
};


export type MutationRootCreateAwardArgs = {
  data: NewAward;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootCreateBiographyArgs = {
  data: NewBiography;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootCreateBookReviewArgs = {
  data: NewBookReview;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootCreateContactArgs = {
  data: NewContact;
};


export type MutationRootCreateContributionArgs = {
  data: NewContribution;
};


export type MutationRootCreateContributorArgs = {
  data: NewContributor;
};


export type MutationRootCreateEndorsementArgs = {
  data: NewEndorsement;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootCreateFundingArgs = {
  data: NewFunding;
};


export type MutationRootCreateImprintArgs = {
  data: NewImprint;
};


export type MutationRootCreateInstitutionArgs = {
  data: NewInstitution;
};


export type MutationRootCreateIssueArgs = {
  data: NewIssue;
};


export type MutationRootCreateLanguageArgs = {
  data: NewLanguage;
};


export type MutationRootCreateLocationArgs = {
  data: NewLocation;
};


export type MutationRootCreatePriceArgs = {
  data: NewPrice;
};


export type MutationRootCreatePublicationArgs = {
  data: NewPublication;
};


export type MutationRootCreatePublisherArgs = {
  data: NewPublisher;
};


export type MutationRootCreateReferenceArgs = {
  data: NewReference;
};


export type MutationRootCreateSeriesArgs = {
  data: NewSeries;
};


export type MutationRootCreateSubjectArgs = {
  data: NewSubject;
};


export type MutationRootCreateTitleArgs = {
  data: NewTitle;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootCreateWorkArgs = {
  data: NewWork;
};


export type MutationRootCreateWorkFeaturedVideoArgs = {
  data: NewWorkFeaturedVideo;
};


export type MutationRootCreateWorkRelationArgs = {
  data: NewWorkRelation;
};


export type MutationRootDeleteAbstractArgs = {
  abstractId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteAdditionalResourceArgs = {
  additionalResourceId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteAffiliationArgs = {
  affiliationId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteAwardArgs = {
  awardId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteBiographyArgs = {
  biographyId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteBookReviewArgs = {
  bookReviewId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteContactArgs = {
  contactId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteContributionArgs = {
  contributionId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteContributorArgs = {
  contributorId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteEndorsementArgs = {
  endorsementId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteFundingArgs = {
  fundingId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteImprintArgs = {
  imprintId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteInstitutionArgs = {
  institutionId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteIssueArgs = {
  issueId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteLanguageArgs = {
  languageId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteLocationArgs = {
  locationId: Scalars['Uuid']['input'];
};


export type MutationRootDeletePriceArgs = {
  priceId: Scalars['Uuid']['input'];
};


export type MutationRootDeletePublicationArgs = {
  publicationId: Scalars['Uuid']['input'];
};


export type MutationRootDeletePublisherArgs = {
  publisherId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteReferenceArgs = {
  referenceId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteSeriesArgs = {
  seriesId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteSubjectArgs = {
  subjectId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteTitleArgs = {
  titleId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteWorkArgs = {
  workId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteWorkFeaturedVideoArgs = {
  workFeaturedVideoId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteWorkRelationArgs = {
  workRelationId: Scalars['Uuid']['input'];
};


export type MutationRootInitAdditionalResourceFileUploadArgs = {
  data: NewAdditionalResourceFileUpload;
};


export type MutationRootInitFrontcoverFileUploadArgs = {
  data: NewFrontcoverFileUpload;
};


export type MutationRootInitPublicationFileUploadArgs = {
  data: NewPublicationFileUpload;
};


export type MutationRootInitWorkFeaturedVideoFileUploadArgs = {
  data: NewWorkFeaturedVideoFileUpload;
};


export type MutationRootMoveAdditionalResourceArgs = {
  additionalResourceId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
};


export type MutationRootMoveAffiliationArgs = {
  affiliationId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
};


export type MutationRootMoveAwardArgs = {
  awardId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
};


export type MutationRootMoveBookReviewArgs = {
  bookReviewId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
};


export type MutationRootMoveContributionArgs = {
  contributionId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
};


export type MutationRootMoveEndorsementArgs = {
  endorsementId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
};


export type MutationRootMoveIssueArgs = {
  issueId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
};


export type MutationRootMoveReferenceArgs = {
  newOrdinal: Scalars['Int']['input'];
  referenceId: Scalars['Uuid']['input'];
};


export type MutationRootMoveSubjectArgs = {
  newOrdinal: Scalars['Int']['input'];
  subjectId: Scalars['Uuid']['input'];
};


export type MutationRootMoveWorkRelationArgs = {
  newOrdinal: Scalars['Int']['input'];
  workRelationId: Scalars['Uuid']['input'];
};


export type MutationRootUpdateAbstractArgs = {
  data: PatchAbstract;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootUpdateAdditionalResourceArgs = {
  data: PatchAdditionalResource;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootUpdateAffiliationArgs = {
  data: PatchAffiliation;
};


export type MutationRootUpdateAwardArgs = {
  data: PatchAward;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootUpdateBiographyArgs = {
  data: PatchBiography;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootUpdateBookReviewArgs = {
  data: PatchBookReview;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootUpdateContactArgs = {
  data: PatchContact;
};


export type MutationRootUpdateContributionArgs = {
  data: PatchContribution;
};


export type MutationRootUpdateContributorArgs = {
  data: PatchContributor;
};


export type MutationRootUpdateEndorsementArgs = {
  data: PatchEndorsement;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootUpdateFundingArgs = {
  data: PatchFunding;
};


export type MutationRootUpdateImprintArgs = {
  data: PatchImprint;
};


export type MutationRootUpdateInstitutionArgs = {
  data: PatchInstitution;
};


export type MutationRootUpdateIssueArgs = {
  data: PatchIssue;
};


export type MutationRootUpdateLanguageArgs = {
  data: PatchLanguage;
};


export type MutationRootUpdateLocationArgs = {
  data: PatchLocation;
};


export type MutationRootUpdatePriceArgs = {
  data: PatchPrice;
};


export type MutationRootUpdatePublicationArgs = {
  data: PatchPublication;
};


export type MutationRootUpdatePublisherArgs = {
  data: PatchPublisher;
};


export type MutationRootUpdateReferenceArgs = {
  data: PatchReference;
};


export type MutationRootUpdateSeriesArgs = {
  data: PatchSeries;
};


export type MutationRootUpdateSubjectArgs = {
  data: PatchSubject;
};


export type MutationRootUpdateTitleArgs = {
  data: PatchTitle;
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type MutationRootUpdateWorkArgs = {
  data: PatchWork;
};


export type MutationRootUpdateWorkFeaturedVideoArgs = {
  data: PatchWorkFeaturedVideo;
};


export type MutationRootUpdateWorkRelationArgs = {
  data: PatchWorkRelation;
};

/** Set of values required to define a new work's abstract */
export type NewAbstract = {
  abstractType: AbstractType;
  canonical: Scalars['Boolean']['input'];
  content: Scalars['String']['input'];
  localeCode: LocaleCode;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new additional resource linked to a work */
export type NewAdditionalResource = {
  attribution?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['Date']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  doi?: InputMaybe<Scalars['Doi']['input']>;
  handle?: InputMaybe<Scalars['String']['input']>;
  resourceOrdinal: Scalars['Int']['input'];
  resourceType: ResourceType;
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Input for starting an upload for an additional resource asset. */
export type NewAdditionalResourceFileUpload = {
  /** Thoth ID of the additional resource linked to this file. */
  additionalResourceId: Scalars['Uuid']['input'];
  /** File extension to use in the final canonical key, e.g. 'jpg', 'png', 'mp4', 'xlsx'. */
  declaredExtension: Scalars['String']['input'];
  /** MIME type declared by the client (used for validation and in the presigned URL). */
  declaredMimeType: Scalars['String']['input'];
  /** SHA-256 checksum of the file, hex-encoded. */
  declaredSha256: Scalars['String']['input'];
};

/** Set of values required to define a new association between a person and an institution for a specific contribution */
export type NewAffiliation = {
  affiliationOrdinal: Scalars['Int']['input'];
  contributionId: Scalars['Uuid']['input'];
  institutionId: Scalars['Uuid']['input'];
  position?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to define a new award linked to a work */
export type NewAward = {
  awardOrdinal: Scalars['Int']['input'];
  category?: InputMaybe<Scalars['String']['input']>;
  prizeStatement?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<AwardRole>;
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new work's biography */
export type NewBiography = {
  canonical: Scalars['Boolean']['input'];
  content: Scalars['String']['input'];
  contributionId: Scalars['Uuid']['input'];
  localeCode: LocaleCode;
};

/** Set of values required to define a new book review linked to a work */
export type NewBookReview = {
  authorName?: InputMaybe<Scalars['String']['input']>;
  doi?: InputMaybe<Scalars['Doi']['input']>;
  journalIssn?: InputMaybe<Scalars['String']['input']>;
  journalName?: InputMaybe<Scalars['String']['input']>;
  journalNumber?: InputMaybe<Scalars['String']['input']>;
  journalVolume?: InputMaybe<Scalars['String']['input']>;
  pageRange?: InputMaybe<Scalars['String']['input']>;
  reviewDate?: InputMaybe<Scalars['Date']['input']>;
  reviewOrdinal: Scalars['Int']['input'];
  reviewerInstitutionId?: InputMaybe<Scalars['Uuid']['input']>;
  reviewerOrcid?: InputMaybe<Scalars['Orcid']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new way of getting in touch with a publisher */
export type NewContact = {
  contactType: ContactType;
  email: Scalars['String']['input'];
  publisherId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new individual involvement in the production of a work */
export type NewContribution = {
  contributionOrdinal: Scalars['Int']['input'];
  contributionType: ContributionType;
  contributorId: Scalars['Uuid']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  fullName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  mainContribution: Scalars['Boolean']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new individual involved in the production of works */
export type NewContributor = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  fullName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  orcid?: InputMaybe<Scalars['Orcid']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to define a new endorsement linked to a work */
export type NewEndorsement = {
  authorInstitutionId?: InputMaybe<Scalars['Uuid']['input']>;
  authorName?: InputMaybe<Scalars['String']['input']>;
  authorOrcid?: InputMaybe<Scalars['Orcid']['input']>;
  authorRole?: InputMaybe<Scalars['String']['input']>;
  endorsementOrdinal: Scalars['Int']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Input for starting a front cover upload for a work. */
export type NewFrontcoverFileUpload = {
  /** File extension to use in the final canonical key, e.g. 'jpg', 'png', 'webp'. */
  declaredExtension: Scalars['String']['input'];
  /** MIME type declared by the client (e.g. 'image/jpeg'). */
  declaredMimeType: Scalars['String']['input'];
  /** SHA-256 checksum of the file, hex-encoded. */
  declaredSha256: Scalars['String']['input'];
  /** Thoth ID of the work this front cover belongs to. */
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new grant awarded for the publication of a work by an institution */
export type NewFunding = {
  grantNumber?: InputMaybe<Scalars['String']['input']>;
  institutionId: Scalars['Uuid']['input'];
  program?: InputMaybe<Scalars['String']['input']>;
  projectName?: InputMaybe<Scalars['String']['input']>;
  projectShortname?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new brand under which a publisher issues works */
export type NewImprint = {
  cdnDomain?: InputMaybe<Scalars['String']['input']>;
  cloudfrontDistId?: InputMaybe<Scalars['String']['input']>;
  crossmarkDoi?: InputMaybe<Scalars['Doi']['input']>;
  defaultCurrency?: InputMaybe<CurrencyCode>;
  defaultLocale?: InputMaybe<LocaleCode>;
  defaultPlace?: InputMaybe<Scalars['String']['input']>;
  imprintName: Scalars['String']['input'];
  imprintUrl?: InputMaybe<Scalars['String']['input']>;
  publisherId: Scalars['Uuid']['input'];
  s3Bucket?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to define a new organisation with which contributors may be affiliated or by which works may be funded */
export type NewInstitution = {
  countryCode?: InputMaybe<CountryCode>;
  institutionDoi?: InputMaybe<Scalars['Doi']['input']>;
  institutionName: Scalars['String']['input'];
  ror?: InputMaybe<Scalars['Ror']['input']>;
};

/** Set of values required to define a new work published as a number in a periodical */
export type NewIssue = {
  issueNumber?: InputMaybe<Scalars['Int']['input']>;
  issueOrdinal: Scalars['Int']['input'];
  seriesId: Scalars['Uuid']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new description of a work's language */
export type NewLanguage = {
  languageCode: LanguageCode;
  languageRelation: LanguageRelation;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new location (such as a web shop or distribution platform) where a publication can be acquired or viewed */
export type NewLocation = {
  canonical: Scalars['Boolean']['input'];
  fullTextUrl?: InputMaybe<Scalars['String']['input']>;
  landingPage?: InputMaybe<Scalars['String']['input']>;
  locationPlatform: LocationPlatform;
  publicationId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new amount of money that a publication costs */
export type NewPrice = {
  currencyCode: CurrencyCode;
  publicationId: Scalars['Uuid']['input'];
  unitPrice: Scalars['Float']['input'];
};

/** Set of values required to define a new manifestation of a written text */
export type NewPublication = {
  accessibilityAdditionalStandard?: InputMaybe<AccessibilityStandard>;
  accessibilityException?: InputMaybe<AccessibilityException>;
  accessibilityReportUrl?: InputMaybe<Scalars['String']['input']>;
  accessibilityStandard?: InputMaybe<AccessibilityStandard>;
  depthIn?: InputMaybe<Scalars['Float']['input']>;
  depthMm?: InputMaybe<Scalars['Float']['input']>;
  heightIn?: InputMaybe<Scalars['Float']['input']>;
  heightMm?: InputMaybe<Scalars['Float']['input']>;
  isbn?: InputMaybe<Scalars['Isbn']['input']>;
  publicationType: PublicationType;
  weightG?: InputMaybe<Scalars['Float']['input']>;
  weightOz?: InputMaybe<Scalars['Float']['input']>;
  widthIn?: InputMaybe<Scalars['Float']['input']>;
  widthMm?: InputMaybe<Scalars['Float']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Input for starting a publication file upload (PDF, EPUB, XML, etc.). */
export type NewPublicationFileUpload = {
  /** File extension to use in the final canonical key, e.g. 'pdf', 'epub', 'xml'. */
  declaredExtension: Scalars['String']['input'];
  /** MIME type declared by the client (used for validation and in the presigned URL). */
  declaredMimeType: Scalars['String']['input'];
  /** SHA-256 checksum of the file, hex-encoded. */
  declaredSha256: Scalars['String']['input'];
  /** Thoth ID of the publication linked to this file. */
  publicationId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new organisation that produces and distributes works */
export type NewPublisher = {
  accessibilityReportUrl?: InputMaybe<Scalars['String']['input']>;
  accessibilityStatement?: InputMaybe<Scalars['String']['input']>;
  publisherName: Scalars['String']['input'];
  publisherShortname?: InputMaybe<Scalars['String']['input']>;
  publisherUrl?: InputMaybe<Scalars['String']['input']>;
  zitadelId?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to define a new citation to a written text */
export type NewReference = {
  articleTitle?: InputMaybe<Scalars['String']['input']>;
  author?: InputMaybe<Scalars['String']['input']>;
  componentNumber?: InputMaybe<Scalars['String']['input']>;
  doi?: InputMaybe<Scalars['Doi']['input']>;
  edition?: InputMaybe<Scalars['Int']['input']>;
  firstPage?: InputMaybe<Scalars['String']['input']>;
  isbn?: InputMaybe<Scalars['Isbn']['input']>;
  issn?: InputMaybe<Scalars['String']['input']>;
  issue?: InputMaybe<Scalars['String']['input']>;
  journalTitle?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<Scalars['Date']['input']>;
  referenceOrdinal: Scalars['Int']['input'];
  retrievalDate?: InputMaybe<Scalars['Date']['input']>;
  seriesTitle?: InputMaybe<Scalars['String']['input']>;
  standardDesignator?: InputMaybe<Scalars['String']['input']>;
  standardsBodyAcronym?: InputMaybe<Scalars['String']['input']>;
  standardsBodyName?: InputMaybe<Scalars['String']['input']>;
  unstructuredCitation?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  volume?: InputMaybe<Scalars['String']['input']>;
  volumeTitle?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new periodical of publications */
export type NewSeries = {
  imprintId: Scalars['Uuid']['input'];
  issnDigital?: InputMaybe<Scalars['String']['input']>;
  issnPrint?: InputMaybe<Scalars['String']['input']>;
  seriesCfpUrl?: InputMaybe<Scalars['String']['input']>;
  seriesDescription?: InputMaybe<Scalars['String']['input']>;
  seriesName: Scalars['String']['input'];
  seriesType: SeriesType;
  seriesUrl?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to define a new significant discipline or term related to a work */
export type NewSubject = {
  subjectCode: Scalars['String']['input'];
  subjectOrdinal: Scalars['Int']['input'];
  subjectType: SubjectType;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new work's title */
export type NewTitle = {
  canonical: Scalars['Boolean']['input'];
  fullTitle: Scalars['String']['input'];
  localeCode: LocaleCode;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new written text that can be published */
export type NewWork = {
  audioCount?: InputMaybe<Scalars['Int']['input']>;
  bibliographyNote?: InputMaybe<Scalars['String']['input']>;
  copyrightHolder?: InputMaybe<Scalars['String']['input']>;
  coverCaption?: InputMaybe<Scalars['String']['input']>;
  coverUrl?: InputMaybe<Scalars['String']['input']>;
  doi?: InputMaybe<Scalars['Doi']['input']>;
  edition?: InputMaybe<Scalars['Int']['input']>;
  firstPage?: InputMaybe<Scalars['String']['input']>;
  generalNote?: InputMaybe<Scalars['String']['input']>;
  imageCount?: InputMaybe<Scalars['Int']['input']>;
  imprintId: Scalars['Uuid']['input'];
  landingPage?: InputMaybe<Scalars['String']['input']>;
  lastPage?: InputMaybe<Scalars['String']['input']>;
  lccn?: InputMaybe<Scalars['String']['input']>;
  license?: InputMaybe<Scalars['String']['input']>;
  oclc?: InputMaybe<Scalars['String']['input']>;
  pageBreakdown?: InputMaybe<Scalars['String']['input']>;
  pageCount?: InputMaybe<Scalars['Int']['input']>;
  pageInterval?: InputMaybe<Scalars['String']['input']>;
  place?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<Scalars['Date']['input']>;
  reference?: InputMaybe<Scalars['String']['input']>;
  resourcesDescription?: InputMaybe<Scalars['String']['input']>;
  tableCount?: InputMaybe<Scalars['Int']['input']>;
  toc?: InputMaybe<Scalars['String']['input']>;
  videoCount?: InputMaybe<Scalars['Int']['input']>;
  withdrawnDate?: InputMaybe<Scalars['Date']['input']>;
  workStatus: WorkStatus;
  workType: WorkType;
};

/** Set of values required to define a new featured video linked to a work */
export type NewWorkFeaturedVideo = {
  height: Scalars['Int']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  width: Scalars['Int']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Input for starting an upload for a work featured video. */
export type NewWorkFeaturedVideoFileUpload = {
  /** File extension to use in the final canonical key, e.g. 'mp4', 'webm', 'mov'. */
  declaredExtension: Scalars['String']['input'];
  /** MIME type declared by the client (used for validation and in the presigned URL). */
  declaredMimeType: Scalars['String']['input'];
  /** SHA-256 checksum of the file, hex-encoded. */
  declaredSha256: Scalars['String']['input'];
  /** Thoth ID of the work featured video linked to this file. */
  workFeaturedVideoId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new relationship between two works */
export type NewWorkRelation = {
  relatedWorkId: Scalars['Uuid']['input'];
  relationOrdinal: Scalars['Int']['input'];
  relationType: RelationType;
  relatorWorkId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing work's abstract */
export type PatchAbstract = {
  abstractId: Scalars['Uuid']['input'];
  abstractType: AbstractType;
  canonical: Scalars['Boolean']['input'];
  content: Scalars['String']['input'];
  localeCode: LocaleCode;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing additional resource */
export type PatchAdditionalResource = {
  additionalResourceId: Scalars['Uuid']['input'];
  attribution?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['Date']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  doi?: InputMaybe<Scalars['Doi']['input']>;
  handle?: InputMaybe<Scalars['String']['input']>;
  resourceOrdinal: Scalars['Int']['input'];
  resourceType: ResourceType;
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing association between a person and an institution for a specific contribution */
export type PatchAffiliation = {
  affiliationId: Scalars['Uuid']['input'];
  affiliationOrdinal: Scalars['Int']['input'];
  contributionId: Scalars['Uuid']['input'];
  institutionId: Scalars['Uuid']['input'];
  position?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to update an existing award */
export type PatchAward = {
  awardId: Scalars['Uuid']['input'];
  awardOrdinal: Scalars['Int']['input'];
  category?: InputMaybe<Scalars['String']['input']>;
  prizeStatement?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<AwardRole>;
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing work's biography */
export type PatchBiography = {
  biographyId: Scalars['Uuid']['input'];
  canonical: Scalars['Boolean']['input'];
  content: Scalars['String']['input'];
  contributionId: Scalars['Uuid']['input'];
  localeCode: LocaleCode;
};

/** Set of values required to update an existing book review */
export type PatchBookReview = {
  authorName?: InputMaybe<Scalars['String']['input']>;
  bookReviewId: Scalars['Uuid']['input'];
  doi?: InputMaybe<Scalars['Doi']['input']>;
  journalIssn?: InputMaybe<Scalars['String']['input']>;
  journalName?: InputMaybe<Scalars['String']['input']>;
  journalNumber?: InputMaybe<Scalars['String']['input']>;
  journalVolume?: InputMaybe<Scalars['String']['input']>;
  pageRange?: InputMaybe<Scalars['String']['input']>;
  reviewDate?: InputMaybe<Scalars['Date']['input']>;
  reviewOrdinal: Scalars['Int']['input'];
  reviewerInstitutionId?: InputMaybe<Scalars['Uuid']['input']>;
  reviewerOrcid?: InputMaybe<Scalars['Orcid']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing way of getting in touch with a publisher */
export type PatchContact = {
  contactId: Scalars['Uuid']['input'];
  contactType: ContactType;
  email: Scalars['String']['input'];
  publisherId: Scalars['Uuid']['input'];
};

/** Set of values required to update an individual involvement in the production of a work */
export type PatchContribution = {
  contributionId: Scalars['Uuid']['input'];
  contributionOrdinal: Scalars['Int']['input'];
  contributionType: ContributionType;
  contributorId: Scalars['Uuid']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  fullName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  mainContribution: Scalars['Boolean']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing individual involved in the production of works */
export type PatchContributor = {
  contributorId: Scalars['Uuid']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  fullName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  orcid?: InputMaybe<Scalars['Orcid']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to update an existing endorsement */
export type PatchEndorsement = {
  authorInstitutionId?: InputMaybe<Scalars['Uuid']['input']>;
  authorName?: InputMaybe<Scalars['String']['input']>;
  authorOrcid?: InputMaybe<Scalars['Orcid']['input']>;
  authorRole?: InputMaybe<Scalars['String']['input']>;
  endorsementId: Scalars['Uuid']['input'];
  endorsementOrdinal: Scalars['Int']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing grant awarded for the publication of a work by an institution */
export type PatchFunding = {
  fundingId: Scalars['Uuid']['input'];
  grantNumber?: InputMaybe<Scalars['String']['input']>;
  institutionId: Scalars['Uuid']['input'];
  program?: InputMaybe<Scalars['String']['input']>;
  projectName?: InputMaybe<Scalars['String']['input']>;
  projectShortname?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing brand under which a publisher issues works */
export type PatchImprint = {
  cdnDomain?: InputMaybe<Scalars['String']['input']>;
  cloudfrontDistId?: InputMaybe<Scalars['String']['input']>;
  crossmarkDoi?: InputMaybe<Scalars['Doi']['input']>;
  defaultCurrency?: InputMaybe<CurrencyCode>;
  defaultLocale?: InputMaybe<LocaleCode>;
  defaultPlace?: InputMaybe<Scalars['String']['input']>;
  imprintId: Scalars['Uuid']['input'];
  imprintName: Scalars['String']['input'];
  imprintUrl?: InputMaybe<Scalars['String']['input']>;
  publisherId: Scalars['Uuid']['input'];
  s3Bucket?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to update an existing organisation with which contributors may be affiliated or by which works may be funded */
export type PatchInstitution = {
  countryCode?: InputMaybe<CountryCode>;
  institutionDoi?: InputMaybe<Scalars['Doi']['input']>;
  institutionId: Scalars['Uuid']['input'];
  institutionName: Scalars['String']['input'];
  ror?: InputMaybe<Scalars['Ror']['input']>;
};

/** Set of values required to update an existing work published as a number in a periodical */
export type PatchIssue = {
  issueId: Scalars['Uuid']['input'];
  issueNumber?: InputMaybe<Scalars['Int']['input']>;
  issueOrdinal: Scalars['Int']['input'];
  seriesId: Scalars['Uuid']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing description of a work's language */
export type PatchLanguage = {
  languageCode: LanguageCode;
  languageId: Scalars['Uuid']['input'];
  languageRelation: LanguageRelation;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing location (such as a web shop or distribution platform) where a publication can be acquired or viewed */
export type PatchLocation = {
  canonical: Scalars['Boolean']['input'];
  fullTextUrl?: InputMaybe<Scalars['String']['input']>;
  landingPage?: InputMaybe<Scalars['String']['input']>;
  locationId: Scalars['Uuid']['input'];
  locationPlatform: LocationPlatform;
  publicationId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing amount of money that a publication costs */
export type PatchPrice = {
  currencyCode: CurrencyCode;
  priceId: Scalars['Uuid']['input'];
  publicationId: Scalars['Uuid']['input'];
  unitPrice: Scalars['Float']['input'];
};

/** Set of values required to update an existing manifestation of a written text */
export type PatchPublication = {
  accessibilityAdditionalStandard?: InputMaybe<AccessibilityStandard>;
  accessibilityException?: InputMaybe<AccessibilityException>;
  accessibilityReportUrl?: InputMaybe<Scalars['String']['input']>;
  accessibilityStandard?: InputMaybe<AccessibilityStandard>;
  depthIn?: InputMaybe<Scalars['Float']['input']>;
  depthMm?: InputMaybe<Scalars['Float']['input']>;
  heightIn?: InputMaybe<Scalars['Float']['input']>;
  heightMm?: InputMaybe<Scalars['Float']['input']>;
  isbn?: InputMaybe<Scalars['Isbn']['input']>;
  publicationId: Scalars['Uuid']['input'];
  publicationType: PublicationType;
  weightG?: InputMaybe<Scalars['Float']['input']>;
  weightOz?: InputMaybe<Scalars['Float']['input']>;
  widthIn?: InputMaybe<Scalars['Float']['input']>;
  widthMm?: InputMaybe<Scalars['Float']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing organisation that produces and distributes works */
export type PatchPublisher = {
  accessibilityReportUrl?: InputMaybe<Scalars['String']['input']>;
  accessibilityStatement?: InputMaybe<Scalars['String']['input']>;
  publisherId: Scalars['Uuid']['input'];
  publisherName: Scalars['String']['input'];
  publisherShortname?: InputMaybe<Scalars['String']['input']>;
  publisherUrl?: InputMaybe<Scalars['String']['input']>;
  zitadelId?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to update an existing citation to a written text */
export type PatchReference = {
  articleTitle?: InputMaybe<Scalars['String']['input']>;
  author?: InputMaybe<Scalars['String']['input']>;
  componentNumber?: InputMaybe<Scalars['String']['input']>;
  doi?: InputMaybe<Scalars['Doi']['input']>;
  edition?: InputMaybe<Scalars['Int']['input']>;
  firstPage?: InputMaybe<Scalars['String']['input']>;
  isbn?: InputMaybe<Scalars['Isbn']['input']>;
  issn?: InputMaybe<Scalars['String']['input']>;
  issue?: InputMaybe<Scalars['String']['input']>;
  journalTitle?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<Scalars['Date']['input']>;
  referenceId: Scalars['Uuid']['input'];
  referenceOrdinal: Scalars['Int']['input'];
  retrievalDate?: InputMaybe<Scalars['Date']['input']>;
  seriesTitle?: InputMaybe<Scalars['String']['input']>;
  standardDesignator?: InputMaybe<Scalars['String']['input']>;
  standardsBodyAcronym?: InputMaybe<Scalars['String']['input']>;
  standardsBodyName?: InputMaybe<Scalars['String']['input']>;
  unstructuredCitation?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  volume?: InputMaybe<Scalars['String']['input']>;
  volumeTitle?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing periodical of publications */
export type PatchSeries = {
  imprintId: Scalars['Uuid']['input'];
  issnDigital?: InputMaybe<Scalars['String']['input']>;
  issnPrint?: InputMaybe<Scalars['String']['input']>;
  seriesCfpUrl?: InputMaybe<Scalars['String']['input']>;
  seriesDescription?: InputMaybe<Scalars['String']['input']>;
  seriesId: Scalars['Uuid']['input'];
  seriesName: Scalars['String']['input'];
  seriesType: SeriesType;
  seriesUrl?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to update an existing significant discipline or term related to a work */
export type PatchSubject = {
  subjectCode: Scalars['String']['input'];
  subjectId: Scalars['Uuid']['input'];
  subjectOrdinal: Scalars['Int']['input'];
  subjectType: SubjectType;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing work's title */
export type PatchTitle = {
  canonical: Scalars['Boolean']['input'];
  fullTitle: Scalars['String']['input'];
  localeCode: LocaleCode;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  titleId: Scalars['Uuid']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing written text that can be published */
export type PatchWork = {
  audioCount?: InputMaybe<Scalars['Int']['input']>;
  bibliographyNote?: InputMaybe<Scalars['String']['input']>;
  copyrightHolder?: InputMaybe<Scalars['String']['input']>;
  coverCaption?: InputMaybe<Scalars['String']['input']>;
  coverUrl?: InputMaybe<Scalars['String']['input']>;
  doi?: InputMaybe<Scalars['Doi']['input']>;
  edition?: InputMaybe<Scalars['Int']['input']>;
  firstPage?: InputMaybe<Scalars['String']['input']>;
  generalNote?: InputMaybe<Scalars['String']['input']>;
  imageCount?: InputMaybe<Scalars['Int']['input']>;
  imprintId: Scalars['Uuid']['input'];
  landingPage?: InputMaybe<Scalars['String']['input']>;
  lastPage?: InputMaybe<Scalars['String']['input']>;
  lccn?: InputMaybe<Scalars['String']['input']>;
  license?: InputMaybe<Scalars['String']['input']>;
  oclc?: InputMaybe<Scalars['String']['input']>;
  pageBreakdown?: InputMaybe<Scalars['String']['input']>;
  pageCount?: InputMaybe<Scalars['Int']['input']>;
  pageInterval?: InputMaybe<Scalars['String']['input']>;
  place?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<Scalars['Date']['input']>;
  reference?: InputMaybe<Scalars['String']['input']>;
  resourcesDescription?: InputMaybe<Scalars['String']['input']>;
  tableCount?: InputMaybe<Scalars['Int']['input']>;
  toc?: InputMaybe<Scalars['String']['input']>;
  videoCount?: InputMaybe<Scalars['Int']['input']>;
  withdrawnDate?: InputMaybe<Scalars['Date']['input']>;
  workId: Scalars['Uuid']['input'];
  workStatus: WorkStatus;
  workType: WorkType;
};

/** Set of values required to update an existing featured video */
export type PatchWorkFeaturedVideo = {
  height: Scalars['Int']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  width: Scalars['Int']['input'];
  workFeaturedVideoId: Scalars['Uuid']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing relationship between two works */
export type PatchWorkRelation = {
  relatedWorkId: Scalars['Uuid']['input'];
  relationOrdinal: Scalars['Int']['input'];
  relationType: RelationType;
  relatorWorkId: Scalars['Uuid']['input'];
  workRelationId: Scalars['Uuid']['input'];
};

/** The amount of money, in any currency, that a publication costs. */
export type Price = {
  __typename?: 'Price';
  /** Date and time at which the price record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Three-letter ISO 4217 code representing the currency used in this price */
  currencyCode: CurrencyCode;
  /** Thoth ID of the price */
  priceId: Scalars['Uuid']['output'];
  /** Get the publication linked to this price */
  publication: Publication;
  /** Thoth ID of the publication linked to this price */
  publicationId: Scalars['Uuid']['output'];
  /** Value of the publication in the specified currency */
  unitPrice: Scalars['Float']['output'];
  /** Date and time at which the price record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
};

/** Field to use when sorting prices list */
export enum PriceField {
  CreatedAt = 'CREATED_AT',
  CurrencyCode = 'CURRENCY_CODE',
  PriceId = 'PRICE_ID',
  PublicationId = 'PUBLICATION_ID',
  UnitPrice = 'UNIT_PRICE',
  UpdatedAt = 'UPDATED_AT'
}

/** Field and order to use when sorting prices list */
export type PriceOrderBy = {
  direction: Direction;
  field: PriceField;
};

/** A manifestation of a written text */
export type Publication = {
  __typename?: 'Publication';
  /** EPUB- or PDF-specific standard accessibility level met by this publication, if applicable */
  accessibilityAdditionalStandard?: Maybe<AccessibilityStandard>;
  /** Reason for this publication not being required to comply with accessibility standards (if any) */
  accessibilityException?: Maybe<AccessibilityException>;
  /** Link to a web page showing detailed accessibility information for this publication */
  accessibilityReportUrl?: Maybe<Scalars['String']['output']>;
  /** WCAG standard accessibility level met by this publication (if any) */
  accessibilityStandard?: Maybe<AccessibilityStandard>;
  /** Date and time at which the publication record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Depth of the physical Publication (in mm, cm or in) (only applicable to non-Chapter Paperbacks and Hardbacks) */
  depth?: Maybe<Scalars['Float']['output']>;
  /** Get the publication file for this publication */
  file?: Maybe<File>;
  /** Height of the physical Publication (in mm, cm or in) (only applicable to non-Chapter Paperbacks and Hardbacks) */
  height?: Maybe<Scalars['Float']['output']>;
  /** International Standard Book Number of the publication, in ISBN-13 format */
  isbn?: Maybe<Scalars['Isbn']['output']>;
  /** Get locations linked to this publication */
  locations: Array<Location>;
  /** Get prices linked to this publication */
  prices: Array<Price>;
  /** Thoth ID of the publication */
  publicationId: Scalars['Uuid']['output'];
  /** Format of this publication */
  publicationType: PublicationType;
  /** Date and time at which the publication record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Weight of the physical Publication (in g or oz) (only applicable to non-Chapter Paperbacks and Hardbacks) */
  weight?: Maybe<Scalars['Float']['output']>;
  /** Width of the physical Publication (in mm, cm or in) (only applicable to non-Chapter Paperbacks and Hardbacks) */
  width?: Maybe<Scalars['Float']['output']>;
  /** Get the work to which this publication belongs */
  work: Work;
  /** Thoth ID of the work to which this publication belongs */
  workId: Scalars['Uuid']['output'];
};


/** A manifestation of a written text */
export type PublicationDepthArgs = {
  units: LengthUnit;
};


/** A manifestation of a written text */
export type PublicationHeightArgs = {
  units: LengthUnit;
};


/** A manifestation of a written text */
export type PublicationLocationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  locationPlatforms?: InputMaybe<Array<LocationPlatform>>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<LocationOrderBy>;
};


/** A manifestation of a written text */
export type PublicationPricesArgs = {
  currencyCodes?: InputMaybe<Array<CurrencyCode>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<PriceOrderBy>;
};


/** A manifestation of a written text */
export type PublicationWeightArgs = {
  units: WeightUnit;
};


/** A manifestation of a written text */
export type PublicationWidthArgs = {
  units: LengthUnit;
};

/** Field to use when sorting publications list */
export enum PublicationField {
  AccessibilityAdditionalStandard = 'ACCESSIBILITY_ADDITIONAL_STANDARD',
  AccessibilityException = 'ACCESSIBILITY_EXCEPTION',
  AccessibilityReportUrl = 'ACCESSIBILITY_REPORT_URL',
  AccessibilityStandard = 'ACCESSIBILITY_STANDARD',
  CreatedAt = 'CREATED_AT',
  DepthIn = 'DEPTH_IN',
  DepthMm = 'DEPTH_MM',
  HeightIn = 'HEIGHT_IN',
  HeightMm = 'HEIGHT_MM',
  Isbn = 'ISBN',
  PublicationId = 'PUBLICATION_ID',
  PublicationType = 'PUBLICATION_TYPE',
  UpdatedAt = 'UPDATED_AT',
  WeightG = 'WEIGHT_G',
  WeightOz = 'WEIGHT_OZ',
  WidthIn = 'WIDTH_IN',
  WidthMm = 'WIDTH_MM',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting publications list */
export type PublicationOrderBy = {
  direction: Direction;
  field: PublicationField;
};

/** Format of a publication */
export enum PublicationType {
  /** Kindle version 8 (.azw3) ebook format */
  Azw3 = 'AZW3',
  /** Microsoft Word (.docx) ebook format */
  Docx = 'DOCX',
  /** Epub ebook format */
  Epub = 'EPUB',
  /** FictionBook (.fb2, .fb3, .fbz) ebook format */
  FictionBook = 'FICTION_BOOK',
  /** Hardback print format */
  Hardback = 'HARDBACK',
  /** HTML ebook format */
  Html = 'HTML',
  /** Mobipocket (.mobi) ebook format */
  Mobi = 'MOBI',
  /** MP3 audiobook format */
  Mp3 = 'MP3',
  /** Paperback print format */
  Paperback = 'PAPERBACK',
  /** PDF ebook format */
  Pdf = 'PDF',
  /** WAV audiobook format */
  Wav = 'WAV',
  /** XML ebook format */
  Xml = 'XML'
}

/** An organisation that produces and distributes written texts. */
export type Publisher = {
  __typename?: 'Publisher';
  /** URL of the publisher's report on the accessibility of its texts for readers with impairments */
  accessibilityReportUrl?: Maybe<Scalars['String']['output']>;
  /** Statement from the publisher on the accessibility of its texts for readers with impairments */
  accessibilityStatement?: Maybe<Scalars['String']['output']>;
  /** Get contacts linked to this publisher */
  contacts: Array<Contact>;
  /** Date and time at which the publisher record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Get imprints linked to this publisher */
  imprints: Array<Imprint>;
  /** Thoth ID of the publisher */
  publisherId: Scalars['Uuid']['output'];
  /** Name of the publisher */
  publisherName: Scalars['String']['output'];
  /** Short name of the publisher, if any (e.g. an abbreviation) */
  publisherShortname?: Maybe<Scalars['String']['output']>;
  /** URL of the publisher's website */
  publisherUrl?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the publisher record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Zitadel organisation ID associated with the publisher */
  zitadelId?: Maybe<Scalars['String']['output']>;
};


/** An organisation that produces and distributes written texts. */
export type PublisherContactsArgs = {
  contactTypes?: InputMaybe<Array<ContactType>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ContactOrderBy>;
};


/** An organisation that produces and distributes written texts. */
export type PublisherImprintsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ImprintOrderBy>;
};

export type PublisherContext = {
  __typename?: 'PublisherContext';
  permissions: PublisherPermissions;
  publisher: Publisher;
};

/** Field to use when sorting publishers list */
export enum PublisherField {
  AccessibilityReportUrl = 'ACCESSIBILITY_REPORT_URL',
  AccessibilityStatement = 'ACCESSIBILITY_STATEMENT',
  CreatedAt = 'CREATED_AT',
  PublisherId = 'PUBLISHER_ID',
  PublisherName = 'PUBLISHER_NAME',
  PublisherShortname = 'PUBLISHER_SHORTNAME',
  PublisherUrl = 'PUBLISHER_URL',
  UpdatedAt = 'UPDATED_AT',
  ZitadelId = 'ZITADEL_ID'
}

/** Field and order to use when sorting publishers list */
export type PublisherOrderBy = {
  direction: Direction;
  field: PublisherField;
};

export type PublisherPermissions = {
  __typename?: 'PublisherPermissions';
  cdnWrite: Scalars['Boolean']['output'];
  publisherAdmin: Scalars['Boolean']['output'];
  workLifecycle: Scalars['Boolean']['output'];
};

export type QueryRoot = {
  __typename?: 'QueryRoot';
  /** Query an abstract by its ID */
  abstract: Abstract;
  /** Query the full list of abstracts */
  abstracts: Array<Abstract>;
  /** Query a single additional resource using its ID */
  additionalResource: WorkResource;
  /** Get the total number of additional resources */
  additionalResourceCount: Scalars['Int']['output'];
  /** Query the full list of additional resources */
  additionalResources: Array<WorkResource>;
  /** Query a single affiliation using its ID */
  affiliation: Affiliation;
  /** Get the total number of affiliations */
  affiliationCount: Scalars['Int']['output'];
  /** Query the full list of affiliations */
  affiliations: Array<Affiliation>;
  /** Query a single award using its ID */
  award: Award;
  /** Get the total number of awards */
  awardCount: Scalars['Int']['output'];
  /** Query the full list of awards */
  awards: Array<Award>;
  /** Query biographies by work ID */
  biographies: Array<Biography>;
  /** Query an biography by it's ID */
  biography: Biography;
  /** Query a single book using its DOI */
  bookByDoi: Work;
  /** Get the total number of books (a subset of the total number of works) */
  bookCount: Scalars['Int']['output'];
  /** Query a single book review using its ID */
  bookReview: BookReview;
  /** Get the total number of book reviews */
  bookReviewCount: Scalars['Int']['output'];
  /** Query the full list of book reviews */
  bookReviews: Array<BookReview>;
  /** Query the full list of books (a subset of the full list of works) */
  books: Array<Work>;
  /** Query a single chapter using its DOI */
  chapterByDoi: Work;
  /** Get the total number of chapters (a subset of the total number of works) */
  chapterCount: Scalars['Int']['output'];
  /** Query the full list of chapters (a subset of the full list of works) */
  chapters: Array<Work>;
  /** Query a single contact using its ID */
  contact: Contact;
  /** Get the total number of contacts */
  contactCount: Scalars['Int']['output'];
  /** Query the full list of contacts */
  contacts: Array<Contact>;
  /** Query a single contribution using its ID */
  contribution: Contribution;
  /** Get the total number of contributions */
  contributionCount: Scalars['Int']['output'];
  /** Query the full list of contributions */
  contributions: Array<Contribution>;
  /** Query a single contributor using its ID */
  contributor: Contributor;
  /** Get the total number of contributors */
  contributorCount: Scalars['Int']['output'];
  /** Query the full list of contributors */
  contributors: Array<Contributor>;
  /** Query a single endorsement using its ID */
  endorsement: Endorsement;
  /** Get the total number of endorsements */
  endorsementCount: Scalars['Int']['output'];
  /** Query the full list of endorsements */
  endorsements: Array<Endorsement>;
  /** Query a single file using its ID */
  file: File;
  /** Query a single funding using its ID */
  funding: Funding;
  /** Get the total number of funding instances associated to works */
  fundingCount: Scalars['Int']['output'];
  /** Query the full list of fundings */
  fundings: Array<Funding>;
  /** Query a single imprint using its ID */
  imprint: Imprint;
  /** Get the total number of imprints */
  imprintCount: Scalars['Int']['output'];
  /** Query the full list of imprints */
  imprints: Array<Imprint>;
  /** Query a single institution using its ID */
  institution: Institution;
  /** Get the total number of institutions */
  institutionCount: Scalars['Int']['output'];
  /** Query the full list of institutions */
  institutions: Array<Institution>;
  /** Query a single issue using its ID */
  issue: Issue;
  /** Get the total number of issues */
  issueCount: Scalars['Int']['output'];
  /** Query the full list of issues */
  issues: Array<Issue>;
  /** Query a single language using its ID */
  language: Language;
  /** Get the total number of languages associated to works */
  languageCount: Scalars['Int']['output'];
  /** Query the full list of languages */
  languages: Array<Language>;
  /** Query a single location using its ID */
  location: Location;
  /** Get the total number of locations associated to works */
  locationCount: Scalars['Int']['output'];
  /** Query the full list of locations */
  locations: Array<Location>;
  /** Get the total number of contacts */
  me: Me;
  /** Query a single price using its ID */
  price: Price;
  /** Get the total number of prices associated to works */
  priceCount: Scalars['Int']['output'];
  /** Query the full list of prices */
  prices: Array<Price>;
  /** Query a single publication using its ID */
  publication: Publication;
  /** Get the total number of publications */
  publicationCount: Scalars['Int']['output'];
  /** Query the full list of publications */
  publications: Array<Publication>;
  /** Query a single publisher using its ID */
  publisher: Publisher;
  /** Get the total number of publishers */
  publisherCount: Scalars['Int']['output'];
  /** Query the full list of publishers */
  publishers: Array<Publisher>;
  /** Query a single reference using its ID */
  reference: Reference;
  /** Get the total number of references */
  referenceCount: Scalars['Int']['output'];
  /** Query the full list of references */
  references: Array<Reference>;
  /** Query a single series using its ID */
  series: Series;
  /** Get the total number of series */
  seriesCount: Scalars['Int']['output'];
  /** Query the full list of series */
  serieses: Array<Series>;
  /** Query a single subject using its ID */
  subject: Subject;
  /** Get the total number of subjects associated to works */
  subjectCount: Scalars['Int']['output'];
  /** Query the full list of subjects */
  subjects: Array<Subject>;
  /** Query a title by its ID */
  title: Title;
  /** Query the full list of titles */
  titles: Array<Title>;
  /** Query a single work using its ID */
  work: Work;
  /** Query a single work using its DOI */
  workByDoi: Work;
  /** Get the total number of works */
  workCount: Scalars['Int']['output'];
  /** Query a single featured video using its ID */
  workFeaturedVideo: WorkFeaturedVideo;
  /** Get the total number of featured videos */
  workFeaturedVideoCount: Scalars['Int']['output'];
  /** Query the full list of featured videos */
  workFeaturedVideos: Array<WorkFeaturedVideo>;
  /** Query the full list of works */
  works: Array<Work>;
};


export type QueryRootAbstractArgs = {
  abstractId: Scalars['Uuid']['input'];
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type QueryRootAbstractsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  localeCodes?: InputMaybe<Array<LocaleCode>>;
  markupFormat?: InputMaybe<MarkupFormat>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<AbstractOrderBy>;
};


export type QueryRootAdditionalResourceArgs = {
  additionalResourceId: Scalars['Uuid']['input'];
};


export type QueryRootAdditionalResourcesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<AdditionalResourceOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootAffiliationArgs = {
  affiliationId: Scalars['Uuid']['input'];
};


export type QueryRootAffiliationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<AffiliationOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootAwardArgs = {
  awardId: Scalars['Uuid']['input'];
};


export type QueryRootAwardsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<AwardOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootBiographiesArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  localeCodes?: InputMaybe<Array<LocaleCode>>;
  markupFormat?: InputMaybe<MarkupFormat>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<BiographyOrderBy>;
};


export type QueryRootBiographyArgs = {
  biographyId: Scalars['Uuid']['input'];
  markupFormat?: InputMaybe<MarkupFormat>;
};


export type QueryRootBookByDoiArgs = {
  doi: Scalars['Doi']['input'];
};


export type QueryRootBookCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<TimeExpression>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
};


export type QueryRootBookReviewArgs = {
  bookReviewId: Scalars['Uuid']['input'];
};


export type QueryRootBookReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<BookReviewOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootBooksArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<WorkOrderBy>;
  publicationDate?: InputMaybe<TimeExpression>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
};


export type QueryRootChapterByDoiArgs = {
  doi: Scalars['Doi']['input'];
};


export type QueryRootChapterCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<TimeExpression>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
};


export type QueryRootChaptersArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<WorkOrderBy>;
  publicationDate?: InputMaybe<TimeExpression>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
};


export type QueryRootContactArgs = {
  contactId: Scalars['Uuid']['input'];
};


export type QueryRootContactCountArgs = {
  contactTypes?: InputMaybe<Array<ContactType>>;
};


export type QueryRootContactsArgs = {
  contactTypes?: InputMaybe<Array<ContactType>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ContactOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootContributionArgs = {
  contributionId: Scalars['Uuid']['input'];
};


export type QueryRootContributionCountArgs = {
  contributionTypes?: InputMaybe<Array<ContributionType>>;
};


export type QueryRootContributionsArgs = {
  contributionTypes?: InputMaybe<Array<ContributionType>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ContributionOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootContributorArgs = {
  contributorId: Scalars['Uuid']['input'];
};


export type QueryRootContributorCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRootContributorsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ContributorOrderBy>;
};


export type QueryRootEndorsementArgs = {
  endorsementId: Scalars['Uuid']['input'];
};


export type QueryRootEndorsementsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<EndorsementOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootFileArgs = {
  fileId: Scalars['Uuid']['input'];
};


export type QueryRootFundingArgs = {
  fundingId: Scalars['Uuid']['input'];
};


export type QueryRootFundingsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<FundingOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootImprintArgs = {
  imprintId: Scalars['Uuid']['input'];
};


export type QueryRootImprintCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootImprintsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ImprintOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootInstitutionArgs = {
  institutionId: Scalars['Uuid']['input'];
};


export type QueryRootInstitutionCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRootInstitutionsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<InstitutionOrderBy>;
};


export type QueryRootIssueArgs = {
  issueId: Scalars['Uuid']['input'];
};


export type QueryRootIssuesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<IssueOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootLanguageArgs = {
  languageId: Scalars['Uuid']['input'];
};


export type QueryRootLanguageCountArgs = {
  languageCodes?: InputMaybe<Array<LanguageCode>>;
  languageRelation?: InputMaybe<LanguageRelation>;
  languageRelations?: InputMaybe<Array<LanguageRelation>>;
};


export type QueryRootLanguagesArgs = {
  languageCodes?: InputMaybe<Array<LanguageCode>>;
  languageRelation?: InputMaybe<LanguageRelation>;
  languageRelations?: InputMaybe<Array<LanguageRelation>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<LanguageOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootLocationArgs = {
  locationId: Scalars['Uuid']['input'];
};


export type QueryRootLocationCountArgs = {
  locationPlatforms?: InputMaybe<Array<LocationPlatform>>;
};


export type QueryRootLocationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  locationPlatforms?: InputMaybe<Array<LocationPlatform>>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<LocationOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootPriceArgs = {
  priceId: Scalars['Uuid']['input'];
};


export type QueryRootPriceCountArgs = {
  currencyCodes?: InputMaybe<Array<CurrencyCode>>;
};


export type QueryRootPricesArgs = {
  currencyCodes?: InputMaybe<Array<CurrencyCode>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<PriceOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootPublicationArgs = {
  publicationId: Scalars['Uuid']['input'];
};


export type QueryRootPublicationCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publicationTypes?: InputMaybe<Array<PublicationType>>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootPublicationsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<PublicationOrderBy>;
  publicationTypes?: InputMaybe<Array<PublicationType>>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootPublisherArgs = {
  publisherId: Scalars['Uuid']['input'];
};


export type QueryRootPublisherCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootPublishersArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<PublisherOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootReferenceArgs = {
  referenceId: Scalars['Uuid']['input'];
};


export type QueryRootReferencesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ReferenceOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootSeriesArgs = {
  seriesId: Scalars['Uuid']['input'];
};


export type QueryRootSeriesCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  seriesTypes?: InputMaybe<Array<SeriesType>>;
};


export type QueryRootSeriesesArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<SeriesOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  seriesTypes?: InputMaybe<Array<SeriesType>>;
};


export type QueryRootSubjectArgs = {
  subjectId: Scalars['Uuid']['input'];
};


export type QueryRootSubjectCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  subjectTypes?: InputMaybe<Array<SubjectType>>;
};


export type QueryRootSubjectsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<SubjectOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  subjectTypes?: InputMaybe<Array<SubjectType>>;
};


export type QueryRootTitleArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
  titleId: Scalars['Uuid']['input'];
};


export type QueryRootTitlesArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  localeCodes?: InputMaybe<Array<LocaleCode>>;
  markupFormat?: InputMaybe<MarkupFormat>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<TitleOrderBy>;
};


export type QueryRootWorkArgs = {
  workId: Scalars['Uuid']['input'];
};


export type QueryRootWorkByDoiArgs = {
  doi: Scalars['Doi']['input'];
};


export type QueryRootWorkCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<TimeExpression>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
  workTypes?: InputMaybe<Array<WorkType>>;
};


export type QueryRootWorkFeaturedVideoArgs = {
  workFeaturedVideoId: Scalars['Uuid']['input'];
};


export type QueryRootWorkFeaturedVideosArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<WorkFeaturedVideoOrderBy>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
};


export type QueryRootWorksArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<WorkOrderBy>;
  publicationDate?: InputMaybe<TimeExpression>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
  workTypes?: InputMaybe<Array<WorkType>>;
};

/** A citation to a written text. References must always include the DOI of the cited work, the unstructured citation, or both. */
export type Reference = {
  __typename?: 'Reference';
  /** Journal article, conference paper, or book chapter title. */
  articleTitle?: Maybe<Scalars['String']['output']>;
  /** First author of the cited work. */
  author?: Maybe<Scalars['String']['output']>;
  /** The chapter, section or part number, when the cited work is a component of a book. */
  componentNumber?: Maybe<Scalars['String']['output']>;
  /** Timestamp of the creation of this record within Thoth. */
  createdAt: Scalars['Timestamp']['output'];
  /** Digital Object Identifier of the cited work as full URL. */
  doi?: Maybe<Scalars['Doi']['output']>;
  /** Book edition number. */
  edition?: Maybe<Scalars['Int']['output']>;
  /** First page of the cited page range. */
  firstPage?: Maybe<Scalars['String']['output']>;
  /** Book ISBN, when the cited work is a book or a chapter. */
  isbn?: Maybe<Scalars['Isbn']['output']>;
  /** ISSN of a series. */
  issn?: Maybe<Scalars['String']['output']>;
  /** Journal issue, when the cited work is an article. */
  issue?: Maybe<Scalars['String']['output']>;
  /** Title of a journal, when the cited work is an article. */
  journalTitle?: Maybe<Scalars['String']['output']>;
  /** Publication date of the cited work. Day and month should be set to "01" when only the publication year is known. */
  publicationDate?: Maybe<Scalars['Date']['output']>;
  /** UUID of the reference. */
  referenceId: Scalars['Uuid']['output'];
  /** Number used to order references within a work's bibliography. */
  referenceOrdinal: Scalars['Int']['output'];
  /** Date the cited work was accessed, when citing a website or online article. */
  retrievalDate?: Maybe<Scalars['Date']['output']>;
  /** Title of a book or conference series. */
  seriesTitle?: Maybe<Scalars['String']['output']>;
  /** Standard identifier (e.g. "14064-1"), when the cited work is a standard. */
  standardDesignator?: Maybe<Scalars['String']['output']>;
  /** Acronym of the standards organisation (e.g. "ISO"), when the cited work is a standard. */
  standardsBodyAcronym?: Maybe<Scalars['String']['output']>;
  /** Full name of the standards organisation (e.g. "International Organization for Standardization"), when the cited work is a standard. */
  standardsBodyName?: Maybe<Scalars['String']['output']>;
  /** Full reference text. When the DOI of the cited work is not known this field is required, and may be used in conjunction with other structured data to help identify the cited work. */
  unstructuredCitation?: Maybe<Scalars['String']['output']>;
  /** Timestamp of the last update to this record within Thoth. */
  updatedAt: Scalars['Timestamp']['output'];
  /** URL of the cited work. */
  url?: Maybe<Scalars['String']['output']>;
  /** Volume number of a journal or book set. */
  volume?: Maybe<Scalars['String']['output']>;
  /** Title of a book or conference proceeding. */
  volumeTitle?: Maybe<Scalars['String']['output']>;
  /** The citing work. */
  work: Work;
  /** UUID of the citing work. */
  workId: Scalars['Uuid']['output'];
};

/** Field to use when sorting references list */
export enum ReferenceField {
  ArticleTitle = 'ARTICLE_TITLE',
  Author = 'AUTHOR',
  ComponentNumber = 'COMPONENT_NUMBER',
  CreatedAt = 'CREATED_AT',
  Doi = 'DOI',
  Edition = 'EDITION',
  FirstPage = 'FIRST_PAGE',
  Isbn = 'ISBN',
  Issn = 'ISSN',
  Issue = 'ISSUE',
  JournalTitle = 'JOURNAL_TITLE',
  PublicationDate = 'PUBLICATION_DATE',
  ReferenceId = 'REFERENCE_ID',
  ReferenceOrdinal = 'REFERENCE_ORDINAL',
  RetrievalDate = 'RETRIEVAL_DATE',
  SeriesTitle = 'SERIES_TITLE',
  StandardsBodyAcronym = 'STANDARDS_BODY_ACRONYM',
  StandardsBodyName = 'STANDARDS_BODY_NAME',
  StandardDesignator = 'STANDARD_DESIGNATOR',
  UnstructuredCitation = 'UNSTRUCTURED_CITATION',
  UpdatedAt = 'UPDATED_AT',
  Url = 'URL',
  Volume = 'VOLUME',
  VolumeTitle = 'VOLUME_TITLE',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting references list */
export type ReferenceOrderBy = {
  direction: Direction;
  field: ReferenceField;
};

/** Nature of a relationship between works */
export enum RelationType {
  /** The work to which this relation belongs contains the other work (chapter) in the relationship */
  HasChild = 'HAS_CHILD',
  /** The work to which this relation belongs contains the other work (part) in the relationship */
  HasPart = 'HAS_PART',
  /** The work to which this relation belongs is translated by the other work in the relationship */
  HasTranslation = 'HAS_TRANSLATION',
  /** The work to which this relation belongs is a component (chapter) of the other work in the relationship */
  IsChildOf = 'IS_CHILD_OF',
  /** The work to which this relation belongs is a component (part) of the other work in the relationship */
  IsPartOf = 'IS_PART_OF',
  /** The work to which this relation belongs is replaced by the other work in the relationship */
  IsReplacedBy = 'IS_REPLACED_BY',
  /** The work to which this relation belongs is a translation of the other work in the relationship */
  IsTranslationOf = 'IS_TRANSLATION_OF',
  /** The work to which this relation belongs replaces the other work in the relationship */
  Replaces = 'REPLACES'
}

/** Type of additional resource */
export enum ResourceType {
  Article = 'ARTICLE',
  Audio = 'AUDIO',
  Blog = 'BLOG',
  Book = 'BOOK',
  Dataset = 'DATASET',
  Document = 'DOCUMENT',
  Image = 'IMAGE',
  Map = 'MAP',
  Other = 'OTHER',
  Source = 'SOURCE',
  Spreadsheet = 'SPREADSHEET',
  Video = 'VIDEO',
  Website = 'WEBSITE'
}

/** A periodical of publications about a particular subject. */
export type Series = {
  __typename?: 'Series';
  /** Date and time at which the series record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Get the imprint linked to this series */
  imprint: Imprint;
  /** Thoth ID of the imprint to which this series belongs */
  imprintId: Scalars['Uuid']['output'];
  /** Electronic ISSN (International Standard Serial Number) of the series. This represents the online version. */
  issnDigital?: Maybe<Scalars['String']['output']>;
  /** Print ISSN (International Standard Serial Number) of the series. This represents the print media version. */
  issnPrint?: Maybe<Scalars['String']['output']>;
  /** Get issues linked to this series */
  issues: Array<Issue>;
  /** URL of the series' call for proposals page */
  seriesCfpUrl?: Maybe<Scalars['String']['output']>;
  /** Description of the series */
  seriesDescription?: Maybe<Scalars['String']['output']>;
  /** Thoth ID of the series */
  seriesId: Scalars['Uuid']['output'];
  /** Name of the series */
  seriesName: Scalars['String']['output'];
  /** Type of the series */
  seriesType: SeriesType;
  /** URL of the series' landing page */
  seriesUrl?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the series record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
};


/** A periodical of publications about a particular subject. */
export type SeriesIssuesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<IssueOrderBy>;
};

/** Field to use when sorting series list */
export enum SeriesField {
  CreatedAt = 'CREATED_AT',
  IssnDigital = 'ISSN_DIGITAL',
  IssnPrint = 'ISSN_PRINT',
  SeriesCfpUrl = 'SERIES_CFP_URL',
  SeriesDescription = 'SERIES_DESCRIPTION',
  SeriesId = 'SERIES_ID',
  SeriesName = 'SERIES_NAME',
  SeriesType = 'SERIES_TYPE',
  SeriesUrl = 'SERIES_URL',
  UpdatedAt = 'UPDATED_AT'
}

/** Field and order to use when sorting serieses list */
export type SeriesOrderBy = {
  direction: Direction;
  field: SeriesField;
};

/** Type of a series */
export enum SeriesType {
  /** A set of related books, published periodically */
  BookSeries = 'BOOK_SERIES',
  /** A set of collections of articles on a specific topic, published periodically */
  Journal = 'JOURNAL'
}

/** A significant discipline or term related to a work. */
export type Subject = {
  __typename?: 'Subject';
  /** Date and time at which the subject record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Code representing the subject within the specified type */
  subjectCode: Scalars['String']['output'];
  /** Thoth ID of the subject */
  subjectId: Scalars['Uuid']['output'];
  /** Number representing this subject's position in an ordered list of subjects of the same type within the work (subjects of equal prominence can have the same number) */
  subjectOrdinal: Scalars['Int']['output'];
  /** Type of the subject (e.g. the subject category scheme being used) */
  subjectType: SubjectType;
  /** Date and time at which the subject record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Get the work to which the subject is linked */
  work: Work;
  /** Thoth ID of the work to which the subject is linked */
  workId: Scalars['Uuid']['output'];
};

/** Field to use when sorting subjects list */
export enum SubjectField {
  CreatedAt = 'CREATED_AT',
  SubjectCode = 'SUBJECT_CODE',
  SubjectId = 'SUBJECT_ID',
  SubjectOrdinal = 'SUBJECT_ORDINAL',
  SubjectType = 'SUBJECT_TYPE',
  UpdatedAt = 'UPDATED_AT',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting subjects list */
export type SubjectOrderBy = {
  direction: Direction;
  field: SubjectField;
};

/** Type of a subject (e.g. the subject category scheme being used) */
export enum SubjectType {
  Bic = 'BIC',
  Bisac = 'BISAC',
  Custom = 'CUSTOM',
  Keyword = 'KEYWORD',
  Lcc = 'LCC',
  Thema = 'THEMA'
}

/** Timestamp and choice out of greater than/less than to use when filtering by a time field (e.g. updated_at) */
export type TimeExpression = {
  expression: Expression;
  timestamp: Scalars['Timestamp']['input'];
};

/** A title associated with a work. */
export type Title = {
  __typename?: 'Title';
  /** Whether this is the canonical title for the work */
  canonical: Scalars['Boolean']['output'];
  /** Full title including subtitle */
  fullTitle: Scalars['String']['output'];
  /** Locale code of the title */
  localeCode: LocaleCode;
  /** Subtitle of the work */
  subtitle?: Maybe<Scalars['String']['output']>;
  /** Main title (excluding subtitle) */
  title: Scalars['String']['output'];
  /** Thoth ID of the title */
  titleId: Scalars['Uuid']['output'];
  /** Get the work to which the title is linked */
  work: Work;
  /** Thoth ID of the work to which the title is linked */
  workId: Scalars['Uuid']['output'];
};

/** Field to use when sorting title list */
export enum TitleField {
  Canonical = 'CANONICAL',
  FullTitle = 'FULL_TITLE',
  LocaleCode = 'LOCALE_CODE',
  Subtitle = 'SUBTITLE',
  Title = 'TITLE',
  TitleId = 'TITLE_ID',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting titles list */
export type TitleOrderBy = {
  direction: Direction;
  field: TitleField;
};

/** Single required HTTP header for presigned file upload. */
export type UploadRequestHeader = {
  __typename?: 'UploadRequestHeader';
  /** HTTP header name. */
  name: Scalars['String']['output'];
  /** HTTP header value. */
  value: Scalars['String']['output'];
};

/** Unit of measurement for physical Work weight (grams or ounces) */
export enum WeightUnit {
  /** Grams */
  G = 'G',
  /** Ounces */
  Oz = 'OZ'
}

/** A written text that can be published */
export type Work = {
  __typename?: 'Work';
  /** Query abstracts by work ID */
  abstracts: Array<Abstract>;
  /** Get additional resources linked to this work */
  additionalResources: Array<WorkResource>;
  /** Total number of audio fragments in the work */
  audioCount?: Maybe<Scalars['Int']['output']>;
  /** Get awards linked to this work */
  awards: Array<Award>;
  /** Indicates that the work contains a bibliography or other similar information */
  bibliographyNote?: Maybe<Scalars['String']['output']>;
  /** Get book reviews linked to this work */
  bookReviews: Array<BookReview>;
  /** Get contributions linked to this work */
  contributions: Array<Contribution>;
  /** Copyright holder of the work */
  copyrightHolder?: Maybe<Scalars['String']['output']>;
  /** Caption describing the work's cover image */
  coverCaption?: Maybe<Scalars['String']['output']>;
  /** URL of the work's cover image */
  coverUrl?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the work record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Digital Object Identifier of the work as full URL, using the HTTPS scheme and the doi.org domain (e.g. https://doi.org/10.11647/obp.0001) */
  doi?: Maybe<Scalars['Doi']['output']>;
  /** Edition number of the work (not applicable to chapters) */
  edition?: Maybe<Scalars['Int']['output']>;
  /** Get endorsements linked to this work */
  endorsements: Array<Endorsement>;
  /** Get the featured video linked to this work */
  featuredVideo?: Maybe<WorkFeaturedVideo>;
  /** Page number on which the work begins (only applicable to chapters) */
  firstPage?: Maybe<Scalars['String']['output']>;
  /** Get the front cover file for this work */
  frontcover?: Maybe<File>;
  /**
   * Concatenation of title and subtitle with punctuation mark
   * @deprecated Please use Work `titles` field instead to get the correct full title in a multilingual manner
   */
  fullTitle: Scalars['String']['output'];
  /** Get fundings linked to this work */
  fundings: Array<Funding>;
  /** A general-purpose field used to include information that does not have a specific designated field */
  generalNote?: Maybe<Scalars['String']['output']>;
  /** Total number of images in the work */
  imageCount?: Maybe<Scalars['Int']['output']>;
  /** Get this work's imprint */
  imprint: Imprint;
  /** Thoth ID of the work's imprint */
  imprintId: Scalars['Uuid']['output'];
  /** Get issues linked to this work */
  issues: Array<Issue>;
  /** URL of the web page of the work */
  landingPage?: Maybe<Scalars['String']['output']>;
  /** Get languages linked to this work */
  languages: Array<Language>;
  /** Page number on which the work ends (only applicable to chapters) */
  lastPage?: Maybe<Scalars['String']['output']>;
  /** Library of Congress Control Number of the work (not applicable to chapters) */
  lccn?: Maybe<Scalars['String']['output']>;
  /** URL of the license which applies to this work (frequently a Creative Commons license for open-access works) */
  license?: Maybe<Scalars['String']['output']>;
  /**
   * Abstract of the work. Where a work has only one abstract, it should be entered here, and Short Abstract can be left blank. Long Abstract is output in metadata formats, and Short Abstract is not.
   * @deprecated Please use Work `abstracts` field instead to get the correct long abstract in a multilingual manner
   */
  longAbstract?: Maybe<Scalars['String']['output']>;
  /** OCLC (WorldCat) Control Number of the work (not applicable to chapters) */
  oclc?: Maybe<Scalars['String']['output']>;
  /** Breakdown of work's page count into front matter, main content, and/or back matter (e.g. 'xi + 140') */
  pageBreakdown?: Maybe<Scalars['String']['output']>;
  /** Total number of pages in the work. In most cases, unnumbered pages (e.g. endpapers) should be omitted from this count. */
  pageCount?: Maybe<Scalars['Int']['output']>;
  /** Concatenation of first page and last page with dash (only applicable to chapters) */
  pageInterval?: Maybe<Scalars['String']['output']>;
  /** Place of publication of the work */
  place?: Maybe<Scalars['String']['output']>;
  /** Date the work was published */
  publicationDate?: Maybe<Scalars['Date']['output']>;
  /** Get publications linked to this work */
  publications: Array<Publication>;
  /** Internal reference code */
  reference?: Maybe<Scalars['String']['output']>;
  /** Get references cited by this work */
  references: Array<Reference>;
  /** Get other works related to this work */
  relations: Array<WorkRelation>;
  /** Description of additional resources linked to this work */
  resourcesDescription?: Maybe<Scalars['String']['output']>;
  /**
   * Short abstract of the work. Where a work has two different versions of the abstract, the truncated version should be entered here. Otherwise, it can be left blank. This field is not output in metadata formats; where relevant, Long Abstract is used instead.
   * @deprecated Please use Work `abstracts` field instead to get the correct short abstract in a multilingual manner
   */
  shortAbstract?: Maybe<Scalars['String']['output']>;
  /** Get subjects linked to this work */
  subjects: Array<Subject>;
  /**
   * Secondary title of the work (excluding main title)
   * @deprecated Please use Work `titles` field instead to get the correct sub_title in a multilingual manner
   */
  subtitle?: Maybe<Scalars['String']['output']>;
  /** Total number of tables in the work */
  tableCount?: Maybe<Scalars['Int']['output']>;
  /**
   * Main title of the work (excluding subtitle)
   * @deprecated Please use Work `titles` field instead to get the correct title in a multilingual manner
   */
  title: Scalars['String']['output'];
  /** Query titles by work ID */
  titles: Array<Title>;
  /** Table of contents of the work (not applicable to chapters) */
  toc?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the work record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Date and time at which the work record or any of its linked records was last updated */
  updatedAtWithRelations: Scalars['Timestamp']['output'];
  /** Total number of video fragments in the work */
  videoCount?: Maybe<Scalars['Int']['output']>;
  /** Date the work was withdrawn from publication. Only applies to out of print and withdrawn works. */
  withdrawnDate?: Maybe<Scalars['Date']['output']>;
  /** Thoth ID of the work */
  workId: Scalars['Uuid']['output'];
  /** Publication status of the work */
  workStatus: WorkStatus;
  /** Type of the work */
  workType: WorkType;
};


/** A written text that can be published */
export type WorkAbstractsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  localeCodes?: InputMaybe<Array<LocaleCode>>;
  markupFormat?: InputMaybe<MarkupFormat>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<AbstractOrderBy>;
};


/** A written text that can be published */
export type WorkAdditionalResourcesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  markupFormat?: InputMaybe<MarkupFormat>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


/** A written text that can be published */
export type WorkAwardsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


/** A written text that can be published */
export type WorkBookReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


/** A written text that can be published */
export type WorkContributionsArgs = {
  contributionTypes?: InputMaybe<Array<ContributionType>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ContributionOrderBy>;
};


/** A written text that can be published */
export type WorkEndorsementsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


/** A written text that can be published */
export type WorkFundingsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<FundingOrderBy>;
};


/** A written text that can be published */
export type WorkIssuesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<IssueOrderBy>;
};


/** A written text that can be published */
export type WorkLanguagesArgs = {
  languageCodes?: InputMaybe<Array<LanguageCode>>;
  languageRelation?: InputMaybe<LanguageRelation>;
  languageRelations?: InputMaybe<Array<LanguageRelation>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<LanguageOrderBy>;
};


/** A written text that can be published */
export type WorkPublicationsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<PublicationOrderBy>;
  publicationTypes?: InputMaybe<Array<PublicationType>>;
};


/** A written text that can be published */
export type WorkReferencesArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ReferenceOrderBy>;
};


/** A written text that can be published */
export type WorkRelationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<WorkRelationOrderBy>;
  relationTypes?: InputMaybe<Array<RelationType>>;
};


/** A written text that can be published */
export type WorkResourcesDescriptionArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
};


/** A written text that can be published */
export type WorkSubjectsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<SubjectOrderBy>;
  subjectTypes?: InputMaybe<Array<SubjectType>>;
};


/** A written text that can be published */
export type WorkTitlesArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  localeCodes?: InputMaybe<Array<LocaleCode>>;
  markupFormat?: InputMaybe<MarkupFormat>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<TitleOrderBy>;
};

/** A featured video linked to a work. */
export type WorkFeaturedVideo = {
  __typename?: 'WorkFeaturedVideo';
  /** Date and time at which the featured video record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Get the hosted file linked to this featured video */
  file?: Maybe<File>;
  /** Rendered height of the featured video embed */
  height: Scalars['Int']['output'];
  /** Title or caption of the featured video */
  title?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the featured video record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** CDN URL of the featured video */
  url?: Maybe<Scalars['String']['output']>;
  /** Rendered width of the featured video embed */
  width: Scalars['Int']['output'];
  /** Get the work linked to this featured video */
  work: Work;
  /** Thoth ID of the featured video */
  workFeaturedVideoId: Scalars['Uuid']['output'];
  /** Thoth ID of the work to which this featured video belongs */
  workId: Scalars['Uuid']['output'];
};

/** Field to use when sorting featured videos list */
export enum WorkFeaturedVideoField {
  CreatedAt = 'CREATED_AT',
  Height = 'HEIGHT',
  Title = 'TITLE',
  UpdatedAt = 'UPDATED_AT',
  Url = 'URL',
  Width = 'WIDTH',
  WorkFeaturedVideoId = 'WORK_FEATURED_VIDEO_ID',
  WorkId = 'WORK_ID'
}

/** Field and order to use when sorting featured videos list */
export type WorkFeaturedVideoOrderBy = {
  direction: Direction;
  field: WorkFeaturedVideoField;
};

/** Field to use when sorting works list */
export enum WorkField {
  AudioCount = 'AUDIO_COUNT',
  BibliographyNote = 'BIBLIOGRAPHY_NOTE',
  CopyrightHolder = 'COPYRIGHT_HOLDER',
  CoverCaption = 'COVER_CAPTION',
  CoverUrl = 'COVER_URL',
  CreatedAt = 'CREATED_AT',
  Doi = 'DOI',
  Edition = 'EDITION',
  FirstPage = 'FIRST_PAGE',
  FullTitle = 'FULL_TITLE',
  GeneralNote = 'GENERAL_NOTE',
  ImageCount = 'IMAGE_COUNT',
  LandingPage = 'LANDING_PAGE',
  LastPage = 'LAST_PAGE',
  Lccn = 'LCCN',
  License = 'LICENSE',
  LongAbstract = 'LONG_ABSTRACT',
  Oclc = 'OCLC',
  PageBreakdown = 'PAGE_BREAKDOWN',
  PageCount = 'PAGE_COUNT',
  PageInterval = 'PAGE_INTERVAL',
  Place = 'PLACE',
  PublicationDate = 'PUBLICATION_DATE',
  Reference = 'REFERENCE',
  ResourcesDescription = 'RESOURCES_DESCRIPTION',
  ShortAbstract = 'SHORT_ABSTRACT',
  Subtitle = 'SUBTITLE',
  TableCount = 'TABLE_COUNT',
  Title = 'TITLE',
  Toc = 'TOC',
  UpdatedAt = 'UPDATED_AT',
  UpdatedAtWithRelations = 'UPDATED_AT_WITH_RELATIONS',
  VideoCount = 'VIDEO_COUNT',
  WithdrawnDate = 'WITHDRAWN_DATE',
  WorkId = 'WORK_ID',
  WorkStatus = 'WORK_STATUS',
  WorkType = 'WORK_TYPE'
}

/** Field and order to use when sorting works list */
export type WorkOrderBy = {
  direction: Direction;
  field: WorkField;
};

/** A relationship between two works, e.g. a book and one of its chapters, or an original and its translation. */
export type WorkRelation = {
  __typename?: 'WorkRelation';
  /** Date and time at which the work relation record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Get the other work in the relationship */
  relatedWork: Work;
  /** Thoth ID of the other work in the relationship */
  relatedWorkId: Scalars['Uuid']['output'];
  /** Number representing this work relation's position in an ordered list of relations of the same type within the work */
  relationOrdinal: Scalars['Int']['output'];
  /** Nature of the relationship */
  relationType: RelationType;
  /** Thoth ID of the work to which this work relation belongs */
  relatorWorkId: Scalars['Uuid']['output'];
  /** Date and time at which the work relation record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** Thoth ID of the work relation */
  workRelationId: Scalars['Uuid']['output'];
};

/** Field to use when sorting work relations list */
export enum WorkRelationField {
  CreatedAt = 'CREATED_AT',
  RelatedWorkId = 'RELATED_WORK_ID',
  RelationOrdinal = 'RELATION_ORDINAL',
  RelationType = 'RELATION_TYPE',
  RelatorWorkId = 'RELATOR_WORK_ID',
  UpdatedAt = 'UPDATED_AT',
  WorkRelationId = 'WORK_RELATION_ID'
}

/** Field and order to use when sorting work relations list */
export type WorkRelationOrderBy = {
  direction: Direction;
  field: WorkRelationField;
};

/** A resource linked to a work but not embedded in the work text. */
export type WorkResource = {
  __typename?: 'WorkResource';
  /** Attribution for the resource source/author */
  attribution?: Maybe<Scalars['String']['output']>;
  /** Date and time at which the resource record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Date associated with the additional resource */
  date?: Maybe<Scalars['Date']['output']>;
  /** Description of the additional resource */
  description?: Maybe<Scalars['String']['output']>;
  /** DOI of the resource as full URL, using the HTTPS scheme and the doi.org domain */
  doi?: Maybe<Scalars['Doi']['output']>;
  /** Get the hosted file linked to this resource */
  file?: Maybe<File>;
  /** Handle identifier of the resource */
  handle?: Maybe<Scalars['String']['output']>;
  /** Number representing this resource's position in an ordered list of resources within the work */
  resourceOrdinal: Scalars['Int']['output'];
  /** Type of additional resource */
  resourceType: Scalars['String']['output'];
  /** Title of the additional resource */
  title: Scalars['String']['output'];
  /** Date and time at which the resource record was last updated */
  updatedAt: Scalars['Timestamp']['output'];
  /** URL of the additional resource */
  url?: Maybe<Scalars['String']['output']>;
  /** Get the work linked to this resource */
  work: Work;
  /** Thoth ID of the work to which this resource belongs */
  workId: Scalars['Uuid']['output'];
  /** Thoth ID of the work resource */
  workResourceId: Scalars['Uuid']['output'];
};


/** A resource linked to a work but not embedded in the work text. */
export type WorkResourceDescriptionArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
};


/** A resource linked to a work but not embedded in the work text. */
export type WorkResourceTitleArgs = {
  markupFormat?: InputMaybe<MarkupFormat>;
};

/** Publication status of a work throughout its lifecycle. For a visual representation of the workflow, refer to the work status flowchart https://github.com/thoth-pub/thoth/wiki/Thoth_Works#work-status-flowchart */
export enum WorkStatus {
  /** The work is published and currently available. This status indicates that the work is officially released. */
  Active = 'ACTIVE',
  /** The work has been permanently cancelled and will not be published. */
  Cancelled = 'CANCELLED',
  /** The work is in progress and is expected to be published. This is the typical status for a work that has not yet been released but is planned for publication. */
  Forthcoming = 'FORTHCOMING',
  /** The work's release has been delayed indefinitely. It may be resumed at a later time, but currently, no publication date is set. */
  PostponedIndefinitely = 'POSTPONED_INDEFINITELY',
  /** The work has been replaced by a new edition, with the previous edition now considered outdated. The two editions should be linked using a `WorkRelation` of type `REPLACES`/`IS_REPLACED_BY`. */
  Superseded = 'SUPERSEDED',
  /** The work has been withdrawn from publication and will be removed from all distribution channels. This status indicates that the work is no longer available for sale or distribution and will no longer be accessible. */
  Withdrawn = 'WITHDRAWN'
}

/** Type of a work */
export enum WorkType {
  /** Section of a larger parent work */
  BookChapter = 'BOOK_CHAPTER',
  /** Group of volumes published together forming a single work */
  BookSet = 'BOOK_SET',
  /** Collection of short works by different authors on a single theme */
  EditedBook = 'EDITED_BOOK',
  /** Single publication within a series of collections of related articles */
  JournalIssue = 'JOURNAL_ISSUE',
  /** Long-form work on a single theme, by a small number of authors */
  Monograph = 'MONOGRAPH',
  /** Work used for educational purposes */
  Textbook = 'TEXTBOOK'
}

export type CreateAbstractMutationVariables = Exact<{
  data: NewAbstract;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type CreateAbstractMutation = { __typename?: 'MutationRoot', createAbstract: (
    { __typename?: 'Abstract' }
    & { ' $fragmentRefs'?: { 'AbstractFragmentFragment': AbstractFragmentFragment } }
  ) };

export type UpdateAbstractMutationVariables = Exact<{
  data: PatchAbstract;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type UpdateAbstractMutation = { __typename?: 'MutationRoot', updateAbstract: (
    { __typename?: 'Abstract' }
    & { ' $fragmentRefs'?: { 'AbstractFragmentFragment': AbstractFragmentFragment } }
  ) };

export type DeleteAbstractMutationVariables = Exact<{
  abstractId: Scalars['Uuid']['input'];
}>;


export type DeleteAbstractMutation = { __typename?: 'MutationRoot', deleteAbstract: { __typename?: 'Abstract', abstractId: any } };

export type CreateAdditionalResourceMutationVariables = Exact<{
  data: NewAdditionalResource;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type CreateAdditionalResourceMutation = { __typename?: 'MutationRoot', createAdditionalResource: (
    { __typename?: 'WorkResource' }
    & { ' $fragmentRefs'?: { 'WorkResourceFragmentFragment': WorkResourceFragmentFragment } }
  ) };

export type UpdateAdditionalResourceMutationVariables = Exact<{
  data: PatchAdditionalResource;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type UpdateAdditionalResourceMutation = { __typename?: 'MutationRoot', updateAdditionalResource: (
    { __typename?: 'WorkResource' }
    & { ' $fragmentRefs'?: { 'WorkResourceFragmentFragment': WorkResourceFragmentFragment } }
  ) };

export type DeleteAdditionalResourceMutationVariables = Exact<{
  additionalResourceId: Scalars['Uuid']['input'];
}>;


export type DeleteAdditionalResourceMutation = { __typename?: 'MutationRoot', deleteAdditionalResource: (
    { __typename?: 'WorkResource' }
    & { ' $fragmentRefs'?: { 'WorkResourceFragmentFragment': WorkResourceFragmentFragment } }
  ) };

export type MoveAdditionalResourceMutationVariables = Exact<{
  additionalResourceId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveAdditionalResourceMutation = { __typename?: 'MutationRoot', moveAdditionalResource: (
    { __typename?: 'WorkResource' }
    & { ' $fragmentRefs'?: { 'WorkResourceFragmentFragment': WorkResourceFragmentFragment } }
  ) };

export type CreateAffiliationMutationVariables = Exact<{
  data: NewAffiliation;
}>;


export type CreateAffiliationMutation = { __typename?: 'MutationRoot', createAffiliation: (
    { __typename?: 'Affiliation' }
    & { ' $fragmentRefs'?: { 'AffiliationFragmentFragment': AffiliationFragmentFragment } }
  ) };

export type UpdateAffiliationMutationVariables = Exact<{
  data: PatchAffiliation;
}>;


export type UpdateAffiliationMutation = { __typename?: 'MutationRoot', updateAffiliation: (
    { __typename?: 'Affiliation' }
    & { ' $fragmentRefs'?: { 'AffiliationFragmentFragment': AffiliationFragmentFragment } }
  ) };

export type DeleteAffiliationMutationVariables = Exact<{
  affiliationId: Scalars['Uuid']['input'];
}>;


export type DeleteAffiliationMutation = { __typename?: 'MutationRoot', deleteAffiliation: { __typename?: 'Affiliation', affiliationId: any } };

export type MoveAffiliationMutationVariables = Exact<{
  affiliationId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveAffiliationMutation = { __typename?: 'MutationRoot', moveAffiliation: (
    { __typename?: 'Affiliation' }
    & { ' $fragmentRefs'?: { 'AffiliationFragmentFragment': AffiliationFragmentFragment } }
  ) };

export type CreateAwardMutationVariables = Exact<{
  data: NewAward;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type CreateAwardMutation = { __typename?: 'MutationRoot', createAward: (
    { __typename?: 'Award' }
    & { ' $fragmentRefs'?: { 'AwardFragmentFragment': AwardFragmentFragment } }
  ) };

export type UpdateAwardMutationVariables = Exact<{
  data: PatchAward;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type UpdateAwardMutation = { __typename?: 'MutationRoot', updateAward: (
    { __typename?: 'Award' }
    & { ' $fragmentRefs'?: { 'AwardFragmentFragment': AwardFragmentFragment } }
  ) };

export type DeleteAwardMutationVariables = Exact<{
  awardId: Scalars['Uuid']['input'];
}>;


export type DeleteAwardMutation = { __typename?: 'MutationRoot', deleteAward: (
    { __typename?: 'Award' }
    & { ' $fragmentRefs'?: { 'AwardFragmentFragment': AwardFragmentFragment } }
  ) };

export type MoveAwardMutationVariables = Exact<{
  awardId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveAwardMutation = { __typename?: 'MutationRoot', moveAward: (
    { __typename?: 'Award' }
    & { ' $fragmentRefs'?: { 'AwardFragmentFragment': AwardFragmentFragment } }
  ) };

export type CreateBookReviewMutationVariables = Exact<{
  data: NewBookReview;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type CreateBookReviewMutation = { __typename?: 'MutationRoot', createBookReview: (
    { __typename?: 'BookReview' }
    & { ' $fragmentRefs'?: { 'BookReviewFragmentFragment': BookReviewFragmentFragment } }
  ) };

export type UpdateBookReviewMutationVariables = Exact<{
  data: PatchBookReview;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type UpdateBookReviewMutation = { __typename?: 'MutationRoot', updateBookReview: (
    { __typename?: 'BookReview' }
    & { ' $fragmentRefs'?: { 'BookReviewFragmentFragment': BookReviewFragmentFragment } }
  ) };

export type DeleteBookReviewMutationVariables = Exact<{
  bookReviewId: Scalars['Uuid']['input'];
}>;


export type DeleteBookReviewMutation = { __typename?: 'MutationRoot', deleteBookReview: (
    { __typename?: 'BookReview' }
    & { ' $fragmentRefs'?: { 'BookReviewFragmentFragment': BookReviewFragmentFragment } }
  ) };

export type MoveBookReviewMutationVariables = Exact<{
  bookReviewId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveBookReviewMutation = { __typename?: 'MutationRoot', moveBookReview: (
    { __typename?: 'BookReview' }
    & { ' $fragmentRefs'?: { 'BookReviewFragmentFragment': BookReviewFragmentFragment } }
  ) };

export type GetBooksQueryVariables = Exact<{
  offset: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  direction?: InputMaybe<Direction>;
  filter?: InputMaybe<Scalars['String']['input']>;
  workStatus?: InputMaybe<WorkStatus>;
  field?: InputMaybe<WorkField>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetBooksQuery = { __typename?: 'QueryRoot', books: Array<(
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
  )> };

export type GetBooksCountQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  workStatus?: InputMaybe<WorkStatus>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  publicationDate?: InputMaybe<TimeExpression>;
  workStatuses?: InputMaybe<Array<WorkStatus> | WorkStatus>;
}>;


export type GetBooksCountQuery = { __typename?: 'QueryRoot', bookCount: number };

export type CreateContributionMutationVariables = Exact<{
  data: NewContribution;
}>;


export type CreateContributionMutation = { __typename?: 'MutationRoot', createContribution: { __typename?: 'Contribution', workId: any, contributionId: any } };

export type DeleteContributionMutationVariables = Exact<{
  contributionId: Scalars['Uuid']['input'];
}>;


export type DeleteContributionMutation = { __typename?: 'MutationRoot', deleteContribution: { __typename?: 'Contribution', workId: any } };

export type UpdateContributionMutationVariables = Exact<{
  data: PatchContribution;
}>;


export type UpdateContributionMutation = { __typename?: 'MutationRoot', updateContribution: { __typename?: 'Contribution', workId: any } };

export type MoveContributionMutationVariables = Exact<{
  contributionId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveContributionMutation = { __typename?: 'MutationRoot', moveContribution: { __typename?: 'Contribution', workId: any } };

export type CreateBiographyMutationVariables = Exact<{
  data: NewBiography;
  markupFormat: MarkupFormat;
}>;


export type CreateBiographyMutation = { __typename?: 'MutationRoot', createBiography: (
    { __typename?: 'Biography' }
    & { ' $fragmentRefs'?: { 'BiographyFragmentFragment': BiographyFragmentFragment } }
  ) };

export type UpdateBiographyMutationVariables = Exact<{
  data: PatchBiography;
  markupFormat: MarkupFormat;
}>;


export type UpdateBiographyMutation = { __typename?: 'MutationRoot', updateBiography: (
    { __typename?: 'Biography' }
    & { ' $fragmentRefs'?: { 'BiographyFragmentFragment': BiographyFragmentFragment } }
  ) };

export type DeleteBiographyMutationVariables = Exact<{
  biographyId: Scalars['Uuid']['input'];
}>;


export type DeleteBiographyMutation = { __typename?: 'MutationRoot', deleteBiography: (
    { __typename?: 'Biography' }
    & { ' $fragmentRefs'?: { 'BiographyFragmentFragment': BiographyFragmentFragment } }
  ) };

export type GetContributionBiographiesQueryVariables = Exact<{
  contributionId: Scalars['Uuid']['input'];
}>;


export type GetContributionBiographiesQuery = { __typename?: 'QueryRoot', contribution: { __typename?: 'Contribution', biographies: Array<(
      { __typename?: 'Biography', contributionId: any, work: { __typename?: 'Work', workId: any } }
      & { ' $fragmentRefs'?: { 'BiographyFragmentFragment': BiographyFragmentFragment } }
    )> } };

export type GetContributorsQueryVariables = Exact<{
  filter?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetContributorsQuery = { __typename?: 'QueryRoot', contributors: Array<{ __typename?: 'Contributor', orcid?: any | null, fullName: string, lastName: string, updatedAt: any, contributorId: any, contributions: Array<{ __typename?: 'Contribution', work: { __typename?: 'Work', title: string } }> }> };

export type GetLinkedPublishersQueryVariables = Exact<{
  contributorId: Scalars['Uuid']['input'];
  offset: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetLinkedPublishersQuery = { __typename?: 'QueryRoot', contributor: { __typename?: 'Contributor', contributions: Array<{ __typename?: 'Contribution', work: { __typename?: 'Work', imprint: { __typename?: 'Imprint', publisherId: any } } }> } };

export type CreateContributorMutationVariables = Exact<{
  data: NewContributor;
}>;


export type CreateContributorMutation = { __typename?: 'MutationRoot', createContributor: (
    { __typename?: 'Contributor' }
    & { ' $fragmentRefs'?: { 'ContributorFragmentFragment': ContributorFragmentFragment } }
  ) };

export type UpdateContributorMutationVariables = Exact<{
  data: PatchContributor;
}>;


export type UpdateContributorMutation = { __typename?: 'MutationRoot', updateContributor: (
    { __typename?: 'Contributor' }
    & { ' $fragmentRefs'?: { 'ContributorFragmentFragment': ContributorFragmentFragment } }
  ) };

export type GetContributorQueryVariables = Exact<{
  contributorId: Scalars['Uuid']['input'];
}>;


export type GetContributorQuery = { __typename?: 'QueryRoot', contributor: (
    { __typename?: 'Contributor' }
    & { ' $fragmentRefs'?: { 'ContributorFragmentFragment': ContributorFragmentFragment } }
  ) };

export type CreateEndorsementMutationVariables = Exact<{
  markupFormat?: InputMaybe<MarkupFormat>;
  data: NewEndorsement;
}>;


export type CreateEndorsementMutation = { __typename?: 'MutationRoot', createEndorsement: { __typename?: 'Endorsement', endorsementId: any, workId: any, authorName?: string | null, authorOrcid?: any | null, authorRole?: string | null, authorInstitutionId?: any | null, url?: string | null, text?: string | null, endorsementOrdinal: number, authorInstitution?: { __typename?: 'Institution', institutionId: any, institutionName: string, ror?: any | null } | null } };

export type UpdateEndorsementMutationVariables = Exact<{
  markupFormat?: InputMaybe<MarkupFormat>;
  data: PatchEndorsement;
}>;


export type UpdateEndorsementMutation = { __typename?: 'MutationRoot', updateEndorsement: { __typename?: 'Endorsement', endorsementId: any, workId: any, authorName?: string | null, authorOrcid?: any | null, authorRole?: string | null, authorInstitutionId?: any | null, url?: string | null, text?: string | null, endorsementOrdinal: number, authorInstitution?: { __typename?: 'Institution', institutionId: any, institutionName: string, ror?: any | null } | null } };

export type DeleteEndorsementMutationVariables = Exact<{
  endorsementId: Scalars['Uuid']['input'];
}>;


export type DeleteEndorsementMutation = { __typename?: 'MutationRoot', deleteEndorsement: { __typename?: 'Endorsement', endorsementId: any, workId: any, authorName?: string | null, authorOrcid?: any | null, authorRole?: string | null, authorInstitutionId?: any | null, url?: string | null, text?: string | null, endorsementOrdinal: number, authorInstitution?: { __typename?: 'Institution', institutionId: any, institutionName: string, ror?: any | null } | null } };

export type MoveEndorsementMutationVariables = Exact<{
  endorsementId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveEndorsementMutation = { __typename?: 'MutationRoot', moveEndorsement: { __typename?: 'Endorsement', endorsementId: any, workId: any, authorName?: string | null, authorOrcid?: any | null, authorRole?: string | null, authorInstitutionId?: any | null, url?: string | null, text?: string | null, endorsementOrdinal: number, authorInstitution?: { __typename?: 'Institution', institutionId: any, institutionName: string, ror?: any | null } | null } };

export type CreateWorkFeaturedVideoMutationVariables = Exact<{
  data: NewWorkFeaturedVideo;
}>;


export type CreateWorkFeaturedVideoMutation = { __typename?: 'MutationRoot', createWorkFeaturedVideo: (
    { __typename?: 'WorkFeaturedVideo' }
    & { ' $fragmentRefs'?: { 'WorkFeaturedVideoFragmentFragment': WorkFeaturedVideoFragmentFragment } }
  ) };

export type UpdateWorkFeaturedVideoMutationVariables = Exact<{
  data: PatchWorkFeaturedVideo;
}>;


export type UpdateWorkFeaturedVideoMutation = { __typename?: 'MutationRoot', updateWorkFeaturedVideo: (
    { __typename?: 'WorkFeaturedVideo' }
    & { ' $fragmentRefs'?: { 'WorkFeaturedVideoFragmentFragment': WorkFeaturedVideoFragmentFragment } }
  ) };

export type DeleteWorkFeaturedVideoMutationVariables = Exact<{
  workFeaturedVideoId: Scalars['Uuid']['input'];
}>;


export type DeleteWorkFeaturedVideoMutation = { __typename?: 'MutationRoot', deleteWorkFeaturedVideo: (
    { __typename?: 'WorkFeaturedVideo' }
    & { ' $fragmentRefs'?: { 'WorkFeaturedVideoFragmentFragment': WorkFeaturedVideoFragmentFragment } }
  ) };

export type CreateFundingMutationVariables = Exact<{
  data: NewFunding;
}>;


export type CreateFundingMutation = { __typename?: 'MutationRoot', createFunding: (
    { __typename?: 'Funding' }
    & { ' $fragmentRefs'?: { 'FundingFragmentFragment': FundingFragmentFragment } }
  ) };

export type UpdateFundingMutationVariables = Exact<{
  data: PatchFunding;
}>;


export type UpdateFundingMutation = { __typename?: 'MutationRoot', updateFunding: (
    { __typename?: 'Funding' }
    & { ' $fragmentRefs'?: { 'FundingFragmentFragment': FundingFragmentFragment } }
  ) };

export type DeleteFundingMutationVariables = Exact<{
  fundingId: Scalars['Uuid']['input'];
}>;


export type DeleteFundingMutation = { __typename?: 'MutationRoot', deleteFunding: (
    { __typename?: 'Funding' }
    & { ' $fragmentRefs'?: { 'FundingFragmentFragment': FundingFragmentFragment } }
  ) };

export type CreateImprintMutationVariables = Exact<{
  data: NewImprint;
}>;


export type CreateImprintMutation = { __typename?: 'MutationRoot', createImprint: { __typename?: 'Imprint', imprintId: any } };

export type UpdateImprintMutationVariables = Exact<{
  data: PatchImprint;
}>;


export type UpdateImprintMutation = { __typename?: 'MutationRoot', updateImprint: { __typename?: 'Imprint', imprintId: any, imprintName: string, imprintUrl?: string | null, updatedAt: any, crossmarkDoi?: any | null, defaultCurrency?: CurrencyCode | null, defaultLocale?: LocaleCode | null, defaultPlace?: string | null, s3Bucket?: string | null, cdnDomain?: string | null, cloudfrontDistId?: string | null, publisher: { __typename?: 'Publisher', publisherName: string } } };

export type DeleteImprintMutationVariables = Exact<{
  imprintId: Scalars['Uuid']['input'];
}>;


export type DeleteImprintMutation = { __typename?: 'MutationRoot', deleteImprint: { __typename?: 'Imprint', imprintId: any } };

export type GetImprintsCountQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetImprintsCountQuery = { __typename?: 'QueryRoot', imprintCount: number };

export type GetImprintsQueryVariables = Exact<{
  offset: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetImprintsQuery = { __typename?: 'QueryRoot', imprints: Array<{ __typename?: 'Imprint', imprintId: any, imprintName: string, imprintUrl?: string | null, updatedAt: any, crossmarkDoi?: any | null, defaultCurrency?: CurrencyCode | null, defaultLocale?: LocaleCode | null, defaultPlace?: string | null, publisher: { __typename?: 'Publisher', publisherName: string } }> };

export type GetImprintsAdminQueryVariables = Exact<{
  offset: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetImprintsAdminQuery = { __typename?: 'QueryRoot', imprints: Array<{ __typename?: 'Imprint', imprintId: any, imprintName: string, imprintUrl?: string | null, updatedAt: any, crossmarkDoi?: any | null, defaultCurrency?: CurrencyCode | null, defaultLocale?: LocaleCode | null, defaultPlace?: string | null, s3Bucket?: string | null, cdnDomain?: string | null, cloudfrontDistId?: string | null, publisher: { __typename?: 'Publisher', publisherName: string } }> };

export type GetInstitutionsQueryVariables = Exact<{
  offset: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetInstitutionsQuery = { __typename?: 'QueryRoot', institutions: Array<{ __typename?: 'Institution', institutionId: any, institutionName: string, institutionDoi?: any | null, ror?: any | null, countryCode?: CountryCode | null, updatedAt: any }> };

export type GetInstitutionsCountQueryVariables = Exact<{
  filter?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetInstitutionsCountQuery = { __typename?: 'QueryRoot', institutionCount: number };

export type CreateLanguageMutationVariables = Exact<{
  data: NewLanguage;
}>;


export type CreateLanguageMutation = { __typename?: 'MutationRoot', createLanguage: (
    { __typename?: 'Language' }
    & { ' $fragmentRefs'?: { 'LanguageFragmentFragment': LanguageFragmentFragment } }
  ) };

export type UpdateLanguageMutationVariables = Exact<{
  data: PatchLanguage;
}>;


export type UpdateLanguageMutation = { __typename?: 'MutationRoot', updateLanguage: (
    { __typename?: 'Language' }
    & { ' $fragmentRefs'?: { 'LanguageFragmentFragment': LanguageFragmentFragment } }
  ) };

export type DeleteLanguageMutationVariables = Exact<{
  languageId: Scalars['Uuid']['input'];
}>;


export type DeleteLanguageMutation = { __typename?: 'MutationRoot', deleteLanguage: { __typename?: 'Language', languageId: any } };

export type CreateLocationMutationVariables = Exact<{
  data: NewLocation;
}>;


export type CreateLocationMutation = { __typename?: 'MutationRoot', createLocation: (
    { __typename?: 'Location' }
    & { ' $fragmentRefs'?: { 'LocationFragmentFragment': LocationFragmentFragment } }
  ) };

export type UpdateLocationMutationVariables = Exact<{
  data: PatchLocation;
}>;


export type UpdateLocationMutation = { __typename?: 'MutationRoot', updateLocation: (
    { __typename?: 'Location' }
    & { ' $fragmentRefs'?: { 'LocationFragmentFragment': LocationFragmentFragment } }
  ) };

export type DeleteLocationMutationVariables = Exact<{
  locationId: Scalars['Uuid']['input'];
}>;


export type DeleteLocationMutation = { __typename?: 'MutationRoot', deleteLocation: { __typename?: 'Location', locationId: any } };

export type CreatePriceMutationVariables = Exact<{
  data: NewPrice;
}>;


export type CreatePriceMutation = { __typename?: 'MutationRoot', createPrice: (
    { __typename?: 'Price' }
    & { ' $fragmentRefs'?: { 'PriceFragmentFragment': PriceFragmentFragment } }
  ) };

export type DeletePriceMutationVariables = Exact<{
  priceId: Scalars['Uuid']['input'];
}>;


export type DeletePriceMutation = { __typename?: 'MutationRoot', deletePrice: { __typename?: 'Price', priceId: any } };

export type UpdatePriceMutationVariables = Exact<{
  data: PatchPrice;
}>;


export type UpdatePriceMutation = { __typename?: 'MutationRoot', updatePrice: (
    { __typename?: 'Price' }
    & { ' $fragmentRefs'?: { 'PriceFragmentFragment': PriceFragmentFragment } }
  ) };

export type GetPublicationsQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetPublicationsQuery = { __typename?: 'QueryRoot', publications: Array<{ __typename?: 'Publication', isbn?: any | null, publicationId: any, publicationType: PublicationType, updatedAt: any, work: { __typename?: 'Work', doi?: any | null, titles: Array<{ __typename?: 'Title', canonical: boolean, fullTitle: string, localeCode: LocaleCode, subtitle?: string | null, title: string, titleId: any }>, imprint: { __typename?: 'Imprint', publisher: { __typename?: 'Publisher', publisherName: string } } }, prices: Array<{ __typename?: 'Price', unitPrice: number, priceId: any, currencyCode: CurrencyCode }>, locations: Array<{ __typename?: 'Location', canonical: boolean, fullTextUrl?: string | null, landingPage?: string | null, locationPlatform: LocationPlatform, locationId: any }> }> };

export type CreatePublicationMutationVariables = Exact<{
  data: NewPublication;
}>;


export type CreatePublicationMutation = { __typename?: 'MutationRoot', createPublication: { __typename?: 'Publication', publicationId: any, work: { __typename?: 'Work', doi?: any | null, titles: Array<{ __typename?: 'Title', canonical: boolean, fullTitle: string, localeCode: LocaleCode, subtitle?: string | null, title: string, titleId: any }>, imprint: { __typename?: 'Imprint', publisher: { __typename?: 'Publisher', publisherName: string } } }, prices: Array<{ __typename?: 'Price', unitPrice: number, priceId: any, currencyCode: CurrencyCode }> } };

export type UpdatePublicationMutationVariables = Exact<{
  data: PatchPublication;
}>;


export type UpdatePublicationMutation = { __typename?: 'MutationRoot', updatePublication: { __typename?: 'Publication', publicationId: any } };

export type DeletePublicationMutationVariables = Exact<{
  publicationId: Scalars['Uuid']['input'];
}>;


export type DeletePublicationMutation = { __typename?: 'MutationRoot', deletePublication: { __typename?: 'Publication', publicationId: any } };

export type CreateContactMutationVariables = Exact<{
  data: NewContact;
}>;


export type CreateContactMutation = { __typename?: 'MutationRoot', createContact: { __typename?: 'Contact', contactId: any, contactType: ContactType, email: string } };

export type UpdateContactMutationVariables = Exact<{
  data: PatchContact;
}>;


export type UpdateContactMutation = { __typename?: 'MutationRoot', updateContact: { __typename?: 'Contact', contactId: any, contactType: ContactType, email: string } };

export type DeleteContactMutationVariables = Exact<{
  contactId: Scalars['Uuid']['input'];
}>;


export type DeleteContactMutation = { __typename?: 'MutationRoot', deleteContact: { __typename?: 'Contact', contactId: any } };

export type CreatePublisherMutationVariables = Exact<{
  data: NewPublisher;
}>;


export type CreatePublisherMutation = { __typename?: 'MutationRoot', createPublisher: { __typename?: 'Publisher', publisherId: any } };

export type GetPublishersQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  offset: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetPublishersQuery = { __typename?: 'QueryRoot', publishers: Array<(
    { __typename?: 'Publisher' }
    & { ' $fragmentRefs'?: { 'PublisherFragmentFragment': PublisherFragmentFragment } }
  )> };

export type GetPublisherQueryVariables = Exact<{
  publisherId: Scalars['Uuid']['input'];
}>;


export type GetPublisherQuery = { __typename?: 'QueryRoot', publisher: (
    { __typename?: 'Publisher' }
    & { ' $fragmentRefs'?: { 'PublisherFragmentFragment': PublisherFragmentFragment } }
  ) };

export type GetPublisherAdminQueryVariables = Exact<{
  publisherId: Scalars['Uuid']['input'];
}>;


export type GetPublisherAdminQuery = { __typename?: 'QueryRoot', publisher: (
    { __typename?: 'Publisher', zitadelId?: string | null }
    & { ' $fragmentRefs'?: { 'PublisherFragmentFragment': PublisherFragmentFragment } }
  ) };

export type UpdatePublisherMutationVariables = Exact<{
  data: PatchPublisher;
}>;


export type UpdatePublisherMutation = { __typename?: 'MutationRoot', updatePublisher: (
    { __typename?: 'Publisher' }
    & { ' $fragmentRefs'?: { 'PublisherFragmentFragment': PublisherFragmentFragment } }
  ) };

export type CreateReferenceMutationVariables = Exact<{
  data: NewReference;
}>;


export type CreateReferenceMutation = { __typename?: 'MutationRoot', createReference: (
    { __typename?: 'Reference' }
    & { ' $fragmentRefs'?: { 'ReferenceFragmentFragment': ReferenceFragmentFragment } }
  ) };

export type UpdateReferenceMutationVariables = Exact<{
  data: PatchReference;
}>;


export type UpdateReferenceMutation = { __typename?: 'MutationRoot', updateReference: (
    { __typename?: 'Reference' }
    & { ' $fragmentRefs'?: { 'ReferenceFragmentFragment': ReferenceFragmentFragment } }
  ) };

export type DeleteReferenceMutationVariables = Exact<{
  referenceId: Scalars['Uuid']['input'];
}>;


export type DeleteReferenceMutation = { __typename?: 'MutationRoot', deleteReference: (
    { __typename?: 'Reference' }
    & { ' $fragmentRefs'?: { 'ReferenceFragmentFragment': ReferenceFragmentFragment } }
  ) };

export type MoveReferenceMutationVariables = Exact<{
  referenceId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveReferenceMutation = { __typename?: 'MutationRoot', moveReference: (
    { __typename?: 'Reference' }
    & { ' $fragmentRefs'?: { 'ReferenceFragmentFragment': ReferenceFragmentFragment } }
  ) };

export type CreateSeriesMutationVariables = Exact<{
  data: NewSeries;
}>;


export type CreateSeriesMutation = { __typename?: 'MutationRoot', createSeries: { __typename?: 'Series', seriesId: any } };

export type UpdateSeriesMutationVariables = Exact<{
  data: PatchSeries;
}>;


export type UpdateSeriesMutation = { __typename?: 'MutationRoot', updateSeries: { __typename?: 'Series', seriesId: any } };

export type DeleteSeriesMutationVariables = Exact<{
  seriesId: Scalars['Uuid']['input'];
}>;


export type DeleteSeriesMutation = { __typename?: 'MutationRoot', deleteSeries: { __typename?: 'Series', seriesId: any } };

export type CreateIssueMutationVariables = Exact<{
  data: NewIssue;
}>;


export type CreateIssueMutation = { __typename?: 'MutationRoot', createIssue: { __typename?: 'Issue', issueId: any } };

export type UpdateIssueMutationVariables = Exact<{
  data: PatchIssue;
}>;


export type UpdateIssueMutation = { __typename?: 'MutationRoot', updateIssue: { __typename?: 'Issue', issueId: any, issueOrdinal: number, seriesId: any, workId: any } };

export type DeleteIssueMutationVariables = Exact<{
  issueId: Scalars['Uuid']['input'];
}>;


export type DeleteIssueMutation = { __typename?: 'MutationRoot', deleteIssue: { __typename?: 'Issue', issueId: any } };

export type MoveIssueMutationVariables = Exact<{
  issueId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveIssueMutation = { __typename?: 'MutationRoot', moveIssue: { __typename?: 'Issue', issueId: any } };

export type GetSeriesesQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  direction?: InputMaybe<Direction>;
  field?: InputMaybe<SeriesField>;
  seriesTypes?: InputMaybe<Array<SeriesType> | SeriesType>;
}>;


export type GetSeriesesQuery = { __typename?: 'QueryRoot', serieses: Array<{ __typename?: 'Series', seriesId: any, seriesName: string, seriesType: SeriesType, issnPrint?: string | null, issnDigital?: string | null, updatedAt: any, imprintId: any, seriesUrl?: string | null, seriesDescription?: string | null, imprint: { __typename?: 'Imprint', imprintName: string }, issues: Array<{ __typename?: 'Issue', issueId: any, issueOrdinal: number, work: { __typename?: 'Work', workId: any, title: string, coverUrl?: string | null } }> }> };

export type GetSeriesCountQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetSeriesCountQuery = { __typename?: 'QueryRoot', seriesCount: number };

export type GetSeriesQueryVariables = Exact<{
  seriesId: Scalars['Uuid']['input'];
}>;


export type GetSeriesQuery = { __typename?: 'QueryRoot', series: { __typename?: 'Series', seriesId: any, seriesName: string, seriesType: SeriesType, issnPrint?: string | null, issnDigital?: string | null, updatedAt: any, imprintId: any, seriesUrl?: string | null, seriesDescription?: string | null, imprint: { __typename?: 'Imprint', imprintName: string }, issues: Array<{ __typename?: 'Issue', issueId: any, issueOrdinal: number, work: { __typename?: 'Work', workId: any, title: string, coverUrl?: string | null } }> } };

export type CreateSetMutationVariables = Exact<{
  data: NewWork;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type CreateSetMutation = { __typename?: 'MutationRoot', createWork: (
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'SetFragmentFragment': SetFragmentFragment } }
  ) };

export type UpdateSetMutationVariables = Exact<{
  data: PatchWork;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type UpdateSetMutation = { __typename?: 'MutationRoot', updateWork: (
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'SetFragmentFragment': SetFragmentFragment } }
  ) };

export type DeleteWorkMutationVariables = Exact<{
  workId: Scalars['Uuid']['input'];
}>;


export type DeleteWorkMutation = { __typename?: 'MutationRoot', deleteWork: { __typename?: 'Work', workId: any } };

export type MoveWorkRelationMutationVariables = Exact<{
  workRelationId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveWorkRelationMutation = { __typename?: 'MutationRoot', moveWorkRelation: { __typename?: 'WorkRelation', workRelationId: any } };

export type AddBookToSetMutationVariables = Exact<{
  data: NewWorkRelation;
}>;


export type AddBookToSetMutation = { __typename?: 'MutationRoot', createWorkRelation: { __typename?: 'WorkRelation', workRelationId: any } };

export type DeleteBookFromSetMutationVariables = Exact<{
  workRelationId: Scalars['Uuid']['input'];
}>;


export type DeleteBookFromSetMutation = { __typename?: 'MutationRoot', deleteWorkRelation: { __typename?: 'WorkRelation', workRelationId: any } };

export type GetSetsQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  direction?: InputMaybe<Direction>;
  field?: InputMaybe<WorkField>;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetSetsQuery = { __typename?: 'QueryRoot', works: Array<(
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'SetFragmentFragment': SetFragmentFragment } }
  )> };

export type GetSetQueryVariables = Exact<{
  workId: Scalars['Uuid']['input'];
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetSetQuery = { __typename?: 'QueryRoot', work: (
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'SetFragmentFragment': SetFragmentFragment } }
  ) };

export type GetSetsCountQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetSetsCountQuery = { __typename?: 'QueryRoot', workCount: number };

export type GetBookSetWorksQueryVariables = Exact<{
  setId: Scalars['Uuid']['input'];
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetBookSetWorksQuery = { __typename?: 'QueryRoot', work: { __typename?: 'Work', relations: Array<{ __typename?: 'WorkRelation', relationOrdinal: number, workRelationId: any, relatedWorkId: any, relatedWork: { __typename?: 'Work', titles: Array<{ __typename?: 'Title', canonical: boolean, fullTitle: string, localeCode: LocaleCode, subtitle?: string | null, title: string, titleId: any }> } }> } };

export type CreateSubjectMutationVariables = Exact<{
  data: NewSubject;
}>;


export type CreateSubjectMutation = { __typename?: 'MutationRoot', createSubject: (
    { __typename?: 'Subject' }
    & { ' $fragmentRefs'?: { 'SubjectFragmentFragment': SubjectFragmentFragment } }
  ) };

export type UpdateSubjectMutationVariables = Exact<{
  data: PatchSubject;
}>;


export type UpdateSubjectMutation = { __typename?: 'MutationRoot', updateSubject: (
    { __typename?: 'Subject' }
    & { ' $fragmentRefs'?: { 'SubjectFragmentFragment': SubjectFragmentFragment } }
  ) };

export type DeleteSubjectMutationVariables = Exact<{
  subjectId: Scalars['Uuid']['input'];
}>;


export type DeleteSubjectMutation = { __typename?: 'MutationRoot', deleteSubject: (
    { __typename?: 'Subject' }
    & { ' $fragmentRefs'?: { 'SubjectFragmentFragment': SubjectFragmentFragment } }
  ) };

export type MoveSubjectMutationVariables = Exact<{
  subjectId: Scalars['Uuid']['input'];
  newOrdinal: Scalars['Int']['input'];
}>;


export type MoveSubjectMutation = { __typename?: 'MutationRoot', moveSubject: { __typename?: 'Subject', subjectId: any } };

export type CreateTitleMutationVariables = Exact<{
  data: NewTitle;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type CreateTitleMutation = { __typename?: 'MutationRoot', createTitle: (
    { __typename?: 'Title' }
    & { ' $fragmentRefs'?: { 'TitleFragmentFragment': TitleFragmentFragment } }
  ) };

export type UpdateTitleMutationVariables = Exact<{
  data: PatchTitle;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type UpdateTitleMutation = { __typename?: 'MutationRoot', updateTitle: (
    { __typename?: 'Title' }
    & { ' $fragmentRefs'?: { 'TitleFragmentFragment': TitleFragmentFragment } }
  ) };

export type DeleteTitleMutationVariables = Exact<{
  titleId: Scalars['Uuid']['input'];
}>;


export type DeleteTitleMutation = { __typename?: 'MutationRoot', deleteTitle: { __typename?: 'Title', titleId: any } };

export type GetUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserQuery = { __typename?: 'QueryRoot', me: { __typename?: 'Me', userId: string, email?: string | null, firstName?: string | null, lastName?: string | null, isSuperuser: boolean, publisherContexts: Array<{ __typename?: 'PublisherContext', publisher: { __typename?: 'Publisher', publisherName: string, publisherId: any, imprints: Array<{ __typename?: 'Imprint', imprintId: any, imprintName: string, imprintUrl?: string | null, updatedAt: any, crossmarkDoi?: any | null, defaultCurrency?: CurrencyCode | null, defaultLocale?: LocaleCode | null, defaultPlace?: string | null }> }, permissions: { __typename?: 'PublisherPermissions', publisherAdmin: boolean, workLifecycle: boolean, cdnWrite: boolean } }> } };

export type CreateWorkMutationVariables = Exact<{
  data: NewWork;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type CreateWorkMutation = { __typename?: 'MutationRoot', createWork: (
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
  ) };

export type GetWorksQueryVariables = Exact<{
  offset: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  direction?: InputMaybe<Direction>;
  field?: InputMaybe<WorkField>;
  workStatus?: InputMaybe<WorkStatus>;
  filter?: InputMaybe<Scalars['String']['input']>;
  workTypes?: InputMaybe<Array<WorkType> | WorkType>;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetWorksQuery = { __typename?: 'QueryRoot', works: Array<(
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
  )> };

export type GetWorkQueryVariables = Exact<{
  workId: Scalars['Uuid']['input'];
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetWorkQuery = { __typename?: 'QueryRoot', work: (
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
  ) };

export type UpdateWorkMutationVariables = Exact<{
  data: PatchWork;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type UpdateWorkMutation = { __typename?: 'MutationRoot', updateWork: (
    { __typename?: 'Work' }
    & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
  ) };

export type GetWorksCountQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  workStatus?: InputMaybe<WorkStatus>;
  workTypes?: InputMaybe<Array<WorkType> | WorkType>;
}>;


export type GetWorksCountQuery = { __typename?: 'QueryRoot', workCount: number };

export type GetWorkChaptersQueryVariables = Exact<{
  workId: Scalars['Uuid']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetWorkChaptersQuery = { __typename?: 'QueryRoot', work: { __typename?: 'Work', relations: Array<{ __typename?: 'WorkRelation', workRelationId: any, relatedWork: (
        { __typename?: 'Work' }
        & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
      ) }> } };

export type GetWorkTranslationsQueryVariables = Exact<{
  workId: Scalars['Uuid']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetWorkTranslationsQuery = { __typename?: 'QueryRoot', work: { __typename?: 'Work', relations: Array<{ __typename?: 'WorkRelation', workRelationId: any, relatedWork: (
        { __typename?: 'Work' }
        & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
      ) }> } };

export type GetWorkEditionsQueryVariables = Exact<{
  workId: Scalars['Uuid']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetWorkEditionsQuery = { __typename?: 'QueryRoot', work: { __typename?: 'Work', relations: Array<{ __typename?: 'WorkRelation', workRelationId: any, relatedWork: (
        { __typename?: 'Work' }
        & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
      ) }> } };

export type GetWorkPrevEditionsQueryVariables = Exact<{
  workId: Scalars['Uuid']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetWorkPrevEditionsQuery = { __typename?: 'QueryRoot', work: { __typename?: 'Work', relations: Array<{ __typename?: 'WorkRelation', workRelationId: any, relatedWork: (
        { __typename?: 'Work' }
        & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
      ) }> } };

export type GetTranslatedWorksQueryVariables = Exact<{
  workId: Scalars['Uuid']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  markupFormat?: InputMaybe<MarkupFormat>;
}>;


export type GetTranslatedWorksQuery = { __typename?: 'QueryRoot', work: { __typename?: 'Work', relations: Array<{ __typename?: 'WorkRelation', workRelationId: any, relatedWork: (
        { __typename?: 'Work' }
        & { ' $fragmentRefs'?: { 'WorkFragmentFragment': WorkFragmentFragment } }
      ) }> } };

export type CreateWorkRelationMutationVariables = Exact<{
  data: NewWorkRelation;
}>;


export type CreateWorkRelationMutation = { __typename?: 'MutationRoot', createWorkRelation: { __typename?: 'WorkRelation', workRelationId: any } };

export type GetWorkSetQueryVariables = Exact<{
  workId: Scalars['Uuid']['input'];
}>;


export type GetWorkSetQuery = { __typename?: 'QueryRoot', work: { __typename?: 'Work', relations: Array<{ __typename?: 'WorkRelation', workRelationId: any, relatedWork: { __typename?: 'Work', titles: Array<(
          { __typename?: 'Title' }
          & { ' $fragmentRefs'?: { 'TitleFragmentFragment': TitleFragmentFragment } }
        )> } }> } };

export type AbstractFragmentFragment = { __typename?: 'Abstract', abstractId: any, abstractType: AbstractType, canonical: boolean, content: string, localeCode: LocaleCode } & { ' $fragmentName'?: 'AbstractFragmentFragment' };

export type WorkResourceFragmentFragment = { __typename?: 'WorkResource', workResourceId: any, workId: any, title: string, description?: string | null, attribution?: string | null, resourceType: string, doi?: any | null, handle?: string | null, url?: string | null, resourceOrdinal: number, file?: { __typename?: 'File', cdnUrl: string } | null } & { ' $fragmentName'?: 'WorkResourceFragmentFragment' };

export type AffiliationFragmentFragment = { __typename?: 'Affiliation', contributionId: any, affiliationId: any, institutionId: any, affiliationOrdinal: number, position?: string | null, institution: { __typename?: 'Institution', institutionName: string, ror?: any | null } } & { ' $fragmentName'?: 'AffiliationFragmentFragment' };

export type AwardFragmentFragment = { __typename?: 'Award', awardId: any, workId: any, title: string, url?: string | null, category?: string | null, role?: AwardRole | null, prizeStatement?: string | null, awardOrdinal: number } & { ' $fragmentName'?: 'AwardFragmentFragment' };

export type BiographyFragmentFragment = { __typename?: 'Biography', biographyId: any, canonical: boolean, content: string, localeCode: LocaleCode, contributionId: any } & { ' $fragmentName'?: 'BiographyFragmentFragment' };

export type BookReviewFragmentFragment = { __typename?: 'BookReview', bookReviewId: any, workId: any, title?: string | null, authorName?: string | null, reviewerOrcid?: any | null, reviewerInstitutionId?: any | null, url?: string | null, doi?: any | null, reviewDate?: any | null, journalName?: string | null, journalVolume?: string | null, journalNumber?: string | null, journalIssn?: string | null, pageRange?: string | null, text?: string | null, reviewOrdinal: number, reviewerInstitution?: { __typename?: 'Institution', institutionId: any, institutionName: string, ror?: any | null } | null } & { ' $fragmentName'?: 'BookReviewFragmentFragment' };

export type ContributionFragmentFragment = { __typename?: 'Contribution', workId: any, contributionId: any, mainContribution: boolean, fullName: string, lastName: string, firstName?: string | null, contributionType: ContributionType, contributionOrdinal: number, contributorId: any, biographies: Array<(
    { __typename?: 'Biography' }
    & { ' $fragmentRefs'?: { 'BiographyFragmentFragment': BiographyFragmentFragment } }
  )>, contributor: (
    { __typename?: 'Contributor' }
    & { ' $fragmentRefs'?: { 'ContributorFragmentFragment': ContributorFragmentFragment } }
  ), affiliations: Array<(
    { __typename?: 'Affiliation' }
    & { ' $fragmentRefs'?: { 'AffiliationFragmentFragment': AffiliationFragmentFragment } }
  )> } & { ' $fragmentName'?: 'ContributionFragmentFragment' };

export type ContributorFragmentFragment = { __typename?: 'Contributor', contributorId: any, firstName?: string | null, fullName: string, lastName: string, updatedAt: any, orcid?: any | null, website?: string | null } & { ' $fragmentName'?: 'ContributorFragmentFragment' };

export type EndorsementFragmentFragment = { __typename?: 'Endorsement', endorsementId: any, workId: any, authorName?: string | null, authorOrcid?: any | null, authorRole?: string | null, authorInstitutionId?: any | null, url?: string | null, text?: string | null, endorsementOrdinal: number, authorInstitution?: { __typename?: 'Institution', institutionId: any, institutionName: string, ror?: any | null } | null } & { ' $fragmentName'?: 'EndorsementFragmentFragment' };

export type WorkFeaturedVideoFragmentFragment = { __typename?: 'WorkFeaturedVideo', workFeaturedVideoId: any, workId: any, title?: string | null, url?: string | null, width: number, height: number, file?: { __typename?: 'File', cdnUrl: string } | null } & { ' $fragmentName'?: 'WorkFeaturedVideoFragmentFragment' };

export type FundingFragmentFragment = { __typename?: 'Funding', fundingId: any, grantNumber?: string | null, institutionId: any, program?: string | null, projectName?: string | null, projectShortname?: string | null, institution: { __typename?: 'Institution', institutionName: string, ror?: any | null } } & { ' $fragmentName'?: 'FundingFragmentFragment' };

export type LanguageFragmentFragment = { __typename?: 'Language', languageId: any, languageCode: LanguageCode, languageRelation: LanguageRelation } & { ' $fragmentName'?: 'LanguageFragmentFragment' };

export type LocationFragmentFragment = { __typename?: 'Location', canonical: boolean, fullTextUrl?: string | null, landingPage?: string | null, locationPlatform: LocationPlatform, locationId: any } & { ' $fragmentName'?: 'LocationFragmentFragment' };

export type PriceFragmentFragment = { __typename?: 'Price', unitPrice: number, priceId: any, currencyCode: CurrencyCode } & { ' $fragmentName'?: 'PriceFragmentFragment' };

export type PublicationFragmentFragment = { __typename?: 'Publication', publicationId: any, isbn?: any | null, publicationType: PublicationType, updatedAt: any, weight?: number | null, width?: number | null, height?: number | null, depth?: number | null, work: { __typename?: 'Work', doi?: any | null, title: string, imprint: { __typename?: 'Imprint', publisher: { __typename?: 'Publisher', publisherName: string } } }, file?: { __typename?: 'File', cdnUrl: string } | null } & { ' $fragmentName'?: 'PublicationFragmentFragment' };

export type PublisherFragmentFragment = { __typename?: 'Publisher', publisherId: any, publisherName: string, publisherShortname?: string | null, publisherUrl?: string | null, updatedAt: any, accessibilityReportUrl?: string | null, accessibilityStatement?: string | null, contacts: Array<{ __typename?: 'Contact', contactId: any, contactType: ContactType, email: string }> } & { ' $fragmentName'?: 'PublisherFragmentFragment' };

export type ReferenceFragmentFragment = { __typename?: 'Reference', doi?: any | null, referenceId: any, referenceOrdinal: number, unstructuredCitation?: string | null, journalTitle?: string | null, articleTitle?: string | null, seriesTitle?: string | null, volumeTitle?: string | null, url?: string | null } & { ' $fragmentName'?: 'ReferenceFragmentFragment' };

export type SetFragmentFragment = { __typename?: 'Work', workId: any, workType: WorkType, workStatus: WorkStatus, updatedAt: any, imprintId: any, edition?: number | null, titles: Array<{ __typename?: 'Title', canonical: boolean, fullTitle: string, localeCode: LocaleCode, subtitle?: string | null, title: string, titleId: any }>, relations: Array<{ __typename?: 'WorkRelation', relationOrdinal: number, relatedWork: { __typename?: 'Work', coverUrl?: string | null } }> } & { ' $fragmentName'?: 'SetFragmentFragment' };

export type SubjectFragmentFragment = { __typename?: 'Subject', subjectId: any, subjectCode: string, subjectType: SubjectType, subjectOrdinal: number } & { ' $fragmentName'?: 'SubjectFragmentFragment' };

export type TitleFragmentFragment = { __typename?: 'Title', canonical: boolean, fullTitle: string, localeCode: LocaleCode, subtitle?: string | null, title: string, titleId: any } & { ' $fragmentName'?: 'TitleFragmentFragment' };

export type WorkFragmentFragment = { __typename?: 'Work', doi?: any | null, lccn?: string | null, oclc?: string | null, workId: any, bibliographyNote?: string | null, generalNote?: string | null, workType: WorkType, updatedAt: any, publicationDate?: any | null, withdrawnDate?: any | null, place?: string | null, reference?: string | null, imprintId: any, workStatus: WorkStatus, edition?: number | null, license?: string | null, copyrightHolder?: string | null, landingPage?: string | null, coverUrl?: string | null, pageCount?: number | null, pageBreakdown?: string | null, imageCount?: number | null, tableCount?: number | null, audioCount?: number | null, videoCount?: number | null, firstPage?: string | null, lastPage?: string | null, titles: Array<{ __typename?: 'Title', canonical: boolean, fullTitle: string, localeCode: LocaleCode, subtitle?: string | null, title: string, titleId: any }>, abstracts: Array<{ __typename?: 'Abstract', abstractId: any, abstractType: AbstractType, canonical: boolean, content: string, localeCode: LocaleCode }>, imprint: { __typename?: 'Imprint', imprintName: string, publisher: { __typename?: 'Publisher', publisherName: string } }, contributions: Array<{ __typename?: 'Contribution', fullName: string, lastName: string, firstName?: string | null, contributionId: any, contributorId: any, contributionType: ContributionType, mainContribution: boolean, contributionOrdinal: number, biographies: Array<{ __typename?: 'Biography', biographyId: any, canonical: boolean, content: string, localeCode: LocaleCode, contributionId: any }>, contributor: { __typename?: 'Contributor', orcid?: any | null, website?: string | null }, affiliations: Array<{ __typename?: 'Affiliation', position?: string | null, affiliationId: any, affiliationOrdinal: number, institution: { __typename?: 'Institution', ror?: any | null, institutionName: string, institutionId: any } }> }>, languages: Array<{ __typename?: 'Language', languageCode: LanguageCode, languageRelation: LanguageRelation, languageId: any }>, fundings: Array<{ __typename?: 'Funding', fundingId: any, grantNumber?: string | null, institutionId: any, program?: string | null, projectName?: string | null, projectShortname?: string | null, institution: { __typename?: 'Institution', institutionName: string, ror?: any | null } }>, publications: Array<{ __typename?: 'Publication', publicationId: any, isbn?: any | null, publicationType: PublicationType, updatedAt: any, accessibilityAdditionalStandard?: AccessibilityStandard | null, accessibilityException?: AccessibilityException | null, accessibilityReportUrl?: string | null, accessibilityStandard?: AccessibilityStandard | null, weightG?: number | null, weightOz?: number | null, widthMm?: number | null, widthIn?: number | null, heightMm?: number | null, heightIn?: number | null, depthMm?: number | null, depthIn?: number | null, work: { __typename?: 'Work', doi?: any | null, title: string, imprint: { __typename?: 'Imprint', publisher: { __typename?: 'Publisher', publisherName: string } } }, prices: Array<{ __typename?: 'Price', unitPrice: number, priceId: any, currencyCode: CurrencyCode }>, locations: Array<{ __typename?: 'Location', canonical: boolean, fullTextUrl?: string | null, landingPage?: string | null, locationPlatform: LocationPlatform, locationId: any }>, file?: { __typename?: 'File', cdnUrl: string } | null }>, references: Array<{ __typename?: 'Reference', doi?: any | null, referenceId: any, referenceOrdinal: number, journalTitle?: string | null, articleTitle?: string | null, seriesTitle?: string | null, volumeTitle?: string | null, unstructuredCitation?: string | null, url?: string | null }>, subjects: Array<{ __typename?: 'Subject', subjectId: any, subjectCode: string, subjectType: SubjectType, subjectOrdinal: number }>, issues: Array<{ __typename?: 'Issue', issueId: any, issueOrdinal: number, series: { __typename?: 'Series', seriesId: any, seriesName: string } }>, awards: Array<{ __typename?: 'Award', awardId: any, workId: any, title: string, url?: string | null, category?: string | null, role?: AwardRole | null, prizeStatement?: string | null, awardOrdinal: number }>, additionalResources: Array<{ __typename?: 'WorkResource', workResourceId: any, workId: any, title: string, description?: string | null, attribution?: string | null, resourceType: string, doi?: any | null, handle?: string | null, url?: string | null, resourceOrdinal: number, file?: { __typename?: 'File', cdnUrl: string } | null }>, bookReviews: Array<{ __typename?: 'BookReview', bookReviewId: any, workId: any, title?: string | null, authorName?: string | null, reviewerOrcid?: any | null, reviewerInstitutionId?: any | null, url?: string | null, doi?: any | null, reviewDate?: any | null, journalName?: string | null, journalVolume?: string | null, journalNumber?: string | null, journalIssn?: string | null, pageRange?: string | null, text?: string | null, reviewOrdinal: number, reviewerInstitution?: { __typename?: 'Institution', institutionId: any, institutionName: string, ror?: any | null } | null }>, endorsements: Array<{ __typename?: 'Endorsement', endorsementId: any, workId: any, authorName?: string | null, authorOrcid?: any | null, authorRole?: string | null, authorInstitutionId?: any | null, url?: string | null, text?: string | null, endorsementOrdinal: number, authorInstitution?: { __typename?: 'Institution', institutionId: any, institutionName: string, ror?: any | null } | null }>, featuredVideo?: { __typename?: 'WorkFeaturedVideo', workFeaturedVideoId: any, workId: any, title?: string | null, url?: string | null, width: number, height: number, file?: { __typename?: 'File', cdnUrl: string } | null } | null } & { ' $fragmentName'?: 'WorkFragmentFragment' };

export type InitFrontcoverFileUploadMutationVariables = Exact<{
  data: NewFrontcoverFileUpload;
}>;


export type InitFrontcoverFileUploadMutation = { __typename?: 'MutationRoot', initFrontcoverFileUpload: { __typename?: 'FileUploadResponse', fileUploadId: any, uploadUrl: string, expiresAt: any, uploadHeaders: Array<{ __typename?: 'UploadRequestHeader', name: string, value: string }> } };

export type InitPublicationFileUploadMutationVariables = Exact<{
  data: NewPublicationFileUpload;
}>;


export type InitPublicationFileUploadMutation = { __typename?: 'MutationRoot', initPublicationFileUpload: { __typename?: 'FileUploadResponse', fileUploadId: any, uploadUrl: string, expiresAt: any, uploadHeaders: Array<{ __typename?: 'UploadRequestHeader', name: string, value: string }> } };

export type InitWorkFeaturedVideoFileUploadMutationVariables = Exact<{
  data: NewWorkFeaturedVideoFileUpload;
}>;


export type InitWorkFeaturedVideoFileUploadMutation = { __typename?: 'MutationRoot', initWorkFeaturedVideoFileUpload: { __typename?: 'FileUploadResponse', fileUploadId: any, uploadUrl: string, expiresAt: any, uploadHeaders: Array<{ __typename?: 'UploadRequestHeader', name: string, value: string }> } };

export type InitAdditionalResourceFileUploadMutationVariables = Exact<{
  data: NewAdditionalResourceFileUpload;
}>;


export type InitAdditionalResourceFileUploadMutation = { __typename?: 'MutationRoot', initAdditionalResourceFileUpload: { __typename?: 'FileUploadResponse', fileUploadId: any, uploadUrl: string, expiresAt: any, uploadHeaders: Array<{ __typename?: 'UploadRequestHeader', name: string, value: string }> } };

export type CompleteFileUploadMutationVariables = Exact<{
  data: CompleteFileUpload;
}>;


export type CompleteFileUploadMutation = { __typename?: 'MutationRoot', completeFileUpload: { __typename?: 'File', fileId: any, fileType: FileType, mimeType: string, bytes: number, objectKey: string, cdnUrl: string } };

export const AbstractFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AbstractFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Abstract"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}}]} as unknown as DocumentNode<AbstractFragmentFragment, unknown>;
export const WorkResourceFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkResourceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkResource"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<WorkResourceFragmentFragment, unknown>;
export const AwardFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AwardFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Award"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}}]} as unknown as DocumentNode<AwardFragmentFragment, unknown>;
export const BookReviewFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookReviewFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookReview"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}}]} as unknown as DocumentNode<BookReviewFragmentFragment, unknown>;
export const BiographyFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BiographyFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Biography"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}}]} as unknown as DocumentNode<BiographyFragmentFragment, unknown>;
export const ContributorFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}}]} as unknown as DocumentNode<ContributorFragmentFragment, unknown>;
export const AffiliationFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AffiliationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Affiliation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]} as unknown as DocumentNode<AffiliationFragmentFragment, unknown>;
export const ContributionFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BiographyFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributorFragment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AffiliationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BiographyFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Biography"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AffiliationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Affiliation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]} as unknown as DocumentNode<ContributionFragmentFragment, unknown>;
export const EndorsementFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EndorsementFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Endorsement"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}}]} as unknown as DocumentNode<EndorsementFragmentFragment, unknown>;
export const WorkFeaturedVideoFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFeaturedVideoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkFeaturedVideo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<WorkFeaturedVideoFragmentFragment, unknown>;
export const FundingFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FundingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Funding"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}}]} as unknown as DocumentNode<FundingFragmentFragment, unknown>;
export const LanguageFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LanguageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Language"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageId"}},{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}}]}}]} as unknown as DocumentNode<LanguageFragmentFragment, unknown>;
export const LocationFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LocationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Location"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}}]} as unknown as DocumentNode<LocationFragmentFragment, unknown>;
export const PriceFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PriceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Price"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}}]} as unknown as DocumentNode<PriceFragmentFragment, unknown>;
export const PublicationFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PublicationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Publication"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<PublicationFragmentFragment, unknown>;
export const PublisherFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PublisherFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Publisher"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherId"}},{"kind":"Field","name":{"kind":"Name","value":"publisherName"}},{"kind":"Field","name":{"kind":"Name","value":"publisherShortname"}},{"kind":"Field","name":{"kind":"Name","value":"publisherUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStatement"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<PublisherFragmentFragment, unknown>;
export const ReferenceFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<ReferenceFragmentFragment, unknown>;
export const SetFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SetFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"HAS_PART"}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"WORK_RELATION_ID"}},{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"DESC"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]}}]} as unknown as DocumentNode<SetFragmentFragment, unknown>;
export const SubjectFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubjectFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Subject"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}}]} as unknown as DocumentNode<SubjectFragmentFragment, unknown>;
export const TitleFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TitleFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Title"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}}]} as unknown as DocumentNode<TitleFragmentFragment, unknown>;
export const WorkFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<WorkFragmentFragment, unknown>;
export const CreateAbstractDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAbstract"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewAbstract"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAbstract"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AbstractFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AbstractFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Abstract"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}}]} as unknown as DocumentNode<CreateAbstractMutation, CreateAbstractMutationVariables>;
export const UpdateAbstractDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAbstract"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchAbstract"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAbstract"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AbstractFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AbstractFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Abstract"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}}]} as unknown as DocumentNode<UpdateAbstractMutation, UpdateAbstractMutationVariables>;
export const DeleteAbstractDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAbstract"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"abstractId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAbstract"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"abstractId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"abstractId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}}]}}]}}]} as unknown as DocumentNode<DeleteAbstractMutation, DeleteAbstractMutationVariables>;
export const CreateAdditionalResourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAdditionalResource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewAdditionalResource"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAdditionalResource"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkResourceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkResourceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkResource"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<CreateAdditionalResourceMutation, CreateAdditionalResourceMutationVariables>;
export const UpdateAdditionalResourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAdditionalResource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchAdditionalResource"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAdditionalResource"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkResourceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkResourceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkResource"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<UpdateAdditionalResourceMutation, UpdateAdditionalResourceMutationVariables>;
export const DeleteAdditionalResourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAdditionalResource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"additionalResourceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAdditionalResource"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"additionalResourceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"additionalResourceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkResourceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkResourceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkResource"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<DeleteAdditionalResourceMutation, DeleteAdditionalResourceMutationVariables>;
export const MoveAdditionalResourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveAdditionalResource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"additionalResourceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveAdditionalResource"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"additionalResourceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"additionalResourceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkResourceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkResourceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkResource"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<MoveAdditionalResourceMutation, MoveAdditionalResourceMutationVariables>;
export const CreateAffiliationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAffiliation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewAffiliation"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAffiliation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AffiliationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AffiliationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Affiliation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]} as unknown as DocumentNode<CreateAffiliationMutation, CreateAffiliationMutationVariables>;
export const UpdateAffiliationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAffiliation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchAffiliation"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAffiliation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AffiliationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AffiliationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Affiliation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]} as unknown as DocumentNode<UpdateAffiliationMutation, UpdateAffiliationMutationVariables>;
export const DeleteAffiliationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAffiliation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"affiliationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAffiliation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"affiliationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"affiliationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}}]}}]}}]} as unknown as DocumentNode<DeleteAffiliationMutation, DeleteAffiliationMutationVariables>;
export const MoveAffiliationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveAffiliation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"affiliationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveAffiliation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"affiliationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"affiliationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AffiliationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AffiliationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Affiliation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]} as unknown as DocumentNode<MoveAffiliationMutation, MoveAffiliationMutationVariables>;
export const CreateAwardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAward"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewAward"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAward"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AwardFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AwardFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Award"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}}]} as unknown as DocumentNode<CreateAwardMutation, CreateAwardMutationVariables>;
export const UpdateAwardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAward"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchAward"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAward"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AwardFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AwardFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Award"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}}]} as unknown as DocumentNode<UpdateAwardMutation, UpdateAwardMutationVariables>;
export const DeleteAwardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAward"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"awardId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAward"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"awardId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"awardId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AwardFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AwardFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Award"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}}]} as unknown as DocumentNode<DeleteAwardMutation, DeleteAwardMutationVariables>;
export const MoveAwardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveAward"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"awardId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveAward"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"awardId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"awardId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AwardFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AwardFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Award"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}}]} as unknown as DocumentNode<MoveAwardMutation, MoveAwardMutationVariables>;
export const CreateBookReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBookReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewBookReview"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBookReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookReviewFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookReviewFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookReview"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}}]} as unknown as DocumentNode<CreateBookReviewMutation, CreateBookReviewMutationVariables>;
export const UpdateBookReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBookReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchBookReview"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBookReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookReviewFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookReviewFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookReview"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}}]} as unknown as DocumentNode<UpdateBookReviewMutation, UpdateBookReviewMutationVariables>;
export const DeleteBookReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBookReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bookReviewId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBookReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bookReviewId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bookReviewId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookReviewFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookReviewFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookReview"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}}]} as unknown as DocumentNode<DeleteBookReviewMutation, DeleteBookReviewMutationVariables>;
export const MoveBookReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveBookReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bookReviewId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveBookReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bookReviewId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bookReviewId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookReviewFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookReviewFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BookReview"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}}]} as unknown as DocumentNode<MoveBookReviewMutation, MoveBookReviewMutationVariables>;
export const GetBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"direction"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Direction"}},"defaultValue":{"kind":"EnumValue","value":"ASC"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workStatus"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"field"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkField"}},"defaultValue":{"kind":"EnumValue","value":"UPDATED_AT_WITH_RELATIONS"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"updatedAtWithRelations"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TimeExpression"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"books"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"Variable","name":{"kind":"Name","value":"direction"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"Variable","name":{"kind":"Name","value":"field"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"workStatus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workStatus"}}},{"kind":"Argument","name":{"kind":"Name","value":"updatedAtWithRelations"},"value":{"kind":"Variable","name":{"kind":"Name","value":"updatedAtWithRelations"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetBooksQuery, GetBooksQueryVariables>;
export const GetBooksCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBooksCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workStatus"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"updatedAtWithRelations"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TimeExpression"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publicationDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TimeExpression"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workStatuses"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkStatus"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"workStatus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workStatus"}}},{"kind":"Argument","name":{"kind":"Name","value":"updatedAtWithRelations"},"value":{"kind":"Variable","name":{"kind":"Name","value":"updatedAtWithRelations"}}},{"kind":"Argument","name":{"kind":"Name","value":"publicationDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publicationDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"workStatuses"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workStatuses"}}}]}]}}]} as unknown as DocumentNode<GetBooksCountQuery, GetBooksCountQueryVariables>;
export const CreateContributionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContribution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewContribution"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContribution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}}]}}]} as unknown as DocumentNode<CreateContributionMutation, CreateContributionMutationVariables>;
export const DeleteContributionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteContribution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contributionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteContribution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contributionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contributionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}}]}}]}}]} as unknown as DocumentNode<DeleteContributionMutation, DeleteContributionMutationVariables>;
export const UpdateContributionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContribution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchContribution"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContribution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}}]}}]}}]} as unknown as DocumentNode<UpdateContributionMutation, UpdateContributionMutationVariables>;
export const MoveContributionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveContribution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contributionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveContribution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contributionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contributionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}}]}}]}}]} as unknown as DocumentNode<MoveContributionMutation, MoveContributionMutationVariables>;
export const CreateBiographyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBiography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewBiography"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBiography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BiographyFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BiographyFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Biography"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}}]} as unknown as DocumentNode<CreateBiographyMutation, CreateBiographyMutationVariables>;
export const UpdateBiographyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBiography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchBiography"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBiography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BiographyFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BiographyFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Biography"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}}]} as unknown as DocumentNode<UpdateBiographyMutation, UpdateBiographyMutationVariables>;
export const DeleteBiographyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBiography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"biographyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBiography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"biographyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"biographyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BiographyFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BiographyFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Biography"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}}]} as unknown as DocumentNode<DeleteBiographyMutation, DeleteBiographyMutationVariables>;
export const GetContributionBiographiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContributionBiographies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contributionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contribution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contributionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contributionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BiographyFragment"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BiographyFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Biography"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}}]} as unknown as DocumentNode<GetContributionBiographiesQuery, GetContributionBiographiesQueryVariables>;
export const GetContributorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContributors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"UPDATED_AT"}},{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"DESC"}}]}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"1"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetContributorsQuery, GetContributorsQueryVariables>;
export const GetLinkedPublishersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLinkedPublishers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contributorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contributorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contributorId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherId"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetLinkedPublishersQuery, GetLinkedPublishersQueryVariables>;
export const CreateContributorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContributor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewContributor"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContributor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributorFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}}]} as unknown as DocumentNode<CreateContributorMutation, CreateContributorMutationVariables>;
export const UpdateContributorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContributor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchContributor"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContributor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributorFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}}]} as unknown as DocumentNode<UpdateContributorMutation, UpdateContributorMutationVariables>;
export const GetContributorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContributor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contributorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contributorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contributorId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributorFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributorFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}}]} as unknown as DocumentNode<GetContributorQuery, GetContributorQueryVariables>;
export const CreateEndorsementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateEndorsement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewEndorsement"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createEndorsement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}},{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}}]}}]} as unknown as DocumentNode<CreateEndorsementMutation, CreateEndorsementMutationVariables>;
export const UpdateEndorsementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateEndorsement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchEndorsement"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateEndorsement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}},{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}}]}}]} as unknown as DocumentNode<UpdateEndorsementMutation, UpdateEndorsementMutationVariables>;
export const DeleteEndorsementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteEndorsement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endorsementId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteEndorsement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"endorsementId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endorsementId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}}]}}]} as unknown as DocumentNode<DeleteEndorsementMutation, DeleteEndorsementMutationVariables>;
export const MoveEndorsementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveEndorsement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endorsementId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveEndorsement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"endorsementId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endorsementId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}}]}}]} as unknown as DocumentNode<MoveEndorsementMutation, MoveEndorsementMutationVariables>;
export const CreateWorkFeaturedVideoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkFeaturedVideo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewWorkFeaturedVideo"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkFeaturedVideo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFeaturedVideoFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFeaturedVideoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkFeaturedVideo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<CreateWorkFeaturedVideoMutation, CreateWorkFeaturedVideoMutationVariables>;
export const UpdateWorkFeaturedVideoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkFeaturedVideo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchWorkFeaturedVideo"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkFeaturedVideo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFeaturedVideoFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFeaturedVideoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkFeaturedVideo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<UpdateWorkFeaturedVideoMutation, UpdateWorkFeaturedVideoMutationVariables>;
export const DeleteWorkFeaturedVideoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkFeaturedVideo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workFeaturedVideoId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkFeaturedVideo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workFeaturedVideoId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workFeaturedVideoId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFeaturedVideoFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFeaturedVideoFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkFeaturedVideo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<DeleteWorkFeaturedVideoMutation, DeleteWorkFeaturedVideoMutationVariables>;
export const CreateFundingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateFunding"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewFunding"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createFunding"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FundingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FundingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Funding"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}}]} as unknown as DocumentNode<CreateFundingMutation, CreateFundingMutationVariables>;
export const UpdateFundingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateFunding"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchFunding"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateFunding"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FundingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FundingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Funding"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}}]} as unknown as DocumentNode<UpdateFundingMutation, UpdateFundingMutationVariables>;
export const DeleteFundingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteFunding"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fundingId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteFunding"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"fundingId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fundingId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FundingFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FundingFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Funding"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}}]} as unknown as DocumentNode<DeleteFundingMutation, DeleteFundingMutationVariables>;
export const CreateImprintDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateImprint"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewImprint"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createImprint"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintId"}}]}}]}}]} as unknown as DocumentNode<CreateImprintMutation, CreateImprintMutationVariables>;
export const UpdateImprintDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateImprint"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchImprint"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateImprint"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"imprintUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"crossmarkDoi"}},{"kind":"Field","name":{"kind":"Name","value":"defaultCurrency"}},{"kind":"Field","name":{"kind":"Name","value":"defaultLocale"}},{"kind":"Field","name":{"kind":"Name","value":"defaultPlace"}},{"kind":"Field","name":{"kind":"Name","value":"s3Bucket"}},{"kind":"Field","name":{"kind":"Name","value":"cdnDomain"}},{"kind":"Field","name":{"kind":"Name","value":"cloudfrontDistId"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateImprintMutation, UpdateImprintMutationVariables>;
export const DeleteImprintDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteImprint"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"imprintId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteImprint"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"imprintId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"imprintId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintId"}}]}}]}}]} as unknown as DocumentNode<DeleteImprintMutation, DeleteImprintMutationVariables>;
export const GetImprintsCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetImprintsCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}]}]}}]} as unknown as DocumentNode<GetImprintsCountQuery, GetImprintsCountQueryVariables>;
export const GetImprintsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetImprints"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprints"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"imprintUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"crossmarkDoi"}},{"kind":"Field","name":{"kind":"Name","value":"defaultCurrency"}},{"kind":"Field","name":{"kind":"Name","value":"defaultLocale"}},{"kind":"Field","name":{"kind":"Name","value":"defaultPlace"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}}]} as unknown as DocumentNode<GetImprintsQuery, GetImprintsQueryVariables>;
export const GetImprintsAdminDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetImprintsAdmin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprints"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"imprintUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"crossmarkDoi"}},{"kind":"Field","name":{"kind":"Name","value":"defaultCurrency"}},{"kind":"Field","name":{"kind":"Name","value":"defaultLocale"}},{"kind":"Field","name":{"kind":"Name","value":"defaultPlace"}},{"kind":"Field","name":{"kind":"Name","value":"s3Bucket"}},{"kind":"Field","name":{"kind":"Name","value":"cdnDomain"}},{"kind":"Field","name":{"kind":"Name","value":"cloudfrontDistId"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}}]} as unknown as DocumentNode<GetImprintsAdminQuery, GetImprintsAdminQueryVariables>;
export const GetInstitutionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInstitutions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionDoi"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"countryCode"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetInstitutionsQuery, GetInstitutionsQueryVariables>;
export const GetInstitutionsCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInstitutionsCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}]}]}}]} as unknown as DocumentNode<GetInstitutionsCountQuery, GetInstitutionsCountQueryVariables>;
export const CreateLanguageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLanguage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewLanguage"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLanguage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LanguageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LanguageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Language"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageId"}},{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}}]}}]} as unknown as DocumentNode<CreateLanguageMutation, CreateLanguageMutationVariables>;
export const UpdateLanguageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLanguage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchLanguage"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLanguage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LanguageFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LanguageFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Language"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageId"}},{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}}]}}]} as unknown as DocumentNode<UpdateLanguageMutation, UpdateLanguageMutationVariables>;
export const DeleteLanguageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteLanguage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"languageId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteLanguage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"languageId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"languageId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}}]}}]} as unknown as DocumentNode<DeleteLanguageMutation, DeleteLanguageMutationVariables>;
export const CreateLocationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLocation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewLocation"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLocation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LocationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Location"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}}]} as unknown as DocumentNode<CreateLocationMutation, CreateLocationMutationVariables>;
export const UpdateLocationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLocation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchLocation"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLocation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocationFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LocationFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Location"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}}]} as unknown as DocumentNode<UpdateLocationMutation, UpdateLocationMutationVariables>;
export const DeleteLocationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteLocation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteLocation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}}]}}]} as unknown as DocumentNode<DeleteLocationMutation, DeleteLocationMutationVariables>;
export const CreatePriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewPrice"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPrice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PriceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PriceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Price"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}}]} as unknown as DocumentNode<CreatePriceMutation, CreatePriceMutationVariables>;
export const DeletePriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"priceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePrice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"priceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"priceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"priceId"}}]}}]}}]} as unknown as DocumentNode<DeletePriceMutation, DeletePriceMutationVariables>;
export const UpdatePriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchPrice"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePrice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PriceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PriceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Price"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}}]} as unknown as DocumentNode<UpdatePriceMutation, UpdatePriceMutationVariables>;
export const GetPublicationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}}]}}]}}]} as unknown as DocumentNode<GetPublicationsQuery, GetPublicationsQueryVariables>;
export const CreatePublicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePublication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewPublication"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPublication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}}]}}]}}]} as unknown as DocumentNode<CreatePublicationMutation, CreatePublicationMutationVariables>;
export const UpdatePublicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePublication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchPublication"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePublication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}}]}}]}}]} as unknown as DocumentNode<UpdatePublicationMutation, UpdatePublicationMutationVariables>;
export const DeletePublicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePublication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publicationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePublication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publicationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publicationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}}]}}]}}]} as unknown as DocumentNode<DeletePublicationMutation, DeletePublicationMutationVariables>;
export const CreateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewContact"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<CreateContactMutation, CreateContactMutationVariables>;
export const UpdateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchContact"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<UpdateContactMutation, UpdateContactMutationVariables>;
export const DeleteContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}}]}}]}}]} as unknown as DocumentNode<DeleteContactMutation, DeleteContactMutationVariables>;
export const CreatePublisherDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePublisher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewPublisher"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPublisher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherId"}}]}}]}}]} as unknown as DocumentNode<CreatePublisherMutation, CreatePublisherMutationVariables>;
export const GetPublishersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublishers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PublisherFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Publisher"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherId"}},{"kind":"Field","name":{"kind":"Name","value":"publisherName"}},{"kind":"Field","name":{"kind":"Name","value":"publisherShortname"}},{"kind":"Field","name":{"kind":"Name","value":"publisherUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStatement"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<GetPublishersQuery, GetPublishersQueryVariables>;
export const GetPublisherDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublisher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publisherId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publisherId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publisherId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PublisherFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Publisher"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherId"}},{"kind":"Field","name":{"kind":"Name","value":"publisherName"}},{"kind":"Field","name":{"kind":"Name","value":"publisherShortname"}},{"kind":"Field","name":{"kind":"Name","value":"publisherUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStatement"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<GetPublisherQuery, GetPublisherQueryVariables>;
export const GetPublisherAdminDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublisherAdmin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publisherId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publisherId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publisherId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFragment"}},{"kind":"Field","name":{"kind":"Name","value":"zitadelId"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PublisherFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Publisher"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherId"}},{"kind":"Field","name":{"kind":"Name","value":"publisherName"}},{"kind":"Field","name":{"kind":"Name","value":"publisherShortname"}},{"kind":"Field","name":{"kind":"Name","value":"publisherUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStatement"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<GetPublisherAdminQuery, GetPublisherAdminQueryVariables>;
export const UpdatePublisherDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePublisher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchPublisher"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePublisher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PublisherFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Publisher"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherId"}},{"kind":"Field","name":{"kind":"Name","value":"publisherName"}},{"kind":"Field","name":{"kind":"Name","value":"publisherShortname"}},{"kind":"Field","name":{"kind":"Name","value":"publisherUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStatement"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactType"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<UpdatePublisherMutation, UpdatePublisherMutationVariables>;
export const CreateReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewReference"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReferenceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<CreateReferenceMutation, CreateReferenceMutationVariables>;
export const UpdateReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchReference"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReferenceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<UpdateReferenceMutation, UpdateReferenceMutationVariables>;
export const DeleteReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"referenceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"referenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"referenceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReferenceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<DeleteReferenceMutation, DeleteReferenceMutationVariables>;
export const MoveReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"referenceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"referenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"referenceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReferenceFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReferenceFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Reference"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<MoveReferenceMutation, MoveReferenceMutationVariables>;
export const CreateSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewSeries"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}}]}}]}}]} as unknown as DocumentNode<CreateSeriesMutation, CreateSeriesMutationVariables>;
export const UpdateSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchSeries"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}}]}}]}}]} as unknown as DocumentNode<UpdateSeriesMutation, UpdateSeriesMutationVariables>;
export const DeleteSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"seriesId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"seriesId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"seriesId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}}]}}]}}]} as unknown as DocumentNode<DeleteSeriesMutation, DeleteSeriesMutationVariables>;
export const CreateIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewIssue"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}}]}}]}}]} as unknown as DocumentNode<CreateIssueMutation, CreateIssueMutationVariables>;
export const UpdateIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchIssue"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}}]}}]}}]} as unknown as DocumentNode<UpdateIssueMutation, UpdateIssueMutationVariables>;
export const DeleteIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}}]}}]}}]} as unknown as DocumentNode<DeleteIssueMutation, DeleteIssueMutationVariables>;
export const MoveIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}}]}}]}}]} as unknown as DocumentNode<MoveIssueMutation, MoveIssueMutationVariables>;
export const GetSeriesesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSerieses"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"direction"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Direction"}},"defaultValue":{"kind":"EnumValue","value":"ASC"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"field"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SeriesField"}},"defaultValue":{"kind":"EnumValue","value":"UPDATED_AT"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"seriesTypes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SeriesType"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serieses"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"Variable","name":{"kind":"Name","value":"direction"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"Variable","name":{"kind":"Name","value":"field"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"seriesTypes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"seriesTypes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}},{"kind":"Field","name":{"kind":"Name","value":"seriesType"}},{"kind":"Field","name":{"kind":"Name","value":"issnPrint"}},{"kind":"Field","name":{"kind":"Name","value":"issnDigital"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"seriesUrl"}},{"kind":"Field","name":{"kind":"Name","value":"seriesDescription"}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetSeriesesQuery, GetSeriesesQueryVariables>;
export const GetSeriesCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSeriesCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}]}]}}]} as unknown as DocumentNode<GetSeriesCountQuery, GetSeriesCountQueryVariables>;
export const GetSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"seriesId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"series"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"seriesId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"seriesId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}},{"kind":"Field","name":{"kind":"Name","value":"seriesType"}},{"kind":"Field","name":{"kind":"Name","value":"issnPrint"}},{"kind":"Field","name":{"kind":"Name","value":"issnDigital"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"seriesUrl"}},{"kind":"Field","name":{"kind":"Name","value":"seriesDescription"}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetSeriesQuery, GetSeriesQueryVariables>;
export const CreateSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewWork"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWork"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SetFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SetFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"HAS_PART"}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"WORK_RELATION_ID"}},{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"DESC"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]}}]} as unknown as DocumentNode<CreateSetMutation, CreateSetMutationVariables>;
export const UpdateSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchWork"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWork"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SetFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SetFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"HAS_PART"}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"WORK_RELATION_ID"}},{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"DESC"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateSetMutation, UpdateSetMutationVariables>;
export const DeleteWorkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWork"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWork"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}}]}}]}}]} as unknown as DocumentNode<DeleteWorkMutation, DeleteWorkMutationVariables>;
export const MoveWorkRelationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveWorkRelation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workRelationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveWorkRelation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workRelationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workRelationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}}]}}]}}]} as unknown as DocumentNode<MoveWorkRelationMutation, MoveWorkRelationMutationVariables>;
export const AddBookToSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddBookToSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewWorkRelation"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkRelation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}}]}}]}}]} as unknown as DocumentNode<AddBookToSetMutation, AddBookToSetMutationVariables>;
export const DeleteBookFromSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBookFromSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workRelationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkRelation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workRelationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workRelationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}}]}}]}}]} as unknown as DocumentNode<DeleteBookFromSetMutation, DeleteBookFromSetMutationVariables>;
export const GetSetsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSets"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"direction"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Direction"}},"defaultValue":{"kind":"EnumValue","value":"ASC"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"field"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkField"}},"defaultValue":{"kind":"EnumValue","value":"UPDATED_AT_WITH_RELATIONS"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"works"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"Variable","name":{"kind":"Name","value":"direction"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"Variable","name":{"kind":"Name","value":"field"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"workTypes"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"BOOK_SET"}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SetFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SetFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"HAS_PART"}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"WORK_RELATION_ID"}},{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"DESC"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetSetsQuery, GetSetsQueryVariables>;
export const GetSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SetFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SetFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"HAS_PART"}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"WORK_RELATION_ID"}},{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"DESC"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetSetQuery, GetSetQueryVariables>;
export const GetSetsCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSetsCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"workTypes"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"BOOK_SET"}]}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}]}]}}]} as unknown as DocumentNode<GetSetsCountQuery, GetSetsCountQueryVariables>;
export const GetBookSetWorksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBookSetWorks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"setId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"PLAIN_TEXT"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"setId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"HAS_PART"}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"WORK_RELATION_ID"}},{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"DESC"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWorkId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetBookSetWorksQuery, GetBookSetWorksQueryVariables>;
export const CreateSubjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewSubject"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubjectFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubjectFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Subject"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}}]} as unknown as DocumentNode<CreateSubjectMutation, CreateSubjectMutationVariables>;
export const UpdateSubjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchSubject"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubjectFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubjectFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Subject"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}}]} as unknown as DocumentNode<UpdateSubjectMutation, UpdateSubjectMutationVariables>;
export const DeleteSubjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubjectFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubjectFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Subject"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}}]} as unknown as DocumentNode<DeleteSubjectMutation, DeleteSubjectMutationVariables>;
export const MoveSubjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newOrdinal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newOrdinal"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}}]}}]}}]} as unknown as DocumentNode<MoveSubjectMutation, MoveSubjectMutationVariables>;
export const CreateTitleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTitle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewTitle"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTitle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TitleFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TitleFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Title"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}}]} as unknown as DocumentNode<CreateTitleMutation, CreateTitleMutationVariables>;
export const UpdateTitleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTitle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchTitle"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTitle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TitleFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TitleFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Title"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}}]} as unknown as DocumentNode<UpdateTitleMutation, UpdateTitleMutationVariables>;
export const DeleteTitleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTitle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"titleId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTitle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"titleId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"titleId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}}]}}]} as unknown as DocumentNode<DeleteTitleMutation, DeleteTitleMutationVariables>;
export const GetUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"isSuperuser"}},{"kind":"Field","name":{"kind":"Name","value":"publisherContexts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}},{"kind":"Field","name":{"kind":"Name","value":"publisherId"}},{"kind":"Field","name":{"kind":"Name","value":"imprints"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"imprintUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"crossmarkDoi"}},{"kind":"Field","name":{"kind":"Name","value":"defaultCurrency"}},{"kind":"Field","name":{"kind":"Name","value":"defaultLocale"}},{"kind":"Field","name":{"kind":"Name","value":"defaultPlace"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"workLifecycle"}},{"kind":"Field","name":{"kind":"Name","value":"cdnWrite"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetUserQuery, GetUserQueryVariables>;
export const CreateWorkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWork"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewWork"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWork"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<CreateWorkMutation, CreateWorkMutationVariables>;
export const GetWorksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"direction"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Direction"}},"defaultValue":{"kind":"EnumValue","value":"ASC"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"field"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkField"}},"defaultValue":{"kind":"EnumValue","value":"UPDATED_AT_WITH_RELATIONS"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workStatus"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workTypes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkType"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"works"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"Variable","name":{"kind":"Name","value":"direction"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"Variable","name":{"kind":"Name","value":"field"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"workStatus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workStatus"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"workTypes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workTypes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorksQuery, GetWorksQueryVariables>;
export const GetWorkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWork"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorkQuery, GetWorkQueryVariables>;
export const UpdateWorkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWork"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PatchWork"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWork"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateWorkMutation, UpdateWorkMutationVariables>;
export const GetWorksCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorksCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workStatus"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workTypes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkType"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"workStatus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workStatus"}}},{"kind":"Argument","name":{"kind":"Name","value":"workTypes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workTypes"}}}]}]}}]} as unknown as DocumentNode<GetWorksCountQuery, GetWorksCountQueryVariables>;
export const GetWorkChaptersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkChapters"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"HAS_CHILD"}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"ASC"}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"RELATION_ORDINAL"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorkChaptersQuery, GetWorkChaptersQueryVariables>;
export const GetWorkTranslationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkTranslations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"HAS_TRANSLATION"}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"ASC"}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"RELATION_ORDINAL"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorkTranslationsQuery, GetWorkTranslationsQueryVariables>;
export const GetWorkEditionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkEditions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"IS_REPLACED_BY"}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"ASC"}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"RELATION_ORDINAL"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorkEditionsQuery, GetWorkEditionsQueryVariables>;
export const GetWorkPrevEditionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkPrevEditions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"REPLACES"}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"ASC"}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"RELATION_ORDINAL"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetWorkPrevEditionsQuery, GetWorkPrevEditionsQueryVariables>;
export const GetTranslatedWorksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTranslatedWorks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkupFormat"}},"defaultValue":{"kind":"EnumValue","value":"JATS_XML"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"IS_TRANSLATION_OF"}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"ASC"}},{"kind":"ObjectField","name":{"kind":"Name","value":"field"},"value":{"kind":"EnumValue","value":"RELATION_ORDINAL"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkFragment"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Work"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"lccn"}},{"kind":"Field","name":{"kind":"Name","value":"oclc"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"abstracts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"abstractId"}},{"kind":"Field","name":{"kind":"Name","value":"abstractType"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bibliographyNote"}},{"kind":"Field","name":{"kind":"Name","value":"generalNote"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publicationDate"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnDate"}},{"kind":"Field","name":{"kind":"Name","value":"place"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"workStatus"}},{"kind":"Field","name":{"kind":"Name","value":"edition"}},{"kind":"Field","name":{"kind":"Name","value":"license"}},{"kind":"Field","name":{"kind":"Name","value":"copyrightHolder"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pageCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageBreakdown"}},{"kind":"Field","name":{"kind":"Name","value":"imageCount"}},{"kind":"Field","name":{"kind":"Name","value":"tableCount"}},{"kind":"Field","name":{"kind":"Name","value":"audioCount"}},{"kind":"Field","name":{"kind":"Name","value":"videoCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstPage"}},{"kind":"Field","name":{"kind":"Name","value":"lastPage"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}},{"kind":"Field","name":{"kind":"Name","value":"contributionType"}},{"kind":"Field","name":{"kind":"Name","value":"mainContribution"}},{"kind":"Field","name":{"kind":"Name","value":"contributionOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"biographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"markupFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"biographyId"}},{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"contributionId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"website"}}]}},{"kind":"Field","name":{"kind":"Name","value":"affiliations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationId"}},{"kind":"Field","name":{"kind":"Name","value":"affiliationOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageCode"}},{"kind":"Field","name":{"kind":"Name","value":"languageRelation"}},{"kind":"Field","name":{"kind":"Name","value":"languageId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fundings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fundingId"}},{"kind":"Field","name":{"kind":"Name","value":"grantNumber"}},{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"program"}},{"kind":"Field","name":{"kind":"Name","value":"projectName"}},{"kind":"Field","name":{"kind":"Name","value":"projectShortname"}},{"kind":"Field","name":{"kind":"Name","value":"institution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","alias":{"kind":"Name","value":"weightG"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"G"}}]},{"kind":"Field","alias":{"kind":"Name","value":"weightOz"},"name":{"kind":"Name","value":"weight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"OZ"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthMm"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"widthIn"},"name":{"kind":"Name","value":"width"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightMm"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"heightIn"},"name":{"kind":"Name","value":"height"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthMm"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"MM"}}]},{"kind":"Field","alias":{"kind":"Name","value":"depthIn"},"name":{"kind":"Name","value":"depth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"units"},"value":{"kind":"EnumValue","value":"IN"}}]},{"kind":"Field","name":{"kind":"Name","value":"accessibilityAdditionalStandard"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityException"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityReportUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessibilityStandard"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"priceId"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTextUrl"}},{"kind":"Field","name":{"kind":"Name","value":"landingPage"}},{"kind":"Field","name":{"kind":"Name","value":"locationPlatform"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"referenceId"}},{"kind":"Field","name":{"kind":"Name","value":"referenceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"journalTitle"}},{"kind":"Field","name":{"kind":"Name","value":"articleTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seriesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"volumeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"unstructuredCitation"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectCode"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"awards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"awardId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"prizeStatement"}},{"kind":"Field","name":{"kind":"Name","value":"awardOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"additionalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workResourceId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"}},{"kind":"Field","name":{"kind":"Name","value":"resourceType"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"handle"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"resourceOrdinal"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"bookReviews"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookReviewId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"reviewerInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"reviewDate"}},{"kind":"Field","name":{"kind":"Name","value":"journalName"}},{"kind":"Field","name":{"kind":"Name","value":"journalVolume"}},{"kind":"Field","name":{"kind":"Name","value":"journalNumber"}},{"kind":"Field","name":{"kind":"Name","value":"journalIssn"}},{"kind":"Field","name":{"kind":"Name","value":"pageRange"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"reviewOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endorsements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endorsementId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorOrcid"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitutionId"}},{"kind":"Field","name":{"kind":"Name","value":"authorInstitution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}}]}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"endorsementOrdinal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"featuredVideo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workFeaturedVideoId"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetTranslatedWorksQuery, GetTranslatedWorksQueryVariables>;
export const CreateWorkRelationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkRelation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewWorkRelation"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkRelation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}}]}}]}}]} as unknown as DocumentNode<CreateWorkRelationMutation, CreateWorkRelationMutationVariables>;
export const GetWorkSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"work"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"relationTypes"},"value":{"kind":"EnumValue","value":"IS_PART_OF"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workRelationId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedWork"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"titles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"markupFormat"},"value":{"kind":"EnumValue","value":"PLAIN_TEXT"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TitleFragment"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TitleFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Title"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canonical"}},{"kind":"Field","name":{"kind":"Name","value":"fullTitle"}},{"kind":"Field","name":{"kind":"Name","value":"localeCode"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titleId"}}]}}]} as unknown as DocumentNode<GetWorkSetQuery, GetWorkSetQueryVariables>;
export const InitFrontcoverFileUploadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InitFrontcoverFileUpload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewFrontcoverFileUpload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"initFrontcoverFileUpload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fileUploadId"}},{"kind":"Field","name":{"kind":"Name","value":"uploadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"uploadHeaders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<InitFrontcoverFileUploadMutation, InitFrontcoverFileUploadMutationVariables>;
export const InitPublicationFileUploadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InitPublicationFileUpload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewPublicationFileUpload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"initPublicationFileUpload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fileUploadId"}},{"kind":"Field","name":{"kind":"Name","value":"uploadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"uploadHeaders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<InitPublicationFileUploadMutation, InitPublicationFileUploadMutationVariables>;
export const InitWorkFeaturedVideoFileUploadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InitWorkFeaturedVideoFileUpload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewWorkFeaturedVideoFileUpload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"initWorkFeaturedVideoFileUpload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fileUploadId"}},{"kind":"Field","name":{"kind":"Name","value":"uploadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"uploadHeaders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<InitWorkFeaturedVideoFileUploadMutation, InitWorkFeaturedVideoFileUploadMutationVariables>;
export const InitAdditionalResourceFileUploadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InitAdditionalResourceFileUpload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NewAdditionalResourceFileUpload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"initAdditionalResourceFileUpload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fileUploadId"}},{"kind":"Field","name":{"kind":"Name","value":"uploadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"uploadHeaders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<InitAdditionalResourceFileUploadMutation, InitAdditionalResourceFileUploadMutationVariables>;
export const CompleteFileUploadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompleteFileUpload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompleteFileUpload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeFileUpload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fileId"}},{"kind":"Field","name":{"kind":"Name","value":"fileType"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"bytes"}},{"kind":"Field","name":{"kind":"Name","value":"objectKey"}},{"kind":"Field","name":{"kind":"Name","value":"cdnUrl"}}]}}]}}]} as unknown as DocumentNode<CompleteFileUploadMutation, CompleteFileUploadMutationVariables>;