import type { BaseMapper } from '@/src/shared/interfaces';

import { FundingDto } from './funding.type';
import { FundingEntity } from './funding.type';

export class FundingDtoMapper implements BaseMapper<FundingEntity, FundingDto> {
  toEntity(dto: FundingDto): FundingEntity {
    const { fundingId, grantNumber, institutionId, jurisdiction, program, projectName, projectShortname } = dto;

    return {
      id: fundingId,
      grantNumber: grantNumber ?? '',
      institutionId,
      jurisdiction: jurisdiction ?? '',
      program: program ?? '',
      projectName: projectName ?? '',
      projectShortname: projectShortname ?? '',
    };
  }
}
