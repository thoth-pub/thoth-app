'use client';

import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

import { LocationPlatform } from '@/gql/graphql';
import { appConfig, convertOptionToString, IDs, isDefaultId } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { AddButton, ButtonGroup, Chip, ContentWrapper, DeleteButton, EditButton, InputLabel, Typography } from '@/src/shared/ui';

import type { LocationEntity } from '../../model/location.types';
import useLocationStateMachine from '../../store/hooks/useLocationStateMachine';
import { LocationForm } from '../LocationForm/LocationForm';

const { LOCATIONS } = FORM_FIELDS;

type EditLocationsProps = {
  locations: LocationEntity[];
  onUpdate: (data: LocationEntity[]) => void;
  onDelete?: (id: string) => void;
};

const EditLocations = (props: EditLocationsProps) => {
  const { locations, onUpdate, onDelete } = props;

  const { activeLocation, edit, close } = useLocationStateMachine();
  const { activeFormId, edit: editForm, close: closeForm } = useFormStateMachine();

  const isEditingNewLocation = activeLocation && isDefaultId(activeLocation.id);
  const isLocationsFilled = locations.length > 0;
  const isEditingExistingLocation = activeLocation && locations.some((location) => location.id === activeLocation.id);

  const handleEditLocation = (location: LocationEntity) => {
    editForm(IDs.LOCATION_PLATFORM);
    edit(location);
  };

  const handleAddNewLocation = () => {
    editForm(IDs.LOCATION_PLATFORM);
    edit({
      locationPlatform: LocationPlatform.Other,
      fullTextUrl: '',
      landingPage: '',
      canonical: false,
      id: `${appConfig.defaultId}-${locations.length + 1}`
    });
  };

  const handleSubmitNewLocation = (location: LocationEntity) => {
    onUpdate?.([...locations, location]);
    close();
    closeForm();
  };

  const handleSubmitLocation = (location: LocationEntity) => {
    const filteredLocations = locations.filter((loc) => loc.id !== location.id);

    onUpdate?.([...filteredLocations, location]);
    close();
    closeForm();
  };

  return (
    <>
      <ContentWrapper>
        <InputLabel component="span">{LOCATIONS.label}</InputLabel>
        {!activeLocation && !isLocationsFilled && <AddButton onAdd={handleAddNewLocation} className="p-0 mr-auto capitalize" disabled={!!activeFormId}>
          add new location
        </AddButton>}
      </ContentWrapper>

      {isLocationsFilled && (
        <ul className="flex w-full flex-col gap-(--default-gap)">
          {locations.map((location) => (
            activeLocation?.id === location.id ? <LocationForm key={location.id} location={location} onClose={close} onSubmit={handleSubmitLocation} /> :
              (<li key={location.id} className="flex items-center gap-1">
                <Chip label={convertOptionToString(location.locationPlatform)} size="small" component="span" />
                <Typography className="max-w-[30%] truncate">{location.landingPage}</Typography>
                {location.fullTextUrl && location.fullTextUrl.length > 0 && <DescriptionOutlinedIcon color="primary" />}
                <ButtonGroup className="ml-auto">
                  <DeleteButton onClick={() => onDelete?.(location.id)} />
                  <EditButton onClick={() => handleEditLocation(location)} disabled={!!activeFormId} />
                </ButtonGroup>
              </li>))
          )}
        </ul>
      )}

      {isEditingNewLocation && !isEditingExistingLocation && <LocationForm location={activeLocation} onClose={close} onSubmit={handleSubmitNewLocation} />}

      {isLocationsFilled && (
        <AddButton onAdd={handleAddNewLocation} className="mt-4 mr-auto capitalize" disabled={!!activeFormId}>
          add new location
        </AddButton>
      )}
    </>
  );
};

export default EditLocations;