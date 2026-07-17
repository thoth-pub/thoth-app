import { describe, expect, it } from 'vitest';

import { appConfig } from '@/src/shared/config';

import { coverUrlValidationSchema } from './work.validation';

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
