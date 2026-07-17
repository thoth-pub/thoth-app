import { describe, expect, it } from 'vitest';

import { appConfig } from '@/src/shared/config';

import { coverUrlValidationSchema } from './work.validation';

const JPEG_MIME = 'image/jpeg';
const VALID_SIZE = 7000; // between minFileSize (6250) and maxFileSize (50000000)

const makeCoverFile = (name: string, type: string, size = VALID_SIZE) =>
  new File([new Uint8Array(size)], name, { type });

const validateCover = (file: File) => coverUrlValidationSchema.safeParse({ coverUrl: [file] });

describe('cover image validation (JPEG only)', () => {
  it.each([
    ['cover.jpg', JPEG_MIME],
    ['cover.jpeg', JPEG_MIME],
    ['COVER.JPG', JPEG_MIME],
    ['Cover.JpEg', JPEG_MIME],
  ])('accepts %s with MIME %s', (name, type) => {
    expect(validateCover(makeCoverFile(name, type)).success).toBe(true);
  });

  it('accepts an empty browser MIME type when the extension is valid', () => {
    expect(validateCover(makeCoverFile('cover.jpg', '')).success).toBe(true);
    expect(validateCover(makeCoverFile('cover.jpeg', '')).success).toBe(true);
  });

  it.each([
    ['cover.png', 'image/png'],
    ['cover.webp', 'image/webp'],
    ['cover.gif', 'image/gif'],
    ['cover.png', ''],
  ])('rejects non-JPEG file %s (%s)', (name, type) => {
    expect(validateCover(makeCoverFile(name, type)).success).toBe(false);
  });

  it('rejects a .jpg file reported by the browser as image/png', () => {
    expect(validateCover(makeCoverFile('cover.jpg', 'image/png')).success).toBe(false);
  });

  it('rejects a .png file reported by the browser as image/jpeg', () => {
    expect(validateCover(makeCoverFile('cover.png', JPEG_MIME)).success).toBe(false);
  });

  it('rejects the non-standard image/jpg MIME type', () => {
    expect(validateCover(makeCoverFile('cover.jpg', 'image/jpg')).success).toBe(false);
  });

  it('still enforces the minimum cover size', () => {
    expect(validateCover(makeCoverFile('cover.jpg', JPEG_MIME, appConfig.minFileSize - 1)).success).toBe(false);
    expect(validateCover(makeCoverFile('cover.jpg', JPEG_MIME, appConfig.minFileSize)).success).toBe(true);
  });

  it('rejects an empty file selection', () => {
    expect(coverUrlValidationSchema.safeParse({ coverUrl: [] }).success).toBe(false);
    expect(coverUrlValidationSchema.safeParse({ coverUrl: undefined }).success).toBe(false);
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
