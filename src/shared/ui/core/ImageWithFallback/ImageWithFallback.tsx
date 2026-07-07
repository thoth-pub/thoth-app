'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

type ImageWithFallbackProps = ImageProps & { fallback?: string; placeholderOpacity?: number };

const ImageWithFallback = (props: ImageWithFallbackProps) => {
  const { fallback = '/placeholder.svg', placeholderOpacity = 1, alt, src, ...rest } = props;
  const [isError, setIsError] = useState<boolean>(false);
  // Reset the error during render when the source changes, instead of in an effect:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevSrc, setPrevSrc] = useState(src);

  if (prevSrc !== src) {
    setPrevSrc(src);
    setIsError(false);
  }

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
