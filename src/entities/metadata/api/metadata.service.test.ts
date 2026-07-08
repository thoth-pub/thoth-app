import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/src/shared/constants';

import { MetadataService } from './metadata.service';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('MetadataService', () => {
  let service: MetadataService;

  beforeEach(() => {
    service = new MetadataService();
    mockFetch.mockReset();
  });

  describe('getAvailableFormats', () => {
    it('should fetch formats and map specifications', async () => {
      const formats = [
        { id: 'onix_3.0', name: 'ONIX 3.0', version: '3.0', specifications: ['ONIX_3.0'] },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(formats),
      });

      const result = await service.getAvailableFormats();

      expect(mockFetch).toHaveBeenCalledWith(ROUTES.METADATA_FORMATS, expect.any(Object));
      expect(result[0].specifications).toEqual(['ONIX_3.0']);
    });

    it('should return empty array when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.getAvailableFormats();

      expect(result).toEqual([]);
    });

    it('should return empty array when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const result = await service.getAvailableFormats();

      expect(result).toEqual([]);
    });
  });

  describe('getAllFormatSpecifications', () => {
    it('should fetch all specifications in parallel', async () => {
      const workId = 'work-123';
      const specifications = ['ONIX_3.0', 'ONIX_2.1'];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve('<xml>data</xml>'),
      });

      const result = await service.getAllFormatSpecifications(workId, specifications);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result['ONIX_3.0'].status).toBe('success');
      expect(result['ONIX_3.0'].data).toBe('<xml>data</xml>');
      expect(result['ONIX_2.1'].status).toBe('success');
    });

    it('should return error status when fetch fails', async () => {
      const workId = 'work-123';

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.getAllFormatSpecifications(workId, ['ONIX_3.0']);

      expect(result['ONIX_3.0'].status).toBe('error');
      expect(result['ONIX_3.0'].data).toBe('Network error');
    });

    it('should return error status when response is not ok', async () => {
      const workId = 'work-123';

      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      const result = await service.getAllFormatSpecifications(workId, ['ONIX_3.0']);

      expect(result['ONIX_3.0'].status).toBe('error');
      expect(result['ONIX_3.0'].data).toBe('Not found');
    });

    it('should use default error message when JSON parsing fails on error response', async () => {
      const workId = 'work-123';

      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error('Parse error')),
      });

      const result = await service.getAllFormatSpecifications(workId, ['ONIX_3.0']);

      expect(result['ONIX_3.0'].status).toBe('error');
      expect(result['ONIX_3.0'].data).toBe('Failed to fetch specification');
    });

    it('should use error message from Error object', async () => {
      const workId = 'work-123';
      const networkError = new Error('Network failure');
      networkError.name = 'TypeError';

      mockFetch.mockRejectedValue(networkError);

      const result = await service.getAllFormatSpecifications(workId, ['ONIX_3.0']);

      expect(result['ONIX_3.0'].status).toBe('error');
      expect(result['ONIX_3.0'].data).toBe('Network failure');
    });

    it('should handle non-Error rejections', async () => {
      const workId = 'work-123';

      mockFetch.mockRejectedValue('String error');

      const result = await service.getAllFormatSpecifications(workId, ['ONIX_3.0']);

      expect(result['ONIX_3.0'].status).toBe('error');
      expect(result['ONIX_3.0'].data).toBe('Failed to fetch specification');
    });
  });

  describe('getAllSpecifications', () => {
    it('should combine available formats with all specifications', async () => {
      const workId = 'work-123';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 'onix_3.0', name: 'ONIX 3.0', version: '3.0', specifications: ['ONIX_3.0'] },
              { id: 'marc21xml', name: 'MARC21 XML', version: '1.0', specifications: ['MARC21'] },
            ]),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve('<data/>'),
        });

      const result = await service.getAllSpecifications(workId);

      expect(result['onix_3.0']['ONIX_3.0'].status).toBe('success');
      expect(result['marc21xml']['MARC21'].status).toBe('success');
    });

    it('should merge MARC21 specifications into marc21 key', async () => {
      const workId = 'work-123';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 'marc21record', name: 'MARC21 Record', version: null, specifications: ['MARC21_RECORD'] },
              { id: 'marc21markup', name: 'MARC21 Markup', version: null, specifications: ['MARC21_MARKUP'] },
            ]),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve('<data/>'),
        });

      const result = await service.getAllSpecifications(workId);

      expect(Object.keys(result['marc21'])).toContain('MARC21_RECORD');
      expect(Object.keys(result['marc21'])).toContain('MARC21_MARKUP');
    });

    it('should return empty structure when getAvailableFormats fails', async () => {
      const workId = 'work-123';

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.getAllSpecifications(workId);

      expect(result['onix_3.0']).toEqual({});
      expect(result['marc21']).toEqual({});
    });
  });
});
