import { DAY } from '../constants';

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
  minFileSize: 50000,
  maxFileSize: 50000000,
  minItemsCountForDragAndDrop: 2,
  maxCsvContributorsCount: 20,
};
