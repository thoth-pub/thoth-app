'use client';

import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import PermIdentityRoundedIcon from '@mui/icons-material/PermIdentityRounded';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { PAGES } from '@/src/shared/constants';
import { IconButton, Paper, Typography } from '@/src/shared/ui';

import ContentLanguage from '../../i18n/ContentLanguage';
import { ChangeActivePublisher } from '../../publisher';

const Navigation = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Paper
      component="aside"
      elevation={1}
      className="sticky top-3 max-h-[40rem] shrink-0 rounded-[var(--border-nav-radius)] border-1 border-[var(--color-nav-border)] bg-[var(--color-nav-background)] p-3"
    >
      <motion.div
        animate={{ width: isExpanded ? '15rem' : '4rem' }}
        className="flex h-full max-w-[15rem] flex-col gap-2 overflow-hidden duration-300"
      >
        <Image
          src="/logo.png"
          alt="Thoth Open Metadata logo"
          className="block min-h-[97px] min-w-[170px] shrink-0"
          width={170}
          height={97}
          priority
        />

        <ChangeActivePublisher />
        <ContentLanguage />
        <nav>
          <ul className="flex flex-col rounded-[var(--border-nav-radius)] border-1 border-[var(--color-nav-border)]">
            {PAGES.map(({ name, href, icon: Icon }) => (
              <li key={href} className="gap-2 px-[18px] py-2 duration-300 hover:bg-[var(--color-hover)]">
                <Link href={href} className="flex shrink-0 items-center gap-2">
                  <Icon color="primary" />
                  <Typography
                    color="primary"
                    component="span"
                    className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {name}
                  </Typography>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto flex gap-2 rounded-[var(--border-nav-radius)] border-1 border-[var(--color-nav-border)] px-[18px] py-2">
          <PermIdentityRoundedIcon color="primary" className="my-auto" />
          <Typography
            color="primary"
            component="span"
            className={`flex flex-col gap-1 font-semibold transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
          >
            John Doe John Doe John Doe
            <Typography color="primary" component="span" variant="body2" className="overflow-hidden text-ellipsis">
              john.doelongmail@example.com
            </Typography>
          </Typography>
        </div>

        <IconButton onClick={() => setIsExpanded(!isExpanded)} className="mx-auto">
          {isExpanded ? <ArrowForwardIosRoundedIcon /> : <ArrowBackIosNewRoundedIcon />}
        </IconButton>
      </motion.div>
    </Paper>
  );
};

export default Navigation;
