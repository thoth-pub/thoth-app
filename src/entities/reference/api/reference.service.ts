import { ReferenceDtoMapper } from '../model/reference.mapper';
import { BaseService } from '@/src/shared/interfaces/services';
import type { ReferenceEntity } from '../model/reference.types';
import type { ReferenceDto } from '../model/reference.types';
import type { QueryToken } from '@/src/shared';
import { CREATE_REFERENCE, DELETE_REFERENCE, UPDATE_REFERENCE } from '../model/reference.schema';
import type { WorkId } from '../../work/model/work.types';

export class ReferenceService extends BaseService<ReferenceEntity, ReferenceDto> {
  constructor() {
    super(new ReferenceDtoMapper());
  }

  async createReference(token: QueryToken, data: ReferenceEntity, relatedWorkId: WorkId): Promise<ReferenceEntity> {
    const { referenceId, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, CREATE_REFERENCE, {
      data: { ...dto, workId: relatedWorkId, referenceOrdinal: data.orderNumber ?? 1 },
    });

    const reference = this.dtoMapper.toEntity(response.createReference as ReferenceDto);

    return reference;
  }

  async updateReference(token: QueryToken, data: ReferenceEntity, relatedWorkId: WorkId): Promise<ReferenceEntity> {
    const dto = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, UPDATE_REFERENCE, {
      data: { ...dto, workId: relatedWorkId, referenceId: data.id, referenceOrdinal: data.orderNumber ?? 1 },
    });

    const reference = this.dtoMapper.toEntity(response.updateReference as ReferenceDto);

    return reference;
  }

  async deleteReference(token: QueryToken, referenceId: string) {
    return await this.graphqlService.mutation(token, DELETE_REFERENCE, {
      referenceId,
    });
  }
}
