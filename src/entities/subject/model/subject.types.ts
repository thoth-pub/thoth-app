import z from 'zod';

import type { SubjectFragmentFragment } from '@/gql/graphql';
import { SubjectTypes } from '@/src/shared';

import {
  addSubjectAutocompleteValidationSchema,
  addSubjectValidationSchema,
  subjectAltValidationSchema,
  subjectsValidationSchema,
  subjectValidationSchema,
} from './subject.validation';

export type SubjectDto = SubjectFragmentFragment;

export type SubjectId = string;

export type SubjectType = z.infer<typeof SubjectTypes>;

export type SubjectEntity = {
  id: SubjectId;
  code: string;
  type: SubjectType;
  ordinal: number;
};

export type SubjectsFormType = z.infer<typeof subjectsValidationSchema>;

export type AddSubjectFormType = z.infer<typeof addSubjectValidationSchema>;

export type AddSubjectAutocompleteFormType = z.infer<typeof addSubjectAutocompleteValidationSchema>;

export type SubjectFormType = z.infer<typeof subjectValidationSchema>;

export type SubjectAltFormType = z.infer<typeof subjectAltValidationSchema>;