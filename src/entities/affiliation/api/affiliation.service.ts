import { BaseService } from '@/src/shared/interfaces/services';
import { AffiliationDtoMapper } from '../model/affiliation.mapper';
import type { AffiliationDto, AffiliationEntity } from '../model/affiliation.types';
import type { QueryToken } from '@/src/shared';
import { CREATE_AFFILIATION, DELETE_AFFILIATION, UPDATE_AFFILIATION } from '../model/affiliation.schema';

export class AffiliationService extends BaseService<AffiliationEntity, AffiliationDto> {
  constructor(mapper = new AffiliationDtoMapper()) {
    super(mapper);
  }

  async createAffiliation({ token, data }: { token: QueryToken; data: AffiliationEntity }): Promise<AffiliationEntity> {
    const dto = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, CREATE_AFFILIATION, {
      data: {
        contributionId: dto.contributionId,
        institutionId: dto.institutionId,
        affiliationOrdinal: dto.affiliationOrdinal ?? 1,
        position: dto.position,
      },
    });

    const affiliation = this.dtoMapper.toEntity(response.createAffiliation as AffiliationDto);

    return affiliation;
  }

  async updateAffiliation({ token, data }: { token: QueryToken; data: AffiliationEntity }) {
    const dto = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, UPDATE_AFFILIATION, {
      data: {
        affiliationId: dto.affiliationId ?? '',
        affiliationOrdinal: dto.affiliationOrdinal ?? 1,
        contributionId: dto.contributionId ?? '',
        institutionId: dto.institutionId ?? '',
        ...dto,
      },
    });

    const affiliation = this.dtoMapper.toEntity(response.updateAffiliation as AffiliationDto);

    return affiliation;
  }

  async deleteAffiliation({ token, affiliationId }: { token: QueryToken; affiliationId: string }) {
    const response = await this.graphqlService.mutation(token, DELETE_AFFILIATION, {
      affiliationId,
    });

    return response.deleteAffiliation;
  }
}
