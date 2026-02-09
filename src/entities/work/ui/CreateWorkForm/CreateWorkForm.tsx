'use client';

import { IDs } from '@/src/shared/constants';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import { useTypedTranslation, useWorkTypeOptions } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { FormFieldOption } from '@/src/shared/interfaces';
import { AutocompleteGroup, Button, CircularProgress, PageHeader } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import CreateWorkFormAutocompleteField from './components/CreateWorkFormAutocompleteField';
import CreateWorkFormField from './components/CreateWorkFormField';
import useCreateWorkForm from './useCreateWorkForm';

const { TITLE, TITLE_LANGUAGE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;
const { CREATE_WORK } = IDs;

type CreateWorkFormProps = {
  imprintOptions: FormFieldOption[];
  licenseOptions: FormFieldOption[];
};

const CreateWorkForm = ({ imprintOptions, licenseOptions }: CreateWorkFormProps) => {
  const workTypeOptions = useWorkTypeOptions();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  const { control, isImprintVisible, isSubmitDisabled, isLoading, availableNewWorkOptions, submit } = useCreateWorkForm(
    {
      imprintOptions,
      workTypeOptions,
      licenseOptions,
    },
  );

  return (
    <>
      <PageHeader title="New work">
        <Button
          variant="contained"
          disabled={isSubmitDisabled}
          type="submit"
          form={CREATE_WORK}
          loading={isLoading}
          loadingIndicator={<CircularProgress size={22} sx={{ color: 'inherit' }} />}
        >
          Create
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
