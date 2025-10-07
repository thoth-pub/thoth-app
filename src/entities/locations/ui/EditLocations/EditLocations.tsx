import DescriptionIcon from '@mui/icons-material/Description';
import type { Control } from 'react-hook-form';

import { IDs } from '@/src/shared';
import { FORM_FIELDS, locationPlatformOptions } from '@/src/shared/constants/formFields';
import { Chip, DeleteButton, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { LocationEntity, LocationsForm } from '../../model/location.type';
import { locationsValidationSchema } from '../../model/location.validation';
import { FormFields } from './components/FormFields';

const { LOCATIONS, PLATFORM, CANONICAL, URL, LANDING_PAGE } = FORM_FIELDS;

type EditLocationsProps = {
  locations: LocationEntity[];
  onUpdate: (data: LocationsForm) => void;
  onDelete?: (id: string) => void;
  onClose?: () => void;
};

const EditLocations = (props: EditLocationsProps) => {
  const { locations, onUpdate, onDelete, onClose } = props;

  const defaultValues = locations.map(({ id, locationPlatform, canonical, fullTextUrl, landingPage }) => {
    const platformOption = locationPlatformOptions.find(
      (option) => option.value.toLowerCase() === locationPlatform.toLowerCase(),
    );

    return {
      platformId: id,
      [PLATFORM.name]: {
        value: locationPlatform,
        label: platformOption ? platformOption.label : locationPlatform,
      },
      [CANONICAL.name]: canonical,
      [URL.name]: fullTextUrl,
      [LANDING_PAGE.name]: landingPage,
    };
  });

  const placeholder =
    locations.length > 0 ? locations.map(({ locationPlatform }) => locationPlatform).join(', ') : undefined;

  return (
    <EditableContent
      formId={IDs.LOCATIONS}
      defaultValues={{ [LOCATIONS.name]: defaultValues }}
      validationSchema={locationsValidationSchema}
      borderTransparent
      skipAutoSubmit
      isTableVariant
      onSubmit={(data) => onUpdate?.(data)}
      formFields={({ control, isHelperTextVisible }) => (
        <FormFields
          control={control as unknown as Control<LocationsForm>}
          isHelperTextVisible={isHelperTextVisible}
          onDelete={onDelete}
          onClose={onClose}
        />
      )}
      preview={({ onEdit }) => (
        <Preview label={LOCATIONS.label} value={placeholder} onEdit={onEdit}>
          {locations.length > 0 && (
            <ul className="flex w-full flex-col gap-[var(--default-gap)]">
              {defaultValues.map(({ platformId, platform: { label }, fullUrl, landingPage }) => (
                <li key={platformId} className="flex items-center gap-1">
                  <Chip label={label} size="small" component="span" />
                  <Typography>{landingPage}</Typography>
                  {fullUrl && fullUrl.length > 0 && <DescriptionIcon color="primary" />}
                  <DeleteButton className="ml-auto" onDelete={() => onDelete?.(platformId)} />
                </li>
              ))}
            </ul>
          )}
        </Preview>
      )}
    />
  );
};

export default EditLocations;
