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

const { WORK_PAGES_COUNT, WORK_FRONTMATTER_COUNT, WORK_BACKMATTER_COUNT, WORK_FIRST_PAGE, WORK_LAST_PAGE } =
  FORM_FIELDS;

const {
  WORK_PAGES_COUNT: WORK_PAGES_COUNT_HELPER_TEXT,
  WORK_FRONTMATTER_COUNT: WORK_FRONTMATTER_COUNT_HELPER_TEXT,
  WORK_BACKMATTER_COUNT: WORK_BACKMATTER_COUNT_HELPER_TEXT,
  WORK_FIRST_PAGE: WORK_FIRST_PAGE_HELPER_TEXT,
  WORK_LAST_PAGE: WORK_LAST_PAGE_HELPER_TEXT,
} = HELPER_TEXT;

type EditPagesCountProps = BaseRecommendedSectionProps & {
  isChapter?: boolean;
};

export const EditPagesCount = (props: EditPagesCountProps) => {
  const { workId, queryToken, recommended = false, isChapter = false } = props;

  const { work, updateWork } = useWork(workId, queryToken);

  const { pageCount, frontmatterCount, backmatterCount, firstPage, lastPage } = work;

  const showPagesCountIndicator = recommended && pageCount === 0;
  const backmatterValue = convertArabicToRoman(backmatterCount);
  const frontmatterValue = convertArabicToRoman(frontmatterCount);

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

  const workPlaceholder = pageCount ? `${pageCount} ${pageCount > 1 ? 'pages' : 'page'} (${pageBreakdownValue})` : '';
  const chapterPlaceholder = `${firstPage.length > 0 ? firstPage : '0'} - ${lastPage.length > 0 ? lastPage : '0'} (${pageCount} ${pageCount > 1 ? 'pages' : 'page'})`;

  const handleSubmit = ({ pageCount, frontmatterCount, backmatterCount, firstPage, lastPage }: PagesCountForm) => {
    updateWork({
      ...work,
      pageCount: pageCount ?? 0,
      frontmatterCount: frontmatterCount ?? 0,
      backmatterCount: backmatterCount ?? 0,
      firstPage: firstPage ? `${firstPage}` : '',
      lastPage: lastPage ? `${lastPage}` : '',
    });
  };

  return (
    <EditableContent
      formId={IDs.WORK_PAGES_COUNT}
      defaultValues={{
        [WORK_PAGES_COUNT.name]: pageCount,
        [WORK_FRONTMATTER_COUNT.name]: frontmatterCount,
        [WORK_BACKMATTER_COUNT.name]: backmatterCount,
        [WORK_FIRST_PAGE.name]: firstPage ? +firstPage : 0,
        [WORK_LAST_PAGE.name]: lastPage ? +lastPage : 0,
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
              id={WORK_PAGES_COUNT.name}
              isHelperTextVisible={isHelperTextVisible}
              type={WORK_PAGES_COUNT.type}
              min={0}
            />
          </ContentWrapper>
          {isChapter && (
            <>
              <ContentWrapper>
                <FormFieldLabel label={WORK_FIRST_PAGE.label} id={WORK_FIRST_PAGE.name} />
                <FormTextField
                  control={control}
                  name={WORK_FIRST_PAGE.name}
                  helperText={WORK_FIRST_PAGE_HELPER_TEXT}
                  id={WORK_FIRST_PAGE.name}
                  isHelperTextVisible={isHelperTextVisible}
                  type={WORK_FIRST_PAGE.type}
                  min={0}
                />
              </ContentWrapper>
              <ContentWrapper>
                <FormFieldLabel label={WORK_LAST_PAGE.label} id={WORK_LAST_PAGE.name} />
                <FormTextField
                  control={control}
                  name={WORK_LAST_PAGE.name}
                  helperText={WORK_LAST_PAGE_HELPER_TEXT}
                  id={WORK_LAST_PAGE.name}
                  isHelperTextVisible={isHelperTextVisible}
                  type={WORK_LAST_PAGE.type}
                  min={0}
                />
              </ContentWrapper>
            </>
          )}
          {!isChapter && (
            <>
              <ContentWrapper>
                <FormFieldLabel label={WORK_FRONTMATTER_COUNT.label} id={WORK_FRONTMATTER_COUNT.name} />
                <FormTextField
                  control={control}
                  name={WORK_FRONTMATTER_COUNT.name}
                  helperText={WORK_FRONTMATTER_COUNT_HELPER_TEXT}
                  id={WORK_FRONTMATTER_COUNT.name}
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
                  id={WORK_BACKMATTER_COUNT.name}
                  isHelperTextVisible={isHelperTextVisible}
                  type={WORK_BACKMATTER_COUNT.type}
                  min={0}
                />
              </ContentWrapper>
            </>
          )}
        </MultipleContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview
          label={isChapter ? 'Page Range' : 'Page Count'}
          value={isChapter ? chapterPlaceholder : workPlaceholder}
          recommended={showPagesCountIndicator}
          onEdit={onEdit}
        >
          <Typography className="lg:ml-2">{isChapter ? chapterPlaceholder : workPlaceholder}</Typography>
        </Preview>
      )}
    />
  );
};
