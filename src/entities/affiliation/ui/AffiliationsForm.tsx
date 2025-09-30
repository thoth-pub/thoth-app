'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { Control } from 'react-hook-form';

import type { WorkAffiliation } from '@/src/entities/work/model/work.types';
import { IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { type AffiliationsForm as AffiliationsFormType } from '../model/affiliation.types';
import { affiliationsValidationSchema } from '../model/affiliation.validation';
import { FormFields } from './AffiliationsForm/FormFields';
import { PreviewItem } from './AffiliationsForm/PreviewItem';

const { AFFILIATION, POSITION } = FORM_FIELDS;

type AffiliationsFormProps = {
  defaultValue: WorkAffiliation[];
  onReorder?: (data: AffiliationsFormType) => void;
  onUpdate?: (data: AffiliationsFormType) => void;
  onDelete?: (id: string, index: number) => void;
};

const { AFFILIATIONS } = FORM_FIELDS;

const AffiliationsForm = (props: AffiliationsFormProps) => {
  const { defaultValue = [], onReorder, onUpdate, onDelete } = props;

  const defaultValues = defaultValue.map(({ id, institutionName, institutionId, position }) => ({
    id,
    [AFFILIATION.name]: { value: institutionId, label: institutionName },
    [POSITION.name]: position,
  }));

  const [formValues, setFormValues] = useState(defaultValues);

  const sensors = useSensors(useSensor(PointerSensor));

  const onSubmit = (data: AffiliationsFormType) => {
    setFormValues(data.affiliations);

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

  const handleRemove = (index: number, id: string) => {
    const updatedFormValues = formValues.filter((_, i) => i !== index);
    setFormValues(updatedFormValues);

    onDelete?.(id, index);
  };

  return (
    <>
      <EditableContent
        isTableVariant
        formId={IDs.CONTRIBUTOR_AFFILIATIONS}
        validationSchema={affiliationsValidationSchema}
        onSubmit={onSubmit}
        defaultValues={{ [AFFILIATIONS.name]: defaultValues }}
        formFields={({ control }) => <FormFields control={control as unknown as Control<AffiliationsFormType>} />}
        preview={({ data, onEdit }) => (
          <Preview label={AFFILIATIONS.label} onEdit={onEdit} value={formValues.join(', ')}>
            <div className="flex flex-col gap-[var(--default-gap)]">
              {formValues.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={formValues} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-[var(--default-gap)]">
                      {formValues.map(({ id, affiliation: { label }, position }, index) => (
                        <PreviewItem
                          key={id}
                          id={id}
                          text={`${position} ${label}`}
                          isDisabled={data && data.affiliations && data.affiliations.length <= 1}
                          onDelete={() => handleRemove(index, id)}
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
