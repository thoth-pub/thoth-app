import { Controller, useForm } from 'react-hook-form';

import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS } from '@/src/shared/constants';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  Button,
  Checkbox,
  CheckboxFormField,
  ContentSection,
  FormFieldLabel,
  LinearProgress,
  TextField,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { mergeStyles } from '@/src/shared/utils';

type InheritedDataFormValues = {
  chapterCount: number;
  landingPage: boolean;
  license: boolean;
  copyrightHolder: boolean;
  contributors: boolean;
  fundings: boolean;
  subjects: boolean;
};

type InheritedDataFormProps = {
  onSubmit: (data: InheritedDataFormValues) => void;
  isLoading?: boolean;
  progress?: { current: number; total: number } | null;
};

const { COPYRIGHT_HOLDER, LICENSE, SUBJECTS, IMPRINT, WORK_STATUS, CHAPTER_COUNT } = FORM_FIELDS;

const itemStyles = 'max-w-fit p-0';
const labelStyles = 'w-45 lg:w-55 capitalize text-wrap';
const wrapperStyles = 'flex items-center gap-2';

export const InheritedDataForm = (props: InheritedDataFormProps) => {
  const { onSubmit, isLoading = false, progress = null } = props;
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  const { control, handleSubmit } = useForm<InheritedDataFormValues>({
    defaultValues: {
      chapterCount: 1,
      landingPage: false,
      license: false,
      copyrightHolder: false,
      contributors: false,
      fundings: false,
      subjects: false,
    },
  });

  const handleChapterCountChange = (value: string) =>
    Math.max(1, Math.min(appConfig.maxBulkChaptersCount, parseInt(value, 10) || 1));

  return (
    <div className="flex flex-col gap-4">
      <ContentSection
        title={<TranslatedContent content="inherited work data" />}
        headerContent={
          <Button variant="contained" className="mt-4 capitalize" onClick={handleSubmit(onSubmit)} disabled={isLoading}>
            <TranslatedContent content="actions.create" />
          </Button>
        }
      >
        {!isLoading && (
          <form className="pl-4">
            <ul className="flex flex-col gap-2">
              <div className={wrapperStyles}>
                <FormFieldLabel label={WORK_STATUS.label} className={labelStyles} />
                <Checkbox className={itemStyles} checked disabled />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label="cover" className={labelStyles} namespace={NAMESPACES.enum.common} />
                <Checkbox className={itemStyles} checked disabled />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label={IMPRINT.label} className={labelStyles} />
                <Checkbox className={itemStyles} checked disabled />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label="Place" className={labelStyles} />
                <Checkbox className={itemStyles} checked disabled />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label="landing page" className={labelStyles} namespace={NAMESPACES.enum.common} />
                <CheckboxFormField control={control} name="landingPage" className={itemStyles} disabled={isLoading} />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label={LICENSE.label} className={labelStyles} />
                <CheckboxFormField control={control} name="license" className={itemStyles} disabled={isLoading} />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label={COPYRIGHT_HOLDER.label} className={labelStyles} />
                <CheckboxFormField
                  control={control}
                  name="copyrightHolder"
                  className={itemStyles}
                  disabled={isLoading}
                />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label={SUBJECTS.label} className={labelStyles} />
                <CheckboxFormField control={control} name="subjects" className={itemStyles} disabled={isLoading} />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label="contributors" className={labelStyles} namespace={NAMESPACES.enum.common} />
                <CheckboxFormField control={control} name="contributors" className={itemStyles} disabled={isLoading} />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label="funding" className={labelStyles} namespace={NAMESPACES.enum.common} />
                <CheckboxFormField control={control} name="fundings" className={itemStyles} disabled={isLoading} />
              </div>
              <div className={wrapperStyles}>
                <FormFieldLabel label={CHAPTER_COUNT.label} className={mergeStyles(labelStyles, 'normal-case')} />
                <Controller
                  control={control}
                  name={CHAPTER_COUNT.name}
                  rules={{ min: 1, max: appConfig.maxBulkChaptersCount }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={(e) => field.onChange(handleChapterCountChange(e.target.value))}
                      type="number"
                      slotProps={{ htmlInput: { min: 1, max: appConfig.maxBulkChaptersCount } }}
                      size="small"
                      className="w-60"
                      disabled={isLoading}
                    />
                  )}
                />
              </div>
            </ul>
          </form>
        )}

        {isLoading && progress && (
          <div className="flex flex-col gap-2 px-4">
            <LinearProgress variant="determinate" value={(progress.current / progress.total) * 100} />
            <Typography variant="body2">
              {t('creatingChapter', { current: progress.current, total: progress.total })}
            </Typography>
          </div>
        )}
      </ContentSection>
    </div>
  );
};
