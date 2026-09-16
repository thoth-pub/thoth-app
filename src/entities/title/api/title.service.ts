import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import { TransactionContext } from '@/src/shared/services';
import type { PlannedTitleEntity, TitleDto, TitleEntity } from '@/src/shared/types';
import { isTextContainsAnyMarkdownTag } from '@/src/shared/utils';

import type { WorkId } from '../../work/model/work.types';
import { TitleDtoMapper } from '../model/title.mapper';
import { CREATE_TITLE, DELETE_TITLE, UPDATE_TITLE } from '../model/title.mutations';

export class TitleService extends BaseService<TitleEntity, TitleDto, TitleDtoMapper> {
  constructor(graphqlService: GraphqlService, mapper = new TitleDtoMapper()) {
    super(graphqlService, mapper);
  }

  private getMarkupFormat(data: TitleEntity | PlannedTitleEntity) {
    // An imported title carries the format its plan decided for the whole row; only an editor title is read for tags.
    if ('sourceMarkupFormat' in data) return data.sourceMarkupFormat;

    const hasMarkup = isTextContainsAnyMarkdownTag(data.title) || isTextContainsAnyMarkdownTag(data.subtitle);

    return hasMarkup ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
  }

  async createTitle(data: TitleEntity | PlannedTitleEntity, relatedWorkId: WorkId): Promise<TitleEntity> {
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

  /**
   * Creates every planned title of a work, or fails the title stage: a work never counts as created with only some
   * of its titles. Titles are created concurrently, but every sibling is awaited, so each title that was created
   * belongs to the transaction before it rolls back, and a later stage's rollback removes it too. The error is the
   * first failure in plan order; a failure while rolling back is logged by the transaction and never replaces it.
   * A work with no title to create fails the stage the same way, so the stage rolls back every failure it raises.
   */
  async createTitles(
    titles: readonly (TitleEntity | PlannedTitleEntity)[],
    relatedWorkId: WorkId,
    transactions: TransactionContext,
  ): Promise<TitleEntity[]> {
    if (titles.length < 1) {
      await transactions.rollback();
      throw new Error('Must have at least one title');
    }

    const results = await Promise.allSettled(titles.map((title) => this.createTitle(title, relatedWorkId)));
    const createdTitles = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

    createdTitles.forEach((created) => transactions.onRollback(() => this.deleteTitle(created.id)));

    const failed = results.find((result) => result.status === 'rejected');

    if (failed !== undefined) {
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
