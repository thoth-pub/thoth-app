import type { QueryToken } from '@/src/shared/interfaces';
import { BaseService } from '@/src/shared/interfaces/services';

import { WorkId } from '../../work/model/work.types';
import { FundingDtoMapper } from '../model/funding.mapper';
import { CREATE_FUNDING, DELETE_FUNDING, UPDATE_FUNDING } from '../model/funding.schema';
import type { FundingDto, FundingEntity, FundingId } from '../model/funding.types';

export class FundingService extends BaseService<FundingEntity, FundingDto> {
  constructor(token: QueryToken, mapper = new FundingDtoMapper()) {
    super(token, mapper);
  }

  async createFunding({
    data,
    relatedWorkId,
  }: {
    data: Omit<FundingEntity, 'id' | 'institutionName' | 'institutionRor'>;
    relatedWorkId: WorkId;
  }): Promise<FundingEntity> {
    const { fundingId: _, ...dto } = this.dtoMapper.toDto({ ...data, id: '', institutionName: '', institutionRor: '' });

    const response = await this.graphqlService.mutation(CREATE_FUNDING, {
      data: { ...dto, workId: relatedWorkId, institutionId: data.institutionId },
    });

    const funding = this.dtoMapper.toEntity(response.createFunding as FundingDto);

    return funding;
  }

  async updateFunding({ data, relatedWorkId }: { data: FundingEntity; relatedWorkId: WorkId }): Promise<FundingEntity> {
    const { fundingId, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(UPDATE_FUNDING, {
      data: { ...dto, fundingId, workId: relatedWorkId, institutionId: data.institutionId },
    });

    const funding = this.dtoMapper.toEntity(response.updateFunding as FundingDto);

    return funding;
  }

  async deleteFunding({ fundingId }: { fundingId: FundingId }): Promise<void> {
    await this.graphqlService.mutation(DELETE_FUNDING, {
      fundingId,
    });
  }
}
