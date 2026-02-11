import { LocationPlatform } from '@/gql/graphql';
import { LocationEntity } from '@/src/entities/locations/model/location.types';

const sortLocations = (locations: LocationEntity[]) => {
  return locations.sort((a, b) => {
    if (a.canonical) return -1;

    if (b.canonical) return 1;

    return 0;
  });
};

export const selectCanonicalLocation = (locations: LocationEntity[]) => {
  const canonicalLocation = locations.reverse().find((location) => location.canonical);
  const thothLocation = locations.find((location) => location.locationPlatform === LocationPlatform.Thoth);

  if (thothLocation) {
    const updatedLocations = locations.map((location) => ({
      ...location,
      canonical: location.id === thothLocation.id,
    }));

    return sortLocations(updatedLocations);
  }

  if (!canonicalLocation) {
    const updatedLocations = locations.map((location, index) => ({
      ...location,
      canonical: index === 0,
    }));

    return sortLocations(updatedLocations);
  }

  const updatedLocations = locations.map((location) => ({
    ...location,
    canonical: location.id === canonicalLocation.id,
  }));

  return sortLocations(updatedLocations);
};
