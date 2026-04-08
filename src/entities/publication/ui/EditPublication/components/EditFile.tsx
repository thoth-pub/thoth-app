import { appConfig } from '@/src/shared/config';
import { NOTIFICATIONS, PublicationType } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { UploadFileButton } from '@/src/shared/ui';

import { PublicationType as GQLPublicationType } from '../../../model/publication.types';

type EditFileProps = {
  publicationType: GQLPublicationType;
  disabled: boolean;
  loading: boolean;
  progress?: number | null;
  onSubmit?: (file: File) => void;
};

const { PUBLICATION_UPLOAD_FILE_DISABLED } = NOTIFICATIONS;

const {
  supportedPdfFileTypes,
  supportedEpubFileTypes,
  supportedHtmlFileTypes,
  supportedXmlFileTypes,
  supportedDocxFileTypes,
  supportedMobiFileTypes,
  supportedAzw3FileTypes,
  supportedFictionBookFileTypes,
  supportedMP3FileTypes,
  supportedWavFileTypes,
} = appConfig;

const getSupportedFileTypes = (publicationType: GQLPublicationType) => {
  switch (publicationType) {
    case PublicationType.enum.Pdf:
      return supportedPdfFileTypes;
    case PublicationType.enum.Epub:
      return supportedEpubFileTypes;
    case PublicationType.enum.Html:
      return supportedHtmlFileTypes;
    case PublicationType.enum.Xml:
      return supportedXmlFileTypes;
    case PublicationType.enum.Docx:
      return supportedDocxFileTypes;
    case PublicationType.enum.Mobi:
      return supportedMobiFileTypes;
    case PublicationType.enum.Azw3:
      return supportedAzw3FileTypes;
    case PublicationType.enum.FictionBook:
      return supportedFictionBookFileTypes;
    case PublicationType.enum.Mp3:
      return supportedMP3FileTypes;
    case PublicationType.enum.Wav:
      return supportedWavFileTypes;
    default:
      return [
        ...supportedPdfFileTypes,
        ...supportedEpubFileTypes,
        ...supportedHtmlFileTypes,
        ...supportedXmlFileTypes,
        ...supportedDocxFileTypes,
        ...supportedMobiFileTypes,
        ...supportedAzw3FileTypes,
        ...supportedFictionBookFileTypes,
        ...supportedMP3FileTypes,
        ...supportedWavFileTypes,
      ];
  }
};

const EditFile = ({ publicationType, disabled, loading, progress, onSubmit }: EditFileProps) => {
  const { sendErrorNotification } = useNotifications();

  const onDisabledClick = () => {
    sendErrorNotification(PUBLICATION_UPLOAD_FILE_DISABLED);
  };

  const supportedFileTypes = getSupportedFileTypes(publicationType);

  return (
    <UploadFileButton
      accept={supportedFileTypes}
      disabled={disabled}
      loading={loading}
      progress={progress}
      onSubmit={onSubmit}
      onDisabledClick={onDisabledClick}
    />
  );
};

export default EditFile;
