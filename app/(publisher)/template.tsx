'use client';

import { motion } from 'motion/react';
import { ReactNode } from 'react';

import { appConfig } from '@/src/shared/config';

const {
  animation: { duration },
} = appConfig;

function Template({ children }: { children: Readonly<ReactNode> }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration }}
      className="flex w-full flex-col gap-(--default-gap) px-5 pb-2 xl:pb-3"
    >
      {children}
    </motion.div>
  );
}

export default Template;
