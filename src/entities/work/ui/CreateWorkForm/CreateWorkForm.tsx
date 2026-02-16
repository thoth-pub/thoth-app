'use client';

import { useUser } from '@/src/entities/user';
import { workTypeOptions } from '@/src/shared';
import { IDs } from '@/src/shared/constants';
import { FORM_FIELDS, languageOptionsAlt, licenseOptions } from '@/src/shared/constants/formFields';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { AutocompleteGroup, Button, CircularProgress, PageHeader, TranslatedContent } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import CreateWorkFormAutocompleteField from './components/CreateWorkFormAutocompleteField';
import CreateWorkFormField from './components/CreateWorkFormField';
import useCreateWorkForm from './useCreateWorkForm';

const { TITLE, TITLE_LANGUAGE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;
const { CREATE_WORK } = IDs;

const CreateWorkForm = () => {
  const { userImprintsOptions } = useUser();

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  const { control, isImprintVisible, isSubmitDisabled, isLoading, availableNewWorkOptions, submit } = useCreateWorkForm(
    {
      imprintOptions: userImprintsOptions,
      workTypeOptions,
      licenseOptions,
    },
  );

  return (
    <>
      <PageHeader title="New work">
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
        <form id={CREATE_WORK} onSubmit={submit} className="flex flex-col gap-(--default-gap)">
          <div className="grid grid-cols-[1fr_25%] gap-2">
            <CreateWorkFormField
              label={TITLE.label}
              name={TITLE.name}
              placeholder={t(TITLE.placeholder)}
              control={control}
              type={TITLE.type}
              namespace={NAMESPACES.enum.common}
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
              options={userImprintsOptions}
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
            />
          )}
          <CreateWorkFormField
            label={WORK_TYPE.label}
            name={WORK_TYPE.name}
            placeholder={WORK_TYPE.placeholder}
            control={control}
            select
            options={availableNewWorkOptions}
          />
          <CreateWorkFormAutocompleteField
            label={LICENSE.label}
            name={LICENSE.name}
            control={control}
            options={licenseOptions}
            groupBy={(option) => option.group ?? ''}
            renderGroup={({ group, children, key }) => (
              <AutocompleteGroup key={key} group={group}>
                {children}
              </AutocompleteGroup>
            )}
          />
        </form>
      </ContentSection>
    </>
  );
};

export default CreateWorkForm;
