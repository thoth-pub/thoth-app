'use client';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import { Button, Typography } from '@/src/shared/ui';

type EditButtonProps = {
  isEmpty: boolean;
  isValueHighlighted: boolean;
  placeholder: string;
  onEdit: () => void;
};

const iconClassNames = 'opacity-0 transition duration-300 ease-in-out ml-1';

const EditButton = ({ isEmpty, isValueHighlighted, placeholder, onEdit }: EditButtonProps) => {
  const startIcon = isEmpty ? (
    <AddIcon fontSize="small" className={iconClassNames} />
  ) : (
    <EditIcon fontSize="small" className={iconClassNames} />
  );

  return (
    <Button onClick={onEdit} size="small" startIcon={startIcon} sx={{ minHeight: '1.5rem', minWidth: '1.5rem' }}>
      {isEmpty ? (
        <Typography variant="button" color={isValueHighlighted ? 'success' : 'primary'} className="capitalize">
          {placeholder.toLowerCase()}
        </Typography>
      ) : (
        ''
      )}
    </Button>
  );
};

export default EditButton;
