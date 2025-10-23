import { useEffect, useState } from 'react';

const useIsDragStarted = () => {
  const [isDragStarted, setIsDragStarted] = useState(false);

  const handleDragOver = () => {
    setIsDragStarted(true);
  };

  const handleDragLeaveOrDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragStarted(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    window.addEventListener('dragover', handleDragOver, { signal });
    window.addEventListener('dragleave', handleDragLeaveOrDrop, { signal });
    window.addEventListener('drop', handleDragLeaveOrDrop, { signal });

    return () => {
      controller.abort();
    };
  }, []);

  return isDragStarted;
};

export default useIsDragStarted;
