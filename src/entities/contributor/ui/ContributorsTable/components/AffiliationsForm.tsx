'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fragment, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  AddButton,
  AutocompleteField,
  DeleteButton,
  FormControlGroup,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputLabel,
} from '@/src/shared/ui';

import type { AffiliationsForm as AffiliationsFormType } from '../../../model/contributor.validation';
import { affiliationsValidationSchema } from '../../../model/contributor.validation';
import { AffiliationsPreviewItem } from './AffiliationsPreviewItem';

const { AFFILIATIONS, AFFILIATION, POSITION } = FORM_FIELDS;

const {
  FORM_FIELDS: { AFFILIATIONS: AFFILIATIONS_ID },
} = IDs;

const fieldsDefaultValues = {
  [AFFILIATION.name]: { value: '1' },
  [POSITION.name]: '',
};

export const AffiliationsForm = () => {
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [formValues, setFormValues] = useState<{ affiliation: { value: string }; position: string; id: string }[]>([]);
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(affiliationsValidationSchema),
    mode: 'onChange',
    defaultValues: {
      [AFFILIATIONS.name]: formValues,
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
    const formattedData = data.affiliations.map((item, index) => ({
      ...item,
      id: index.toString(),
    }));
    setFormValues(formattedData);
    handleModeSwitch();
  };

  const onAddAffiliation = () => {
    append(fieldsDefaultValues);
  };

  const onRemoveAffiliation = (index: number) => {
    remove(index);

    if (index === 0) {
      handleModeSwitch();
    }
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

        // onReorderEnd?.(newItems);

        return newItems;
      });
    }
  };

  return (
    <>
      {isPreviewMode ? (
        <>
          <FormFieldWrapper>
            <InputLabel component="span">Affiliations</InputLabel>
            <div className="flex flex-col gap-[var(--default-gap)]">
              {formValues.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={formValues} strategy={verticalListSortingStrategy}>
                    <ul>
                      {formValues.map(({ id, affiliation: { value }, position }) => (
                        <AffiliationsPreviewItem
                          key={id}
                          id={id}
                          text={`${position} ${value}`}
                          onSwitchMode={handleModeSwitch}
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
        </>
      ) : (
        <div className="flex flex-col items-start gap-[var(--default-gap)]">
          <form
            className="flex w-full flex-col gap-[var(--default-gap)]"
            id={AFFILIATIONS_ID}
            onSubmit={handleSubmit(onSubmit)}
            key="edit-mode"
          >
            {fields.map((field, index) => (
              <Fragment key={field.id}>
                <FormFieldWrapper>
                  <InputLabel>{AFFILIATION.label}</InputLabel>
                  <FormFieldWithControlsWrapper>
                    <AutocompleteField fullWidth name={getAffiliationFieldName(index)} control={control} options={[]} />

                    {index === 0 && <FormControlGroup formId={AFFILIATIONS_ID} />}
                    <DeleteButton onDelete={() => onRemoveAffiliation(index)} />
                  </FormFieldWithControlsWrapper>
                </FormFieldWrapper>
                <FormFieldWrapper>
                  <InputLabel>{POSITION.label}</InputLabel>
                  <FormTextField fullWidth name={getPositionFieldName(index)} control={control} />
                </FormFieldWrapper>
              </Fragment>
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
