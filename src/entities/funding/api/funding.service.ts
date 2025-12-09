import type { QueryToken } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { WorkId } from '../../work/model/work.types';
import { FundingDtoMapper } from '../model/funding.mapper';
import { CREATE_FUNDING, DELETE_FUNDING, UPDATE_FUNDING } from '../model/funding.schema';
import type { FundingDto, FundingEntity, FundingId } from '../model/funding.types';

export class FundingService extends BaseService<FundingEntity, FundingDto> {
  constructor(mapper = new FundingDtoMapper()) {
    super(mapper);
  }

  async createFunding({
    token,
    data,
    relatedWorkId,
  }: {
    token: QueryToken;
    data: Omit<FundingEntity, 'id' | 'institutionName' | 'institutionRor'>;
    relatedWorkId: WorkId;
  }): Promise<FundingEntity> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fundingId, ...dto } = this.dtoMapper.toDto({ ...data, id: '', institutionName: '', institutionRor: '' });

    const response = await this.graphqlService.mutation(token, CREATE_FUNDING, {
      data: { ...dto, workId: relatedWorkId, institutionId: data.institutionId },
    });

    const funding = this.dtoMapper.toEntity(response.createFunding as FundingDto);

    return funding;
  }

  async updateFunding({
    token,
    data,
    relatedWorkId,
  }: {
    token: QueryToken;
    data: FundingEntity;
    relatedWorkId: WorkId;
  }): Promise<FundingEntity> {
    const { fundingId, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, UPDATE_FUNDING, {
      data: { ...dto, fundingId, workId: relatedWorkId, institutionId: data.institutionId },
    });

    const funding = this.dtoMapper.toEntity(response.updateFunding as FundingDto);

    return funding;
  }

  async deleteFunding({ token, fundingId }: { token: QueryToken; fundingId: FundingId }): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_FUNDING, {
      fundingId,
    });
  }
}
