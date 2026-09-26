// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Element } from 'slimdom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { deriveTagMap } from '../tagMap';
import { createOnixSourceValidator, type OnixSourceValidator } from '../validator';
import { buildXdm, forEachElementPath, pathOf, serializeXdm } from '../xdm';
import { assertStructuredCloneSafe } from './cloneSafety';
import type { OnixWorkerResult } from './protocol';
import { createProvenanceResolver } from './provenance';
import { toWorkerResult } from './result';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const FIXTURES = join(__dirname, '..', '__fixtures__', 'spike02');
const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const fixtureBytes = (path: string) => new Uint8Array(readFileSync(join(FIXTURES, path)));
const encode = (text: string) => new TextEncoder().encode(text);
const loadResource = async (fileName: string) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName)));

let validator: OnixSourceValidator;
beforeAll(() => {
  validator = createOnixSourceValidator({ loadResource });
});

const REFERENCE_30 =
  '<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference">' +
  '<Header><Sender><SenderName>T</SenderName></Sender><SentDateTime>20260909T1200</SentDateTime></Header>' +
  ['a', 'b']
    .map(
      (r) =>
        `<Product><RecordReference>${r}</RecordReference><NotificationType>03</NotificationType>` +
        '<ProductIdentifier><ProductIDType>01</ProductIDType><IDTypeName>X</IDTypeName><IDValue>1</IDValue></ProductIdentifier>' +
        '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier>' +
        '<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>one</Text></TextContent>' +
        '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent>' +
        '<TextContent><TextType>04</TextType><ContentAudience>00</ContentAudience><Text textformat="05"><p>x &amp; <b>y</b></p></Text></TextContent></CollateralDetail>' +
        '</Product>',
    )
    .join('') +
  '</ONIXMessage>';

const SHORT_30 =
  '<ONIXmessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/short"><header><sender><x298>T</x298></sender><x307>20260909T1200</x307></header>' +
  ['a', 'b']
    .map(
      (r) =>
        `<product><a001>${r}</a001><a002>03</a002>` +
        '<productidentifier><b221>01</b221><b233>X</b233><b244>1</b244></productidentifier>' +
        '<productidentifier><b221>15</b221><b244>9780000000002</b244></productidentifier>' +
        '<collateraldetail><textcontent><x426>03</x426><x427>00</x427><d104>one</d104></textcontent>' +
        '<textcontent><x426>03</x426><x427>00</x427></textcontent>' +
        '<textcontent><x426>04</x426><x427>00</x427><d104 textformat="05"><p>x &amp; <b>y</b></p></d104></textcontent></collateraldetail>' +
        '</product>',
    )
    .join('') +
  '</ONIXmessage>';

/** Elements of two structurally identical trees in document order, paired. */
function pairedElements(a: Element, b: Element): [Element, Element][] {
  const listA: Element[] = [];
  const listB: Element[] = [];
  forEachElementPath(
    a.ownerDocument!,
    (e) => e.localName,
    (e) => void listA.push(e),
  );
  forEachElementPath(
    b.ownerDocument!,
    (e) => e.localName,
    (e) => void listB.push(e),
  );
  expect(listB.length).toBe(listA.length);
  return listA.map((e, i) => [e, listB[i]]);
}

describe('Worker result DTO', () => {
  it('cannot carry the in-process normalised source: Document, provenance functions and serialize() are rejected', async () => {
    const result = await validator.validate(encode(REFERENCE_30));
    expect(result.status).toBe('COMPLETED');
    expect(() => assertStructuredCloneSafe(result.normalized)).toThrow(/Document instance|function/);
    expect(() => assertStructuredCloneSafe({ provenance: result.normalized!.provenance })).toThrow(/function/);
    expect(() => assertStructuredCloneSafe(result)).toThrow();
  });

  it.each([
    ['Reference 3.0 with repeated elements and a recovery', () => encode(REFERENCE_30)],
    ['Short 3.0 with repeated elements and a recovery', () => encode(SHORT_30)],
    ['frozen recovery fixture', () => fixtureBytes('taint30/T1_empty_textcontent_recovery.xml')],
    ['DTD stop', () => fixtureBytes('dtd_suite31/D1_bare_doctype.xml')],
    ['unsupported release', () => encode('<ONIXMessage release="2.1"><Header/></ONIXMessage>')],
  ])('%s: the DTO is structured-clone safe and survives structuredClone unchanged', async (_label, bytes) => {
    const dto = toWorkerResult(await validator.validate(bytes()));
    assertStructuredCloneSafe(dto);
    expect(structuredClone(dto)).toEqual(dto);
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });

  it('carries the complete ledger, summary, descriptor, stop and recovery markers unchanged', async () => {
    const result = await validator.validate(encode(REFERENCE_30));
    const dto = toWorkerResult(result);
    expect(dto.findings).toEqual(result.findings);
    expect(dto.summary).toEqual(result.summary);
    expect(dto.source).toEqual(result.source);
    expect(dto.sourceValid).toBe(result.sourceValid);
    expect(dto.stop).toBeNull();
    expect(dto.normalized?.recoveries).toEqual(result.normalized?.recoveries);
    expect(dto.normalized?.recoveries.length).toBe(2);
    const stopped = toWorkerResult(await validator.validate(fixtureBytes('dtd_suite31/D1_bare_doctype.xml')));
    expect(stopped).toMatchObject({ status: 'STOPPED', stop: { stage: 2 }, normalized: null, sourceValid: false });
    expect(stopped.findings.map((f) => f.id)).toEqual(['SECURITY_DTD', 'R-MSG-NO-DOCTYPE-31']);
  });

  // Each Product's malformed TextContent[2] is omitted, so its TextContent[3] now stands at canonical TextContent[2].
  describe.each([
    ['Reference 3.0', REFERENCE_30, 'REPOSITIONED'],
    ['Short 3.0', SHORT_30, 'RENAMED'],
  ])('%s normalised source', (_label, text, kind) => {
    let result: Awaited<ReturnType<OnixSourceValidator['validate']>>;
    let dto: OnixWorkerResult;
    beforeAll(async () => {
      result = await validator.validate(encode(text));
      dto = toWorkerResult(result);
    });

    it('serialises the exact validated (recovered) tree, which reparses to the same canonical Reference tree', () => {
      expect(dto.normalized!.xml).toBe(result.normalized!.serialize());
      expect(dto.normalized!.xml).not.toContain(
        '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent>',
      );
      const reparsed = buildXdm(dto.normalized!.xml);
      expect(serializeXdm(reparsed.document)).toBe(dto.normalized!.xml);
      expect(reparsed.document.documentElement!.localName).toBe('ONIXMessage');
      expect(reparsed.document.documentElement!.namespaceURI).toBe('http://ns.editeur.org/onix/3.0/reference');
      expect(reparsed.elementCount).toBe(dto.normalized!.elementCount);
      for (const [original, copy] of pairedElements(
        result.normalized!.document.documentElement!,
        reparsed.document.documentElement!,
      )) {
        expect(pathOf(copy)).toBe(pathOf(original));
        expect(copy.namespaceURI).toBe(original.namespaceURI);
      }
    });

    it(`ships a ${kind} provenance sidecar that reproduces #190's in-process source tag and path of every element`, () => {
      const provenance = dto.normalized!.provenance;
      expect(provenance.kind).toBe(kind);
      const resolve = createProvenanceResolver(provenance);
      const reparsed = buildXdm(dto.normalized!.xml);
      let checked = 0;
      for (const [original, copy] of pairedElements(
        result.normalized!.document.documentElement!,
        reparsed.document.documentElement!,
      )) {
        const path = pathOf(copy);
        expect(resolve.sourcePathOf(path), path).toBe(result.normalized!.provenance.sourcePathOf(original));
        expect(resolve.sourceTagOf(path), path).toBe(result.normalized!.provenance.sourceTagOf(original));
        checked++;
      }
      expect(checked).toBeGreaterThan(20);
      // Exactly the moved TextContent of each Product, and everything inside it, is listed.
      expect(provenance.kind === 'IDENTITY' ? [] : provenance.exceptions.map((e) => e.path)).toEqual(
        [1, 2].flatMap((product) =>
          ['', '/TextType[1]', '/ContentAudience[1]', '/Text[1]', '/Text[1]/p[1]', '/Text[1]/p[1]/b[1]'].map(
            (inside) => `/ONIXMessage[1]/Product[${product}]/CollateralDetail[1]/TextContent[2]${inside}`,
          ),
        ),
      );
      if (provenance.kind === 'RENAMED') {
        expect(provenance.renamedElementCount).toBe(result.normalized!.provenance.renamedElementCount);
        expect(provenance.referenceToSource).toMatchObject({
          Product: 'product',
          ProductIdentifier: 'productidentifier',
          Text: 'd104',
        });
        expect(provenance.referenceToSource).not.toHaveProperty('p');
        expect(resolve.sourcePathOf('/ONIXMessage[1]/Product[2]/ProductIdentifier[2]/IDValue[1]')).toBe(
          '/ONIXmessage[1]/product[2]/productidentifier[2]/b244[1]',
        );
        expect(
          resolve.sourcePathOf('/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[2]/Text[1]/p[1]/b[1]'),
        ).toBe('/ONIXmessage[1]/product[1]/collateraldetail[1]/textcontent[3]/d104[1]/p[1]/b[1]');
      } else {
        expect(
          resolve.sourcePathOf('/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[2]/Text[1]/p[1]/b[1]'),
        ).toBe('/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[3]/Text[1]/p[1]/b[1]');
      }
    });
  });

  it('records explicit exceptions when the tag map alone would misplace an element', async () => {
    // A Short message that also carries literal Reference names in the Short namespace: after renaming, `Product`
    // and `product` become same-named siblings, so map-based positions would be wrong for them.
    const odd = SHORT_30.replace(
      '</header>',
      '</header><Product><a001>odd</a001><a002>03</a002><productidentifier><b221>15</b221><b244>9780000000002</b244></productidentifier></Product>',
    );
    const result = await validator.validate(encode(odd));
    expect(result.status).toBe('COMPLETED');
    const dto = toWorkerResult(result);
    const provenance = dto.normalized!.provenance;
    expect(provenance.kind).toBe('RENAMED');
    if (provenance.kind !== 'RENAMED') return;
    expect(provenance.exceptions.length).toBeGreaterThan(0);
    expect(provenance.exceptions[0]).toEqual({
      path: '/ONIXMessage[1]/Product[1]',
      sourcePath: '/ONIXmessage[1]/Product[1]',
      sourceTag: 'Product',
    });
    const resolve = createProvenanceResolver(provenance);
    const reparsed = buildXdm(dto.normalized!.xml);
    for (const [original, copy] of pairedElements(
      result.normalized!.document.documentElement!,
      reparsed.document.documentElement!,
    )) {
      const path = pathOf(copy);
      expect(resolve.sourcePathOf(path), path).toBe(result.normalized!.provenance.sourcePathOf(original));
      expect(resolve.sourceTagOf(path), path).toBe(result.normalized!.provenance.sourceTagOf(original));
    }
    expect(resolve.sourcePathOf('/ONIXMessage[1]/Product[2]')).toBe('/ONIXmessage[1]/product[1]');
    assertStructuredCloneSafe(dto);
  });
});

type Release = '3.0' | '3.1';
const COLLATERAL = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]';

/**
 * One otherwise valid Product whose CollateralDetail states a TextContent without its Text (the approved
 * OMIT_INVALID_COMPOSITE case) before three valid ones; `lastText` is the Text of the fourth.
 */
const omittedFirst = (release: Release, lastText = '<Text>fourth</Text>') =>
  `<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference">` +
  '<Header><Sender><SenderName>Provenance Press</SenderName></Sender><SentDateTime>20260926T1200</SentDateTime></Header>' +
  '<Product><RecordReference>prov.1</RecordReference><NotificationType>03</NotificationType>' +
  '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780000000002</IDValue></ProductIdentifier>' +
  '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>' +
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Provenance</TitleText></TitleElement></TitleDetail>' +
  '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language></DescriptiveDetail>' +
  '<CollateralDetail>' +
  '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent>' +
  '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>second</Text></TextContent>' +
  '<TextContent><TextType>04</TextType><ContentAudience>00</ContentAudience><Text textformat="05"><p>third <b>b</b></p></Text></TextContent>' +
  `<TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience>${lastText}</TextContent>` +
  '</CollateralDetail>' +
  '<PublishingDetail><Publisher><PublishingRole>01</PublishingRole><PublisherName>Provenance Press</PublisherName></Publisher>' +
  '<PublishingStatus>04</PublishingStatus></PublishingDetail></Product></ONIXMessage>';

const tagMaps = {
  '3.0': deriveTagMap(
    readFileSync(join(PUBLIC_DIR, 'ONIX_BookProduct_3.0_reference.xsd'), 'utf8'),
    readFileSync(join(PUBLIC_DIR, 'ONIX_BookProduct_3.0_short.xsd'), 'utf8'),
  ),
  '3.1': deriveTagMap(
    readFileSync(join(PUBLIC_DIR, 'ONIX_BookProduct_3.1_reference.xsd'), 'utf8'),
    readFileSync(join(PUBLIC_DIR, 'ONIX_BookProduct_3.1_short.xsd'), 'utf8'),
  ),
};

/** The same message in Short tags: every element renamed through the pinned schema correspondence, nothing else. */
const toShort = (release: Release, reference: string) =>
  reference
    .replace(
      /<(\/?)([A-Za-z][\w.-]*)/g,
      (_, close: string, name: string) => `<${close}${tagMaps[release].referenceToShort.get(name) ?? name}`,
    )
    .replace(`/onix/${release}/reference"`, `/onix/${release}/short"`);

/** Canonical path steps without their names: where an element stands, whatever it is called. */
const positions = (path: string) => path.replace(/[^/[\]]+(?=\[)/g, '');

describe.each([
  ['Reference 3.0', '3.0', 'reference'],
  ['Reference 3.1', '3.1', 'reference'],
  ['Short 3.0', '3.0', 'short'],
  ['Short 3.1', '3.1', 'short'],
] as const)('%s: original occurrences across an omitted composite (thoth-app#231)', (_label, release, flavour) => {
  const upload = (lastText?: string) =>
    flavour === 'reference' ? omittedFirst(release, lastText) : toShort(release, omittedFirst(release, lastText));
  const uploaded = upload();
  const sourceCollateral = flavour === 'reference' ? COLLATERAL : '/ONIXmessage[1]/product[1]/collateraldetail[1]';
  const [textContentTag, textTag] = flavour === 'reference' ? ['TextContent', 'Text'] : ['textcontent', 'd104'];
  let result: Awaited<ReturnType<OnixSourceValidator['validate']>>;
  let dto: OnixWorkerResult;
  beforeAll(async () => {
    result = await validator.validate(encode(uploaded));
    dto = toWorkerResult(result);
  });

  it('omits only the malformed first TextContent, and its marker keeps that original canonical path', () => {
    expect(result.sourceValid).toBe(true);
    expect(dto.normalized!.recoveries).toEqual([
      { recovery: 'OMIT_INVALID_COMPOSITE', removed: `${COLLATERAL}/TextContent[1]`, taintSite: COLLATERAL },
    ]);
    const reparsed = buildXdm(dto.normalized!.xml).document;
    expect(reparsed.getElementsByTagName('Text').map((text) => text.textContent)).toEqual([
      'second',
      'third b',
      'fourth',
    ]);
  });

  it('resolves each surviving TextContent to its uploaded occurrence, not to the position it moved to', () => {
    const provenance = dto.normalized!.provenance;
    expect(provenance.kind).toBe(flavour === 'reference' ? 'REPOSITIONED' : 'RENAMED');
    const resolve = createProvenanceResolver(provenance);
    for (const canonical of [1, 2, 3]) {
      const path = `${COLLATERAL}/TextContent[${canonical}]`;
      const source = `${sourceCollateral}/${textContentTag}[${canonical + 1}]`;
      expect(resolve.sourcePathOf(path)).toBe(source);
      expect(resolve.sourceTagOf(path)).toBe(textContentTag);
      expect(resolve.sourcePathOf(`${path}/Text[1]`)).toBe(`${source}/${textTag}[1]`);
      expect(resolve.sourceTagOf(`${path}/Text[1]`)).toBe(textTag);
    }
  });

  it('reparses to a tree whose every element resolves, in and out of the Worker, to the uploaded element it came from', () => {
    // Independent oracle: the uploaded text parsed as it stands, less the omitted composite's subtree.
    const uploadedTree = buildXdm(uploaded).document;
    const omitted = pathOf(uploadedTree.getElementsByTagName(textContentTag)[0]);
    const expected: [string, string][] = [];
    forEachElementPath(
      uploadedTree,
      (e) => e.localName,
      (element, path) => {
        if (path !== omitted && !path.startsWith(`${omitted}/`)) expected.push([path, element.localName]);
      },
    );
    const canonical: string[] = [];
    forEachElementPath(
      buildXdm(dto.normalized!.xml).document,
      (e) => e.localName,
      (_element, path) => void canonical.push(path),
    );
    const inProcess: [string, string][] = [];
    forEachElementPath(
      result.normalized!.document,
      (e) => e.localName,
      (element) =>
        void inProcess.push([
          result.normalized!.provenance.sourcePathOf(element),
          result.normalized!.provenance.sourceTagOf(element),
        ]),
    );

    const resolve = createProvenanceResolver(dto.normalized!.provenance);
    expect(canonical).toHaveLength(expected.length);
    expect(canonical.map((path) => [resolve.sourcePathOf(path), resolve.sourceTagOf(path)])).toEqual(expected);
    expect(inProcess).toEqual(expected);
    // Exactly the moved survivors, and what is inside them, are listed; every other element keeps its position.
    const moved = canonical.filter((path, i) => positions(path) !== positions(expected[i][0]));
    expect(moved).toEqual(
      [2, 3, 4].flatMap((source) => {
        const at = `${COLLATERAL}/TextContent[${source - 1}]`;
        const inside = source === 3 ? ['/Text[1]/p[1]', '/Text[1]/p[1]/b[1]'] : [];
        return [at, `${at}/TextType[1]`, `${at}/ContentAudience[1]`, `${at}/Text[1]`, ...inside.map((p) => at + p)];
      }),
    );
    const provenance = dto.normalized!.provenance;
    expect(provenance.kind === 'IDENTITY' ? [] : provenance.exceptions.map((e) => e.path)).toEqual(moved);
  });

  it("keeps the omitted composite's own finding, which in a Short source now names its full uploaded path", () => {
    expect(result.findings.filter((f) => f.recoverability === 'OMIT_INVALID_COMPOSITE')).toEqual([
      expect.objectContaining({
        id: 'ORDINARY_XSD_INVALID',
        tier: 'CANONICAL_ORDINARY',
        stage: 5,
        class: 'SOURCE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        counts: false,
        path: `${COLLATERAL}/TextContent[1]`,
        sourcePath: flavour === 'reference' ? undefined : `${sourceCollateral}/textcontent[1]`,
      }),
    ]);
    expect(result.summary).toEqual({
      total: release === '3.0' ? 2 : 3,
      blocking: 0,
      secondary: 0,
      notEvaluable: 0,
      recovered: 1,
    });
  });

  it('keeps a finding inside a moved survivor at its canonical path, and at its uploaded occurrence in a Short source', async () => {
    const invalid = await validator.validate(encode(upload('<Text textformat="07">café</Text>')));
    const sourcePath = (path: string) => (flavour === 'reference' ? undefined : path);
    // Every field but a Short `sourcePath` is exactly what validation reported before thoth-app#231.
    expect(
      invalid.findings.map((f) => [
        f.id,
        f.tier,
        f.stage,
        f.class,
        f.blocking,
        f.projection,
        f.recoverability,
        f.counts,
        f.path,
        f.sourcePath,
      ]),
    ).toEqual([
      [
        'ORDINARY_XSD_INVALID',
        'CANONICAL_ORDINARY',
        5,
        'SOURCE_INVALID',
        true,
        'AUTHORITATIVE',
        'OMIT_INVALID_COMPOSITE',
        false,
        `${COLLATERAL}/TextContent[1]`,
        sourcePath(`${sourceCollateral}/textcontent[1]`),
      ],
      [
        '_20180517_a_25',
        'STRICT',
        6,
        'NORMATIVE_INVALID',
        true,
        'AUTHORITATIVE',
        'NOT_RECOVERABLE',
        true,
        `${COLLATERAL}/TextContent[3]/Text[1]`,
        sourcePath(`${sourceCollateral}/textcontent[4]/d104[1]`),
      ],
      ...(release === '3.1'
        ? [
            [
              '_20240205_a_12',
              'SCHEMATRON',
              7,
              'DEPRECATED_OR_INFORMATIONAL',
              false,
              'AUTHORITATIVE',
              'NOT_RECOVERABLE',
              false,
              '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/TitleDetail[1]/TitleElement[1]',
              sourcePath('/ONIXmessage[1]/product[1]/descriptivedetail[1]/titledetail[1]/titleelement[1]'),
            ],
          ]
        : []),
      [
        '_20190410_c_2',
        'SCHEMATRON',
        7,
        'ADVISORY',
        false,
        'AUTHORITATIVE',
        'NOT_RECOVERABLE',
        false,
        '/ONIXMessage[1]/Header[1]',
        sourcePath('/ONIXmessage[1]/header[1]'),
      ],
      [
        '_20200115_d_1',
        'SCHEMATRON',
        7,
        'DEPRECATED_OR_INFORMATIONAL',
        false,
        'SECONDARY',
        'NOT_RECOVERABLE',
        false,
        '/ONIXMessage[1]',
        sourcePath('/ONIXmessage[1]'),
      ],
    ]);
    expect(invalid.sourceValid).toBe(false);
    expect(invalid.summary).toMatchObject({ blocking: 1, recovered: 1, secondary: 1 });
    // The sidecar names the uploaded element the ledger names.
    const resolve = createProvenanceResolver(toWorkerResult(invalid).normalized!.provenance);
    expect(resolve.sourcePathOf(`${COLLATERAL}/TextContent[3]/Text[1]`)).toBe(
      `${sourceCollateral}/${textContentTag}[4]/${textTag}[1]`,
    );
  });
});

describe('provenance where every canonical path is still the uploaded one (thoth-app#231)', () => {
  const withoutOmission = (release: Release) =>
    omittedFirst(release).replace(
      '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience></TextContent>',
      '',
    );

  it.each([
    ['a valid Reference source', () => encode(withoutOmission('3.1')), 0],
    [
      'a Reference recovery that omits the last TextContent, moving nothing',
      () => fixtureBytes('taint30/T1_empty_textcontent_recovery.xml'),
      1,
    ],
  ])('keeps IDENTITY for %s', async (_label, bytes, omissions) => {
    const result = await validator.validate(bytes());
    expect(toWorkerResult(result).normalized!.provenance).toEqual({ kind: 'IDENTITY', flavour: 'reference' });
    expect(result.normalized!.recoveries).toHaveLength(omissions);
  });

  it.each(['3.0', '3.1'] as const)(
    'keeps a Short %s source without a recovery at its tag map, with no exception and every element as parsed',
    async (release) => {
      const uploaded = toShort(release, withoutOmission(release));
      const result = await validator.validate(encode(uploaded));
      const provenance = toWorkerResult(result).normalized!.provenance;
      expect(result.normalized!.recoveries).toEqual([]);
      expect(provenance).toMatchObject({ kind: 'RENAMED', flavour: 'short', exceptions: [] });
      if (provenance.kind !== 'RENAMED') return;
      expect(provenance.referenceToSource).toMatchObject({ TextContent: 'textcontent', Text: 'd104' });
      const expected: [string, string][] = [];
      forEachElementPath(
        buildXdm(uploaded).document,
        (e) => e.localName,
        (element, path) => void expected.push([path, element.localName]),
      );
      const resolve = createProvenanceResolver(provenance);
      const resolved: [string, string][] = [];
      forEachElementPath(
        result.normalized!.document,
        (e) => e.localName,
        (_element, path) => void resolved.push([resolve.sourcePathOf(path), resolve.sourceTagOf(path)]),
      );
      expect(resolved).toEqual(expected);
    },
  );
});
