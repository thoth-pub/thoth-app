'use client';

import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { config } from '@/config';

const {
  animation: { duration },
} = config;

function Template({ children }: { children: Readonly<ReactNode> }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={pathname}
        initial={{ opacity: 0, x: '300dvw ' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '300dvw' }}
        transition={{ duration, type: 'spring' }}
        className="flex w-full flex-col gap-[var(--default-gap)] p-[var(--default-content-padding)]"
      >
        {children}
      </motion.section>
    </AnimatePresence>
  );
}

export default Template;
