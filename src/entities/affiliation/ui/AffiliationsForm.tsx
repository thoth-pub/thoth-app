'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { Control } from 'react-hook-form';

import { IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { AffiliationEntity, AffiliationsForm as AffiliationsFormType } from '../model/affiliation.types';
import { affiliationsValidationSchema } from '../model/affiliation.validation';
import { FormFields } from './AffiliationsForm/FormFields';
import { PreviewItem } from './AffiliationsForm/PreviewItem';

const { AFFILIATION, POSITION } = FORM_FIELDS;

type AffiliationsFormProps = {
  defaultValue: AffiliationEntity[];
  showRecommendations?: boolean;
  onReorder?: (data: AffiliationsFormType) => void;
  onUpdate?: (data: AffiliationsFormType) => void;
};

const { AFFILIATIONS } = FORM_FIELDS;

const AffiliationsForm = (props: AffiliationsFormProps) => {
  const { defaultValue = [], showRecommendations = false, onReorder, onUpdate } = props;

  const defaultValues = defaultValue.map(({ id, institutionName, institutionId, position }) => ({
    id,
    [AFFILIATION.name]: { value: institutionId, label: institutionName },
    [POSITION.name]: position,
  }));

  const [formValues, setFormValues] = useState(defaultValues);

  const sensors = useSensors(useSensor(PointerSensor));

  const showIndicator = showRecommendations && formValues.length === 0;

  const onSubmit = (data: AffiliationsFormType) => {
    const newValues = data.affiliations.map(({ id, affiliation: { label }, position }) => ({
      id,
      [AFFILIATION.name]: { value: label, label },
      [POSITION.name]: position || '',
    }));

    setFormValues(newValues);

    onUpdate?.(data);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormValues((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        onReorder?.({ affiliations: newItems });

        return newItems;
      });
    }
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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={formValues} strategy={verticalListSortingStrategy}>
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
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </Preview>
        )}
      />
    </>
  );
};

export default AffiliationsForm;
