import { z } from 'zod';

import { ContactType } from '@/gql/graphql';

export const ContactTypes = z.enum(ContactType);
