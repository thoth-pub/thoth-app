import { appConfig } from "../..";

export const normalizeMetaDataPrefix = (url: string) => url.replace(appConfig.metaDataPrefix, '');

export const getSpecificationPlaceholder = (specification: string) => {
  switch (specification) {
    case 'onix_3.1::thoth':
      return 'Thoth ONIX 3.1';
    case 'onix_3.0::thoth':
      return 'Thoth ONIX 3.0';
    case 'onix_3.0::project_muse':
      return 'Project MUSE ONIX 3.0';
    case 'onix_3.0::oapen':
      return 'OAPEN ONIX 3.0';
    case 'onix_3.0::jstor':
      return 'JSTOR ONIX 3.0';
    case 'onix_3.0::google_books':
      return 'Google Books ONIX 3.0';
    case 'onix_3.0::overdrive':
      return 'OverDrive ONIX 3.0';
    case 'onix_2.1::ebsco_host':
      return 'EBSCO Host ONIX 2.1';
    case 'onix_2.1::proquest_ebrary':
      return 'ProQuest Ebrary ONIX 2.1';
    case 'csv::thoth':
      return 'Thoth CSV';
    case 'json::thoth':
      return 'Thoth JSON';
    case 'kbart::oclc':
      return 'OCLC KBART';
    case 'bibtex::thoth':
      return 'Thoth BibTeX';
    case 'doideposit::crossref':
      return 'CrossRef DOI deposit';
    case 'marc21record::thoth':
      return 'Thoth MARC 21 Record';
    case 'marc21markup::thoth':
      return 'Thoth MARC 21 Markup';
    case 'marc21xml::thoth':
      return 'Thoth MARC 21 XML';
    default:
      return specification;
  }
};