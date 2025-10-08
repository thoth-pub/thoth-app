'use client';

import { ButtonGroup as ButtonGroupComponent, DeleteButton, FavoriteButton } from '@/src/shared/ui';

type ButtonGroupProps = {
  onLanguageSelect: () => void;
  onLanguageDelete: () => void;
  isMainLanguage: boolean;
};

export const ButtonGroup = (props: ButtonGroupProps) => {
  const { onLanguageSelect, onLanguageDelete, isMainLanguage } = props;

  return (
    <ButtonGroupComponent>
      <FavoriteButton isFavorite={isMainLanguage} onClick={onLanguageSelect} />
      <DeleteButton onClick={onLanguageDelete} />
    </ButtonGroupComponent>
  );
};
