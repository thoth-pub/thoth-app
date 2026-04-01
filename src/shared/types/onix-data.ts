export type OnixData = {
  xmlns?: string;
  release?: string;
  header: Partial<OnixHeader>;
  products: Partial<OnixProduct>[];
};

type OnixHeader = {
  sender: OnixSender;
  sentDateTime?: string;
};

type OnixSender = {
  name: string;
  emailAddress?: string;
};

type OnixProduct = {
  record: string;
  notification: number;
  identifiers: OnixIdentifier[];
  description: OnixProductDescription;
  collateralDetail: OnixCollateralDetail;
  publishingDetail: OnixPublishingDetail;
  relatedMaterial: OnixRelatedMaterial;
  productSupply: OnixProductSupply[];
};

type OnixIdentifier = {
  type: number;
  value: string;
  typeName?: string;
};

type OnixProductDescription = {
  productComposition: number;
  productForm: string;
  collection?: OnixCollection[];
  title: OnixTitle;
  contributors: OnixContributor[];
  audiences: OnixAudience[];
  languages: OnixLanguage[];
  subjects: OnixSubject[];
};

type OnixCollection = {
  collectionType: number;
  collectionIdentifier: OnixCollectionIdentifier[];
  collectionSequence?: OnixCollectionSequence[];
  titleDetail: OnixTitleDetail[];
};

type OnixCollectionIdentifier = {
  collectionIDType: number;
  idTypeName?: string;
  idValue: string;
};

type OnixCollectionSequence = {
  collectionSequenceType: number;
  collectionSequenceNumber: string;
};

type OnixTitleDetail = {
  titleType: number;
  titleElement: OnixTitleElement[];
};

type OnixTitleElement = {
  titleElementLevel: number;
  partNumber?: string;
  titleText: string;
  titlePrefix?: string;
  titleWithoutPrefix?: string;
  subtitle?: string;
};

type OnixTitle = {
  type: number;
  element: {
    level: number;
    text: string;
    noPrefix: boolean;
    subtitle?: string;
  };
};

type OnixContributor = {
  sequence: number;
  role: string;
  name: string;
  note?: string;
  namesBeforeKey?: string;
  keyNames: string;
  websites?: OnixWebsite[];
  identifiers?: OnixIdentifier[];
};

type OnixWebsite = {
  role: number;
  link: string;
};

type OnixAudience = {
  type: number;
  value: number;
};

type OnixLanguage = {
  role: number;
  code: string;
};

type OnixSubject = {
  main: boolean;
  scheme: string;
  code?: string;
  text?: string;
};

type OnixCollateralDetail = {
  textContent: OnixTextContent[];
  supportingResource?: OnixSupportingResource;
};

type OnixTextContent = {
  type: number;
  audience: number;
  text: string;
};

type OnixSupportingResource = {
  resourceContentType: number;
  contentAudience: number;
  resourceMode: number;
  resourceFeature: OnixResourceFeature[];
  resourceVersion: OnixResourceVersion[];
};

type OnixResourceFeature = {
  resourceFeatureType: number;
  featureNote: string;
};

type OnixResourceVersion = {
  resourceForm: number;
  resourceLink: string;
};

type OnixPublishingDetail = {
  publisher: OnixPublisher[];
  imprint?: OnixImprint;
  cityOfPublication?: string;
  status: number;
  dates: OnixPublishingDate[];
  salesRights: OnixSalesRights[];
  copyright?: OnixCopyright[];
};

type OnixPublisher = {
  role: number;
  name: string;
  identifiers?: OnixIdentifier[];
};

type OnixImprint = {
  name: string;
  identifiers?: OnixIdentifier[];
};

type OnixPublishingDate = {
  role: number;
  date: string;
};

type OnixSalesRights = {
  type: number;
  territory: OnixTerritory;
};

type OnixTerritory = {
  regionsIncluded: string;
  regionsExcluded?: string;
};

type OnixCopyright = {
  owners: OnixCopyrightOwner[];
};

type OnixCopyrightOwner = {
  name: string;
};

type OnixRelatedMaterial = {
  relatedWork?: OnixRelatedWork[];
  relatedProducts?: OnixRelatedProduct[];
};

type OnixRelatedWork = {
  workRelationCode: number;
  workIdentifiers: OnixIdentifier[];
};

type OnixRelatedProduct = {
  productRelationCodes: number[];
  productIdentifiers: OnixIdentifier[];
};

type OnixProductSupply = {
  market: OnixMarket[];
  details: OnixSupplyDetail[];
};

type OnixMarket = {
  territory: OnixTerritory;
};

type OnixSupplyDetail = {
  suppliers: OnixSupplier[];
  availability: number;
  dates: OnixSupplyDate[];
  prices: OnixPrice[];
};

type OnixSupplier = {
  name: string;
  role: number;
  identifiers?: OnixIdentifier[];
};

type OnixSupplyDate = {
  role: number;
  date: string;
};

type OnixPrice = {
  type: number;
  amount: number;
  currency: string;
  territory: OnixTerritory;
};

export type OnixProductForm =
  | 'BC'
  | 'HC'
  | 'PC'
  | 'PB'
  | 'CS'
  | 'CL'
  | 'MI'
  | 'CD'
  | 'MP'
  | 'MC'
  | 'MV'
  | 'MS'
  | 'MT'
  | 'MR'
  | 'MRP'
  | 'MRC'
  | 'MRO'
  | 'MRC'
  | 'MRO'
  | 'MRC'
  | 'MRO';
