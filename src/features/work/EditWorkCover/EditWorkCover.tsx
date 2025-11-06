'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Typography } from '@mui/material';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useWork } from '@/src/entities/work';
import type { CoverUrlForm } from '@/src/entities/work/model/work.types';
import { coverUrlValidationSchema } from '@/src/entities/work/model/work.validation';
import { appConfig, BaseEditSectionProps } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import useIsDragStarted from '@/src/shared/hooks/useIsDragStarted';
import { Button } from '@/src/shared/ui';

const { COVER_URL } = FORM_FIELDS;

const EditWorkCover = ({ workId, queryToken }: BaseEditSectionProps) => {
  const { work } = useWork(workId, queryToken);
  const isDragStarted = useIsDragStarted();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    reValidateMode: 'onSubmit',
    resolver: zodResolver(coverUrlValidationSchema),
  });
  const [coverUrl, setCoverUrl] = useState<string>(work.coverUrl ?? '');

  const inputRef = useRef<HTMLInputElement>(null);
  const { ref, ...rest } = register(COVER_URL.name);

  const onSubmit = (data: CoverUrlForm) => {
    console.log('onSubmit', data);

    if (!data.coverUrl || data.coverUrl.length === 0) return;

    setCoverUrl(URL.createObjectURL(data.coverUrl[0]));
  };

  const onError = () => {
    console.log('Error', errors);
  };

  useEffect(() => {
    const subscription = watch(async () => {
      await handleSubmit(onSubmit, onError)();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLFormElement>) => {
    event.preventDefault();

    reset();

    setValue(COVER_URL.name, event.dataTransfer.files, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <form
      onDrop={handleDrop}
      className="relative flex aspect-[1/1.5] h-auto max-h-[300px] w-full flex-col items-center justify-center gap-1 rounded bg-[var(--color-image-placeholder)] xl:max-h-[450px]"
    >
      <Image
        src="/bird.png"
        alt="Cover"
        width={64}
        height={58}
        className={`${coverUrl ? 'opacity-0' : 'opacity-100'}`}
      />
      <Typography className={`text-center font-semibold ${coverUrl ? 'opacity-0' : 'opacity-100'}`}>
        Drag & Drop to Upload Cover <br /> OR
      </Typography>
      {!isDragStarted && (
        <Button className={`${coverUrl ? 'opacity-0' : 'opacity-100'}`} onClick={handleClick} type="button">
          Browse File
        </Button>
      )}

      {coverUrl && !isDragStarted && (
        <img src={coverUrl} alt="Cover" className="absolute h-full w-full object-contain" />
      )}

      <input
        type="file"
        {...rest}
        ref={(e) => {
          ref(e);
          inputRef.current = e;
        }}
        className="absolute z-10 h-full w-full opacity-0"
        accept={appConfig.supportedFileTypes.join(', ')}
      />
    </form>
  );
};

export default EditWorkCover;
