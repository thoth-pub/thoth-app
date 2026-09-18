import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  complementOf,
  evaluateTerritory,
  ONIX_PINNED_COUNTRIES,
  ONIX_PINNED_REGIONS,
  type OnixEvaluatedTerritory,
  readTerritoryTokens,
  territoryRelation,
  unionOf,
} from './onixTerritory';

/**
 * The common ONIX Territory evaluator of thoth-app#217 (Stage C of #184), under ONIX-AUDIT-SALES-RIGHTS-CONTACT-01
 * (#179 proposal 5543566392, approval 5543611447, rules 1-11): pure, deterministic and pinned to the codelists the
 * canonical validator ships. It never validates a territory - that is the validator's - and never guesses a relation it
 * cannot establish from the pinned vocabulary.
 */

const territory = (
  {
    countriesIncluded = null,
    regionsIncluded = null,
    countriesExcluded = null,
    regionsExcluded = null,
  }: {
    countriesIncluded?: string | null;
    regionsIncluded?: string | null;
    countriesExcluded?: string | null;
    regionsExcluded?: string | null;
  },
  context: OnixEvaluatedTerritory['context'] = 'SALES_RIGHTS',
) => evaluateTerritory({ countriesIncluded, regionsIncluded, countriesExcluded, regionsExcluded }, context);

const WORLD = territory({ regionsIncluded: 'WORLD' });
const world = (context: OnixEvaluatedTerritory['context']) => territory({ regionsIncluded: 'WORLD' }, context);
const countries = (codes: string, context: OnixEvaluatedTerritory['context'] = 'SALES_RIGHTS') =>
  territory({ countriesIncluded: codes }, context);

/** The relation of two single territories: whether the first covers the second, and whether they overlap at all. */
const relation = (a: OnixEvaluatedTerritory, b: OnixEvaluatedTerritory) =>
  territoryRelation(unionOf([a]), unionOf([b]));

describe('the pinned vocabulary', () => {
  const codelists = readFileSync(
    resolve(process.cwd(), 'public/onix-validation/ONIX_BookProduct_CodeLists.xsd'),
    'utf8',
  );
  const enumerated = (list: string): string[] => {
    const start = codelists.indexOf(`<xs:simpleType name="List${list}">`);
    const end = codelists.indexOf('<xs:simpleType name=', start + 1);

    return [...codelists.slice(start, end).matchAll(/<xs:enumeration value="([^"]+)">/g)].map(([, value]) => value);
  };

  it('pins exactly the List 91 countries the canonical validator ships', () => {
    expect([...ONIX_PINNED_COUNTRIES].sort()).toEqual(enumerated('91').sort());
    expect(ONIX_PINNED_COUNTRIES.size).toBe(252);
  });

  it('pins exactly the List 49 regions within a pinned country, and no supranational region', () => {
    const regions = enumerated('49').filter((code) => code !== 'WORLD' && code !== 'ECZ');

    expect([...ONIX_PINNED_REGIONS.keys()].sort()).toEqual(regions.sort());
    ONIX_PINNED_REGIONS.forEach((country, region) => {
      expect(region.startsWith(`${country}-`)).toBe(true);
      expect(ONIX_PINNED_COUNTRIES.has(country)).toBe(true);
    });
  });
});

describe('readTerritoryTokens', () => {
  it('keeps every declared token exactly, in source order, and no more (rule 3)', () => {
    expect(
      readTerritoryTokens({
        countriesIncluded: 'GB  IE\nFR',
        regionsIncluded: null,
        countriesExcluded: null,
        regionsExcluded: 'GB-SCT',
      }),
    ).toEqual({
      countriesIncluded: ['GB', 'IE', 'FR'],
      regionsIncluded: [],
      countriesExcluded: [],
      regionsExcluded: ['GB-SCT'],
    });
  });

  it('never repairs a token: case, shape and spelling stay as stated (rule 5)', () => {
    expect(
      readTerritoryTokens({
        countriesIncluded: 'gb Uk',
        regionsIncluded: null,
        countriesExcluded: null,
        regionsExcluded: null,
      }),
    ).toMatchObject({ countriesIncluded: ['gb', 'Uk'] });
  });
});

describe('evaluateTerritory', () => {
  it('keeps the context it was evaluated in and the exact tokens', () => {
    const market = territory({ countriesIncluded: 'GB IE', regionsExcluded: 'GB-NIR' }, 'MARKET');

    expect(market.context).toBe('MARKET');
    expect(market.tokens).toEqual({
      countriesIncluded: ['GB', 'IE'],
      regionsIncluded: [],
      countriesExcluded: [],
      regionsExcluded: ['GB-NIR'],
    });
    expect(market.world).toBe(false);
    expect(market.unresolved).toEqual([]);
  });

  it('recognises WORLD exactly, and only as a region', () => {
    expect(WORLD.world).toBe(true);
    expect(WORLD.unresolved).toEqual([]);
    // WORLD is not a country code: as one it resolves to nothing, and is never read as the world.
    const asCountry = territory({ countriesIncluded: 'WORLD' });

    expect(asCountry.world).toBe(false);
    expect(asCountry.unresolved).toEqual(['WORLD']);
  });

  it('resolves no token fuzzily: a lowercase, unknown or supranational token is unresolved, never approximated (rules 4, 6)', () => {
    expect(territory({ countriesIncluded: 'gb' }).unresolved).toEqual(['gb']);
    expect(territory({ countriesIncluded: 'UK' }).unresolved).toEqual(['UK']);
    expect(territory({ regionsIncluded: 'ECZ' }, 'PRICE').unresolved).toEqual(['ECZ']);
    expect(territory({ regionsIncluded: 'GB-XXX' }).unresolved).toEqual(['GB-XXX']);
    expect(territory({ regionsIncluded: 'WORLD', countriesExcluded: 'XX' }).unresolved).toEqual(['XX']);
  });
});

describe('territoryRelation', () => {
  it('establishes that WORLD covers every country and every region, and that a country never covers WORLD', () => {
    expect(relation(WORLD, countries('GB'))).toEqual({ kind: 'ESTABLISHED', contains: true, intersects: true });
    expect(relation(WORLD, territory({ regionsIncluded: 'US-CA' }))).toEqual({
      kind: 'ESTABLISHED',
      contains: true,
      intersects: true,
    });
    expect(relation(countries('GB'), WORLD)).toEqual({ kind: 'ESTABLISHED', contains: false, intersects: true });
    expect(relation(WORLD, WORLD)).toEqual({ kind: 'ESTABLISHED', contains: true, intersects: true });
  });

  it('applies country inclusion and exclusion exactly', () => {
    const worldButUs = territory({ regionsIncluded: 'WORLD', countriesExcluded: 'US CA' });

    expect(relation(worldButUs, countries('GB'))).toMatchObject({ contains: true, intersects: true });
    expect(relation(worldButUs, countries('US'))).toMatchObject({ contains: false, intersects: false });
    expect(relation(worldButUs, countries('US GB'))).toMatchObject({ contains: false, intersects: true });
    expect(relation(countries('GB IE'), countries('IE'))).toMatchObject({ contains: true, intersects: true });
    expect(relation(countries('GB IE'), countries('FR'))).toMatchObject({ contains: false, intersects: false });
  });

  it('treats a pinned region as part of its country, and only of its country', () => {
    // A country covers its regions; a region does not cover its country, and disjoint regions do not overlap.
    expect(relation(countries('GB'), territory({ regionsIncluded: 'GB-SCT' }))).toMatchObject({
      contains: true,
      intersects: true,
    });
    expect(relation(territory({ regionsIncluded: 'GB-SCT' }), countries('GB'))).toMatchObject({
      contains: false,
      intersects: true,
    });
    expect(relation(territory({ regionsIncluded: 'GB-SCT' }), territory({ regionsIncluded: 'GB-ENG' }))).toMatchObject({
      contains: false,
      intersects: false,
    });
    // A country less one of its regions still covers another of its regions, and no longer covers the excluded one.
    const gbButScotland = territory({ countriesIncluded: 'GB', regionsExcluded: 'GB-SCT' });

    expect(relation(gbButScotland, territory({ regionsIncluded: 'GB-ENG' }))).toMatchObject({
      contains: true,
      intersects: true,
    });
    expect(relation(gbButScotland, territory({ regionsIncluded: 'GB-SCT' }))).toMatchObject({
      contains: false,
      intersects: false,
    });
    expect(relation(gbButScotland, countries('GB'))).toMatchObject({ contains: false, intersects: true });
    // WORLD less a region covers the rest of that region's country, and not the region.
    const worldButCalifornia = territory({ regionsIncluded: 'WORLD', regionsExcluded: 'US-CA' });

    expect(relation(worldButCalifornia, territory({ regionsIncluded: 'US-NY' }))).toMatchObject({
      contains: true,
      intersects: true,
    });
    expect(relation(worldButCalifornia, territory({ regionsIncluded: 'US-CA' }))).toMatchObject({
      contains: false,
      intersects: false,
    });
    expect(relation(worldButCalifornia, countries('US'))).toMatchObject({ contains: false, intersects: true });
  });

  it('never equates a region with a country of a similar code: CN-HK is part of CN, HK is a country of its own', () => {
    expect(relation(territory({ regionsIncluded: 'CN-HK' }), countries('HK'))).toMatchObject({
      contains: false,
      intersects: false,
    });
    expect(relation(countries('CN'), territory({ regionsIncluded: 'CN-HK' }))).toMatchObject({
      contains: true,
      intersects: true,
    });
  });

  it('establishes nothing where a token is unresolved, and names the tokens (rule 11)', () => {
    expect(relation(territory({ countriesIncluded: 'GB UK' }), countries('GB'))).toEqual({
      kind: 'NOT_ESTABLISHED',
      unresolved: ['UK'],
    });
    expect(relation(countries('GB'), territory({ regionsIncluded: 'ECZ' }, 'PRICE'))).toEqual({
      kind: 'NOT_ESTABLISHED',
      unresolved: ['ECZ'],
    });
  });

  it('is symmetric in overlap and exact about containment whatever the order of the tokens', () => {
    const a = countries('IE GB FR');
    const b = countries('FR GB IE');

    expect(relation(a, b)).toMatchObject({ contains: true, intersects: true });
    expect(relation(b, a)).toMatchObject({ contains: true, intersects: true });
  });
});

describe('unionOf and complementOf', () => {
  it('unites territories of one context, so that a partition of the world is covered as a whole', () => {
    const allowed = unionOf([
      territory({ countriesIncluded: 'GB IE' }),
      territory({ regionsIncluded: 'WORLD', countriesExcluded: 'GB IE US' }),
    ]);

    expect(territoryRelation(allowed, unionOf([countries('FR IE')]))).toMatchObject({
      contains: true,
      intersects: true,
    });
    expect(territoryRelation(allowed, unionOf([countries('US')]))).toMatchObject({
      contains: false,
      intersects: false,
    });
    expect(territoryRelation(allowed, unionOf([countries('US GB')]))).toMatchObject({
      contains: false,
      intersects: true,
    });
  });

  it('is empty of nothing: an empty union covers no territory and every territory covers it', () => {
    const nothing = unionOf([]);

    expect(nothing.empty).toBe(true);
    expect(territoryRelation(unionOf([countries('GB')]), nothing)).toMatchObject({ contains: true, intersects: false });
    expect(territoryRelation(nothing, unionOf([countries('GB')]))).toMatchObject({
      contains: false,
      intersects: false,
    });
  });

  it('complements exactly: the rest of the world after explicit territories, and nothing after WORLD', () => {
    const rest = complementOf(unionOf([countries('GB IE'), territory({ regionsIncluded: 'US-CA' })]));

    expect(rest.empty).toBe(false);
    expect(territoryRelation(rest, unionOf([countries('FR')]))).toMatchObject({ contains: true, intersects: true });
    expect(territoryRelation(rest, unionOf([countries('GB')]))).toMatchObject({ contains: false, intersects: false });
    // The rest of the United States after California is still in the remainder; California is not.
    expect(territoryRelation(rest, unionOf([territory({ regionsIncluded: 'US-NY' })]))).toMatchObject({
      contains: true,
      intersects: true,
    });
    expect(territoryRelation(rest, unionOf([territory({ regionsIncluded: 'US-CA' })]))).toMatchObject({
      contains: false,
      intersects: false,
    });
    expect(territoryRelation(rest, unionOf([countries('US')]))).toMatchObject({ contains: false, intersects: true });
    expect(complementOf(unionOf([WORLD])).empty).toBe(true);
    expect(complementOf(unionOf([])).empty).toBe(false);
  });

  it('never mixes contexts: a Market territory is not a SalesRights territory even with the same geography (rules 2, 42)', () => {
    expect(() => unionOf([world('SALES_RIGHTS'), world('MARKET')])).toThrow(/context/);
    expect(() => unionOf([countries('GB', 'PRICE'), countries('GB', 'COLLATERAL')])).toThrow(/context/);
    // Comparing across contexts is the one approved cross-block check, and the relation says which contexts it compared.
    const compared = territoryRelation(unionOf([world('SALES_RIGHTS')]), unionOf([countries('GB', 'MARKET')]));

    expect(compared).toEqual({ kind: 'ESTABLISHED', contains: true, intersects: true });
    expect(unionOf([world('SALES_RIGHTS')]).context).toBe('SALES_RIGHTS');
    expect(unionOf([countries('GB', 'MARKET')]).context).toBe('MARKET');
    expect(complementOf(unionOf([countries('GB', 'MARKET')])).context).toBe('MARKET');
  });

  it('carries every unresolved token of its members, so a relation with one is never established', () => {
    const union = unionOf([countries('GB'), territory({ countriesIncluded: 'UK' })]);

    expect(union.unresolved).toEqual(['UK']);
    expect(territoryRelation(union, unionOf([countries('GB')]))).toEqual({
      kind: 'NOT_ESTABLISHED',
      unresolved: ['UK'],
    });
    expect(territoryRelation(unionOf([countries('GB')]), complementOf(union))).toEqual({
      kind: 'NOT_ESTABLISHED',
      unresolved: ['UK'],
    });
  });
});
