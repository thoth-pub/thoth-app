import { z } from 'zod';

import { ContactTypes } from '../constants/accessibility';

export type ContactType = z.infer<typeof ContactTypes>;
