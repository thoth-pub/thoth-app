import { z } from 'zod';

import {
  AccessibilityException as GQLAccessibilityException,
  AccessibilityStandard as GQLAccessibilityStandard,
  ContactType,
} from '@/gql/graphql';

export const ContactTypes = z.enum(ContactType);

export const AccessibilityStandards = z.enum(GQLAccessibilityStandard);

export const AccessibilityExceptions = z.enum(GQLAccessibilityException);
