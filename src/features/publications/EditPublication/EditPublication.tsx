'use client';

import { EditLocations } from '@/src/entities/locations';
import { EditPrice } from '@/src/entities/price';
import { EditPublication as EditPublicationForm } from '@/src/entities/publication';
import { useUser } from '@/src/entities/user';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { useEditPublication } from './useEditPublication';

type EditPublicationProps = BaseEditSectionProps & {
  isDimensionFormHidden: boolean;
  isUploadFileFormDisabled: boolean;
};

const EditPublication = (props: EditPublicationProps) => {
  const { workId, isDimensionFormHidden = false, isUploadFileFormDisabled = true } = props;

  const {
    activePublication,
    loading,
    uploadProgress,
    defaultCurrencyOption,
    deleteLocationLoading,
    finishEditing,
    updateSizes,
    updateIsbn,
    updateType,
    updatePrices,
    updateLocations,
    deleteLocation,
    updateAccessibility,
    deleteAccessibility,
    updateFile,
  } = useEditPublication({
    workId,
  });

  const { user } = useUser();

  if (!activePublication) return null;

  const accessibilityStandards = [
    activePublication.accessibilityStandard,
    activePublication.accessibilityAdditionalStandard,
  ].filter((standard) => !!standard);

  return (
    <EditPublicationForm
      isDimensionFormHidden={isDimensionFormHidden}
      publicationType={activePublication.type}
      isbn={activePublication.isbn}
      width={activePublication.width}
      widthIn={activePublication.widthIn}
      height={activePublication.height}
      heightIn={activePublication.heightIn}
      depth={activePublication.depth}
      depthIn={activePublication.depthIn}
      weight={activePublication.weight}
      weightOz={activePublication.weightOz}
      accessibilityStandards={accessibilityStandards}
      accessibilityException={activePublication.accessibilityException}
      accessibilityReportUrl={activePublication.accessibilityReportUrl}
      fileUrl={activePublication.fileUrl ?? ''}
      isUploadFileFormDisabled={isUploadFileFormDisabled}
      loading={loading}
      uploadProgress={uploadProgress}
      onUpdateIsbn={updateIsbn}
      onUpdateType={updateType}
      onDone={finishEditing}
      onClose={finishEditing}
      onUpdateDimensions={updateSizes}
      onUpdateAccessibility={updateAccessibility}
      onDeleteAccessibility={deleteAccessibility}
      onUpdateFile={updateFile}
    >
      {(isFullTextUrlHidden) => (
        <>
          <EditPrice
            defaultCurrencyOption={defaultCurrencyOption}
            prices={activePublication.prices}
            onUpdate={updatePrices}
            onClose={finishEditing}
          />
          <EditLocations
            locations={activePublication.locations}
            isFullTextUrlHidden={isFullTextUrlHidden}
            deleteLoading={deleteLocationLoading}
            canDelete={user.isSuperuser}
            onUpdate={updateLocations}
            onDelete={deleteLocation}
          />
        </>
      )}
    </EditPublicationForm>
  );
};

export default EditPublication;
