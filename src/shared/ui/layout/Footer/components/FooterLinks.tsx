import { appConfig } from '@/src/shared/config';
import { Link, Typography } from '@/src/shared/ui';

const {
  thothLink,
  cc4Link,
  publicDomainLink,
  meta: { title },
} = appConfig;

export const FooterLinks = () => {
  return (
    <>
      <Typography className="shrink-0">
        Powered by{' '}
        <Link href={thothLink} target="_blank" rel="noopener noreferrer">
          {title}
        </Link>
      </Typography>
      <div className="wrap flex shrink-0 gap-2">
        <Typography>
          Dashboard:{' '}
          <Link href={cc4Link} target="_blank" rel="noopener noreferrer">
            CC BY 4.0
          </Link>
        </Typography>
        <Typography>
          Data:{' '}
          <Link href={publicDomainLink} target="_blank" rel="noopener noreferrer">
            CC0 Public Domain
          </Link>
        </Typography>
      </div>
      <Typography variant="body2" className="basis-full text-center xl:basis-auto">
        © 2025 Thoth Open Metadata
      </Typography>
    </>
  );
};
