'use client';

import { useMemo } from 'react';

import { useWork } from '@/src/entities/work';
import type { PagesCountForm, WorkId } from '@/src/entities/work/model/work.types';
import { pagesCountValidationSchema } from '@/src/entities/work/model/work.validation';
import { HELPER_TEXT, IDs, type QueryToken } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

type EditPagesCountProps = {
  workId: WorkId;
  queryToken: QueryToken;
  recommended?: boolean;
};

const { WORK_PAGES_COUNT, WORK_FRONTMATTER_COUNT } = FORM_FIELDS;

const { WORK_PAGES_COUNT: WORK_PAGES_COUNT_HELPER_TEXT, WORK_FRONTMATTER_COUNT: WORK_FRONTMATTER_COUNT_HELPER_TEXT } =
  HELPER_TEXT;

export const EditPagesCount = (props: EditPagesCountProps) => {
  const { workId, queryToken, recommended = false } = props;

  const { work, updateWorkRef } = useWork(workId, queryToken);

  const { pageCount, pageBreakdown } = work;

  const showPagesCountIndicator = recommended && pageCount === 0;
  const showFrontmatterCountIndicator = recommended && pageBreakdown.length === 0;

  const showIndicator = showPagesCountIndicator || showFrontmatterCountIndicator;

  const placeholder = useMemo(() => {
    const res: string[] = [];

    if (pageBreakdown.length) {
      res.push(pageBreakdown);
    }

    if (pageCount) {
      res.push(`${pageCount} ${pageCount > 1 ? 'pages' : 'page'}`);
    }

    return res.join(' + ');
  }, [pageCount, pageBreakdown]);

  const handleSubmit = ({ pageCount, frontmatterCount }: PagesCountForm) => {
    updateWorkRef({ ...work, pageCount: pageCount ?? 0, pageBreakdown: frontmatterCount ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.WORK_PAGES_COUNT}
      defaultValues={{
        [WORK_PAGES_COUNT.name]: pageCount,
        [WORK_FRONTMATTER_COUNT.name]: pageBreakdown,
      }}
      validationSchema={pagesCountValidationSchema}
      onSubmit={handleSubmit}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel
              label={WORK_PAGES_COUNT.label}
              id={WORK_PAGES_COUNT.name}
              recommended={showPagesCountIndicator}
            />
            <FormTextField
              control={control}
              name={WORK_PAGES_COUNT.name}
              helperText={WORK_PAGES_COUNT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={WORK_PAGES_COUNT.type}
              min={0}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel
              label={WORK_FRONTMATTER_COUNT.label}
              id={WORK_FRONTMATTER_COUNT.name}
              recommended={showFrontmatterCountIndicator}
            />
            <FormTextField
              control={control}
              name={WORK_FRONTMATTER_COUNT.name}
              helperText={WORK_FRONTMATTER_COUNT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={WORK_FRONTMATTER_COUNT.type}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview label={WORK_PAGES_COUNT.label} value={placeholder} recommended={showIndicator} onEdit={onEdit} />
      )}
    />
  );
};
