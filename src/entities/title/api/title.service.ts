import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import { TransactionContext } from '@/src/shared/services';
import type { TitleDto, TitleEntity } from '@/src/shared/types';
import { isTextContainsAnyMarkdownTag } from '@/src/shared/utils';

import type { WorkId } from '../../work/model/work.types';
import { TitleDtoMapper } from '../model/title.mapper';
import { CREATE_TITLE, DELETE_TITLE, UPDATE_TITLE } from '../model/title.mutations';

export class TitleService extends BaseService<TitleEntity, TitleDto, TitleDtoMapper> {
  constructor(graphqlService: GraphqlService, mapper = new TitleDtoMapper()) {
    super(graphqlService, mapper);
  }

  private getMarkupFormat(data: TitleEntity) {
    const hasMarkup = isTextContainsAnyMarkdownTag(data.title) || isTextContainsAnyMarkdownTag(data.subtitle);

    return hasMarkup ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
  }

  async createTitle(data: TitleEntity, relatedWorkId: WorkId): Promise<TitleEntity> {
    const { titleId: _, ...dto } = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data);

    const response = await this.graphqlService.mutation(CREATE_TITLE, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const title = this.dtoMapper.toEntity(response.createTitle as TitleDto);

    return title;
  }

  async updateTitle(data: TitleEntity, relatedWorkId: WorkId): Promise<TitleEntity> {
    const dto = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data);

    const response = await this.graphqlService.mutation(UPDATE_TITLE, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const title = this.dtoMapper.toEntity(response.updateTitle as TitleDto);

    return title;
  }

  async createTitles(
    titles: TitleEntity[],
    relatedWorkId: WorkId,
    transactions: TransactionContext,
  ): Promise<TitleEntity[]> {
    if (titles.length < 1) throw new Error('Must have at least one title');

    const results = await Promise.allSettled(titles.map((title) => this.createTitle(title, relatedWorkId)));

    const createdTitles = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const failed = results.find((r) => r.status === 'rejected');

    if (failed && createdTitles.length === 0) {
      await transactions.rollback();
      throw failed.reason;
    }

    return createdTitles;
  }

  async deleteTitle(titleId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_TITLE, {
      titleId,
    });
  }
}
