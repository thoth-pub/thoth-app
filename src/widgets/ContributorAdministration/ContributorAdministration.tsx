'use client';

import { useState } from 'react';

import type { AdminContributor } from '@/src/features/contributorAdmin/model/contributorAdmin.types';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  Button,
  ContentSection,
  Pagination,
  Skeleton,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableWrapper,
  TextField,
  Typography,
} from '@/src/shared/ui';

import ContributorEditDialog from './ContributorEditDialog';
import ContributorMergeDialog from './ContributorMergeDialog';
import useContributorAdministration from './useContributorAdministration';

// APP-ADM-CONTRIB-01: superuser administration of the shared Contributor records. The Thoth API
// is the authorization boundary; this widget starts no read or write unless the viewer's identity
// is authoritative and is a superuser.
const ContributorAdministration = () => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.contributorAdmin });
  const {
    viewState,
    searchInput,
    setSearchInput,
    search,
    page,
    setPage,
    contributors,
    isLoading,
    loadFailed,
    totalCount,
    countFailed,
    totalPages,
    refetch,
  } = useContributorAdministration();

  const [editing, setEditing] = useState<AdminContributor | null>(null);
  const [merging, setMerging] = useState<AdminContributor | null>(null);

  if (viewState === 'identityPending') {
    return (
      <ContentSection>
        <Skeleton variant="rounded" height={96} />
      </ContentSection>
    );
  }

  if (viewState === 'notAuthorized') {
    return (
      <ContentSection>
        <Typography>{t('notAuthorized')}</Typography>
      </ContentSection>
    );
  }

  return (
    <ContentSection>
      <Typography variant="h1">{t('title')}</Typography>
      <Typography>{t('intro')}</Typography>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <TextField
          size="small"
          label={t('searchLabel')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button type="submit">{t('searchAction')}</Button>
      </form>

      {countFailed ? (
        <Typography>{t('countUnavailable')}</Typography>
      ) : (
        totalCount !== undefined && (
          <Typography>
            {totalCount} {t('matching')}
          </Typography>
        )
      )}

      {loadFailed && <Typography color="error">{t('loadFailed')}</Typography>}
      {isLoading && <Skeleton variant="rounded" height={160} />}
      {!isLoading && !loadFailed && contributors.length === 0 && <Typography>{t('empty')}</Typography>}

      {contributors.length > 0 && (
        <TableWrapper>
          <TableHead>
            <TableRow>
              <TableCell>{t('nameColumn')}</TableCell>
              <TableCell>{t('orcidColumn')}</TableCell>
              <TableCell>{t('websiteColumn')}</TableCell>
              <TableCell>{t('actionsColumn')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contributors.map((contributor) => (
              <TableRow key={contributor.id}>
                <TableCell>{contributor.fullName}</TableCell>
                <TableCell>{contributor.orcid}</TableCell>
                <TableCell>{contributor.website}</TableCell>
                <TableCell>
                  <Button
                    aria-label={`${t('editAction')} ${contributor.fullName}`}
                    onClick={() => setEditing(contributor)}
                  >
                    {t('editAction')}
                  </Button>
                  <Button
                    aria-label={`${t('mergeAction')} ${contributor.fullName}`}
                    onClick={() => setMerging(contributor)}
                  >
                    {t('mergeAction')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrapper>
      )}

      {totalPages > 1 && <Pagination count={totalPages} page={page} onChange={(_event, value) => setPage(value)} />}

      {editing && (
        <ContributorEditDialog
          contributor={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
      {merging && <ContributorMergeDialog duplicate={merging} onClose={() => setMerging(null)} onChanged={refetch} />}
    </ContentSection>
  );
};

export default ContributorAdministration;
