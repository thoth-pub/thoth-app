import { normalizeMetaDataPrefix } from '@/src/shared';

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
      const response = await fetch('/api/metadata/formats', {
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
    const result: Record<string, SpecificationResult> = {};

    for (const specification of specifications) {
      try {
        const response = await fetch(`/api/metadata/specifications/${specification}/work/${workId}`);

        if (!response.ok) {
          let errorMessage = 'Failed to fetch specification';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If JSON parsing fails, use default error message
          }
          result[specification] = { status: SPECIFICATION_STATUS.ERROR, data: errorMessage };
          continue;
        }

        const data = (await response.json()) as string;

        result[specification] = { status: SPECIFICATION_STATUS.SUCCESS, data };
      } catch (error: unknown) {
        result[specification] = {
          status: SPECIFICATION_STATUS.ERROR,
          data: `${error instanceof Error ? error.message : 'Failed to fetch specification'}`,
        };
      }
    }

    return result;
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

      for (const format of availableFormats) {
        const res = await this.getAllFormatSpecifications(workId, format.specifications);
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
