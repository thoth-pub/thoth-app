import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { OnixRegressionFixture } from './types';

/**
 * Fixture layout (thoth-app#236): one directory per fixture under `fixtures/`, named by the fixture's `id`, holding
 * exactly the ONIX bytes (`source.xml`) and the typed expectation (`expected.ts`). `fixtures/index.ts` registers
 * every fixture; the harness self-test fails for a directory that is not registered or a registration without one.
 */
export const ONIX_REGRESSION_FIXTURES_DIRECTORY = join(__dirname, 'fixtures');

/** The files a fixture directory holds, and nothing else. */
export const ONIX_FIXTURE_FILES = ['expected.ts', 'source.xml'] as const;

/** Types a fixture declaration; it adds nothing at run time. */
export const defineOnixRegressionFixture = (fixture: OnixRegressionFixture): OnixRegressionFixture => fixture;

/** The fixture's ONIX bytes, exactly as they are uploaded. */
export const onixFixtureSource = (fixture: Pick<OnixRegressionFixture, 'id'>): Uint8Array =>
  new Uint8Array(readFileSync(join(ONIX_REGRESSION_FIXTURES_DIRECTORY, fixture.id, 'source.xml')));

export const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** Every fixture directory on disk, sorted. */
export const onixFixtureDirectories = (): string[] =>
  readdirSync(ONIX_REGRESSION_FIXTURES_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .sort();

/** The files one fixture directory holds, sorted. */
export const onixFixtureFiles = (id: string): string[] =>
  readdirSync(join(ONIX_REGRESSION_FIXTURES_DIRECTORY, id)).sort();
