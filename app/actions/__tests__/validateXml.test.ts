import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockParse = vi.fn();
const mockGetServerSession = vi.fn();

vi.mock('@5stones/onix', () => ({
  parse: (...args: unknown[]) => mockParse(...args),
}));

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@/src/shared/lib/auth/auth', () => ({
  authOptions: {},
}));

import { validateXml } from '../validateXml';

function createMockFile(content: string): File {
  return {
    name: 'test.xml',
    type: 'text/xml',
    text: () => Promise.resolve(content),
    size: content.length,
    lastModified: Date.now(),
    webkitRelativePath: '',
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    slice: () => new Blob(),
    stream: () => new ReadableStream(),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as File;
}

describe('validateXml', () => {
  beforeEach(() => {
    mockGetServerSession.mockResolvedValue({ user: { name: 'Test' } });
  });

  it('returns success with parsed data on valid XML', async () => {
    const mockData = { record: { reference: '123' } };
    mockParse.mockResolvedValue(mockData);

    const result = await validateXml(createMockFile('<ONIX></ONIX>'));

    expect(result).toEqual({ status: 'success', data: mockData });
  });

  it('returns error with message on parse failure', async () => {
    mockParse.mockRejectedValue(new Error('Invalid ONIX XML'));

    const result = await validateXml(createMockFile('<invalid></invalid>'));

    expect(result).toEqual({ status: 'error', error: 'Invalid ONIX XML' });
  });

  it('returns error with generic message on non-Error rejection', async () => {
    mockParse.mockRejectedValue('string error');

    const result = await validateXml(createMockFile('<xml></xml>'));

    expect(result).toEqual({ status: 'error', error: 'Unknown error' });
  });

  it('returns unauthorized when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await validateXml(createMockFile('<ONIX></ONIX>'));

    expect(result).toEqual({ status: 'error', error: 'Unauthorized' });
  });
});
