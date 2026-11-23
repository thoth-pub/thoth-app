'use client';

import { useState } from 'react';

import { useUpdateContributor } from '@/src/entities/contributor';
import { contributorFormValidationSchema } from '@/src/entities/contributor/model/contributor.validation';
import type { AdminContributor } from '@/src/features/contributorAdmin/model/contributorAdmin.types';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Button, Modal, ModalWrapper, TextField, Typography } from '@/src/shared/ui';

type Props = {
  contributor: AdminContributor;
  onClose: () => void;
  onSaved: () => void;
};

// Edits the shared Contributor record (names, ORCID, website) through the existing
// `updateContributor` path. Per-work credit names are not touched here.
const ContributorEditDialog = ({ contributor, onClose, onSaved }: Props) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.contributorAdmin });
  const [values, setValues] = useState({
    fullName: contributor.fullName,
    firstName: contributor.firstName,
    lastName: contributor.lastName,
    orcid: contributor.orcid,
    websiteUrl: contributor.website,
  });
  const [error, setError] = useState<string | null>(null);

  const { updateContributor, loading } = useUpdateContributor({
    onCompleted: () => onSaved(),
    onError: () => setError(t('saveFailed')),
  });

  const change = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));

  const save = () => {
    setError(null);
    const parsed = contributorFormValidationSchema.safeParse(values);
    if (!parsed.success) {
      setError(t('invalidForm'));
      return;
    }

    updateContributor({
      id: contributor.id,
      name: values.fullName,
      fullName: values.fullName,
      firstName: values.firstName,
      lastName: values.lastName,
      orcid: values.orcid,
      website: values.websiteUrl,
      updatedAt: '',
      lastContributionTitle: '',
    });
  };

  return (
    <Modal open>
      <ModalWrapper onClickAway={onClose}>
        <Typography variant="h2" component="h3">
          {t('editTitle')}
        </Typography>
        <TextField label={t('fullName')} value={values.fullName} onChange={change('fullName')} required />
        <TextField label={t('firstName')} value={values.firstName} onChange={change('firstName')} />
        <TextField label={t('lastName')} value={values.lastName} onChange={change('lastName')} required />
        <TextField label={t('orcid')} value={values.orcid} onChange={change('orcid')} />
        <TextField label={t('website')} value={values.websiteUrl} onChange={change('websiteUrl')} />
        {error && <Typography color="error">{error}</Typography>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button variant="contained" onClick={save} disabled={loading}>
            {t('save')}
          </Button>
        </div>
      </ModalWrapper>
    </Modal>
  );
};

export default ContributorEditDialog;
