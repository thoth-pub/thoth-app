import { ROUTES } from '@/src/shared/constants';
import { normalizeMetaDataPrefix } from '@/src/shared/utils';

import { WorkId } from '../../work/model/work.types';
import {
  FORMAT_IDS,
  FormatDto,
  MetadataEntity,
  SPECIFICATION_STATUS,
  SpecificationResult,
} from '../model/metadata.types';

export class MetadataService {
  async getAvailableFormats(): Promise<FormatDto[]> {
    try {
      const response = await fetch(ROUTES.METADATA_FORMATS, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as FormatDto[];

      return data.map((format) => ({ ...format, specifications: format.specifications.map(normalizeMetaDataPrefix) }));
    } catch {
      return [];
    }
  }

  async getAllFormatSpecifications(
    workId: WorkId,
    specifications: string[],
  ): Promise<Record<string, SpecificationResult>> {
    const fetchSpecification = async (specification: string): Promise<[string, SpecificationResult]> => {
      try {
        const response = await fetch(ROUTES.METADATA_SPECIFICATIONS(specification, workId));

        if (!response.ok) {
          let errorMessage = 'Failed to fetch specification';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If JSON parsing fails, use default error message
          }
          return [specification, { status: SPECIFICATION_STATUS.ERROR, data: errorMessage }];
        }

        const data = (await response.json()) as string;

        return [specification, { status: SPECIFICATION_STATUS.SUCCESS, data }];
      } catch (error: unknown) {
        return [
          specification,
          {
            status: SPECIFICATION_STATUS.ERROR,
            data: `${error instanceof Error ? error.message : 'Failed to fetch specification'}`,
          },
        ];
      }
    };

    const entries = await Promise.all(specifications.map(fetchSpecification));

    return Object.fromEntries(entries);
  }

  async getAllSpecifications(workId: WorkId): Promise<MetadataEntity> {
    const result: MetadataEntity = {
      [FORMAT_IDS.ONIX_3_1]: {},
      [FORMAT_IDS.ONIX_3_0]: {},
      [FORMAT_IDS.ONIX_2_1]: {},
      [FORMAT_IDS.CSV]: {},
      [FORMAT_IDS.JSON]: {},
      [FORMAT_IDS.KBART]: {},
      [FORMAT_IDS.BIBTEX]: {},
      [FORMAT_IDS.DOIDEPOSIT]: {},
      [FORMAT_IDS.MARC21RECORD]: {},
      [FORMAT_IDS.MARC21MARKUP]: {},
      [FORMAT_IDS.MARC21XML]: {},
      [FORMAT_IDS.MARC21]: {},
    };

    try {
      const availableFormats = await this.getAvailableFormats();

      const formatResults = await Promise.all(
        availableFormats.map(async (format) => ({
          format,
          res: await this.getAllFormatSpecifications(workId, format.specifications),
        })),
      );

      for (const { format, res } of formatResults) {
        result[format.id] = res;

        if (format.id.startsWith(FORMAT_IDS.MARC21)) {
          result[FORMAT_IDS.MARC21] = { ...result[FORMAT_IDS.MARC21], ...res };
        }
      }
    } catch {
      return result;
    }

    return result;
  }
}
