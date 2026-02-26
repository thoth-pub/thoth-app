'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { getProtocolPrefix, HELPER_TEXT } from '@/src/shared';
import { FORM_FIELDS, locationPlatformOptions } from '@/src/shared/constants/formFields';
import { useIsDesktop } from '@/src/shared/hooks';
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
  Modal,
  ModalWrapper,
  SubmitButton,
} from '@/src/shared/ui';

import type { LocationEntity, LocationForm as LocationFormType, LocationPlatform } from '../../model/location.types';
import { locationPlatformValidationSchema } from '../../model/location.validation';

type LocationFormProps = {
  location: LocationEntity;
  isFullTextUrlHidden: boolean;
  isCheckboxDisabled: boolean;
  onSubmit?: (data: LocationEntity) => void;
  onClose?: () => void;
};

const { PLATFORM, LANDING_PAGE, FULL_TEXT_URL, CANONICAL } = FORM_FIELDS;
const { LOCATION_PLATFORM, LANDING_PAGE_HELPER_TEXT, LOCATION_URL_HELPER_TEXT } = HELPER_TEXT;

export const LocationForm = (props: LocationFormProps) => {
  const { location, isFullTextUrlHidden, isCheckboxDisabled, onSubmit, onClose } = props;

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

  const [isHelperTextVisible, setIsHelperTextVisible] = useState(false);

  const handleShowInfo = () => {
    setIsHelperTextVisible((prev) => !prev);
  };

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

  const formComponent = (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="flex flex-col gap-(--default-gap)">
      <FormFieldWrapper>
        <FormFieldLabel label={PLATFORM.label} id={PLATFORM.name} />
        <FormFieldWithControlsWrapper>
          <AutocompleteField
            control={control}
            name={PLATFORM.name}
            id={PLATFORM.name}
            options={locationPlatformOptions}
            helperText={LOCATION_PLATFORM}
            isHelperTextVisible={isHelperTextVisible}
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
            <IconButton onClick={handleShowInfo} aria-label="Show info">
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
          helperText={LANDING_PAGE_HELPER_TEXT}
          isHelperTextVisible={isHelperTextVisible}
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
            helperText={LOCATION_URL_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
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
    </form>
  );

  return (
    <>
      {isDesktop ? (
        formComponent
      ) : (
        <Modal open>
          <ModalWrapper>{formComponent}</ModalWrapper>
        </Modal>
      )}
    </>
  );
};
