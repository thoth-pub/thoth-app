import { Typography } from '@mui/material';

import { EditContact, EditReport, EditStatement } from '@/src/entities/publisher';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { InputLabel, TranslatedContent } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

const Profile = () => {
  return (
    <>
      <ContentSection>
        <Typography component="h1" variant="h1" className="pl-4">
          <TranslatedContent content="profile" namespace={NAMESPACES.enum.navigation} />
        </Typography>
      </ContentSection>
      <ContentSection>
        <Typography component="h2" variant="h2" className="pl-4">
          <TranslatedContent content="settings" namespace={NAMESPACES.enum.profile} />
        </Typography>
        <InputLabel className="pl-4">
          <TranslatedContent content="language" namespace={NAMESPACES.enum.profile} />
        </InputLabel>
        <InputLabel className="pl-4">
          <TranslatedContent content="currency" namespace={NAMESPACES.enum.profile} />
        </InputLabel>
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
