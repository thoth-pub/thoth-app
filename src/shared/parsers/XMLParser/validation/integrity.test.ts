// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Every code-owned rule table is a projection of an approved SPIKE-02 v4
 * evidence file (hashes recorded in thoth-app#190). The expected digests are
 * SHA-256 of the canonical JSON (keys sorted, no whitespace, non-ASCII
 * unescaped) of that projection computed from the evidence itself, so any
 * edit to the committed data breaks this test.
 */
const DATA = join(__dirname, 'data');

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const digest = (file: string) =>
  createHash('sha256')
    .update(canonicalJson(JSON.parse(readFileSync(join(DATA, file), 'utf8'))), 'utf8')
    .digest('hex');

const PROJECTIONS: [file: string, evidence: string, projection: string, sha256: string][] = [
  [
    'strictDispositions.json',
    'strict_classification.json (9809230486758d4e…)',
    'release -> rule id -> [klass, authority_kind, artifact_defect]',
    'ce8039ece31295dc46691b9b4558c1aa63ea23a9c233bef0fd91ba962a4d5c9a',
  ],
  [
    'schematronDispositions.json',
    'schematron_classification.json (311db526f06b1f74…)',
    'release -> report id -> klass',
    'e86349119ff7cccc4a802c8709ec9743144ebd1f6e3348b5acba6c96794ffc8a',
  ],
  [
    'sourceRuleInventory.json',
    'source_rule_inventory.json (51b6d4317baa3244…)',
    'every entry without its evidence-pointer fields (status, evidence, source, xpath)',
    'effcc27f7d7a4af90ed911f0c55e93bc30c9ecbe00cc4619bb274831df6f816f',
  ],
  [
    'schemaModel30.json',
    'schema_model_30_reference.json (c16f543bcc9e38b2…)',
    'release, ordinary_sha256, defaults, element simple primitive/variety, child names, uniques',
    'a7ddbb95def710ddc22fad78c5ff63cf7bf1ee33f053895b4fc87279b8d70f09',
  ],
  [
    'schemaModel31.json',
    'schema_model_31_reference.json (6dcd26c03e3235322…)',
    'release, ordinary_sha256, defaults, element simple primitive/variety, child names, uniques',
    '2482cd99b0665c66fba80482586937638774ef666742d614f7608eccdf674260',
  ],
];

describe('code-owned rule data equals its projection of the approved evidence', () => {
  it.each(PROJECTIONS)('%s <- %s', (file, _evidence, _projection, sha256) => {
    expect(digest(file)).toBe(sha256);
  });

  it('keeps the kernel bindings as the byte-identical approved kernel_rules.json', () => {
    const bytes = readFileSync(join(DATA, 'kernelBindings.json'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      'f6798cd2ff7f72ae4edb9be53c3a2e1ed5c10e762aa113a08c6d96a691fab3a9',
    );
  });

  it('carries no scratch paths or evidence timestamps', () => {
    // Approved authority citations may name an evidence table relatively (K-EIDR-PARTY-ID cites
    // tables/eidr_party_owners.json); they are kept verbatim. Absolute and scratch locations are not.
    for (const file of [...PROJECTIONS.map(([f]) => f), 'kernelBindings.json']) {
      const text = readFileSync(join(DATA, file), 'utf8');
      expect(text, file).not.toMatch(/\/private\/|\/Users\/|\/tmp\/|scratchpad|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    }
  });
});

describe('public module surface', () => {
  it('exports the core API and not the conformance entry point', async () => {
    const surface = await import('./index');
    expect(Object.keys(surface)).toEqual(
      expect.arrayContaining([
        'createOnixSourceValidator',
        'ONIX_VALIDATION_RESOURCES',
        'ONIX_VALIDATION_RESOURCE_PATH',
      ]),
    );
    expect(Object.keys(surface)).not.toContain('createConformanceValidator');
  });
});
