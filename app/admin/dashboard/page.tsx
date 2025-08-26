import Link from 'next/link';

import { PAGES } from '@/constants';

export default async function DashboardPage() {
  return (
    <ul>
      {PAGES.map(({ name, href }) => (
        <li key={href}>
          <Link href={href}>{name}</Link>
        </li>
      ))}
    </ul>
  );
}
