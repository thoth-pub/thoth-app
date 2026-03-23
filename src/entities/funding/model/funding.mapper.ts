import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import { FundingDto, FundingEntity } from './funding.types';

export class FundingDtoMapper implements BaseMapper<FundingEntity, FundingDto> {
  toEntity(dto: FundingDto): FundingEntity {
    const {
      fundingId,
      grantNumber,
      institutionId,
      program,
      projectName,
      projectShortname,
      institution: { institutionName = '', ror = '' },
    } = dto;

    return {
      id: fundingId,
      grantNumber: grantNumber ?? '',
      institutionId,
      program: program ?? '',
      projectName: projectName ?? '',
      projectShortname: projectShortname ?? '',
      institutionName,
      institutionRor: ror,
    };
  }

  toDto(entity: FundingEntity): Omit<FundingDto, 'institution'> & { institutionId: string } {
    const { id, grantNumber, institutionId, program, projectName, projectShortname } = entity;

    return {
      fundingId: id,
      grantNumber: emptyToNull(grantNumber),
      institutionId,
      program: emptyToNull(program),
      projectName: emptyToNull(projectName),
      projectShortname: emptyToNull(projectShortname),
    };
  }
}
