'use client';

import { motion } from 'motion/react';
import { type ReactNode } from 'react';

type AnimationWrapperProps = {
  children: Readonly<ReactNode>;
  className?: string;
  onDoubleClick?: () => void;
};

const FormAnimationWrapper = (props: AnimationWrapperProps) => {
  const { children, className, onDoubleClick } = props;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeIn' }}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </motion.div>
  );
};

export default FormAnimationWrapper;
