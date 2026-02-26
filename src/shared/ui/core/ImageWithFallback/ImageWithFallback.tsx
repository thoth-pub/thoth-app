'use client';

import Image, { ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

type ImageWithFallbackProps = ImageProps & { fallback?: string; placeholderOpacity?: number };

const ImageWithFallback = (props: ImageWithFallbackProps) => {
  const { fallback = '/placeholder.svg', placeholderOpacity = 1, alt, src, ...rest } = props;
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsError(false);
  }, [src]);

  return (
    <Image
      suppressHydrationWarning
      alt={alt}
      onError={() => setIsError(true)}
      src={isError || src?.toString().length === 0 ? fallback : src}
      style={{ opacity: isError ? placeholderOpacity : 1 }}
      {...rest}
    />
  );
};

export default ImageWithFallback;
