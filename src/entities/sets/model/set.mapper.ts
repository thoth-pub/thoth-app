import type { BaseMapper } from '@/src/shared/interfaces';

import { WorkDtoMapper } from '../../work/model/work.mapper';
import { SetDto, SetEntity, SetWorkDto, SetWorkEntity } from './set.types';

const workDtoMapper = new WorkDtoMapper();

export class SetDtoMapper implements BaseMapper<SetEntity, SetDto> {
  toEntity(dto: SetDto): SetEntity {
    const { workId, workType, titles = [], updatedAt, imprintId, workStatus, edition, relations } = dto;

    return {
      id: workId,
      type: workType,
      titles: titles.map(workDtoMapper.toEntityTitle),
      updatedAt,
      imprintId,
      status: workStatus,
      edition: edition ?? 1,
      volumesCount: relations.length ?? 0,
    };
  }

  toDto(entity: SetEntity): SetDto {
    const { id, type, titles, updatedAt, imprintId, status, edition } = entity;

    return {
      workId: id,
      workType: type,
      titles: titles.map(workDtoMapper.toDtoTitle),
      updatedAt,
      imprintId,
      workStatus: status,
      edition,
      relations: [],
    };
  }

  toEntitySetWorks(dto: SetWorkDto): SetWorkEntity[] {
    const { relations } = dto;

    return relations.map(({ workRelationId, relatedWorkId, relationOrdinal, relatedWork: { titles } }) => ({
      id: workRelationId,
      workId: relatedWorkId,
      ordinal: relationOrdinal,
      titles: titles.map(workDtoMapper.toEntityTitle),
    }));
  }
}
