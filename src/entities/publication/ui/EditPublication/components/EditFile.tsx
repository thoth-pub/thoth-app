import { zodResolver } from '@hookform/resolvers/zod';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { appConfig, NOTIFICATIONS, PublicationType } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useNotifications } from '@/src/shared/hooks';
import { IconButton } from '@/src/shared/ui';

import { PublicationFileForm,PublicationType as GQLPublicationType } from '../../../model/publication.types';
import { publicationFileValidationSchema } from '../../../model/publication.validation';

type EditFileProps = {
  publicationType: GQLPublicationType;
  disabled: boolean;
  loading: boolean;
  onSubmit?: (file: File) => void;
};

const { PUBLICATION_FILE } = FORM_FIELDS;

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

const EditFile = ({ publicationType, disabled, loading, onSubmit }: EditFileProps) => {
  const { register, handleSubmit, reset, watch } = useForm({
    reValidateMode: 'onSubmit',
    resolver: zodResolver(publicationFileValidationSchema),
  });
  const { sendErrorNotification } = useNotifications();

  const onFormClick = () => {
    if (!disabled) return;
    sendErrorNotification(PUBLICATION_UPLOAD_FILE_DISABLED);
  };

  const onSubmitForm = (data: PublicationFileForm) => {
    if (!data.publicationFile || data.publicationFile.length === 0) return;
    onSubmit?.(data.publicationFile[0]);
    reset();
  };

  useEffect(() => {
    const subscription = watch(async () => {
      await handleSubmit(onSubmitForm)();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const supportedFileTypes = getSupportedFileTypes(publicationType);

  return (
    <form onClick={onFormClick}>
      <IconButton loading={loading} tabIndex={-1} component="label" className="p-0" disabled={disabled}>
        <AttachFileIcon fontSize="small" />
        <input type="file" hidden {...register(PUBLICATION_FILE.name)} accept={supportedFileTypes.join(', ')} />
      </IconButton>
    </form>
  );
};

export default EditFile;
