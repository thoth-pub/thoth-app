'use client';

import { useState } from 'react';
import { Control } from 'react-hook-form';

import { IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { DragAndDropWrapper, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { AffiliationEntity, AffiliationsForm as AffiliationsFormType } from '../model/affiliation.types';
import { affiliationsValidationSchema } from '../model/affiliation.validation';
import { FormFields } from './AffiliationsForm/FormFields';
import { PreviewItem } from './AffiliationsForm/PreviewItem';

const { AFFILIATION, POSITION } = FORM_FIELDS;

type AffiliationsFormProps = {
  defaultValue: AffiliationEntity[];
  showRecommendations?: boolean;
  onDragEnd?: (data: AffiliationsFormType['affiliations']) => void;
  onUpdate?: (data: AffiliationsFormType) => void;
};

const { AFFILIATIONS } = FORM_FIELDS;

const AffiliationsForm = (props: AffiliationsFormProps) => {
  const { defaultValue = [], showRecommendations = false, onDragEnd, onUpdate } = props;

  const defaultValues = defaultValue
    .sort((a, b) => a.orderNumber - b.orderNumber)
    .map(({ id, institutionName, institutionId, position }) => ({
      id,
      [AFFILIATION.name]: { value: institutionId, label: institutionName },
      [POSITION.name]: position,
    }));

  const [formValues, setFormValues] = useState(defaultValues);

  const showIndicator = showRecommendations && defaultValues.length === 0;

  const onSubmit = (data: AffiliationsFormType) => {
    const newValues = data.affiliations.map(({ id, affiliation: { label, value }, position }) => ({
      id,
      [AFFILIATION.name]: { value, label },
      [POSITION.name]: position || '',
    }));

    setFormValues(newValues);

    onUpdate?.(data);
  };

  const onDragEndHandler = (data: AffiliationsFormType['affiliations']) => {
    const newValues = data.map(({ id, affiliation, position }, index) => ({
      id,
      affiliation,
      position: position || '',
      orderNumber: index + 1,
    }));

    setFormValues(newValues);

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
        formFields={({ control }) => <FormFields control={control as unknown as Control<AffiliationsFormType>} />}
        preview={({ disabled, onEdit }) => (
          <Preview
            label={AFFILIATIONS.label}
            disabled={disabled}
            onEdit={onEdit}
            value={formValues.join(', ')}
            recommended={showIndicator}
          >
            <div className="flex flex-col gap-[var(--default-gap)]">
              {formValues.length > 0 && (
                <DragAndDropWrapper items={formValues} onDragEnd={onDragEndHandler}>
                  {() => (
                    <ul className="flex flex-col gap-[var(--default-gap)]">
                      {formValues.map(({ id, affiliation: { label }, position }) => (
                        <PreviewItem
                          key={id}
                          id={id}
                          text={`${position} ${label}`}
                          totalItemsCount={formValues.length}
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
