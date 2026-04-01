import { z } from 'zod';

import { LanguageTypeAlt } from '../constants/languages';

export type LocaleCodeType = z.infer<typeof LanguageTypeAlt>;
