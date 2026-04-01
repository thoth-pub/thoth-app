import 'react-image-gallery/styles/image-gallery.css';
import './gallery.css';

import Image from 'next/image';
import ImageGallery from 'react-image-gallery';

type LandingPagesGalleryProps = {
  images: string[];
  width?: number;
  height?: number;
};

const LandingPagesGallery = (props: LandingPagesGalleryProps) => {
  const { images, width = 100, height = 150 } = props;

  const isEmpty = images.length === 0;

  if (isEmpty) return <Image src="/placeholder.svg" alt="Placeholder" width={width} height={height} />;

  const items = images.map((image) => ({
    original: image,
    thumbnail: image,
    originalClass: `max-h-[${height}px] w-full h-[${height}px]`,
  }));

  return (
    <div className={`max-w-[${width}px] max-h-[${height}px] overflow-clip`} onClick={(e) => e.stopPropagation()}>
      <ImageGallery
        items={items}
        additionalClass={`max-h-[${height}px] w-full h-[${height}px]`}
        showFullscreenButton={false}
        showPlayButton={false}
        showThumbnails={false}
      />
    </div>
  );
};

export default LandingPagesGallery;
