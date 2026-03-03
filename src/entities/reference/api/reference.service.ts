import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import type { WorkId } from '../../work/model/work.types';
import { ReferenceDtoMapper } from '../model/reference.mapper';
import { CREATE_REFERENCE, DELETE_REFERENCE, MOVE_REFERENCE, UPDATE_REFERENCE } from '../model/reference.schema';
import type { ReferenceDto, ReferenceEntity, ReferenceId } from '../model/reference.types';

export class ReferenceService extends BaseService<ReferenceEntity, ReferenceDto> {
  constructor(graphqlService: GraphqlService, mapper = new ReferenceDtoMapper()) {
    super(graphqlService, mapper);
  }

  async createReference(data: ReferenceEntity, relatedWorkId: WorkId): Promise<ReferenceEntity> {
    const { referenceId: _, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_REFERENCE, {
      data: { ...dto, workId: relatedWorkId, referenceOrdinal: data.orderNumber ?? 1 },
    });

    const reference = this.dtoMapper.toEntity(response.createReference as ReferenceDto);

    return reference;
  }

  async updateReference(data: ReferenceEntity, relatedWorkId: WorkId): Promise<ReferenceEntity> {
    const dto = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(UPDATE_REFERENCE, {
      data: { ...dto, workId: relatedWorkId, referenceId: data.id, referenceOrdinal: data.orderNumber ?? 1 },
    });

    const reference = this.dtoMapper.toEntity(response.updateReference as ReferenceDto);

    return reference;
  }

  async deleteReference(referenceId: string) {
    await this.graphqlService.mutation(DELETE_REFERENCE, {
      referenceId,
    });
  }

  async moveReference(referenceId: ReferenceId, newOrdinal: number): Promise<ReferenceEntity> {
    const response = await this.graphqlService.mutation(MOVE_REFERENCE, {
      referenceId,
      newOrdinal,
    });

    const reference = this.dtoMapper.toEntity(response.moveReference as ReferenceDto);

    return reference;
  }
}
