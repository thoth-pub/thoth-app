'use client';

import { Typography } from '@mui/material';
import { Activity } from 'react';

import {
  EditContact,
  EditName,
  EditReport,
  EditShortname,
  EditStatement,
  EditUrl,
  EditZitadelId,
  PublisherServiceConfiguration,
} from '@/src/entities/publisher';
import { useUser } from '@/src/entities/user';
import { ImprintsList } from '@/src/features';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { ContentSection, TranslatedContent } from '@/src/shared/ui';

const Profile = () => {
  const { user } = useUser();
  const isSettingsDisabled = !user.isSuperuser;

  return (
    <>
      <ContentSection>
        <Typography component="h1" variant="h1" className="pl-4">
          <TranslatedContent content="publisher" namespace={NAMESPACES.enum.navigation} />
        </Typography>
      </ContentSection>
      <ContentSection>
        <Typography component="h2" variant="h2" className="pl-4">
          <TranslatedContent content="settings" namespace={NAMESPACES.enum.profile} />
        </Typography>
        <EditName isDisabled={isSettingsDisabled} />
        <EditShortname isDisabled={isSettingsDisabled} />
        <EditUrl isDisabled={isSettingsDisabled} />
        <Activity mode={isSettingsDisabled ? 'hidden' : 'visible'}>
          <EditZitadelId isDisabled={isSettingsDisabled} />
        </Activity>
      </ContentSection>
      <ContentSection>
        <Typography component="h2" variant="h2" className="pl-4">
          <TranslatedContent content="serviceConfiguration" namespace={NAMESPACES.enum.profile} />
        </Typography>
        <PublisherServiceConfiguration />
      </ContentSection>
      <ContentSection>
        <Typography component="h2" variant="h2" className="pl-4">
          <TranslatedContent content="imprints" />
        </Typography>
        <ImprintsList />
      </ContentSection>
      <ContentSection>
        <Typography component="h2" variant="h2" className="pl-4">
          <TranslatedContent content="accessibility.accessibility" namespace={NAMESPACES.enum.forms} />
        </Typography>
        <EditContact />
        <EditReport />
        <EditStatement />
      </ContentSection>
    </>
  );
};

export default Profile;
