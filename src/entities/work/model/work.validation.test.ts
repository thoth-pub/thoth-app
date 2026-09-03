import { describe, expect, it } from 'vitest';

import { appConfig } from '@/src/shared/config';

import { coverUrlValidationSchema, pagesCountValidationSchema } from './work.validation';

const JPEG_MIME = 'image/jpeg';
const VALID_SIZE = 7000; // between minFileSize (6250) and maxFileSize (50000000)

const makeCoverFile = (name: string, type: string, size = VALID_SIZE, jpegMagicBytes = true) => {
  const buffer = new Uint8Array(size);
  if (jpegMagicBytes) {
    buffer[0] = 0xff;
    buffer[1] = 0xd8;
    buffer[2] = 0xff;
  }
  const file = new File([buffer], name, { type });
  if (typeof file.arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    });
  }
  return file;
};

const validateCover = (file: File) => coverUrlValidationSchema.safeParseAsync({ coverUrl: [file] });

describe('cover image validation (JPEG only)', () => {
  it.each([
    ['cover.jpg', JPEG_MIME],
    ['cover.jpeg', JPEG_MIME],
    ['COVER.JPG', JPEG_MIME],
    ['Cover.JpEg', JPEG_MIME],
  ])('accepts %s with MIME %s', async (name, type) => {
    expect((await validateCover(makeCoverFile(name, type))).success).toBe(true);
  });

  it('accepts an empty browser MIME type when the extension is valid', async () => {
    expect((await validateCover(makeCoverFile('cover.jpg', ''))).success).toBe(true);
    expect((await validateCover(makeCoverFile('cover.jpeg', ''))).success).toBe(true);
  });

  it.each([
    ['cover.png', 'image/png'],
    ['cover.webp', 'image/webp'],
    ['cover.gif', 'image/gif'],
    ['cover.png', ''],
  ])('rejects non-JPEG file %s (%s)', async (name, type) => {
    expect((await validateCover(makeCoverFile(name, type))).success).toBe(false);
  });

  it('rejects a .jpg file reported by the browser as image/png', async () => {
    expect((await validateCover(makeCoverFile('cover.jpg', 'image/png'))).success).toBe(false);
  });

  it('rejects a .png file reported by the browser as image/jpeg', async () => {
    expect((await validateCover(makeCoverFile('cover.png', JPEG_MIME))).success).toBe(false);
  });

  it('rejects the non-standard image/jpg MIME type', async () => {
    expect((await validateCover(makeCoverFile('cover.jpg', 'image/jpg'))).success).toBe(false);
  });

  it('rejects a .jpg with empty MIME type but non-JPEG content', async () => {
    expect((await validateCover(makeCoverFile('cover.jpg', '', VALID_SIZE, false))).success).toBe(false);
  });

  it('still enforces the minimum cover size', async () => {
    expect((await validateCover(makeCoverFile('cover.jpg', JPEG_MIME, appConfig.minFileSize - 1))).success).toBe(false);
    expect((await validateCover(makeCoverFile('cover.jpg', JPEG_MIME, appConfig.minFileSize))).success).toBe(true);
  });

  it('rejects an empty file selection', async () => {
    expect((await coverUrlValidationSchema.safeParseAsync({ coverUrl: [] })).success).toBe(false);
    expect((await coverUrlValidationSchema.safeParseAsync({ coverUrl: undefined })).success).toBe(false);
  });
});

describe('cover-specific configuration', () => {
  it('advertises JPEG only in the picker accept string', () => {
    expect(appConfig.supportedCoverImageAccept).toBe('image/jpeg,.jpg,.jpeg');
    expect(appConfig.supportedCoverImageMimeTypes).toEqual(['image/jpeg']);
    expect(appConfig.supportedCoverImageExtensions).toEqual(['.jpg', '.jpeg']);
  });

  it('does not use the non-standard image/jpg MIME type', () => {
    expect(appConfig.supportedCoverImageMimeTypes).not.toContain('image/jpg');
    expect(appConfig.supportedCoverImageAccept).not.toContain('image/jpg,');
  });

  it('leaves additional-resource image formats unchanged', () => {
    expect(appConfig.additionalResourceFileTypesByResourceType.IMAGE).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'image/tiff',
    ]);
  });
});

const validatePages = (firstPage?: string, lastPage?: string) =>
  pagesCountValidationSchema.safeParse({ firstPage, lastPage });

const issuePaths = (result: ReturnType<typeof validatePages>) =>
  result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));

describe('chapter page range validation', () => {
  it.each([
    ['1', '20'],
    ['I', 'XI'],
    ['iv', 'ix'],
    ['A1', '20'],
    ['A1', 'A20'],
    ['B6', '20'],
    ['B6', 'B20'],
    ['7', '7'],
    ['A3', 'A3'],
  ])('accepts the valid range %s to %s', (firstPage, lastPage) => {
    expect(validatePages(firstPage, lastPage).success).toBe(true);
  });

  it.each([
    ['1', undefined],
    [undefined, '20'],
    ['A1', undefined],
    [undefined, 'XI'],
    [undefined, undefined],
    ['', ''],
  ])('keeps the single or absent endpoints %s / %s valid', (firstPage, lastPage) => {
    expect(validatePages(firstPage, lastPage).success).toBe(true);
  });

  it.each(['a1', 'AA1', '1A', 'A0', 'Appendix1', 'IIII'])('rejects the invalid first-page label %s', (firstPage) => {
    const result = validatePages(firstPage, undefined);

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('firstPage');
  });

  it.each(['a20', 'BB20', '20B', 'B0', 'Appendix20', 'VV'])('rejects the invalid last-page label %s', (lastPage) => {
    const result = validatePages(undefined, lastPage);

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('lastPage');
  });

  it.each([
    ['I', '10'],
    ['1', 'X'],
    ['A1', 'XI'],
    ['1', 'A20'],
  ])('rejects the mixed-scheme range %s to %s against the last page', (firstPage, lastPage) => {
    const result = validatePages(firstPage, lastPage);

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('lastPage');
  });

  it('rejects a changed prefix against the last page', () => {
    const result = validatePages('A1', 'B20');

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('lastPage');
  });

  it.each([
    ['20', '1'],
    ['XI', 'I'],
    ['A20', 'A1'],
    ['A20', '1'],
  ])('rejects the descending range %s to %s against the last page', (firstPage, lastPage) => {
    const result = validatePages(firstPage, lastPage);

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('lastPage');
  });

  it('distinguishes the four page-range failures by message', () => {
    const messageFor = (firstPage: string, lastPage: string) => {
      const result = validatePages(firstPage, lastPage);

      return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' | ');
    };

    const invalidLabel = messageFor('Appendix1', '20');
    const incompatible = messageFor('I', '10');
    const prefixMismatch = messageFor('A1', 'B20');
    const descending = messageFor('20', '1');

    expect(new Set([invalidLabel, incompatible, prefixMismatch, descending]).size).toBe(4);
    expect(invalidLabel).not.toMatch(/custom/i);
  });

  it('leaves the unrelated page-count fields untouched', () => {
    expect(
      pagesCountValidationSchema.safeParse({
        pageCount: 20,
        frontmatterCount: 4,
        backmatterCount: 2,
        firstPage: 'A1',
        lastPage: '20',
      }).success,
    ).toBe(true);
  });
});
