import { LanguageCode, LanguageRelation } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import { WorkId } from '../../work/model/work.types';
import { LanguageDtoMapper } from '../model/language.mapper';
import { CREATE_LANGUAGE, DELETE_LANGUAGE, UPDATE_LANGUAGE } from '../model/language.schema';
import { LanguageDto, LanguageEntity } from '../model/language.types';

export class LanguageService extends BaseService<LanguageEntity, LanguageDto> {
  constructor(graphqlService: GraphqlService, mapper = new LanguageDtoMapper()) {
    super(graphqlService, mapper);
  }

  async createLanguage(data: LanguageEntity, workId: WorkId): Promise<LanguageEntity> {
    const { languageId: _, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_LANGUAGE, {
      data: {
        ...dto,
        workId,
        languageCode: data.code as LanguageCode,
        languageRelation: data.relation as LanguageRelation,
        mainLanguage: true,
      },
    });

    const language = this.dtoMapper.toEntity(response.createLanguage as LanguageDto);

    return language;
  }

  async updateLanguage(data: LanguageEntity, workId: WorkId): Promise<LanguageEntity> {
    const dto = this.dtoMapper.toDto(data);

    await this.graphqlService.mutation(UPDATE_LANGUAGE, {
      data: {
        languageId: dto.languageId ?? '',
        languageCode: dto.languageCode as LanguageCode,
        languageRelation: dto.languageRelation as LanguageRelation,
        mainLanguage: true,
        workId,
      },
    });

    return data;
  }

  async deleteLanguage(languageId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_LANGUAGE, {
      languageId,
    });
  }
}
