import type { BaseMapper } from '@/src/shared/interfaces';

import { TitleDtoMapper } from '../../title/model/title.mapper';
import { SetDto, SetEntity, SetWorkDto, SetWorkEntity } from './set.types';

const titleMapper = new TitleDtoMapper();

export class SetDtoMapper implements BaseMapper<SetEntity, SetDto> {
  toEntity(dto: SetDto): SetEntity {
    const { workId, workType, titles = [], updatedAt, imprintId, workStatus, edition, relations } = dto;

    const covers: string[] = [];

    for (const relation of relations) {
      const { coverUrl } = relation.relatedWork;

      if (!coverUrl || coverUrl.length === 0) continue;

      covers.push(coverUrl);
    }

    return {
      id: workId,
      type: workType,
      titles: titles.map(titleMapper.toEntity),
      updatedAt,
      imprintId,
      status: workStatus,
      edition: edition ?? 1,
      volumesCount: relations.length ?? 0,
      covers,
    };
  }

  toDto(entity: SetEntity): SetDto {
    const { id, type, titles, updatedAt, imprintId, status, edition } = entity;

    return {
      workId: id,
      workType: type,
      titles: titles.map(titleMapper.toDto),
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
      titles: titles.map(titleMapper.toEntity),
    }));
  }
}
