'use client';
import AddIcon from '@mui/icons-material/Add';

import { Button, Link } from '@/components';
import { ROUTES } from '@/constants';

const NewWorkLink = () => {
  return (
    <Button startIcon={<AddIcon />} component={Link} href={ROUTES.NEW_WORK} variant="contained">
      New
    </Button>
  );
};

export default NewWorkLink;
