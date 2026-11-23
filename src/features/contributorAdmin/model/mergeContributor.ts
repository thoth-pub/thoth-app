import type { ContributorAdminApi } from '../api/contributorAdmin.service';
import type { MergeCreditResult, MergeOutcome, MergePreview } from './contributorAdmin.types';

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown error');

// Credits of the duplicate whose work already credits the survivor. Moving them would give one
// person two credits on one work, so they are left for a manual decision.
export const previewMerge = async (
  api: ContributorAdminApi,
  sourceId: string,
  targetId: string,
): Promise<MergePreview> => {
  const [credits, targetCredits] = await Promise.all([api.getCredits(sourceId), api.getCredits(targetId)]);
  const targetWorkIds = new Set(targetCredits.map((credit) => credit.workId));
  const conflictingWorkIds = Array.from(
    new Set(credits.filter((c) => targetWorkIds.has(c.workId)).map((c) => c.workId)),
  );

  return { credits, conflictingWorkIds };
};

// APP-ADM-CONTRIB-01: move every credit of `sourceId` to `targetId`, then delete the empty
// duplicate. This is NOT atomic. The rules that keep a failure safe:
//  - state is always re-read from the API, so running it again on the same pair resumes;
//  - it stops at the first failed credit and never deletes after any error or unknown state;
//  - the delete (which cascades to credits in the database) is only called after a fresh,
//    complete read shows zero credits. A credit added in the instant between that read and the
//    delete would still be lost; that race is accepted for this rarely used superuser tool.
export const mergeContributorInto = async (
  api: ContributorAdminApi,
  sourceId: string,
  targetId: string,
  onProgress?: (result: MergeCreditResult) => void,
): Promise<MergeOutcome> => {
  const results: MergeCreditResult[] = [];

  if (!sourceId || !targetId || sourceId === targetId) {
    return { state: 'incomplete', reason: 'read-failed', results, error: 'Choose two different contributors' };
  }

  let preview: MergePreview;
  try {
    preview = await previewMerge(api, sourceId, targetId);
  } catch (error) {
    return { state: 'incomplete', reason: 'read-failed', results, error: messageOf(error) };
  }

  const conflicts = new Set(preview.conflictingWorkIds);

  for (const credit of preview.credits) {
    if (conflicts.has(credit.workId)) {
      const skipped: MergeCreditResult = {
        contributionId: credit.contributionId,
        workId: credit.workId,
        status: 'skipped',
      };
      results.push(skipped);
      onProgress?.(skipped);
      continue;
    }

    try {
      await api.repointCredit(credit, targetId);
      const moved: MergeCreditResult = {
        contributionId: credit.contributionId,
        workId: credit.workId,
        status: 'moved',
      };
      results.push(moved);
      onProgress?.(moved);
    } catch (error) {
      const failed: MergeCreditResult = {
        contributionId: credit.contributionId,
        workId: credit.workId,
        status: 'failed',
        error: messageOf(error),
      };
      results.push(failed);
      onProgress?.(failed);

      return { state: 'incomplete', reason: 'credit-failed', results, error: failed.error };
    }
  }

  let remaining;
  try {
    remaining = await api.getCredits(sourceId);
  } catch (error) {
    return { state: 'incomplete', reason: 'read-failed', results, error: messageOf(error) };
  }

  if (remaining.length > 0) {
    return { state: 'incomplete', reason: 'credits-remain', results };
  }

  try {
    await api.deleteContributor(sourceId);
  } catch (error) {
    return { state: 'incomplete', reason: 'delete-failed', results, error: messageOf(error) };
  }

  return { state: 'deleted', results };
};
