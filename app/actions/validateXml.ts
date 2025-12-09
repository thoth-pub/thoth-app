'use server';

import { parse } from '@5stones/onix';

import type { OnixData } from '@/src/widgets/AllWorks/components/utils/types';

export type ValidationResult =
  | {
      status: 'success';
      data: OnixData;
    }
  | {
      status: 'error';
      error: string;
    };

export const validateXml = async (file: File) => {
  const xmlString = await file.text();

  try {
    const result = await parse(xmlString);

    return { status: 'success', data: result };
  } catch (error) {
    console.error('ERROR: ', error);
    return { status: 'error' };
  }
};
