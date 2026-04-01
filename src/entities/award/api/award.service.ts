import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import { isTextContainsAnyMarkdownTag } from '@/src/shared/utils';

import type { WorkId } from '../../work/model/work.types';
import { AwardDtoMapper } from '../model/award.mapper';
import { CREATE_AWARD, DELETE_AWARD, MOVE_AWARD, UPDATE_AWARD } from '../model/award.mutations';
import type { AwardDto, AwardEntity, AwardId } from '../model/award.types';

export class AwardService extends BaseService<AwardEntity, AwardDto, AwardDtoMapper> {
  constructor(graphqlService: GraphqlService, mapper = new AwardDtoMapper()) {
    super(graphqlService, mapper);
  }

  private getMarkupFormat(text: string) {
    return isTextContainsAnyMarkdownTag(text) ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
  }

  async createAward(data: AwardEntity, relatedWorkId: WorkId): Promise<AwardEntity> {
    const { awardId: _, ...dto } = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data.title);

    const response = await this.graphqlService.mutation(CREATE_AWARD, {
      data: { ...dto, workId: relatedWorkId, awardOrdinal: data.orderNumber ?? 1 },
      markupFormat,
    });

    const award = this.dtoMapper.toEntity(response.createAward as AwardDto);

    return award;
  }

  async updateAward(data: AwardEntity, relatedWorkId: WorkId): Promise<AwardEntity> {
    const dto = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data.title);

    const response = await this.graphqlService.mutation(UPDATE_AWARD, {
      data: { ...dto, workId: relatedWorkId, awardId: data.id, awardOrdinal: data.orderNumber ?? 1 },
      markupFormat,
    });

    const award = this.dtoMapper.toEntity(response.updateAward as AwardDto);

    return award;
  }

  async deleteAward(awardId: string) {
    await this.graphqlService.mutation(DELETE_AWARD, {
      awardId,
    });
  }

  async moveAward(awardId: AwardId, newOrdinal: number): Promise<AwardEntity> {
    const response = await this.graphqlService.mutation(MOVE_AWARD, {
      awardId,
      newOrdinal,
    });

    const award = this.dtoMapper.toEntity(response.moveAward as AwardDto);

    return award;
  }
}
