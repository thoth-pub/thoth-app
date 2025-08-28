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

/** A person's involvement in the production of a written text. */
export type Contribution = {
  __typename?: 'Contribution';
  /** Get affiliations linked to this contribution */
  affiliations: Array<Affiliation>;
  /** Biography of the contributor at the time of contribution */
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

/** Expression to use when filtering by numeric value */
export enum Expression {
  /** Return only results with values which are greater than the value supplied */
  GreaterThan = 'GREATER_THAN',
  /** Return only results with values which are less than the value supplied */
  LessThan = 'LESS_THAN'
}

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
  /** Jurisdiction of the award */
  jurisdiction?: Maybe<Scalars['String']['output']>;
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
  Jurisdiction = 'JURISDICTION',
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
  /** Date and time at which the imprint record was created */
  createdAt: Scalars['Timestamp']['output'];
  /**
   * DOI of the imprint's Crossmark policy page, if publisher participates. Crossmark 'gives readers quick and easy access to the
   *     current status of an item of content, including any corrections, retractions, or updates'. More: https://www.crossref.org/services/crossmark/
   */
  crossmarkDoi?: Maybe<Scalars['Doi']['output']>;
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
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
  workTypes?: InputMaybe<Array<WorkType>>;
};

/** Field to use when sorting imprints list */
export enum ImprintField {
  CreatedAt = 'CREATED_AT',
  CrossmarkDoi = 'CROSSMARK_DOI',
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
  /** Whether this is a main language of the work (e.g. used for large sections of the text rather than just isolated quotations) */
  mainLanguage: Scalars['Boolean']['output'];
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
  MainLanguage = 'MAIN_LANGUAGE',
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

export type MutationRoot = {
  __typename?: 'MutationRoot';
  /** Create a new affiliation with the specified values */
  createAffiliation: Affiliation;
  /** Create a new contribution with the specified values */
  createContribution: Contribution;
  /** Create a new contributor with the specified values */
  createContributor: Contributor;
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
  /** Create a new work with the specified values */
  createWork: Work;
  /** Create a new work relation with the specified values */
  createWorkRelation: WorkRelation;
  /** Delete a single affiliation using its ID */
  deleteAffiliation: Affiliation;
  /** Delete a single contribution using its ID */
  deleteContribution: Contribution;
  /** Delete a single contributor using its ID */
  deleteContributor: Contributor;
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
  /** Delete a single work using its ID */
  deleteWork: Work;
  /** Delete a single work relation using its ID */
  deleteWorkRelation: WorkRelation;
  /** Update an existing affiliation with the specified values */
  updateAffiliation: Affiliation;
  /** Update an existing contribution with the specified values */
  updateContribution: Contribution;
  /** Update an existing contributor with the specified values */
  updateContributor: Contributor;
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
  /** Update an existing work with the specified values */
  updateWork: Work;
  /** Update an existing work relation with the specified values */
  updateWorkRelation: WorkRelation;
};


export type MutationRootCreateAffiliationArgs = {
  data: NewAffiliation;
};


export type MutationRootCreateContributionArgs = {
  data: NewContribution;
};


export type MutationRootCreateContributorArgs = {
  data: NewContributor;
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


export type MutationRootCreateWorkArgs = {
  data: NewWork;
};


export type MutationRootCreateWorkRelationArgs = {
  data: NewWorkRelation;
};


export type MutationRootDeleteAffiliationArgs = {
  affiliationId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteContributionArgs = {
  contributionId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteContributorArgs = {
  contributorId: Scalars['Uuid']['input'];
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


export type MutationRootDeleteWorkArgs = {
  workId: Scalars['Uuid']['input'];
};


export type MutationRootDeleteWorkRelationArgs = {
  workRelationId: Scalars['Uuid']['input'];
};


export type MutationRootUpdateAffiliationArgs = {
  data: PatchAffiliation;
};


export type MutationRootUpdateContributionArgs = {
  data: PatchContribution;
};


export type MutationRootUpdateContributorArgs = {
  data: PatchContributor;
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


export type MutationRootUpdateWorkArgs = {
  data: PatchWork;
};


export type MutationRootUpdateWorkRelationArgs = {
  data: PatchWorkRelation;
};

/** Set of values required to define a new association between a person and an institution for a specific contribution */
export type NewAffiliation = {
  affiliationOrdinal: Scalars['Int']['input'];
  contributionId: Scalars['Uuid']['input'];
  institutionId: Scalars['Uuid']['input'];
  position?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to define a new individual involvement in the production of a work */
export type NewContribution = {
  biography?: InputMaybe<Scalars['String']['input']>;
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

/** Set of values required to define a new grant awarded for the publication of a work by an institution */
export type NewFunding = {
  grantNumber?: InputMaybe<Scalars['String']['input']>;
  institutionId: Scalars['Uuid']['input'];
  jurisdiction?: InputMaybe<Scalars['String']['input']>;
  program?: InputMaybe<Scalars['String']['input']>;
  projectName?: InputMaybe<Scalars['String']['input']>;
  projectShortname?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new brand under which a publisher issues works */
export type NewImprint = {
  crossmarkDoi?: InputMaybe<Scalars['Doi']['input']>;
  imprintName: Scalars['String']['input'];
  imprintUrl?: InputMaybe<Scalars['String']['input']>;
  publisherId: Scalars['Uuid']['input'];
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
  issueOrdinal: Scalars['Int']['input'];
  seriesId: Scalars['Uuid']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to define a new description of a work's language */
export type NewLanguage = {
  languageCode: LanguageCode;
  languageRelation: LanguageRelation;
  mainLanguage: Scalars['Boolean']['input'];
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

/** Set of values required to define a new organisation that produces and distributes works */
export type NewPublisher = {
  publisherName: Scalars['String']['input'];
  publisherShortname?: InputMaybe<Scalars['String']['input']>;
  publisherUrl?: InputMaybe<Scalars['String']['input']>;
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
  fullTitle: Scalars['String']['input'];
  generalNote?: InputMaybe<Scalars['String']['input']>;
  imageCount?: InputMaybe<Scalars['Int']['input']>;
  imprintId: Scalars['Uuid']['input'];
  landingPage?: InputMaybe<Scalars['String']['input']>;
  lastPage?: InputMaybe<Scalars['String']['input']>;
  lccn?: InputMaybe<Scalars['String']['input']>;
  license?: InputMaybe<Scalars['String']['input']>;
  longAbstract?: InputMaybe<Scalars['String']['input']>;
  oclc?: InputMaybe<Scalars['String']['input']>;
  pageBreakdown?: InputMaybe<Scalars['String']['input']>;
  pageCount?: InputMaybe<Scalars['Int']['input']>;
  pageInterval?: InputMaybe<Scalars['String']['input']>;
  place?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<Scalars['Date']['input']>;
  reference?: InputMaybe<Scalars['String']['input']>;
  shortAbstract?: InputMaybe<Scalars['String']['input']>;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  tableCount?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
  toc?: InputMaybe<Scalars['String']['input']>;
  videoCount?: InputMaybe<Scalars['Int']['input']>;
  withdrawnDate?: InputMaybe<Scalars['Date']['input']>;
  workStatus: WorkStatus;
  workType: WorkType;
};

/** Set of values required to define a new relationship between two works */
export type NewWorkRelation = {
  relatedWorkId: Scalars['Uuid']['input'];
  relationOrdinal: Scalars['Int']['input'];
  relationType: RelationType;
  relatorWorkId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing association between a person and an institution for a specific contribution */
export type PatchAffiliation = {
  affiliationId: Scalars['Uuid']['input'];
  affiliationOrdinal: Scalars['Int']['input'];
  contributionId: Scalars['Uuid']['input'];
  institutionId: Scalars['Uuid']['input'];
  position?: InputMaybe<Scalars['String']['input']>;
};

/** Set of values required to update an individual involvement in the production of a work */
export type PatchContribution = {
  biography?: InputMaybe<Scalars['String']['input']>;
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

/** Set of values required to update an existing grant awarded for the publication of a work by an institution */
export type PatchFunding = {
  fundingId: Scalars['Uuid']['input'];
  grantNumber?: InputMaybe<Scalars['String']['input']>;
  institutionId: Scalars['Uuid']['input'];
  jurisdiction?: InputMaybe<Scalars['String']['input']>;
  program?: InputMaybe<Scalars['String']['input']>;
  projectName?: InputMaybe<Scalars['String']['input']>;
  projectShortname?: InputMaybe<Scalars['String']['input']>;
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing brand under which a publisher issues works */
export type PatchImprint = {
  crossmarkDoi?: InputMaybe<Scalars['Doi']['input']>;
  imprintId: Scalars['Uuid']['input'];
  imprintName: Scalars['String']['input'];
  imprintUrl?: InputMaybe<Scalars['String']['input']>;
  publisherId: Scalars['Uuid']['input'];
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
  issueOrdinal: Scalars['Int']['input'];
  seriesId: Scalars['Uuid']['input'];
  workId: Scalars['Uuid']['input'];
};

/** Set of values required to update an existing description of a work's language */
export type PatchLanguage = {
  languageCode: LanguageCode;
  languageId: Scalars['Uuid']['input'];
  languageRelation: LanguageRelation;
  mainLanguage: Scalars['Boolean']['input'];
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
  publisherId: Scalars['Uuid']['input'];
  publisherName: Scalars['String']['input'];
  publisherShortname?: InputMaybe<Scalars['String']['input']>;
  publisherUrl?: InputMaybe<Scalars['String']['input']>;
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
  fullTitle: Scalars['String']['input'];
  generalNote?: InputMaybe<Scalars['String']['input']>;
  imageCount?: InputMaybe<Scalars['Int']['input']>;
  imprintId: Scalars['Uuid']['input'];
  landingPage?: InputMaybe<Scalars['String']['input']>;
  lastPage?: InputMaybe<Scalars['String']['input']>;
  lccn?: InputMaybe<Scalars['String']['input']>;
  license?: InputMaybe<Scalars['String']['input']>;
  longAbstract?: InputMaybe<Scalars['String']['input']>;
  oclc?: InputMaybe<Scalars['String']['input']>;
  pageBreakdown?: InputMaybe<Scalars['String']['input']>;
  pageCount?: InputMaybe<Scalars['Int']['input']>;
  pageInterval?: InputMaybe<Scalars['String']['input']>;
  place?: InputMaybe<Scalars['String']['input']>;
  publicationDate?: InputMaybe<Scalars['Date']['input']>;
  reference?: InputMaybe<Scalars['String']['input']>;
  shortAbstract?: InputMaybe<Scalars['String']['input']>;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  tableCount?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
  toc?: InputMaybe<Scalars['String']['input']>;
  videoCount?: InputMaybe<Scalars['Int']['input']>;
  withdrawnDate?: InputMaybe<Scalars['Date']['input']>;
  workId: Scalars['Uuid']['input'];
  workStatus: WorkStatus;
  workType: WorkType;
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
  /** Date and time at which the publication record was created */
  createdAt: Scalars['Timestamp']['output'];
  /** Depth of the physical Publication (in mm, cm or in) (only applicable to non-Chapter Paperbacks and Hardbacks) */
  depth?: Maybe<Scalars['Float']['output']>;
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
};


/** An organisation that produces and distributes written texts. */
export type PublisherImprintsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ImprintOrderBy>;
};

/** Field to use when sorting publishers list */
export enum PublisherField {
  CreatedAt = 'CREATED_AT',
  PublisherId = 'PUBLISHER_ID',
  PublisherName = 'PUBLISHER_NAME',
  PublisherShortname = 'PUBLISHER_SHORTNAME',
  PublisherUrl = 'PUBLISHER_URL',
  UpdatedAt = 'UPDATED_AT'
}

/** Field and order to use when sorting publishers list */
export type PublisherOrderBy = {
  direction: Direction;
  field: PublisherField;
};

export type QueryRoot = {
  __typename?: 'QueryRoot';
  /** Query a single affiliation using its ID */
  affiliation: Affiliation;
  /** Get the total number of affiliations */
  affiliationCount: Scalars['Int']['output'];
  /** Query the full list of affiliations */
  affiliations: Array<Affiliation>;
  /** Query a single book using its DOI */
  bookByDoi: Work;
  /** Get the total number of books (a subset of the total number of works) */
  bookCount: Scalars['Int']['output'];
  /** Query the full list of books (a subset of the full list of works) */
  books: Array<Work>;
  /** Query a single chapter using its DOI */
  chapterByDoi: Work;
  /** Get the total number of chapters (a subset of the total number of works) */
  chapterCount: Scalars['Int']['output'];
  /** Query the full list of chapters (a subset of the full list of works) */
  chapters: Array<Work>;
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
  /** Query a single work using its ID */
  work: Work;
  /** Query a single work using its DOI */
  workByDoi: Work;
  /** Get the total number of works */
  workCount: Scalars['Int']['output'];
  /** Query the full list of works */
  works: Array<Work>;
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


export type QueryRootBookByDoiArgs = {
  doi: Scalars['Doi']['input'];
};


export type QueryRootBookCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
};


export type QueryRootBooksArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<WorkOrderBy>;
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
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
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


export type QueryRootWorkArgs = {
  workId: Scalars['Uuid']['input'];
};


export type QueryRootWorkByDoiArgs = {
  doi: Scalars['Doi']['input'];
};


export type QueryRootWorkCountArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  publishers?: InputMaybe<Array<Scalars['Uuid']['input']>>;
  updatedAtWithRelations?: InputMaybe<TimeExpression>;
  workStatus?: InputMaybe<WorkStatus>;
  workStatuses?: InputMaybe<Array<WorkStatus>>;
  workTypes?: InputMaybe<Array<WorkType>>;
};


export type QueryRootWorksArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<WorkOrderBy>;
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
  /** Total number of audio fragments in the work */
  audioCount?: Maybe<Scalars['Int']['output']>;
  /** Indicates that the work contains a bibliography or other similar information */
  bibliographyNote?: Maybe<Scalars['String']['output']>;
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
  /** Page number on which the work begins (only applicable to chapters) */
  firstPage?: Maybe<Scalars['String']['output']>;
  /** Concatenation of title and subtitle with punctuation mark */
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
  /** Abstract of the work. Where a work has only one abstract, it should be entered here, and Short Abstract can be left blank. Long Abstract is output in metadata formats, and Short Abstract is not. */
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
  /** Short abstract of the work. Where a work has two different versions of the abstract, the truncated version should be entered here. Otherwise, it can be left blank. This field is not output in metadata formats; where relevant, Long Abstract is used instead. */
  shortAbstract?: Maybe<Scalars['String']['output']>;
  /** Get subjects linked to this work */
  subjects: Array<Subject>;
  /** Secondary title of the work (excluding main title) */
  subtitle?: Maybe<Scalars['String']['output']>;
  /** Total number of tables in the work */
  tableCount?: Maybe<Scalars['Int']['output']>;
  /** Main title of the work (excluding subtitle) */
  title: Scalars['String']['output'];
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
export type WorkContributionsArgs = {
  contributionTypes?: InputMaybe<Array<ContributionType>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<ContributionOrderBy>;
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
export type WorkSubjectsArgs = {
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<SubjectOrderBy>;
  subjectTypes?: InputMaybe<Array<SubjectType>>;
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

export type GetBooksQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetBooksQuery = { __typename?: 'QueryRoot', books: Array<{ __typename?: 'Work', doi?: any | null, workId: any, title: string, workType: WorkType, updatedAt: any, contributions: Array<{ __typename?: 'Contribution', fullName: string }>, imprint: { __typename?: 'Imprint', publisher: { __typename?: 'Publisher', publisherName: string } } }> };

export type GetChaptersQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetChaptersQuery = { __typename?: 'QueryRoot', chapters: Array<{ __typename?: 'Work', doi?: any | null, workId: any, title: string, workType: WorkType, updatedAt: any, contributions: Array<{ __typename?: 'Contribution', fullName: string }>, imprint: { __typename?: 'Imprint', publisher: { __typename?: 'Publisher', publisherName: string } } }> };

export type GetContributorsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetContributorsQuery = { __typename?: 'QueryRoot', contributors: Array<{ __typename?: 'Contributor', orcid?: any | null, fullName: string, updatedAt: any, contributorId: any }> };

export type GetImprintsQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetImprintsQuery = { __typename?: 'QueryRoot', imprints: Array<{ __typename?: 'Imprint', imprintId: any, imprintName: string, imprintUrl?: string | null, updatedAt: any, publisher: { __typename?: 'Publisher', publisherName: string } }> };

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

export type GetPublicationsQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetPublicationsQuery = { __typename?: 'QueryRoot', publications: Array<{ __typename?: 'Publication', isbn?: any | null, publicationId: any, publicationType: PublicationType, updatedAt: any, work: { __typename?: 'Work', doi?: any | null, title: string, imprint: { __typename?: 'Imprint', publisher: { __typename?: 'Publisher', publisherName: string } } } }> };

export type GetPublishersQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetPublishersQuery = { __typename?: 'QueryRoot', publishers: Array<{ __typename?: 'Publisher', publisherId: any, publisherName: string, publisherShortname?: string | null, publisherUrl?: string | null, updatedAt: any }> };

export type GetSeriesQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetSeriesQuery = { __typename?: 'QueryRoot', serieses: Array<{ __typename?: 'Series', seriesId: any, seriesName: string, seriesType: SeriesType, issnPrint?: string | null, issnDigital?: string | null, updatedAt: any }> };

export type GetWorksQueryVariables = Exact<{
  publishers: Array<Scalars['Uuid']['input']> | Scalars['Uuid']['input'];
}>;


export type GetWorksQuery = { __typename?: 'QueryRoot', works: Array<{ __typename?: 'Work', doi?: any | null, workId: any, title: string, workType: WorkType, updatedAt: any, contributions: Array<{ __typename?: 'Contribution', fullName: string }>, imprint: { __typename?: 'Imprint', publisher: { __typename?: 'Publisher', publisherName: string } } }> };


export const GetBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"books"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetBooksQuery, GetBooksQueryVariables>;
export const GetChaptersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChapters"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chapters"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetChaptersQuery, GetChaptersQueryVariables>;
export const GetContributorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContributors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orcid"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contributorId"}}]}}]}}]} as unknown as DocumentNode<GetContributorsQuery, GetContributorsQueryVariables>;
export const GetImprintsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetImprints"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprints"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imprintId"}},{"kind":"Field","name":{"kind":"Name","value":"imprintName"}},{"kind":"Field","name":{"kind":"Name","value":"imprintUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}}]} as unknown as DocumentNode<GetImprintsQuery, GetImprintsQueryVariables>;
export const GetInstitutionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInstitutions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionId"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionDoi"}},{"kind":"Field","name":{"kind":"Name","value":"ror"}},{"kind":"Field","name":{"kind":"Name","value":"countryCode"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetInstitutionsQuery, GetInstitutionsQueryVariables>;
export const GetInstitutionsCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInstitutionsCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"institutionCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}]}]}}]} as unknown as DocumentNode<GetInstitutionsCountQuery, GetInstitutionsCountQueryVariables>;
export const GetPublicationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"publicationId"}},{"kind":"Field","name":{"kind":"Name","value":"publicationType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"work"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetPublicationsQuery, GetPublicationsQueryVariables>;
export const GetPublishersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublishers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherId"}},{"kind":"Field","name":{"kind":"Name","value":"publisherName"}},{"kind":"Field","name":{"kind":"Name","value":"publisherShortname"}},{"kind":"Field","name":{"kind":"Name","value":"publisherUrl"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetPublishersQuery, GetPublishersQueryVariables>;
export const GetSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serieses"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"seriesId"}},{"kind":"Field","name":{"kind":"Name","value":"seriesName"}},{"kind":"Field","name":{"kind":"Name","value":"seriesType"}},{"kind":"Field","name":{"kind":"Name","value":"issnPrint"}},{"kind":"Field","name":{"kind":"Name","value":"issnDigital"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetSeriesQuery, GetSeriesQueryVariables>;
export const GetWorksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"works"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publishers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publishers"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"workId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"workType"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"imprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisherName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetWorksQuery, GetWorksQueryVariables>;