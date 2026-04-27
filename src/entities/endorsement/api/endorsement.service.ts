import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import { isTextContainsAnyMarkdownTag } from '@/src/shared/utils';

import type { WorkId } from '../../work/model/work.types';
import { EndorsementDtoMapper } from '../model/endorsement.mapper';
import {
  CREATE_ENDORSEMENT,
  DELETE_ENDORSEMENT,
  MOVE_ENDORSEMENT,
  UPDATE_ENDORSEMENT,
} from '../model/endorsement.mutations';
import type { EndorsementDto, EndorsementEntity, EndorsementId } from '../model/endorsement.types';

export class EndorsementService extends BaseService<EndorsementEntity, EndorsementDto> {
  constructor(graphqlService: GraphqlService, mapper = new EndorsementDtoMapper()) {
    super(graphqlService, mapper);
  }

  private getMarkupFormat(data: EndorsementEntity) {
    const hasMarkup = isTextContainsAnyMarkdownTag(data.text) || isTextContainsAnyMarkdownTag(data.authorRole);

    return hasMarkup ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
  }

  async createEndorsement(data: EndorsementEntity, relatedWorkId: WorkId): Promise<EndorsementEntity> {
    const { endorsementId: _, ...dto } = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data);

    const response = await this.graphqlService.mutation(CREATE_ENDORSEMENT, {
      data: { ...dto, workId: relatedWorkId, endorsementOrdinal: data.orderNumber ?? 1 },
      markupFormat,
    });

    const endorsement = this.dtoMapper.toEntity(response.createEndorsement as EndorsementDto);

    return endorsement;
  }

  async updateEndorsement(data: EndorsementEntity, relatedWorkId: WorkId): Promise<EndorsementEntity> {
    const dto = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(data);

    const response = await this.graphqlService.mutation(UPDATE_ENDORSEMENT, {
      data: { ...dto, workId: relatedWorkId, endorsementId: data.id, endorsementOrdinal: data.orderNumber ?? 1 },
      markupFormat,
    });

    const endorsement = this.dtoMapper.toEntity(response.updateEndorsement as EndorsementDto);

    return endorsement;
  }

  async deleteEndorsement(endorsementId: string) {
    await this.graphqlService.mutation(DELETE_ENDORSEMENT, {
      endorsementId,
    });
  }

  async moveEndorsement(endorsementId: EndorsementId, newOrdinal: number): Promise<EndorsementEntity> {
    const response = await this.graphqlService.mutation(MOVE_ENDORSEMENT, {
      endorsementId,
      newOrdinal,
    });

    const endorsement = this.dtoMapper.toEntity(response.moveEndorsement as EndorsementDto);

    return endorsement;
  }
}
