import type { CurrencyCode, LocaleCode } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import { BaseService } from '@/src/shared/interfaces/services';
import { emptyToNull } from '@/src/shared/utils/strings';

import { ImprintDtoMapper } from '../model/imprint.mapper';
import { CREATE_IMPRINT, DELETE_IMPRINT, UPDATE_IMPRINT } from '../model/imprint.mutations';
import { GET_IMPRINTS, GET_IMPRINTS_COUNT } from '../model/imprint.schema';
import type { ImprintDto, ImprintEntity, ImprintId } from '../model/imprint.types';

const { itemsPerRequestLimit, maxImprintsPerRequestLimit } = appConfig.data;

type GetImprintsProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
};

export class ImprintService extends BaseService<ImprintEntity, ImprintDto, ImprintDtoMapper> {
  constructor(graphqlService: GraphqlService, mapper = new ImprintDtoMapper()) {
    super(graphqlService, mapper);
  }

  async getImprintsCount(publishersIds: PublisherId[]): Promise<number> {
    const { imprintCount = 0 } = await this.graphqlService.query(GET_IMPRINTS_COUNT, {
      publishers: publishersIds,
    });

    return imprintCount;
  }

  async getImprints({
    publishersIds,
    offset = 0,
    limit = itemsPerRequestLimit,
  }: GetImprintsProps): Promise<ImprintEntity[]> {
    const { imprints = [] } = await this.graphqlService.query(GET_IMPRINTS, {
      offset,
      limit,
      publishers: publishersIds,
    });

    const res = imprints.map(this.dtoMapper.toEntity);

    return res;
  }

  async getPublisherImprints(publisherId: PublisherId): Promise<ImprintEntity[]> {
    const result = await this.getImprints({
      publishersIds: [publisherId],
      offset: 0,
      limit: maxImprintsPerRequestLimit,
    });

    return result;
  }

  async createImprint(data: { publisherId: PublisherId; imprintName: string }) {
    await this.graphqlService.mutation(CREATE_IMPRINT, { data });
  }

  async updateImprint(
    data: {
      name: string;
      id: ImprintId;
      url?: string;
      crossmarkDoi?: string;
      defaultPlace?: string;
      defaultCurrency?: CurrencyCode;
      defaultLocale?: LocaleCode;
      s3Bucket?: string;
      cdnDomain?: string;
      cloudfrontDistId?: string;
    },
    publisherId: PublisherId,
  ) {
    const { name, id, url, crossmarkDoi, defaultPlace, defaultCurrency, defaultLocale, s3Bucket, cdnDomain, cloudfrontDistId } = data;

    const result = await this.graphqlService.mutation(UPDATE_IMPRINT, {
      data: {
        imprintName: name,
        imprintId: id,
        publisherId,
        imprintUrl: emptyToNull(url),
        crossmarkDoi: emptyToNull(crossmarkDoi),
        defaultPlace: emptyToNull(defaultPlace),
        defaultCurrency: emptyToNull(defaultCurrency) as CurrencyCode | null,
        defaultLocale: emptyToNull(defaultLocale) as LocaleCode | null,
        s3Bucket: emptyToNull(s3Bucket),
        cdnDomain: emptyToNull(cdnDomain),
        cloudfrontDistId: emptyToNull(cloudfrontDistId),
      },
    });

    const imprint = this.dtoMapper.toEntity(result.updateImprint as ImprintDto);

    return imprint;
  }

  async deleteImprint(imprintId: ImprintId) {
    await this.graphqlService.mutation(DELETE_IMPRINT, { imprintId });
  }
}
