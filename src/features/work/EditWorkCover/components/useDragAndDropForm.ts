'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useCopyToClipboard } from 'react-use';

import { useUpdateWorkFrontCover, useWork } from '@/src/entities/work';
import type { CoverUrlForm, WorkId } from '@/src/entities/work/model/work.types';
import { coverUrlValidationSchema } from '@/src/entities/work/model/work.validation';
import { ERRORS } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useNotifications } from '@/src/shared/hooks';
import useIsDragStarted from '@/src/shared/hooks/useIsDragStarted';

const { COVER_URL } = FORM_FIELDS;

const { DOI_IS_REQUIRED } = ERRORS;

export const useDragAndDropForm = (workId: WorkId) => {
  const { work, loading: isWorkLoading } = useWork(workId);

  const defaultValue = work.coverUrl ?? '';
  const isUrlCoverFilled = defaultValue && defaultValue.length > 0;
  const isDoiEmpty = !work.doi || work.doi.length === 0;

  const isDragStarted = useIsDragStarted();
  const [, copyToClipboard] = useCopyToClipboard();
  const { updateWorkFrontCover, loading } = useUpdateWorkFrontCover(workId);
  const { sendErrorNotification } = useNotifications();

  const { register, handleSubmit, setValue, reset, watch } = useForm({
    reValidateMode: 'onSubmit',
    resolver: zodResolver(coverUrlValidationSchema),
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, ...fieldProps } = register(COVER_URL.name);

  const sendDoiRequiredError = () => {
    sendErrorNotification(DOI_IS_REQUIRED);
  };

  const onSubmit = async (data: CoverUrlForm) => {
    if (!data.coverUrl || data.coverUrl.length === 0) return;

    if (isDoiEmpty) {
      sendDoiRequiredError();
      return;
    }

    await updateWorkFrontCover(data.coverUrl[0]);

    reset();
  };

  useEffect(() => {
    const subscription = watch(async () => {
      await handleSubmit(onSubmit)();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const dropFile = (event: React.DragEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDoiEmpty) {
      sendDoiRequiredError();
      return;
    }

    reset();

    setValue(COVER_URL.name, event.dataTransfer.files, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const uploadFile = () => {
    if (isDoiEmpty) {
      sendDoiRequiredError();
      return;
    }

    inputRef.current?.click();
  };

  const copyCoverUrlToClipboard = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    copyToClipboard(defaultValue);
  };

  const formRef = (e: HTMLInputElement | null) => {
    ref(e);
    inputRef.current = e;
  };

  const uploadFileClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isDoiEmpty) {
      e.preventDefault();
      e.stopPropagation();
      sendDoiRequiredError();
      return;
    }
  };

  return {
    isDragStarted,
    defaultValue,
    loading: isWorkLoading || loading,
    fieldProps,
    isUrlCoverFilled,
    formRef,
    copyCoverUrlToClipboard,
    dropFile,
    uploadFile,
    uploadFileClick,
  };
};
