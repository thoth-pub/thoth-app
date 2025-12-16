import z from 'zod';

import { MarkupFormat } from '@/gql/graphql';

export const MarkdownFormats = z.enum([
  MarkupFormat.Markdown,
  MarkupFormat.PlainText,
  MarkupFormat.Html,
  MarkupFormat.JatsXml,
]);
