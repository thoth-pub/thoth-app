import { useQueryClient } from '@tanstack/react-query';

import { EditSetTitle, type SetId, SetTitleFormType, useUpdateSet } from '@/src/entities/sets';
import useSet from '@/src/entities/sets/api/hooks/useSet';
import { useSetStateMachine } from '@/src/entities/sets/store/set.store';
import EditSetImprint from '@/src/entities/sets/ui/EditSetImprint/EditSetImprint';
import { useUser } from '@/src/entities/user';
import { useCreateTitle, useDeleteTitle, useUpdateTitle } from '@/src/entities/work';
import { getMainTitle, LocaleCodeType, QueryKeys, TitleEntity } from '@/src/shared';
import { CloseButton, MarkdownRenderer, MultipleContentWrapper, Typography } from '@/src/shared/ui';

import { SetBooksList } from './components/SetBooksList';

type EditSetProps = {
  setId: SetId;
  isImprintEditable?: boolean;
};

const EditSet = (props: EditSetProps) => {
  const { setId, isImprintEditable = false } = props;

  const { userImprintsOptions } = useUser();
  const { close } = useSetStateMachine();

  const { set } = useSet(setId);
  const { updateSet } = useUpdateSet();

  const queryClient = useQueryClient();
  const { createTitle } = useCreateTitle();
  const { updateTitle } = useUpdateTitle();
  const { deleteTitle } = useDeleteTitle(setId);

  const updateImprint = (imprintId: string) => {
    updateSet({ ...set, imprintId });
  };

  const updateTitles = async (data: SetTitleFormType) => {
    const { titles } = data;

    const newTitles = titles.filter((title) => !set.titles.some((setTitle) => setTitle.id === title.titleId));
    const updatedTitles = titles.filter((title) => set.titles.some((setTitle) => setTitle.id === title.titleId));

    const promises: Promise<TitleEntity>[] = [];

    newTitles.forEach(({ titleId, workTitle, subtitle = '', language }, index) => {
      promises.push(
        createTitle({
          data: {
            id: titleId,
            title: workTitle,
            subtitle,
            localeCode: language.value as LocaleCodeType,
            canonical: set.titles.length === 0 && index === 0,
            fullTitle: `${workTitle} ${subtitle}`,
          },
          relatedWorkId: set.id,
        }),
      );
    });

    updatedTitles.forEach(({ titleId, workTitle, subtitle = '', language }) => {
      const existingTitle = set.titles.find((title) => title.id === titleId);

      if (!existingTitle) return;

      promises.push(
        updateTitle({
          data: {
            id: titleId,
            title: workTitle,
            subtitle,
            localeCode: language.value as LocaleCodeType,
            canonical: existingTitle.canonical ?? false,
            fullTitle: `${workTitle} ${subtitle}`,
          },
          relatedWorkId: set.id,
        }),
      );
    });

    await Promise.all(promises);

    if (promises.length === 0) return;

    queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.set, set.id] });
  };

  return (
    <MultipleContentWrapper>
      <div className="flex justify-between">
        <Typography variant="h2" component="h3" className="text-(--color-typography) capitalize">
          <MarkdownRenderer markdown={getMainTitle(set.titles).title} />
        </Typography>
        <div className="flex gap-2">
          <CloseButton onClose={close} />
        </div>
      </div>
      <div className="flex flex-col gap-(--default-gap)">
        <EditSetTitle set={set} onSubmit={updateTitles} onDelete={deleteTitle} />
        <EditSetImprint
          disabled={!isImprintEditable}
          imprintId={set.imprintId}
          imprintOptions={userImprintsOptions}
          onSubmit={updateImprint}
        />
      </div>
      <SetBooksList setId={setId} />
    </MultipleContentWrapper>
  );
};

export default EditSet;
