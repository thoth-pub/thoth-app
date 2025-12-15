import type { Control } from 'react-hook-form';

import { useWork } from '@/src/entities/work';
import { WorkAbstractsForm } from '@/src/entities/work/model/work.types';
import { workAbstractsValidationSchema } from '@/src/entities/work/model/work.validation';
import { appConfig, type BaseRecommendedSectionProps, IDs } from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import { Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { AbstractsFormFields } from './AbstractsFormFields';

const { WORK_ABSTRACTS } = FORM_FIELDS;

export const EditAbstracts = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { work, updateWork } = useWork(workId);

  const handleSubmit = (data: WorkAbstractsForm) => {
    const { abstracts = [] } = data;

    if (abstracts.length === 0) return;

    // TODO: fix abstracts
    updateWork({
      ...work,
    });
  };
  // TODO: fix placeholder
  // const placeholderValue =
  //   work.longAbstract && work.longAbstract.length > 0
  //     ? `${work.shortAbstract} \n ${work.longAbstract}`
  //     : `${work.shortAbstract}`;

  const placeholderValue = '';

  return (
    <EditableContent
      formId={IDs.WORK_ABSTRACT}
      defaultValues={{
        [WORK_ABSTRACTS.name]: [
          {
            abstractId: appConfig.defaultId,
            abstract: '',
            shortAbstract: '',
            language: languageOptionsAlt[0],
          },
        ],
      }}
      validationSchema={workAbstractsValidationSchema}
      onSubmit={handleSubmit}
      formFields={({ control, isHelperTextVisible }) => (
        <AbstractsFormFields
          control={control as unknown as Control<WorkAbstractsForm>}
          isHelperTextVisible={isHelperTextVisible}
        />
      )}
      preview={({ onEdit }) => <Preview label={WORK_ABSTRACTS.label} value={placeholderValue} onEdit={onEdit} />}
    />
  );
};
