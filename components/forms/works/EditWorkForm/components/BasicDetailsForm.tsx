'use client';
import EditIcon from '@mui/icons-material/Edit';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { IconButton, InputLabel, TextField } from '@/components';
import { FORM_FIELDS, IDs } from '@/constants';

import { FormAccordionSection } from './FormAccordionSection';

const {
  FORM_FIELDS: { WORK_TITLE: WORK_TITLE_ID },
  FORM_SECTIONS: { BASIC_DETAILS },
} = IDs;

const { WORK_TITLE } = FORM_FIELDS;

// TODO: refactor this component
export const BasicDetailsForm = () => {
  const [isInEditState, setIsInEditState] = useState(false);
  const { control } = useForm();

  return (
    <FormAccordionSection title="Basic Details" panelId={BASIC_DETAILS}>
      <div className="flex">
        <InputLabel className="min-w-[10rem]" htmlFor={WORK_TITLE_ID}>
          {WORK_TITLE.label}
        </InputLabel>
        <div className="flex grow flex-row hover:[&>div>button]:opacity-100">
          <AnimatePresence initial={false} mode="wait">
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
                  onClick={() => setIsInEditState(!isInEditState)}
                  className="mr-2 p-0 opacity-0 transition duration-300 ease-in-out"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <div>Test</div>
              </motion.div>
            )}
            {isInEditState && (
              <motion.div
                className="flex grow"
                key="edit-mode"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeIn' }}
              >
                <TextField id={WORK_TITLE_ID} control={control} name={WORK_TITLE.name} fullWidth />
                <button onClick={() => setIsInEditState(!isInEditState)}>Close</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </FormAccordionSection>
  );
};
