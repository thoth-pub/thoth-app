'use client';

import Image from 'next/image';
import { coverUrlValidationSchema } from '@/src/entities/work/model/work.validation';
import useIsDragStarted from '@/src/shared/hooks/useIsDragStarted';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import type { CoverUrlForm } from '@/src/entities/work/model/work.types';
import { Button, Typography } from '@/src/shared/ui';
import { appConfig } from '@/src/shared';
import { Wrapper } from './Wrapper';
import { PlaceholderLogo } from './PlaceholderLogo';

const { COVER_URL } = FORM_FIELDS;

type DragAndDropFormProps = {
  defaultValue?: string;
};

const DragAndDropForm = (props: DragAndDropFormProps) => {
  const { defaultValue = '' } = props;

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
  const [coverUrl, setCoverUrl] = useState<string>(defaultValue);

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
    <Wrapper>
      <form onDrop={handleDrop} className="flex h-full w-full flex-col items-center justify-center gap-1">
        <PlaceholderLogo />

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
    </Wrapper>
  );
};

export default DragAndDropForm;
