import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import type { AbstractDto, AbstractEntity } from '@/src/shared/types';
import { isTextContainsAnyMarkdownTag } from '@/src/shared/utils';

import type { WorkId } from '../../work/model/work.types';
import { AbstractDtoMapper } from '../model/abstract.mapper';
import { CREATE_ABSTRACT, DELETE_ABSTRACT, UPDATE_ABSTRACT } from '../model/abstract.mutations';

export class AbstractService extends BaseService<AbstractEntity, AbstractDto, AbstractDtoMapper> {
  constructor(graphqlService: GraphqlService, mapper = new AbstractDtoMapper()) {
    super(graphqlService, mapper);
  }

  private getMarkupFormat(text: string) {
    return isTextContainsAnyMarkdownTag(text) ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
  }

  async createAbstract(data: AbstractEntity, relatedWorkId: WorkId): Promise<AbstractEntity> {
    const { abstractId: _, ...dto } = this.dtoMapper.toDto(data);

    // An imported abstract knows what format its source declared; content sniffing is only for
    // entities that carry no such provenance, i.e. everything created in the editor.
    const markupFormat = data.sourceMarkupFormat ?? this.getMarkupFormat(data.content);

    const response = await this.graphqlService.mutation(CREATE_ABSTRACT, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const abstract = this.dtoMapper.toEntity(response.createAbstract as AbstractDto);

    return abstract;
  }

  async updateAbstract(data: AbstractEntity, relatedWorkId: WorkId): Promise<AbstractEntity> {
    const dto = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data.content);

    const response = await this.graphqlService.mutation(UPDATE_ABSTRACT, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const abstract = this.dtoMapper.toEntity(response.updateAbstract as AbstractDto);

    return abstract;
  }

  async deleteAbstract(abstractId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_ABSTRACT, {
      abstractId,
    });
  }
}
