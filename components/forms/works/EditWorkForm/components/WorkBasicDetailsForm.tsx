'use client';

import EditIcon from '@mui/icons-material/Edit';
import MDEditor from '@uiw/react-md-editor';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import { IconButton, InputLabel, MarkdownField } from '@/components';
import { FORM_FIELDS, IDs } from '@/constants';

import { FormAccordionSection } from './FormAccordionSection';
import { useWorkBasicDetailsForm } from './hooks/useWorkBasicDetailsForm';

const {
  FORM_FIELDS: { WORK_TITLE: WORK_TITLE_ID },
  FORM_SECTIONS: { BASIC_DETAILS },
} = IDs;

const { WORK_TITLE } = FORM_FIELDS;

// TODO: refactor this component
export const WorkBasicDetailsForm = () => {
  const [isInEditState, setIsInEditState] = useState(false);
  const { control, formState, submit } = useWorkBasicDetailsForm();

  const switchEditState = () => {
    setIsInEditState(!isInEditState);
  };

  return (
    <FormAccordionSection title="Basic Details" panelId={BASIC_DETAILS}>
      <AnimatePresence initial={false} mode="wait">
        <div className="flex">
          <InputLabel className="min-w-[10rem]" htmlFor={WORK_TITLE_ID}>
            {WORK_TITLE.label}
          </InputLabel>
          <form className="flex grow flex-row hover:[&>div>button]:opacity-100" onSubmit={submit}>
            {!isInEditState && (
              <motion.div
                key="view-mode"
                className="flex grow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeIn' }}
              >
                <IconButton
                  onClick={switchEditState}
                  size="small"
                  className="mr-2 opacity-0 transition duration-300 ease-in-out"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <div onDoubleClick={switchEditState}>
                  <MDEditor.Markdown
                    source={formState.workTitle}
                    style={{
                      whiteSpace: 'pre-wrap',
                      width: '100%',
                      backgroundColor: 'transparent',
                      color: 'var(--color-markdown-preview-text)',
                    }}
                  />
                </div>
              </motion.div>
            )}
            {isInEditState && (
              <div className="flex flex-grow flex-col">
                <motion.div
                  className="flex grow flex-col"
                  key="edit-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeIn' }}
                >
                  <MarkdownField name={WORK_TITLE.name} control={control} onSave={switchEditState} disableLineBreaks />
                </motion.div>
              </div>
            )}
            <button type="submit">Save</button>
          </form>
        </div>
      </AnimatePresence>
    </FormAccordionSection>
  );
};
