import { SubjectType } from '@/gql/graphql';
import { BaseService } from '@/src/shared/interfaces/services';

import type { WorkId } from '../../work/model/work.types';
import { SubjectDtoMapper } from '../model/subject.mapper';
import { CREATE_SUBJECT, DELETE_SUBJECT, UPDATE_SUBJECT } from '../model/subject.schema';
import type { SubjectEntity, SubjectId } from '../model/subject.types';
import type { SubjectDto } from '../model/subject.types';

export class SubjectService extends BaseService<SubjectEntity, SubjectDto> {
  constructor(mapper = new SubjectDtoMapper()) {
    super(mapper);
  }

  async createSubject(token: string, data: SubjectEntity, relatedWorkId: WorkId): Promise<SubjectEntity> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { subjectId, subjectCode, subjectType, subjectOrdinal } = this.dtoMapper.toDto({ ...data, id: '' });

    const { createSubject } = await this.graphqlService.mutation(token, CREATE_SUBJECT, {
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

  async updateSubject(token: string, data: SubjectEntity, relatedWorkId: WorkId): Promise<SubjectEntity> {
    const { subjectId, subjectCode, subjectType, subjectOrdinal } = this.dtoMapper.toDto(data);

    const { updateSubject } = await this.graphqlService.mutation(token, UPDATE_SUBJECT, {
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

  async deleteSubject(token: string, subjectId: SubjectId): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_SUBJECT, {
      subjectId,
    });
  }
}
