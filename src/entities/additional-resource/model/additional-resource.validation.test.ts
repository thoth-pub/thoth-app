import { describe, expect, it } from 'vitest';

import { ERRORS } from '@/src/shared/constants';

import { getAdditionalResourceFileValidationSchema } from './additional-resource.validation';

const makeFile = (name: string, type: string, size = 7000) => new File([new Uint8Array(size)], name, { type });

const validateFile = (resourceType: string, file: File) =>
  getAdditionalResourceFileValidationSchema(resourceType).safeParse({ file: [file] });

const firstMessage = (result: ReturnType<typeof validateFile>) =>
  result.success ? undefined : result.error.issues[0]?.message;

describe('getAdditionalResourceFileValidationSchema', () => {
  it.each([
    ['DOCUMENT', 'notes.docx'],
    ['AUDIO', 'talk.mp3'],
    ['DATASET', 'table.parquet'],
  ])('accepts a supported %s file whose browser MIME type is empty', (resourceType, fileName) => {
    expect(validateFile(resourceType, makeFile(fileName, '')).success).toBe(true);
  });

  it('rejects an unsupported extension when the MIME type is empty', () => {
    const result = validateFile('DOCUMENT', makeFile('malware.exe', ''));

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(ERRORS.FILE_FORMAT_INVALID);
  });

  it('keeps enforcing per-resource-type restrictions for empty-MIME files', () => {
    expect(validateFile('DOCUMENT', makeFile('talk.mp3', '')).success).toBe(false);
    expect(validateFile('AUDIO', makeFile('notes.docx', '')).success).toBe(false);
  });

  it('rejects a known unsupported MIME type even when the extension looks supported', () => {
    expect(validateFile('DOCUMENT', makeFile('report.pdf', 'application/x-msdownload')).success).toBe(false);
  });

  it('accepts a supported MIME type as before', () => {
    expect(validateFile('DOCUMENT', makeFile('report.pdf', 'application/pdf')).success).toBe(true);
  });

  it('still enforces size bounds for empty-MIME files', () => {
    expect(firstMessage(validateFile('DOCUMENT', makeFile('notes.docx', '', 10)))).toBe(ERRORS.MIN_FILE_SIZE_NOT_MET);
  });
});
