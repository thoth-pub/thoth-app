import {
  CollectionFrequencyCode,
  CollectionSequenceType,
  CollectionType,
  CurrencyCodeBasedOnIso4217,
  PriceType,
} from '@5stones/onix/dist/enums';
import {
  Contributor,
  DescriptiveDetail as ProductDescriptiveDetail,
  Price,
  PriceDate,
  Product,
  ProductSupply,
  Publisher,
  PublishingDetail,
  Supplier,
  Text,
  TitleDetail,
} from '@5stones/onix/dist/interfaces';
import { Collection } from '@5stones/onix/dist/interfaces/Collection';

export interface ExtendedContributor extends Contributor {
  ContributorRole?: string;
  PersonName?: string;
  KeyNames?: string;
  NamesBeforeKey?: string;
  NameIdentifier?: {
    IDValue?: string;
  };
  Website?: {
    WebsiteLink?: string;
    WebsiteRole?: string;
  };
  ProfessionalAffiliation?: {
    ProfessionalPosition?: string;
    AffiliationIdentifier?: {
      IDValue?: string;
    };
  };
  BiographicalNote?: Text;
}

export interface ExtendedPublisher extends Publisher {
  Website?: {
    WebsiteLink?: string;
    WebsiteRole?: string;
  }[];
  Funding?: {
    FundingIdentifier?: {
      IDTypeName?: string;
      IDValue?: string;
    }[];
  }[];
}

export interface ExtendedSupplier extends Supplier {
  Website?: {
    WebsiteRole?: string;
    WebsiteLink?: string;
  }[];
}

export interface ExtendedPrice extends Price {
  PriceType?: PriceType;
  PriceAmount?: string;
  CurrencyCode?: CurrencyCodeBasedOnIso4217;
  PriceDate?: PriceDate;
}

export interface ExtendedProductSupply extends ProductSupply {
  SupplyDetail?: {
    Supplier?: ExtendedSupplier;
    Price?: ExtendedPrice;
  };
  Market?: {
    Territory?: {
      RegionsIncluded?: string;
    };
  };
}

export interface ExtendedCollection extends Collection {
  CollectionType: CollectionType;
  CollectionFrequency?: CollectionFrequencyCode;
  CollectionSequence?: {
    CollectionSequenceType?: CollectionSequenceType;
    CollectionSequenceNumber?: string;
  };
  SourceName?: string;
  TitleDetail?: TitleDetail;
  LevelSequenceNumber?: number;
  ContentItem?: {
    TextItem?: {
      TextItemIdentifier?: {
        IDValue?: string;
      };
    };
    TitleDetail?: {
      TitleElement?: {
        TitleText?: string;
      };
    };
    Contributor?: ExtendedContributor;
  };
  PageRun?: {
    FirstPageNumber?: string;
    LastPageNumber?: string;
  };
  NumberOfPages?: number;
}

export interface ExtendedDescriptiveDetail extends ProductDescriptiveDetail {
  AncillaryContent?: {
    AncillaryContentType?: string;
    Number?: number;
  }[];
  EpubLicense?: {
    EpubLicenseExpression?: {
      EpubLicenseExpressionLink?: string;
    };
  };
  Edition?: {
    EditionNumber?: number;
  };
  IllustrationsNote?: {
    IllustrationsNoteText?: string;
  };
  GeneralNote?: {
    GeneralNoteText?: string;
  };
  Collection?: ExtendedCollection[];
  Contributor?: ExtendedContributor;
}

export interface ExtendedPublishingDetail extends PublishingDetail {
  CopyrightStatement?: {
    CopyrightOwner?: {
      PersonName?: string;
    };
  };
  Publisher?: ExtendedPublisher;
}

export interface ExtendedProduct extends Product {
  DescriptiveDetail?: ExtendedDescriptiveDetail;
  PublishingDetail?: ExtendedPublishingDetail;
  ProductSupply?: ExtendedProductSupply;
}
