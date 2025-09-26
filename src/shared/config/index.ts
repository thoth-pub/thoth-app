export const appConfig = {
  meta: {
    title: 'Thoth Metadata Management Platform',
    description: ' Metadata Management Platform',
  },
  thothLink: 'https://thoth.pub/',
  cc4Link: 'https://creativecommons.org/licenses/by/4.0/',
  publicDomainLink: 'https://creativecommons.org/public-domain/cc0/',
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
    protocolPrefix: 'https://',
    rorPrefix: 'https://ror.org/',
    orcidPrefix: 'https://orcid.org/',
  },
  dataApi: {
    textSeparator: '_',
  },
  animation: {
    duration: 0.5,
  },
  dateFormat: 'YYYY-MM-DD',
  defaultId: '0000-0000-0000-0000',
  tables: {
    maxPreviewLength: 150,
  },
};
