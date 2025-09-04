import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import { AnimatePresence, motion } from 'motion/react';

import { Button, DateField, IconButton, InputLabel, TextField, Typography } from '@/components';
import { FORM_FIELDS, IDs, WorkStatus } from '@/constants';

import { useFormHeader } from '../hooks';

const { WORK_STATUS, PUBLICATION_DATE } = FORM_FIELDS;
const { WORK_STATUS: WORK_STATUS_ID } = IDs.FORM_FIELDS;

// TODO: refactor this component
export const FormHeader = () => {
  const { isPublicationDateVisible, control, workStatusOptions, addPublicationDate, submit } = useFormHeader();

  return (
    <form className="flex flex-wrap items-start justify-between gap-4 overflow-hidden rounded-2xl bg-[var(--color-background-alt)] px-8 py-4 shadow-xl">
      <Typography variant="h1" component="h1">
        Work Editor
      </Typography>
      <div className="flex flex-col flex-wrap items-start gap-4 lg:flex-row lg:gap-0">
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-row">
            <InputLabel className="min-w-[10rem]" htmlFor={WORK_STATUS_ID}>
              {WORK_STATUS.label}
            </InputLabel>
            <TextField
              id={WORK_STATUS_ID}
              className="min-w-[16rem]"
              control={control}
              name={WORK_STATUS.name}
              options={workStatusOptions}
              select
              defaultValue={WorkStatus.enum.Forthcoming}
            />
          </fieldset>
          <AnimatePresence initial={false}>
            {isPublicationDateVisible && (
              <motion.fieldset
                className="flex flex-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeIn' }}
              >
                <InputLabel className="min-w-[10rem]" htmlFor={WORK_STATUS_ID}>
                  {PUBLICATION_DATE.label}
                </InputLabel>
                <DateField className="min-w-[16rem]" control={control} name={PUBLICATION_DATE.name} />
              </motion.fieldset>
            )}
          </AnimatePresence>
        </div>
        <Button
          variant="outlined"
          className="lg:ml-4"
          startIcon={isPublicationDateVisible ? <RemoveIcon /> : <AddIcon />}
          onClick={addPublicationDate}
        >
          Publication Date
        </Button>
      </div>
      <div className="m-auto flex flex-shrink-0 items-center gap-4 lg:m-0">
        <Typography variant="body2" className="text-center">
          Your data saves <br /> automatically
        </Typography>
        <IconButton aria-label="delete" size="small">
          <DeleteIcon fontSize="small" />
        </IconButton>
        <Button variant="contained" type="submit" onClick={submit}>
          Done
        </Button>
      </div>
    </form>
  );
};
