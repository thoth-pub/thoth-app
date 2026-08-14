import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadTextFile } from './downloadTextFile';

const stubObjectUrl = () => {
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock-url');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

  return { createObjectURL, revokeObjectURL };
};

describe('downloadTextFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('saves a plain-text blob through a throwaway anchor and revokes the object URL', () => {
    const { createObjectURL, revokeObjectURL } = stubObjectUrl();

    // Read the anchor's own attributes from inside its click, without aliasing `this` to a variable.
    let downloadName: string | undefined;
    let href: string | null | undefined;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadName = this.download;
      href = this.getAttribute('href');
    });

    downloadTextFile('report.txt', 'hello world');

    // A single text blob, wrapped in one object URL.
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/plain');

    // The anchor carried the requested filename and the object URL, and was clicked.
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(downloadName).toBe('report.txt');
    expect(href).toBe('blob:mock-url');

    // The URL is released and the anchor is not left behind in the document.
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('revokes the object URL even if the click throws', () => {
    const { revokeObjectURL } = stubObjectUrl();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('click failed');
    });

    expect(() => downloadTextFile('report.txt', 'hello')).toThrow('click failed');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
