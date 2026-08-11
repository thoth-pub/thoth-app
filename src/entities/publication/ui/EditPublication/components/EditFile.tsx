import { ERRORS, FORM_FIELDS, NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { HostedFileField, TranslatedContent } from '@/src/shared/ui';

import { PublicationType as GQLPublicationType } from '../../../model/publication.types';
import {
  getPublicationFileValidationSchema,
  getSupportedPublicationFileTypes,
} from '../../../model/publication.validation';

type EditFileProps = {
  publicationType: GQLPublicationType;
  disabled: boolean;
  loading: boolean;
  fileUrl?: string;
  pendingFileName?: string;
  progress?: number | null;
  onSubmit?: (file: File) => void | Promise<void>;
};

const { PUBLICATION_UPLOAD_FILE_DISABLED } = NOTIFICATIONS;

const EditFile = ({
  publicationType,
  disabled,
  loading,
  fileUrl,
  pendingFileName,
  progress,
  onSubmit,
}: EditFileProps) => {
  const { sendErrorNotification } = useNotifications();

  const onDisabledClick = () => {
    sendErrorNotification(PUBLICATION_UPLOAD_FILE_DISABLED);
  };

  const supportedFileTypes = getSupportedPublicationFileTypes(publicationType);

  const onFileSelect = (file: File) => {
    const result = getPublicationFileValidationSchema(publicationType).safeParse({
      [FORM_FIELDS.PUBLICATION_FILE.name]: [file],
    });

    if (!result.success) {
      sendErrorNotification(result.error.issues[0]?.message ?? ERRORS.FILE_FORMAT_INVALID);
      return;
    }

    const submission = onSubmit?.(file);
    if (submission) void submission.catch(() => undefined);
  };

  return (
    <HostedFileField
      accept={supportedFileTypes}
      disabled={disabled}
      fileUrl={fileUrl}
      label={<TranslatedContent content="publicationFile.label" namespace={NAMESPACES.enum.forms} />}
      loading={loading}
      pendingFileName={pendingFileName}
      pendingMessage={<TranslatedContent content="publicationFile.pending" namespace={NAMESPACES.enum.forms} />}
      progress={progress}
      onFileSelect={onFileSelect}
      onDisabledAction={onDisabledClick}
    />
  );
};

export default EditFile;
