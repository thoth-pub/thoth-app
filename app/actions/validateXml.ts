'use server';

import { parse } from '@5stones/onix';
import type { ONIXMessageRoot } from '@5stones/onix/dist/interfaces';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/src/shared/lib/auth/auth';

export type ValidationResult =
  | {
      status: 'success';
      data: ONIXMessageRoot;
    }
  | {
      status: 'error';
      error: string;
    };

export const validateXml = async (file: File): Promise<ValidationResult> => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { status: 'error', error: 'Unauthorized' };
  }

  const xmlString = await file.text();

  try {
    const result = await parse(xmlString);

    return { status: 'success', data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('ERROR: ', error);
    return { status: 'error', error: message };
  }
};
