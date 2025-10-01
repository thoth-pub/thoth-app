'use client';
import AddIcon from '@mui/icons-material/Add';

import { ROUTES } from '@/src/shared/constants';
import { Button, Link } from '@/src/shared/ui';

const CreateNewWorkLink = () => {
  return (
    <Button startIcon={<AddIcon />} component={Link} href={ROUTES.NEW_WORK} variant="contained">
      New
    </Button>
  );
};

export default CreateNewWorkLink;
