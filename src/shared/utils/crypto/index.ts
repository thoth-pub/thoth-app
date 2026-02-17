import crypto from 'crypto';

export const generateFileSha256 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();

  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from(arrayBuffer));

  return hash.digest('hex');
};
