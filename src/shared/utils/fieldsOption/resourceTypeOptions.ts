import { ResourceType } from '../../constants/additionalResources';

export const resourceTypeOptions = [
  { value: ResourceType.enum.Article, label: 'article' },
  { value: ResourceType.enum.Audio, label: 'audio' },
  { value: ResourceType.enum.Blog, label: 'blog' },
  { value: ResourceType.enum.Book, label: 'book' },
  { value: ResourceType.enum.Dataset, label: 'dataset' },
  { value: ResourceType.enum.Document, label: 'document' },
  { value: ResourceType.enum.Image, label: 'image' },
  { value: ResourceType.enum.Map, label: 'map' },
  { value: ResourceType.enum.Other, label: 'other' },
  { value: ResourceType.enum.Source, label: 'source' },
  { value: ResourceType.enum.Spreadsheet, label: 'spreadsheet' },
  { value: ResourceType.enum.Video, label: 'video' },
  { value: ResourceType.enum.Website, label: 'website' },
];
