'use client';

import { useUser } from '@/src/entities/user';
import { FORM_FIELDS, IDs, languageOptionsAlt } from '@/src/shared/constants';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Button, CircularProgress, ContentSection, PageHeader, TranslatedContent } from '@/src/shared/ui';
import { workTypeOptions } from '@/src/shared/utils';

import CreateWorkFormField from './components/CreateWorkFormField';
import useCreateWorkForm from './useCreateWorkForm';

const { TITLE, TITLE_LANGUAGE, IMPRINT, WORK_TYPE } = FORM_FIELDS;
const { CREATE_WORK } = IDs;

const CreateWorkForm = () => {
  const { identitySettled, settledImprintsOptions: imprintOptions } = useUser();

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const { t: tForms } = useTypedTranslation({ namespace: NAMESPACES.enum.forms });

  const defaultImprint = imprintOptions[0]?.value ?? '';
  const { control, isImprintVisible, isSubmitDisabled, isLoading, availableNewWorkOptions, submit } = useCreateWorkForm(
    {
      imprintOptions,
      workTypeOptions,
      defaultImprint,
    },
  );

  return (
    <>
      <PageHeader title={t('new work')}>
        <Button
          variant="contained"
          className="capitalize"
          disabled={isSubmitDisabled}
          type="submit"
          form={CREATE_WORK}
          loading={isLoading}
          loadingIndicator={<CircularProgress size={22} sx={{ color: 'inherit' }} />}
        >
          <TranslatedContent content="actions.create" />
        </Button>
      </PageHeader>
      <ContentSection>
        {!identitySettled && <CircularProgress />}
        <form
          id={CREATE_WORK}
          onSubmit={submit}
          hidden={!identitySettled}
          className="flex flex-col gap-(--default-gap)"
        >
          <div className="grid grid-cols-[1fr_25%] gap-2">
            <CreateWorkFormField
              label={TITLE.label}
              name={TITLE.name}
              placeholder={tForms(TITLE.placeholder)}
              control={control}
              type={TITLE.type}
            />
            <CreateWorkFormField
              name={TITLE_LANGUAGE.name}
              placeholder={TITLE_LANGUAGE.placeholder}
              control={control}
              type={TITLE_LANGUAGE.type}
              select
              options={languageOptionsAlt}
            />
          </div>
          {isImprintVisible && (
            <CreateWorkFormField
              label={IMPRINT.label}
              name={IMPRINT.name}
              placeholder={IMPRINT.placeholder}
              control={control}
              select
              options={imprintOptions}
              slotProps={{
                select: {
                  MenuProps: {
                    sx: {
                      '& .MuiMenuItem-root': {
                        textTransform: 'none',
                      },
                    },
                  },
                },
              }}
              sx={{
                '& .MuiInputBase-input': {
                  textTransform: 'none',
                },
              }}
            />
          )}
          <CreateWorkFormField
            label={WORK_TYPE.label}
            name={WORK_TYPE.name}
            placeholder={WORK_TYPE.placeholder}
            control={control}
            select
            translateOptions
            options={availableNewWorkOptions}
          />
        </form>
      </ContentSection>
    </>
  );
};

export default CreateWorkForm;
