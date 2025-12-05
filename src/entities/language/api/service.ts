import { LanguageCode, LanguageRelation } from '@/gql/graphql';
import { QueryToken } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { WorkId } from '../../work/model/work.types';
import { LanguageDtoMapper } from '../model/language.mapper';
import { CREATE_LANGUAGE, DELETE_LANGUAGE, UPDATE_LANGUAGE } from '../model/language.schema';
import { LanguageEntity } from '../model/language.types';
import { LanguageDto } from '../model/language.types';

export class LanguageService extends BaseService<LanguageEntity, LanguageDto> {
  constructor(mapper = new LanguageDtoMapper()) {
    super(mapper);
  }

  async createLanguage(token: QueryToken, data: LanguageEntity, workId: WorkId): Promise<LanguageEntity> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { languageId, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, CREATE_LANGUAGE, {
      data: {
        ...dto,
        workId,
        languageCode: data.code as LanguageCode,
        languageRelation: data.relation as LanguageRelation,
        mainLanguage: data.isMain as boolean,
      },
    });

    const language = this.dtoMapper.toEntity(response.createLanguage as LanguageDto);

    return language;
  }

  async updateLanguage(token: QueryToken, data: LanguageEntity, workId: WorkId): Promise<LanguageEntity> {
    const dto = this.dtoMapper.toDto(data);

    await this.graphqlService.mutation(token, UPDATE_LANGUAGE, {
      data: {
        languageId: dto.languageId ?? '',
        languageCode: dto.languageCode as LanguageCode,
        languageRelation: dto.languageRelation as LanguageRelation,
        mainLanguage: dto.mainLanguage as boolean,
        workId,
      },
    });

    return data;
  }

  async deleteLanguage(token: QueryToken, languageId: string): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_LANGUAGE, {
      languageId,
    });
  }
}
