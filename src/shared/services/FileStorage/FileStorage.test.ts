import { sha256 } from 'js-sha256';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FileStorage } from './FileStorage';

const mutation = vi.fn();
const graphqlService = { query: vi.fn(), mutation } as never;

const uploadResponse = {
  fileUploadId: 'upload-1',
  uploadUrl: 'https://s3.example.com/put',
  uploadHeaders: [{ name: 'Content-Type', value: 'image/jpeg' }],
  expiresAt: '2026-01-01T00:00:00Z',
};

const makeFile = (name: string, type: string, bytes = new Uint8Array([1, 2, 3, 4])) => {
  const file = new File([bytes], name, { type });
  if (typeof file.arrayBuffer !== 'function') {
    // jsdom's File does not implement Blob.arrayBuffer
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
    });
  }
  return file;
};

describe('FileStorage.uploadWorkCover', () => {
  let storage: FileStorage;
  let uploadFileSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mutation.mockReset();
    storage = new FileStorage('token', graphqlService);
    uploadFileSpy = vi.spyOn(storage, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storage, 'completeFileUpload').mockResolvedValue('https://cdn.example.org/cover.jpg');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const runUploadWorkCover = async (file: File) => {
    mutation.mockResolvedValue({ initFrontcoverFileUpload: uploadResponse, completeFileUpload: { cdnUrl: 'x' } });
    const promise = storage.uploadWorkCover('work-1', file);
    await vi.runAllTimersAsync();
    return promise;
  };

  it('always declares extension "jpg" and MIME "image/jpeg", even for .jpeg files', async () => {
    const file = makeFile('My Cover.JPEG', 'image/jpeg');

    await runUploadWorkCover(file);

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      data: expect.objectContaining({
        workId: 'work-1',
        declaredExtension: 'jpg',
        declaredMimeType: 'image/jpeg',
      }),
    });
  });

  it('computes the SHA-256 checksum over the exact original bytes', async () => {
    const bytes = new Uint8Array([9, 8, 7, 6, 5]);
    const file = makeFile('cover.jpg', 'image/jpeg', bytes);
    const expectedHash = sha256(bytes.buffer);

    await runUploadWorkCover(file);

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      data: expect.objectContaining({ declaredSha256: expectedHash }),
    });
  });

  it('uploads the original file bytes without recompression', async () => {
    const file = makeFile('cover.jpg', 'image/jpeg');

    await runUploadWorkCover(file);

    expect(uploadFileSpy).toHaveBeenCalledWith(
      uploadResponse.uploadUrl,
      uploadResponse.uploadHeaders,
      file,
      undefined,
    );
  });
});

describe('FileStorage generic uploads keep original metadata', () => {
  let storage: FileStorage;

  beforeEach(() => {
    mutation.mockReset();
    storage = new FileStorage('token', graphqlService);
    vi.spyOn(storage, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storage, 'completeFileUpload').mockResolvedValue('https://cdn.example.org/file');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publication uploads use the original extension and MIME type', async () => {
    mutation.mockResolvedValue({ initPublicationFileUpload: uploadResponse });
    const file = makeFile('book.pdf', 'application/pdf');

    await storage.uploadPublicationFile('pub-1', file);

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      data: expect.objectContaining({
        publicationId: 'pub-1',
        declaredExtension: 'pdf',
        declaredMimeType: 'application/pdf',
      }),
    });
  });

  it('featured-video uploads use the original extension and MIME type', async () => {
    mutation.mockResolvedValue({ initWorkFeaturedVideoFileUpload: uploadResponse });
    const file = makeFile('teaser.mp4', 'video/mp4');

    await storage.uploadFeaturedVideoFile('video-1', file);

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      data: expect.objectContaining({
        workFeaturedVideoId: 'video-1',
        declaredExtension: 'mp4',
        declaredMimeType: 'video/mp4',
      }),
    });
  });

  it('additional-resource uploads use the original extension and MIME type (PNG stays PNG)', async () => {
    mutation.mockResolvedValue({ initAdditionalResourceFileUpload: uploadResponse });
    const file = makeFile('diagram.png', 'image/png');

    await storage.uploadAdditionalResourceFile('resource-1', file);

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      data: expect.objectContaining({
        additionalResourceId: 'resource-1',
        declaredExtension: 'png',
        declaredMimeType: 'image/png',
      }),
    });
  });
});
