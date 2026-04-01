import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import { AffiliationDtoMapper } from '../model/affiliation.mapper';
import {
  CREATE_AFFILIATION,
  DELETE_AFFILIATION,
  MOVE_AFFILIATION,
  UPDATE_AFFILIATION,
} from '../model/affiliation.mutations';
import type { AffiliationDto, AffiliationEntity } from '../model/affiliation.types';

export class AffiliationService extends BaseService<AffiliationEntity, AffiliationDto> {
  constructor(graphqlService: GraphqlService, mapper = new AffiliationDtoMapper()) {
    super(graphqlService, mapper);
  }

  async createAffiliation(data: AffiliationEntity): Promise<AffiliationEntity> {
    const dto = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_AFFILIATION, {
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

  async updateAffiliation(data: AffiliationEntity) {
    const dto = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(UPDATE_AFFILIATION, {
      data: {
        ...dto,
        affiliationId: dto.affiliationId ?? '',
        affiliationOrdinal: dto.affiliationOrdinal ?? 1,
        contributionId: dto.contributionId ?? '',
        institutionId: dto.institutionId ?? '',
      },
    });

    const affiliation = this.dtoMapper.toEntity(response.updateAffiliation as AffiliationDto);

    return affiliation;
  }

  async deleteAffiliation(affiliationId: string) {
    const response = await this.graphqlService.mutation(DELETE_AFFILIATION, {
      affiliationId,
    });

    return response.deleteAffiliation;
  }

  async moveAffiliation({ affiliationId, newOrdinal }: { affiliationId: string; newOrdinal: number }) {
    return await this.graphqlService.mutation(MOVE_AFFILIATION, { affiliationId, newOrdinal });
  }
}
