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
    ['A8', 'A18'],
    ['A8', '18'],
  ])('accepts the valid range %s to %s', (firstPage, lastPage) => {
    expect(validatePages(firstPage, lastPage).success).toBe(true);
  });

  it.each([
    ['III3', 'III6'],
    ['III3', '6'],
    ['XIV10', 'XIV12'],
    ['III3', 'III3'],
    ['III3', '3'],
  ])('accepts the Roman-prefixed range %s to %s', (firstPage, lastPage) => {
    expect(validatePages(firstPage, lastPage).success).toBe(true);
  });

  it.each([
    ['III3', undefined],
    [undefined, 'XIV12'],
  ])('keeps the single Roman-prefixed endpoint %s / %s valid', (firstPage, lastPage) => {
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

  describe('Roman-prefixed labels', () => {
    const issuesFor = (firstPage?: string, lastPage?: string) => {
      const result = validatePages(firstPage, lastPage);

      return result.success
        ? []
        : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    };

    it.each(['AA3', 'ABC3', 'IIX3', 'VV3', 'MMMM3', 'iii3', 'Appendix3', '3III', 'III0'])(
      'rejects the invalid compound label %s against its own field',
      (label) => {
        expect(issuePaths(validatePages(label, undefined))).toEqual(['firstPage']);
        expect(issuePaths(validatePages(undefined, label))).toEqual(['lastPage']);
      },
    );

    it.each([
      ['III3', 'XI', /same numbering/],
      ['3', 'III6', /same numbering/],
      ['III3', 'IV6', /same prefix/],
      ['III6', 'III3', /must not come before/],
      ['III6', '3', /must not come before/],
    ])('reports the pair %s to %s once, against the last page', (firstPage, lastPage, message) => {
      expect(issuesFor(firstPage, lastPage)).toEqual([{ path: 'lastPage', message: expect.stringMatching(message) }]);
    });

    it('names both permitted compound prefixes in the label message without implying free text', () => {
      const [{ message }] = issuesFor('Appendix3', undefined);

      expect(message).toMatch(/one uppercase letter/);
      expect(message).toMatch(/uppercase Roman numeral/);
      expect(message).toContain('A1');
      expect(message).toContain('III3');
      expect(message).not.toMatch(/custom/i);
    });

    it('illustrates the complete-prefix comparison in the prefix-mismatch message', () => {
      const [{ message }] = issuesFor('III3', 'IV6');

      expect(message).toContain('III3–IV6');
    });

    it('distinguishes the four page-range failures by message', () => {
      const messageFor = (firstPage: string, lastPage: string) =>
        issuesFor(firstPage, lastPage)
          .map((issue) => issue.message)
          .join(' | ');

      const invalidLabel = messageFor('IIX3', '6');
      const incompatible = messageFor('III3', 'XI');
      const prefixMismatch = messageFor('III3', 'IV6');
      const descending = messageFor('III6', 'III3');

      expect(new Set([invalidLabel, incompatible, prefixMismatch, descending]).size).toBe(4);
    });
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

describe('page count validation', () => {
  type Counts = { pageCount?: unknown; frontmatterCount?: unknown; backmatterCount?: unknown };

  const validateCounts = (counts: Counts, firstPage?: string, lastPage?: string) =>
    pagesCountValidationSchema.safeParse({ ...counts, firstPage, lastPage });

  const issuesFor = (counts: Counts, firstPage?: string, lastPage?: string) => {
    const result = validateCounts(counts, firstPage, lastPage);

    return result.success
      ? []
      : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  };

  it.each<[string, Counts]>([
    ['no counts at all', {}],
    ['all counts unset as zero', { pageCount: 0, frontmatterCount: 0, backmatterCount: 0 }],
    ['a total alone', { pageCount: 26 }],
    ['a total with zero front and back matter', { pageCount: 26, frontmatterCount: 0, backmatterCount: 0 }],
    ['front and back matter inside the total', { pageCount: 302, frontmatterCount: 24, backmatterCount: 10 }],
    ['front matter filling the total', { pageCount: 24, frontmatterCount: 24 }],
    ['back matter filling the total', { pageCount: 10, backmatterCount: 10 }],
    ['front and back matter filling the total', { pageCount: 34, frontmatterCount: 24, backmatterCount: 10 }],
    ['the largest total', { pageCount: 2147483647 }],
    ['the largest front and back matter', { pageCount: 7998, frontmatterCount: 3999, backmatterCount: 3999 }],
    ['counts as the number inputs give them', { pageCount: '302', frontmatterCount: '24', backmatterCount: '' }],
  ])('accepts %s', (_, counts) => {
    expect(issuesFor(counts)).toEqual([]);
  });

  it.each<[string, Counts, string, number]>([
    ['a fractional total', { pageCount: 302.5 }, 'pageCount', 2147483647],
    ['a fractional front matter count', { pageCount: 302, frontmatterCount: 24.5 }, 'frontmatterCount', 3999],
    ['a fractional back matter count', { pageCount: 302, backmatterCount: 10.5 }, 'backmatterCount', 3999],
    ['a negative total', { pageCount: -1 }, 'pageCount', 2147483647],
    ['a negative front matter count', { pageCount: 302, frontmatterCount: -1 }, 'frontmatterCount', 3999],
    ['a negative back matter count', { pageCount: 302, backmatterCount: -1 }, 'backmatterCount', 3999],
    ['a total beyond a signed 32-bit integer', { pageCount: 2147483648 }, 'pageCount', 2147483647],
    ['front matter beyond 3999', { pageCount: 10000, frontmatterCount: 4000 }, 'frontmatterCount', 3999],
    ['back matter beyond 3999', { pageCount: 10000, backmatterCount: 4000 }, 'backmatterCount', 3999],
    [
      'a fractional total smaller than its front matter',
      { pageCount: 20.5, frontmatterCount: 24 },
      'pageCount',
      2147483647,
    ],
    ['a fractional front matter count without a total', { frontmatterCount: 24.5 }, 'frontmatterCount', 3999],
    ['back matter beyond 3999 without a total', { backmatterCount: 4000 }, 'backmatterCount', 3999],
  ])('rejects %s against its own field, and only there', (_, counts, path, max) => {
    expect(issuesFor(counts)).toEqual([{ path, message: `Must be a whole number from 0 to ${max}` }]);
  });

  it.each<[string, Counts]>([
    ['front matter with a zero total', { pageCount: 0, frontmatterCount: 24 }],
    ['front matter with no total', { frontmatterCount: 24 }],
    ['back matter with a zero total', { pageCount: 0, backmatterCount: 10 }],
    ['back matter with no total', { backmatterCount: 10 }],
    ['front and back matter with no total', { frontmatterCount: 24, backmatterCount: 10 }],
  ])('rejects %s against the total page count', (_, counts) => {
    expect(issuesFor(counts)).toEqual([
      { path: 'pageCount', message: expect.stringMatching(/Enter the total page count/) },
    ]);
  });

  it.each<[string, Counts]>([
    ['front and back matter exceeding the total', { pageCount: 33, frontmatterCount: 24, backmatterCount: 10 }],
    ['front matter exceeding the total', { pageCount: 23, frontmatterCount: 24 }],
    ['back matter exceeding the total', { pageCount: 9, backmatterCount: 10 }],
  ])('rejects %s against the total page count', (_, counts) => {
    expect(issuesFor(counts)).toEqual([
      { path: 'pageCount', message: expect.stringMatching(/total page count must include the front and back matter/) },
    ]);
  });

  it('keeps reporting a page-range failure while a count is invalid', () => {
    expect(issuesFor({ pageCount: 2.5 }, '20', '1')).toEqual([
      { path: 'pageCount', message: 'Must be a whole number from 0 to 2147483647' },
      { path: 'lastPage', message: expect.stringMatching(/must not come before/) },
    ]);
  });

  it('reports a page-range failure and a page-count failure together, each against its own field', () => {
    expect(issuesFor({ pageCount: 5, frontmatterCount: 6 }, 'A1', 'B20')).toEqual([
      { path: 'lastPage', message: expect.stringMatching(/same prefix/) },
      { path: 'pageCount', message: expect.stringMatching(/total page count must include/) },
    ]);
  });
});
