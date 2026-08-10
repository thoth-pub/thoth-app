'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FORM_FIELDS, HELPER_TEXT, locationPlatformOptions } from '@/src/shared/constants';
import { useEscapeKey, useIsDesktop, useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  AutocompleteField,
  AutocompleteGroup,
  ButtonGroup,
  CheckboxFormField,
  CloseButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  IconButton,
  MarkdownRenderer,
  Modal,
  ModalWrapper,
  SubmitButton,
} from '@/src/shared/ui';
import FormAttentionCue from '@/src/shared/ui/layout/EditableContent/FormAttentionCue';
import { getProtocolPrefix } from '@/src/shared/utils';

import type { LocationEntity, LocationForm as LocationFormType, LocationPlatform } from '../../model/location.types';
import { locationPlatformValidationSchema } from '../../model/location.validation';

type LocationFormProps = {
  location: LocationEntity;
  isFullTextUrlHidden: boolean;
  isCheckboxDisabled: boolean;
  attentionRequest?: number;
  onSubmit?: (data: LocationEntity) => void;
  onClose?: () => void;
};

const { PLATFORM, LANDING_PAGE, FULL_TEXT_URL, CANONICAL } = FORM_FIELDS;
const { LOCATION: LOCATION_HELPER_TEXT } = HELPER_TEXT;

export const LocationForm = (props: LocationFormProps) => {
  const { location, isFullTextUrlHidden, isCheckboxDisabled, attentionRequest, onSubmit, onClose } = props;

  const [showFaq, setShowFaq] = useState(false);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.forms });
  const handleToggleFaq = () => setShowFaq((prev) => !prev);

  useEscapeKey(() => setShowFaq(false), showFaq);

  const platformOption = locationPlatformOptions.find(
    (option) => option.value.toLowerCase() === location.locationPlatform.toLowerCase(),
  );

  const { control, handleSubmit } = useForm<LocationFormType>({
    resolver: zodResolver(locationPlatformValidationSchema),
    defaultValues: {
      [PLATFORM.name]: platformOption ?? locationPlatformOptions[0],
      [LANDING_PAGE.name]: location.landingPage,
      [FULL_TEXT_URL.name]: location.fullTextUrl,
      [CANONICAL.name]: location.canonical,
    },
  });

  const handleSubmitForm = ({ landingPage = '', fullTextUrl = '', platform, canonical }: LocationFormType) => {
    onSubmit?.({
      ...location,
      locationPlatform: platform.value as LocationPlatform,
      landingPage: landingPage ?? '',
      fullTextUrl: fullTextUrl ?? '',
      canonical: canonical,
    });
  };

  const isDesktop = useIsDesktop(980);

  useEscapeKey(onClose, !isDesktop && !showFaq);

  const formComponent = (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="relative flex flex-col gap-(--default-gap)">
      <FormFieldWrapper>
        <FormFieldLabel label={PLATFORM.label} id={PLATFORM.name} />
        <FormFieldWithControlsWrapper>
          <AutocompleteField
            control={control}
            name={PLATFORM.name}
            id={PLATFORM.name}
            options={locationPlatformOptions}
            groupBy={(option) => option.group ?? ''}
            renderGroup={({ group, children, key }) => (
              <AutocompleteGroup key={key} group={group}>
                {children}
              </AutocompleteGroup>
            )}
          />
          <ButtonGroup>
            <SubmitButton type="submit" />
            <CloseButton onClose={onClose} />
            <IconButton onClick={handleToggleFaq} aria-label="Show info">
              <InfoOutlineIcon />
            </IconButton>
          </ButtonGroup>
        </FormFieldWithControlsWrapper>
      </FormFieldWrapper>
      <FormFieldWrapper>
        <FormFieldLabel label={LANDING_PAGE.label} id={LANDING_PAGE.name} />
        <FormTextField
          control={control}
          name={LANDING_PAGE.name}
          id={LANDING_PAGE.name}
          isUrlField
          predefinedPrefix={getProtocolPrefix(location.landingPage ?? '')}
        />
      </FormFieldWrapper>
      {!isFullTextUrlHidden && (
        <FormFieldWrapper>
          <FormFieldLabel label={FULL_TEXT_URL.label} id={FULL_TEXT_URL.name} />
          <FormTextField
            control={control}
            name={FULL_TEXT_URL.name}
            id={FULL_TEXT_URL.name}
            isUrlField
            predefinedPrefix={getProtocolPrefix(location.fullTextUrl ?? '')}
          />
        </FormFieldWrapper>
      )}
      <FormFieldWrapper>
        <FormFieldLabel label={CANONICAL.label} id={CANONICAL.name} />
        <CheckboxFormField
          disabled={isCheckboxDisabled}
          control={control}
          name={CANONICAL.name}
          id={CANONICAL.name}
          className="mr-auto p-0"
        />
      </FormFieldWrapper>
      <FormAttentionCue attentionRequest={attentionRequest} />
    </form>
  );

  return (
    <>
      {isDesktop ? (
        formComponent
      ) : (
        <Modal open onClose={onClose}>
          <ModalWrapper>{formComponent}</ModalWrapper>
        </Modal>
      )}
      <Modal open={showFaq} onClose={handleToggleFaq}>
        <ModalWrapper onClickAway={handleToggleFaq}>
          <div className="flex flex-col gap-2">
            <CloseButton onClose={handleToggleFaq} className="self-end" />
            <MarkdownRenderer markdown={t(LOCATION_HELPER_TEXT)} />
          </div>
        </ModalWrapper>
      </Modal>
    </>
  );
};
