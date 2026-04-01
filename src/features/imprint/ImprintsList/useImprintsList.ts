'use client';

import type { CurrencyCode, LocaleCode } from '@/gql/graphql';
import {
  type ImprintEntity,
  ImprintId,
  useCreateImprint,
  useDeleteImprint,
  useGetPublisherImprints,
  useUpdateImprint,
} from '@/src/entities/imprint';
import { useActivePublisherPermissions, usePublisherStateMachine } from '@/src/entities/publisher';
import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { IDs } from '@/src/shared/constants';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { isDefaultId } from '@/src/shared/utils';

type ImprintFormData = {
  imprintId: string;
  imprintName: string;
  imprintUrl: string;
  crossmarkDoi: string;
  defaultPlace: string;
  defaultCurrency: CurrencyCode;
  defaultLocale: LocaleCode;
  s3Bucket: string;
  cdnDomain: string;
  cloudfrontDistId: string;
};

export const useImprintsList = () => {
  const { user } = useUser();
  const { isImprintEditable } = useActivePublisherPermissions();
  const { edit, activeFormId, closeForm } = useFormStateMachine();
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher ? activePublisher.id : '';

  const { data } = useGetPublisherImprints(publisherId, user.isSuperuser);
  const defaultImprintId = IDs.IMPRINT(appConfig.defaultId);
  const isEditingNewImprint = activeFormId && isDefaultId(activeFormId as string);
  const { createImprint: createImprintMutation } = useCreateImprint();
  const { updateImprint: updateImprintMutation } = useUpdateImprint();
  const { deleteImprint: deleteImprintMutation } = useDeleteImprint();

  const addNewImprint = () => {
    edit(defaultImprintId);
  };

  const createImprint = async ({ imprintName }: ImprintFormData) => {
    if (!activePublisher) return;

    await createImprintMutation({ publisherId: activePublisher.id, imprintName });
    closeForm();
  };

  const updateImprint = async (formData: ImprintFormData) => {
    const existingImprint = data.find((i) => i.id === formData.imprintId);

    if (!existingImprint) return;

    const entity: ImprintEntity = {
      id: formData.imprintId,
      name: formData.imprintName,
      url: formData.imprintUrl,
      crossmarkDoi: formData.crossmarkDoi,
      defaultPlace: formData.defaultPlace,
      defaultCurrency: formData.defaultCurrency,
      defaultLocale: formData.defaultLocale,
      s3Bucket: formData.s3Bucket,
      cdnDomain: formData.cdnDomain,
      cloudfrontDistId: formData.cloudfrontDistId,
      updatedAt: existingImprint.updatedAt,
      publisherName: existingImprint.publisherName,
    };

    await updateImprintMutation({ entity, publisherId });
    closeForm();
  };

  const deleteImprint = async (imprintId: ImprintId) => {
    if (!activePublisher) return;

    await deleteImprintMutation({ imprintId, publisherId: activePublisher.id });
    closeForm();
  };

  return {
    createImprint,
    updateImprint,
    deleteImprint,
    addNewImprint,
    isEditingNewImprint,
    data,
    isAddNewButtonDisabled: !!activeFormId || !isImprintEditable,
    isImprintEditable,
    isSuperuser: user.isSuperuser,
  };
};
