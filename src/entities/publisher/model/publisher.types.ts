import z from 'zod';

import type { Contact, Publisher } from '@/gql/graphql';
import type { ContactType } from '@/src/shared/types';

import {
  newPublisherValidationSchema,
  publisherContactValidationSchema,
  publisherNameValidationSchema,
  publisherReportValidationSchema,
  publisherShortnameValidationSchema,
  publisherStatementValidationSchema,
  publisherUrlValidationSchema,
} from './publisher.validation';

export type ContactDto = Pick<Contact, 'contactId' | 'contactType' | 'email'>;

export type PublisherDto = Pick<
  Publisher,
  | 'publisherId'
  | 'publisherName'
  | 'publisherShortname'
  | 'publisherUrl'
  | 'updatedAt'
  | 'accessibilityReportUrl'
  | 'accessibilityStatement'
> & {
  contacts: ContactDto[];
};

export type PublisherId = string;

export type ContactId = string;

export type ContactEntity = {
  id: ContactId;
  type: ContactType;
  email: string;
};

export type PublisherEntity = {
  id: PublisherId;
  name: string;
  shortName: string;
  url: string;
  updatedAt: string;
  accessibilityReportUrl: string;
  accessibilityStatement: string;
  contacts: ContactEntity[];
};

export type PublisherContactForm = z.infer<typeof publisherContactValidationSchema>;

export type PublisherNameForm = z.infer<typeof publisherNameValidationSchema>;

export type PublisherShortnameForm = z.infer<typeof publisherShortnameValidationSchema>;

export type PublisherUrlForm = z.infer<typeof publisherUrlValidationSchema>;

export type PublisherReportForm = z.infer<typeof publisherReportValidationSchema>;

export type PublisherStatementForm = z.infer<typeof publisherStatementValidationSchema>;

export type NewPublisherForm = z.infer<typeof newPublisherValidationSchema>;
