// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildXdm, pathOf, resolveLibxmlPath, serializeXdm, XdmParseError } from './xdm';

const REF = 'http://ns.editeur.org/onix/3.0/reference';
const SHORT = 'http://ns.editeur.org/onix/3.0/short';

describe('buildXdm', () => {
  it('round-trips a canonical document node for node', () => {
    const text =
      `<ONIXMessage release="3.0" xmlns="${REF}"><!-- c --><?pi data?>` +
      `<Header><SenderName>A &amp; B &lt;x&gt;</SenderName></Header>` +
      `<Product datestamp="20260101"><RecordReference>r</RecordReference><Empty/>` +
      `<Text><![CDATA[<b>raw</b>]]></Text></Product></ONIXMessage>`;
    const { document } = buildXdm(text);
    expect(serializeXdm(document)).toBe(text);
    const header = document.documentElement?.firstElementChild;
    expect(header?.namespaceURI).toBe(REF);
  });

  it('keeps namespace prefixes and declarations', () => {
    const text = `<onix:ONIXMessage xmlns:onix="${REF}" release="3.0"><onix:Header/></onix:ONIXMessage>`;
    const { document } = buildXdm(text);
    expect(document.documentElement?.localName).toBe('ONIXMessage');
    expect(document.documentElement?.prefix).toBe('onix');
    expect(serializeXdm(document)).toBe(text);
  });

  it('escapes characters that a parser would otherwise normalise', () => {
    const text = `<r a="x&#9;y&#10;z&quot;"><t>line&#13;</t></r>`;
    const { document } = buildXdm(text);
    expect(document.documentElement?.getAttribute('a')).toBe('x\ty\nz"');
    expect(serializeXdm(document)).toBe(text);
  });

  it('rejects input that is not namespace well-formed', () => {
    expect(() => buildXdm('<onix:ONIXMessage/>')).toThrow(XdmParseError);
    expect(() => buildXdm('<a><b></a>')).toThrow(XdmParseError);
  });

  it('refuses a DOCTYPE even though stage 2 never lets one through', () => {
    expect(() => buildXdm('<!DOCTYPE a><a/>')).toThrow(XdmParseError);
  });
});

describe('buildXdm with Short-to-Reference renaming', () => {
  const rename = {
    shortToReference: new Map([
      ['ONIXmessage', 'ONIXMessage'],
      ['header', 'Header'],
      ['x298', 'SenderName'],
      ['product', 'Product'],
      ['a001', 'RecordReference'],
      ['textcontent', 'TextContent'],
      ['d104', 'Text'],
    ]),
    sourceNamespace: SHORT,
    targetNamespace: REF,
  };
  const short =
    `<ONIXmessage release="3.0" xmlns="${SHORT}"><header><x298>A</x298></header>` +
    `<product><a001 refname="RecordReference" shortname="a001">r</a001><textcontent><d104 textformat="05"><p>x</p></d104></textcontent></product></ONIXmessage>`;

  it('renames ONIX elements into the Reference namespace and leaves the rest untouched', () => {
    const { document } = buildXdm(short, { rename });
    expect(serializeXdm(document)).toBe(
      `<ONIXMessage release="3.0" xmlns="${REF}"><Header><SenderName>A</SenderName></Header>` +
        `<Product><RecordReference refname="RecordReference" shortname="a001">r</RecordReference><TextContent><Text textformat="05"><p>x</p></Text></TextContent></Product></ONIXMessage>`,
    );
  });

  it('moves XHTML-subset elements into the Reference namespace without renaming them', () => {
    const { document } = buildXdm(short, { rename });
    const p = document.getElementsByTagName('p')[0];
    expect(p.namespaceURI).toBe(REF);
  });

  it('records the original tag and path of every renamed element', () => {
    const { document, provenance } = buildXdm(short, { rename });
    const text = document.getElementsByTagName('Text')[0];
    expect(pathOf(text)).toBe('/ONIXMessage[1]/Product[1]/TextContent[1]/Text[1]');
    expect(provenance.sourceTagOf(text)).toBe('d104');
    expect(provenance.sourcePathOf(text)).toBe('/ONIXmessage[1]/product[1]/textcontent[1]/d104[1]');
    // Seven tags change; the XHTML-subset <p> only changes namespace.
    expect(provenance.renamedElementCount).toBe(7);
  });

  it('has no provenance for Reference input', () => {
    const { document, provenance } = buildXdm(`<ONIXMessage xmlns="${REF}"><Header/></ONIXMessage>`);
    expect(provenance.renamedElementCount).toBe(0);
    expect(provenance.sourcePathOf(document.documentElement!)).toBe('/ONIXMessage[1]');
  });
});

describe('pathOf and resolveLibxmlPath', () => {
  const { document } = buildXdm(
    `<ONIXMessage xmlns="${REF}"><Header/><Product><A/><B/><A/></Product><Product><A/></Product></ONIXMessage>`,
  );

  it('produces 1-based same-name positions', () => {
    const secondA = document.getElementsByTagName('A')[1];
    expect(pathOf(secondA)).toBe('/ONIXMessage[1]/Product[1]/A[2]');
  });

  it('resolves libxml2 wildcard paths by element position', () => {
    expect(pathOf(resolveLibxmlPath(document, '/*/*[2]/*[3]')!)).toBe('/ONIXMessage[1]/Product[1]/A[2]');
    expect(pathOf(resolveLibxmlPath(document, '/*/*[3]/*')!)).toBe('/ONIXMessage[1]/Product[2]/A[1]');
  });

  it('resolves named steps by same-name position', () => {
    expect(pathOf(resolveLibxmlPath(document, '/ONIXMessage/Product[2]/A')!)).toBe('/ONIXMessage[1]/Product[2]/A[1]');
  });

  it('returns null for paths it cannot resolve (whole-document fail-safe upstream)', () => {
    expect(resolveLibxmlPath(document, '/*/*[9]')).toBeNull();
    expect(resolveLibxmlPath(document, '/*/*[2]/@datestamp')).toBeNull();
  });
});
