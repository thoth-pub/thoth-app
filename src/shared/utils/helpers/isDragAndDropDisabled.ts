import { appConfig } from '../../config';

export const isDragAndDropDisabled = (itemsCount: number) => {
  return itemsCount < appConfig.minItemsCountForDragAndDrop;
};
