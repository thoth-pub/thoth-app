'use server';

// @ts-expect-error No declaration file found for module 'node-onix'.
import onix from 'node-onix';

export const validateXml = async (file: File) => {
  const xmlString = await file.text();

  try {
    const result = await onix.parse(xmlString);

    return { status: 'success', data: JSON.stringify(result, null, 100) };
  } catch (error) {
    console.error('ERROR: ', error);
    return { status: 'error' };
  }
};
