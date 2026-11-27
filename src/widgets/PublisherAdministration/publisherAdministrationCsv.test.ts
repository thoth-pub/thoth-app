import { describe, expect, it } from 'vitest';

import { DistributionPlatform, ThothPackage } from '@/gql/graphql';

import {
  buildPublisherServicesCsvFilename,
  CSV_MULTI_VALUE_SEPARATOR,
  escapeCsvField,
  PUBLISHER_SERVICES_CSV_COLUMNS,
  type PublisherServicesReportRow,
  serializePublisherServicesCsv,
} from './publisherAdministrationCsv';

// Builds a report row in exactly the shape the paginated report read returns.
// Overrides let each test isolate one column's behaviour.
const createRow = (overrides?: {
  publisherId?: string;
  publisherName?: string;
  subscriptionPackage?: ThothPackage;
  platforms?: DistributionPlatform[];
  updatedAt?: string;
  lastChange?: { changedAt: string } | null;
}): PublisherServicesReportRow =>
  ({
    configuration: {
      publisher: {
        publisherId: overrides?.publisherId ?? 'pub-1',
        publisherName: overrides?.publisherName ?? 'Publisher One',
      },
      subscriptionPackage: overrides?.subscriptionPackage ?? ThothPackage.Sphinx,
      enabledDistributionPlatforms: (overrides?.platforms ?? [DistributionPlatform.Oapen]).map((platform) => ({
        platform,
      })),
      updatedAt: overrides?.updatedAt ?? '2026-08-12T09:00:00Z',
    },
    lastChange: overrides?.lastChange !== undefined ? overrides.lastChange : { changedAt: '2026-08-10T08:00:00Z' },
  }) as PublisherServicesReportRow;

// The parsed cells of a single serialized CSV line, honouring quoted fields with
// escaped quotes, embedded commas and embedded newlines. Kept minimal - just
// enough to assert round-trip semantics of the serializer's own output.
const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];

    if (inQuotes) {
      if (char === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\r' && csv[index + 1] === '\n') {
      record.push(field);
      rows.push(record);
      record = [];
      field = '';
      index += 1;
    } else {
      field += char;
    }
  }

  record.push(field);
  rows.push(record);

  return rows;
};

describe('publisherAdministrationCsv', () => {
  describe('column contract', () => {
    it('exposes exactly the approved 6 columns in the fixed order', () => {
      expect(PUBLISHER_SERVICES_CSV_COLUMNS).toEqual([
        'publisher_id',
        'publisher_name',
        'subscription_package',
        'enabled_platforms',
        'configuration_updated_at',
        'last_configuration_change_at',
      ]);
      expect(PUBLISHER_SERVICES_CSV_COLUMNS.join(',')).not.toMatch(/job/);
    });

    it('emits the header line as the first record, in that exact order', () => {
      const csv = serializePublisherServicesCsv([]);

      expect(parseCsv(csv)[0]).toEqual([...PUBLISHER_SERVICES_CSV_COLUMNS]);
    });
  });

  describe('zero rows', () => {
    it('produces a truthful header-only CSV with no data record', () => {
      const csv = serializePublisherServicesCsv([]);

      // Exactly the header line, no trailing terminator, no fabricated row.
      expect(csv).toBe(PUBLISHER_SERVICES_CSV_COLUMNS.join(','));
      expect(parseCsv(csv)).toHaveLength(1);
    });
  });

  describe('row mapping', () => {
    it('maps every column from the exact report facts', () => {
      const csv = serializePublisherServicesCsv([
        createRow({
          publisherId: 'pub-9',
          publisherName: 'Ninth Press',
          subscriptionPackage: ThothPackage.Pyramid,
          platforms: [DistributionPlatform.Oapen],
          updatedAt: '2026-08-01T00:00:00Z',
          lastChange: { changedAt: '2026-07-30T00:00:00Z' },
        }),
      ]);

      expect(parseCsv(csv)[1]).toEqual([
        'pub-9',
        'Ninth Press',
        'PYRAMID',
        'OAPEN',
        '2026-08-01T00:00:00Z',
        '2026-07-30T00:00:00Z',
      ]);
    });

    it('preserves the exact order of the rows it is given', () => {
      const csv = serializePublisherServicesCsv([
        createRow({ publisherId: 'pub-a', publisherName: 'A' }),
        createRow({ publisherId: 'pub-b', publisherName: 'B' }),
        createRow({ publisherId: 'pub-c', publisherName: 'C' }),
      ]);

      const ids = parseCsv(csv)
        .slice(1)
        .map((record) => record[0]);

      expect(ids).toEqual(['pub-a', 'pub-b', 'pub-c']);
    });
  });

  describe('multi-value serialization', () => {
    it('joins platforms with the documented separator in a deterministic ascending order', () => {
      const csv = serializePublisherServicesCsv([
        createRow({
          // Given out of order to prove the serializer sorts rather than trusting API order.
          platforms: [DistributionPlatform.Oapen, DistributionPlatform.Doab, DistributionPlatform.Crossref],
        }),
      ]);

      const [, record] = parseCsv(csv);

      expect(CSV_MULTI_VALUE_SEPARATOR).toBe(';');
      expect(record[3]).toBe('CROSSREF;DOAB;OAPEN');
    });

    it('emits an empty cell for a configuration with no enabled platforms', () => {
      const csv = serializePublisherServicesCsv([createRow({ platforms: [] })]);

      expect(parseCsv(csv)[1][3]).toBe('');
    });
  });

  describe('null / empty facts', () => {
    it('emits an empty last-change cell when lastChange is null', () => {
      const csv = serializePublisherServicesCsv([createRow({ lastChange: null })]);

      expect(parseCsv(csv)[1][5]).toBe('');
    });
  });

  describe('CSV escaping', () => {
    it('quotes and escapes commas, quotes and newlines, and round-trips them', () => {
      const csv = serializePublisherServicesCsv([
        createRow({ publisherName: 'Comma, Press' }),
        createRow({ publisherId: 'pub-2', publisherName: 'The "Quoted" House' }),
        createRow({ publisherId: 'pub-3', publisherName: 'Line\nBreak Books' }),
        createRow({ publisherId: 'pub-4', publisherName: 'Carriage\r\nReturn' }),
        createRow({ publisherId: 'pub-5', publisherName: 'Mixed ",\n" chaos' }),
      ]);

      const names = parseCsv(csv)
        .slice(1)
        .map((record) => record[1]);

      expect(names).toEqual([
        'Comma, Press',
        'The "Quoted" House',
        'Line\nBreak Books',
        'Carriage\r\nReturn',
        'Mixed ",\n" chaos',
      ]);
    });

    it('leaves an empty value empty and unquoted', () => {
      expect(escapeCsvField('')).toBe('');
    });

    it('quotes a value containing the delimiter', () => {
      expect(escapeCsvField('a,b')).toBe('"a,b"');
    });

    it('doubles a contained quote inside quotes', () => {
      expect(escapeCsvField('a"b')).toBe('"a""b"');
    });
  });

  describe('spreadsheet formula neutralization', () => {
    it('prefixes a formula-triggering human-entered value with an apostrophe', () => {
      expect(escapeCsvField('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
      expect(escapeCsvField('+1')).toBe("'+1");
      expect(escapeCsvField('-1')).toBe("'-1");
      expect(escapeCsvField('@cmd')).toBe("'@cmd");
    });

    it('neutralizes a formula-prefixed publisher name in the serialized row', () => {
      const csv = serializePublisherServicesCsv([createRow({ publisherName: '=1+2' })]);

      expect(parseCsv(csv)[1][1]).toBe("'=1+2");
    });

    it('neutralizes then still escapes a value that also contains a delimiter', () => {
      // Starts with a trigger and contains a comma: both protections apply.
      expect(escapeCsvField('=danger,now')).toBe('"\'=danger,now"');
    });

    it('leaves ordinary machine values (enums, ids, timestamps) untouched', () => {
      expect(escapeCsvField('OAPEN')).toBe('OAPEN');
      expect(escapeCsvField('PYRAMID')).toBe('PYRAMID');
      expect(escapeCsvField('2026-08-12T09:00:00Z')).toBe('2026-08-12T09:00:00Z');
      expect(escapeCsvField('pub-1')).toBe('pub-1');
    });
  });

  describe('filename', () => {
    it('builds a deterministic, colon-free UTC filename', () => {
      const filename = buildPublisherServicesCsvFilename(new Date('2026-08-25T14:30:05.123Z'));

      expect(filename).toBe('thoth-publisher-services-2026-08-25T14-30-05Z.csv');
      expect(filename).not.toContain(':');
    });
  });
});
