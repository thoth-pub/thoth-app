'use client';

import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StarIcon from '@mui/icons-material/Star';
import Image from 'next/image';

import { LocationPlatform } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import {
  AddButton,
  ButtonGroup,
  Chip,
  ContentWrapper,
  DeleteButton,
  EditButton,
  InputLabel,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { isDefaultId } from '@/src/shared/utils';
import { locationPlatformMapper } from '@/src/shared/utils/locations';

import type { LocationEntity } from '../../model/location.types';
import { useLocationStateMachine } from '../../store/location.store';
import { LocationForm } from '../LocationForm/LocationForm';

const { LOCATIONS } = FORM_FIELDS;

type EditLocationsProps = {
  locations: LocationEntity[];
  isFullTextUrlHidden: boolean;
  deleteLoading?: boolean;
  canDelete?: boolean;
  onUpdate: (data: LocationEntity[]) => void;
  onDelete?: (id: string) => void;
};

const EditLocations = (props: EditLocationsProps) => {
  const { locations, isFullTextUrlHidden, deleteLoading = false, canDelete = true, onUpdate, onDelete } = props;

  const { activeEntity: activeLocation, edit, finishEditing } = useLocationStateMachine();
  const { activeFormId, edit: editForm, closeForm } = useFormStateMachine();

  const isEditingNewLocation = activeLocation && isDefaultId(activeLocation.id);
  const isLocationsFilled = locations.length > 0;
  const isEditingExistingLocation = activeLocation && locations.some((location) => location.id === activeLocation.id);

  const handleClose = () => {
    finishEditing();
    closeForm();
  };

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
      id: `${appConfig.defaultId}-${locations.length + 1}`,
    });
  };

  const handleSubmitNewLocation = (location: LocationEntity) => {
    onUpdate?.([...locations, location]);
    handleClose();
  };

  const handleSubmitLocation = (location: LocationEntity) => {
    const filteredLocations = locations.filter((loc) => loc.id !== location.id);

    onUpdate?.([...filteredLocations, location]);
    handleClose();
  };

  const isThothLocationSelected = locations.some((location) => location.locationPlatform === LocationPlatform.Thoth);

  const sortedLocations = [...locations].sort((a, b) => {
    if (a.locationPlatform === LocationPlatform.Thoth) return -1;
    if (b.locationPlatform === LocationPlatform.Thoth) return 1;
    return 0;
  });

  return (
    <>
      <ContentWrapper>
        <InputLabel className="capitalize" component="span">
          <TranslatedContent content={LOCATIONS.label} namespace={NAMESPACES.enum.forms} />
        </InputLabel>
        {!activeLocation && !isLocationsFilled && (
          <AddButton onAdd={handleAddNewLocation} className="mr-auto p-0 capitalize" disabled={!!activeFormId}>
            <TranslatedContent content="actions.addNewLocation" />
          </AddButton>
        )}
      </ContentWrapper>

      {isLocationsFilled && (
        <ul className="flex w-full flex-col gap-(--default-gap)">
          {sortedLocations.map((location) =>
            activeLocation?.id === location.id ? (
              <LocationForm
                key={location.id}
                location={location}
                isFullTextUrlHidden={isFullTextUrlHidden}
                isCheckboxDisabled={isThothLocationSelected}
                onClose={handleClose}
                onSubmit={handleSubmitLocation}
              />
            ) : (
              <li key={location.id} className="flex items-center gap-1">
                <Chip
                  label={
                    <Typography
                      component="span"
                      className={`flex items-center gap-1 ${location.locationPlatform === LocationPlatform.Thoth ? 'font-economica uppercase' : ''}`}
                    >
                      <>
                        {location.locationPlatform === LocationPlatform.Thoth && (
                          <Image
                            src="/logo_small.png"
                            alt="Thoth"
                            width={24}
                            height={24}
                            className="scale-50 xl:scale-100"
                          />
                        )}
                        {locationPlatformMapper(location.locationPlatform)}
                      </>
                    </Typography>
                  }
                  size="small"
                  component="span"
                />
                <Typography className="max-w-[30%] truncate">{location.landingPage}</Typography>
                {location.fullTextUrl && location.fullTextUrl.length > 0 && <DescriptionOutlinedIcon color="primary" />}
                {location.canonical && <StarIcon color="primary" />}
                <ButtonGroup className="ml-auto">
                  {canDelete && <DeleteButton onClick={() => onDelete?.(location.id)} disabled={deleteLoading} />}
                  <EditButton onClick={() => handleEditLocation(location)} disabled={!!activeFormId} />
                </ButtonGroup>
              </li>
            ),
          )}
        </ul>
      )}

      {isEditingNewLocation && !isEditingExistingLocation && (
        <LocationForm
          location={activeLocation}
          isFullTextUrlHidden={isFullTextUrlHidden}
          isCheckboxDisabled={isThothLocationSelected}
          onClose={handleClose}
          onSubmit={handleSubmitNewLocation}
        />
      )}

      {isLocationsFilled && (
        <AddButton onAdd={handleAddNewLocation} className="mt-4 mr-auto p-0 capitalize" disabled={!!activeFormId}>
          <TranslatedContent content="actions.addNewLocation" />
        </AddButton>
      )}
    </>
  );
};

export default EditLocations;
