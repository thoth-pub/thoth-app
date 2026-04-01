import { FormFieldOption } from '@/src/shared/interfaces';
import { LocaleCodeType, TitleEntity } from '@/src/shared/types';

import { SetEntity, SetTitleFormType } from '../../model/set.types';
import EditSetImprint from '../EditSetImprint/EditSetImprint';
import { EditSetTitle } from '../EditSetTitle/EditSetTitle';

type AddNewSetFormProps = {
  set: SetEntity;
  imprintOptions: FormFieldOption[];
  isImprintEditable?: boolean;
  onUpdateImprint: (imprintId: string) => void;
  onUpdateTitles: (titles: TitleEntity[]) => void;
  onDeleteTitle: (titleId: string) => void;
};

export const AddNewSetForm = (props: AddNewSetFormProps) => {
  const { set, imprintOptions, isImprintEditable = false, onUpdateImprint, onUpdateTitles, onDeleteTitle } = props;

  const updateImprint = (imprintId: string) => {
    onUpdateImprint(imprintId);
  };

  const updateTitles = (data: SetTitleFormType) => {
    const { titles } = data;

    onUpdateTitles(
      titles.map(({ titleId, workTitle, subtitle = '', language }, index) => ({
        id: titleId,
        title: workTitle,
        subtitle,
        localeCode: language.value as LocaleCodeType,
        canonical: index === 0,
        fullTitle: `${workTitle} ${subtitle}`,
      })),
    );
  };

  const deleteTitle = (titleId: string) => {
    onDeleteTitle(titleId);
  };

  return (
    <div className="flex flex-col gap-(--default-gap) pl-4">
      <EditSetTitle set={set} onSubmit={updateTitles} onDelete={deleteTitle} />
      <EditSetImprint
        disabled={!isImprintEditable}
        imprintId={set.imprintId}
        imprintOptions={imprintOptions}
        onSubmit={updateImprint}
      />
    </div>
  );
};
