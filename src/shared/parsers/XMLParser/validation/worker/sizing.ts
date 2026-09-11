import { SaxesParser, type SaxesTagNS } from 'saxes';

import { ONIX_ROOT_NAME, type OnixSourceDescriptor } from '../types';
import type { ProductCountEvidence } from './protocol';

/**
 * Namespace-aware Product sizing (thoth-app#196): the number of element
 * START TAGS whose namespace is the resolved ONIX namespace of the source and
 * whose local name is `Product` (Reference) or `product` (Short). Comments,
 * CDATA sections, processing instructions, text and attribute values never
 * count. Runs only after the stage-2 prolog/DTD gate has passed; a parser
 * failure is reported as "not measured", never as a validity diagnosis.
 */
export const PRODUCT_LOCAL_NAME: Readonly<Record<OnixSourceDescriptor['flavour'], string>> = {
  reference: 'Product',
  short: 'product',
};

export function countProducts(text: string, source: OnixSourceDescriptor): ProductCountEvidence {
  const namespace = source.namespaceURI;
  const local = PRODUCT_LOCAL_NAME[source.flavour];
  let count = 0;
  const parser = new SaxesParser({ xmlns: true, position: false });
  parser.on('error', (error) => {
    throw error;
  });
  parser.on('doctype', () => {
    throw new Error(`a DOCTYPE is never accepted after the stage-2 prolog scan (${ONIX_ROOT_NAME[source.flavour]})`);
  });
  parser.on('opentag', (tag: SaxesTagNS) => {
    if (tag.uri === namespace && tag.local === local) count++;
  });
  try {
    parser.write(text).close();
  } catch (error) {
    return { measured: false, reason: 'SIZING_PARSE_ERROR', error: String(error).split('\n')[0].slice(0, 160) };
  }
  return { measured: true, count };
}
