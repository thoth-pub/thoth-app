'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import { ButtonGroup as ButtonGroupComponent, IconButton } from '@/src/shared/ui';

type ButtonGroupProps = {
  onLanguageSelect: () => void;
  onLanguageDelete: () => void;
  isMainLanguage: boolean;
};

export const ButtonGroup = (props: ButtonGroupProps) => {
  const { onLanguageSelect, onLanguageDelete, isMainLanguage } = props;

  return (
    <ButtonGroupComponent>
      <IconButton onClick={onLanguageSelect}>{isMainLanguage ? <StarIcon /> : <StarBorderIcon />}</IconButton>
      <IconButton onClick={onLanguageDelete}>
        <DeleteOutlineIcon />
      </IconButton>
    </ButtonGroupComponent>
  );
};
