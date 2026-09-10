// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROLOG_SCAN_BOUND } from './prolog';
import { evaluateSourceGate } from './sourceGate';

const FIXTURES = join(__dirname, '__fixtures__', 'spike02');
const fixture = (set: string, name: string) => readFileSync(join(FIXTURES, set, name), 'utf8');

const DTD_STOP_TEXT = 'STOP after stage 2 (DOCTYPE/DTD construct); no later tier parsed or evaluated';

// Frozen from SPIKE-02 v4 out/dtd_suite3?_pipeline.json (stage-2 finding
// objects: id, scope, class, blocking, stage, detail).
const DTD_DETAIL: Record<string, object> = {
  'D1_bare_doctype.xml': { name: 'ONIXMessage', externalId: null, internalSubset: false, malformed: false },
  'D2_xmldecl_doctype.xml': { name: 'ONIXMessage', externalId: null, internalSubset: false, malformed: false },
  'D3_pi_doctype.xml': { name: 'ONIXMessage', externalId: null, internalSubset: false, malformed: false },
  'D4_xmldecl_pi_doctype.xml': { name: 'ONIXMessage', externalId: null, internalSubset: false, malformed: false },
  'D5_mixed_comments_pis_doctype.xml': {
    name: 'ONIXMessage',
    externalId: null,
    internalSubset: false,
    malformed: false,
  },
  'D6_internal_subset.xml': { name: 'ONIXMessage', externalId: null, internalSubset: true, malformed: false },
  'D7_external_system.xml': { name: 'ONIXMessage', externalId: 'SYSTEM', internalSubset: false, malformed: false },
  'D8_external_public.xml': { name: 'ONIXMessage', externalId: 'PUBLIC', internalSubset: false, malformed: false },
  'D9_pi_then_public_with_internal_subset.xml': {
    name: 'ONIXMessage',
    externalId: 'PUBLIC',
    internalSubset: true,
    malformed: false,
  },
  'D10_lowercase_doctype_malformed.xml': { name: null, externalId: null, internalSubset: false, malformed: true },
};

const securityDtd = (detail: object) => ({
  id: 'SECURITY_DTD',
  scope: 'SECURITY',
  class: 'PROCESSING_STOP',
  blocking: true,
  stage: 2,
  detail,
});
const noDoctype31 = {
  id: 'R-MSG-NO-DOCTYPE-31',
  scope: 'VALIDITY',
  class: 'SOURCE_INVALID',
  blocking: true,
  stage: 2,
};
const stage2Projection = (findings: readonly object[]) =>
  findings.map((f) => {
    const { id, scope, class: klass, blocking, stage, detail } = f as Record<string, unknown>;
    return detail === undefined
      ? { id, scope, class: klass, blocking, stage }
      : { id, scope, class: klass, blocking, stage, detail };
  });

describe('evaluateSourceGate: SPIKE-02 v4 DTD suite', () => {
  it.each(Object.keys(DTD_DETAIL))('3.0.8 %s -> SECURITY_DTD only, STOP', (name) => {
    const gate = evaluateSourceGate(fixture('dtd_suite30', name));
    expect(gate.kind).toBe('STOP');
    if (gate.kind !== 'STOP') return;
    expect(gate.stage).toBe(2);
    expect(gate.stopText).toBe(DTD_STOP_TEXT);
    expect(stage2Projection(gate.findings)).toEqual([securityDtd(DTD_DETAIL[name])]);
  });

  it.each(Object.keys(DTD_DETAIL))('3.1.3 %s -> SECURITY_DTD + R-MSG-NO-DOCTYPE-31, STOP', (name) => {
    const gate = evaluateSourceGate(fixture('dtd_suite31', name));
    expect(gate.kind).toBe('STOP');
    if (gate.kind !== 'STOP') return;
    expect(gate.stopText).toBe(DTD_STOP_TEXT);
    expect(stage2Projection(gate.findings)).toEqual([securityDtd(DTD_DETAIL[name]), noDoctype31]);
  });

  it.each([
    ['dtd_suite30', '3.0', '3.0.8'],
    ['dtd_suite31', '3.1', '3.1.3'],
  ])('%s negatives continue to the later tiers', (set, release, schemaRelease) => {
    for (const name of [
      'N1_pi_and_comments_no_doctype.xml',
      'N2_comment_containing_doctype_text.xml',
      'N3_plain.xml',
    ]) {
      const gate = evaluateSourceGate(fixture(set, name));
      expect(gate, name).toMatchObject({
        kind: 'CONTINUE',
        source: { release, schemaRelease, flavour: 'reference' },
      });
    }
  });

  it('applies R-MSG-NO-DOCTYPE-31 from the document release, not a caller hint', () => {
    const on31 = evaluateSourceGate(fixture('policy_dtd', 'S31-0067b_doctype_present.xml'));
    const on30 = evaluateSourceGate(fixture('policy_dtd', 'S31-0067b_doctype_present_30.xml'));
    expect(on31.kind === 'STOP' && on31.findings.map((f) => f.id)).toEqual(['SECURITY_DTD', 'R-MSG-NO-DOCTYPE-31']);
    expect(on30.kind === 'STOP' && on30.findings.map((f) => f.id)).toEqual(['SECURITY_DTD']);
  });
});

describe('evaluateSourceGate: prolog bound', () => {
  const root = (release: '3.0' | '3.1') =>
    `<ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference"><Header/></ONIXMessage>`;
  const boundStop = {
    id: 'SECURITY_PROLOG_BOUND',
    scope: 'SECURITY',
    class: 'PROCESSING_STOP',
    blocking: true,
    stage: 2,
  };

  it.each(['3.0', '3.1'] as const)('%s: a comment straddling the 1 MiB bound stops (P1)', (release) => {
    const gate = evaluateSourceGate(`<?xml version="1.0"?>\n<!--${'x'.repeat(PROLOG_SCAN_BOUND)}-->\n${root(release)}`);
    expect(gate.kind === 'STOP' && stage2Projection(gate.findings)).toEqual([boundStop]);
    expect(gate.kind === 'STOP' && gate.stopText).toBe('STOP after stage 2 (prolog bound exceeded)');
  });

  it('whitespace-only prolog beyond the bound stops (P2)', () => {
    const gate = evaluateSourceGate(`${' '.repeat(PROLOG_SCAN_BOUND + 1)}${root('3.0')}`);
    expect(gate.kind === 'STOP' && gate.findings.map((f) => f.id)).toEqual(['SECURITY_PROLOG_BOUND']);
  });

  it('a straddling comment cannot hide a following DOCTYPE (P3)', () => {
    const gate = evaluateSourceGate(
      `<!--${'x'.repeat(PROLOG_SCAN_BOUND)}--><!DOCTYPE ONIXMessage SYSTEM "http://evil.invalid/x.dtd">${root('3.1')}`,
    );
    expect(gate.kind === 'STOP' && gate.findings.map((f) => f.id)).toEqual(['SECURITY_PROLOG_BOUND']);
  });

  it('a root start tag straddling the 1 MiB bound stops (P4)', () => {
    const text = `${' '.repeat(PROLOG_SCAN_BOUND - 1)}${root('3.1')}`;
    expect(text.indexOf('<ONIXMessage')).toBe(PROLOG_SCAN_BOUND - 1);
    const gate = evaluateSourceGate(text);
    expect(gate.kind === 'STOP' && stage2Projection(gate.findings)).toEqual([boundStop]);
    expect(gate.kind === 'STOP' && [gate.stage, gate.stopText, gate.source]).toEqual([
      2,
      'STOP after stage 2 (prolog bound exceeded)',
      null,
    ]);
  });

  it('continues when the root start tag closes on the last character within the bound', () => {
    const tag = root('3.1').slice(0, root('3.1').indexOf('>') + 1);
    const text = `<!--${'x'.repeat(PROLOG_SCAN_BOUND - tag.length - 7)}-->${root('3.1')}`;
    expect(text.indexOf('>', text.indexOf('<ONIXMessage'))).toBe(PROLOG_SCAN_BOUND - 1);
    expect(evaluateSourceGate(text)).toMatchObject({ kind: 'CONTINUE', source: { release: '3.1' } });
  });

  it('a self-closing root terminator straddling the 1 MiB bound stops (P5)', () => {
    const selfClosing = '<ONIXMessage release="3.1" xmlns="http://ns.editeur.org/onix/3.1/reference"/>';
    const text = `<!--${'x'.repeat(PROLOG_SCAN_BOUND - selfClosing.length - 6)}-->${selfClosing}`;
    expect(text.indexOf('/>')).toBe(PROLOG_SCAN_BOUND - 1);
    const gate = evaluateSourceGate(text);
    expect(gate.kind === 'STOP' && stage2Projection(gate.findings)).toEqual([boundStop]);
    expect(gate.kind === 'STOP' && [gate.stage, gate.stopText, gate.source]).toEqual([
      2,
      'STOP after stage 2 (prolog bound exceeded)',
      null,
    ]);
  });

  it('continues when a self-closing root terminator lies wholly inside the bound', () => {
    const selfClosing = '<ONIXMessage release="3.1" xmlns="http://ns.editeur.org/onix/3.1/reference"/>';
    const text = `<!--${'x'.repeat(PROLOG_SCAN_BOUND - selfClosing.length - 7)}-->${selfClosing}`;
    expect(text.indexOf('/>')).toBe(PROLOG_SCAN_BOUND - 2);
    expect(evaluateSourceGate(text)).toMatchObject({
      kind: 'CONTINUE',
      source: { release: '3.1', flavour: 'reference' },
    });
  });

  it('keeps SECURITY_DTD when the DOCTYPE itself cannot be closed within the bound', () => {
    const gate = evaluateSourceGate(
      `<!DOCTYPE ONIXMessage [<!ENTITY a "${'x'.repeat(PROLOG_SCAN_BOUND)}">]>${root('3.1')}`,
    );
    expect(gate.kind === 'STOP' && gate.findings.map((f) => f.id)).toEqual(['SECURITY_DTD']);
  });
});

describe('evaluateSourceGate: stage 1 precedes stage 2', () => {
  it('stops ONIX 2.1 with a DOCTYPE as unsupported, never as invalid', () => {
    const gate = evaluateSourceGate(
      '<!DOCTYPE ONIXMessage SYSTEM "http://www.editeur.org/onix/2.1/reference/onix-international.dtd"><ONIXMessage release="2.1"><Header/></ONIXMessage>',
    );
    expect(gate.kind).toBe('STOP');
    if (gate.kind !== 'STOP') return;
    expect(gate.stage).toBe(1);
    expect(gate.findings).toEqual([
      expect.objectContaining({
        id: 'UNSUPPORTED_SOURCE',
        policy: 'P-SUPPORT-RELEASE-FLAVOUR',
        scope: 'SUPPORT',
        class: 'PROCESSING_STOP',
        blocking: true,
        stage: 1,
      }),
    ]);
  });

  it('stops a mixed-flavour root as SOURCE_INVALID', () => {
    const gate = evaluateSourceGate('<ONIXmessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"/>');
    expect(gate.kind === 'STOP' && gate.findings).toEqual([
      expect.objectContaining({
        id: 'SOURCE_RELEASE_FLAVOUR_INVALID',
        scope: 'VALIDITY',
        class: 'SOURCE_INVALID',
        blocking: true,
        stage: 1,
        detail: expect.objectContaining({ reason: 'MIXED_FLAVOUR' }),
      }),
    ]);
  });

  it('stops a malformed prolog as not well-formed', () => {
    const gate = evaluateSourceGate('junk<ONIXMessage/>');
    expect(gate.kind === 'STOP' && gate.findings).toEqual([
      expect.objectContaining({
        id: 'SOURCE_NOT_WELL_FORMED',
        scope: 'VALIDITY',
        class: 'SOURCE_INVALID',
        blocking: true,
        stage: 2,
      }),
    ]);
  });

  it('continues a Short 3.1 message', () => {
    expect(
      evaluateSourceGate(
        '<ONIXmessage release="3.1" xmlns="http://ns.editeur.org/onix/3.1/short"><header/></ONIXmessage>',
      ),
    ).toMatchObject({
      kind: 'CONTINUE',
      source: { release: '3.1', flavour: 'short' },
    });
  });
});
