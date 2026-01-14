import type { BaseMapper } from '@/src/shared/interfaces';

import { WorkDtoMapper } from '../../work/model/work.mapper';
import { SetDto, SetEntity } from './set.types';

const workDtoMapper = new WorkDtoMapper();

export class SetDtoMapper implements BaseMapper<SetEntity, SetDto> {
  toEntity(dto: SetDto): SetEntity {
    const { workId, workType, titles = [], updatedAt } = dto;

    return {
      id: workId,
      type: workType,
      titles: titles.map(workDtoMapper.toEntityTitle),
      updatedAt,
    };
  }

  toDto(entity: SetEntity): Partial<SetDto> {
    const { id, type, titles, updatedAt } = entity;

    return {
      workId: id,
      workType: type,
      titles: titles.map(workDtoMapper.toDtoTitle),
      updatedAt,
    };
  }
}
