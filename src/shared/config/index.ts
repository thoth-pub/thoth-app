export const appConfig = {
  meta: {
    title: 'Thoth Metadata Management Platform',
    description: ' Metadata Management Platform',
  },
  thothLink: 'https://thoth.pub/',
  cc4Link: 'https://creativecommons.org/licenses/by/4.0/',
  publicDomainLink: 'https://creativecommons.org/public-domain/cc0/',
  supportedFileTypes: ['image/png', 'image/jpeg', 'image/jpg'],
  data: {
    itemsPerRequestLimit: 20,
    maxItemsPerRequestLimit: 100,
    doiPrefix: 'https://doi.org/',
    rorPrefix: 'https://ror.org/',
    orcidPrefix: 'https://orcid.org/',
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
  defaultId: '0000-0000-0000-0000',
  tables: {
    maxPreviewLength: 150,
  },
  maxFileSize: 500000,
};
