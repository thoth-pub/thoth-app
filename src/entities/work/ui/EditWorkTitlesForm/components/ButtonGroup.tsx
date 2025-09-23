'use client';

import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import { ButtonGroup as ButtonGroupComponent, DeleteButton, IconButton } from '@/src/shared/ui';

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
      <DeleteButton onDelete={onLanguageDelete} />
    </ButtonGroupComponent>
  );
};
