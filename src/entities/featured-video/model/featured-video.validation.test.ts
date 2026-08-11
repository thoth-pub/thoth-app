import { describe, expect, it } from 'vitest';

import { ERRORS } from '@/src/shared/constants';

import { featuredVideoFileValidationSchema } from './featured-video.validation';

const makeFile = (name: string, type: string, size = 7000) => new File([new Uint8Array(size)], name, { type });

const validateFile = (file: File) => featuredVideoFileValidationSchema.safeParse({ file: [file] });

const firstMessage = (result: ReturnType<typeof validateFile>) =>
  result.success ? undefined : result.error.issues[0]?.message;

describe('featuredVideoFileValidationSchema', () => {
  it.each(['video.mp4', 'video.mkv', 'video.mov'])(
    'accepts a supported video file %s whose browser MIME type is empty',
    (fileName) => {
      expect(validateFile(makeFile(fileName, '')).success).toBe(true);
    },
  );

  it('rejects an unsupported extension when the MIME type is empty', () => {
    const result = validateFile(makeFile('malware.exe', ''));

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(ERRORS.FILE_FORMAT_INVALID);
  });

  it('rejects a known unsupported MIME type even when the extension looks supported', () => {
    expect(validateFile(makeFile('video.mp4', 'application/x-msdownload')).success).toBe(false);
  });

  it('accepts a supported MIME type as before', () => {
    expect(validateFile(makeFile('video.mp4', 'video/mp4')).success).toBe(true);
  });

  it('still enforces size bounds for empty-MIME files', () => {
    expect(firstMessage(validateFile(makeFile('video.mp4', '', 10)))).toBe(ERRORS.MIN_FILE_SIZE_NOT_MET);
  });
});
