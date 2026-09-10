import { ParseOption, XmlDocument, XmlLibError, xmlRegisterInputProvider, XsdValidator } from 'libxml2-wasm';

import { ONIX_VALIDATION_RESOURCES } from './resources';

/**
 * Ordinary XSD tier (stages 2, 3 and 5): hardened libxml2 well-formedness and
 * XSD 1.0 validation against the pinned official ordinary schemas.
 *
 * Hardening: `NO_XXE | NONET` and never `DTDLOAD`, so no DTD or external
 * entity is loaded. The single input provider claims every URL libxml2 asks
 * for, serves only pinned schema files by exact name and refuses everything
 * else, so libxml2's own file or network handlers are never consulted.
 */
export const HARDENED_PARSE_OPTIONS =
  ParseOption.XML_PARSE_NO_XXE | ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_BIG_LINES;

export interface OrdinaryDiagnostic {
  readonly message: string;
  readonly level: number;
  readonly line: number;
  readonly col: number;
  /** libxml2 node path (`/*[k]` steps), when libxml2 reports one. */
  readonly xpath: string | null;
}

export interface OrdinaryResult {
  readonly wellFormed: boolean;
  readonly diagnostics: readonly OrdinaryDiagnostic[];
}

export interface OrdinaryValidator {
  validate(bytes: Uint8Array): OrdinaryResult;
  dispose(): void;
}

/** Every URL libxml2 asked the input layer for, in order (audit evidence). */
export const requestedResourceUrls: string[] = [];

const PINNED = new Set(ONIX_VALIDATION_RESOURCES.map((r) => r.fileName));
const served = new Map<string, Uint8Array>();
const open = new Map<number, { bytes: Uint8Array; position: number }>();
let nextHandle = 1;
let installed = false;

function installInputProvider(): void {
  if (installed) return;
  installed = true;
  xmlRegisterInputProvider({
    match(url) {
      requestedResourceUrls.push(url);
      return true;
    },
    open(url) {
      const bytes = served.get(url);
      if (!bytes) return undefined;
      const handle = nextHandle++;
      open.set(handle, { bytes, position: 0 });
      return handle;
    },
    read(handle, buffer) {
      const state = open.get(handle);
      if (!state) return -1;
      const length = Math.min(buffer.byteLength, state.bytes.byteLength - state.position);
      buffer.set(state.bytes.subarray(state.position, state.position + length));
      state.position += length;
      return length;
    },
    close(handle) {
      return open.delete(handle);
    },
  });
}

function toDiagnostics(error: unknown): OrdinaryDiagnostic[] {
  if (error instanceof XmlLibError && error.details.length) {
    return error.details.map((d) => ({
      message: d.message.trimEnd(),
      level: d.level,
      line: d.line,
      col: d.col,
      xpath: d.xpath ?? null,
    }));
  }
  return [{ message: String(error), level: 3, line: 0, col: 0, xpath: null }];
}

export type HardenedParseResult =
  | { readonly document: XmlDocument; readonly diagnostics: readonly [] }
  | { readonly document: null; readonly diagnostics: readonly OrdinaryDiagnostic[] };

/** Hardened well-formedness parse. The caller must dispose the document. */
export function hardenedParse(bytes: Uint8Array): HardenedParseResult {
  installInputProvider();
  try {
    return {
      document: XmlDocument.fromBuffer(bytes, { option: HARDENED_PARSE_OPTIONS }),
      diagnostics: [],
    };
  } catch (error) {
    return { document: null, diagnostics: toDiagnostics(error) };
  }
}

/**
 * Compiles one pinned ordinary schema from verified in-memory bytes. Every
 * pinned file present in `resources` becomes resolvable by exact name (the
 * structure module includes the codelists and XHTML subset).
 */
export async function createOrdinaryValidator(
  resources: ReadonlyMap<string, Uint8Array>,
  schemaFileName: string,
): Promise<OrdinaryValidator> {
  const schemaBytes = resources.get(schemaFileName);
  if (!PINNED.has(schemaFileName) || !schemaBytes) {
    throw new Error(`${schemaFileName} is not a pinned ONIX schema`);
  }
  for (const [name, fileBytes] of resources) {
    if (PINNED.has(name)) served.set(name, fileBytes);
  }
  installInputProvider();
  const schemaDocument = XmlDocument.fromBuffer(schemaBytes, { url: schemaFileName });
  const validator = XsdValidator.fromDoc(schemaDocument);
  return {
    validate(bytes) {
      const parsed = hardenedParse(bytes);
      if (!parsed.document) return { wellFormed: false, diagnostics: parsed.diagnostics };
      try {
        validator.validate(parsed.document);
        return { wellFormed: true, diagnostics: [] };
      } catch (error) {
        if (error instanceof XmlLibError) return { wellFormed: true, diagnostics: toDiagnostics(error) };
        throw error;
      } finally {
        parsed.document.dispose();
      }
    },
    dispose() {
      validator.dispose();
      schemaDocument.dispose();
    },
  };
}
