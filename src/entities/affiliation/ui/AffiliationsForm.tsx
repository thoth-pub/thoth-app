'use client';

import { Control } from 'react-hook-form';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { DragAndDropWrapper, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { AffiliationEntity, AffiliationsForm as AffiliationsFormType } from '../model/affiliation.types';
import { affiliationsValidationSchema } from '../model/affiliation.validation';
import { FormFields } from './AffiliationsForm/FormFields';
import { PreviewItem } from './AffiliationsForm/PreviewItem';

const { AFFILIATION, POSITION } = FORM_FIELDS;
const { CONTRIBUTOR_AFFILIATION: AFFILIATIONS_HELPER_TEXT } = HELPER_TEXT;

type AffiliationsFormProps = {
  defaultValue: AffiliationEntity[];
  showRecommendations?: boolean;
  onDragEnd?: (data: AffiliationsFormType['affiliations']) => void;
  onUpdate?: (data: AffiliationsFormType) => void;
  onDelete?: (id: string) => void;
};

const { AFFILIATIONS } = FORM_FIELDS;

const emptyAffiliations: NonNullable<AffiliationsFormProps['defaultValue']> = [];

const AffiliationsForm = (props: AffiliationsFormProps) => {
  const { defaultValue = emptyAffiliations, showRecommendations = false, onDragEnd, onUpdate, onDelete } = props;

  const defaultValues = [...defaultValue]
    .sort((a, b) => a.orderNumber - b.orderNumber)
    .map(({ id, institutionName, institutionId, position }) => ({
      id,
      affiliationId: id,
      [AFFILIATION.name]: { value: institutionId, label: institutionName },
      [POSITION.name]: position,
    }));
  const rorIdsByAffiliationId = new Map(defaultValue.map(({ id, rorId }) => [id, rorId]));

  const showIndicator = showRecommendations && defaultValues.length === 0;

  const onSubmit = (data: AffiliationsFormType) => {
    onUpdate?.(data);
  };

  const onDragEndHandler = (data: AffiliationsFormType['affiliations']) => {
    const newValues = data.map(({ id, affiliation, position }, index) => ({
      id,
      affiliationId: id,
      affiliation,
      position: position || '',
      orderNumber: index + 1,
    }));

    onDragEnd?.(newValues);
  };

  return (
    <>
      <EditableContent
        isTableVariant
        formId={IDs.CONTRIBUTOR_AFFILIATIONS}
        validationSchema={affiliationsValidationSchema}
        onSubmit={onSubmit}
        defaultValues={{ [AFFILIATIONS.name]: defaultValues }}
        borderTransparent
        faq={AFFILIATIONS_HELPER_TEXT}
        formFields={({ control }) => (
          <FormFields control={control as unknown as Control<AffiliationsFormType>} onDelete={onDelete} />
        )}
        preview={({ disabled, onEdit }) => (
          <Preview
            label={AFFILIATIONS.label}
            disabled={disabled}
            onEdit={onEdit}
            value={defaultValues.join(', ')}
            recommended={showIndicator}
          >
            <div className="flex flex-col gap-(--default-gap)">
              {defaultValues.length > 0 && (
                <DragAndDropWrapper items={defaultValues} onDragEnd={onDragEndHandler}>
                  {() => (
                    <ul className="flex flex-col gap-(--default-gap)">
                      {defaultValues.map(({ id, affiliation: { label }, position }) => (
                        <PreviewItem
                          key={id}
                          id={id}
                          text={`${position && position !== '' ? `${position}, ` : ''}${label}`}
                          rorId={rorIdsByAffiliationId.get(id)}
                          totalItemsCount={defaultValues.length}
                        />
                      ))}
                    </ul>
                  )}
                </DragAndDropWrapper>
              )}
            </div>
          </Preview>
        )}
      />
    </>
  );
};

export default AffiliationsForm;
