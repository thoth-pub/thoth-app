'use client';

import { motion } from 'motion/react';

import { mergeStyles } from '@/src/shared/utils';

const TableFormsWrapper = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <motion.div
      className={mergeStyles(
        `m-4 flex max-w-full flex-col gap-8 rounded-xl bg-(--color-form-background) lg:my-4 lg:ml-0.5`,
        className,
      )}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeIn' }}
    >
      {children}
    </motion.div>
  );
};

export default TableFormsWrapper;
