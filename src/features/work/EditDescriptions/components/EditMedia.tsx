'use client';

import { useMemo } from 'react';

import { useWork } from '@/src/entities/work';
import type { MediaForm } from '@/src/entities/work/model/work.types';
import { mediaValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseRecommendedSectionProps, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

const { WORK_IMAGE_COUNT, WORK_TABLE_COUNT, WORK_AUDIO_COUNT, WORK_VIDEO_COUNT } = FORM_FIELDS;

const {
  WORK_TABLE_COUNT: WORK_TABLE_COUNT_HELPER_TEXT,
  WORK_IMAGE_COUNT: WORK_IMAGE_COUNT_HELPER_TEXT,
  WORK_AUDIO_COUNT: WORK_AUDIO_COUNT_HELPER_TEXT,
  WORK_VIDEO_COUNT: WORK_VIDEO_COUNT_HELPER_TEXT,
} = HELPER_TEXT;

export const EditMedia = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken } = props;

  const { work, updateWork } = useWork(workId, queryToken);

  const { imageCount, tableCount, audioCount, videoCount } = work;

  const placeholderValue = useMemo(() => {
    const res: string[] = [];

    if (tableCount) {
      res.push(`${tableCount} ${tableCount > 1 ? 'tables' : 'table'}`);
    }

    if (imageCount) {
      res.push(`${imageCount} ${imageCount > 1 ? 'images' : 'image'}`);
    }

    if (audioCount) {
      res.push(`${audioCount} ${audioCount > 1 ? 'audios' : 'audio'}`);
    }

    if (videoCount) {
      res.push(`${videoCount} ${videoCount > 1 ? 'videos' : 'video'}`);
    }

    return res.join(', ');
  }, [imageCount, tableCount, audioCount, videoCount]);

  const handleSubmit = (data: MediaForm) => {
    updateWork({ ...work, ...data });
  };

  return (
    <EditableContent
      formId={IDs.WORK_MEDIA}
      defaultValues={{
        [WORK_IMAGE_COUNT.name]: work.imageCount,
        [WORK_TABLE_COUNT.name]: work.tableCount,
        [WORK_AUDIO_COUNT.name]: work.audioCount,
        [WORK_VIDEO_COUNT.name]: work.videoCount,
      }}
      validationSchema={mediaValidationSchema}
      onSubmit={handleSubmit}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_TABLE_COUNT.label} id={WORK_TABLE_COUNT.name} />
            <FormTextField
              control={control}
              name={WORK_TABLE_COUNT.name}
              helperText={WORK_TABLE_COUNT_HELPER_TEXT}
              type={WORK_TABLE_COUNT.type}
              id={WORK_TABLE_COUNT.name}
              isHelperTextVisible={isHelperTextVisible}
              min={0}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_IMAGE_COUNT.label} id={WORK_IMAGE_COUNT.name} />
            <FormTextField
              control={control}
              name={WORK_IMAGE_COUNT.name}
              helperText={WORK_IMAGE_COUNT_HELPER_TEXT}
              type={WORK_IMAGE_COUNT.type}
              id={WORK_IMAGE_COUNT.name}
              isHelperTextVisible={isHelperTextVisible}
              min={0}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_AUDIO_COUNT.label} id={WORK_AUDIO_COUNT.name} />
            <FormTextField
              control={control}
              name={WORK_AUDIO_COUNT.name}
              helperText={WORK_AUDIO_COUNT_HELPER_TEXT}
              type={WORK_AUDIO_COUNT.type}
              id={WORK_AUDIO_COUNT.name}
              isHelperTextVisible={isHelperTextVisible}
              min={0}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_VIDEO_COUNT.label} id={WORK_VIDEO_COUNT.name} />
            <FormTextField
              control={control}
              name={WORK_VIDEO_COUNT.name}
              helperText={WORK_VIDEO_COUNT_HELPER_TEXT}
              type={WORK_VIDEO_COUNT.type}
              id={WORK_VIDEO_COUNT.name}
              isHelperTextVisible={isHelperTextVisible}
              min={0}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label="Media count" value={placeholderValue} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
