import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkAbstractsForm } from '@/src/entities/work/model/work.types';
import type { AbstractEntity } from '@/src/shared/types';

const mocks = vi.hoisted(() => {
  const longAbstract: AbstractEntity = {
    id: 'abs-long-1',
    type: 'LONG',
    canonical: true,
    content: 'Saved abstract',
    localeCode: 'EN',
  };

  return {
    longAbstract,
    work: {
      id: 'work-1',
      imprintId: 'imprint-1',
      abstracts: [longAbstract],
    },
    createAbstract: vi.fn(),
    updateAbstract: vi.fn(),
    deleteAbstract: vi.fn(),
    closeForm: vi.fn(),
    invalidateQueries: vi.fn(),
    onSubmit: undefined as ((data: WorkAbstractsForm) => Promise<void>) | undefined,
    isDisabled: undefined as boolean | undefined,
    // The imprint's default locale; undefined while identity has not settled.
    defaultLocaleOption: { value: 'EN', label: 'English' } as { value: string; label: string } | undefined,
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@/src/entities/abstract', () => ({
  useCreateAbstract: () => ({ createAbstract: mocks.createAbstract }),
  useUpdateAbstract: () => ({ updateAbstract: mocks.updateAbstract }),
  useDeleteAbstract: () => ({ deleteAbstract: mocks.deleteAbstract, loading: false }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useDefaultLocaleOption: () => mocks.defaultLocaleOption,
  useTypedTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: () => ({ activeFormId: null, closeForm: mocks.closeForm }),
}));

vi.mock('@/src/shared/ui/layout/EditableContent/EditableContent', () => ({
  EditableContent: ({
    onSubmit,
    isDisabled,
  }: {
    onSubmit: (data: WorkAbstractsForm) => Promise<void>;
    isDisabled?: boolean;
  }) => {
    mocks.onSubmit = onSubmit;
    mocks.isDisabled = isDisabled;

    return null;
  },
}));

vi.mock('./AbstractsFormFields', () => ({
  AbstractsFormFields: () => null,
}));

import { EditAbstracts } from './EditAbstracts';

describe('EditAbstracts', () => {
  beforeEach(() => {
    mocks.createAbstract.mockReset();
    mocks.updateAbstract.mockReset();
    mocks.deleteAbstract.mockReset();
    mocks.invalidateQueries.mockReset();
    mocks.onSubmit = undefined;
    mocks.isDisabled = undefined;
    mocks.defaultLocaleOption = { value: 'EN', label: 'English' };
  });

  it('EditAbstracts_keepsFormOpenAndOldPreview_whenUpdateAbstractFails', async () => {
    const error = new Error('Abstract update failed');
    mocks.updateAbstract.mockRejectedValueOnce(error);

    render(<EditAbstracts workId="work-1" />);

    await expect(
      mocks.onSubmit?.({
        abstracts: [
          {
            longAbstractId: 'abs-long-1',
            shortAbstractId: '0000-0000-0000-0000',
            abstract: 'Unsaved abstract',
            shortAbstract: '',
            language: { value: 'EN', label: 'English' },
          },
        ],
      }),
    ).rejects.toBe(error);

    expect(mocks.updateAbstract).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'abs-long-1', content: 'Unsaved abstract' }),
    });
    expect(mocks.createAbstract).not.toHaveBeenCalled();
  });

  describe('identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
    it('cannot be opened while identity is loading or expired, so no default locale is applied', () => {
      mocks.defaultLocaleOption = undefined;

      render(<EditAbstracts workId="work-1" />);

      expect(mocks.isDisabled).toBe(true);
    });

    it('can be opened with authoritative identity', () => {
      render(<EditAbstracts workId="work-1" />);

      expect(mocks.isDisabled).toBe(false);
    });
  });
});
