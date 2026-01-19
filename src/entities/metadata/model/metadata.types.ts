export const FORMAT_IDS = {
  ONIX_3_1: 'onix_3.1',
  ONIX_3_0: 'onix_3.0',
  ONIX_2_1: 'onix_2.1',
  CSV: 'csv',
  JSON: 'json',
  KBART: 'kbart',
  BIBTEX: 'bibtex',
  DOIDEPOSIT: 'doideposit',
  MARC21RECORD: 'marc21record',
  MARC21MARKUP: 'marc21markup',
  MARC21XML: 'marc21xml',
  MARC21: 'marc21',
} as const;

export type FormatId = typeof FORMAT_IDS[keyof typeof FORMAT_IDS];

export type FormatDto = {
  id: FormatId;
  name: string;
  version: string | null;
  specifications: string[];
};

export const SPECIFICATION_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type SpecificationResult = {
  status: typeof SPECIFICATION_STATUS[keyof typeof SPECIFICATION_STATUS];
  data: string;
};


export type MetadataEntity = Record<FormatId, Record<string, SpecificationResult>>;
