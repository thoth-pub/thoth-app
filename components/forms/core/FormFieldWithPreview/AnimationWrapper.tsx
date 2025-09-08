import { motion } from 'motion/react';
import { type ReactNode } from 'react';

type AnimationWrapperProps = {
  children: Readonly<ReactNode>;
  key?: string;
  className?: string;
  onDoubleClick?: () => void;
};

export const AnimationWrapper = (props: AnimationWrapperProps) => {
  const { children, className, key, onDoubleClick } = props;

  return (
    <motion.div
      className={className}
      key={key}
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
