'use client';

import { motion } from 'motion/react';
import { ReactNode } from 'react';

import { config } from '@/config';

const {
  animation: { duration },
} = config;

function Template({ children }: { children: Readonly<ReactNode> }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration }}
      className="flex w-full flex-col gap-[var(--default-gap)] p-[var(--default-content-padding)]"
    >
      {children}
    </motion.section>
  );
}

export default Template;
