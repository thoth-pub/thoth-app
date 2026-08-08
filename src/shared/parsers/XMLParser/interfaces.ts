import {
  CollectionFrequencyCode,
  CollectionSequenceType,
  CollectionType,
  CurrencyCodeBasedOnIso4217,
  LanguageBasedOnIso6392b,
  LanguageRole,
  PriceType,
  ProductRelation,
  TitleElementLevel,
  TitleType,
  WorkRelation,
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
} from '@5stones/onix/dist/interfaces';
import { Collection } from '@5stones/onix/dist/interfaces/Collection';
import { ONIXMessage } from '@5stones/onix/dist/interfaces/ONIXMessage';

/**
 * `@5stones/onix` parses with `fast-xml-parser` using `ignoreAttributes: false` and no
 * `isArray` configuration. Upstream's interfaces do not describe either consequence, so the
 * types below narrowly correct them where this parser reads the data:
 *
 * - repeatable composites are objects when they occur once and arrays when they repeat;
 * - text-bearing elements carrying XML attributes are emitted as `{ '#text': … }` objects
 *   rather than as strings.
 *
 * Where a correction is incompatible with the upstream declaration (an array is not
 * assignable to upstream's singular type) the property is `Omit`ted from the base interface
 * and redeclared, rather than cast away at every call site.
 */

/** A composite that `fast-xml-parser` emits as an object when single and an array when repeated. */
export type OnixRepeatable<T> = T | T[];

/**
 * A text element. `ignoreAttributes: false` means an element carrying any XML attribute is
 * emitted as an object holding the text under `#text`; the attributes themselves land on the
 * same object under `@_<name>` keys.
 *
 * Only the attributes this importer reads are declared. `language` is the one that carries
 * meaning Thoth can store: ONIX puts it on TitleText, Subtitle and Text, and it is how Thoth's
 * own ONIX exporter writes a title's locale. Everything else an element may carry — `textformat`,
 * `dateformat`, `collationkey` — stays undeclared until something reads it, so the type keeps
 * saying what this parser understands rather than becoming an untyped bag.
 */
export type OnixTextElement = { '#text'?: string | number; '@_language'?: string };

export type OnixText = string | number | OnixTextElement;

export interface OnixTitleElement {
  TitleElementLevel?: TitleElementLevel;
  TitleText?: OnixText;
  TitlePrefix?: OnixText;
  /** Empty marker element asserting the title has no prefix. */
  NoPrefix?: OnixText;
  TitleWithoutPrefix?: OnixText;
  Subtitle?: OnixText;
}

export interface OnixTitleDetail {
  TitleType?: TitleType;
  TitleElement?: OnixRepeatable<OnixTitleElement>;
}

export interface OnixLanguage {
  LanguageRole?: LanguageRole;
  LanguageCode?: LanguageBasedOnIso6392b | string;
}

/** The subset of a Collection that {@link selectSeriesCollection} needs to rank candidates. */
export interface OnixCollectionLike {
  CollectionType?: CollectionType;
  TitleDetail?: OnixRepeatable<OnixTitleDetail>;
}

/**
 * One CollectionSequence. The type says what the number counts — publication order, alphabetical
 * order, the publisher's own arbitrary order — and the composite is repeatable, so a product can
 * state several orderings of the same collection at once.
 */
export interface OnixCollectionSequence {
  CollectionSequenceType?: CollectionSequenceType;
  CollectionSequenceNumber?: OnixText;
}

/**
 * An identifier inside a RelatedProduct or RelatedWork. Repeatable in both.
 *
 * The ID type stays a plain string, as upstream declares WorkIDType: it is read through
 * {@link getOnixText} and compared against the code list, which is what a file that writes
 * `<ProductIDType>06</ProductIDType>` with attributes needs anyway.
 */
export interface OnixRelatedIdentifier {
  ProductIDType?: string;
  WorkIDType?: string;
  IDTypeName?: OnixText;
  IDValue?: OnixText;
}

export interface OnixRelatedProduct {
  ProductRelationCode?: ProductRelation;
  ProductIdentifier?: OnixRepeatable<OnixRelatedIdentifier>;
}

export interface OnixRelatedWork {
  WorkRelationCode?: WorkRelation;
  WorkIdentifier?: OnixRepeatable<OnixRelatedIdentifier>;
}

export interface ExtendedRelatedMaterial {
  RelatedWork?: OnixRepeatable<OnixRelatedWork>;
  RelatedProduct?: OnixRepeatable<OnixRelatedProduct>;
}

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

export interface ExtendedCollection extends Omit<Collection, 'CollectionType' | 'TitleDetail'>, OnixCollectionLike {
  CollectionType?: CollectionType;
  CollectionFrequency?: CollectionFrequencyCode;
  CollectionSequence?: OnixRepeatable<OnixCollectionSequence>;
  SourceName?: string;
  TitleDetail?: OnixRepeatable<OnixTitleDetail>;
  LevelSequenceNumber?: OnixText;
  PageRun?: {
    FirstPageNumber?: OnixText;
    LastPageNumber?: OnixText;
  };
  NumberOfPages?: OnixText;
  TextItem?: {
    TextItemIdentifier?: {
      IDValue?: string;
    };
  };
  Contributor?: OnixRepeatable<ExtendedContributor>;
}

export interface ExtendedDescriptiveDetail
  extends Omit<ProductDescriptiveDetail, 'Collection' | 'Contributor' | 'Language' | 'TitleDetail'> {
  TitleDetail?: OnixRepeatable<OnixTitleDetail>;
  Language?: OnixRepeatable<OnixLanguage>;
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
    EditionNumber?: string;
  };
  IllustrationsNote?: {
    IllustrationsNoteText?: string;
  };
  GeneralNote?: {
    GeneralNoteText?: string;
  };
  Collection?: OnixRepeatable<ExtendedCollection>;
  Contributor?: OnixRepeatable<ExtendedContributor>;
}

export interface ExtendedPublishingDetail extends PublishingDetail {
  CopyrightStatement?: {
    CopyrightOwner?: {
      PersonName?: string;
    };
  };
  Publisher?: ExtendedPublisher;
}

export interface ExtendedProduct
  extends Omit<Product, 'DescriptiveDetail' | 'ProductSupply' | 'PublishingDetail' | 'RelatedMaterial'> {
  DescriptiveDetail?: ExtendedDescriptiveDetail;
  PublishingDetail?: ExtendedPublishingDetail;
  ProductSupply?: ExtendedProductSupply;
  RelatedMaterial?: ExtendedRelatedMaterial;
  ContentDetail?: {
    ContentItem?: OnixRepeatable<ExtendedCollection>;
  };
}

export interface ExtendedONIXMessage extends Omit<ONIXMessage, 'Product'> {
  Product?: OnixRepeatable<ExtendedProduct>;
}

/**
 * The root of a parsed ONIX message, described as `@5stones/onix` really emits it. Upstream's
 * `ONIXMessageRoot` remains assignable to this, so callers holding one can keep passing it.
 */
export interface ExtendedONIXMessageRoot {
  ONIXMessage: ExtendedONIXMessage;
}
