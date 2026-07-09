'use server';

import { parse } from '@5stones/onix';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/src/shared/lib/auth/auth';

export type ValidationResult =
  | {
      status: 'success';
      data: unknown;
    }
  | {
      status: 'error';
      error: string;
    };

export const validateXml = async (file: File) => {
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
