'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { IconButton } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCopyToClipboard } from 'react-use';

import { useWork } from '@/src/entities/work';
import { CoverUrlAltForm } from '@/src/entities/work/model/work.types';
import { coverUrlAltValidationSchema } from '@/src/entities/work/model/work.validation';
import type { BaseEditSectionProps } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  CloseButton,
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  ImageWithFallback,
  Modal,
  ModalWrapper,
  SubmitButton,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';

import { PlaceholderLogo } from './PlaceholderLogo';
import { Wrapper } from './Wrapper';

const { COVER_URL } = FORM_FIELDS;

export const CoverForm = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const [isOpen, setIsOpen] = useState(false);
  const { work, updateWork } = useWork(workId);
  const [, copyToClipboard] = useCopyToClipboard();

  const { control, handleSubmit } = useForm({
    defaultValues: {
      [COVER_URL.name]: work.coverUrl ?? '',
    },
    resolver: zodResolver(coverUrlAltValidationSchema),
  });

  const handleModalState = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const onSubmit = (data: CoverUrlAltForm) => {
    updateWork({ ...work, coverUrl: data.coverUrl ?? '' });
    handleClose();
  };

  const handleCopyToClipboard = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    copyToClipboard(work.coverUrl ?? '');
  };

  return (
    <Wrapper>
      <div className="relative h-full w-full">
        <button
          className="absolute flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1"
          onClick={handleModalState}
          type="button"
        >
          <PlaceholderLogo />
          <Typography className="text-center font-semibold">
            <TranslatedContent content="actions.addCover" />
          </Typography>
          {work.coverUrl && (
            <ImageWithFallback
              fallback="/transparent.png"
              placeholderOpacity={0}
              src={work.coverUrl}
              alt="Cover"
              className="absolute h-full w-full object-contain"
              fill
            />
          )}
        </button>
        {work.coverUrl && (
          <IconButton className="absolute top-0 right-0 h-12 w-12 p-0" onClick={handleCopyToClipboard}>
            <ContentCopyIcon color="primary" />
          </IconButton>
        )}
      </div>
      <Modal open={isOpen}>
        <ModalWrapper>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="text-(--color-typography) capitalize">
              <TranslatedContent content="actions.changeCover" />
            </Typography>
            <div className="flex gap-2">
              <SubmitButton onClick={handleSubmit(onSubmit)} />
              <CloseButton onClose={handleClose} />
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ContentWrapper>
              <FormFieldLabel label={COVER_URL.label} />
              <FormTextField
                control={control}
                name={COVER_URL.name}
                placeholder={COVER_URL.placeholder}
                type={COVER_URL.type}
                id={COVER_URL.name}
                isUrlField
              />
            </ContentWrapper>
          </form>
        </ModalWrapper>
      </Modal>
    </Wrapper>
  );
};
