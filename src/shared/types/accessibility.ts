import { z } from 'zod';

import { AccessibilityExceptions, AccessibilityStandards, ContactTypes } from '../constants/accessibility';

export type ContactType = z.infer<typeof ContactTypes>;

export type AccessibilityStandardType = z.infer<typeof AccessibilityStandards>;

export type AccessibilityExceptionType = z.infer<typeof AccessibilityExceptions>;
