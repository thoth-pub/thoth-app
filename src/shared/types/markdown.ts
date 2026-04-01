import z from 'zod';

import { MarkdownFormats } from '../constants/markdown';

export type MarkdownFormat = z.infer<typeof MarkdownFormats>;
