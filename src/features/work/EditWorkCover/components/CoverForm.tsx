'use client';

import {
  CloseButton,
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  Modal,
  ModalWrapper,
  SubmitButton,
  Typography,
} from '@/src/shared/ui';
import { PlaceholderLogo } from './PlaceholderLogo';
import { Wrapper } from './Wrapper';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { coverUrlAltValidationSchema } from '@/src/entities/work/model/work.validation';
import { useState } from 'react';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { CoverUrlAltForm } from '@/src/entities/work/model/work.types';
import type { BaseEditSectionProps } from '@/src/shared';
import { useWork } from '@/src/entities/work';

const { COVER_URL } = FORM_FIELDS;

export const CoverForm = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const [isOpen, setIsOpen] = useState(false);
  const { work, updateWork } = useWork(workId, queryToken);

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

  return (
    <Wrapper>
      <button
        className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1"
        onClick={handleModalState}
      >
        <PlaceholderLogo />
        <Typography className="text-center font-semibold">Add Cover</Typography>
        {work.coverUrl && <img src={work.coverUrl} alt="Cover" className="absolute h-full w-full object-contain" />}
      </button>
      <Modal open={isOpen}>
        <ModalWrapper>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="text-(--color-typography) capitalize">
              Change Cover
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
