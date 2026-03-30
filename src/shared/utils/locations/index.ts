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

export const locationPlatformMapper = (platform: LocationPlatform) => {
  const platformMap = {
    [LocationPlatform.Thoth]: 'Thoth',
    [LocationPlatform.PublisherWebsite]: 'Publisher Website',
    [LocationPlatform.Doab]: 'DOAB',
    [LocationPlatform.EbscoHost]: 'EBSCO Host',
    [LocationPlatform.EbscoKb]: 'EBSCO Knowledge Base',
    [LocationPlatform.GoogleBooks]: 'Google Books',
    [LocationPlatform.InternetArchive]: 'Internet Archive',
    [LocationPlatform.JiscKb]: 'JISC',
    [LocationPlatform.Jstor]: 'JSTOR',
    [LocationPlatform.Oapen]: 'OAPEN',
    [LocationPlatform.OclcKb]: 'OCLC',
    [LocationPlatform.Other]: 'Other',
    [LocationPlatform.ProjectMuse]: 'Project MUSE',
    [LocationPlatform.ProquestExlibris]: 'ProQuest ExLibris',
    [LocationPlatform.ProquestKb]: 'ProQuest Knowledge Base',
    [LocationPlatform.ScieloBooks]: 'SciELO Books',
    [LocationPlatform.ScienceOpen]: 'ScienceOpen',
    [LocationPlatform.Zenodo]: 'Zenodo',
  };

  return platformMap[platform];
};
