'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useWork } from '@/src/entities/work';
import type { PagesCountForm } from '@/src/entities/work/model/work.types';
import { pagesCountValidationSchema } from '@/src/entities/work/model/work.validation';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import {
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  MultipleContentWrapper,
  Preview,
  Typography,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertArabicToRoman, getPagesPlaceholder } from '@/src/shared/utils';

const {
  WORK_PAGES_COUNT,
  PAGES_COUNT,
  PAGES_RANGE,
  WORK_FRONTMATTER_COUNT,
  WORK_BACKMATTER_COUNT,
  WORK_FIRST_PAGE,
  WORK_LAST_PAGE,
} = FORM_FIELDS;

const { WORK_FIRST_PAGE: WORK_FIRST_PAGE_HELPER_TEXT } = HELPER_TEXT;

type EditPagesCountProps = BaseRecommendedSectionProps & {
  isChapter?: boolean;
};

export const EditPagesCount = (props: EditPagesCountProps) => {
  const { workId, recommended = false, isChapter = false } = props;

  const { work, updateWork } = useWork(workId);
  const { t } = useTranslation();

  const { pageCount, frontmatterCount, backmatterCount, firstPage, lastPage } = work;

  const showPagesCountIndicator = recommended && pageCount === 0;
  const backmatterValue = convertArabicToRoman(backmatterCount);
  const frontmatterValue = convertArabicToRoman(frontmatterCount);

  const pagePlaceholder = t('page');
  const pagesPlaceholder = t('pages');

  const pageBreakdownValue = useMemo(() => {
    const res: string[] = [];

    if (frontmatterCount) {
      res.push(frontmatterValue);
    }

    if (pageCount) {
      res.push(
        `${pageCount - frontmatterCount - backmatterCount} ${pageCount > 1 ? pagesPlaceholder : pagePlaceholder}`,
      );
    }

    if (backmatterCount) {
      res.push(backmatterValue);
    }

    return res.join(' + ').toLowerCase();
  }, [pageCount, frontmatterCount, backmatterCount, pagePlaceholder]);

  const workPlaceholder = pageCount
    ? `${pageCount} ${pageCount > 1 ? pagesPlaceholder : pagePlaceholder} (${pageBreakdownValue})`
    : '';
  const chapterPlaceholder = getPagesPlaceholder(firstPage, lastPage, pageCount, pagePlaceholder, pagesPlaceholder);

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
        [WORK_FIRST_PAGE.name]: firstPage ? firstPage : '',
        [WORK_LAST_PAGE.name]: lastPage ? lastPage : '',
      }}
      validationSchema={pagesCountValidationSchema}
      onSubmit={handleSubmit}
      faq={WORK_FIRST_PAGE_HELPER_TEXT}
      formFields={({ control }) => (
        <MultipleContentWrapper>
          {isChapter && (
            <>
              <ContentWrapper>
                <FormFieldLabel label={WORK_FIRST_PAGE.label} id={WORK_FIRST_PAGE.name} />
                <FormTextField
                  control={control}
                  name={WORK_FIRST_PAGE.name}
                  id={WORK_FIRST_PAGE.name}
                  type={WORK_FIRST_PAGE.type}
                  min={0}
                />
              </ContentWrapper>
              <ContentWrapper>
                <FormFieldLabel label={WORK_LAST_PAGE.label} id={WORK_LAST_PAGE.name} />
                <FormTextField
                  control={control}
                  name={WORK_LAST_PAGE.name}
                  id={WORK_LAST_PAGE.name}
                  type={WORK_LAST_PAGE.type}
                  min={0}
                />
              </ContentWrapper>
            </>
          )}
          <ContentWrapper>
            <FormFieldLabel
              label={WORK_PAGES_COUNT.label}
              id={WORK_PAGES_COUNT.name}
              recommended={showPagesCountIndicator}
            />
            <FormTextField
              control={control}
              name={WORK_PAGES_COUNT.name}
              id={WORK_PAGES_COUNT.name}
              type={WORK_PAGES_COUNT.type}
              min={0}
            />
          </ContentWrapper>
          {!isChapter && (
            <>
              <ContentWrapper>
                <FormFieldLabel label={WORK_FRONTMATTER_COUNT.label} id={WORK_FRONTMATTER_COUNT.name} />
                <FormTextField
                  control={control}
                  name={WORK_FRONTMATTER_COUNT.name}
                  id={WORK_FRONTMATTER_COUNT.name}
                  type={WORK_FRONTMATTER_COUNT.type}
                  min={0}
                />
              </ContentWrapper>
              <ContentWrapper>
                <FormFieldLabel label={WORK_BACKMATTER_COUNT.label} id={WORK_BACKMATTER_COUNT.name} />
                <FormTextField
                  control={control}
                  name={WORK_BACKMATTER_COUNT.name}
                  id={WORK_BACKMATTER_COUNT.name}
                  type={WORK_BACKMATTER_COUNT.type}
                  min={0}
                />
              </ContentWrapper>
            </>
          )}
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={isChapter ? PAGES_RANGE.label : PAGES_COUNT.label}
          value={isChapter ? chapterPlaceholder : workPlaceholder}
          recommended={showPagesCountIndicator}
          disabled={disabled}
          onEdit={onEdit}
        >
          {(chapterPlaceholder.length > 0 || workPlaceholder.length > 0) && (
            <Typography>{isChapter ? chapterPlaceholder : workPlaceholder}</Typography>
          )}
        </Preview>
      )}
    />
  );
};
