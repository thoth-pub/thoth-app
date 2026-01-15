import { MarkupFormat } from '@/gql/graphql';
import { FormFieldOption, LocaleCodeType, TitleEntity } from '@/src/shared';
import { MarkdownFormats } from '@/src/shared/constants/markdown';

import { SetEntity, SetTitleFormType } from '../../model/set.types';
import EditSetImprint from '../EditSetImprint/EditSetImprint';
import { EditSetTitle } from '../EditSetTitle/EditSetTitle';

type AddNewSetFormProps = {
  set: SetEntity;
  imprintOptions: FormFieldOption[];
  onUpdateImprint: (imprintId: string) => void;
  onUpdateTitles: (titles: TitleEntity[], markupFormat: MarkupFormat.JatsXml | MarkupFormat.PlainText) => void;
  onDeleteTitle: (titleId: string) => void;
};

export const AddNewSetForm = (props: AddNewSetFormProps) => {
  const { set, imprintOptions, onUpdateImprint, onUpdateTitles, onDeleteTitle } = props;

  const updateImprint = (imprintId: string) => {
    onUpdateImprint(imprintId);
  };

  const updateTitles = (data: SetTitleFormType) => {
    const { titles, markdownFormat } = data;

    const markupFormat = markdownFormat ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;

    onUpdateTitles(
      titles.map(({ titleId, workTitle, subtitle = '', language }, index) => ({
        id: titleId,
        title: workTitle,
        subtitle,
        localeCode: language.value as LocaleCodeType,
        canonical: index === 0,
        fullTitle: `${workTitle} ${subtitle}`,
      })),
      markupFormat,
    );
  };

  const deleteTitle = (titleId: string) => {
    onDeleteTitle(titleId);
  };

  return (
    <div className="flex flex-col gap-(--default-gap) pl-4">
      <EditSetTitle set={set} onSubmit={updateTitles} onDelete={deleteTitle} />
      <EditSetImprint imprintId={set.imprintId} imprintOptions={imprintOptions} onSubmit={updateImprint} />
    </div>
  );
};
