'use client';

import { useMemo } from 'react';

import { useWork } from '@/src/entities/work';
import type { PagesCountForm } from '@/src/entities/work/model/work.types';
import { pagesCountValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseRecommendedSectionProps, convertArabicToRoman, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  MultipleContentWrapper,
  Preview,
  Typography,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

const { WORK_PAGES_COUNT, WORK_FRONTMATTER_COUNT, WORK_BACKMATTER_COUNT } = FORM_FIELDS;

const {
  WORK_PAGES_COUNT: WORK_PAGES_COUNT_HELPER_TEXT,
  WORK_FRONTMATTER_COUNT: WORK_FRONTMATTER_COUNT_HELPER_TEXT,
  WORK_BACKMATTER_COUNT: WORK_BACKMATTER_COUNT_HELPER_TEXT,
} = HELPER_TEXT;

export const EditPagesCount = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken, recommended = false } = props;

  const { work, updateWork } = useWork(workId, queryToken);

  const { pageCount, frontmatterCount, backmatterCount } = work;

  const showPagesCountIndicator = recommended && pageCount === 0;
  const showFrontmatterCountIndicator = recommended && frontmatterCount === 0;
  const backmatterValue = convertArabicToRoman(backmatterCount);
  const frontmatterValue = convertArabicToRoman(frontmatterCount);

  const showIndicator = showPagesCountIndicator || showFrontmatterCountIndicator;

  const pageBreakdownValue = useMemo(() => {
    const res: string[] = [];

    if (frontmatterCount) {
      res.push(frontmatterValue);
    }

    if (pageCount) {
      res.push(`${pageCount - frontmatterCount - backmatterCount} ${pageCount > 1 ? 'pages' : 'page'}`);
    }

    if (backmatterCount) {
      res.push(backmatterValue);
    }

    return res.join(' + ').toLowerCase();
  }, [pageCount, frontmatterCount, backmatterCount]);

  const placeholder = `${pageCount} ${pageCount > 1 ? 'pages' : 'page'} (${pageBreakdownValue})`;

  const handleSubmit = ({ pageCount, frontmatterCount, backmatterCount }: PagesCountForm) => {
    updateWork({
      ...work,
      pageCount: pageCount ?? 0,
      frontmatterCount: frontmatterCount ?? 0,
      backmatterCount: backmatterCount ?? 0,
    });
  };

  return (
    <EditableContent
      formId={IDs.WORK_PAGES_COUNT}
      defaultValues={{
        [WORK_PAGES_COUNT.name]: pageCount,
        [WORK_FRONTMATTER_COUNT.name]: frontmatterCount,
        [WORK_BACKMATTER_COUNT.name]: backmatterCount,
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
              min={0}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_BACKMATTER_COUNT.label} id={WORK_BACKMATTER_COUNT.name} />
            <FormTextField
              control={control}
              name={WORK_BACKMATTER_COUNT.name}
              helperText={WORK_BACKMATTER_COUNT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={WORK_BACKMATTER_COUNT.type}
              min={0}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview label={WORK_PAGES_COUNT.label} value={placeholder} recommended={showIndicator} onEdit={onEdit}>
          <Typography>{placeholder}</Typography>
        </Preview>
      )}
    />
  );
};
