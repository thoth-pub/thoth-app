import { appConfig } from '../..';

export const isDragAndDropDisabled = (itemsCount: number) => {
  return itemsCount < appConfig.minItemsCountForDragAndDrop;
};
