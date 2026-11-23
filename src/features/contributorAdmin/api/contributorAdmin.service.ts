import { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import { convertOrchidIdToText } from '@/src/shared/utils';

import {
  CONTRIBUTOR_ADMIN_COUNT,
  CONTRIBUTOR_ADMIN_CREDITS,
  CONTRIBUTOR_ADMIN_DELETE,
  CONTRIBUTOR_ADMIN_LIST,
  CONTRIBUTOR_ADMIN_REPOINT_CREDIT,
} from '../model/contributorAdmin.schema';
import type { AdminContributor, AdminCredit, MergePreview } from '../model/contributorAdmin.types';
import { previewMerge } from '../model/mergeContributor';

// APP-ADM-CONTRIB-01. The Thoth API remains the authorization boundary: every call here is
// made with the signed-in user's token and the page is only reachable to superusers.
export interface ContributorAdminApi {
  listContributors(filter: string, limit: number, offset: number): Promise<AdminContributor[]>;
  countContributors(filter: string): Promise<number>;
  getCredits(contributorId: string): Promise<AdminCredit[]>;
  repointCredit(credit: AdminCredit, targetContributorId: string): Promise<void>;
  deleteContributor(contributorId: string): Promise<void>;
}

export class ContributorAdminService implements ContributorAdminApi {
  private readonly pageSize = appConfig.data.itemsPerRequestLimit;

  constructor(private readonly graphqlService: GraphqlService) {}

  async listContributors(filter: string, limit: number, offset: number): Promise<AdminContributor[]> {
    const { contributors } = await this.graphqlService.query(CONTRIBUTOR_ADMIN_LIST, {
      filter: filter.trim(),
      limit,
      offset,
    });

    return contributors.map((contributor) => ({
      id: contributor.contributorId,
      fullName: contributor.fullName,
      firstName: contributor.firstName ?? '',
      lastName: contributor.lastName,
      orcid: contributor.orcid ? convertOrchidIdToText(contributor.orcid) : '',
      website: contributor.website ?? '',
    }));
  }

  async countContributors(filter: string): Promise<number> {
    const { contributorCount } = await this.graphqlService.query(CONTRIBUTOR_ADMIN_COUNT, { filter: filter.trim() });

    return contributorCount;
  }

  // Reads every credit page. Any failed page rejects the whole read: callers must never act on
  // a partial list, because an incomplete "no credits remain" answer would authorise a delete.
  async getCredits(contributorId: string): Promise<AdminCredit[]> {
    const credits: AdminCredit[] = [];
    let offset = 0;

    for (;;) {
      const { contributor } = await this.graphqlService.query(CONTRIBUTOR_ADMIN_CREDITS, {
        contributorId,
        limit: this.pageSize,
        offset,
      });

      if (!contributor) {
        throw new Error('Contributor not found');
      }

      const page = contributor.contributions;

      credits.push(
        ...page.map((credit) => ({
          contributionId: credit.contributionId,
          contributorId: credit.contributorId,
          workId: credit.workId,
          contributionType: credit.contributionType,
          mainContribution: credit.mainContribution,
          firstName: credit.firstName ?? null,
          lastName: credit.lastName,
          fullName: credit.fullName,
          contributionOrdinal: credit.contributionOrdinal,
          workTitle: (credit.work.titles.find((title) => title.canonical) ?? credit.work.titles[0])?.title ?? '',
          publisherName: credit.work.imprint.publisher.publisherName,
        })),
      );

      if (page.length < this.pageSize) return credits;
      offset += this.pageSize;
    }
  }

  // Changes only the contributor of the credit; every other field is sent back unchanged.
  async repointCredit(credit: AdminCredit, targetContributorId: string): Promise<void> {
    await this.graphqlService.mutation(CONTRIBUTOR_ADMIN_REPOINT_CREDIT, {
      data: {
        contributionId: credit.contributionId,
        workId: credit.workId,
        contributorId: targetContributorId,
        contributionType: credit.contributionType,
        mainContribution: credit.mainContribution,
        firstName: credit.firstName,
        lastName: credit.lastName,
        fullName: credit.fullName,
        contributionOrdinal: credit.contributionOrdinal,
      },
    });
  }

  previewMerge(sourceId: string, targetId: string): Promise<MergePreview> {
    return previewMerge(this, sourceId, targetId);
  }

  async deleteContributor(contributorId: string): Promise<void> {
    await this.graphqlService.mutation(CONTRIBUTOR_ADMIN_DELETE, { contributorId });
  }
}
