import { Typography } from '@mui/material';

import { EditContact, EditReport, EditStatement } from '@/src/entities/publisher';
import { InputLabel } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

const Profile = () => {
  return (
    <>
      <ContentSection>
        <Typography component="h1" variant="h1">
          Profile
        </Typography>
      </ContentSection>
      <ContentSection>
        <Typography component="h2" variant="h2">
          Settings
        </Typography>
        <InputLabel>Language</InputLabel>
        <InputLabel>Currency</InputLabel>
      </ContentSection>
      <ContentSection>
        <Typography component="h2" variant="h2">
          Accessibility
        </Typography>
        <EditContact />
        <EditReport />
        <EditStatement />
      </ContentSection>
    </>
  );
};

export default Profile;
