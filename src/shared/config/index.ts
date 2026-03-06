import { CurrencyCode } from '../constants/currencies';
import { LanguageTypeAlt } from '../constants/languages';
import { DAY } from '../constants/time';

export const appConfig = {
  query: {
    staleTime: DAY,
    cacheTime: DAY,
  },
  meta: {
    title: 'Thoth Metadata Management Platform',
    description: ' Metadata Management Platform',
  },
  thothLink: 'https://thoth.pub/',
  cc4Link: 'https://creativecommons.org/licenses/by/4.0/',
  publicDomainLink: 'https://creativecommons.org/public-domain/cc0/',
  metaDataPrefix: 'https://export.thoth.pub/specifications/',
  supportedImagesFileTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  supportedPdfFileTypes: ['application/pdf', 'application/octet-stream'],
  supportedEpubFileTypes: ['application/epub+zip', 'application/zip', 'application/octet-stream'],
  supportedHtmlFileTypes: ['text/html', 'application/zip', 'application/octet-stream'],
  supportedXmlFileTypes: ['application/xml', 'text/xml', 'application/zip', 'application/octet-stream'],
  supportedDocxFileTypes: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
  ],
  supportedMobiFileTypes: ['application/x-mobipocket-ebook', 'application/octet-stream'],
  supportedAzw3FileTypes: ['application/vnd.amazon.ebook', 'application/octet-stream'],
  supportedFictionBookFileTypes: ['application/fictionbook2+zip', 'application/zip', 'application/octet-stream'],
  supportedMP3FileTypes: ['audio/mp3', 'audio/mpeg', 'application/octet-stream'],
  supportedWavFileTypes: ['audio/wav', 'audio/x-wav', 'application/octet-stream'],
  data: {
    itemsPerRequestLimit: 20,
    maxItemsPerRequestLimit: 100,
    maxImprintsPerRequestLimit: 1000,
  },
  fieldsDebounceDelay: 1000,
  validations: {
    doiPrefix: 'https://doi.org/',
    protocolPrefixHttps: 'https://',
    protocolPrefixHttp: 'http://',
    rorPrefix: 'https://ror.org/',
    orcidPrefix: 'https://orcid.org/',
  },
  dataApi: {
    textSeparator: '_',
    pageBreakdownSeparator: '+',
  },
  animation: {
    duration: 0.5,
  },
  dateFormat: 'YYYY-MM-DD',
  dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
  tableDateFormat: 'YY-MM-DD HH:mm',
  defaultId: '0000-0000-0000-0000',
  tables: {
    maxPreviewLength: 150,
  },
  minFileSize: 6250,
  maxFileSize: 50000000,
  maxPublicationFileSize: 5368709120,
  minItemsCountForDragAndDrop: 2,
  maxCsvContributorsCount: 20,
  persistentStorage: {
    prefix: 'thoth_app',
    activePublisherIdKey: 'activePublisherIdKey',
  },
  publisherDefaultValues: {
    defaultCurrency: CurrencyCode.enum.Gbp,
    defaultLocale: LanguageTypeAlt.enum.En,
  },
};
