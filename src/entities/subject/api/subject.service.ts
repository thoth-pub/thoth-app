import { SubjectType } from '@/gql/graphql';
import type { QueryToken } from '@/src/shared/interfaces';
import { BaseService } from '@/src/shared/interfaces/services';

import type { WorkId } from '../../work/model/work.types';
import { SubjectDtoMapper } from '../model/subject.mapper';
import { CREATE_SUBJECT, DELETE_SUBJECT, MOVE_SUBJECT, UPDATE_SUBJECT } from '../model/subject.mutations';
import type { SubjectDto, SubjectEntity, SubjectId } from '../model/subject.types';

export class SubjectService extends BaseService<SubjectEntity, SubjectDto> {
  constructor(token: QueryToken, mapper = new SubjectDtoMapper()) {
    super(token, mapper);
  }

  async createSubject(data: SubjectEntity, relatedWorkId: WorkId): Promise<SubjectEntity> {
    const { subjectId: _, subjectCode, subjectType, subjectOrdinal } = this.dtoMapper.toDto({ ...data, id: '' });

    const { createSubject } = await this.graphqlService.mutation(CREATE_SUBJECT, {
      data: {
        subjectCode: subjectCode ?? '',
        subjectType: subjectType ?? SubjectType.Custom,
        subjectOrdinal: subjectOrdinal ?? 1,
        workId: relatedWorkId,
      },
    });

    const result = this.dtoMapper.toEntity(createSubject as SubjectDto);

    return result;
  }

  async updateSubject(data: SubjectEntity, relatedWorkId: WorkId): Promise<SubjectEntity> {
    const { subjectId, subjectCode, subjectType, subjectOrdinal } = this.dtoMapper.toDto(data);

    const { updateSubject } = await this.graphqlService.mutation(UPDATE_SUBJECT, {
      data: {
        subjectId: subjectId ?? '',
        subjectCode: subjectCode ?? '',
        subjectType: subjectType ?? SubjectType.Custom,
        subjectOrdinal: subjectOrdinal ?? 1,
        workId: relatedWorkId,
      },
    });

    const result = this.dtoMapper.toEntity(updateSubject as SubjectDto);

    return result;
  }

  async deleteSubject(subjectId: SubjectId): Promise<void> {
    await this.graphqlService.mutation(DELETE_SUBJECT, {
      subjectId,
    });
  }

  async moveSubject(subjectId: SubjectId, newOrdinal: number): Promise<void> {
    await this.graphqlService.mutation(MOVE_SUBJECT, {
      subjectId,
      newOrdinal,
    });
  }
}
