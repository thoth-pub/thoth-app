import z from 'zod';

import { MarkupFormat } from '@/gql/graphql';

import { MarkdownFormats } from '../constants/markdown';

export type MarkdownFormat = z.infer<typeof MarkdownFormats>;

/**
 * The markup format a piece of imported text arrived in, resolved at parse time from what the
 * source file declared about itself and carried to the mutation as creation intent.
 *
 * This is not a stored property of an abstract or biography — Thoth normalises every input to
 * its JATS representation — which is why it is a separate type rather than a field in any DTO:
 * it exists so an importer that *knows* the source format can say so, instead of the mutation
 * layer rediscovering it from the content and guessing wrong. `Markdown` is absent because no
 * bulk import source declares it.
 */
export type ImportedMarkupFormat = MarkupFormat.Html | MarkupFormat.JatsXml | MarkupFormat.PlainText;
