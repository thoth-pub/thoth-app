import { describe, expect, it } from 'vitest';

import { AccessibilityStandard } from '@/gql/graphql';
import { ERRORS, FORM_FIELDS } from '@/src/shared/constants';

import { accessibilityValidationSchema } from './publication.validation';

const { PUBLICATION_ACCESSIBILITY_STANDARD } = FORM_FIELDS;

const validateStandards = (standards: AccessibilityStandard[]) =>
  accessibilityValidationSchema.safeParse({
    accessibilityStandard: standards,
    accessibilityReportUrl: '',
  });

describe('accessibilityValidationSchema', () => {
  it('accepts a WCAG standard', () => {
    expect(validateStandards([AccessibilityStandard.Wcag21Aa]).success).toBe(true);
  });

  it.each([AccessibilityStandard.PdfUa1, AccessibilityStandard.EpubA11Y11Aa])(
    'accepts a WCAG standard with additional standard %s',
    (additionalStandard) => {
      expect(validateStandards([AccessibilityStandard.Wcag21Aa, additionalStandard]).success).toBe(true);
    },
  );

  it.each([AccessibilityStandard.PdfUa1, AccessibilityStandard.EpubA11Y11Aa])(
    'rejects additional standard %s without a WCAG standard',
    (additionalStandard) => {
      const result = validateStandards([additionalStandard]);

      expect(result.success).toBe(false);

      if (result.success) return;

      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: ERRORS.ACCESSIBILITY_PRIMARY_STANDARD_REQUIRED,
          path: [PUBLICATION_ACCESSIBILITY_STANDARD.name],
        }),
      );
    },
  );

  it('accepts empty accessibility values', () => {
    expect(validateStandards([]).success).toBe(true);
  });
});
