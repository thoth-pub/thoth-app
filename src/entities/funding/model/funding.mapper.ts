import type { BaseMapper } from '@/src/shared/interfaces';

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
      grantNumber: grantNumber && grantNumber.length > 0 ? grantNumber : null,
      institutionId,
      program: program && program.length > 0 ? program : null,
      projectName: projectName && projectName.length > 0 ? projectName : null,
      projectShortname: projectShortname && projectShortname.length > 0 ? projectShortname : null,
    };
  }
}
