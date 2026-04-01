import DownloadIcon from '@mui/icons-material/Download';
import Link from 'next/link';

const DownloadFeaturedVideo = ({ fileUrl }: { fileUrl?: string }) => {
  if (!fileUrl || fileUrl.length === 0) return null;

  return (
    <Link href={fileUrl} download={fileUrl} target="_blank" rel="noopener noreferrer" className="m-auto">
      <DownloadIcon color="primary" fontSize="small" />
    </Link>
  );
};

export default DownloadFeaturedVideo;
