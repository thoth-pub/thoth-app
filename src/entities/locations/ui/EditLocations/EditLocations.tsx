import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { Control } from 'react-hook-form';

import { IDs } from '@/src/shared';
import { FORM_FIELDS, locationPlatformOptions } from '@/src/shared/constants/formFields';
import { ButtonGroup, Chip, DeleteButton, FavoriteButton, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { LocationEntity, LocationsForm } from '../../model/location.type';
import { locationsValidationSchema } from '../../model/location.validation';
import { FormFields } from './components/FormFields';

const { LOCATIONS, PLATFORM, FULL_TEXT_URL, LANDING_PAGE } = FORM_FIELDS;

type EditLocationsProps = {
  locations: LocationEntity[];
  onUpdate: (data: LocationsForm) => void;
  onDelete?: (id: string) => void;
  onClose?: () => void;
  onSelectAsCanonical?: (id: string) => void;
};

const EditLocations = (props: EditLocationsProps) => {
  const { locations, onUpdate, onDelete, onClose, onSelectAsCanonical } = props;

  const defaultValues = locations.map(({ id, locationPlatform, fullTextUrl, landingPage, canonical }) => {
    const platformOption = locationPlatformOptions.find(
      (option) => option.value.toLowerCase() === locationPlatform.toLowerCase(),
    );

    return {
      platformId: id,
      [PLATFORM.name]: {
        value: locationPlatform,
        label: platformOption ? platformOption.label : locationPlatform,
      },
      canonical,
      [FULL_TEXT_URL.name]: fullTextUrl,
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
              {defaultValues.map(({ platformId, platform: { label }, fullTextUrl, landingPage, canonical }) => (
                <li key={platformId} className="flex items-center gap-1">
                  <Chip label={label} size="small" component="span" />
                  <Typography>{landingPage}</Typography>
                  {fullTextUrl && fullTextUrl.length > 0 && <DescriptionOutlinedIcon color="primary" />}
                  <ButtonGroup className="ml-auto">
                    <DeleteButton onClick={() => onDelete?.(platformId)} />
                    <FavoriteButton isFavorite={canonical} onClick={() => onSelectAsCanonical?.(platformId)} />
                  </ButtonGroup>
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
