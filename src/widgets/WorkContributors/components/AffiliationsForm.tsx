'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import {
  type AffiliationsForm as AffiliationsFormType,
  affiliationsValidationSchema,
} from '@/src/entities/contributor/model/contributor.validation';
import type { WorkAffiliation } from '@/src/entities/work/model/work.types';
import { appConfig, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { AddButton, FormFieldWrapper, InputLabel } from '@/src/shared/ui';

import { AffiliationFormField } from './AffiliationFormField';
import { AffiliationsPreviewItem } from './AffiliationsPreviewItem';

const { AFFILIATIONS, AFFILIATION, POSITION } = FORM_FIELDS;

const {
  FORM_FIELDS: { AFFILIATIONS: AFFILIATIONS_ID },
} = IDs;

const fieldsDefaultValues = {
  id: appConfig.defaultId,
  [AFFILIATION.name]: { value: '', label: '' },
  [POSITION.name]: '',
};

type AffiliationsFormProps = {
  defaultValue: WorkAffiliation[];
  onAffiliationsReorder: (data: AffiliationsFormType['affiliations']) => void;
  onAffiliationsUpdate: (data: AffiliationsFormType) => void;
  onAffiliationsDelete: (id: string) => void;
};

export const AffiliationsForm = (props: AffiliationsFormProps) => {
  const { defaultValue = [], onAffiliationsReorder, onAffiliationsUpdate, onAffiliationsDelete } = props;

  const defaultValues = defaultValue.map(({ id, institutionName, institutionId, position }) => ({
    id,
    [AFFILIATION.name]: { value: institutionId, label: institutionName },
    [POSITION.name]: position,
  }));

  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [formValues, setFormValues] = useState(defaultValues);
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(affiliationsValidationSchema),
    mode: 'onChange',
    defaultValues: {
      [AFFILIATIONS.name]: defaultValues,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: AFFILIATIONS.name,
  });
  const sensors = useSensors(useSensor(PointerSensor));

  const handleModeSwitch = () => {
    setIsPreviewMode((prev) => !prev);
  };

  const onSubmit = (data: AffiliationsFormType) => {
    setFormValues(data.affiliations);

    onAffiliationsUpdate(data);

    handleModeSwitch();
  };

  const onAddAffiliation = () => {
    append(fieldsDefaultValues);
  };

  const onSwitchToEditMode = () => {
    handleModeSwitch();

    onAddAffiliation();
  };

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${AFFILIATIONS.name}.${fieldIndex}.${fieldName}`;
  };

  const getAffiliationFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, AFFILIATION.name);
  };

  const getPositionFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, POSITION.name);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormValues((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        onAffiliationsReorder?.(newItems);

        return newItems;
      });
    }
  };

  const handleRemove = (index: number, id: string) => {
    remove(index);
    const updatedFormValues = formValues.filter((_, i) => i !== index);
    setFormValues(updatedFormValues);

    if (index === 0 && !isPreviewMode) {
      setIsPreviewMode(true);
    }

    onAffiliationsDelete(id);
  };

  return (
    <>
      {isPreviewMode ? (
        <FormFieldWrapper>
          <InputLabel component="span">Affiliations</InputLabel>
          <div className="flex flex-col gap-[var(--default-gap)]">
            {formValues.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={formValues} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-col gap-[var(--default-gap)]">
                    {formValues.map(({ id, affiliation: { label }, position }, index) => (
                      <AffiliationsPreviewItem
                        key={id}
                        id={id}
                        text={`${position} ${label}`}
                        isDisabled={fields.length <= 1}
                        onSwitchMode={handleModeSwitch}
                        onDelete={() => handleRemove(index, id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
            <AddButton type="button" className="mr-auto" onAdd={onSwitchToEditMode}>
              Add Affiliation
            </AddButton>
          </div>
        </FormFieldWrapper>
      ) : (
        <div className="flex flex-col items-start gap-[var(--default-gap)]">
          <form
            className="flex w-full flex-col gap-[var(--default-gap)]"
            id={AFFILIATIONS_ID}
            onSubmit={handleSubmit(onSubmit)}
            key="edit-mode"
          >
            {fields.map((field, index) => (
              <AffiliationFormField
                key={field.id}
                showControls={index === 0}
                control={control}
                affiliationFieldName={getAffiliationFieldName(index)}
                positionFieldName={getPositionFieldName(index)}
                onRemove={() => handleRemove(index, field.id)}
              />
            ))}
          </form>
          <AddButton className="ml-[180px]" type="button" onAdd={onAddAffiliation}>
            Add Affiliation
          </AddButton>
        </div>
      )}
    </>
  );
};
