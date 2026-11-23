'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { AdminContributor, MergeOutcome } from '@/src/features/contributorAdmin/model/contributorAdmin.types';
import { mergeContributorInto } from '@/src/features/contributorAdmin/model/mergeContributor';
import { useServices } from '@/src/shared/context';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Button, Modal, ModalWrapper, TextField, Typography } from '@/src/shared/ui';

type Props = {
  duplicate: AdminContributor;
  onClose: () => void;
  onChanged: () => void;
};

const RESULT_KEY = {
  'credit-failed': 'resultCreditFailed',
  'credits-remain': 'resultCreditsRemain',
  'read-failed': 'resultReadFailed',
  'delete-failed': 'resultDeleteFailed',
} as const;

// APP-ADM-CONTRIB-01: pick the contributor to keep, review the credits that will move, confirm.
const ContributorMergeDialog = ({ duplicate, onClose, onChanged }: Props) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.contributorAdmin });
  const { contributorAdminService } = useServices();

  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState('');
  const [target, setTarget] = useState<AdminContributor | null>(null);
  const [moved, setMoved] = useState(0);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<MergeOutcome | null>(null);

  const candidates = useQuery({
    queryKey: ['contributorAdmin', 'mergeCandidates', filter],
    queryFn: () => contributorAdminService.listContributors(filter, 10, 0),
    enabled: filter.length > 0 && !target,
  });

  const preview = useQuery({
    queryKey: ['contributorAdmin', 'mergePreview', duplicate.id, target?.id],
    queryFn: () => contributorAdminService.previewMerge(duplicate.id, target?.id ?? ''),
    enabled: !!target && !outcome,
    gcTime: 0,
    staleTime: 0,
  });

  const run = async () => {
    if (!target) return;
    setRunning(true);
    setMoved(0);
    const result = await mergeContributorInto(contributorAdminService, duplicate.id, target.id, (credit) => {
      if (credit.status === 'moved') setMoved((count) => count + 1);
    });
    setOutcome(result);
    setRunning(false);
    onChanged();
  };

  const movedCount = outcome ? outcome.results.filter((result) => result.status === 'moved').length : moved;
  const conflicts = preview.data?.conflictingWorkIds.length ?? 0;

  return (
    <Modal open>
      <ModalWrapper onClickAway={running ? undefined : onClose}>
        <Typography variant="h2" component="h3">
          {t('mergeTitle')}
        </Typography>
        <Typography>
          {t('mergeDuplicate')}: <strong>{duplicate.fullName}</strong> {duplicate.orcid}
        </Typography>

        {!target ? (
          <>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setFilter(searchInput.trim());
              }}
            >
              <TextField
                size="small"
                fullWidth
                label={t('mergeSearchLabel')}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <Button type="submit">{t('searchAction')}</Button>
            </form>
            {(candidates.data ?? []).map((candidate) => (
              <div key={candidate.id} className="flex items-center justify-between gap-2">
                <Typography>
                  {candidate.fullName} {candidate.orcid}
                </Typography>
                {candidate.id === duplicate.id ? (
                  <Typography variant="caption">{t('mergeDifferent')}</Typography>
                ) : (
                  <Button onClick={() => setTarget(candidate)}>{t('mergeSelectKeep')}</Button>
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <Typography>
              {t('mergeKeep')}: <strong>{target.fullName}</strong> {target.orcid}
            </Typography>
            {!outcome && preview.isLoading && <Typography>{t('mergePreviewLoading')}</Typography>}
            {!outcome && preview.isError && <Typography color="error">{t('mergePreviewFailed')}</Typography>}
            {!outcome && preview.data && (
              <>
                <Typography>{t('mergeCredits', { count: preview.data.credits.length - conflicts })}</Typography>
                {conflicts > 0 && <Typography color="warning">{t('mergeConflicts', { count: conflicts })}</Typography>}
                <ul className="m-0 max-h-40 list-disc overflow-auto pl-5">
                  {preview.data.credits.map((credit) => (
                    <li key={credit.contributionId}>
                      {credit.workTitle} ({credit.publisherName})
                    </li>
                  ))}
                </ul>
                <Typography variant="caption">{t('mergeWarning')}</Typography>
              </>
            )}
            {running && <Typography>{t('mergeRunning', { count: movedCount })}</Typography>}
            {outcome?.state === 'deleted' && <Typography>{t('resultDeleted', { count: movedCount })}</Typography>}
            {outcome?.state === 'incomplete' && (
              <Typography color="error">{t(RESULT_KEY[outcome.reason], { count: movedCount })}</Typography>
            )}
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={running}>
            {outcome ? t('close') : t('cancel')}
          </Button>
          {target && !outcome && (
            <Button variant="contained" color="error" onClick={run} disabled={running || !preview.data}>
              {t('mergeConfirm')}
            </Button>
          )}
          {outcome?.state === 'incomplete' && (
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setOutcome(null);
                void run();
              }}
              disabled={running}
            >
              {t('mergeConfirm')}
            </Button>
          )}
        </div>
      </ModalWrapper>
    </Modal>
  );
};

export default ContributorMergeDialog;
