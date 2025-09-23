'use client';

import { AnimatePresence } from 'motion/react';

import { Form } from './components/Form';
import { Preview } from './components/Preview';
import useEditWorkTitlesForm from './useEditWorkTitlesFormWithPreview';

const EditWorkTitlesFormWithPreview = () => {
  const {
    fullMainTitle,
    control,
    isValid,
    fields,
    isMarkdownMode,
    isPreviewMode,
    selectedLanguages,
    submit,
    deleteLanguage,
    addLanguage,
    switchFormMode,
    selectLanguageAsMain,
    getTitleFieldName,
    getSubtitleFieldName,
    getLanguageFieldName,
    switchPreviewMode,
  } = useEditWorkTitlesForm();

  return (
    <AnimatePresence initial={false} mode="wait">
      {isPreviewMode ? (
        <Preview title={fullMainTitle} list={selectedLanguages} onEdit={switchPreviewMode} />
      ) : (
        <Form
          fields={fields}
          control={control}
          isValid={isValid}
          isMarkdownMode={isMarkdownMode}
          switchFormMode={switchFormMode}
          getTitleFieldName={getTitleFieldName}
          getSubtitleFieldName={getSubtitleFieldName}
          getLanguageFieldName={getLanguageFieldName}
          selectLanguageAsMain={selectLanguageAsMain}
          deleteLanguage={deleteLanguage}
          addLanguage={addLanguage}
          onSubmit={submit}
        />
      )}
    </AnimatePresence>
  );
};

export default EditWorkTitlesFormWithPreview;
