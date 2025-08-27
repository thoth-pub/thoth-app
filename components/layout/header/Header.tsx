import Image from 'next/image';
import Link from 'next/link';

import { ROUTES } from '@/constants';

const Header = () => {
  return (
    <header className="min-h-[var(--header-height)] border-b-2 border-b-[var(--color-border)] py-3.5">
      <div className="mx-auto flex max-w-[var(--max-width)] items-center justify-between px-[var(--side-padding)]">
        <Link href={ROUTES.ROOT}>
          <Image src="/logo.png" alt="Thoth Open Metadata logo" width={110} height={62} priority />
        </Link>
      </div>
    </header>
  );
};

export default Header;
