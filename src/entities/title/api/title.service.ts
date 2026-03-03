import { MarkdownFormats } from '@/src/shared/constants/markdown';
import type { QueryToken } from '@/src/shared/interfaces';
import { BaseService } from '@/src/shared/interfaces/services';
import type { TitleDto, TitleEntity } from '@/src/shared/types';
import { isTextContainsAnyMarkdownTag } from '@/src/shared/utils';

import type { WorkId } from '../../work/model/work.types';
import { TitleDtoMapper } from '../model/title.mapper';
import { CREATE_TITLE, DELETE_TITLE, UPDATE_TITLE } from '../model/title.mutations';

export class TitleService extends BaseService<TitleEntity, TitleDto, TitleDtoMapper> {
  constructor(token: QueryToken, mapper = new TitleDtoMapper()) {
    super(token, mapper);
  }

  private getMarkupFormat(text: string) {
    return isTextContainsAnyMarkdownTag(text) ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
  }

  async createTitle(data: TitleEntity, relatedWorkId: WorkId): Promise<TitleEntity> {
    const { titleId: _, ...dto } = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data.title);

    const response = await this.graphqlService.mutation(CREATE_TITLE, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const title = this.dtoMapper.toEntity(response.createTitle as TitleDto);

    return title;
  }

  async updateTitle(data: TitleEntity, relatedWorkId: WorkId): Promise<TitleEntity> {
    const dto = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data.title);

    const response = await this.graphqlService.mutation(UPDATE_TITLE, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const title = this.dtoMapper.toEntity(response.updateTitle as TitleDto);

    return title;
  }

  async deleteTitle(titleId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_TITLE, {
      titleId,
    });
  }
}
